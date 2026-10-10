"""Small HTTP server: the dashboard (static files) + a JSON snapshot, refreshed in the background."""
from __future__ import annotations

import base64
import hmac
import json
import logging
import mimetypes
import os
import threading
import time
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from . import setup
from .advisor import Advisor
from .backtest import run_backtest
from .controller import Controller
from .config import Settings
from .prices import TZ
from .snapshot import build_snapshot

log = logging.getLogger("battbrain")
SETUP_EVERY = 1800        # seconds between installation checks
BACKTEST_EVERY = 6 * 3600
WEB_DIR = Path(__file__).resolve().parent.parent / "web"
# Home Assistant ingress proxies requests from this address; nothing else may reach the app.
INGRESS_PEERS = {"172.30.32.2", "127.0.0.1", "::1"}


class Poller:
    """Keeps the latest snapshot; Home Assistant is asked at most once per poll interval."""

    def __init__(self, settings: Settings, source, ping=lambda: True):
        self.settings, self.source, self.ping = settings, source, ping
        self.advisor = Advisor(settings, source)
        self.controller = Controller(settings, source)
        self.snapshot: dict = {}
        self.setup: dict | None = None
        self.auto: dict[str, str] = {}
        self.backtest: dict | None = None
        self._setup_at = self._backtest_at = 0.0
        self._backtest_running = threading.Lock()
        self.lock = threading.Lock()
        self.cycle = threading.Lock()  # one refresh at a time: the controller must never run twice at once
        self._stop = threading.Event()

    def refresh(self) -> dict:
        with self.cycle:
            return self._refresh()

    def _refresh(self) -> dict:
        try:
            connected = self.ping()
            if connected:
                self._check_setup()
            snap = build_snapshot(self.settings, self.source, connected=connected)
            snap["advice"] = self.advisor.update(snap) if connected else {"error": "Geen verbinding"}
            snap["steering"] = self.controller.apply(snap, snap["advice"], datetime.now(TZ))
            snap["setup"] = self.setup_summary()
            snap["backtest"] = self.backtest
            if connected:
                self.start_backtest()
        except Exception as e:  # keep serving the last good snapshot
            log.warning("Snapshot mislukt: %s", e)
            snap = dict(self.snapshot, connected=False, error=str(e))
        with self.lock:
            self.snapshot = snap
        return snap

    # --- installation check ----------------------------------------------------------
    def _check_setup(self, force: bool = False):
        if not hasattr(self.source, "get_states") or (not force and time.time() - self._setup_at < SETUP_EVERY):
            return
        self._setup_at = time.time()
        try:
            states = self.source.get_states()
            if self.settings.auto_detect:
                found = setup.auto_fill(self.settings, setup.detect(states))
                if found:
                    log.info("Automatisch gevonden: %s", ", ".join(f"{k}={v}" for k, v in found.items()))
                    self.auto.update(found)
            self.setup = setup.check(self.settings, states, self.auto)
        except Exception as e:  # noqa: BLE001 - the check is a help, never a blocker
            log.warning("Installatiecheck mislukt: %s", e)

    def setup_summary(self) -> dict | None:
        if not self.setup:
            return None
        rows = self.setup["roles"]
        return {"verdict": self.setup["verdict"], "auto": dict(self.auto),
                "problems": [r["label"] for r in rows if r["status"] != "ok" and r["group"] == "required"],
                "warnings": [r["label"] for r in rows if r["status"] in ("missing", "unavailable", "wrong")
                             and r["group"] != "required"]}

    # --- look back on your own data ------------------------------------------------------
    def start_backtest(self, force: bool = False):
        if not force and time.time() - self._backtest_at < BACKTEST_EVERY:
            return
        if not self._backtest_running.acquire(blocking=False):
            return
        self._backtest_at = time.time()

        def work():
            try:
                lat, lon = self.advisor._location()
                self.backtest = run_backtest(self.settings, self.source, days=self.settings.backtest_days,
                                             lat=lat, lon=lon)
                if "error" in self.backtest:  # e.g. not enough history yet: try again in 10 minutes
                    self._backtest_at = time.time() - BACKTEST_EVERY + 600
            except Exception as e:  # noqa: BLE001
                log.warning("Terugblik mislukt: %s", e)
                self.backtest = {"error": f"Terugblik mislukt: {e}"}
            finally:
                self._backtest_running.release()
        threading.Thread(target=work, daemon=True).start()

    def run(self):
        while not self._stop.is_set():
            self.refresh()
            self._stop.wait(self.settings.poll_seconds)

    def stop(self):
        self._stop.set()


def make_handler(poller: Poller, restrict: bool, password: str = ""):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, fmt, *args):
            log.debug(fmt, *args)

        def _allowed(self) -> bool:
            """Add-on: only HA ingress may connect. Standalone: optional password (basic auth)."""
            if restrict and self.client_address[0] not in INGRESS_PEERS:
                self._send(403, b"Alleen via Home Assistant", "text/plain")
                return False
            if password:
                given = ""
                auth = self.headers.get("Authorization") or ""
                if auth.startswith("Basic "):
                    try:
                        given = base64.b64decode(auth[6:]).decode().split(":", 1)[-1]
                    except (ValueError, UnicodeDecodeError):
                        given = ""
                if not hmac.compare_digest(given.encode(), password.encode()):
                    self.send_response(401)
                    self.send_header("WWW-Authenticate", 'Basic realm="BattBrain"')
                    self.send_header("Content-Length", "0")
                    self.end_headers()
                    return False
            return True

        def _send(self, code: int, body: bytes, ctype: str):
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            if not self._allowed():
                return
            path = self.path.split("?", 1)[0]
            if path in ("/api/snapshot", "/api/snapshot/"):
                with poller.lock:
                    snap = poller.snapshot
                if not snap:  # never call refresh while holding the snapshot lock
                    snap = poller.refresh()
                return self._send(200, json.dumps(snap).encode(), "application/json")
            if path.rstrip("/") == "/api/setup":
                with poller.cycle:
                    poller._check_setup(force=True)
                return self._send(200, json.dumps(poller.setup or {}).encode(), "application/json")
            if path.rstrip("/") == "/api/backtest":
                return self._send(200, json.dumps(poller.backtest or {"status": "running"}).encode(),
                                  "application/json")
            rel = "index.html" if path in ("", "/") else path.lstrip("/")
            target = (WEB_DIR / rel).resolve()
            if WEB_DIR not in target.parents or not target.is_file():
                return self._send(404, b"Niet gevonden", "text/plain")
            ctype = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
            return self._send(200, target.read_bytes(), ctype)

        def do_POST(self):
            if not self._allowed():
                return
            if self.path.split("?", 1)[0].rstrip("/") != "/api/control":
                return self._send(404, b"Niet gevonden", "text/plain")
            try:
                length = min(int(self.headers.get("Content-Length") or 0), 4096)
                body = json.loads(self.rfile.read(length) or b"{}")
            except (ValueError, TypeError):
                return self._send(400, b"Ongeldige aanvraag", "text/plain")
            now = datetime.now(TZ)
            if body.get("action") == "pause":
                poller.controller.pause(int(body.get("minutes", 60)), now)
            elif body.get("action") == "resume":
                poller.controller.resume()
            else:
                return self._send(400, b"Onbekende actie", "text/plain")
            snap = poller.refresh()
            return self._send(200, json.dumps(snap).encode(), "application/json")

    return Handler


def serve(settings: Settings, source, ping=lambda: True, host: str = "0.0.0.0") -> ThreadingHTTPServer:
    poller = Poller(settings, source, ping)
    poller.refresh()
    threading.Thread(target=poller.run, daemon=True).start()
    restrict = bool(os.environ.get("SUPERVISOR_TOKEN"))
    password = "" if restrict else os.environ.get("BATTBRAIN_PASSWORD", "")
    if not restrict and not password and not settings.demo:
        log.warning("Geen BATTBRAIN_PASSWORD ingesteld: iedereen in je netwerk kan het dashboard openen.")
    httpd = ThreadingHTTPServer((host, settings.port), make_handler(poller, restrict, password))
    httpd.poller = poller  # type: ignore[attr-defined]
    log.info("BattBrain luistert op poort %s (%s)", settings.port, "demo" if settings.demo else "Home Assistant")
    return httpd


def main_loop(httpd: ThreadingHTTPServer):
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.poller.stop()  # type: ignore[attr-defined]
        time.sleep(0)

"""Small HTTP server: the dashboard (static files) + a JSON snapshot, refreshed in the background."""
from __future__ import annotations

import json
import logging
import mimetypes
import os
import threading
import time
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from .advisor import Advisor
from .controller import Controller
from .config import Settings
from .prices import TZ
from .snapshot import build_snapshot

log = logging.getLogger("battbrain")
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
        self.lock = threading.Lock()
        self._stop = threading.Event()

    def refresh(self) -> dict:
        try:
            connected = self.ping()
            snap = build_snapshot(self.settings, self.source, connected=connected)
            snap["advice"] = self.advisor.update(snap) if connected else {"error": "Geen verbinding"}
            snap["steering"] = self.controller.apply(snap, snap["advice"], datetime.now(TZ))
        except Exception as e:  # keep serving the last good snapshot
            log.warning("Snapshot mislukt: %s", e)
            snap = dict(self.snapshot, connected=False, error=str(e))
        with self.lock:
            self.snapshot = snap
        return snap

    def run(self):
        while not self._stop.is_set():
            self.refresh()
            self._stop.wait(self.settings.poll_seconds)

    def stop(self):
        self._stop.set()


def make_handler(poller: Poller, restrict: bool):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, fmt, *args):
            log.debug(fmt, *args)

        def _send(self, code: int, body: bytes, ctype: str):
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            if restrict and self.client_address[0] not in INGRESS_PEERS:
                return self._send(403, b"Alleen via Home Assistant", "text/plain")
            path = self.path.split("?", 1)[0]
            if path in ("/api/snapshot", "/api/snapshot/"):
                with poller.lock:
                    snap = poller.snapshot or poller.refresh()
                return self._send(200, json.dumps(snap).encode(), "application/json")
            rel = "index.html" if path in ("", "/") else path.lstrip("/")
            target = (WEB_DIR / rel).resolve()
            if WEB_DIR not in target.parents or not target.is_file():
                return self._send(404, b"Niet gevonden", "text/plain")
            ctype = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
            return self._send(200, target.read_bytes(), ctype)

        def do_POST(self):
            if restrict and self.client_address[0] not in INGRESS_PEERS:
                return self._send(403, b"Alleen via Home Assistant", "text/plain")
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
    httpd = ThreadingHTTPServer((host, settings.port), make_handler(poller, restrict))
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

"""Home Assistant client.

Inside the add-on it talks to Home Assistant through the Supervisor proxy with the
token the Supervisor provides. For development set HA_URL + HA_TOKEN (a long-lived
access token).

Reading is unrestricted. The only write, `call_service`, is used by the controller
(control mode, opt-in) and only for the reserve switch and the target-SoC entity.
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from typing import Protocol


class StateSource(Protocol):
    def get_state(self, entity_id: str) -> dict | None: ...


class HAClient:
    def __init__(self, base_url: str | None = None, token: str | None = None, timeout: float = 10):
        sup = os.environ.get("SUPERVISOR_TOKEN")
        self.base = (base_url or os.environ.get("HA_URL") or
                     ("http://supervisor/core" if sup else "http://localhost:8123")).rstrip("/")
        self.token = token or os.environ.get("HA_TOKEN") or sup or ""
        self.timeout = timeout

    def _get(self, path: str):
        req = urllib.request.Request(f"{self.base}/api/{path}", headers={
            "Authorization": f"Bearer {self.token}", "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=self.timeout) as resp:
            return json.load(resp)

    def call_service(self, domain: str, service: str, data: dict) -> None:
        body = json.dumps(data).encode()
        req = urllib.request.Request(f"{self.base}/api/services/{domain}/{service}", data=body, method="POST",
                                     headers={"Authorization": f"Bearer {self.token}",
                                              "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=self.timeout) as resp:
            resp.read()

    def ping(self) -> bool:
        try:
            return "message" in self._get("")
        except (urllib.error.URLError, OSError, ValueError):
            return False

    def get_state(self, entity_id: str) -> dict | None:
        """The entity's state object, or None when it does not exist or HA is unreachable."""
        if not entity_id:
            return None
        try:
            return self._get(f"states/{entity_id}")
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            raise

    def get_config(self) -> dict:
        """Home Assistant's core config (latitude, longitude, time zone)."""
        return self._get("config")

    def get_history(self, entity_ids: list[str], start: datetime, end: datetime) -> dict[str, list[dict]]:
        """State history per entity between start and end (minimal rows, no attributes)."""
        ids = [e for e in entity_ids if e]
        if not ids:
            return {}
        q = urllib.parse.urlencode({"end_time": end.isoformat(), "filter_entity_id": ",".join(ids)})
        rows = self._get(f"history/period/{urllib.parse.quote(start.isoformat())}?{q}"
                         "&minimal_response&no_attributes")
        out: dict[str, list[dict]] = {}
        for series in rows or []:
            if series:
                out[series[0].get("entity_id", "")] = series
        return out

"""Read-only Home Assistant client.

Inside the add-on it talks to Home Assistant through the Supervisor proxy with the
token the Supervisor provides. For development set HA_URL + HA_TOKEN (a long-lived
access token). This client deliberately has no method that changes anything in
Home Assistant: step 3 of the app only reads.
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
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

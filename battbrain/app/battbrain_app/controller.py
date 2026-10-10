"""Control mode (step 5): turns the advice into actions on the inverter, carefully.

BattBrain only touches two entities, the same two knobs the blueprint uses:
  reserve switch on + target above SoC  -> charge from the grid
  reserve switch on + target = SoC      -> hold the charge
  reserve switch off                    -> normal self-use (the safe fallback)

Safety rules, in order:
  1. Nothing happens unless control_mode = "control" and both entities are configured.
  2. While the conflicting automation (the old blueprint) is on, BattBrain does not switch:
     two controllers fighting over one switch is worse than either alone.
  3. Paused from the dashboard = hands off (the inverter keeps its last state).
  4. Stale or missing data (no connection, no SoC, plan older than 20 min, planner error)
     -> fall back to self-use once, then wait.
  5. Never grid-charge above max_charge_price; target is clamped to [reserve, 100].
  6. The reserve switch toggles at most once per min_switch_minutes (falling back to
     self-use is always allowed).
  7. Commands are only sent when the inverter differs from what is wanted, and every
     command is verified on the next cycles; a switch that does not follow is reported.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta

from .config import Settings

log = logging.getLogger("battbrain")
STALE_PLAN = timedelta(minutes=20)
TARGET_DEADBAND = 2.0
VERIFY_CYCLES = 3


class Controller:
    def __init__(self, settings: Settings, source):
        self.s = settings
        self.source = source
        self.paused_until: datetime | None = None
        self.last_toggle: datetime | None = None
        self.last_command: dict | None = None
        self.expect: dict | None = None
        self.unverified = 0
        self.fell_back = False
        self.status: dict = {}

    # --- dashboard actions -----------------------------------------------------------
    def pause(self, minutes: int, now: datetime):
        self.paused_until = now + timedelta(minutes=max(1, min(minutes, 24 * 60)))

    def resume(self):
        self.paused_until = None

    # --- main entry ----------------------------------------------------------------------
    def apply(self, snap: dict, advice: dict, now: datetime) -> dict:
        s = self.s
        st = {"mode": s.control_mode, "active": False, "paused_until": None, "blocked": None,
              "last_command": self.last_command, "error": None, "fallback": False}
        if s.control_mode != "control":
            st["blocked"] = "Adviesmodus: BattBrain stuurt niets."
            return self._done(st)
        if not (s.reserve_switch_entity and s.target_soc_entity):
            st["blocked"] = "Stel de reserveschakelaar en het doel-SoC in om te kunnen sturen."
            return self._done(st)
        if s.conflict_automation:
            auto = self.source.get_state(s.conflict_automation)
            if auto and auto.get("state") == "on":
                st["blocked"] = (f"Je oude automatisering ({s.conflict_automation}) staat nog aan. "
                                 "Zet die uit, anders sturen twee systemen dezelfde batterij.")
                return self._done(st)
        if self.paused_until and now < self.paused_until:
            st["paused_until"] = self.paused_until.isoformat()
            st["blocked"] = "Gepauzeerd vanuit het dashboard."
            return self._done(st)
        self.paused_until = None

        cur_on = (snap.get("control") or {}).get("reserve_on")
        cur_target = (snap.get("control") or {}).get("target_soc")
        self._verify(cur_on, cur_target, st)

        reason = self._stale_reason(snap, advice, now)
        if reason:
            st["fallback"] = True
            st["error"] = reason
            if not self.fell_back and cur_on is not False:
                self._send(False, None, cur_on, cur_target, now, "Terugval naar zelfverbruik: " + reason, force=True)
            self.fell_back = True
            return self._done(st)
        self.fell_back = False

        want_on = bool(advice["control"]["reserve_on"])
        want_target = float(advice["control"]["target_soc"])
        why = advice.get("reason", "")
        price = (snap.get("price") or {}).get("now")
        if want_on and advice.get("action") == "charge_grid" and price is not None and price > s.max_charge_price:
            want_on, want_target = False, None
            why = f"Laden overgeslagen: prijs €{price:.3f} boven je maximum €{s.max_charge_price:.2f}".replace(".", ",")
        if want_target is not None:
            want_target = max(s.reserve_soc, min(100.0, round(want_target)))

        st["active"] = True
        self._send(want_on, want_target, cur_on, cur_target, now, why)
        st["last_command"] = self.last_command
        return self._done(st)

    # --- helpers -------------------------------------------------------------------------
    def _stale_reason(self, snap: dict, advice: dict, now: datetime) -> str | None:
        if not snap.get("connected"):
            return "geen verbinding met Home Assistant"
        if snap.get("soc") is None:
            return "laadtoestand onbekend"
        if not advice or advice.get("error") or "control" not in advice:
            return (advice or {}).get("error") or "geen plan"
        planned = advice.get("planned_at")
        if not planned or now - datetime.fromisoformat(planned) > STALE_PLAN:
            return "plan is verouderd"
        return None

    def _send(self, want_on: bool, want_target: float | None, cur_on, cur_target, now: datetime,
              why: str, force: bool = False):
        s = self.s
        calls = []
        if want_on and want_target is not None and (cur_target is None or abs(cur_target - want_target) > TARGET_DEADBAND):
            calls.append(("number", "set_value", {"entity_id": s.target_soc_entity, "value": want_target}))
        if want_on != cur_on:
            recently = self.last_toggle and now - self.last_toggle < timedelta(minutes=s.min_switch_minutes)
            if recently and want_on and not force:
                log.info("Schakelen uitgesteld (minder dan %s min sinds vorige wissel)", s.min_switch_minutes)
            else:
                calls.append(("switch", "turn_on" if want_on else "turn_off", {"entity_id": s.reserve_switch_entity}))
        if not calls:
            return
        try:
            for domain, service, data in calls:
                self.source.call_service(domain, service, data)
            switched = any(c[0] == "switch" for c in calls)
            if switched:
                self.last_toggle = now
            on_after = want_on if switched else cur_on  # a deferred toggle is not expected yet
            self.expect = {"on": on_after, "target": want_target if want_on and any(c[0] == "number" for c in calls) else None}
            self.unverified = 0
            self.last_command = {"t": now.isoformat(), "reserve_on": want_on, "target_soc": want_target,
                                 "reason": why, "ok": True}
            log.info("Sturing: reserve %s, doel %s (%s)", "aan" if want_on else "uit", want_target, why)
        except Exception as e:  # noqa: BLE001 - report, try again next cycle
            self.last_command = {"t": now.isoformat(), "reserve_on": want_on, "target_soc": want_target,
                                 "reason": why, "ok": False, "error": str(e)}
            log.warning("Sturen mislukt: %s", e)

    def _verify(self, cur_on, cur_target, st: dict):
        if not self.expect:
            return
        ok = cur_on == self.expect["on"] and (
            self.expect["target"] is None or cur_target is None or abs(cur_target - self.expect["target"]) <= TARGET_DEADBAND)
        if ok:
            self.expect, self.unverified = None, 0
            return
        self.unverified += 1
        if self.unverified >= VERIFY_CYCLES:
            st["error"] = "De omvormer volgt het laatste commando niet. Controleer de schakelaar en het doel-SoC."

    def _done(self, st: dict) -> dict:
        self.status = st
        return st

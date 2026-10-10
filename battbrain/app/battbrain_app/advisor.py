"""Advice mode: plans with battbrain_core and compares the advice with what the current automation does.

Nothing is switched: the advice is shown in the dashboard and written to a decision log.
"""
from __future__ import annotations

import json
import logging
import os
from datetime import date, datetime, timedelta

import battbrain_core as core

from .config import Settings
from .history import load_history
from .prices import TZ, parse_prices
from .sun import solar_curve

log = logging.getLogger("battbrain")
LOG_KEEP = 300


def export_price_fn(s: Settings, day: date):
    """Net metering until `saldering_end`, afterwards exports earn `export_deduction` less."""
    end = date.fromisoformat(s.saldering_end)
    if day <= end:
        return lambda p: p
    return lambda p: p - s.export_deduction


def controls_match(advised: core.Control, reserve_on: bool | None, target: float | None) -> bool | None:
    """Does the automation currently do what BattBrain advises? None when unknown."""
    if reserve_on is None:
        return None
    if advised.reserve_on != reserve_on:
        return False
    if not advised.reserve_on or target is None:
        return True
    return abs(advised.target_soc - target) <= 5


class Advisor:
    def __init__(self, settings: Settings, source):
        self.s = settings
        self.source = source
        self.battery = core.Battery(settings.battery_capacity_kwh, settings.max_power_kw, settings.max_power_kw,
                                    min_soc=max(0.0, settings.reserve_soc - 1), reserve_soc=settings.reserve_soc)
        self.load = core.LoadProfile()
        self.load_fitted: datetime | None = None
        self.location: tuple[float, float] | None = None
        self.plan: core.Plan | None = None
        self.planned_at: datetime | None = None
        self.plan_key = None
        self.error: str | None = None
        self.log_path = os.path.join(settings.data_dir, "battbrain_log.json")
        self.log: list[dict] = []
        self.agree: dict = {"day": None, "match": 0, "total": 0}
        self.days: dict[str, dict] = {}   # realised results per day
        self._last_meter: datetime | None = None
        self._load_log()
        if hasattr(source, "past_days"):  # demo: pre-filled history
            for d in source.past_days():
                self.days.setdefault(d["day"], d)

    # --- persistence -------------------------------------------------------------------
    def _load_log(self):
        try:
            with open(self.log_path) as fh:
                data = json.load(fh)
            self.log = data.get("log", [])[-LOG_KEEP:]
            self.agree = data.get("agree", self.agree)
            self.days = data.get("days", {})
        except (OSError, ValueError):
            pass

    def _save_log(self):
        try:
            os.makedirs(os.path.dirname(self.log_path), exist_ok=True)
            with open(self.log_path, "w") as fh:
                keep = sorted(self.days)[-60:]
                json.dump({"log": self.log[-LOG_KEEP:], "agree": self.agree,
                           "days": {k: self.days[k] for k in keep}}, fh)
        except OSError as e:
            log.debug("Logboek niet opgeslagen: %s", e)

    # --- inputs --------------------------------------------------------------------------
    def _location(self) -> tuple[float, float]:
        if self.s.latitude and self.s.longitude:
            return self.s.latitude, self.s.longitude
        if self.location is None:
            lat, lon = 52.1, 5.1  # centre of NL
            try:
                cfg = self.source.get_config()
                lat, lon = float(cfg.get("latitude") or lat), float(cfg.get("longitude") or lon)
            except Exception:  # noqa: BLE001 - fall back to NL
                pass
            self.location = (lat, lon)
        return self.location

    def _refresh_load_profile(self, now: datetime):
        if self.load_fitted and now - self.load_fitted < timedelta(hours=6):
            return
        s = self.s
        ents = [s.grid_power_entity, s.solar_power_entity, s.battery_power_entity, s.load_power_entity]
        if not any(ents) or not hasattr(self.source, "get_history"):
            self.load_fitted = now
            return
        start = now - timedelta(days=s.history_days)
        try:
            raw = self.source.get_history(ents, start, now)
            units = {}
            for e in ents:
                st = self.source.get_state(e) if e else None
                if st:
                    units[e] = (st.get("attributes", {}).get("unit_of_measurement") or "W")
            hist = load_history(raw, start, now, s.grid_power_entity, s.solar_power_entity,
                                s.battery_power_entity, s.load_power_entity,
                                s.grid_power_sign, s.battery_power_sign, units)
            if hist:
                self.load = core.LoadProfile().fit(hist)
        except Exception as e:  # noqa: BLE001 - keep the previous profile
            log.warning("Verbruiksgeschiedenis niet geladen: %s", e)
        self.load_fitted = now

    # --- realised results -----------------------------------------------------------------
    def meter(self, snap: dict, now: datetime):
        """Integrate what actually happened: grid cost with the battery, and without it.

        Without the battery the grid would have supplied grid - battery (battery charging
        is extra import, discharging replaced import). Gaps longer than 2 minutes are skipped.
        """
        p = snap.get("power") or {}
        price = (snap.get("price") or {}).get("now")
        last, self._last_meter = self._last_meter, now
        if last is None or price is None or p.get("grid_w") is None:
            return
        dt = (now - last).total_seconds()
        if dt <= 0 or dt > 120:
            return
        exp = export_price_fn(self.s, now.date())(price)
        grid = p["grid_w"] * dt / 3.6e6
        nb = (p["grid_w"] - (p.get("battery_w") or 0.0)) * dt / 3.6e6
        cost = lambda kwh: kwh * (price if kwh > 0 else exp)  # noqa: E731
        d = self.days.setdefault(now.date().isoformat(), {"day": now.date().isoformat(), "cost": 0.0,
                                                          "cost_no_battery": 0.0, "import_kwh": 0.0,
                                                          "export_kwh": 0.0})
        d["cost"] = round(d["cost"] + cost(grid), 5)
        d["cost_no_battery"] = round(d["cost_no_battery"] + cost(nb), 5)
        d["import_kwh"] = round(d.get("import_kwh", 0.0) + max(grid, 0.0), 4)
        d["export_kwh"] = round(d.get("export_kwh", 0.0) + max(-grid, 0.0), 4)
        d["minutes"] = round(d.get("minutes", 0.0) + dt / 60, 2)
        if p.get("solar_w") is not None:
            d["solar_kwh"] = round(d.get("solar_kwh", 0.0) + max(p["solar_w"], 0.0) * dt / 3.6e6, 4)
        fc = (snap.get("solar") or {}).get("today_kwh")
        if fc is not None and "solar_forecast_kwh" not in d and now.hour < 10:
            d["solar_forecast_kwh"] = fc  # the morning forecast, before the day's own updates

    def solar_factor(self, now: datetime) -> tuple[float, int]:
        """Correction for the solar forecast from full past days: (factor, days used)."""
        pairs = []
        for k in range(1, 15):
            d = self.days.get((now.date() - timedelta(days=k)).isoformat())
            if d and d.get("solar_forecast_kwh") and d.get("minutes", 0) >= 20 * 60 and "solar_kwh" in d:
                pairs.append((d["solar_forecast_kwh"], d["solar_kwh"]))
        if len(pairs) < 3:
            return 1.0, len(pairs)
        return core.SolarCalibration().fit(pairs).factor, len(pairs)

    def realised(self, now: datetime) -> dict:
        days = []
        for k in range(6, -1, -1):
            key = (now.date() - timedelta(days=k)).isoformat()
            d = self.days.get(key)
            days.append({"day": key, "saving": None if not d else round(d["cost_no_battery"] - d["cost"], 3),
                         "cost": None if not d else round(d["cost"], 3),
                         "minutes": None if not d else d.get("minutes", 24 * 60)})
        known = [d["saving"] for d in days if d["saving"] is not None]
        return {"today": days[-1], "days": days,
                "avg_saving": round(sum(known) / len(known), 3) if known else None}

    # --- planning ------------------------------------------------------------------------
    def update(self, snap: dict, now: datetime | None = None) -> dict:
        """Re-plan when needed and return the advice block for the dashboard snapshot."""
        now = (now or datetime.now(TZ)).astimezone(TZ)
        self.meter(snap, now)
        soc = snap.get("soc")
        price_state = self.source.get_state(self.s.price_entity) if self.s.price_entity else None
        prices = parse_prices((price_state or {}).get("attributes", {}).get(self.s.price_attribute)) \
            if price_state else {}
        if soc is None or not prices:
            self.error = "Plan kan nog niet: " + ("laadtoestand ontbreekt" if soc is None else "geen prijslijst")
            return {"error": self.error}

        key = (round(soc / 2), len(prices), max(prices))
        stale = (self.planned_at is None or now - self.planned_at >= timedelta(minutes=self.s.plan_minutes)
                 or key != self.plan_key)
        if stale:
            try:
                self._refresh_load_profile(now)
                lat, lon = self._location()
                end = max(prices) + timedelta(hours=1)
                factor, _ = self.solar_factor(now)
                rem, tom = snap["solar"].get("remaining_kwh"), snap["solar"].get("tomorrow_kwh")
                curve = solar_curve(now, None if rem is None else rem * factor,
                                    None if tom is None else tom * factor, lat, lon, end)
                slots = []
                for sl in core.build_slots(now, prices, lambda t: curve.get(t, 0.0), self.load):
                    exp = export_price_fn(self.s, sl.start.date())(sl.price)
                    slots.append(core.Slot(sl.start, sl.price, exp, sl.load_kwh, sl.solar_kwh))
                self.plan = core.make_plan(soc, slots, self.battery, resolution_pct=1.0, created=now)
                self.planned_at, self.plan_key, self.error = now, key, None
            except Exception as e:  # noqa: BLE001 - show the error, keep the old plan
                log.exception("Plannen mislukt")
                self.error = f"Plannen mislukt: {e}"
        if not self.plan:
            return {"error": self.error}
        return self._advice(snap, now)

    def _advice(self, snap: dict, now: datetime) -> dict:
        plan = self.plan
        steps = [st for st in plan.steps if st.start + timedelta(minutes=15) > now] or plan.steps[-1:]
        cur = steps[0]
        ctl = core.control_for(cur, snap["soc"], self.battery)
        until = next((st.start for st in steps[1:] if st.action != cur.action), None)
        nxt = next((st for st in steps[1:] if st.action != cur.action), None)
        reserve_on, target = snap["control"].get("reserve_on"), snap["control"].get("target_soc")
        match = controls_match(ctl, reserve_on, target)
        self._record(now, cur, ctl, match, snap)

        today_left = [st for st in steps if st.start.date() == now.date()]
        cheap = None
        if len(today_left) >= 8:  # cheapest 2-hour window for the rest of today
            best = min(range(len(today_left) - 7), key=lambda i: sum(x.price for x in today_left[i:i + 8]))
            w = today_left[best:best + 8]
            cheap = {"start": w[0].start.isoformat(), "end": (w[-1].start + timedelta(minutes=15)).isoformat(),
                     "price": round(sum(x.price for x in w) / 8, 4)}
        ded = date.fromisoformat(self.s.saldering_end) < now.date()
        return {
            "error": self.error,
            "planned_at": self.planned_at.isoformat(),
            "action": cur.action.value, "label": cur.action.label, "reason": cur.reason,
            "until": until.isoformat() if until else None,
            "next": None if not nxt else {"t": nxt.start.isoformat(), "action": nxt.action.value,
                                          "label": nxt.action.label, "reason": nxt.reason},
            "control": {"reserve_on": ctl.reserve_on, "target_soc": ctl.target_soc},
            "matches_current": match,
            "agreement_today": None if not self.agree["total"] else round(100 * self.agree["match"] / self.agree["total"]),
            "savings": {"vs_no_battery": round(plan.savings, 2), "vs_self_use": round(plan.gain_over_self_use, 2),
                        "horizon_end": (plan.steps[-1].start + timedelta(minutes=15)).isoformat()},
            "export": (f"teruglevering €{self.s.export_deduction:.2f} onder inkoop".replace(".", ",")
                       if ded else f"salderen tot {date.fromisoformat(self.s.saldering_end):%d-%m-%Y}"),
            "cheapest_window": cheap,
            "plan": [{"t": st.start.isoformat(), "action": st.action.value, "soc": round(st.soc_end, 1),
                      "price": round(st.price, 4)} for st in steps],
            "log": list(reversed(self.log[-30:])),
            "realised": self.realised(now),
            "solar_correction": dict(zip(("factor", "days"), self.solar_factor(now))),
            "full_at": next((st.start.isoformat() for st in steps if st.soc_end >= 99.5), None),
            "empty_at": next((st.start.isoformat() for st in steps
                              if st.soc_end <= self.battery.reserve_soc + 0.5), None),
        }

    def _record(self, now: datetime, step: core.PlanStep, ctl: core.Control, match, snap: dict):
        day = now.date().isoformat()
        if self.agree.get("day") != day:
            self.agree = {"day": day, "match": 0, "total": 0}
        if match is not None:
            self.agree["total"] += 1
            self.agree["match"] += 1 if match else 0
        last = self.log[-1] if self.log else None
        if not last or last["action"] != step.action.value:
            self.log.append({"t": now.isoformat(), "action": step.action.value, "label": step.action.label,
                             "reason": step.reason, "price": step.price, "soc": snap.get("soc"),
                             "target_soc": ctl.target_soc if ctl.reserve_on else None,
                             "matches_current": match})
            self._save_log()
        elif self.agree["total"] % 20 == 0:
            self._save_log()

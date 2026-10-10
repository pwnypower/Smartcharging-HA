"""Demo data so the dashboard can be shown without a Home Assistant connection.

The demo is internally consistent: a demo household (load and solar pattern) with a
5.1 kWh battery runs a full day under the BattBrain planner, using the Frank all-in prices
of 9 and 10 October 2026 shifted to today and tomorrow. Every value the dashboard shows
(SoC, power flows, switch state, history) comes from that one simulated day.
"""
from __future__ import annotations

import math
from datetime import datetime, timedelta

import battbrain_core as core

from .prices import TZ

TODAY = [.149] * 6 + [.164, .199, .205, .184, .158, .134, .125, .125, .125, .143, .167, .232,
                      .307, .333, .307, .292, .277, .277]
TOMORROW = [.283, .253, .229, .229, .229, .229, .268, .304, .3125, .274, .253, .199, .193, .193,
            .179, .208, .238, .268, .277, .259, .238, .223, .193, .1875]
SOLAR_PEAK_KW = 1.6
CAPACITY = 5.1
BATTERY = core.Battery(CAPACITY, 3.0, 3.0, min_soc=14, reserve_soc=15)

ENTITIES = {
    "soc": "sensor.demo_battery_soc", "price": "sensor.demo_price_all_in",
    "solar_today": "sensor.demo_solar_today", "solar_remaining": "sensor.demo_solar_remaining",
    "solar_tomorrow": "sensor.demo_solar_tomorrow", "grid_power": "sensor.demo_grid_power",
    "solar_power": "sensor.demo_solar_power", "battery_power": "sensor.demo_battery_power",
    "reserve_switch": "switch.demo_reserve", "target_soc": "number.demo_target_soc",
}


def load_kw(t: datetime) -> float:
    h = t.hour + t.minute / 60
    base = 0.3
    if 7 <= h < 9:
        base += 0.7
    elif 12 <= h < 13:
        base += 0.3
    elif 17 <= h < 21:
        base += 1.3
    elif 21 <= h < 23:
        base += 0.5
    return base + (0.05 if t.weekday() >= 5 else 0.0)


def solar_kw(t: datetime) -> float:
    h = t.hour + t.minute / 60 + 0.125
    return SOLAR_PEAK_KW * math.sin(math.pi * (h - 8) / 11) if 8 <= h <= 19 else 0.0


def _day_prices(day0: datetime, values: list[float]) -> dict[datetime, float]:
    return {day0 + timedelta(hours=h): p for h, p in enumerate(values)}


def simulate_day(day0: datetime, prices: list[float], start_soc: float = 25.0) -> list[core.PlanStep]:
    """One day of 15-minute steps, planned at midnight with full knowledge of the demo day."""
    slots = []
    for i in range(96):
        t = day0 + timedelta(minutes=15 * i)
        slots.append(core.Slot(t, prices[i // 4], prices[i // 4], load_kw(t) / 4, solar_kw(t) / 4))
    return core.make_plan(start_soc, slots, BATTERY, resolution_pct=2.0).steps


def simulate_self_use(day0: datetime, prices: list[float], start_soc: float) -> list[core.PlanStep]:
    """One day of the inverter on its own (the household before BattBrain)."""
    steps, soc = [], start_soc
    for i in range(96):
        t = day0 + timedelta(minutes=15 * i)
        p = prices[i // 4]
        end, grid = core.inverter_step(BATTERY, soc, load_kw(t) / 4, solar_kw(t) / 4)
        steps.append(core.PlanStep(t, core.Action.IDLE, soc, end, p, grid, grid * p))
        soc = end
    return steps


class DemoSource:
    def __init__(self, now: datetime | None = None):
        self._fixed = now  # None = follow the clock
        self._cache: dict = {}
        self.overrides: dict[str, str] = {}   # demo inverter: what control mode switched
        self.commands: list[tuple] = []
        self._anchor = self._now().date()  # the demo's "today": gets the 9 October prices

    def _now(self) -> datetime:
        return (self._fixed or datetime.now(TZ)).astimezone(TZ)

    def _prices_for(self, day) -> list[float]:
        return TODAY if (day - self._anchor).days % 2 == 0 else TOMORROW

    def _day(self, day0: datetime) -> list[core.PlanStep]:
        """Days before the demo's first day ran on plain self-use, from then on BattBrain plans."""
        key = day0.date()
        if key not in self._cache:
            if key >= self._anchor:
                self._cache[key] = simulate_day(day0, self._prices_for(key))
            else:
                prev = (day0 - timedelta(hours=12)).replace(hour=0)
                soc = self._day(prev)[-1].soc_end if (self._anchor - key).days < 30 else 25.0
                self._cache[key] = simulate_self_use(day0, self._prices_for(key), soc)
        return self._cache[key]

    def _flows(self, t: datetime) -> dict:
        """SoC, power flows and plan step of the demo household at time t."""
        day0 = t.replace(hour=0, minute=0, second=0, microsecond=0)
        st = self._day(day0)[min(95, (t.hour * 60 + t.minute) // 15)]
        stored = (st.soc_end - st.soc_start) / 100 * CAPACITY * 4000  # W into (+) / out of (-) storage
        battery_w = stored / BATTERY.eta_charge if stored > 0 else stored * BATTERY.eta_discharge
        solar_w, house_w = solar_kw(t) * 1000, load_kw(t) * 1000
        return {"step": st, "soc": st.soc_start + (st.soc_end - st.soc_start) * (t.minute % 15) / 15,
                "battery_w": battery_w, "solar_w": solar_w, "house_w": house_w,
                "grid_w": house_w - solar_w + battery_w, "price": self._prices_for(day0.date())[t.hour]}

    def _states(self, at: datetime | None = None) -> dict[str, dict]:
        now = (at or self._now()).astimezone(TZ)
        day0 = now.replace(hour=0, minute=0, second=0, microsecond=0)
        i = min(95, (now.hour * 60 + now.minute) // 15)
        f = self._flows(now)
        st, soc, battery_w, solar_w, grid_w = f["step"], f["soc"], f["battery_w"], f["solar_w"], f["grid_w"]
        ctl = core.control_for(st, st.soc_start, BATTERY)
        day1 = day0 + timedelta(days=1)
        prices = [{"from": t.isoformat(), "price": p} for t, p in _day_prices(day0, self._prices_for(day0.date())).items()]
        if now.hour >= 14:
            prices += [{"from": t.isoformat(), "price": p}
                       for t, p in _day_prices(day1, self._prices_for(day1.date())).items()]
        q = lambda k: solar_kw(day0 + timedelta(minutes=15 * k)) / 4  # noqa: E731
        total = sum(q(k) for k in range(96))
        left = sum(q(k) for k in range(i, 96))
        n = lambda v, unit="": {"state": str(round(v, 1)), "attributes": {"unit_of_measurement": unit}}  # noqa: E731
        return {
            ENTITIES["soc"]: n(soc, "%"),
            ENTITIES["price"]: {"state": str(f["price"]), "attributes": {"prices": prices}},
            ENTITIES["solar_today"]: n(total, "kWh"),
            ENTITIES["solar_remaining"]: n(left, "kWh"),
            ENTITIES["solar_tomorrow"]: n(total * 0.35, "kWh"),
            ENTITIES["grid_power"]: n(round(grid_w), "W"),
            ENTITIES["solar_power"]: n(round(solar_w), "W"),
            ENTITIES["battery_power"]: n(round(battery_w), "W"),
            ENTITIES["reserve_switch"]: {"state": "on" if ctl.reserve_on else "off", "attributes": {}},
            ENTITIES["target_soc"]: n(ctl.target_soc, "%"),
        }

    def get_states(self) -> list[dict]:
        """All entities, as Home Assistant's /api/states returns them (plus a few decoys)."""
        names = {"soc": "Solis batterij SoC", "price": "Frank Energie huidige elektriciteitsprijs (all-in)",
                 "solar_today": "Energy production today", "solar_remaining": "Energy production today remaining",
                 "solar_tomorrow": "Energy production tomorrow", "grid_power": "P1 meter vermogen net",
                 "solar_power": "Solis PV vermogen", "battery_power": "Solis batterij vermogen",
                 "reserve_switch": "Solis backup/reserve modus", "target_soc": "Solis reserve SoC"}
        out = []
        for key, ent in ENTITIES.items():
            st = dict(self.get_state(ent) or {})
            attrs = dict(st.get("attributes") or {}, friendly_name=names[key])
            if key in ("grid_power", "solar_power", "battery_power"):
                attrs["device_class"] = "power"
            if key == "soc":
                attrs["device_class"] = "battery"
            out.append(dict(st, entity_id=ent, attributes=attrs))
        out += [
            {"entity_id": "sensor.pixel_8_battery_level", "state": "64",
             "attributes": {"unit_of_measurement": "%", "device_class": "battery", "friendly_name": "Pixel 8 batterij"}},
            {"entity_id": "sensor.frank_energie_gasprijs", "state": "1.21",
             "attributes": {"unit_of_measurement": "€/m³", "friendly_name": "Frank Energie gasprijs"}},
            {"entity_id": "switch.koffiezetapparaat", "state": "off", "attributes": {"friendly_name": "Koffiezetapparaat"}},
        ]
        return out

    def get_state(self, entity_id: str) -> dict | None:
        st = self._states().get(entity_id)
        if st is not None and entity_id in self.overrides:
            st = dict(st, state=self.overrides[entity_id])
        return st

    def call_service(self, domain: str, service: str, data: dict) -> None:
        """Demo inverter: remember what control mode switched, so verification works."""
        self.commands.append((domain, service, data))
        ent = data["entity_id"]
        if domain == "switch":
            self.overrides[ent] = "on" if service == "turn_on" else "off"
        elif domain == "number":
            self.overrides[ent] = str(data["value"])

    def get_config(self) -> dict:
        return {"latitude": 52.1, "longitude": 5.1}

    def get_history(self, entity_ids: list[str], start: datetime, end: datetime) -> dict[str, list[dict]]:
        """Fifteen-minute history of the demo household, as it ran under the planner."""
        keys = {ENTITIES["grid_power"]: "grid_w", ENTITIES["solar_power"]: "solar_w",
                ENTITIES["battery_power"]: "battery_w", ENTITIES["soc"]: "soc", ENTITIES["price"]: "price"}
        out: dict[str, list[dict]] = {e: [] for e in entity_ids if e}
        t = start.astimezone(TZ).replace(second=0, microsecond=0)
        t = t.replace(minute=t.minute - t.minute % 15)
        while t < end:
            f = self._flows(t)
            for e in out:
                if e in keys:
                    v = f[keys[e]]
                    out[e].append({"state": str(round(v, 4) if e == ENTITIES["price"] else round(v, 1)),
                                   "last_changed": t.isoformat()})
            t += timedelta(minutes=15)
        return out

    def past_days(self, n: int = 7) -> list[dict]:
        """Results of the demo's previous days and today so far, in the same shape as the real day ledger."""
        out = []
        now = self._now()
        today0 = now.replace(hour=0, minute=0, second=0, microsecond=0)
        for k in range(n, -1, -1):
            day0 = today0 - timedelta(days=k)
            prices = self._prices_for(day0.date())
            steps = [s for s in self._day(day0) if k > 0 or s.start + timedelta(minutes=15) <= now]
            cost = sum(s.cost for s in steps)
            nb = sum((load_kw(s.start) - solar_kw(s.start)) / 4 * prices[s.start.hour] for s in steps)  # salderen
            solar = sum(solar_kw(s.start) / 4 for s in steps)
            out.append({"day": day0.date().isoformat(), "cost": round(cost, 3), "cost_no_battery": round(nb, 3),
                        "minutes": 15 * len(steps), "solar_kwh": round(solar, 3),
                        "solar_forecast_kwh": round(solar / 0.85, 3)})  # demo: forecast 15% too optimistic
        return out


def demo_settings(s):
    """Fill every entity option with the demo entity ids."""
    for key, ent in ENTITIES.items():
        setattr(s, f"{key}_entity", ent)
    s.price_attribute = "prices"
    s.demo = True
    return s

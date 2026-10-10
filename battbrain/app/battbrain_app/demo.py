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


class DemoSource:
    def __init__(self, now: datetime | None = None):
        self._fixed = now  # None = follow the clock
        self._cache: dict = {}

    def _now(self) -> datetime:
        return (self._fixed or datetime.now(TZ)).astimezone(TZ)

    def _prices_for(self, day) -> list[float]:
        return TODAY if (day - self._now().date()).days % 2 == 0 else TOMORROW

    def _day(self, day0: datetime) -> list[core.PlanStep]:
        key = day0.date()
        if key not in self._cache:
            self._cache[key] = simulate_day(day0, self._prices_for(key))
        return self._cache[key]

    def _states(self, at: datetime | None = None) -> dict[str, dict]:
        now = (at or self._now()).astimezone(TZ)
        day0 = now.replace(hour=0, minute=0, second=0, microsecond=0)
        steps = self._day(day0)
        i = min(95, (now.hour * 60 + now.minute) // 15)
        st = steps[i]
        soc = st.soc_start + (st.soc_end - st.soc_start) * (now.minute % 15) / 15
        stored = (st.soc_end - st.soc_start) / 100 * CAPACITY * 4000  # W into (+) / out of (-) storage
        battery_w = stored / BATTERY.eta_charge if stored > 0 else stored * BATTERY.eta_discharge
        solar_w = solar_kw(now) * 1000
        house_w = load_kw(now) * 1000
        grid_w = house_w - solar_w + battery_w
        ctl = core.control_for(st, st.soc_start, BATTERY)
        prices = [{"from": t.isoformat(), "price": p} for t, p in _day_prices(day0, TODAY).items()]
        if now.hour >= 14:
            prices += [{"from": t.isoformat(), "price": p}
                       for t, p in _day_prices(day0 + timedelta(days=1), TOMORROW).items()]
        q = lambda k: solar_kw(day0 + timedelta(minutes=15 * k)) / 4  # noqa: E731
        total = sum(q(k) for k in range(96))
        left = sum(q(k) for k in range(i, 96))
        n = lambda v, unit="": {"state": str(round(v, 1)), "attributes": {"unit_of_measurement": unit}}  # noqa: E731
        return {
            ENTITIES["soc"]: n(soc, "%"),
            ENTITIES["price"]: {"state": str(TODAY[now.hour]), "attributes": {"prices": prices}},
            ENTITIES["solar_today"]: n(total, "kWh"),
            ENTITIES["solar_remaining"]: n(left, "kWh"),
            ENTITIES["solar_tomorrow"]: n(total * 0.35, "kWh"),
            ENTITIES["grid_power"]: n(round(grid_w), "W"),
            ENTITIES["solar_power"]: n(round(solar_w), "W"),
            ENTITIES["battery_power"]: n(round(battery_w), "W"),
            ENTITIES["reserve_switch"]: {"state": "on" if ctl.reserve_on else "off", "attributes": {}},
            ENTITIES["target_soc"]: n(ctl.target_soc, "%"),
        }

    def get_state(self, entity_id: str) -> dict | None:
        return self._states().get(entity_id)

    def get_config(self) -> dict:
        return {"latitude": 52.1, "longitude": 5.1}

    def get_history(self, entity_ids: list[str], start: datetime, end: datetime) -> dict[str, list[dict]]:
        """Fifteen-minute history of the demo household (house load = grid + solar - battery)."""
        out: dict[str, list[dict]] = {e: [] for e in entity_ids if e}
        t = start.replace(minute=start.minute - start.minute % 15, second=0, microsecond=0)
        while t < end:
            row = {ENTITIES["grid_power"]: (load_kw(t) - solar_kw(t)) * 1000,
                   ENTITIES["solar_power"]: solar_kw(t) * 1000, ENTITIES["battery_power"]: 0.0}
            for e in out:
                if e in row:
                    out[e].append({"state": str(round(row[e])), "last_changed": t.isoformat()})
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
            out.append({"day": day0.date().isoformat(), "cost": round(cost, 3), "cost_no_battery": round(nb, 3),
                        "minutes": 15 * len(steps)})
        return out


def demo_settings(s):
    """Fill every entity option with the demo entity ids."""
    for key, ent in ENTITIES.items():
        setattr(s, f"{key}_entity", ent)
    s.price_attribute = "prices"
    s.demo = True
    return s

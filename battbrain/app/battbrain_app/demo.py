"""Demo data so the dashboard can be shown without a Home Assistant connection.

Prices are the Frank all-in prices of 9 and 10 October 2026 (read from the app),
shifted to today and tomorrow; power values follow a simple daily pattern.
"""
from __future__ import annotations

import math
from datetime import datetime, timedelta

from .prices import TZ

TODAY = [.149] * 6 + [.164, .199, .205, .184, .158, .134, .125, .125, .125, .143, .167, .232,
                      .307, .333, .307, .292, .277, .277]
TOMORROW = [.283, .253, .229, .229, .229, .229, .268, .304, .3125, .274, .253, .199, .193, .193,
            .179, .208, .238, .268, .277, .259, .238, .223, .193, .1875]

ENTITIES = {
    "soc": "sensor.demo_battery_soc", "price": "sensor.demo_price_all_in",
    "solar_today": "sensor.demo_solar_today", "solar_remaining": "sensor.demo_solar_remaining",
    "solar_tomorrow": "sensor.demo_solar_tomorrow", "grid_power": "sensor.demo_grid_power",
    "solar_power": "sensor.demo_solar_power", "battery_power": "sensor.demo_battery_power",
    "reserve_switch": "switch.demo_reserve", "target_soc": "number.demo_target_soc",
}


class DemoSource:
    def __init__(self, now: datetime | None = None):
        self._fixed = now  # None = follow the clock

    def _states(self, at: datetime | None = None) -> dict[str, dict]:
        now = (at or self._fixed or datetime.now(TZ)).astimezone(TZ)
        day0 = now.replace(hour=0, minute=0, second=0, microsecond=0)
        hours = [{"from": (day0 + timedelta(hours=h)).isoformat(), "price": p} for h, p in enumerate(TODAY)]
        if now.hour >= 14:
            hours += [{"from": (day0 + timedelta(days=1, hours=h)).isoformat(), "price": p}
                      for h, p in enumerate(TOMORROW)]
        h = now.hour + now.minute / 60
        sun = max(0.0, math.sin(math.pi * (h - 8) / 11)) if 8 <= h <= 19 else 0.0
        solar_w = round(1600 * sun)
        house_w = 350 + (1400 if 17 <= h < 21 else 0) + (600 if 7 <= h < 9 else 0)
        soc = 16 + 70 * max(0.0, math.sin(math.pi * (h - 10) / 12)) if 10 <= h <= 22 else 22
        battery_w = round(min(solar_w - house_w, 3000)) if solar_w > house_w else (-min(house_w, 3000) if soc > 16 else 0)
        grid_w = house_w - solar_w + battery_w
        done = sum(max(0.0, math.sin(math.pi * (x / 4 - 8) / 11)) * 1.6 / 4 for x in range(32, int(h * 4)))
        total = sum(max(0.0, math.sin(math.pi * (x / 4 - 8) / 11)) * 1.6 / 4 for x in range(32, 76))
        n = lambda v, unit="": {"state": str(v), "attributes": {"unit_of_measurement": unit}}
        return {
            ENTITIES["soc"]: n(round(soc), "%"),
            ENTITIES["price"]: {"state": str(TODAY[now.hour]), "attributes": {"prices": hours}},
            ENTITIES["solar_today"]: n(round(total, 1), "kWh"),
            ENTITIES["solar_remaining"]: n(round(max(total - done, 0), 1), "kWh"),
            ENTITIES["solar_tomorrow"]: n(3.4, "kWh"),
            ENTITIES["grid_power"]: n(grid_w, "W"),
            ENTITIES["solar_power"]: n(solar_w, "W"),
            ENTITIES["battery_power"]: n(battery_w, "W"),
            ENTITIES["reserve_switch"]: {"state": "off", "attributes": {}},
            ENTITIES["target_soc"]: n(15, "%"),
        }

    def get_state(self, entity_id: str) -> dict | None:
        return self._states().get(entity_id)

    def get_config(self) -> dict:
        return {"latitude": 52.1, "longitude": 5.1}

    def get_history(self, entity_ids: list[str], start: datetime, end: datetime) -> dict[str, list[dict]]:
        """Fifteen-minute history built from the same daily pattern (with a little day-to-day variation)."""
        out: dict[str, list[dict]] = {e: [] for e in entity_ids if e}
        t = start
        while t < end:
            st = self._states(t)
            for e in out:
                row = st.get(e)
                if row:
                    out[e].append({"state": row["state"], "last_changed": t.isoformat()})
            t += timedelta(minutes=15)
        return out


def demo_settings(s):
    """Fill every entity option with the demo entity ids."""
    for key, ent in ENTITIES.items():
        setattr(s, f"{key}_entity", ent)
    s.price_attribute = "prices"
    s.demo = True
    return s

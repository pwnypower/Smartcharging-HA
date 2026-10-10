"""Read the price list from a price sensor's attributes.

Integrations store future prices differently. Supported shapes:
  - a list of objects with a start time and a price, e.g. Frank Energie
    [{"from": "2026-10-10T00:00:00+02:00", "till": "...", "price": 0.149}, ...]
    (time keys: from / start / start_time / startsAt / time / datetime;
     price keys: price / value / total / price_eur)
  - the Python-repr string the old blueprint parsed ("datetime.datetime(2026, 10, 10, 0, 0, ...), 'price': 0.149")
Prices above 2 are taken as ct/kWh and converted to EUR/kWh.
"""
from __future__ import annotations

import re
from datetime import datetime
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Europe/Amsterdam")
TIME_KEYS = ("from", "start", "start_time", "startsAt", "time", "datetime")
PRICE_KEYS = ("price", "value", "total", "price_eur")
REPR = re.compile(r"datetime\.datetime\((\d+), (\d+), (\d+), (\d+), (\d+).*?price': ([0-9.eE-]+)")


def _to_local(value) -> datetime | None:
    if isinstance(value, datetime):
        dt = value
    elif isinstance(value, str):
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    else:
        return None
    return dt.replace(tzinfo=TZ) if dt.tzinfo is None else dt.astimezone(TZ)


def parse_prices(raw) -> dict[datetime, float]:
    """{local start time: EUR/kWh}, sorted by time; empty when nothing usable is found."""
    out: dict[datetime, float] = {}
    if isinstance(raw, list):
        for item in raw:
            if not isinstance(item, dict):
                continue
            t = next((_to_local(item[k]) for k in TIME_KEYS if k in item), None)
            p = next((item[k] for k in PRICE_KEYS if k in item), None)
            if t is not None and isinstance(p, (int, float)):
                out[t] = float(p)
    elif isinstance(raw, str):
        for y, mo, d, h, mi, p in REPR.findall(raw):
            out[datetime(int(y), int(mo), int(d), int(h), int(mi), tzinfo=TZ)] = float(p)
    if out:
        values = sorted(out.values())
        if values[len(values) // 2] > 2:  # ct/kWh
            out = {t: p / 100 for t, p in out.items()}
    return dict(sorted(out.items()))


def price_at(prices: dict[datetime, float], t: datetime) -> float | None:
    """Price of the slot that contains t (slots start at the listed times)."""
    current = None
    for start, p in prices.items():
        if start <= t:
            current = p
        else:
            break
    return current


def levels(values: list[float]) -> list[str]:
    """'low' / 'mid' / 'high' by thirds of the given prices (for colouring the curve)."""
    if not values:
        return []
    ranked = sorted(values)
    n = len(ranked) - 1
    lo = ranked[n // 3]
    hi = ranked[-(-2 * n // 3)]  # ceil
    return ["low" if v <= lo else "high" if v >= hi else "mid" for v in values]

"""Sunrise/sunset and an expected solar curve per 15 minutes (no external data needed)."""
from __future__ import annotations

import math
from datetime import date, datetime, timedelta

from .prices import TZ


def daylight(day: date, lat: float, lon: float) -> tuple[datetime, datetime]:
    """Approximate local sunrise and sunset (good to ~10 minutes in NL)."""
    doy = day.timetuple().tm_yday
    decl = math.radians(23.44) * math.sin(math.radians(360 / 365 * (doy - 81)))
    cos_w = max(-1.0, min(1.0, -math.tan(math.radians(lat)) * math.tan(decl)))
    half = math.degrees(math.acos(cos_w)) / 15
    noon_utc = 12 - lon / 15
    midnight = datetime(day.year, day.month, day.day, tzinfo=TZ)
    offset = midnight.utcoffset().total_seconds() / 3600
    rise = midnight + timedelta(hours=noon_utc - half + offset)
    sett = midnight + timedelta(hours=noon_utc + half + offset)
    return rise, sett


def _weight(t: datetime, rise: datetime, sett: datetime) -> float:
    """Relative production of the 15-minute step starting at t (a sine over the day)."""
    mid = t + timedelta(minutes=7.5)
    if mid <= rise or mid >= sett:
        return 0.0
    return math.sin(math.pi * (mid - rise).total_seconds() / (sett - rise).total_seconds())


def solar_curve(now: datetime, remaining_today: float | None, tomorrow: float | None,
                lat: float, lon: float, end: datetime) -> dict[datetime, float]:
    """Expected kWh per 15-minute step from now until `end`.

    Today's remaining forecast is spread over the rest of today's daylight, tomorrow's total
    over tomorrow's daylight, both following a sine. Missing forecasts count as zero.
    """
    start = now.replace(minute=now.minute - now.minute % 15, second=0, microsecond=0)
    steps = []
    t = start
    while t < end:
        steps.append(t)
        t += timedelta(minutes=15)
    out = {t: 0.0 for t in steps}
    for day, total in ((start.date(), remaining_today), (start.date() + timedelta(days=1), tomorrow)):
        if not total:
            continue
        rise, sett = daylight(day, lat, lon)
        day_steps = [t for t in steps if t.date() == day]
        weights = {t: _weight(t, rise, sett) for t in day_steps}
        s = sum(weights.values())
        if s > 0:
            for t, w in weights.items():
                out[t] = total * w / s
    return out

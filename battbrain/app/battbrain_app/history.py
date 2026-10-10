"""House consumption per 15 minutes from Home Assistant history (for the load profile)."""
from __future__ import annotations

from datetime import datetime, timedelta

from .prices import TZ


def _series(rows: list[dict], scale: float) -> list[tuple[datetime, float]]:
    out = []
    for r in rows:
        try:
            v = float(r.get("state")) * scale
        except (TypeError, ValueError):
            continue
        t = datetime.fromisoformat(str(r.get("last_changed") or r.get("last_updated")).replace("Z", "+00:00"))
        out.append((t.astimezone(TZ), v))
    out.sort()
    return out


def _avg(points: list[tuple[datetime, float]], start: datetime, end: datetime) -> float | None:
    """Time-weighted mean of a step-hold signal over [start, end), None without data."""
    cur, total, t0 = None, 0.0, start
    for t, v in points:
        if t <= start:
            cur = v
            continue
        if t >= end:
            break
        if cur is not None:
            total += cur * (t - t0).total_seconds()
        t0, cur = t, v
    if cur is None:
        return None
    total += cur * (end - t0).total_seconds()
    return total / (end - start).total_seconds()


def load_history(raw: dict[str, list[dict]], start: datetime, end: datetime,
                 grid: str = "", solar: str = "", battery: str = "", load: str = "",
                 grid_sign: int = 1, battery_sign: int = 1, units: dict | None = None) -> list[tuple[datetime, float]]:
    """(step start, kWh) for each 15-minute step with data.

    House load = the load sensor, or grid import + solar - battery charging.
    `raw` maps entity_id -> HA history rows; `units` maps entity_id -> 'W' or 'kW'.
    """
    units = units or {}
    scale = lambda e: 1000.0 if (units.get(e, "W").lower() == "kw") else 1.0  # noqa: E731
    series = {e: _series(raw.get(e, []), scale(e)) for e in (grid, solar, battery, load) if e}
    out = []
    t = start.replace(minute=start.minute - start.minute % 15, second=0, microsecond=0)
    while t + timedelta(minutes=15) <= end:
        nxt = t + timedelta(minutes=15)
        if load:
            w = _avg(series[load], t, nxt)
        else:
            g = _avg(series.get(grid, []), t, nxt) if grid else None
            s = _avg(series.get(solar, []), t, nxt) if solar else 0.0
            b = _avg(series.get(battery, []), t, nxt) if battery else 0.0
            w = None if g is None or s is None or b is None else g * grid_sign + s - b * battery_sign
        if w is not None:
            out.append((t, max(w, 0.0) / 1000 * 0.25))
        t = nxt
    return out

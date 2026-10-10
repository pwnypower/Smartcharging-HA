"""House consumption per 15 minutes from Home Assistant history (for the load profile)."""
from __future__ import annotations

from datetime import datetime, timedelta

from .prices import TZ


def parse_series(rows: list[dict], scale: float = 1.0) -> list[tuple[datetime, float]]:
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


def bucket_avg(points: list[tuple[datetime, float]], start: datetime, end: datetime,
               minutes: int = 15) -> dict[datetime, float | None]:
    """Time-weighted mean of a step-hold signal per bucket of `minutes`, in one sweep.

    A bucket is None when the signal has no value yet; buckets that are only partly
    covered are averaged over the covered part.
    """
    step = timedelta(minutes=minutes)
    out: dict[datetime, float | None] = {}
    i, n, cur = 0, len(points), None
    while i < n and points[i][0] <= start:
        cur = points[i][1]
        i += 1
    b = start
    while b + step <= end:
        nxt = b + step
        total = covered = 0.0
        t0 = b
        while i < n and points[i][0] < nxt:
            t, v = points[i]
            if cur is not None:
                total += cur * (t - t0).total_seconds()
                covered += (t - t0).total_seconds()
            t0, cur = t, v
            i += 1
        if cur is not None:
            total += cur * (nxt - t0).total_seconds()
            covered += (nxt - t0).total_seconds()
        out[b] = total / covered if covered > 0 else None
        b = nxt
    return out


def load_history(raw: dict[str, list[dict]], start: datetime, end: datetime,
                 grid: str = "", solar: str = "", battery: str = "", load: str = "",
                 grid_sign: int = 1, battery_sign: int = 1, units: dict | None = None) -> list[tuple[datetime, float]]:
    """(step start, kWh) for each 15-minute step with data.

    House load = the load sensor, or grid import + solar - battery charging.
    `raw` maps entity_id -> HA history rows; `units` maps entity_id -> 'W' or 'kW'.
    """
    units = units or {}
    scale = lambda e: 1000.0 if (units.get(e, "W").lower() == "kw") else 1.0  # noqa: E731
    series = {e: parse_series(raw.get(e, []), scale(e)) for e in (grid, solar, battery, load) if e}
    t0 = start.replace(minute=start.minute - start.minute % 15, second=0, microsecond=0)
    avg = {e: bucket_avg(pts, t0, end) for e, pts in series.items()}
    out = []
    for t in avg[load] if load else (avg[grid] if grid else {}):
        if load:
            w = avg[load][t]
        else:
            g = avg[grid][t]
            s = avg[solar][t] if solar else 0.0
            b = avg[battery][t] if battery else 0.0
            w = None if g is None or s is None or b is None else g * grid_sign + s - b * battery_sign
        if w is not None:
            out.append((t, max(w, 0.0) / 1000 * 0.25))
    return out

"""Convert a Home Assistant history export (CSV) into the simulator's CSV format.

In Home Assistant: History -> pick the entities and period -> ⋮ -> "Download data".
The file has the columns entity_id,state,last_changed.

Power sensors (W or kW) are averaged per 15 minutes and converted to kWh; the price
sensor is taken as the price valid at the start of each hour.
"""
from __future__ import annotations

import csv
from collections import defaultdict
from datetime import datetime, timedelta

from .model import STEP_MIN, TZ


def _read(paths: list[str]) -> dict[str, list[tuple[datetime, float]]]:
    series: dict[str, list[tuple[datetime, float]]] = defaultdict(list)
    for path in paths:
        with open(path, newline="") as fh:
            for row in csv.DictReader(fh):
                try:
                    v = float(row["state"])
                except (ValueError, KeyError):
                    continue
                t = datetime.fromisoformat(row["last_changed"].replace("Z", "+00:00")).astimezone(TZ)
                series[row["entity_id"]].append((t, v))
    for v in series.values():
        v.sort()
    return series


def _integral(points: list[tuple[datetime, float]], start: datetime, end: datetime) -> float | None:
    """Integral (value x seconds) of a step-hold signal over [start, end)."""
    if not points or points[0][0] >= end:
        return None
    total, cur = 0.0, None
    for t, v in points:
        if t <= start:
            cur = v
            continue
        if t >= end:
            break
        if cur is not None:
            total += cur * (t - start).total_seconds()
        start, cur = t, v
    if cur is None:
        return None
    total += cur * (end - start).total_seconds()
    return total


def convert(paths: list[str], out_path: str, price: str, solar: str | None = None,
            load: str | None = None, grid: str | None = None, battery: str | None = None,
            power_unit: str = "W", grid_sign: float = 1.0, battery_sign: float = 1.0) -> int:
    """Write the simulator CSV. Load is taken from `load`, or derived as
    grid import + solar - battery charge (grid: + = import, battery: + = charging;
    flip with grid_sign / battery_sign = -1)."""
    s = _read(paths)
    for ent in filter(None, [price, solar, load, grid, battery]):
        if ent not in s:
            raise SystemExit(f"Entiteit {ent} niet gevonden in de export")
    if not load and not grid:
        raise SystemExit("Geef --load of --grid op")
    scale = 1000.0 if power_unit.upper() == "W" else 1.0
    first = max(s[price][0][0], *(s[e][0][0] for e in filter(None, [solar, load, grid, battery])))
    last = min(s[price][-1][0], *(s[e][-1][0] for e in filter(None, [solar, load, grid, battery])))
    t = first.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    rows = 0
    step = timedelta(minutes=STEP_MIN)
    with open(out_path, "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["time", "price_eur_kwh", "load_kwh", "solar_kwh"])
        while t + step <= last:
            def kwh(ent, sign=1.0):
                a = _integral(s[ent], t, t + step) if ent else 0.0
                return None if a is None else sign * a / scale / 3600  # W*s -> kWh

            pv = kwh(solar) if solar else 0.0
            if load:
                ld = kwh(load)
            else:
                g, b = kwh(grid, grid_sign), (kwh(battery, battery_sign) if battery else 0.0)
                ld = None if g is None or b is None or pv is None else g + pv - b
            hour = t.replace(minute=0)
            pr = _integral(s[price], hour, hour + timedelta(seconds=1))  # price valid at hour start
            if ld is not None and pv is not None and pr is not None:
                w.writerow([t.strftime("%Y-%m-%dT%H:%M"), f"{pr:.4f}", f"{max(ld, 0):.4f}", f"{max(pv, 0):.4f}"])
                rows += 1
            t += step
    return rows

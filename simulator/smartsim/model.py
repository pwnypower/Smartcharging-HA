"""Core data structures and battery physics for the simulator."""
from __future__ import annotations

import csv
import math
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Europe/Amsterdam")
STEP_MIN = 15
DT_H = STEP_MIN / 60.0


@dataclass
class Battery:
    capacity_kwh: float = 5.1
    max_power_kw: float = 3.0
    eta_charge: float = 0.95
    eta_discharge: float = 0.95
    hw_min_soc: float = 14.0  # inverter cut-off (Solis overdischarge SoC), %

    @property
    def max_step_kwh(self) -> float:
        return self.max_power_kw * DT_H


@dataclass
class Dataset:
    """Prices per hour plus load/solar per 15-minute step (local time)."""
    hourly_prices: list[tuple[datetime, float]]
    steps: list[datetime]
    load: list[float]   # kWh per step
    solar: list[float]  # kWh per step
    start_soc: float = 25.0
    meta: dict = field(default_factory=dict)

    def price_at(self, t: datetime) -> float:
        key = t.replace(minute=0, second=0, microsecond=0)
        return self._price_map[key]

    def __post_init__(self):
        self._price_map = {t: p for t, p in self.hourly_prices}


def load_csv(path: str, start_soc: float = 25.0) -> Dataset:
    """Read the simulator's own CSV format.

    Columns: time (local ISO, hourly or 15-min), price_eur_kwh, load_kwh, solar_kwh.
    Rows with an empty load are used only as price look-ahead (e.g. tomorrow's prices).
    Hourly energy is spread evenly over four 15-minute steps.
    """
    prices: dict[datetime, float] = {}
    energy: list[tuple[datetime, float, float, int]] = []
    with open(path, newline="") as fh:
        for row in csv.DictReader(fh):
            t = datetime.fromisoformat(row["time"])
            t = t.replace(tzinfo=TZ) if t.tzinfo is None else t.astimezone(TZ)
            hour = t.replace(minute=0, second=0, microsecond=0)
            if row.get("price_eur_kwh", "") != "":
                prices.setdefault(hour, float(row["price_eur_kwh"]))
            if row.get("load_kwh", "") != "":
                energy.append((t, float(row["load_kwh"]), float(row.get("solar_kwh") or 0), 0))
    energy.sort()
    if len(energy) >= 2:
        res_min = int((energy[1][0] - energy[0][0]).total_seconds() // 60)
    else:
        res_min = 60
    if res_min % STEP_MIN:
        raise ValueError(f"Resolutie {res_min} min wordt niet ondersteund (gebruik 15 of 60 min)")
    split = res_min // STEP_MIN
    steps, load, solar = [], [], []
    for t, l, s, _ in energy:
        for k in range(split):
            steps.append(t + timedelta(minutes=STEP_MIN * k))
            load.append(l / split)
            solar.append(s / split)
    return Dataset(sorted(prices.items()), steps, load, solar, start_soc)


def sun_is_up(t: datetime, lat: float = 52.1, lon: float = 5.1) -> bool:
    """Rough sunrise/sunset check (good to ~10 minutes) for sun.sun replication."""
    doy = t.timetuple().tm_yday
    decl = math.radians(23.44) * math.sin(math.radians(360 / 365 * (doy - 81)))
    cos_w = -math.tan(math.radians(lat)) * math.tan(decl)
    cos_w = max(-1.0, min(1.0, cos_w))
    half_day_h = math.degrees(math.acos(cos_w)) / 15
    utc_offset_h = t.utcoffset().total_seconds() / 3600
    solar_noon = 12 - lon / 15 + utc_offset_h
    hour = t.hour + t.minute / 60
    return solar_noon - half_day_h <= hour <= solar_noon + half_day_h


@dataclass
class StepResult:
    soc: float          # % after step
    charge: float       # kWh into battery terminals
    discharge: float    # kWh out of battery terminals
    grid: float         # kWh, + import / - export
    cost: float         # EUR


def physics(bat: Battery, soc: float, load: float, solar: float, mode: str,
            target: float, price: float, export_price: float) -> StepResult:
    """Simulate one 15-min step of a Solis-style hybrid inverter.

    mode 'self'    : self-use, battery covers deficit down to hw_min_soc, stores surplus.
    mode 'reserve' : grid-charges at full power up to `target`; never discharges below it.
    """
    cap = bat.capacity_kwh
    e = soc / 100 * cap
    e_max = cap
    net = load - solar
    max_e = bat.max_step_kwh
    room = max(0.0, (e_max - e) / bat.eta_charge)
    charge = discharge = 0.0
    if mode == "reserve" and soc < target - 1e-9:
        need = (target / 100 * cap - e) / bat.eta_charge
        surplus = max(0.0, -net)
        charge = min(max_e, room, max(need, surplus))
    else:
        floor = bat.hw_min_soc if mode == "self" else max(bat.hw_min_soc, target)
        if net > 0:
            avail = max(0.0, (e - floor / 100 * cap) * bat.eta_discharge)
            discharge = min(net, max_e, avail)
        else:
            charge = min(-net, max_e, room)
    e += charge * bat.eta_charge - discharge / bat.eta_discharge
    grid = net + charge - discharge
    cost = grid * (price if grid > 0 else export_price)
    return StepResult(e / cap * 100, charge, discharge, grid, cost)

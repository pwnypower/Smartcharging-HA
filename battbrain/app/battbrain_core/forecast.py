"""Load profile, solar calibration and slot building."""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Callable, Iterable

from .model import STEP_MINUTES, Slot

DEFAULT_LOAD_KWH = 0.5 * STEP_MINUTES / 60  # 0.5 kW average until history is available


class LoadProfile:
    """Expected house consumption per 15 minutes, learned from history.

    Uses the average per (weekday/weekend, hour) when there are at least `min_samples`
    observations for it, otherwise the average per hour, otherwise a flat default.
    Recent days count more (`decay` per day).
    """

    def __init__(self, min_samples: int = 8, decay: float = 0.97, default_kwh: float = DEFAULT_LOAD_KWH):
        self.min_samples = min_samples
        self.decay = decay
        self.default = default_kwh
        self._by_type: dict[tuple[bool, int], list[tuple[float, float]]] = defaultdict(list)
        self._by_hour: dict[int, list[tuple[float, float]]] = defaultdict(list)
        self._latest: datetime | None = None

    def fit(self, history: Iterable[tuple[datetime, float]]) -> "LoadProfile":
        """history: (start of 15-min step, kWh consumed in that step)."""
        rows = sorted(history)
        if not rows:
            return self
        self._latest = rows[-1][0]
        for t, kwh in rows:
            age_days = (self._latest - t).total_seconds() / 86400
            w = self.decay ** age_days
            self._by_type[(t.weekday() >= 5, t.hour)].append((kwh, w))
            self._by_hour[t.hour].append((kwh, w))
        return self

    @staticmethod
    def _wavg(rows: list[tuple[float, float]]) -> float:
        tw = sum(w for _, w in rows)
        return sum(v * w for v, w in rows) / tw

    def expected(self, t: datetime) -> float:
        rows = self._by_type.get((t.weekday() >= 5, t.hour), [])
        if len(rows) >= self.min_samples:
            return self._wavg(rows)
        rows = self._by_hour.get(t.hour, [])
        if rows:
            return self._wavg(rows)
        return self.default


class SolarCalibration:
    """Corrects a solar forecast (e.g. Forecast.Solar) with the ratio actual / forecast."""

    def __init__(self, low: float = 0.3, high: float = 1.5):
        self.low, self.high = low, high
        self.factor = 1.0

    def fit(self, days: Iterable[tuple[float, float]]) -> "SolarCalibration":
        """days: (forecast kWh, actual kWh) per day; days with < 0.5 kWh forecast are ignored."""
        pairs = [(f, a) for f, a in days if f >= 0.5]
        if pairs:
            ratio = sum(a for _, a in pairs) / sum(f for f, _ in pairs)
            self.factor = min(self.high, max(self.low, ratio))
        return self

    def correct(self, kwh: float) -> float:
        return kwh * self.factor


def build_slots(start: datetime, hourly_prices: dict[datetime, float],
                solar_kwh: Callable[[datetime], float], load: LoadProfile,
                export_price: Callable[[float], float] = lambda p: p) -> list[Slot]:
    """15-minute slots from `start` until the last hour with a known price.

    hourly_prices: {start of hour: all-in price}; quarter-hour prices also work.
    solar_kwh: expected production for the 15-minute step starting at t.
    export_price: maps the import price to what an exported kWh earns
                  (identity = net metering; e.g. lambda p: p - 0.15 after 2026).
    """
    t = start.replace(minute=start.minute - start.minute % STEP_MINUTES, second=0, microsecond=0)
    slots = []
    while True:
        p = hourly_prices.get(t)
        if p is None:
            p = hourly_prices.get(t.replace(minute=0))
        if p is None:
            break
        slots.append(Slot(t, p, export_price(p), load.expected(t), solar_kwh(t)))
        t += timedelta(minutes=STEP_MINUTES)
    return slots

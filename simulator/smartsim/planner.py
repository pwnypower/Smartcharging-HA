"""Prototype of a forecast-driven planner (the '2027-ready' approach).

Every hour it plans the cheapest SoC path for the known price horizon with dynamic
programming, using only information that is available at that moment:
  - prices: today, plus tomorrow after the publish hour
  - solar: forecast = actual x bias (stand-in for Forecast.Solar)
  - load: per-hour average of the previous days (flat 0.5 kWh/h on the first day)
The first steps of the plan are translated into the same two inverter controls the
blueprint uses (reserve switch + target SoC), so it runs on the existing hardware.
"""
from __future__ import annotations

from datetime import timedelta

from .model import DT_H, Battery, Dataset, physics
from .strategies import SimResult


class Planner:
    def __init__(self, bat: Battery, export_deduction: float = 0.0, forecast_bias: float = 1.0,
                 publish_hour: int = 14, resolution_pct: float = 2.0, replan_steps: int = 4,
                 perfect_load: bool = False):
        self.perfect_load = perfect_load
        self.bat = bat
        self.ded = export_deduction
        self.bias = forecast_bias
        self.publish_hour = publish_hour
        self.res = resolution_pct
        self.replan = replan_steps

    def _load_forecast(self, ds: Dataset, i: int, t, j: int) -> float:
        if self.perfect_load and j < len(ds.steps):
            return ds.load[j]
        hist = [ds.load[j] for j in range(i) if ds.steps[j].hour == t.hour and ds.steps[j].date() < ds.steps[i].date()]
        return sum(hist) / len(hist) if hist else 0.5 * DT_H

    def _plan(self, ds: Dataset, i: int, soc: float) -> list[float]:
        bat, now = self.bat, ds.steps[i]
        last_day = now.date() + (timedelta(days=1) if now.hour >= self.publish_hour else timedelta())
        known = {t for t, _ in ds.hourly_prices if t.date() <= last_day}
        # horizon: future steps whose hour price is known (beyond the dataset: repeat load/solar profile)
        times, loads, solars = [], [], []
        t = now
        j = i
        while t.replace(minute=0) in known:
            times.append(t)
            loads.append(self._load_forecast(ds, i, t, j))
            solars.append((ds.solar[j] if j < len(ds.steps) else 0.0) * self.bias)
            t += timedelta(minutes=15)
            j += 1
        cap, lo = bat.capacity_kwh, bat.hw_min_soc
        n = int(round((100 - lo) / self.res)) + 1
        socs = [lo + k * self.res for k in range(n)]
        e = [s / 100 * cap for s in socs]
        span = int(bat.max_step_kwh / (cap * self.res / 100)) + 1
        # value left at the end of the horizon: what it saves later, roughly the horizon mean
        hp = [ds.price_at(x) for x in times]
        tv = sum(hp) / len(hp) * bat.eta_discharge
        V = [x * tv * -1 for x in e]
        pol = []
        for k in range(len(times) - 1, -1, -1):
            p = hp[k]
            pe = p - self.ded
            net = loads[k] - solars[k]
            nv, pk = [0.0] * n, [0] * n
            for a in range(n):
                best, arg = float("inf"), a
                for b in range(max(0, a - span), min(n, a + span + 1)):
                    de = e[b] - e[a]
                    c, d = (de / bat.eta_charge, 0.0) if de >= 0 else (0.0, -de * bat.eta_discharge)
                    if c > bat.max_step_kwh + 1e-9 or d > bat.max_step_kwh + 1e-9 or d > max(net, 0) + 1e-9:
                        continue
                    g = net + c - d
                    v = g * (p if g > 0 else pe) + V[b]
                    if v < best:
                        best, arg = v, b
                nv[a], pk[a] = best, arg
            V = nv
            pol.append(pk)
        pol.reverse()
        a = min(range(n), key=lambda k: abs(socs[k] - soc))
        deltas = []  # planned SoC change per step, in %
        for k in range(min(self.replan, len(pol))):
            b = pol[k][a]
            deltas.append(socs[b] - socs[a])
            a = b
        return deltas

    def run(self, ds: Dataset) -> SimResult:
        soc, out, branches, plan = ds.start_soc, [], [], []
        for i, t in enumerate(ds.steps):
            if i % self.replan == 0:
                plan = self._plan(ds, i, soc)
            delta = plan[i % self.replan] if i % self.replan < len(plan) else 0.0
            net = ds.load[i] - ds.solar[i]
            solar_pct = max(-net, 0) * self.bat.eta_charge / self.bat.capacity_kwh * 100
            # translate the planned SoC change into the two inverter controls
            if delta > solar_pct + self.res / 2:
                mode, target, br = "reserve", min(100.0, soc + delta), "laden"
            elif abs(delta) < self.res / 2 and net > 0:
                mode, target, br = "reserve", soc, "vasthouden"
            else:
                mode, target, br = "self", 0.0, "zelfverbruik"
            p = ds.price_at(t)
            r = physics(self.bat, soc, ds.load[i], ds.solar[i], mode, target, p, p - self.ded)
            out.append(r)
            branches.append(br)
            soc = r.soc
        return SimResult("planner", "Planner (voorspelling, 2027-ready)", out, branches, ds.start_soc)



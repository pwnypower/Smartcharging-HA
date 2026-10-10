"""Runs the BattBrain core planner (battbrain/core) inside the simulator.

Every hour it builds a new plan using only what is known at that moment:
  - prices: today, plus tomorrow after the publish hour
  - solar: forecast = actual x bias (stand-in for Forecast.Solar)
  - load: profile learned from the steps before now (flat 0.5 kWh/h without history)
Each 15-minute step of the plan is translated into the reserve switch + target SoC,
the same two inverter controls the blueprint uses.
"""
from __future__ import annotations

from datetime import timedelta

import battbrain_core as core

from .model import Battery, Dataset, physics
from .strategies import SimResult


class Planner:
    def __init__(self, bat: Battery, export_deduction: float = 0.0, forecast_bias: float = 1.0,
                 publish_hour: int = 14, resolution_pct: float = 2.0, replan_steps: int = 4,
                 perfect_load: bool = False):
        self.bat = bat
        self.core_bat = core.Battery(bat.capacity_kwh, bat.max_power_kw, bat.max_power_kw,
                                     bat.eta_charge, bat.eta_discharge, bat.hw_min_soc, bat.hw_min_soc)
        self.ded = export_deduction
        self.bias = forecast_bias
        self.publish_hour = publish_hour
        self.res = resolution_pct
        self.replan = replan_steps
        self.perfect_load = perfect_load

    def _plan(self, ds: Dataset, i: int, soc: float) -> core.Plan:
        now = ds.steps[i]
        last_day = now.date() + (timedelta(days=1) if now.hour >= self.publish_hour else timedelta())
        prices = {t: p for t, p in ds.hourly_prices if t.date() <= last_day}
        index = {t: j for j, t in enumerate(ds.steps)}

        def solar(t):
            j = index.get(t)
            return ds.solar[j] * self.bias if j is not None else 0.0

        if self.perfect_load:
            class _Exact(core.LoadProfile):
                def expected(_, t):
                    j = index.get(t)
                    return ds.load[j] if j is not None else core.forecast.DEFAULT_LOAD_KWH
            load = _Exact()
        else:
            load = core.LoadProfile().fit(zip(ds.steps[:i], ds.load[:i]))
        slots = core.build_slots(now, prices, solar, load, lambda p: p - self.ded)
        return core.make_plan(soc, slots, self.core_bat, self.res)

    def run(self, ds: Dataset) -> SimResult:
        soc, out, branches, plan = ds.start_soc, [], [], None
        names = {core.Action.CHARGE_GRID: "laden", core.Action.HOLD: "vasthouden"}
        for i, t in enumerate(ds.steps):
            if i % self.replan == 0:
                plan = self._plan(ds, i, soc)
            k = i % self.replan
            step = plan.steps[k] if k < len(plan.steps) else plan.steps[-1]
            ctl = core.control_for(step, soc, self.core_bat)
            mode = "reserve" if ctl.reserve_on else "self"
            p = ds.price_at(t)
            r = physics(self.bat, soc, ds.load[i], ds.solar[i], mode, ctl.target_soc, p, p - self.ded)
            out.append(r)
            branches.append(names.get(ctl.action, "zelfverbruik"))
            soc = r.soc
        return SimResult("planner", "Planner (voorspelling, 2027-ready)", out, branches, ds.start_soc)

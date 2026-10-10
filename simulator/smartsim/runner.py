"""Runs the standard set of scenarios on a dataset."""
from __future__ import annotations

from dataclasses import dataclass

from .blueprint import BlueprintSettings, BlueprintStrategy
from .model import Battery, Dataset
from .planner import Planner
from .strategies import (SimResult, residual_value, run_no_battery, run_optimal,
                         run_self_use)

ADVICE = dict(summer_solar_threshold=25, buffer_discount_percentage=15, min_discharge_margin=10)


@dataclass
class Scenario:
    result: SimResult
    net_cost: float      # grid cost minus value of extra energy left in the battery
    log: list | None = None


def run_blueprint(ds: Dataset, bat: Battery, settings: BlueprintSettings, key: str, label: str,
                  forecast_bias: float = 1.0, start_last_paid: float = 0.25,
                  export_deduction: float = 0.0) -> tuple[SimResult, list]:
    strat = BlueprintStrategy(settings, forecast_bias=forecast_bias, start_last_paid=start_last_paid)
    out = strat.run(ds, bat, export_deduction)
    res = SimResult(key, label, [o[0] for o in out], [o[1] for o in out], ds.start_soc)
    return res, strat.log


def run_all(ds: Dataset, bat: Battery, settings: BlueprintSettings | None = None,
            export_deduction: float = 0.0, start_last_paid: float = 0.25) -> list[Scenario]:
    settings = settings or BlueprintSettings(battery_capacity_kwh=bat.capacity_kwh,
                                             charge_power_kw=bat.max_power_kw)
    out: list[Scenario] = []

    def add(res: SimResult, log=None):
        rv = residual_value(res, ds, bat) if res.name != "none" else 0.0
        out.append(Scenario(res, res.cost - rv, log))

    add(run_no_battery(ds, export_deduction))
    add(run_self_use(ds, bat, export_deduction))
    add(*run_blueprint(ds, bat, settings, "bp", "Blueprint nightly (huidige instellingen)",
                       start_last_paid=start_last_paid, export_deduction=export_deduction))
    add(*run_blueprint(ds, bat, settings, "bp_bias", "Blueprint, zonvoorspelling 30% te hoog",
                       forecast_bias=1.3, start_last_paid=start_last_paid,
                       export_deduction=export_deduction))
    add(*run_blueprint(ds, bat, settings.with_(**ADVICE), "bp_advice",
                       "Blueprint met herfstadvies", start_last_paid=start_last_paid,
                       export_deduction=export_deduction))
    add(Planner(bat, export_deduction).run(ds))
    add(run_optimal(ds, bat, export_deduction))
    return out

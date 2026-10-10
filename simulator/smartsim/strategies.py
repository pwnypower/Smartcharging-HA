"""Reference strategies and a common result format."""
from __future__ import annotations

from dataclasses import dataclass, field

from .model import Battery, Dataset, StepResult, physics


@dataclass
class SimResult:
    name: str
    label: str
    steps: list[StepResult]
    branches: list[str] = field(default_factory=list)
    start_soc: float = 0.0

    @property
    def cost(self) -> float:
        return sum(r.cost for r in self.steps)

    @property
    def grid_import(self) -> float:
        return sum(max(r.grid, 0.0) for r in self.steps)

    @property
    def grid_export(self) -> float:
        return sum(max(-r.grid, 0.0) for r in self.steps)

    @property
    def throughput(self) -> float:
        return sum(r.discharge for r in self.steps)

    def end_soc(self) -> float:
        return self.steps[-1].soc if self.steps else self.start_soc


def residual_value(res: SimResult, ds: Dataset, bat: Battery) -> float:
    """Value of the energy left in the battery compared with the start, at the mean price.

    Without this a strategy could look cheap simply by ending the period emptier.
    """
    delta_kwh = (res.end_soc() - res.start_soc) / 100 * bat.capacity_kwh
    return delta_kwh * terminal_price(ds) * bat.eta_discharge


def terminal_price(ds: Dataset) -> float:
    """Price at which energy left in the battery at the end is valued.

    Uses the mean of the 24 hours after the simulated window when those prices are
    known (that is when the stored energy will be used), else the last simulated day.
    """
    end = ds.steps[-1]
    after = [p for t, p in ds.hourly_prices if t > end][:24]
    if not after:
        after = [p for t, p in ds.hourly_prices if t <= end][-24:]
    return sum(after) / len(after)


def run_no_battery(ds: Dataset, export_deduction: float = 0.0) -> SimResult:
    out = []
    for i, t in enumerate(ds.steps):
        p = ds.price_at(t)
        net = ds.load[i] - ds.solar[i]
        out.append(StepResult(0.0, 0.0, 0.0, net, net * (p if net > 0 else p - export_deduction)))
    return SimResult("none", "Geen batterij", out, start_soc=0.0)


def run_self_use(ds: Dataset, bat: Battery, export_deduction: float = 0.0) -> SimResult:
    soc, out = ds.start_soc, []
    for i, t in enumerate(ds.steps):
        p = ds.price_at(t)
        r = physics(bat, soc, ds.load[i], ds.solar[i], "self", 0.0, p, p - export_deduction)
        out.append(r)
        soc = r.soc
    return SimResult("self", "Batterij zonder sturing (zelfverbruik)", out, start_soc=ds.start_soc)


def run_optimal(ds: Dataset, bat: Battery, export_deduction: float = 0.0,
                allow_grid_export_from_battery: bool = False, resolution_pct: float = 1.0) -> SimResult:
    """Dynamic programming with perfect foresight: the theoretical best for this battery.

    State = SoC on a grid of `resolution_pct`. By default the battery may only discharge
    into the house (no battery-to-grid export), just like the blueprint.
    """
    cap = bat.capacity_kwh
    lo = bat.hw_min_soc
    n_states = int(round((100 - lo) / resolution_pct)) + 1
    socs = [lo + k * resolution_pct for k in range(n_states)]
    e_of = [s / 100 * cap for s in socs]
    max_e = bat.max_step_kwh
    T = len(ds.steps)

    mean_p = terminal_price(ds)

    INF = float("inf")
    # terminal value: same rule as residual_value()
    V = [-(e - ds.start_soc / 100 * cap) * mean_p * bat.eta_discharge for e in e_of]
    policy: list[list[int]] = [None] * T  # type: ignore

    def flow(k_from: int, k_to: int, i: int):
        de = e_of[k_to] - e_of[k_from]
        if de >= 0:
            c, d = de / bat.eta_charge, 0.0
        else:
            c, d = 0.0, -de * bat.eta_discharge
        if c > max_e + 1e-9 or d > max_e + 1e-9:
            return None
        net = ds.load[i] - ds.solar[i]
        if not allow_grid_export_from_battery and d > max(net, 0.0) + 1e-9:
            return None
        grid = net + c - d
        return c, d, grid

    for i in range(T - 1, -1, -1):
        p = ds.price_at(ds.steps[i])
        pe = p - export_deduction
        newV = [INF] * n_states
        pol = [0] * n_states
        for k in range(n_states):
            span = int(max_e / (cap * resolution_pct / 100)) + 2
            best, arg = INF, k
            for k2 in range(max(0, k - span), min(n_states, k + span + 1)):
                f = flow(k, k2, i)
                if f is None:
                    continue
                grid = f[2]
                cost = grid * (p if grid > 0 else pe) + V[k2]
                if cost < best:
                    best, arg = cost, k2
            newV[k], pol[k] = best, arg
        V, policy[i] = newV, pol

    k = min(range(n_states), key=lambda j: abs(socs[j] - ds.start_soc))
    out = []
    for i in range(T):
        k2 = policy[i][k]
        c, d, grid = flow(k, k2, i)
        p = ds.price_at(ds.steps[i])
        out.append(StepResult(socs[k2], c, d, grid, grid * (p if grid > 0 else p - export_deduction)))
        k = k2
    return SimResult("optimal", "Optimaal (perfecte voorspelling)", out, start_soc=ds.start_soc)

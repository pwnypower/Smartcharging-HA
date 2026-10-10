"""Data types shared by the planner, the forecasts and the app."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

STEP_MINUTES = 15
STEP_HOURS = STEP_MINUTES / 60


@dataclass(frozen=True)
class Battery:
    capacity_kwh: float = 5.1
    max_charge_kw: float = 3.0
    max_discharge_kw: float = 3.0
    eta_charge: float = 0.95
    eta_discharge: float = 0.95
    min_soc: float = 14.0      # inverter cut-off, %
    reserve_soc: float = 15.0  # user's minimum reserve, % (planner never plans below it)

    @property
    def charge_step_kwh(self) -> float:
        return self.max_charge_kw * STEP_HOURS

    @property
    def discharge_step_kwh(self) -> float:
        return self.max_discharge_kw * STEP_HOURS


@dataclass(frozen=True)
class Slot:
    """One 15-minute planning step with everything known or forecast about it."""
    start: datetime
    price: float         # all-in import price, EUR/kWh
    export_price: float  # what one exported kWh earns, EUR/kWh
    load_kwh: float      # expected house consumption in this step
    solar_kwh: float     # expected solar production in this step

    @property
    def net_kwh(self) -> float:
        """Positive = house needs energy, negative = solar surplus."""
        return self.load_kwh - self.solar_kwh


class Action(str, Enum):
    CHARGE_GRID = "charge_grid"    # buy from the grid to fill the battery
    CHARGE_SOLAR = "charge_solar"  # store solar surplus
    HOLD = "hold"                  # keep the energy for later
    DISCHARGE = "discharge"        # power the house from the battery
    IDLE = "idle"                  # nothing useful to do

    @property
    def label(self) -> str:
        return {
            "charge_grid": "Laden van het net",
            "charge_solar": "Zonnestroom opslaan",
            "hold": "Vasthouden",
            "discharge": "Ontladen",
            "idle": "Zelfverbruik",
        }[self.value]


@dataclass(frozen=True)
class PlanStep:
    start: datetime
    action: Action
    soc_start: float
    soc_end: float
    price: float
    grid_kwh: float  # + import / - export
    cost: float
    reason: str = ""


@dataclass
class Plan:
    created: datetime
    steps: list[PlanStep]
    cost: float                 # expected grid cost over the horizon
    cost_without_battery: float
    cost_self_use: float
    meta: dict = field(default_factory=dict)

    @property
    def savings(self) -> float:
        return self.cost_without_battery - self.cost

    @property
    def gain_over_self_use(self) -> float:
        return self.cost_self_use - self.cost

    def next_change(self) -> PlanStep | None:
        """First step whose action differs from the current one (for 'Volgende' in the UI)."""
        if not self.steps:
            return None
        first = self.steps[0].action
        return next((s for s in self.steps[1:] if s.action != first), None)


@dataclass(frozen=True)
class Control:
    """What to send to the inverter: the same two knobs the blueprint uses."""
    reserve_on: bool
    target_soc: float
    action: Action
    reason: str

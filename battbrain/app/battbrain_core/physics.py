"""What a Solis-style hybrid inverter does in one 15-minute step (for back-tests)."""
from __future__ import annotations

from .model import Battery


def inverter_step(bat: Battery, soc: float, load: float, solar: float,
                  reserve_on: bool = False, target: float = 0.0) -> tuple[float, float]:
    """(SoC after the step, grid kWh: + import / - export).

    reserve off            : self-use; cover deficits down to the inverter cut-off, store surplus.
    reserve on, SoC < target: charge from the grid at full power up to the target.
    reserve on, otherwise   : never discharge below the target; surplus solar is still stored.
    """
    cap = bat.capacity_kwh
    e = soc / 100 * cap
    net = load - solar
    room = max(0.0, (cap - e) / bat.eta_charge)
    charge = discharge = 0.0
    if reserve_on and soc < target - 1e-9:
        need = (target / 100 * cap - e) / bat.eta_charge
        charge = min(bat.charge_step_kwh, room, max(need, -net))
    else:
        floor = max(bat.min_soc, target) if reserve_on else bat.min_soc
        if net > 0:
            discharge = min(net, bat.discharge_step_kwh, max(0.0, (e - floor / 100 * cap) * bat.eta_discharge))
        else:
            charge = min(-net, bat.charge_step_kwh, room)
    e += charge * bat.eta_charge - discharge / bat.eta_discharge
    return e / cap * 100, net + charge - discharge

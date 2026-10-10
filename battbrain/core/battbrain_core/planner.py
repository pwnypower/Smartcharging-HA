"""Cost-optimal charge plan with dynamic programming.

Given the 15-minute slots for which a price is known, the planner finds the SoC path
with the lowest expected grid cost. Energy still in the battery at the end of the
horizon is valued conservatively (a low quantile of the horizon prices): it can be
replaced cheaply later, and valuing it too high makes the plan hoard energy.
When several paths cost the same, the one closest to plain self-use wins.

Constraints: charge/discharge power, round-trip losses, the inverter cut-off and the
user's minimum reserve. The battery only discharges into the house (no battery-to-grid
export), which matches how the existing Solis setup is controlled.
"""
from __future__ import annotations

from datetime import datetime

from .model import Action, Battery, Control, Plan, PlanStep, Slot

EPS = 1e-9


def _eur(x: float) -> str:
    return f"€{x:.2f}".replace(".", ",")


def _cost(grid: float, slot: Slot) -> float:
    return grid * (slot.price if grid > 0 else slot.export_price)


def cost_without_battery(slots: list[Slot]) -> float:
    return sum(_cost(s.net_kwh, s) for s in slots)


def cost_self_use(slots: list[Slot], bat: Battery, soc: float) -> float:
    """Expected cost if the inverter just does self-use (cover deficits, store surplus)."""
    e = soc / 100 * bat.capacity_kwh
    floor = max(bat.min_soc, bat.reserve_soc) / 100 * bat.capacity_kwh
    total = 0.0
    for s in slots:
        net = s.net_kwh
        if net > 0:
            d = min(net, bat.discharge_step_kwh, max(0.0, (e - floor) * bat.eta_discharge))
            e -= d / bat.eta_discharge
            grid = net - d
        else:
            c = min(-net, bat.charge_step_kwh, max(0.0, (bat.capacity_kwh - e) / bat.eta_charge))
            e += c * bat.eta_charge
            grid = net + c
        total += _cost(grid, s)
    return total


def make_plan(soc: float, slots: list[Slot], bat: Battery, resolution_pct: float = 1.0,
              created: datetime | None = None, terminal_quantile: float = 0.25) -> Plan:
    if not slots:
        raise ValueError("Geen prijzen bekend: kan geen plan maken")
    cap = bat.capacity_kwh
    lo = min(bat.min_soc, soc)
    n = int(round((100 - lo) / resolution_pct)) + 1
    socs = [min(100.0, lo + k * resolution_pct) for k in range(n)]
    energy = [s / 100 * cap for s in socs]
    reserve = max(bat.min_soc, bat.reserve_soc)
    span = int(max(bat.charge_step_kwh, bat.discharge_step_kwh) / (cap * resolution_pct / 100)) + 2
    ranked = sorted(s.price for s in slots)
    terminal = ranked[int(terminal_quantile * (len(ranked) - 1))] * bat.eta_discharge

    def flow(a: int, b: int, slot: Slot):
        """Battery terminal energy and grid exchange for moving from state a to b, or None."""
        de = energy[b] - energy[a]
        if de >= 0:
            c, d = de / bat.eta_charge, 0.0
            if c > bat.charge_step_kwh + EPS:
                return None
        else:
            if socs[b] < reserve - EPS:
                return None  # never discharge below the reserve
            c, d = 0.0, -de * bat.eta_discharge
            if d > bat.discharge_step_kwh + EPS or d > max(slot.net_kwh, 0.0) + EPS:
                return None
        return c, d, slot.net_kwh + c - d

    def self_use_state(a: int, slot: Slot) -> int:
        """State plain self-use would reach from a (used to break ties)."""
        e, net = energy[a], slot.net_kwh
        if net > 0:
            floor = reserve / 100 * cap
            e -= min(net, bat.discharge_step_kwh, max(0.0, (e - floor) * bat.eta_discharge)) / bat.eta_discharge
        else:
            e += min(-net, bat.charge_step_kwh, max(0.0, (cap - e) / bat.eta_charge)) * bat.eta_charge
        return min(range(max(0, a - span), min(n, a + span + 1)), key=lambda k: abs(energy[k] - e))

    value = [-e * terminal for e in energy]
    policy: list[list[int]] = []
    for slot in reversed(slots):
        new_value, choice = [0.0] * n, [0] * n
        for a in range(n):
            pref = self_use_state(a, slot)
            best, arg = float("inf"), a
            for b in range(max(0, a - span), min(n, a + span + 1)):
                f = flow(a, b, slot)
                if f is None:
                    continue
                v = _cost(f[2], slot) + value[b]
                if v < best - 1e-7 or (abs(v - best) <= 1e-7 and abs(b - pref) < abs(arg - pref)):
                    best, arg = v, b
            new_value[a], choice[a] = best, arg
        value = new_value
        policy.append(choice)
    policy.reverse()

    a = min(range(n), key=lambda k: abs(socs[k] - soc))
    steps: list[PlanStep] = []
    for slot, choice in zip(slots, policy):
        b = choice[a]
        c, d, grid = flow(a, b, slot)
        surplus = max(-slot.net_kwh, 0.0)
        if c > surplus + 0.01:
            action = Action.CHARGE_GRID
        elif c > EPS:
            action = Action.CHARGE_SOLAR
        elif d > EPS:
            action = Action.DISCHARGE
        elif slot.net_kwh > EPS and socs[a] > reserve + resolution_pct / 2:
            action = Action.HOLD
        else:
            action = Action.IDLE
        steps.append(PlanStep(slot.start, action, socs[a], socs[b], slot.price, grid, _cost(grid, slot)))
        a = b

    steps = _with_reasons(steps, slots, bat, reserve)
    return Plan(
        created=created or slots[0].start,
        steps=steps,
        cost=sum(s.cost for s in steps),
        cost_without_battery=cost_without_battery(slots),
        cost_self_use=cost_self_use(slots, bat, soc),
        meta={"horizon_end": slots[-1].start, "terminal_value": terminal},
    )


def _with_reasons(steps: list[PlanStep], slots: list[Slot], bat: Battery, reserve: float) -> list[PlanStep]:
    out = []
    for i, (st, slot) in enumerate(zip(steps, slots)):
        nxt = next((s for s in steps[i + 1:] if s.action == Action.DISCHARGE), None)
        later = f"{nxt.start:%H:%M} ({_eur(nxt.price)})" if nxt else None
        if st.action == Action.CHARGE_GRID:
            reason = (f"Goedkoop uur ({_eur(st.price)}): opslaan voor {later}" if later
                      else f"Goedkoop uur ({_eur(st.price)}): lading is later meer waard")
        elif st.action == Action.CHARGE_SOLAR:
            reason = f"Zonoverschot opslaan in plaats van terugleveren voor {_eur(slot.export_price)}"
        elif st.action == Action.HOLD:
            reason = (f"Bewaren voor {later}; nu {_eur(st.price)}" if later
                      else f"Bewaren: nu {_eur(st.price)}, lading is later meer waard")
        elif st.action == Action.DISCHARGE:
            reason = f"Duur moment ({_eur(st.price)}): huis draait op de batterij"
        elif st.soc_start <= reserve + 0.5 and slot.net_kwh > 0:
            reason = f"Batterij op minimale reserve ({reserve:.0f}%)"
        elif slot.net_kwh < 0:
            reason = "Batterij vol: overschot gaat naar het net"
        else:
            reason = "Geen voordeel om te laden of ontladen"
        out.append(PlanStep(st.start, st.action, st.soc_start, st.soc_end, st.price, st.grid_kwh, st.cost, reason))
    return out


def control_for(step: PlanStep, soc: float, bat: Battery) -> Control:
    """Translate a plan step into the reserve switch + target SoC.

    reserve on + target above SoC  -> the inverter charges from the grid
    reserve on + target = SoC      -> the battery holds its charge
    reserve off                    -> normal self-use (covers the house, stores solar)
    """
    if step.action == Action.CHARGE_GRID:
        return Control(True, float(min(100, round(max(step.soc_end, soc + 1)))), step.action, step.reason)
    if step.action == Action.HOLD:
        return Control(True, float(int(soc)), step.action, step.reason)
    return Control(False, bat.reserve_soc, step.action, step.reason)

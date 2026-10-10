"""Python replica of the decision logic in
`automation/blueprints/Nightly/Smartcharging Frankenergie - nightly.yaml` (v15.13).

Each 15-minute step the automation is evaluated once (the real blueprint runs every
5 minutes; with hourly prices that only changes timing by minutes). The replica
covers Emergency, Smart Charging, Discharging, Smart Hold and the default branch.
Optional features that need extra hardware switches (Feed-In Priority / Solar
Bypass, Boost, off-grid/backflow guard) are not modelled.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, replace
from datetime import datetime, timedelta

from .model import Battery, Dataset, physics, sun_is_up


@dataclass(frozen=True)
class BlueprintSettings:
    morning_survival_soc: float = 35
    peak_hours_count: int = 3
    buffer_discount_percentage: float = 40
    min_discharge_margin: float = 20
    min_base_soc: float = 15
    profit_lock_step: float = 5
    target_soc_winter: float = 90
    target_soc_summer: float = 30
    summer_solar_threshold: float = 15
    battery_capacity_kwh: float = 5.1
    charge_power_kw: float = 3.0
    safety_factor: float = 1.5
    max_price_cap: float = 0.35
    fallback_load_night: float = 0.3
    fallback_load_morning: float = 1.5
    fallback_load_day: float = 0.5
    fallback_load_evening: float = 2.0
    has_p1_and_battery_power: bool = True
    has_solar_remaining_sensor: bool = True

    def with_(self, **kw) -> "BlueprintSettings":
        return replace(self, **kw)


NONE = -999.0


def _r3(x: float) -> float:
    return round(x, 3)


def _load_for_hour(s: BlueprintSettings, hd: int) -> float:
    if hd < 6:
        return s.fallback_load_night
    if hd < 9:
        return s.fallback_load_morning
    if hd < 17:
        return s.fallback_load_day
    return s.fallback_load_evening


@dataclass
class BlueprintState:
    switch_on: bool = False
    target: float = 0.0
    last_paid: float = 0.25


class BlueprintStrategy:
    name = "blueprint"

    def __init__(self, settings: BlueprintSettings, forecast_bias: float = 1.0,
                 price_publish_hour: int = 14, start_last_paid: float = 0.25):
        self.s = settings
        self.bias = forecast_bias
        self.publish_hour = price_publish_hour
        self.state = BlueprintState(last_paid=start_last_paid)
        self.log: list[dict] = []

    # --- forecasts (Forecast.Solar stand-in: actual production x bias) -----------------
    def _prepare(self, ds: Dataset):
        self.daily_solar: dict = {}
        for t, sol in zip(ds.steps, ds.solar):
            self.daily_solar[t.date()] = self.daily_solar.get(t.date(), 0.0) + sol
        self.ds = ds

    def _solar_remaining(self, i: int) -> float:
        ds = self.ds
        day = ds.steps[i].date()
        tot = 0.0
        for j in range(i, len(ds.steps)):
            if ds.steps[j].date() != day:
                break
            tot += ds.solar[j]
        return tot * self.bias

    # --- one evaluation of the automation ----------------------------------------------
    def decide(self, i: int, soc: float) -> tuple[str, float, str]:
        s, st, ds = self.s, self.state, self.ds
        now = ds.steps[i]
        now_ts = now.timestamp()
        price = ds.price_at(now)
        current_soc = soc
        h = now.hour
        is_daytime = sun_is_up(now)

        # Known prices: today + (after publish hour) tomorrow
        last_day = now.date() + (timedelta(days=1) if h >= self.publish_hour else timedelta())
        slots = [(t.timestamp(), p) for t, p in ds.hourly_prices
                 if t.date() <= last_day and t.timestamp() >= now_ts - 3600]
        all_prices = [p for _, p in slots]
        charge_prices = [p for ts, p in slots if ts <= now_ts + 12 * 3600]
        sorted_charge = sorted(charge_prices, reverse=True)
        peak = 0.0
        if sorted_charge:
            c = min(len(sorted_charge), s.peak_hours_count)
            peak = sum(sorted_charge[:c]) / c
        sorted_all = sorted(all_prices)
        buffer_limit = peak * (1 - s.buffer_discount_percentage / 100)

        sol_today = self.daily_solar.get(now.date(), 0.0) * self.bias
        sol_tom = self.daily_solar.get(now.date() + timedelta(days=1), sol_today / self.bias) * self.bias
        relevant_solar = sol_tom if h >= 14 else sol_today
        dyn_target = s.target_soc_summer if relevant_solar > s.summer_solar_threshold else s.target_soc_winter

        if s.has_solar_remaining_sensor:
            raw_solar = self._solar_remaining(i)
            solar_load = sum(_load_for_hour(s, k) for k in range(h, 20))
            eff_solar_rem = max(raw_solar - solar_load, 0.0)
        else:
            eff_solar_rem = 0.0

        virt = current_soc + (3.0 if not st.switch_on else 0.0)
        deficit = dyn_target - virt
        if deficit > 0:
            solar_override = eff_solar_rem >= deficit / 100 * s.battery_capacity_kwh and price >= 0
        else:
            solar_override = True

        # Morning survival
        morning_limit = NONE
        if h < 6 or h >= 21:
            surv = s.morning_survival_soc
            active_m = st.switch_on and st.target == surv
            thr = surv if active_m else surv - 2
            if current_soc < thr:
                kwh = (surv - current_soc) / 100 * s.battery_capacity_kwh
                hours = max(math.ceil(kwh / s.charge_power_kw * s.safety_factor), 1)
                six = now.replace(hour=6, minute=0, second=0, microsecond=0)
                if h >= 6:
                    six += timedelta(days=1)
                night = sorted(p for ts, p in slots if ts < six.timestamp())
                if night:
                    morning_limit = night[min(hours - 1, len(night) - 1)]

        # Strict limit
        strict = NONE
        deficit = dyn_target - current_soc
        if deficit > 0:
            net_kwh = deficit / 100 * s.battery_capacity_kwh - eff_solar_rem
            if net_kwh > 0 and sorted_all:
                hours = max(math.ceil(net_kwh / s.charge_power_kw * s.safety_factor), 1)
                strict = sorted_all[min(hours - 1, len(sorted_all) - 1)]

        is_morning_charge = morning_limit != NONE and _r3(price) <= _r3(morning_limit) and current_soc < s.morning_survival_soc - 0.1
        normal_strict = strict != NONE and _r3(price) <= _r3(strict) and not solar_override
        normal_buffer = _r3(price) <= _r3(buffer_limit) and not solar_override
        if normal_strict or normal_buffer:
            active_target = dyn_target
        elif is_morning_charge:
            active_target = s.morning_survival_soc
        else:
            active_target = dyn_target

        # Discharge start price
        base_margin = st.last_paid * (1 + s.min_discharge_margin / 100)
        vsoc = current_soc + (2.0 if (not st.switch_on and current_soc > s.min_base_soc + 1) else 0.0)
        usable = vsoc - s.min_base_soc
        if usable > 0:
            hours_to_charge = 8
            for idx, (_, p) in enumerate(slots[:8]):
                if p <= strict or p <= buffer_limit:
                    hours_to_charge = min(hours_to_charge, idx)
            horizon = max(hours_to_charge, 1)
            rem = usable / 100 * s.battery_capacity_kwh
            n = 0
            for k in range(h, h + 24):
                if rem > 0:
                    rem -= _load_for_hour(s, k % 24)
                    n += 1
            hours_to_empty = max(n, 1)
            active_slots = sorted((p for _, p in slots[:horizon]), reverse=True)
            if active_slots:
                allowed = min(hours_to_empty, len(active_slots))
                raw_dis = max(base_margin, active_slots[allowed - 1])
            else:
                raw_dis = base_margin
        else:
            raw_dis = base_margin
        active_cl = max(strict, morning_limit)
        discharge_price = round(max(raw_dis, active_cl + 0.01) if active_cl != NONE else raw_dis, 4)

        # --- choose ---
        branch = "default"
        emerg_active = st.switch_on and st.target == s.min_base_soc + 2
        emerg_thr = s.min_base_soc + 2 if emerg_active else s.min_base_soc
        if current_soc < emerg_thr and price < s.max_price_cap * 1.5:
            branch = "noodladen"
            st.target = s.min_base_soc + 2
            st.switch_on = True
        elif (
            (morning_limit != NONE and _r3(price) <= _r3(morning_limit) and current_soc < s.morning_survival_soc - 0.1
             and price < s.max_price_cap and _r3(price) < _r3(discharge_price))
            or (strict != NONE and _r3(price) <= _r3(strict) and current_soc < dyn_target - 1
                and price < s.max_price_cap and not solar_override and _r3(price) < _r3(discharge_price))
            or (_r3(price) <= _r3(buffer_limit) and current_soc < dyn_target - 1
                and price < s.max_price_cap and not solar_override and _r3(price) < _r3(discharge_price))
        ):
            branch = "laden"
            if abs(st.target - active_target) > 0.1:
                st.target = active_target
            st.switch_on = True
        elif (current_soc > s.min_base_soc + 1
              and (_r3(price) >= _r3(discharge_price - 0.02) if not st.switch_on else _r3(price) >= _r3(discharge_price))
              and _r3(price) > _r3(buffer_limit)):
            branch = "ontladen"
            st.switch_on = False
        elif (_r3(price) > _r3(strict) and _r3(price) > _r3(morning_limit)
              and (_r3(price) < _r3(discharge_price - 0.02) if not st.switch_on else _r3(price) < _r3(discharge_price))
              and current_soc > s.min_base_soc):
            branch = "vasthouden"
            st.switch_on = True
            if (st.target - current_soc) > 2 or (current_soc - st.target) >= s.profit_lock_step:
                st.target = float(int(current_soc))
        else:
            st.switch_on = False

        self.log.append(dict(t=now, branch=branch, price=price, strict=strict, morning=morning_limit,
                             discharge=discharge_price, buffer=buffer_limit, dyn_target=dyn_target,
                             solar_override=solar_override, last_paid=st.last_paid))
        return ("reserve" if st.switch_on else "self"), st.target, branch

    def after_step(self, i: int, soc_old: float, res) -> None:
        """Replicates the 'Universal Price Engine' (weighted purchase price on SoC rise)."""
        st = self.state
        if res.soc <= soc_old + 1e-9:
            return
        now = self.ds.steps[i]
        price = self.ds.price_at(now)
        if self.s.has_p1_and_battery_power and res.charge > 1e-6:
            ratio = min(max(res.grid, 0.0) / res.charge, 1.0)
            cost = price * ratio
        else:
            cost = price if st.switch_on else 0.0
        if not sun_is_up(now) and cost == 0:
            return
        if res.soc > 0:
            st.last_paid = round(((soc_old * st.last_paid) + (res.soc - soc_old) * cost) / res.soc, 4)

    def run(self, ds: Dataset, bat: Battery, export_deduction: float = 0.0):
        self._prepare(ds)
        soc = ds.start_soc
        out = []
        for i, t in enumerate(ds.steps):
            mode, target, branch = self.decide(i, soc)
            price = ds.price_at(t)
            res = physics(bat, soc, ds.load[i], ds.solar[i], mode, target, price, price - export_deduction)
            self.after_step(i, soc, res)
            out.append((res, branch))
            soc = res.soc
        return out

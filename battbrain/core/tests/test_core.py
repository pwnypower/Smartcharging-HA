import os
import sys
import unittest
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from battbrain_core import (Action, Battery, LoadProfile, Slot, SolarCalibration,  # noqa: E402
                            build_slots, control_for, make_plan)

T0 = datetime(2026, 10, 7, 0, 0)
BAT = Battery(capacity_kwh=5.0, max_charge_kw=3.0, max_discharge_kw=3.0,
              eta_charge=0.95, eta_discharge=0.95, min_soc=10, reserve_soc=15)


def slots(prices_per_hour, load=0.1, solar=0.0, export=lambda p: p):
    out = []
    for h, p in enumerate(prices_per_hour):
        for q in range(4):
            out.append(Slot(T0 + timedelta(hours=h, minutes=15 * q), p, export(p), load, solar))
    return out


class PlannerTest(unittest.TestCase):
    def test_flat_prices_never_buy_to_store(self):
        plan = make_plan(50, slots([0.30] * 12), BAT)
        self.assertNotIn(Action.CHARGE_GRID, {s.action for s in plan.steps})
        self.assertLessEqual(plan.cost, plan.cost_self_use + 1e-6)

    def test_buys_cheap_and_uses_it_when_expensive(self):
        plan = make_plan(15, slots([0.10] * 3 + [0.30] * 3 + [0.50] * 3), BAT)
        charging = [s for s in plan.steps if s.action == Action.CHARGE_GRID]
        self.assertTrue(charging)
        self.assertTrue(all(s.price == 0.10 for s in charging))
        self.assertIn("opslaan voor 03:00 (€0,30)", charging[0].reason)
        self.assertEqual(plan.steps[-1].action, Action.DISCHARGE)
        self.assertLess(plan.cost, plan.cost_self_use)

    def test_spread_below_losses_is_not_traded(self):
        # 0.30 -> 0.32 does not pay for ~10% round-trip loss
        plan = make_plan(15, slots([0.30] * 4 + [0.32] * 4), BAT)
        self.assertNotIn(Action.CHARGE_GRID, {s.action for s in plan.steps})

    def test_holds_for_the_evening_peak(self):
        # the peak alone needs more than the battery holds: keep everything for it
        plan = make_plan(60, slots([0.25] * 4 + [0.45] * 4, load=0.2), BAT)
        self.assertEqual(plan.steps[0].action, Action.HOLD)
        self.assertIn("Bewaren voor 04:00", plan.steps[0].reason)

    def test_reserve_is_respected(self):
        plan = make_plan(40, slots([0.50] * 24, load=0.5), BAT)
        self.assertTrue(all(s.soc_end >= BAT.reserve_soc - 1e-6 for s in plan.steps))

    def test_stores_solar_when_export_pays_little(self):
        plan = make_plan(30, slots([0.25] * 4, load=0.05, solar=0.4, export=lambda p: p - 0.15), BAT)
        self.assertEqual(plan.steps[0].action, Action.CHARGE_SOLAR)

    def test_plan_reports_baselines(self):
        plan = make_plan(15, slots([0.10] * 3 + [0.50] * 3), BAT)
        self.assertGreater(plan.savings, 0)
        self.assertGreaterEqual(plan.gain_over_self_use, 0)
        self.assertIsNotNone(plan.next_change())

    def test_empty_horizon_is_an_error(self):
        with self.assertRaises(ValueError):
            make_plan(50, [], BAT)


class ControlTest(unittest.TestCase):
    def test_mapping(self):
        plan = make_plan(15, slots([0.10] * 3 + [0.50] * 3), BAT)
        step = next(s for s in plan.steps if s.action == Action.CHARGE_GRID)
        c = control_for(step, 15, BAT)
        self.assertTrue(c.reserve_on)
        self.assertGreater(c.target_soc, 15)
        dis = next(s for s in plan.steps if s.action == Action.DISCHARGE)
        self.assertFalse(control_for(dis, 60, BAT).reserve_on)
        hold = make_plan(60, slots([0.25] * 4 + [0.45] * 4, load=0.2), BAT).steps[0]
        c = control_for(hold, 60.4, BAT)
        self.assertEqual((c.reserve_on, c.target_soc), (True, 60.0))


class ForecastTest(unittest.TestCase):
    def test_load_profile_learns_hours(self):
        hist = []
        for d in range(14):
            for q in range(96):
                t = T0 - timedelta(days=14 - d) + timedelta(minutes=15 * q)
                hist.append((t, 0.4 if t.hour == 19 else 0.1))
        lp = LoadProfile().fit(hist)
        self.assertAlmostEqual(lp.expected(T0.replace(hour=19)), 0.4)
        self.assertAlmostEqual(lp.expected(T0.replace(hour=3)), 0.1)

    def test_load_profile_default_without_history(self):
        self.assertAlmostEqual(LoadProfile().expected(T0), 0.125)

    def test_solar_calibration_is_clamped(self):
        self.assertAlmostEqual(SolarCalibration().fit([(10, 7), (10, 7)]).factor, 0.7)
        self.assertAlmostEqual(SolarCalibration().fit([(1, 10)]).factor, 1.5)
        self.assertAlmostEqual(SolarCalibration().fit([(0.1, 5)]).factor, 1.0)

    def test_build_slots_stops_at_last_known_price(self):
        prices = {T0 + timedelta(hours=h): 0.2 for h in range(3)}
        s = build_slots(T0 + timedelta(minutes=37), prices, lambda t: 0.0, LoadProfile(),
                        lambda p: p - 0.15)
        self.assertEqual(s[0].start, T0 + timedelta(minutes=30))
        self.assertEqual(len(s), 10)
        self.assertAlmostEqual(s[0].export_price, 0.05)


if __name__ == "__main__":
    unittest.main()

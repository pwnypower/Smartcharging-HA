import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from smartsim.model import Battery, load_csv, physics  # noqa: E402
from smartsim.report import build_report  # noqa: E402
from smartsim.runner import run_all  # noqa: E402

DEMO = os.path.join(os.path.dirname(__file__), "..", "data", "demo_2026-10-07_09.csv")


class PhysicsTest(unittest.TestCase):
    def setUp(self):
        self.bat = Battery(capacity_kwh=5.0, max_power_kw=3.0, eta_charge=1.0, eta_discharge=1.0, hw_min_soc=10)

    def test_self_use_covers_deficit(self):
        r = physics(self.bat, 50, load=0.5, solar=0.0, mode="self", target=0, price=0.3, export_price=0.3)
        self.assertAlmostEqual(r.grid, 0.0)
        self.assertAlmostEqual(r.soc, 40.0)

    def test_self_use_respects_floor(self):
        r = physics(self.bat, 12, load=0.5, solar=0.0, mode="self", target=0, price=0.3, export_price=0.3)
        self.assertAlmostEqual(r.soc, 10.0)
        self.assertAlmostEqual(r.grid, 0.4)

    def test_reserve_grid_charges_at_max_power(self):
        r = physics(self.bat, 20, load=0.0, solar=0.0, mode="reserve", target=90, price=0.2, export_price=0.2)
        self.assertAlmostEqual(r.charge, 0.75)  # 3 kW * 15 min
        self.assertAlmostEqual(r.grid, 0.75)

    def test_reserve_holds_at_target(self):
        r = physics(self.bat, 50, load=0.5, solar=0.0, mode="reserve", target=50, price=0.3, export_price=0.3)
        self.assertAlmostEqual(r.soc, 50.0)
        self.assertAlmostEqual(r.grid, 0.5)


class ScenarioTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ds = load_csv(DEMO, 25)
        cls.bat = Battery()
        cls.sc = {s.result.name: s for s in run_all(cls.ds, cls.bat)}

    def test_demo_loaded(self):
        self.assertEqual(len(self.ds.steps), 3 * 96)
        self.assertEqual(len(self.ds.hourly_prices), 4 * 24)

    def test_optimal_is_a_lower_bound(self):
        opt = self.sc["optimal"].net_cost
        for name, s in self.sc.items():
            self.assertLessEqual(opt, s.net_cost + 0.02, name)

    def test_energy_balance(self):
        for name, s in self.sc.items():
            if name == "none":
                continue
            stored = (s.result.end_soc() - self.ds.start_soc) / 100 * self.bat.capacity_kwh
            charge = sum(r.charge for r in s.result.steps) * self.bat.eta_charge
            discharge = sum(r.discharge for r in s.result.steps) / self.bat.eta_discharge
            self.assertAlmostEqual(stored, charge - discharge, places=2, msg=name)
            for r in s.result.steps:
                self.assertGreaterEqual(r.soc, self.bat.hw_min_soc - 1e-6, name)
                self.assertLessEqual(r.soc, 100 + 1e-6, name)

    def test_report_renders(self):
        sc = list(self.sc.values())
        html = build_report(self.ds, self.bat, sc, sc, 0.15, {"2026-10-07": 3.78})
        self.assertIn("Batterij-simulatie", html)
        self.assertIn("Controle tegen de werkelijkheid", html)


if __name__ == "__main__":
    unittest.main()

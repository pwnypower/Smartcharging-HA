import os
import sys
import unittest
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import battbrain_core as core  # noqa: E402
from battbrain_app import setup  # noqa: E402
from battbrain_app.backtest import run_backtest  # noqa: E402
from battbrain_app.config import Settings  # noqa: E402
from battbrain_app.demo import DemoSource, demo_settings  # noqa: E402
from battbrain_app.history import bucket_avg  # noqa: E402
from battbrain_app.prices import TZ  # noqa: E402

NOW = datetime(2026, 10, 10, 15, 20, tzinfo=TZ)


def st(eid, state, unit="", **attrs):
    a = dict(attrs)
    if unit:
        a["unit_of_measurement"] = unit
    return {"entity_id": eid, "state": state, "attributes": a}


PRICES = [{"from": (NOW.replace(hour=0, minute=0) + timedelta(hours=h)).isoformat(), "price": 0.2} for h in range(24)]
HA_STATES = [
    st("sensor.solis_battery_soc", "56", "%", device_class="battery", friendly_name="Solis Battery SOC"),
    st("sensor.pixel_8_battery_level", "80", "%", device_class="battery"),
    st("sensor.frank_energie_current_electricity_price_all_in", "0.23", "€/kWh", prices=PRICES),
    st("sensor.energy_production_today", "4.1", "kWh"),
    st("sensor.energy_production_today_remaining", "1.2", "kWh"),
    st("sensor.energy_production_tomorrow", "6.0", "kWh"),
    st("sensor.p1_meter_active_power", "450", "W", device_class="power"),
    st("sensor.solis_pv_power", "1200", "W", device_class="power"),
    st("sensor.solis_battery_power", "-300", "W", device_class="power"),
    st("switch.solis_backup_mode", "off"),
    st("switch.koffie", "off"),
    st("number.solis_reserve_soc", "20", "%"),
    st("number.solis_overdischarge_soc", "10", "%"),
]


class SetupTest(unittest.TestCase):
    def test_detects_a_typical_solis_install(self):
        best = {r: (c[0]["entity_id"] if c else None) for r, c in setup.detect(HA_STATES).items()}
        self.assertEqual(best["soc"], "sensor.solis_battery_soc")
        self.assertEqual(best["price"], "sensor.frank_energie_current_electricity_price_all_in")
        self.assertEqual(best["solar_today"], "sensor.energy_production_today")
        self.assertEqual(best["solar_remaining"], "sensor.energy_production_today_remaining")
        self.assertEqual(best["grid_power"], "sensor.p1_meter_active_power")
        self.assertEqual(best["solar_power"], "sensor.solis_pv_power")
        self.assertEqual(best["battery_power"], "sensor.solis_battery_power")
        self.assertEqual(best["reserve_switch"], "switch.solis_backup_mode")
        self.assertEqual(best["target_soc"], "number.solis_reserve_soc")

    def test_auto_fill_never_touches_control_entities(self):
        s = Settings()
        filled = setup.auto_fill(s, setup.detect(HA_STATES))
        self.assertEqual(s.soc_entity, "sensor.solis_battery_soc")
        self.assertNotIn("reserve_switch", filled)
        self.assertEqual(s.reserve_switch_entity, "")
        self.assertEqual(s.target_soc_entity, "")

    def test_auto_fill_keeps_what_the_user_chose(self):
        s = Settings(soc_entity="sensor.my_soc")
        setup.auto_fill(s, setup.detect(HA_STATES))
        self.assertEqual(s.soc_entity, "sensor.my_soc")

    def test_check_reports_problems_and_suggestions(self):
        s = Settings(soc_entity="sensor.typo", price_entity="sensor.frank_energie_current_electricity_price_all_in",
                     price_attribute="wrong", grid_power_entity="sensor.energy_production_today")
        rep = setup.check(s, HA_STATES)
        rows = {r["role"]: r for r in rep["roles"]}
        self.assertEqual(rep["verdict"], "incomplete")
        self.assertEqual(rows["soc"]["status"], "missing")
        self.assertEqual(rows["soc"]["suggestions"][0]["entity_id"], "sensor.solis_battery_soc")
        self.assertEqual(rows["price"]["status"], "wrong")
        self.assertIn("'prices'", rows["price"]["note"])
        self.assertEqual(rows["grid_power"]["status"], "wrong")
        self.assertIn("soc_entity: sensor.typo", rep["options_yaml"])

    def test_demo_install_is_control_ready(self):
        s = demo_settings(Settings())
        self.assertEqual(setup.check(s, DemoSource(NOW).get_states())["verdict"], "control_ready")


class BucketTest(unittest.TestCase):
    def test_time_weighted_average(self):
        t0 = NOW.replace(minute=0)
        pts = [(t0 - timedelta(minutes=5), 100.0), (t0 + timedelta(minutes=5), 400.0)]
        out = bucket_avg(pts, t0, t0 + timedelta(minutes=30))
        self.assertAlmostEqual(out[t0], (100 * 5 + 400 * 10) / 15)
        self.assertAlmostEqual(out[t0 + timedelta(minutes=15)], 400)

    def test_no_value_before_first_point(self):
        t0 = NOW.replace(minute=0)
        out = bucket_avg([(t0 + timedelta(minutes=20), 1.0)], t0, t0 + timedelta(minutes=30))
        self.assertIsNone(out[t0])


class PhysicsTest(unittest.TestCase):
    bat = core.Battery(5.0, 2.0, 2.0, min_soc=10, reserve_soc=10)

    def test_self_use_covers_deficit(self):
        soc, grid = core.inverter_step(self.bat, 50, 0.4, 0.0)
        self.assertAlmostEqual(grid, 0.0)
        self.assertLess(soc, 50)

    def test_grid_charge_until_target(self):
        soc, grid = core.inverter_step(self.bat, 50, 0.1, 0.0, True, 80)
        self.assertAlmostEqual(grid, 0.6)  # 0.1 house + 0.5 kWh at 2 kW
        self.assertGreater(soc, 50)

    def test_hold_does_not_discharge(self):
        soc, grid = core.inverter_step(self.bat, 50, 0.3, 0.0, True, 50)
        self.assertAlmostEqual((soc, grid), (50, 0.3))


class BacktestTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.s = demo_settings(Settings(data_dir="/nonexistent"))
        cls.r = run_backtest(cls.s, DemoSource(NOW), NOW, days=2)

    def test_measured_matches_replayed_self_use(self):
        # the demo household ran on plain self-use before today: replaying it must give the same cost
        t = self.r["totals"]
        self.assertTrue(t["measured_ok"])
        self.assertAlmostEqual(t["measured"], t["self_use"], places=2)

    def test_battbrain_beats_self_use_and_2027_widens_the_gap(self):
        self.assertEqual(len(self.r["days"]), 2)
        self.assertGreater(self.r["totals"]["extra_vs_self_use"], 0)
        self.assertGreater(self.r["totals_2027"]["saving_battbrain"], self.r["totals"]["saving_battbrain"])

    def test_needs_price_and_grid(self):
        self.assertIn("error", run_backtest(Settings(), DemoSource(NOW), NOW))


if __name__ == "__main__":
    unittest.main()

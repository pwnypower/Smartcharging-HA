import os
import sys
import tempfile
import unittest
from datetime import date, datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import battbrain_core as core  # noqa: E402
from battbrain_app.advisor import Advisor, controls_match, export_price_fn  # noqa: E402
from battbrain_app.config import Settings  # noqa: E402
from battbrain_app.demo import DemoSource, demo_settings  # noqa: E402
from battbrain_app.history import load_history  # noqa: E402
from battbrain_app.prices import TZ  # noqa: E402
from battbrain_app.snapshot import build_snapshot  # noqa: E402
from battbrain_app.sun import daylight, solar_curve  # noqa: E402

NOW = datetime(2026, 10, 10, 15, 20, tzinfo=TZ)


class SunTest(unittest.TestCase):
    def test_daylight_in_october(self):
        rise, sett = daylight(date(2026, 10, 10), 52.1, 5.1)
        self.assertTrue(7 <= rise.hour + rise.minute / 60 <= 8.5, rise)
        self.assertTrue(18.5 <= sett.hour + sett.minute / 60 <= 19.5, sett)

    def test_curve_spreads_the_forecast(self):
        end = NOW.replace(hour=0, minute=0) + timedelta(days=2)
        c = solar_curve(NOW, 2.0, 5.0, 52.1, 5.1, end)
        today = sum(v for t, v in c.items() if t.date() == NOW.date())
        tomorrow = sum(v for t, v in c.items() if t.date() > NOW.date())
        self.assertAlmostEqual(today, 2.0, places=6)
        self.assertAlmostEqual(tomorrow, 5.0, places=6)
        self.assertEqual(c[NOW.replace(hour=23, minute=0)], 0.0)

    def test_missing_forecast_is_zero(self):
        c = solar_curve(NOW, None, None, 52.1, 5.1, NOW + timedelta(hours=3))
        self.assertEqual(sum(c.values()), 0.0)


class HistoryTest(unittest.TestCase):
    def test_load_from_grid_solar_battery(self):
        t0 = datetime(2026, 10, 9, 12, 0, tzinfo=TZ)
        raw = {
            "g": [{"state": "200", "last_changed": t0.isoformat()}],
            "s": [{"state": "1.0", "last_changed": t0.isoformat()}],  # kW
            "b": [{"state": "400", "last_changed": t0.isoformat()}],
        }
        out = load_history(raw, t0, t0 + timedelta(hours=1), "g", "s", "b", units={"s": "kW"})
        self.assertEqual(len(out), 4)
        self.assertAlmostEqual(out[0][1], (200 + 1000 - 400) / 1000 * 0.25)

    def test_gaps_are_skipped(self):
        t0 = datetime(2026, 10, 9, 12, 0, tzinfo=TZ)
        raw = {"l": [{"state": "500", "last_changed": (t0 + timedelta(minutes=30)).isoformat()}]}
        out = load_history(raw, t0, t0 + timedelta(hours=1), load="l")
        self.assertEqual([t.minute for t, _ in out], [30, 45])


class AdvisorTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.s = demo_settings(Settings(data_dir=self.tmp))
        self.src = DemoSource(NOW)

    def advise(self, now=NOW):
        adv = Advisor(self.s, DemoSource(now))
        return adv, adv.update(build_snapshot(self.s, DemoSource(now), now=now), now)

    def test_advice_has_everything_the_dashboard_needs(self):
        _, a = self.advise()
        self.assertIsNone(a["error"])
        for k in ("action", "label", "reason", "control", "savings", "plan", "log", "export"):
            self.assertIn(k, a)
        self.assertTrue(a["plan"][0]["t"] <= NOW.isoformat() < a["plan"][1]["t"])
        self.assertTrue(a["plan"][-1]["t"].startswith("2026-10-11T23:45"))
        self.assertGreaterEqual(a["savings"]["vs_self_use"], -0.01)

    def test_log_is_persisted_and_records_changes_only(self):
        adv, _ = self.advise()
        adv.update(build_snapshot(self.s, self.src, now=NOW), NOW)
        self.assertEqual(len(adv.log), 1)
        again = Advisor(self.s, self.src)
        self.assertEqual(len(again.log), 1)

    def test_meter_measures_saving_against_no_battery(self):
        adv = Advisor(Settings(data_dir=self.tmp), object())  # a source without demo history
        snap = {"price": {"now": 0.30}, "power": {"grid_w": 200.0, "battery_w": -800.0}}
        adv.meter(snap, NOW)                               # first call only starts the clock
        adv.meter(snap, NOW + timedelta(seconds=60))
        d = adv.days[NOW.date().isoformat()]
        self.assertAlmostEqual(d["cost"], 200 * 60 / 3.6e6 * 0.30, places=5)
        self.assertAlmostEqual(d["cost_no_battery"], 1000 * 60 / 3.6e6 * 0.30, places=5)
        adv.meter(snap, NOW + timedelta(minutes=10))       # gap: skipped
        self.assertAlmostEqual(d["minutes"], 1.0)
        today = adv.realised(NOW)["today"]
        self.assertAlmostEqual(today["saving"], round(800 * 60 / 3.6e6 * 0.30, 3))

    def test_solar_factor_needs_three_full_days(self):
        adv = Advisor(Settings(data_dir=self.tmp), object())
        for k in (1, 2):
            day = (NOW.date() - timedelta(days=k)).isoformat()
            adv.days[day] = {"minutes": 1440, "solar_kwh": 8.0, "solar_forecast_kwh": 10.0, "cost": 0, "cost_no_battery": 0}
        self.assertEqual(adv.solar_factor(NOW), (1.0, 2))
        day = (NOW.date() - timedelta(days=3)).isoformat()
        adv.days[day] = {"minutes": 1440, "solar_kwh": 8.0, "solar_forecast_kwh": 10.0, "cost": 0, "cost_no_battery": 0}
        f, n = adv.solar_factor(NOW)
        self.assertEqual(n, 3)
        self.assertAlmostEqual(f, 0.8)

    def test_meter_records_solar_and_morning_forecast(self):
        adv = Advisor(Settings(data_dir=self.tmp), object())
        morning = NOW.replace(hour=8)
        sn = {"price": {"now": 0.2}, "power": {"grid_w": 0.0, "battery_w": 0.0, "solar_w": 3600.0},
              "solar": {"today_kwh": 12.0}}
        adv.meter(sn, morning)
        adv.meter(sn, morning + timedelta(seconds=60))
        d = adv.days[NOW.date().isoformat()]
        self.assertAlmostEqual(d["solar_kwh"], 0.06)
        self.assertEqual(d["solar_forecast_kwh"], 12.0)

    def test_demo_is_consistent_with_its_own_plan(self):
        snap = build_snapshot(self.s, self.src, now=NOW)
        p = snap["power"]
        self.assertAlmostEqual(p["house_w"], p["grid_w"] + p["solar_w"] - p["battery_w"], places=3)
        self.assertGreaterEqual(snap["soc"], 14)

    def test_errors_without_soc_or_prices(self):
        adv = Advisor(Settings(data_dir=self.tmp), self.src)
        self.assertIn("error", adv.update({"soc": None, "solar": {}, "control": {}}, NOW))

    def test_export_price_switches_after_net_metering(self):
        s = Settings(saldering_end="2026-12-31", export_deduction=0.15)
        self.assertAlmostEqual(export_price_fn(s, date(2026, 12, 31))(0.30), 0.30)
        self.assertAlmostEqual(export_price_fn(s, date(2027, 1, 1))(0.30), 0.15)

    def test_controls_match(self):
        charge = core.Control(True, 60, core.Action.CHARGE_GRID, "")
        self.assertTrue(controls_match(charge, True, 58))
        self.assertFalse(controls_match(charge, True, 30))
        self.assertFalse(controls_match(charge, False, None))
        self.assertIsNone(controls_match(charge, None, None))
        self.assertTrue(controls_match(core.Control(False, 15, core.Action.IDLE, ""), False, 80))


if __name__ == "__main__":
    unittest.main()

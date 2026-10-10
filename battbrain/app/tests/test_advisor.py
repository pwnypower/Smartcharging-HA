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

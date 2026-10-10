import json
import os
import sys
import tempfile
import unittest
import urllib.request
from datetime import datetime
from threading import Thread

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from battbrain_app.config import Settings  # noqa: E402
from battbrain_app.demo import DemoSource, demo_settings  # noqa: E402
from battbrain_app.prices import TZ, levels, parse_prices, price_at  # noqa: E402
from battbrain_app.server import serve  # noqa: E402
from battbrain_app.snapshot import build_snapshot  # noqa: E402

NOW = datetime(2026, 10, 10, 15, 20, tzinfo=TZ)


class FakeHA:
    def __init__(self, states):
        self.states = states
        self.asked = []

    def get_state(self, entity_id):
        self.asked.append(entity_id)
        return self.states.get(entity_id)


class PricesTest(unittest.TestCase):
    def test_frank_style_list(self):
        raw = [{"from": "2026-10-10T00:00:00+02:00", "till": "2026-10-10T01:00:00+02:00", "price": 0.149},
               {"from": "2026-10-09T23:00:00Z", "price": 0.2}]
        p = parse_prices(raw)
        self.assertEqual(list(p.values()), [0.149, 0.2])
        self.assertEqual(list(p)[1], datetime(2026, 10, 10, 1, 0, tzinfo=TZ))

    def test_blueprint_repr_string(self):
        raw = "[{'from': datetime.datetime(2026, 10, 10, 18, 0, tzinfo=...), 'price': 0.307}]"
        self.assertEqual(parse_prices(raw), {datetime(2026, 10, 10, 18, 0, tzinfo=TZ): 0.307})

    def test_cents_are_converted(self):
        p = parse_prices([{"start": "2026-10-10T00:00:00+02:00", "value": 14.9}])
        self.assertAlmostEqual(list(p.values())[0], 0.149)

    def test_garbage_is_ignored(self):
        self.assertEqual(parse_prices(None), {})
        self.assertEqual(parse_prices([{"from": "nope", "price": 1}, 5]), {})

    def test_price_at_and_levels(self):
        p = parse_prices([{"from": f"2026-10-10T{h:02d}:00:00+02:00", "price": 0.1 * (h + 1)} for h in range(3)])
        self.assertAlmostEqual(price_at(p, datetime(2026, 10, 10, 1, 30, tzinfo=TZ)), 0.2)
        self.assertIsNone(price_at(p, datetime(2026, 10, 9, 23, 0, tzinfo=TZ)))
        self.assertEqual(levels([0.1, 0.2, 0.3]), ["low", "mid", "high"])


class SnapshotTest(unittest.TestCase):
    def test_demo_snapshot(self):
        snap = build_snapshot(demo_settings(Settings()), DemoSource(NOW), now=NOW)
        self.assertEqual(snap["price"]["now"], 0.143)  # 15:00 price of the demo day
        self.assertTrue(snap["price"]["tomorrow_known"])
        self.assertEqual(len(snap["price"]["curve"]), 48)
        self.assertEqual(snap["missing_entities"], [])
        self.assertIsNotNone(snap["soc"])

    def test_units_signs_and_house_load(self):
        s = Settings(grid_power_entity="sensor.p1", solar_power_entity="sensor.pv",
                     battery_power_entity="sensor.bat", battery_power_sign=-1)
        ha = FakeHA({
            "sensor.p1": {"state": "0.5", "attributes": {"unit_of_measurement": "kW"}},
            "sensor.pv": {"state": "1200", "attributes": {"unit_of_measurement": "W"}},
            "sensor.bat": {"state": "-800", "attributes": {"unit_of_measurement": "W"}},  # charging, negative
        })
        p = build_snapshot(s, ha, now=NOW)["power"]
        self.assertEqual((p["grid_w"], p["battery_w"], p["house_w"]), (500.0, 800.0, 900.0))

    def test_missing_unavailable_and_unconfigured(self):
        s = Settings(soc_entity="sensor.soc", price_entity="sensor.gone")
        ha = FakeHA({"sensor.soc": {"state": "unavailable", "attributes": {}}})
        snap = build_snapshot(s, ha, now=NOW)
        self.assertIsNone(snap["soc"])
        self.assertEqual(snap["missing_entities"], ["sensor.gone"])
        self.assertIn("grid_power", snap["unconfigured"])

    def test_unavailable_switch_is_unknown(self):
        s = Settings(reserve_switch_entity="switch.r")
        snap = build_snapshot(s, FakeHA({"switch.r": {"state": "unavailable", "attributes": {}}}), now=NOW)
        self.assertIsNone(snap["control"]["reserve_on"])

    def test_no_calls_when_disconnected(self):
        ha = FakeHA({})
        snap = build_snapshot(Settings(soc_entity="sensor.soc"), ha, now=NOW, connected=False)
        self.assertEqual(ha.asked, [])
        self.assertFalse(snap["connected"])


class SettingsTest(unittest.TestCase):
    def test_load_options_file(self):
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as fh:
            json.dump({"soc_entity": "sensor.x", "reserve_soc": 20, "unknown_key": 1}, fh)
        s = Settings.load(fh.name)
        os.unlink(fh.name)
        self.assertEqual((s.soc_entity, s.reserve_soc, s.extra), ("sensor.x", 20, {"unknown_key": 1}))


class ServerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        s = demo_settings(Settings(port=0, poll_seconds=3600, data_dir=tempfile.mkdtemp()))
        cls.httpd = serve(s, DemoSource(NOW), host="127.0.0.1")
        cls.base = f"http://127.0.0.1:{cls.httpd.server_address[1]}"
        Thread(target=cls.httpd.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.poller.stop()

    def get(self, path):
        try:
            with urllib.request.urlopen(self.base + path) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            return e.code, b""

    def test_snapshot_and_static_files(self):
        code, body = self.get("/api/snapshot")
        self.assertEqual(code, 200)
        self.assertTrue(json.loads(body)["demo"])
        self.assertEqual(self.get("/")[0], 200)
        self.assertEqual(self.get("/app.js")[0], 200)

    def test_no_path_traversal(self):
        self.assertEqual(self.get("/../battbrain_app/config.py")[0], 404)
        self.assertEqual(self.get("/%2e%2e/config.yaml")[0], 404)


if __name__ == "__main__":
    unittest.main()

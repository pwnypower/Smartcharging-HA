import os
import sys
import unittest
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from battbrain_app.config import Settings  # noqa: E402
from battbrain_app.controller import Controller  # noqa: E402
from battbrain_app.prices import TZ  # noqa: E402

NOW = datetime(2026, 10, 10, 13, 0, tzinfo=TZ)


class FakeHA:
    def __init__(self, states=None, fail=False):
        self.states = states or {}
        self.calls = []
        self.fail = fail

    def get_state(self, e):
        return self.states.get(e)

    def call_service(self, domain, service, data):
        if self.fail:
            raise OSError("HA weigert")
        self.calls.append((domain, service, data))


def settings(**kw):
    base = dict(control_mode="control", reserve_switch_entity="switch.reserve", target_soc_entity="number.target",
                reserve_soc=15, max_charge_price=0.40, min_switch_minutes=10)
    base.update(kw)
    return Settings(**base)


def snap(reserve_on=False, target=15.0, soc=40.0, price=0.20, connected=True):
    return {"connected": connected, "soc": soc, "price": {"now": price},
            "control": {"reserve_on": reserve_on, "target_soc": target}}


def advice(action="charge_grid", on=True, target=80, planned=NOW, error=None):
    a = {"action": action, "reason": "test", "control": {"reserve_on": on, "target_soc": target},
         "planned_at": planned.isoformat()}
    if error:
        a = {"error": error}
    return a


class ControllerTest(unittest.TestCase):
    def test_advice_mode_never_writes(self):
        ha = FakeHA()
        st = Controller(settings(control_mode="advice"), ha).apply(snap(), advice(), NOW)
        self.assertEqual(ha.calls, [])
        self.assertFalse(st["active"])

    def test_charge_sets_target_then_switch(self):
        ha = FakeHA()
        Controller(settings(), ha).apply(snap(), advice(), NOW)
        self.assertEqual(ha.calls, [("number", "set_value", {"entity_id": "number.target", "value": 80}),
                                    ("switch", "turn_on", {"entity_id": "switch.reserve"})])

    def test_idempotent_when_already_in_state(self):
        ha = FakeHA()
        Controller(settings(), ha).apply(snap(reserve_on=True, target=79), advice(), NOW)
        self.assertEqual(ha.calls, [])

    def test_self_use_turns_switch_off(self):
        ha = FakeHA()
        Controller(settings(), ha).apply(snap(reserve_on=True, target=60), advice("discharge", False, 15), NOW)
        self.assertEqual(ha.calls, [("switch", "turn_off", {"entity_id": "switch.reserve"})])

    def test_flapping_guard_delays_turning_on(self):
        ha = FakeHA()
        c = Controller(settings(), ha)
        c.apply(snap(reserve_on=True, target=60), advice("discharge", False, 15), NOW)   # off
        c.apply(snap(reserve_on=False), advice(), NOW + timedelta(minutes=3))           # on too soon
        self.assertNotIn(("switch", "turn_on", {"entity_id": "switch.reserve"}), ha.calls)
        c.apply(snap(reserve_on=False, target=80), advice(), NOW + timedelta(minutes=11))
        self.assertIn(("switch", "turn_on", {"entity_id": "switch.reserve"}), ha.calls)

    def test_deferred_toggle_is_not_a_verification_error(self):
        ha = FakeHA()
        c = Controller(settings(), ha)
        c.apply(snap(reserve_on=True, target=60), advice("discharge", False, 15), NOW)   # off now
        st = None
        for k in range(1, 6):  # wants to charge, but the toggle waits; target follows
            st = c.apply(snap(reserve_on=False, target=80), advice(), NOW + timedelta(minutes=k))
        self.assertIsNone(st["error"])

    def test_price_cap_blocks_grid_charging(self):
        ha = FakeHA()
        st = Controller(settings(max_charge_price=0.30), ha).apply(snap(reserve_on=True, price=0.35), advice(), NOW)
        self.assertEqual(ha.calls, [("switch", "turn_off", {"entity_id": "switch.reserve"})])
        self.assertIn("boven je maximum", st["last_command"]["reason"])

    def test_target_is_clamped_to_reserve(self):
        ha = FakeHA()
        Controller(settings(reserve_soc=20), ha).apply(snap(soc=12), advice("hold", True, 12), NOW)
        self.assertEqual(ha.calls[0], ("number", "set_value", {"entity_id": "number.target", "value": 20}))

    def test_stale_plan_falls_back_once(self):
        ha = FakeHA()
        c = Controller(settings(), ha)
        old = advice(planned=NOW - timedelta(minutes=30))
        st = c.apply(snap(reserve_on=True, target=80), old, NOW)
        self.assertTrue(st["fallback"])
        self.assertEqual(ha.calls, [("switch", "turn_off", {"entity_id": "switch.reserve"})])
        c.apply(snap(reserve_on=True, target=80), old, NOW + timedelta(minutes=1))
        self.assertEqual(len(ha.calls), 1)  # only once

    def test_disconnected_or_planner_error_falls_back(self):
        for sn, adv in ((snap(reserve_on=True, connected=False), advice()), (snap(reserve_on=True), advice(error="x"))):
            ha = FakeHA()
            st = Controller(settings(), ha).apply(sn, adv, NOW)
            self.assertTrue(st["fallback"])
            self.assertEqual(ha.calls[-1][1], "turn_off")

    def test_unavailable_switch_means_hands_off(self):
        ha = FakeHA()
        sn = snap()
        sn["control"]["reserve_on"] = None
        st = Controller(settings(), ha).apply(sn, advice(), NOW)
        self.assertEqual(ha.calls, [])
        self.assertIn("niet beschikbaar", st["error"])

    def test_conflicting_automation_blocks(self):
        ha = FakeHA({"automation.smartcharging": {"state": "on"}})
        st = Controller(settings(conflict_automation="automation.smartcharging"), ha).apply(snap(), advice(), NOW)
        self.assertEqual(ha.calls, [])
        self.assertIn("staat nog aan", st["blocked"])

    def test_pause_and_resume(self):
        ha = FakeHA()
        c = Controller(settings(), ha)
        c.pause(60, NOW)
        self.assertIsNotNone(c.apply(snap(), advice(), NOW + timedelta(minutes=5))["paused_until"])
        self.assertEqual(ha.calls, [])
        c.resume()
        c.apply(snap(), advice(), NOW + timedelta(minutes=6))
        self.assertTrue(ha.calls)

    def test_failed_call_is_reported_and_retried(self):
        ha = FakeHA(fail=True)
        c = Controller(settings(), ha)
        st = c.apply(snap(), advice(), NOW)
        self.assertFalse(st["last_command"]["ok"])
        ha.fail = False
        c.apply(snap(), advice(), NOW + timedelta(minutes=1))
        self.assertTrue(c.last_command["ok"])

    def test_inverter_not_following_is_reported(self):
        ha = FakeHA()
        c = Controller(settings(), ha)
        c.apply(snap(), advice(), NOW)
        st = None
        for k in range(1, 5):  # the switch never turns on; the flapping guard stops resending
            st = c.apply(snap(reserve_on=False, target=80), advice(), NOW + timedelta(minutes=k))
        self.assertIn("volgt het laatste commando niet", st["error"])


if __name__ == "__main__":
    unittest.main()

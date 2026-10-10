"""Smartcharging simulator: replays a period with the blueprint logic and alternatives."""
import os
import sys

# The planner lives in the BattBrain core package; make it importable without installing.
_CORE = os.path.join(os.path.dirname(__file__), "..", "..", "battbrain", "app")
if os.path.isdir(_CORE) and os.path.abspath(_CORE) not in sys.path:
    sys.path.insert(0, os.path.abspath(_CORE))

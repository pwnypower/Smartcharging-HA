"""Start BattBrain: `python3 -m battbrain_app` (add-on) or `python3 -m battbrain_app --demo`."""
from __future__ import annotations

import argparse
import logging

from .config import Settings
from .demo import DemoSource, demo_settings
from .ha import HAClient
from .server import main_loop, serve


def main(argv=None):
    ap = argparse.ArgumentParser(prog="battbrain")
    ap.add_argument("--demo", action="store_true", help="toon demodata, geen Home Assistant nodig")
    ap.add_argument("--port", type=int)
    ap.add_argument("--options", help="pad naar options.json (standaard /data/options.json)")
    a = ap.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    s = Settings.load(a.options)
    if a.port:
        s.port = a.port
    if a.demo or s.demo:
        s = demo_settings(s)
        httpd = serve(s, DemoSource(), host="0.0.0.0")
    else:
        ha = HAClient()
        httpd = serve(s, ha, ping=ha.ping)
    main_loop(httpd)


if __name__ == "__main__":
    main()

"""Command line entry point.

    python -m smartsim run data/demo_2026-10-07_09.csv -o rapport.html
    python -m smartsim convert export.csv -o mijn_week.csv --price sensor.x --solar sensor.y --grid sensor.z
"""
from __future__ import annotations

import argparse
import json
import os

from .blueprint import BlueprintSettings
from .ha_import import convert
from .model import Battery, load_csv
from .report import build_report
from .runner import run_all


def main(argv=None):
    ap = argparse.ArgumentParser(prog="smartsim")
    sub = ap.add_subparsers(dest="cmd", required=True)

    r = sub.add_parser("run", help="simuleer een periode en schrijf een HTML-rapport")
    r.add_argument("data", help="CSV: time,price_eur_kwh,load_kwh,solar_kwh")
    r.add_argument("-o", "--out", default="rapport.html")
    r.add_argument("--meta", help="JSON met batterij/instellingen (standaard: <data>.meta.json)")
    r.add_argument("--start-soc", type=float)
    r.add_argument("--capacity", type=float, help="batterijcapaciteit kWh")
    r.add_argument("--power", type=float, help="max laad/ontlaadvermogen kW")
    r.add_argument("--export-deduction-2027", type=float, default=0.15,
                   help="€/kWh die teruglevering na de salderingsregeling minder oplevert dan inkoop")

    c = sub.add_parser("convert", help="zet een Home Assistant history-export om naar simulator-CSV")
    c.add_argument("files", nargs="+")
    c.add_argument("-o", "--out", required=True)
    c.add_argument("--price", required=True, help="entity_id van de all-in prijssensor")
    c.add_argument("--solar", help="entity_id zonnevermogen")
    c.add_argument("--load", help="entity_id huisverbruik (vermogen)")
    c.add_argument("--grid", help="entity_id netvermogen (P1), + = afname")
    c.add_argument("--battery", help="entity_id batterijvermogen, + = laden")
    c.add_argument("--unit", default="W", choices=["W", "kW"])
    c.add_argument("--grid-sign", type=float, default=1.0)
    c.add_argument("--battery-sign", type=float, default=1.0)

    a = ap.parse_args(argv)
    if a.cmd == "convert":
        n = convert(a.files, a.out, a.price, a.solar, a.load, a.grid, a.battery, a.unit,
                    a.grid_sign, a.battery_sign)
        print(f"{n} kwartieren geschreven naar {a.out}")
        return

    meta_path = a.meta or os.path.splitext(a.data)[0] + ".meta.json"
    meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
    bat = Battery(**meta.get("battery", {}))
    if a.capacity:
        bat.capacity_kwh = a.capacity
    if a.power:
        bat.max_power_kw = a.power
    start_soc = a.start_soc if a.start_soc is not None else meta.get("start_soc", 25.0)
    ds = load_csv(a.data, start_soc)
    settings = BlueprintSettings(battery_capacity_kwh=bat.capacity_kwh, charge_power_kw=bat.max_power_kw,
                                 **meta.get("blueprint", {}))
    lp = meta.get("start_last_paid", 0.25)
    sc26 = run_all(ds, bat, settings, 0.0, lp)
    sc27 = run_all(ds, bat, settings, a.export_deduction_2027, lp)
    html = build_report(ds, bat, sc26, sc27, a.export_deduction_2027, meta.get("actual_grid_import"),
                        meta.get("source_note", ""))
    with open(a.out, "w") as fh:
        fh.write(html)
    for s in sc26:
        print(f"{s.result.label:45s} netto {s.net_cost:7.2f} EUR")
    print(f"Rapport: {a.out}")


if __name__ == "__main__":
    main()

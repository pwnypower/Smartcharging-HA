"""Look back: what would BattBrain have earned on your own data of the past days?

From Home Assistant's history (price, grid, solar, battery power, SoC) we rebuild every
15 minutes of the last full days and replay them four ways:

  no battery   : grid = consumption - solar
  self-use     : the inverter on its own (store surplus, cover deficits)
  BattBrain    : replanned every hour with only what was known then: today's prices
                 (tomorrow's after 14:00), a load profile learned from the days before and
                 a solar forecast = that day's actual total spread over a standard sun curve
  measured     : what your installation actually did (grid sensor x price)

Costs follow the net-metering rules of each day, and are also recalculated as if net metering
had already ended (2027), because that is where the difference grows.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta

import battbrain_core as core

from .config import Settings
from .history import bucket_avg, parse_series
from .prices import TZ
from .sun import solar_curve

PUBLISH_HOUR = 14   # day-ahead prices for tomorrow are known from about this hour
MIN_COVERAGE = 0.8  # a day needs data for at least 80% of its quarters


def _scale(source, entity: str) -> float:
    st = source.get_state(entity) if entity else None
    unit = str(((st or {}).get("attributes") or {}).get("unit_of_measurement") or "W").lower()
    return 1000.0 if unit == "kw" else 1.0


def _cost(grid: float, price: float, export_price: float) -> float:
    return grid * (price if grid > 0 else export_price)


def collect(s: Settings, source, start: datetime, end: datetime, warmup_days: int = 7) -> dict:
    """Quarter-hour series from HA history: load, solar, grid (kWh), price (EUR/kWh), soc (%)."""
    ents = {"grid": s.grid_power_entity, "solar": s.solar_power_entity, "battery": s.battery_power_entity,
            "load": s.load_power_entity, "price": s.price_entity, "soc": s.soc_entity}
    w0 = start - timedelta(days=warmup_days)
    raw = source.get_history([e for e in ents.values() if e], w0, end)
    avg = {}
    for k, e in ents.items():
        if not e:
            continue
        scale = 1.0 if k in ("price", "soc") else _scale(source, e)
        avg[k] = bucket_avg(parse_series(raw.get(e, []), scale), w0, end)
    steps = sorted(avg.get("grid") or avg.get("load") or {})
    out = {"t": [], "load": [], "solar": [], "grid": [], "price": [], "soc": []}
    for t in steps:
        g = avg["grid"].get(t) if "grid" in avg else None
        sol = avg["solar"].get(t) if "solar" in avg else 0.0
        bat = avg["battery"].get(t) if "battery" in avg else 0.0
        if "load" in avg:
            load = avg["load"].get(t)
        elif g is not None and sol is not None and bat is not None:
            load = g * s.grid_power_sign + sol - bat * s.battery_power_sign
        else:
            load = None
        price = avg["price"].get(t) if "price" in avg else None
        if price is not None and price > 2:
            price /= 100  # ct/kWh
        if load is None or sol is None:
            continue
        out["t"].append(t)
        out["load"].append(max(load, 0.0) / 4000)
        out["solar"].append(max(sol, 0.0) / 4000)
        out["grid"].append(None if g is None else g * s.grid_power_sign / 4000)
        out["price"].append(price)
        out["soc"].append(avg["soc"].get(t) if "soc" in avg else None)
    return out


def replay(s: Settings, data: dict, start: datetime, end: datetime, lat: float, lon: float,
           export_price, battery: core.Battery) -> dict:
    """Run the four scenarios over [start, end); returns per-day costs."""
    idx = [i for i, t in enumerate(data["t"]) if start <= t < end and data["price"][i] is not None]
    by_day: dict[date, list[int]] = {}
    for i in idx:
        by_day.setdefault(data["t"][i].date(), []).append(i)
    days = [d for d, ix in sorted(by_day.items()) if len(ix) >= 96 * MIN_COVERAGE]
    keep = {i for d in days for i in by_day[d]}
    hourly = {}
    for i, t in enumerate(data["t"]):
        if data["price"][i] is not None:
            hourly.setdefault(t.replace(minute=0), data["price"][i])
    day_solar = {}
    for i, t in enumerate(data["t"]):
        day_solar[t.date()] = day_solar.get(t.date(), 0.0) + data["solar"][i]
    soc0 = next((data["soc"][i] for i in sorted(keep) if data["soc"][i] is not None), 50.0)
    soc0 = max(battery.min_soc, min(100.0, soc0))
    soc_self = soc_bb = soc0
    rows = {d: {"day": d.isoformat(), "no_battery": 0.0, "self_use": 0.0, "battbrain": 0.0,
                "measured": 0.0, "measured_ok": True, "actions": {}} for d in days}
    plan, plan_i, curve_cache = None, -1, {}
    for i in sorted(keep):
        t, load, sol, price = data["t"][i], data["load"][i], data["solar"][i], data["price"][i]
        exp = export_price(t.date())(price)
        r = rows[t.date()]
        r["no_battery"] += _cost(load - sol, price, exp)
        g = data["grid"][i]
        if g is None:
            r["measured_ok"] = False
        else:
            r["measured"] += _cost(g, price, exp)
        soc_self, grid = core.inverter_step(battery, soc_self, load, sol)
        r["self_use"] += _cost(grid, price, exp)
        if plan is None or t.minute == 0 or i - plan_i >= 4:
            plan, plan_i = _plan(t, soc_bb, data, i, hourly, day_solar, curve_cache, lat, lon,
                                 export_price, battery), i
        k = min(len(plan.steps) - 1, (t - plan.steps[0].start) // timedelta(minutes=15)) if plan and plan.steps else -1
        if k >= 0:
            ctl = core.control_for(plan.steps[k], soc_bb, battery)
            soc_bb, grid = core.inverter_step(battery, soc_bb, load, sol, ctl.reserve_on, ctl.target_soc)
            r["actions"][ctl.action.value] = r["actions"].get(ctl.action.value, 0) + 1
        else:
            soc_bb, grid = core.inverter_step(battery, soc_bb, load, sol)
        r["battbrain"] += _cost(grid, price, exp)
    if days:
        # energy left in the battery at the end is worth something: credit the change against
        # the start at a low price (25th percentile), so scenarios that end fuller compare fairly
        prices = sorted(data["price"][i] for i in keep)
        p_ref = prices[len(prices) // 4] * battery.eta_discharge
        kwh = lambda soc: soc / 100 * battery.capacity_kwh  # noqa: E731
        last = rows[days[-1]]
        last["self_use"] -= (kwh(soc_self) - kwh(soc0)) * p_ref
        last["battbrain"] -= (kwh(soc_bb) - kwh(soc0)) * p_ref
        soc_end = next((data["soc"][i] for i in sorted(keep, reverse=True) if data["soc"][i] is not None), None)
        if soc_end is not None:
            last["measured"] -= (kwh(soc_end) - kwh(soc0)) * p_ref
    return {"days": [rows[d] for d in days]}


def _plan(t: datetime, soc: float, data: dict, i: int, hourly: dict, day_solar: dict, cache: dict,
          lat: float, lon: float, export_price, battery: core.Battery) -> core.Plan | None:
    last_day = t.date() + (timedelta(days=1) if t.hour >= PUBLISH_HOUR else timedelta())
    prices = {h: p for h, p in hourly.items() if h >= t.replace(minute=0) and h.date() <= last_day}
    day0 = t.replace(hour=0, minute=0)
    if day0 not in cache:  # "forecast" = the day's actual total over a standard sun curve
        cache[day0] = solar_curve(day0, day_solar.get(day0.date(), 0.0), day_solar.get(day0.date() + timedelta(days=1)),
                                  lat, lon, day0 + timedelta(days=2))
    curve = cache[day0]
    load = core.LoadProfile().fit((data["t"][j], data["load"][j]) for j in range(max(0, i - 96 * 14), i))
    slots = core.build_slots(t, prices, lambda x: curve.get(x, 0.0), load, export_price(t.date()))
    if not slots:
        return None
    return core.make_plan(soc, slots, battery, resolution_pct=2.0)


def run_backtest(s: Settings, source, now: datetime | None = None, days: int = 7,
                 lat: float = 52.1, lon: float = 5.1) -> dict:
    from .advisor import export_price_fn  # local import: advisor imports a lot

    now = (now or datetime.now(TZ)).astimezone(TZ)
    end = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start = end - timedelta(days=days)
    if not (s.price_entity and (s.grid_power_entity or s.load_power_entity)):
        return {"error": "Voor de terugblik zijn een prijssensor en een net- of verbruikssensor nodig."}
    battery = core.Battery(s.battery_capacity_kwh, s.max_power_kw, s.max_power_kw,
                           min_soc=max(0.0, s.reserve_soc - 1), reserve_soc=s.reserve_soc)
    data = collect(s, source, start, end)
    if not data["t"]:
        return {"error": "Geen bruikbare geschiedenis gevonden in Home Assistant."}

    def as_2027(_day):
        return lambda p: p - s.export_deduction

    now_rules = replay(s, data, start, end, lat, lon, lambda d: export_price_fn(s, d), battery)
    rules_2027 = replay(s, data, start, end, lat, lon, as_2027, battery)
    if not now_rules["days"]:
        return {"error": "Te weinig volledige dagen in de geschiedenis (minimaal één dag met 80% gegevens)."}

    def totals(res):
        keys = ("no_battery", "self_use", "battbrain", "measured")
        tot = {k: round(sum(d[k] for d in res["days"]), 2) for k in keys}
        tot["measured_ok"] = all(d["measured_ok"] for d in res["days"])
        n = len(res["days"])
        tot["saving_self_use"] = round(tot["no_battery"] - tot["self_use"], 2)
        tot["saving_battbrain"] = round(tot["no_battery"] - tot["battbrain"], 2)
        tot["saving_measured"] = round(tot["no_battery"] - tot["measured"], 2) if tot["measured_ok"] else None
        tot["extra_vs_self_use"] = round(tot["self_use"] - tot["battbrain"], 2)
        tot["extra_vs_measured"] = round(tot["measured"] - tot["battbrain"], 2) if tot["measured_ok"] else None
        tot["per_year_battbrain"] = round(tot["saving_battbrain"] / n * 365, 0)
        return tot

    for res in (now_rules, rules_2027):
        for d in res["days"]:
            for k in ("no_battery", "self_use", "battbrain", "measured"):
                d[k] = round(d[k], 3)
    return {
        "generated": now.isoformat(), "from": start.date().isoformat(), "to": (end - timedelta(days=1)).date().isoformat(),
        "days": now_rules["days"], "totals": totals(now_rules),
        "days_2027": rules_2027["days"], "totals_2027": totals(rules_2027),
        "assumptions": [
            "BattBrain plant elk uur opnieuw met alleen wat toen bekend was: de prijzen van vandaag, "
            f"die van morgen vanaf {PUBLISH_HOUR}:00, en je verbruikspatroon van de dagen ervoor.",
            "Als zonverwachting gebruiken we de werkelijke dagopbrengst, verdeeld over een standaard zoncurve. "
            "Een echte verwachting zit er soms naast, dus de werkelijke opbrengst kan iets lager uitvallen.",
            f"Batterij: {s.battery_capacity_kwh:g} kWh, {s.max_power_kw:g} kW, rendement 95% per richting, "
            f"reserve {s.reserve_soc:g}%.",
            f"2027: teruglevering levert €{s.export_deduction:.2f} per kWh minder op dan de inkoopprijs.".replace(".", ",", 1),
            "Een week zegt weinig over een jaar: het bedrag per jaar is een ruwe doorrekening van deze week.",
        ],
    }

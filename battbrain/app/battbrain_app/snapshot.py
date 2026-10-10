"""Builds the dashboard snapshot from Home Assistant states (read-only)."""
from __future__ import annotations

from datetime import datetime, timedelta

from .config import Settings
from .ha import StateSource
from .prices import TZ, levels, parse_prices, price_at

UNAVAILABLE = {"unknown", "unavailable", "none", ""}


def _number(state: dict | None) -> float | None:
    if not state or str(state.get("state", "")).lower() in UNAVAILABLE:
        return None
    try:
        return float(state["state"])
    except (TypeError, ValueError):
        return None


def _watts(state: dict | None, sign: int) -> float | None:
    v = _number(state)
    if v is None:
        return None
    unit = (state.get("attributes", {}).get("unit_of_measurement") or "W").strip()
    if unit.lower() == "kw":
        v *= 1000
    return v * (1 if sign >= 0 else -1)


def build_snapshot(s: Settings, ha: StateSource, now: datetime | None = None,
                   connected: bool = True) -> dict:
    now = (now or datetime.now(TZ)).astimezone(TZ)
    entities = {
        "soc": s.soc_entity, "price": s.price_entity,
        "solar_today": s.solar_today_entity, "solar_remaining": s.solar_remaining_entity,
        "solar_tomorrow": s.solar_tomorrow_entity, "grid_power": s.grid_power_entity,
        "solar_power": s.solar_power_entity, "battery_power": s.battery_power_entity,
        "reserve_switch": s.reserve_switch_entity, "target_soc": s.target_soc_entity,
    }
    states = {k: (ha.get_state(e) if e and connected else None) for k, e in entities.items()}
    missing = [e for k, e in entities.items() if e and connected and states[k] is None]
    unconfigured = [k for k, e in entities.items() if not e]

    # prices: today + tomorrow (whatever the sensor publishes)
    price_state = states["price"]
    prices = parse_prices((price_state or {}).get("attributes", {}).get(s.price_attribute)) if price_state else {}
    today = now.date()
    window = {t: p for t, p in prices.items() if today <= t.date() <= today + timedelta(days=1)}
    price_now = price_at(prices, now)
    if price_now is None:
        price_now = _number(price_state)
    today_vals = [p for t, p in window.items() if t.date() == today]
    lv = dict(zip([t for t in window if t.date() == today], levels(today_vals)))
    lv_tom = levels([p for t, p in window.items() if t.date() > today])
    lv.update(zip([t for t in window if t.date() > today], lv_tom))
    curve = [{"t": t.isoformat(), "price": round(p, 4), "level": lv.get(t, "mid")} for t, p in window.items()]

    grid = _watts(states["grid_power"], s.grid_power_sign)
    solar = _watts(states["solar_power"], 1)
    battery = _watts(states["battery_power"], s.battery_power_sign)
    house = None
    if grid is not None and battery is not None:
        house = grid + (solar or 0.0) - battery

    soc = _number(states["soc"])
    reserve = states["reserve_switch"]
    return {
        "updated": now.isoformat(),
        "connected": connected,
        "demo": s.demo,
        "soc": soc,
        "stored_kwh": None if soc is None else round(soc / 100 * s.battery_capacity_kwh, 2),
        "price": {
            "now": None if price_now is None else round(price_now, 4),
            "level_now": next((c["level"] for c in reversed(curve) if datetime.fromisoformat(c["t"]) <= now), None),
            "today_min": min(today_vals) if today_vals else None,
            "today_max": max(today_vals) if today_vals else None,
            "tomorrow_known": any(t.date() > today for t in window),
            "curve": curve,
        },
        "power": {"grid_w": grid, "solar_w": solar, "battery_w": battery, "house_w": house},
        "solar": {
            "today_kwh": _number(states["solar_today"]),
            "remaining_kwh": _number(states["solar_remaining"]),
            "tomorrow_kwh": _number(states["solar_tomorrow"]),
        },
        "control": {
            "reserve_on": None if not reserve or reserve.get("state") not in ("on", "off") else reserve.get("state") == "on",
            "target_soc": _number(states["target_soc"]),
            "mode": "advies (alleen lezen)",
        },
        "system": {
            "capacity_kwh": s.battery_capacity_kwh,
            "max_power_kw": s.max_power_kw,
            "reserve_soc": s.reserve_soc,
        },
        "missing_entities": missing,
        "unconfigured": unconfigured,
    }

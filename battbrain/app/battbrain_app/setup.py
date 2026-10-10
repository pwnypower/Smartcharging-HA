"""Installation check and entity detection.

New users should not have to type twelve entity_ids. `detect()` scores every Home Assistant
entity for each role BattBrain needs; `check()` reports, per role, what is configured, whether
it works and what we would suggest instead.

Read-only roles that are left empty are filled automatically with a confident match
(`auto_fill`). The two control entities never are: what BattBrain switches is always the
user's explicit choice.
"""
from __future__ import annotations

import re

from .config import Settings
from .prices import parse_prices

# role -> (settings field, label, group); group decides how loud a missing entity is
ROLES = {
    "soc": ("soc_entity", "Laadtoestand batterij (%)", "required"),
    "price": ("price_entity", "Stroomprijs met prijslijst", "required"),
    "solar_today": ("solar_today_entity", "Zonverwachting vandaag (kWh)", "recommended"),
    "solar_remaining": ("solar_remaining_entity", "Zonverwachting rest van vandaag (kWh)", "recommended"),
    "solar_tomorrow": ("solar_tomorrow_entity", "Zonverwachting morgen (kWh)", "recommended"),
    "grid_power": ("grid_power_entity", "Vermogen net (W)", "recommended"),
    "solar_power": ("solar_power_entity", "Vermogen zonnepanelen (W)", "recommended"),
    "battery_power": ("battery_power_entity", "Vermogen batterij (W)", "recommended"),
    "reserve_switch": ("reserve_switch_entity", "Reserve-/netladen-schakelaar", "control"),
    "target_soc": ("target_soc_entity", "Doel-SoC (number)", "control"),
}
CONTROL_ROLES = {"reserve_switch", "target_soc"}
AUTO_MIN_SCORE = 6
UNAVAILABLE = {"unknown", "unavailable", "none", ""}
# phones, watches, tablets, cars and remotes report a battery % too
NOT_A_HOME_BATTERY = re.compile(r"phone|iphone|pixel|galaxy|ipad|tablet|watch|airpods|remote|tesla|car_|_car|"
                                r"vacuum|robot|sensor_battery|_battery_level$|motion|door|window|thermostat")
SOLAR_DAY = {
    "solar_today": (r"energy_production_today$|forecast_today$|solar_forecast_today|pv_forecast_today", r"remaining"),
    "solar_remaining": (r"energy_production_today_remaining|remaining_today|today_remaining", None),
    "solar_tomorrow": (r"energy_production_tomorrow|forecast_tomorrow", None),
}


def _unit(st: dict) -> str:
    return str((st.get("attributes") or {}).get("unit_of_measurement") or "").strip().lower()


def _dc(st: dict) -> str:
    return str((st.get("attributes") or {}).get("device_class") or "").lower()


def _text(st: dict) -> str:
    name = str((st.get("attributes") or {}).get("friendly_name") or "")
    return (st.get("entity_id", "") + " " + name).lower()


def _price_list(st: dict) -> tuple[str, int]:
    """(attribute name, number of prices) of the best price list in the state's attributes."""
    best = ("", 0)
    for k, v in (st.get("attributes") or {}).items():
        if isinstance(v, (list, str)) and k not in ("friendly_name", "unit_of_measurement", "icon"):
            n = len(parse_prices(v))
            if n > best[1]:
                best = (k, n)
    return best


def score(role: str, st: dict) -> int:
    """How likely this entity fills the role; 0 = not at all."""
    eid = st.get("entity_id", "")
    domain = eid.split(".", 1)[0]
    text, unit, dc = _text(st), _unit(st), _dc(st)
    s = 0
    if role == "soc":
        if domain != "sensor" or unit != "%":
            return 0
        if NOT_A_HOME_BATTERY.search(eid):
            return 0
        s += 3 if dc == "battery" else 0
        s += 4 if re.search(r"\bsoc\b|_soc|soc_|state_of_charge|laadtoestand", text) else 0
        s += 2 if re.search(r"batter|accu|batterij", text) else 0
        s += 2 if re.search(r"solis|growatt|goodwe|huawei|sungrow|deye|sofar|victron|solaredge|"
                            r"sessy|zendure|marstek|anker|ecoflow|inverter|omvormer", text) else 0
        return s if s >= 4 else 0
    if role == "price":
        if domain != "sensor":
            return 0
        attr, n = _price_list(st)
        if n < 12:
            return 0
        s += 6
        s += 2 if re.search(r"all.?in|total|totaal|current_electricity_price|electricity_price", text) else 0
        s += 1 if re.search(r"frank|zonneplan|tibber|energyzero|nordpool|anwb|easyenergy|entsoe|vattenfall|eneco", text) else 0
        s -= 4 if re.search(r"\bgas\b|_gas", text) else 0
        s += 1 if attr == "prices" else 0
        return max(s, 0)
    if role in SOLAR_DAY:
        want, avoid = SOLAR_DAY[role]
        if domain != "sensor" or unit not in ("kwh", "wh"):
            return 0
        if not re.search(want, eid):
            return 0
        if avoid and re.search(avoid, eid):
            return 0
        return 8 + (1 if "forecast" in text or "energy_production" in eid else 0)
    if role in ("grid_power", "solar_power", "battery_power"):
        if domain != "sensor" or unit not in ("w", "kw") or (dc and dc != "power"):
            return 0
        pat = {"grid_power": r"grid|net(?!work)|meter|p1|power_consumption|dsmr|homewizard|import",
               "solar_power": r"\bpv\b|pv_|_pv|solar|zon|panel|dc_power",
               "battery_power": r"batter|accu|batterij"}[role]
        if not re.search(pat, text):
            return 0
        s = 6
        if role == "grid_power" and re.search(r"pv|solar|batter", text):
            s -= 4
        if role == "solar_power" and re.search(r"batter|grid", text):
            s -= 4
        if role == "battery_power" and re.search(r"phone|car|ev_", text):
            s -= 6
        s += 1 if re.search(r"total|totaal|active|actueel|current", text) else 0
        return max(s, 0)
    if role == "reserve_switch":
        if domain != "switch":
            return 0
        if re.search(r"reserve|backup|grid_charg|force_charg|netladen|charge_from_grid|ac_charg", text):
            return 8
        return 0
    if role == "target_soc":
        if domain != "number" or not re.search(r"soc|state_of_charge", text):
            return 0
        s = 4
        s += 4 if re.search(r"reserve|backup|target|doel|charge|laad", text) else 0
        s -= 6 if re.search(r"over.?discharge|min_soc|minimum|cut.?off", text) else 0
        return max(s, 0)
    return 0


def detect(states: list[dict], top: int = 3) -> dict[str, list[dict]]:
    """Best candidates per role: [{"entity_id", "name", "score", "state", "unit"}]."""
    out: dict[str, list[dict]] = {}
    for role in ROLES:
        ranked = []
        for st in states:
            sc = score(role, st)
            if sc > 0:
                ranked.append({"entity_id": st["entity_id"], "score": sc,
                               "name": (st.get("attributes") or {}).get("friendly_name") or st["entity_id"],
                               "state": st.get("state"), "unit": _unit(st)})
                if role == "price":
                    ranked[-1]["attribute"] = _price_list(st)[0]
        ranked.sort(key=lambda c: (-c["score"], c["entity_id"]))
        out[role] = ranked[:top]
    return out


def auto_fill(s: Settings, candidates: dict[str, list[dict]]) -> dict[str, str]:
    """Fill empty read-only roles with a confident, unambiguous match. Returns {role: entity_id}."""
    filled = {}
    for role, (field, _, _) in ROLES.items():
        if role in CONTROL_ROLES or getattr(s, field):
            continue
        c = candidates.get(role) or []
        if not c or c[0]["score"] < AUTO_MIN_SCORE:
            continue
        if len(c) > 1 and c[1]["score"] == c[0]["score"]:
            continue  # two equally good matches: let the user choose
        setattr(s, field, c[0]["entity_id"])
        filled[role] = c[0]["entity_id"]
    if "price" in filled:
        st_attr = candidates["price"][0].get("attribute")
        if st_attr:
            s.price_attribute = st_attr
    return filled


def check(s: Settings, states: list[dict], auto: dict[str, str] | None = None) -> dict:
    """Per role: configured entity, status and suggestions; plus an overall verdict."""
    by_id = {st["entity_id"]: st for st in states}
    candidates = detect(states)
    rows, problems = [], 0
    for role, (field, label, group) in ROLES.items():
        eid = getattr(s, field)
        st = by_id.get(eid) if eid else None
        if not eid:
            status, note = "unset", "Niet ingesteld"
        elif st is None:
            status, note = "missing", "Bestaat niet in Home Assistant"
        elif str(st.get("state", "")).lower() in UNAVAILABLE:
            status, note = "unavailable", "Geeft nu geen waarde"
        else:
            unit = (st.get("attributes") or {}).get("unit_of_measurement") or ""
            status, note = "ok", f"{st.get('state')} {unit}".strip()
            if role == "price":
                n = len(parse_prices((st.get("attributes") or {}).get(s.price_attribute)))
                if n == 0:
                    attr, found = _price_list(st)
                    status = "wrong"
                    note = (f"Geen prijslijst in attribuut '{s.price_attribute}'"
                            + (f"; wel {found} prijzen in '{attr}'" if found else ""))
                else:
                    note = f"{n} prijzen bekend"
            elif role in ("grid_power", "solar_power", "battery_power") and _unit(st) not in ("w", "kw"):
                status, note = "wrong", f"Eenheid '{_unit(st)}' is geen vermogen (W of kW)"
            elif role == "soc" and _unit(st) not in ("%", ""):
                status, note = "wrong", f"Eenheid '{_unit(st)}' is geen percentage"
        if status != "ok" and group == "required":
            problems += 1
        rows.append({"role": role, "label": label, "group": group, "option": field, "entity_id": eid,
                     "status": status, "note": note, "auto": bool(auto and auto.get(role) == eid and eid),
                     "suggestions": [c for c in candidates[role] if c["entity_id"] != eid]})
    ok = {r["role"] for r in rows if r["status"] == "ok"}
    if problems:
        verdict = "incomplete"
    elif {"reserve_switch", "target_soc"} <= ok:
        verdict = "control_ready"
    else:
        verdict = "advice_ready"
    yaml = "\n".join(f"{r['option']}: {(r['entity_id'] or (r['suggestions'][0]['entity_id'] if r['suggestions'] else ''))}"
                     for r in rows)
    return {"verdict": verdict, "roles": rows, "options_yaml": yaml}


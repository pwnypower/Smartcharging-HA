"""App settings: the add-on options (/data/options.json) or a JSON file / env vars for development."""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, field, fields

OPTIONS_PATH = "/data/options.json"


@dataclass
class Settings:
    # entities (all optional: the dashboard shows what is configured)
    soc_entity: str = ""
    price_entity: str = ""
    price_attribute: str = "prices"
    solar_today_entity: str = ""
    solar_remaining_entity: str = ""
    solar_tomorrow_entity: str = ""
    grid_power_entity: str = ""
    solar_power_entity: str = ""
    battery_power_entity: str = ""
    reserve_switch_entity: str = ""
    target_soc_entity: str = ""
    load_power_entity: str = ""
    # sign conventions: +1 = import / charging is positive
    grid_power_sign: int = 1
    battery_power_sign: int = 1
    # battery
    battery_capacity_kwh: float = 5.1
    max_power_kw: float = 3.0
    reserve_soc: float = 15.0
    # tariffs: net metering until this date, then exports earn `export_deduction` less than import
    saldering_end: str = "2026-12-31"
    export_deduction: float = 0.15
    # location for the solar curve; 0 = take it from Home Assistant
    latitude: float = 0.0
    longitude: float = 0.0
    history_days: int = 14
    plan_minutes: int = 5
    # runtime
    poll_seconds: int = 15
    port: int = 8099
    demo: bool = False
    data_dir: str = "/data"
    extra: dict = field(default_factory=dict)

    @classmethod
    def load(cls, path: str | None = None) -> "Settings":
        path = path or os.environ.get("BATTBRAIN_OPTIONS", OPTIONS_PATH)
        data: dict = {}
        if os.path.exists(path):
            with open(path) as fh:
                data = json.load(fh)
        known = {f.name for f in fields(cls)}
        kwargs = {k: v for k, v in data.items() if k in known}
        s = cls(**kwargs)
        s.extra = {k: v for k, v in data.items() if k not in known}
        if os.environ.get("BATTBRAIN_DEMO") == "1":
            s.demo = True
        return s

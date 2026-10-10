# BattBrain

BattBrain toont de toestand van je thuisbatterij, de stroomprijzen en de zon in één overzicht.
In deze versie (0.1, beta) **leest BattBrain alleen**: het stuurt je batterij niet aan.
Je bestaande automatisering blijft gewoon werken.

## Instellen

Vul in het tabblad *Configuratie* de entity_id's in. Alles is optioneel; het dashboard toont wat ingesteld is.

| Optie | Voorbeeld | Wat |
|---|---|---|
| `soc_entity` | `sensor.solis_battery_soc` | Laadtoestand van de batterij (%) |
| `price_entity` | `sensor.frank_energie_current_electricity_price_all_in` | Huidige all-in stroomprijs |
| `price_attribute` | `prices` | Attribuut met de prijzen van vandaag en morgen |
| `solar_today_entity` | `sensor.energy_production_today` | Forecast.Solar: verwachte opbrengst vandaag (kWh) |
| `solar_remaining_entity` | `sensor.energy_production_today_remaining` | Forecast.Solar: nog verwacht vandaag (kWh) |
| `solar_tomorrow_entity` | `sensor.energy_production_tomorrow` | Forecast.Solar: verwacht morgen (kWh) |
| `grid_power_entity` | `sensor.p1_meter_power` | Netvermogen (W of kW) |
| `solar_power_entity` | `sensor.solis_pv_power` | Zonnevermogen |
| `battery_power_entity` | `sensor.solis_battery_power` | Batterijvermogen |
| `reserve_switch_entity` | `switch.solis_reserve` | Reserveschakelaar (alleen getoond) |
| `target_soc_entity` | `number.solis_target_soc` | Doel-SoC (alleen getoond) |

De voorbeelden zijn namen zoals ze vaak heten; kopieer de echte namen uit je eigen Home Assistant
(bijvoorbeeld uit de instellingen van de Smartcharging-blueprint).

- `grid_power_sign`: `1` als afname positief is, `-1` als teruglevering positief is.
- `battery_power_sign`: `1` als laden positief is, `-1` als ontladen positief is.
- `demo: true` toont voorbeeldgegevens, handig om de app te bekijken zonder instellingen.

Prijzen boven 2 worden gelezen als ct/kWh en omgerekend naar €/kWh. Vermogen in kW wordt omgerekend naar W.

## Privacy

BattBrain draait volledig lokaal. Er gaat geen data naar internet.

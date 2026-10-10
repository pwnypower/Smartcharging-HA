# BattBrain

BattBrain toont de toestand van je thuisbatterij, de stroomprijzen en de zon in één overzicht.
In deze versie (0.2, beta) draait BattBrain in **adviesmodus**: het maakt elk kwartier een plan en legt uit
wat het zou doen, maar het stuurt je batterij niet aan. Je bestaande automatisering blijft gewoon werken,
en het dashboard laat zien of die hetzelfde doet als BattBrain adviseert.

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
| `load_power_entity` | `sensor.house_power` | Optioneel: huisverbruik. Zonder deze sensor rekent BattBrain het uit (net + zon − batterij) |

De voorbeelden zijn namen zoals ze vaak heten; kopieer de echte namen uit je eigen Home Assistant
(bijvoorbeeld uit de instellingen van de Smartcharging-blueprint).

- `grid_power_sign`: `1` als afname positief is, `-1` als teruglevering positief is.
- `battery_power_sign`: `1` als laden positief is, `-1` als ontladen positief is.
- `saldering_end`: tot en met deze datum telt teruglevering tegen de inkoopprijs (salderen).
- `export_deduction`: daarna levert een teruggeleverde kWh zoveel minder op dan de inkoopprijs (standaard €0,15).
- `latitude` / `longitude`: locatie voor de zonnecurve; `0` = overnemen uit Home Assistant.
- `history_days`: hoeveel dagen verbruiksgeschiedenis BattBrain gebruikt om je verbruik per uur te leren.
- `demo: true` toont voorbeeldgegevens, handig om de app te bekijken zonder instellingen.

## Hoe het advies werkt

Elke 5 minuten maakt BattBrain een plan tot het laatste uur met een bekende prijs. Het plan gebruikt:
- de prijzen van vandaag en (na de middag) morgen;
- de zonvoorspelling, verdeeld over de dag volgens de stand van de zon;
- je verbruik per uur, geleerd uit de afgelopen weken;
- het vermogen, de verliezen en de minimale reserve van je batterij.

Het dashboard toont de actie van nu met de reden, het plan als grafiek, het verwachte voordeel ten opzichte van
"geen batterij" en "alleen zelfverbruik", en een logboek van beslissingen. Het logboek staat in `/data`.

Prijzen boven 2 worden gelezen als ct/kWh en omgerekend naar €/kWh. Vermogen in kW wordt omgerekend naar W.

## Privacy

BattBrain draait volledig lokaal. Er gaat geen data naar internet.

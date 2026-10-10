# 🔋 Batterij-simulator

Speelt een afgelopen periode opnieuw af met je echte prijzen, zonopbrengst en verbruik, en vergelijkt:

| Scenario | Wat het is |
|---|---|
| Geen batterij | Referentie |
| Zelfverbruik | Batterij zonder sturing: laden met zonoverschot, ontladen bij tekort |
| Blueprint nightly | Python-kopie van de beslislogica uit `Smartcharging Frankenergie - nightly.yaml` (v15.13) |
| Blueprint, zon 30% te hoog | Zelfde, maar Forecast.Solar overschat de zon met 30% |
| Blueprint met herfstadvies | Drempel 25 kWh, buffer 15%, ontlaadmarge 10% |
| Optimaal | Wiskundig beste plan met perfecte voorspelling (bovengrens) |

Alles wordt doorgerekend voor 2026 (salderen) en voor 2027 (teruglevering levert standaard €0,15/kWh minder op dan inkoop).
Het resultaat is een HTML-rapport met besparingen, grafieken en wat de blueprint per uur deed.

Alleen Python 3.10+ nodig, geen extra pakketten.

## Snel starten (demo)

```bash
cd simulator
python3 -m smartsim run data/demo_2026-10-07_09.csv -o rapport.html
```

De demo-data (7–9 oktober 2026) is afgelezen van screenshots en dus een benadering.

## Met je eigen Home Assistant-data

1. In Home Assistant: **Geschiedenis** → kies de sensoren en periode → ⋮ → **Gegevens downloaden**. Neem op:
   - de all-in prijssensor van Frank Energie
   - zonnevermogen (W)
   - P1-netvermogen (W, + = afname) **of** een sensor voor huisverbruik
   - batterijvermogen (W, + = laden)
2. Omzetten:
   ```bash
   python3 -m smartsim convert history.csv -o mijn_week.csv \
     --price sensor.frank_energie_current_electricity_price_all_in \
     --solar sensor.solis_pv_power --grid sensor.p1_meter_power --battery sensor.solis_battery_power
   ```
   Draait een teken andersom, gebruik dan `--grid-sign -1` of `--battery-sign -1`.
3. Maak naast het CSV-bestand een `mijn_week.meta.json` (zie `data/demo_2026-10-07_09.meta.json`) met je batterij,
   start-SoC en eventuele afwijkende blueprint-instellingen (de namen zijn die van de blueprint-inputs, bv.
   `"target_soc_summer": 40`).
4. `python3 -m smartsim run mijn_week.csv -o rapport.html`

## CSV-formaat

`time,price_eur_kwh,load_kwh,solar_kwh` per uur of per kwartier (lokale tijd). Rijen zonder verbruik worden alleen
als prijsvooruitblik gebruikt (bv. de prijzen van morgen).

## Aannames

- Omvormer gedraagt zich als Solis: *reserve aan* = laden van het net tot het doel en niet ontladen eronder;
  *reserve uit* = zelfverbruik. Zonoverschot laadt altijd.
- De blueprint wordt elk kwartier geëvalueerd. Feed-In/Solar Bypass, Boost en de offgrid/backflow-functies zijn niet
  gemodelleerd.
- Prijzen voor morgen zijn bekend vanaf 14:00. De zonvoorspelling is de werkelijke opbrengst × bias.
- Energie die aan het eind extra in de batterij zit, wordt gewaardeerd tegen de gemiddelde prijs van de dag erna.

## Tests

```bash
python3 -m unittest discover -s tests
```

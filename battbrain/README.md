# 🧠🔋 BattBrain voor Home Assistant

Slimme sturing van een thuisbatterij op basis van dynamische prijzen, zonvoorspelling en je eigen
verbruikspatroon, klaar voor het einde van de salderingsregeling (2027).

> Status: in opbouw. Stap 1 (ontwerp) en stap 2 (kern) zijn klaar. Er is nog niets dat je batterij aanstuurt.

| Map | Inhoud |
|---|---|
| [`DESIGN.md`](DESIGN.md) | Ontwerpbesluiten: wat we uit het BattBrain-design overnemen en wat verandert |
| [`design/`](design/) | Het originele BattBrain-designpakket (HTML/React-prototype, logo, brandbook) |
| [`core/`](core/) | `battbrain_core`: planner, voorspellingen en besparingsberekening (alleen Python-standaardbibliotheek) |

## Hoe de planner werkt

1. **Slots:** voor elk kwartier waarvan de prijs bekend is: all-in prijs, terugleververgoeding,
   verwacht verbruik (`LoadProfile`, geleerd uit je geschiedenis) en verwachte zon
   (`SolarCalibration` corrigeert Forecast.Solar).
2. **Plan:** `make_plan()` zoekt met dynamisch programmeren het SoC-pad met de laagste kosten,
   rekening houdend met laad-/ontlaadvermogen, verliezen en je minimale reserve.
3. **Uitleg:** elke stap krijgt een actie (laden van net, zon opslaan, vasthouden, ontladen,
   zelfverbruik) en een reden in gewone taal.
4. **Sturing:** `control_for()` vertaalt een stap naar de reserve-schakelaar + doel-SoC.

```python
from battbrain_core import Battery, LoadProfile, build_slots, make_plan, control_for

bat = Battery(capacity_kwh=5.1, max_charge_kw=3.0, max_discharge_kw=3.0, reserve_soc=15)
slots = build_slots(now, prices, solar_kwh=lambda t: 0.0, load=LoadProfile().fit(history),
                    export_price=lambda p: p - 0.15)   # 2027: teruglevering levert minder op
plan = make_plan(soc=42, slots=slots, bat=bat)
print(plan.steps[0].action.label, "—", plan.steps[0].reason)
print(control_for(plan.steps[0], soc=42, bat=bat))
```

## Resultaat op echte data (7–9 okt 2026, zie `../simulator`)

| Besparing t.o.v. geen batterij | 2026 | 2027 |
|---|---|---|
| Alleen zelfverbruik | €0,74 | €2,27 |
| Huidige blueprint | €0,77 | €2,00 |
| **BattBrain-planner** | **€0,86** | **€2,39** |
| Theoretisch maximum | €1,12 | €2,49 |

## Tests

```bash
cd battbrain/core && python3 -m unittest discover -s tests
```

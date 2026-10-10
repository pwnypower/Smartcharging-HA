# BattBrain

BattBrain toont de toestand van je thuisbatterij, de stroomprijzen en de zon in één overzicht.
BattBrain maakt elk kwartier een plan voor je batterij en legt uit wat het doet en waarom.
Standaard staat het in **adviesmodus**: het stuurt niets, en het dashboard laat zien of je bestaande
automatisering hetzelfde doet als BattBrain adviseert. Pas als je `control_mode` op `control` zet,
stuurt BattBrain de batterij zelf (zie *Sturing aanzetten*).

## Instellen

Meestal hoef je bijna niets in te vullen. Met `auto_detect: true` (standaard) zoekt BattBrain bij het starten
zelf naar je laadtoestand, prijssensor, Forecast.Solar-sensoren en vermogenssensoren, en vult de lege opties in
als het zeker is van de match. Open daarna de kaart **Installatie** onderaan het dashboard: per sensor zie je of
hij werkt, wat BattBrain voorstelt en met **Kopieer instellingen** neem je alles over in het tabblad *Configuratie*
(⋮ → *Bewerken in YAML*).

De reserveschakelaar en het doel-SoC vult BattBrain nooit zelf in: wat BattBrain mag schakelen kies je zelf.

Je kunt alles ook met de hand invullen:

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
| `reserve_switch_entity` | `switch.solis_reserve` | Reserveschakelaar, voor sturing (BattBrain vult deze nooit zelf in) |
| `target_soc_entity` | `number.solis_target_soc` | Doel-SoC, voor sturing (BattBrain vult deze nooit zelf in) |
| `load_power_entity` | `sensor.house_power` | Optioneel: huisverbruik. Zonder deze sensor rekent BattBrain het uit (net + zon − batterij) |

De voorbeelden zijn namen zoals ze vaak heten; kopieer de echte namen uit je eigen Home Assistant
(bijvoorbeeld uit de instellingen van de Smartcharging-blueprint).

- `grid_power_sign`: `1` als afname positief is, `-1` als teruglevering positief is.
- `battery_power_sign`: `1` als laden positief is, `-1` als ontladen positief is.
- `saldering_end`: tot en met deze datum telt teruglevering tegen de inkoopprijs (salderen).
- `export_deduction`: daarna levert een teruggeleverde kWh zoveel minder op dan de inkoopprijs (standaard €0,15).
- `latitude` / `longitude`: locatie voor de zonnecurve; `0` = overnemen uit Home Assistant.
- `history_days`: hoeveel dagen verbruiksgeschiedenis BattBrain gebruikt om je verbruik per uur te leren.
- `control_mode`: `advice` (standaard, stuurt niets) of `control` (BattBrain stuurt).
- `max_charge_price`, `min_switch_minutes`, `conflict_automation`: zie *Sturing aanzetten*.
- `auto_detect`: lege sensoropties automatisch invullen (niet de schakelaar en het doel-SoC).
- `backtest_days`: hoeveel volle dagen de terugblik opnieuw afspeelt (standaard 7).
- `demo: true` toont voorbeeldgegevens, handig om de app te bekijken zonder instellingen.

## Terugblik op jouw data

De kaart **Terugblik** speelt de afgelopen dagen uit je Home Assistant-geschiedenis opnieuw af: je verbruik,
zonopbrengst en de prijzen per uur. Daarmee rekent BattBrain vier situaties door:

- **Zonder batterij**: alles wat je huis tekort komt van het net, overschot terug.
- **Alleen zelfverbruik**: de omvormer op zichzelf.
- **Jouw installatie (gemeten)**: wat je netmeter echt deed, met je huidige automatisering.
- **Met BattBrain**: elk uur een nieuw plan, met alleen wat op dat moment bekend was.

Met de knop *Vanaf 2027* zie je dezelfde dagen met de regels na het einde van salderen. De terugblik heeft een
prijssensor met geschiedenis en een net- of verbruikssensor nodig, en volle dagen met gegevens.

## Zonder add-on-store (Docker)

Gebruik je Home Assistant Container of Core, dan draai je BattBrain met Docker Compose; zie
[`standalone/docker-compose.yml`](../standalone/docker-compose.yml). Je hebt een *long-lived access token* nodig
(je profiel in Home Assistant → Beveiliging). Zet `BATTBRAIN_PASSWORD`, anders kan iedereen in je netwerk het
dashboard openen.

## Sturing aanzetten

Doe dit pas als het advies een tijd overtuigend is geweest.

1. Laat BattBrain eerst minstens een week in adviesmodus naast je huidige automatisering draaien.
   Kijk in het dashboard of het advies klopt en hoe vaak het overeenkomt.
2. Vul `conflict_automation` in met je huidige automatisering (bijvoorbeeld `automation.smartcharging`).
   Zolang die aan staat, stuurt BattBrain niet: twee systemen op één batterij werken elkaar tegen.
3. Zet die automatisering uit in Home Assistant.
4. Zet `control_mode` op `control` en start de app opnieuw.
5. Kijk de eerste dag mee in het dashboard (kaart *Sturing*). Met **Pauzeer 1 uur** zet je BattBrain
   direct stil; de omvormer houdt dan zijn laatste stand. Terug naar adviesmodus = `control_mode: advice`.

Wat BattBrain wel en niet doet:
- Het verandert alleen de reserveschakelaar en het doel-SoC, niets anders.
- Bij twijfel (geen verbinding, laadtoestand onbekend, plan ouder dan 20 minuten) zet het de reserve
  uit, zodat de omvormer gewoon zelfverbruik doet.
- Het laadt nooit van het net boven `max_charge_price` (standaard €0,40/kWh all-in).
- De reserveschakelaar gaat hooguit eens per `min_switch_minutes` (standaard 10) aan.
- Het controleert of de omvormer het commando volgt en meldt het als dat niet gebeurt.
- Het doel-SoC blijft altijd tussen je minimale reserve en 100%.

Gebruik op eigen risico: BattBrain is open-source software zonder garantie (zie de licentie). Controleer de instellingen van je omvormer
(minimale ontlaaddiepte, laadstroom) zelf; BattBrain verandert die niet.

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

BattBrain draait volledig lokaal. Er gaat geen data naar internet: geen account, geen telemetrie, geen cloud.
Alles wat BattBrain bewaart (logboek, gemeten besparing per dag) staat in `/data` van de app.

## Licentie

AGPL-3.0. Je mag BattBrain gebruiken, aanpassen en delen. Bied je een aangepaste versie aan anderen aan,
ook als dienst via internet, dan deel je de broncode van die versie.

# BattBrain 1.0: launchposts

Klaar om te plaatsen. Vervang `[link]`, `[e-mail]` en `[naam]`. Volgorde en timing staan in het
go-to-market-plan; de toon is die van een medetweaker: metingen, ook de kleine, en zelf reageren.

Vaste links:
- Repo: `https://github.com/pwnypower/Smartcharging-HA/tree/main/battbrain` (of de nieuwe repo)
- Landingspagina: `[link]`
- Wachtlijst Hosted: `[link]`

---

## 1. Tweakers-forum (nieuw topic, Duurzame energie of Domotica)

**Titel:** [Open source] BattBrain 1.0: onafhankelijke sturing voor je thuisbatterij in Home Assistant

```markdown
Hoi allemaal,

Ik heb een Solis S5-EH1P met 5,1 kWh, een dynamisch contract bij Frank en Home Assistant.
Mijn batterij stuurde ik met een eigen blueprint met prijsdrempels. In oktober deed hij steeds
minder, dus ben ik gaan meten. Daar is BattBrain uit gekomen, en vandaag staat versie 1.0 online.

**Wat ik mat (7–9 oktober, besparing t.o.v. geen batterij)**

| | Nu (salderen) | 2027* |
|---|---|---|
| Gewoon zelfverbruik | €0,74 | €2,27 |
| Mijn drempel-blueprint | €0,77 | €2,00 |
| BattBrain | €0,86 | €2,39 |
| Maximum (perfecte voorspelling) | €1,12 | €2,49 |

*teruglevering €0,15/kWh onder de inkoopprijs (aanname).

Drempels deden dus bijna niets, en na 2027 zelfs minder dan niets doen. Een planner die elk
kwartier rekent met prijzen, zonverwachting en je eigen verbruik haalt 96% van het maximum.
Eerlijk is eerlijk: bij 5 kWh in een grijze herfstweek is de winst boven zelfverbruik klein.

**Wat BattBrain 1.0 doet**
- Plant je batterij per kwartier en legt elke keuze uit ("Goedkoop uur (€0,13): opslaan voor 18:00 (€0,31)")
- Zoekt zelf je sensoren (batterij, prijs, Forecast.Solar, P1) en toont wat er ontbreekt
- **Terugblik:** speelt je afgelopen week uit je HA-geschiedenis opnieuw af en laat zien wat
  BattBrain had opgeleverd t.o.v. wat je installatie echt deed, nu en met de regels van 2027
- Begint in adviesmodus; sturen zet je zelf aan, via alleen de reserveschakelaar en het doel-SoC
- Valt bij twijfel terug op zelfverbruik, laadt nooit boven je maximumprijs, pauzeknop in het dashboard
- Draait lokaal: geen account, geen cloud, geen telemetrie. AGPL-3.0
- HA OS als app, of met Docker Compose naast HA Container/Core

**Wat het niet is**
Geen handel op de onbalansmarkt; daarvoor heb je een leverancier nodig. Getest op Solis;
andere merken werken als HA een reserveschakelaar en een doel-SoC heeft, maar dat wil ik samen
met jullie testen.

**Wat ik zoek**
- Testers met een ander merk dan Solis (Growatt, GoodWe, Huawei, Victron, Sessy, ...)
- Je Terugblik-bedrag na een week: zet het hier neer, ook als het tegenvalt
- Kritiek op de aannames

Repo en installatie: [link]
Geen zin in onderhoud? Er komt een gehoste versie; wachtlijst: [link]. Zelf draaien blijft gratis en volledig.

Ik reageer hier zelf.
```

Eerste 48 uur: elke vraag binnen een paar uur beantwoorden; bij rekenvragen naar de code verwijzen.
Verzamel de Terugblik-bedragen die mensen posten in een tabel in de openingspost.

---

## 2. Home Assistant Community (Share your Projects, Engels)

**Title:** BattBrain 1.0 – local, open-source battery planner for dynamic tariffs (self-hosted, no cloud)

```markdown
BattBrain is a Home Assistant app (add-on) that plans your home battery every 15 minutes from
day-ahead prices, your solar forecast and a load profile learned from your own history.

What's in 1.0:
- **Setup check with auto-detection** of SoC, price, Forecast.Solar and power sensors;
  control entities are never picked automatically
- **Look-back**: replays your last 7 days from HA history and shows what BattBrain would have
  saved vs. no battery, plain self-consumption and what your system actually did
- **Advice mode first**, opt-in control through two standard knobs (reserve switch + target SoC),
  fallback to self-consumption on stale data, max charge price, anti-flapping, command verification
- Explains every decision in plain language
- Local only, no account, no telemetry; AGPL-3.0; stdlib Python, no dependencies
- Runs as an add-on or with Docker Compose next to HA Container/Core

Measured on my system (Solis, 5.1 kWh, 3 days in October): BattBrain beat my old threshold
automation and, without net metering, got within 4% of a perfect-foresight optimum.
The gain over plain self-consumption is small for a small battery in autumn; the look-back
card computes it for your own setup.

The UI is Dutch for now (the Netherlands ends net metering on 1 January 2027).
Looking for testers with other inverters than Solis.

Repo: [link]
```

---

## 3. Reddit

**r/homeassistant (Engels)** – titel: *I measured what "smart" battery control actually earns. Then I built an open-source planner.*

```markdown
My threshold-based battery automation (cheap hour → charge, expensive hour → discharge) turned
out to do almost nothing compared to plain self-consumption, and after net metering ends it does
worse. So I built a planner that runs inside HA: 15-minute plan from day-ahead prices, solar
forecast and my own consumption, explained in plain language.

Version 1.0 can replay your last week from HA history and show what it would have saved on your
own data, so you don't have to take my numbers for it. Local only, AGPL, advice mode by default.

Repo: [link]. Feedback from non-Solis owners very welcome.
```

**r/thenetherlands of r/Klussers** – titel: *Ik heb gemeten wat slimme sturing van mijn thuisbatterij oplevert (spoiler: minder dan je denkt)*

```markdown
Op 1 januari stopt salderen en iedereen koopt een thuisbatterij met "slimme sturing".
Ik heb op mijn eigen batterij (5 kWh) gemeten wat die sturing oplevert:

- gewoon zelfverbruik, niets slims: ~€0,25 per dag besparing
- mijn eigen prijsdrempels: nauwelijks beter, en zonder salderen zelfs slechter
- een planner met voorspellingen: iets meer nu, duidelijk meer na 2027

Het meeste geld verdient de batterij zelf. Ik heb de planner open source gemaakt (BattBrain);
als je Home Assistant hebt, rekent hij op je eigen gegevens uit wat het bij jou oplevert.
Cijfers en code: [link]

Wat levert jullie batterij op?
```

---

## 4. LinkedIn (persoonlijk profiel)

```markdown
Op 1 januari stopt de salderingsregeling. Er komen elke maand zo'n 8.000 thuisbatterijen bij,
en bijna elke leverancier biedt er "slimme sturing" bij. Maar wie stuurt die batterij eigenlijk,
en hoe beslist hij?

Ik heb het op mijn eigen batterij gemeten. Simpele prijsregels deden bijna niets en kostten na 2027
zelfs geld. Een planner die per kwartier rekent met prijzen, zon en verbruik haalde 96% van wat
theoretisch kon.

Vandaag staat BattBrain 1.0 online: open-source sturing die je zelf draait, met elke leverancier
werkt en elke keuze uitlegt. Nieuw: hij rekent op je eigen gegevens van vorige week uit wat hij
had opgeleverd.

Ik zoek testers met Home Assistant, en ik praat graag met installateurs die batterijen verkopen
zonder goede eigen app. Link in de reacties.

#thuisbatterij #salderen #energietransitie #opensource #homeassistant
```

---

## 5. Mastodon / X / Bluesky (≤ 280 tekens)

```text
BattBrain 1.0 is uit: open-source, lokale sturing voor je thuisbatterij in Home Assistant.
Plant per kwartier, legt elke keuze uit, en rekent op je eigen data van vorige week uit wat het
had opgeleverd. Geen cloud, geen account. [link] #homeassistant #thuisbatterij
```

```text
Gemeten: mijn prijsdrempel-automatisering deed €0,03 beter dan niets doen, en na 2027 €0,27
slechter. Daarom bouwde ik BattBrain, nu 1.0. Open source, lokaal, eerlijk over kleine bedragen. [link]
```

---

## 6. Persbericht (voor Tweakers-nieuws, Bright, Duurzaam Ondernemen, lokale media)

```markdown
**Open-source BattBrain laat thuisbatterij-bezitters zelf de regie houden na einde salderen**

[Plaats], [datum] – Thuisbatterij-bezitters met Home Assistant kunnen vanaf vandaag BattBrain 1.0
gebruiken: gratis, open-source software die de batterij elk kwartier plant op dynamische
stroomprijzen, de zonverwachting en het eigen verbruik. BattBrain draait lokaal in huis, werkt
met elke energieleverancier met dynamische prijzen en legt elke beslissing in gewone taal uit.

Nederland telde in september 2026 ruim 79.000 geregistreerde thuisbatterijen, met zo'n 8.000 per
maand erbij. Op 1 januari 2027 stopt de salderingsregeling. De sturing van die batterijen ligt
nu vooral bij energieleveranciers en batterijmerken, in gesloten apps die met één merk of
contract werken.

"Ik wilde weten wat mijn batterij echt opleverde en waarom hij deed wat hij deed," zegt maker
[naam]. "Mijn eigen prijsregels bleken bijna niets op te leveren. BattBrain rekent het voor iedere
gebruiker uit op zijn eigen gegevens van de afgelopen week, ook als het bedrag klein is."

BattBrain begint in adviesmodus naast de bestaande sturing en stuurt de batterij pas als de
gebruiker dat aanzet. Het gebruikt daarvoor alleen de reserveschakelaar en het doel-laadniveau
van de omvormer, en valt bij twijfel terug op gewoon zelfverbruik. Een gehoste versie voor wie
geen Home Assistant wil, is in voorbereiding.

Meer informatie: [link] · Contact: [naam], [e-mail], [telefoon]

Noot voor de redactie: de genoemde metingen gaan over drie dagen in oktober 2026 op een
5,1 kWh-batterij (Solis, Frank Energie). Registratiecijfers: Zonneplan en Plugin-batterij.
```

---

## 7. Mail aan installateurs (B2B-pilot)

**Onderwerp:** Sturing voor de batterijen die u verkoopt, zonder eigen app te bouwen

```markdown
Goedendag [naam],

U verkoopt thuisbatterijen van [merk]. Na 1 januari vragen klanten wat hun batterij oplevert
en wie hem slim aanstuurt. Voor merken zonder goede eigen app is dat lastig te beantwoorden.

BattBrain is open-source sturing die per kwartier plant op dynamische prijzen, de zon en het
verbruik van het huishouden, en elke keuze uitlegt. Nieuw in versie 1.0: een terugblik die op
de gegevens van de klant uitrekent wat slimme sturing de afgelopen week had opgeleverd. Dat is
een eerlijk gesprek bij de keukentafel, en een reden om terug te komen.

Ik zoek vijf installateurs voor een pilot van drie maanden: wij richten BattBrain in bij
[10–20] klanten, u krijgt een overzicht van de resultaten per installatie. De pilot is gratis;
daarna denken we aan €15 per batterij per jaar.

Heeft u twintig minuten voor een gesprek in [week]?

Met vriendelijke groet,
[naam] · [e-mail] · [telefoon]
```

---

## 8. Mail aan een handelspartij of aggregator

**Onderwerp:** Open-source batterijsturing zoekt een partner voor de onbalansmarkt

```markdown
Goedendag [naam],

BattBrain stuurt thuisbatterijen in Home Assistant op dagprijzen, zon en verbruik: open source,
lokaal, met een groeiende groep technische gebruikers. De onbalansmarkt kunnen wij niet bedienen;
u wel. Wij zien een combinatie waarin BattBrain de dagplanning doet en uw platform de flexibiliteit
die overblijft verhandelt, met de opbrengst gedeeld.

Mag ik u in twintig minuten laten zien hoe de planner werkt en wat we meten?

Met vriendelijke groet,
[naam] · [e-mail]
```

# Prompt: BattBrain 1.0 launchvideo

Plak dit in een nieuwe sessie met deze repo. Het is geschreven als opdracht voor Claude Code.

---

## Opdracht

Maak een launchvideo voor **BattBrain 1.0**: open-source, lokale sturing voor je thuisbatterij in
Home Assistant. Lever drie versies:

| Versie | Formaat | Lengte | Waar |
|---|---|---|---|
| Hoofdvideo | 1920×1080, 30 fps, MP4 (H.264, AAC) | 60–75 s | Tweakers-topic, landingspagina, YouTube |
| Kort | 1080×1920, 30 fps | 25–30 s | LinkedIn, Instagram Reels, YouTube Shorts |
| Stil | Hoofdvideo met ingebrande ondertitels en zonder voice-over | zelfde | Autoplay zonder geluid |

Daarnaast: `.srt`-ondertitels (NL), een thumbnail van 1280×720 en het voice-overscript als tekst.
Zet alles in `battbrain/marketing/video/`. De bronbestanden (HTML-scènes en scripts) gaan in de repo;
de gerenderde MP4's alleen als ze kleiner zijn dan 20 MB.

## Publiek en gevoel

Kijkers zijn Nederlanders met een thuisbatterij en een dynamisch contract, vaak met Home Assistant.
Ze zijn technisch, wantrouwen marketing en reageren op metingen. De video voelt als een
medetweaker die laat zien wat hij gemeten en gebouwd heeft: rustig, precies en eerlijk. Het is geen
reclamespot.

**De ene boodschap:** *Je batterij, je data, je leverancier. BattBrain plant elk kwartier, legt uit
waarom, en rekent op je eigen data uit wat het oplevert.*

## Feiten die je mag gebruiken (en geen andere)

Hiervoor geldt: alleen deze tabel. Verzin geen bedragen, percentages of klantcitaten.

| Feit | Waarde | Bron in de repo |
|---|---|---|
| Salderen stopt | 1 januari 2027 | `battbrain/README.md` |
| Geregistreerde thuisbatterijen in NL | 79.000+ (sept 2026), ~8.000 per maand erbij | pitchdeck, dia 2 |
| Gemeten op Solis 5,1 kWh, Frank, 7–9 okt 2026 (besparing t.o.v. geen batterij, nu / 2027) | zelfverbruik €0,74 / €2,27 · drempelregels €0,77 / €2,00 · BattBrain €0,86 / €2,39 · maximum €1,12 / €2,49 | `simulator/`, README |
| BattBrain t.o.v. maximum in 2027 | 96% | idem |
| Veiligheid | alleen reserveschakelaar + doel-SoC; terugval naar zelfverbruik; maximumprijs; hooguit één wissel per 10 min; adviesmodus eerst | `app/DOCS.md` |
| Licentie en privacy | AGPL-3.0; lokaal, geen account, geen telemetrie | `app/DOCS.md` |
| Prijs | zelf hosten gratis; Hosted €3/mnd is een voorstel en heet "binnenkort" | `marketing/site/` |

Demobedragen (zoals "+€0,72" in de Terugblik) mogen in beeld als schermopname. Ze krijgen dan het
label "demo". Spreek ze nooit uit als resultaat.

## Merk

- Kleuren: achtergrond `#07130e`, oppervlak `#0e2119`, tekst `#ecf6f0`, gedempt `#a9c2b7`, accent `#2fd07a`.
- Actiekleuren (één kleur = één betekenis, dezelfde als in de app):
  - laden van het net `#4f8cff`
  - zon `#ffd84d`
  - ontladen `#ff9a3d`
  - vasthouden `#b59cff`
  - zelfverbruik `#8aa39a`
- Lettertypes: Space Grotesk (koppen) en Manrope (tekst). Ze staan in `battbrain/app/web/fonts/`.
- Logo: groen afgerond vierkant met een bliksem, met de tekst "Batt**Brain**" (Brain in accentgroen).

## Storyboard hoofdvideo (± 70 s)

| # | Tijd | Beeld | Voice-over (NL) |
|---|---|---|---|
| 1 | 0–5 s | Zwart. Een datum tikt naar **1 januari 2027**; het woord "salderen" wordt doorgestreept. | "Op 1 januari stopt salderen." |
| 2 | 5–12 s | De teller loopt op naar **79.000+** thuisbatterijen. Daaronder drie gesloten app-tegels met een slotje (niet herkenbaar als een bestaand merk). | "Er staan al tienduizenden thuisbatterijen. Maar wie stuurt ze aan, en hoe beslist die?" |
| 3 | 12–22 s | Twee balken groeien naar €2,27 (zelfverbruik) en €2,00 (drempelregels); de tweede kleurt oranje met het label "−€0,27". | "Ik mat het op mijn eigen batterij. Mijn slimme prijsregels deden na 2027 zelfs minder dan niets doen." |
| 4 | 22–34 s | Het echte dashboard (schermopname, demomodus): de hero "Ontladen" met de reden; de energiestroom met bewegende deeltjes; daarna wordt het plan ingezoomd, één kwartier per kleur. | "Daarom bouwde ik BattBrain. Elk kwartier een plan, met de prijzen van vandaag en morgen, je zonverwachting en je eigen verbruik. En bij elke keuze staat waarom." |
| 5 | 34–44 s | De kaart Installatie vult zich met groene stippen ("automatisch gevonden"); daarna de Terugblik met balken die groeien. De schakelaar "Vanaf 2027" wordt aangeklikt. | "Hij zoekt zelf je sensoren, en rekent op je eigen data van vorige week uit wat hij had opgeleverd. Nu, en na 2027." |
| 6 | 44–54 s | Een tabel bouwt zich op: €0,74, €0,77, **€0,86**, €1,12 met nu en 2027; "96%" licht op. Klein in beeld: "3 dagen · 5,1 kWh · oktober". | "Op mijn installatie haalde BattBrain zesennegentig procent van wat theoretisch kon. Eerlijk: bij een kleine batterij in de herfst is dat geen fortuin. Daarom laat hij je eigen bedrag zien." |
| 7 | 54–62 s | Zes veiligheidsregels verschijnen als korte regels; daarna de knop "Pauzeer 1 uur". | "Hij begint met advies. Sturen zet je zelf aan, alleen via twee knoppen, en bij twijfel doet je batterij gewoon zelfverbruik." |
| 8 | 62–70 s | Het logo op een donkere achtergrond, met daaronder "Open source · lokaal · gratis zelf draaien", de repo-URL en een QR-code naar de landingspagina. | "BattBrain. Je batterij, je data, je leverancier. Gratis, open source, nu te installeren." |

**Korte versie (9:16, ± 28 s):** scènes 1, 3, 4 (ingekort), 5 en 8, met grote ondertitels in het
middelste derde van het beeld. Elke scène wordt opnieuw opgemaakt voor staand formaat; een bijgesneden
16:9-beeld is niet goed genoeg. De eerste 2 seconden moeten zonder geluid werken: "Salderen stopt.
Wie stuurt je batterij?"

## Hoe je het maakt

1. **Controleer de gereedschappen:** kijk of `ffmpeg` er is (`ffmpeg -version`) en of Playwright met
   Chromium werkt (`/opt/pw-browsers/chromium`). Ontbreekt ffmpeg, kijk dan of er een statische build of
   een pip-wheel (`imageio-ffmpeg`) via het netwerk te halen is. Lukt dat niet, lever dan de
   frames-pijplijn plus een script dat de gebruiker lokaal draait. Lever nooit een halve video.
2. **Schermopnames uit de echte app:**
   - Start `python3 -m battbrain_app --demo --port 8099` in `battbrain/app`.
   - Neem met Playwright video op (`recordVideo`, 1920×1080, `deviceScaleFactor` 1, `colorScheme: 'dark'`, `locale: 'nl-NL'`, `timezoneId: 'Europe/Amsterdam'`).
   - Verberg de demomelding met `page.addStyleTag`. Laat het label "Demo" in de statuspil wel staan.
   - Scroll vloeiend met `page.mouse.wheel` in kleine stappen. Klik "Vanaf 2027" en open de kaart Installatie.
   - Wacht tot de Terugblik berekend is: poll `/api/backtest` tot er `totals` in staat.
3. **Motion graphics:** maak elke titelscène als één HTML-pagina in `video/scenes/`. Gebruik CSS-animaties die op een tijdlijn worden aangestuurd, met `animation-play-state` en `animation-delay` die je per frame zet via een `?t=`-parameter, zodat elk frame deterministisch is. Render de frames met Playwright-screenshots op 30 fps. Gebruik geen externe CDN's; de fonts komen uit de repo.
4. **Voice-over:**
   - Is er geen TTS beschikbaar, lever dan het script met timecodes (`voiceover.txt`) en een opnamegids: rustig tempo, ~140 woorden per minuut, één take per scène.
   - Bouw de video zo dat hij zonder stem werkt (de stille versie), en met stem zodra er een opname is: `assemble.sh` mixt `vo/*.wav` erin als die bestaan.
5. **Muziek:** gebruik geen muziek met onduidelijke licentie. Maak een zachte, synthetische ondergrond met ffmpeg (`sine` plus een laagdoorlaatfilter, of een eenvoudige akkoordpad) op −24 LUFS, of lever de video zonder muziek en zet in `README.md` waar een rechtenvrij nummer in moet.
6. **Samenvoegen:**
   - Zet alles in elkaar met één reproduceerbaar script, `video/assemble.sh`: ffmpeg, crossfades van 8 frames, de ondertitels ingebrand voor de stille versie, en loudnorm naar −16 LUFS voor de versie met stem.
   - Exporteer met `-pix_fmt yuv420p -movflags +faststart`.
7. **Thumbnail:** donkere achtergrond, links groot "Wie stuurt je batterij na 2027?", rechts een uitsnede van het dashboard. Moet leesbaar zijn op 320 px breed.

## Kwaliteitseisen (controleer ze vóór je oplevert)

- [ ] Elk getal in beeld of in de voice-over staat in de feitentabel hierboven, of is gelabeld als "demo".
- [ ] Geen logo's, kleuren of app-beelden van Frank, Zonneplan, Tibber of andere merken.
- [ ] Tekst in beeld is minimaal 36 px op 1080p (staand: 48 px) en staat minimaal 1,5 s stil.
- [ ] Ondertitels: maximaal 2 regels van 42 tekens, en synchroon (±150 ms).
- [ ] De actiekleuren betekenen hetzelfde als in de app.
- [ ] De eerste 3 seconden werken zonder geluid.
- [ ] `ffprobe` bevestigt de resolutie, 30 fps en een lengte binnen de marge. Bekijk 6 stilstaande frames (één per scène) als afbeelding voordat je oplevert.
- [ ] Er is een `README.md` in `video/` met: hoe je opnieuw rendert, welke onderdelen nog door een mens moeten (stem, muziek) en de bronnen van de cijfers.

Oplevering: een korte samenvatting met wat klaar is, wat je niet kon maken (bijvoorbeeld de stem) en
de paden naar de bestanden. Commit op de huidige branch; maak geen PR.

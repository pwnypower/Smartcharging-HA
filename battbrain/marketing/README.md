# BattBrain launchkit (1.0)

Alles om BattBrain 1.0 te pitchen en te lanceren. De strategie zelf (positionering, kanalen, fases
en doelen) staat in het go-to-market-plan; het verdienmodel in de notitie "Kan hier geld mee
verdiend worden?". Beide zijn gedeelde documenten buiten deze repo.

| Onderdeel | Waar | Voor wie |
|---|---|---|
| Landingspagina | [`site/`](site/) (statische HTML, geen build) | Iedereen die op een link klikt |
| Pitchdeck (12 dia's) | Slides-artifact, zie de link in het gesprek | Installateurs, handelspartijen, geldschieters, meetups |
| Launchposts | [`launch-posts.md`](launch-posts.md) | Tweakers, HA Community, Reddit, LinkedIn, Mastodon, pers, B2B-mails |
| Schermafbeeldingen | [`../docs/screenshots/`](../docs/screenshots/) | Posts, pers, deck |
| FAQ | In de landingspagina (`#faq`) | Gebruikers |

## Kernboodschap

**BattBrain is de onafhankelijke, open-source sturing voor je thuisbatterij: draai hem gratis zelf,
of laat ons hem hosten als je dat gedoe niet wilt.** Je batterij, je data, je leverancier.

Drie bewijzen die in elke uiting terugkomen:
1. Gemeten: drempelregels +€0,03 in 3 dagen, na 2027 −€0,27 t.o.v. zelfverbruik; BattBrain 96% van het maximum.
2. Terugblik: iedere gebruiker ziet zijn eigen bedrag van vorige week, ook als het klein is.
3. Veilig: alleen reserveschakelaar en doel-SoC, terugval naar zelfverbruik, adviesmodus eerst.

Wat we niet zeggen: bedragen per jaar die we niet gemeten hebben, "werkt met elke batterij",
of dat we beter zijn dan Frank of Zonneplan.

## Voor de lancering nog regelen

- [ ] Repo-rechten of nieuwe repo, zodat de installatielink werkt
- [ ] 1.0 een week op de eigen Solis in adviesmodus, daarna een dag sturen (V1_GOAL.md)
- [ ] Eigen domein voor `site/`; GitHub Pages of Netlify volstaat (de pagina is één HTML-bestand met twee afbeeldingen)
- [ ] Wachtlijst koppelen: het formulier in `site/index.html` slaat nu niets op. Koppel het aan een
      dienst als Buttondown, Mailchimp of een eigen formulierendpoint en pas de tekst na verzenden aan
- [ ] Contactgegevens invullen in het deck (dia 12), het persbericht en de B2B-mails
- [ ] Deck en landingspagina delen via het Share-menu (ze zijn nu privé)

## Lanceervolgorde

1. Tweakers-topic (dinsdag of woensdag, 's avonds); 48 uur lang zelf reageren
2. Twee dagen later: HA Community en r/homeassistant (Engels)
3. Na de eerste tien Terugblik-bedragen: LinkedIn en r/thenetherlands met die echte cijfers
4. Parallel: vijf installateurs en twee handelspartijen mailen (posts 7 en 8), deck als bijlage of link
5. Persbericht pas na de eerste week, met het aantal installaties erin

# Doel: BattBrain 1.0, klaar om te pitchen

BattBrain 1.0 is af als iemand die de app niet kent hem in tien minuten installeert, ziet wat hij
oplevert op zijn eigen data, en wij hem met één set materiaal kunnen pitchen: aan gebruikers
(Tweakers, HA-forum), aan partners (installateurs, energieleveranciers) en aan geldschieters.

## Product (v1.0)

| # | Onderdeel | Waarom het nodig is voor de pitch | Status |
|---|---|---|---|
| 1 | **Installatiecheck en automatische herkenning** van entiteiten | Nu moet je twaalf entity_id's overtypen; dat is de grootste afhaker | ✅ |
| 2 | **Terugblik op je eigen data**: wat had BattBrain de afgelopen 7 dagen opgeleverd t.o.v. geen batterij, alleen zelfverbruik en je huidige aanpak | Het sterkste verkoopargument is je eigen bedrag, niet ons voorbeeld | ✅ |
| 3 | **Draait ook zonder HA OS** (Docker Compose met HA-URL + token) | HA Container- en Core-gebruikers zijn een groot deel van de tweakers | ✅ |
| 4 | Planner, adviesmodus, sturing met veiligheidsregels, gemeten besparing | Stap 1–5, bestond al | ✅ |
| 5 | Versie 1.0.0, AGPL-3.0-licentie, changelog, documentatie, privacyverklaring | Open source moet je kunnen controleren | ✅ |
| 6 | Tests in CI op elke push | Vertrouwen in een product dat je batterij stuurt | ✅ |

Niet getest: de add-on op een echte Home Assistant-installatie en de Docker-build (CI bouwt en start
het image bij de eerste push; hier was geen Docker-daemon).

Niet in 1.0 (bewust): Engelse interface, andere omvormers dan via HA-entiteiten, een hosted versie.
Die staan op de roadmap in het pitchmateriaal.

## Marketing (launchkit)

| # | Onderdeel | Status |
|---|---|---|
| 7 | Landingspagina (zelfhosten gratis, hosted later, wachtlijst): [`marketing/site/`](marketing/site/) | ✅ (wachtlijst nog niet gekoppeld) |
| 8 | Pitchdeck (probleem, oplossing, bewijs, markt, verdienmodel, roadmap, vraag) | ✅ |
| 9 | Launchposts: Tweakers, HA Community (Engels), Reddit, LinkedIn, Mastodon/X, persbericht, B2B-mails: [`marketing/launch-posts.md`](marketing/launch-posts.md) | ✅ |
| 10 | Schermafbeeldingen van 1.0 ([`docs/screenshots/`](docs/screenshots/)) en een FAQ (in de landingspagina) | ✅ |

## Wat nog bij jou ligt

- Schrijfrechten voor de Claude GitHub-app (of een nieuwe repo), zodat alles gepusht kan worden.
- 1.0 een week draaien op je eigen Solis-installatie voordat we publiek lanceren.
- Een eigen domein en een e-mailadres voor de wachtlijst.

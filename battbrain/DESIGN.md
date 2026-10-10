# BattBrain voor Home Assistant — ontwerpbesluiten

De visuele basis is het BattBrain-designpakket in [`design/`](design/) (prototype "Stroomslim Enhanced",
juni 2026). Dit document legt vast wat we daarvan overnemen in de Home Assistant-app, wat we veranderen
en wat later komt. De prototypebestanden zijn **referentie, geen productiecode**.

## Productkeuzes

| Onderwerp | Keuze | Waarom |
|---|---|---|
| Vorm | Home Assistant-app (add-on) met eigen webinterface via ingress | Eigen schermen, eigen rekenomgeving, crasht HA niet |
| Rekenhart | `app/battbrain_core`: planner met voorspellingen (geen vaste prijsdrempels) | Simulatie 7–9 okt 2026: drempels verliezen, planner wint in 2026 en 2027 |
| Profiel | v1: alleen **Max rendement** | Eerst één profiel goed; Zelfvoorzienend/Eco later als optimalisatiedoel |
| Thema | v1: alleen **donker**; tokens voor licht staan klaar | Prototype is dark-first |
| Lettertypen | Meegeleverd: Space Grotesk + Manrope (de fallbacks uit het design, SIL OFL). Clash Display/Satoshi worden gebruikt als ze lokaal geïnstalleerd zijn | HA draait vaak zonder internet; geen CDN |
| Besparingen | Alleen berekende bedragen t.o.v. "geen batterij" en "alleen zelfverbruik" | Geen marketingprognoses in de app |
| Sturing | Via reserve-schakelaar + doel-SoC (zelfde als de blueprint) | Werkt op bestaande Solis-setup |
| Uitrol | Eerst alleen lezen → adviseren → pas daarna sturen | Veiligheid: niets aan de batterij tot het advies bewezen is |

## Per scherm

| Scherm (prototype) | v1 | Aanpassing |
|---|---|---|
| Dashboard — BattBrain advies | ✅ | Tekst komt uit de planner (`PlanStep.reason`), "Volgende" = eerstvolgende andere actie |
| Dashboard — SoC / prijs / actie | ✅ | Prijs in €/kWh all-in (Frank), niet in ct kaal |
| Dashboard — handmatige besturing | ✅ v0.4 | Kaart *Sturing*: status, laatste commando, Pauzeer 1 uur / Hervat (geen handmatig laden/ontladen) |
| Dashboard — dagplan | ✅ | Acties per kwartier/uur uit het plan: laden net / laden zon / vasthouden / ontladen / zelfverbruik |
| Dashboard — energiestroom | ✅ | Live uit HA-sensoren |
| Dashboard — algoritme-drempels | 🔄 | Wordt **Plan & voorspelling**: zon, verbruik, verwachte besparing, "waarom dit plan" |
| Dashboard — besparingsreeks / samenvatting | ✅ | Berekend, met vergelijking zelfverbruik |
| Dashboard — beslissingen-tijdlijn | ✅ | Log van werkelijke beslissingen + reden |
| Strategie | 🔄 | Prijsdrempels en doel-SoC-schuif vervallen. Blijft: profielkeuze (v1 alleen Max rendement), minimale reserve, terugleververgoeding 2027 |
| Dagplanning | ✅ | Zelfde data als dashboard-dagplan, groter |
| Zonne-energie | ✅ (later in v1) | Voorspelling vs. werkelijk + correctiefactor |
| Geschiedenis | ✅ (later in v1) | Per dag: kosten, besparing, vergelijking met blueprint (adviesmodus) |
| Instellingen | ✅ | Entiteiten kiezen (SoC, prijs, zon, P1, schakelaars), batterijgegevens |
| Landing, Auth, Abonnement, Onboarding, Profiel | ❌ | Niet nodig binnen HA (HA regelt inloggen). Bewaren voor een latere cloud-/productversie |
| EV-laden | ❌ later | Buiten scope v1 |
| Meldingen | ❌ later | Eerst via HA-notificaties |

## Bekende punten uit het prototype om te verbeteren
- Op 390 px breed loopt de adviesbalk buiten beeld en overlapt de Desktop/Mobiel-schakelaar de navigatie
  onderaan. In de app vervalt die schakelaar; layout wordt mobiel-eerst getest.
- Demo-bedragen (bv. "Prognose ~€205/mnd") vervangen door berekende waarden.

## Design tokens (overnemen uit `design/src/enhanced-styles.css`)

`--accent #2fd07a`, `--accent-2 #14b88a`, `--bg #050d09`, `--surface rgba(12,26,20,.52)`,
`--border rgba(170,240,205,.07)`, `--text #ecf6f0`, `--text-dim #9fb6ab`, `--text-faint #6a847a`,
`--c-charge #4f8cff`, `--c-discharge #ff9a3d`, `--c-pv #ffd84d`, `--price-low #2fd07a`,
`--price-mid #f5b13d`, `--price-high #f5594f`, `--radius-lg 22px`, `--glass-blur 28px`.

## Inspiratie uit andere apps (v0.2)

| Idee | Gezien bij | In BattBrain |
|---|---|---|
| Bewegende energiestroom; alleen actieve stromen bewegen, snelheid volgt het vermogen | Tesla Powerwall-app, HA-kaarten Power Flux en Sunsynk Power Flow | Energiestroom-kaart met deeltjes per stroom (zon→huis, net→batterij, …) |
| Eén hoofdgetal of -boodschap per scherm | Ontwerpstudies van zonne-apps | Groot advies bovenaan met reden en "tot / daarna" |
| Prijsgrafiek gecombineerd met plan of voorspelling | Energy Flow & Price Card, Genergy Dashboard (EMHASS-overlay) | Plangrafiek: laadtoestand boven, prijs per kwartier gekleurd naar actie eronder (geen dubbele as) |
| Goedkope uren uitlichten | Apps voor dynamische tarieven | Label "Goedkoopste 2 uur" |
| Eerlijk zelfverbruik tonen | Energiedashboards van omvormers | "x% van je verbruik uit zon en batterij" |
| Prijsbalken gekleurd naar prijsniveau, daggemiddelde, "boven/onder verwachting" per dag | Frank Energie-app | Prijskaart met minigrafiek + gemiddelde; plangrafiek kleurt prijs naar niveau; besparing per dag (groen/rood) |
| Opbrengst vandaag + grafiek van batterijniveau met actieve modus | Zonneplan-app (thuisbatterij) | "Besparing vandaag, gemeten" in de hero; aparte actiebaan onder de laadtoestand |

Kleuren per actie: laden van net = blauw (`--c-charge`), zon opslaan = geel (`--c-pv`), ontladen = oranje
(`--c-discharge`), vasthouden = lila (`--c-hold`, nieuw), zelfverbruik = grijs (`--c-idle`).
Animaties staan uit bij `prefers-reduced-motion`.

Regel sinds v0.3: één kleur betekent één ding. Actiekleuren alleen in de actiebaan en het logboek; prijskleuren (groen/oranje/rood) alleen voor prijsniveau.

## Bouwvolgorde

1. ✅ Ontwerp vastleggen (dit document + `design/`)
2. ✅ Kern: `app/battbrain_core` — planner, voorspellingen, besparing, met tests
3. ✅ App-skelet: HA-verbinding, live SoC/prijs/zon/energiestroom/prijsverloop in het dashboard (alleen lezen)
4. ✅ Adviseren: plan, advies met reden, beslissingenlogboek, vergelijking met de huidige sturing (% overeenkomst)
5. ✅ Sturen (opt-in): reserve-schakelaar + doel-SoC, met zelfverbruik als veilige terugval, prijsplafond, anti-flapperen, controle en pauzeknop

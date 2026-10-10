# BattBrain voor Home Assistant — ontwerpbesluiten

De visuele basis is het BattBrain-designpakket in [`design/`](design/) (prototype "Stroomslim Enhanced",
juni 2026). Dit document legt vast wat we daarvan overnemen in de Home Assistant-app, wat we veranderen
en wat later komt. De prototypebestanden zijn **referentie, geen productiecode**.

## Productkeuzes

| Onderwerp | Keuze | Waarom |
|---|---|---|
| Vorm | Home Assistant-app (add-on) met eigen webinterface via ingress | Eigen schermen, eigen rekenomgeving, crasht HA niet |
| Rekenhart | `core/battbrain_core`: planner met voorspellingen (geen vaste prijsdrempels) | Simulatie 7–9 okt 2026: drempels verliezen, planner wint in 2026 en 2027 |
| Profiel | v1: alleen **Max rendement** | Eerst één profiel goed; Zelfvoorzienend/Eco later als optimalisatiedoel |
| Thema | v1: alleen **donker**; tokens voor licht staan klaar | Prototype is dark-first |
| Lettertypen | Clash Display + Satoshi **meeleveren in de app** | HA draait vaak zonder internet; geen CDN |
| Besparingen | Alleen berekende bedragen t.o.v. "geen batterij" en "alleen zelfverbruik" | Geen marketingprognoses in de app |
| Sturing | Via reserve-schakelaar + doel-SoC (zelfde als de blueprint) | Werkt op bestaande Solis-setup |
| Uitrol | Eerst alleen lezen → adviseren → pas daarna sturen | Veiligheid: niets aan de batterij tot het advies bewezen is |

## Per scherm

| Scherm (prototype) | v1 | Aanpassing |
|---|---|---|
| Dashboard — BattBrain advies | ✅ | Tekst komt uit de planner (`PlanStep.reason`), "Volgende" = eerstvolgende andere actie |
| Dashboard — SoC / prijs / actie | ✅ | Prijs in €/kWh all-in (Frank), niet in ct kaal |
| Dashboard — handmatige besturing | ⏳ stap 5 | Pas als de app mag sturen; in adviesmodus verborgen |
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

## Bouwvolgorde

1. ✅ Ontwerp vastleggen (dit document + `design/`)
2. ✅ Kern: `core/battbrain_core` — planner, voorspellingen, besparing, met tests
3. App-skelet: HA-verbinding, live SoC/prijs/zon in het dashboard (alleen lezen)
4. Adviseren: dagplan, tijdlijn, advies; dagelijkse vergelijking met de blueprint
5. Sturen: reserve-schakelaar + doel-SoC, met zelfverbruik als veilige terugval

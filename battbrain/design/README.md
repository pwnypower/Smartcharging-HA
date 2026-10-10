# BattBrain — Design Handover Package
**Versie 1.0 · Juni 2026**

---

## Overzicht

BattBrain is een Nederlandse thuisbatterij-app die huiseigenaren helpt slim te laden en ontladen op basis van realtime energieprijzen (Frank Energie / EasyEnergy). De app visualiseert batterijstatus, zonne-energie, prijscurves en AI-gestuurd ladeplanning in een glassmorphism dark-mode interface.

**App naam in prototype:** Stroomslim Enhanced  
**Nieuwe naam:** BattBrain  
**Taal:** Nederlands (nl)

---

## Over de ontwerpbestanden

De bestanden in deze bundle zijn **HTML-prototypes** — visuele referenties gebouwd met React/Babel. Ze tonen de beoogde look, feel en interacties. De taak is om deze ontwerpen te **recreëren in de doelomgeving** (React Native, Next.js, Swift, Flutter, enz.) met de bestaande patronen en libraries — of, als er nog geen omgeving is, te kiezen voor het meest geschikte framework.

> ⚠️ Kopieer de HTML-bestanden niet direct naar productie. Ze zijn designreferentie, geen productiecode.

---

## Fidelity

**High-fidelity.** De prototypes zijn pixel-nauwkeurig met finale kleuren, typografie, spacing en interacties. Reproduceer de UI zo nauwkeurig mogelijk met de libraries van de doelcodebase.

---

## Technische Stack (prototype)

| Onderdeel | Waarde |
|-----------|--------|
| Framework | React 18.3.1 (UMD, via CDN) |
| Transpiler | Babel Standalone 7.29.0 |
| Styling | Vanilla CSS met custom properties |
| Fonts | Clash Display + Satoshi (Fontshare), Space Grotesk + Manrope (Google Fonts) |
| Iconen | Inline SVG, currentColor, 24×24px viewBox |
| Routing | React state (geen URL router) |
| Data | Gesimuleerde realtime klok + Frank Energie API fetch |

---

## Schermen / Views

### 1. Landing (`screen-landing.jsx` + `enhanced-landing.jsx`)
- **Doel:** Marketing-landingspagina, converteert bezoekers naar registratie
- **Layout:** Full-width hero met 2-koloms grid (tekst links, live preview rechts), feature-grid (3 kolommen), CTA-sectie
- **Key componenten:** Logo + wordmark, animerende batterij-preview, feature-cards, hero CTA-knop
- **Animaties:** Aurora-achtergrond, particle-field, hero-tekst fade-up entree, live-preview float

### 2. Auth (`screen-auth.jsx`)
- **Doel:** Inloggen en registreren
- **Layout:** 2-koloms split — aside (links, branding + testimonials) + formulier (rechts, centered)
- **Key componenten:** Email/wachtwoord input, Google OAuth knop, toggle login/registreer
- **Responsive:** Aside verborgen op mobiel, alleen formulier zichtbaar

### 3. Onboarding (`screen-onboarding.jsx`)
- **Doel:** Meerstap-wizard: inverter kiezen, leverancier koppelen, capaciteit instellen, abonnement kiezen
- **Layout:** Centered card, stap-indicator bovenaan, navigatieknoppen onderaan
- **Stappen:** Inverter selectie → Provider → Capaciteit → Plan kiezen
- **Key componenten:** Step-indicator (dots/numbers), select-dropdowns, plan-cards

### 4. Dashboard (`enhanced-dashboard.jsx`)
- **Doel:** Realtime overzicht batterijstatus, prijzen, acties, besparingen
- **Layout:** `max-width: 1180px`, flex-kolom, gap-6
  - Statusbar (bovenaan)
  - SmartInsightCard (AI-aanbeveling, volledig-breed)
  - grid-3: SoC-kaart, Vermogen-kaart, Besparing-kaart
  - Liquid Battery visualisatie (grote feature-kaart)
  - Energy Flow diagram
  - Prijscurve grafiek
  - Quick Actions bar
  - Dagplan preview
- **Key data:** `snap.soc`, `snap.action`, `snap.price`, `snap.savings`, `snap.plan.curve[]`

### 5. Zonne-energie (`screen-solar.jsx`)
- **Doel:** Zonnepaneel-productie monitoring
- **Layout:** grid-2 bovenaan (vandaag / maand stats), grafiek volledig breed, detail-cards
- **Key data:** Opbrengst kWh, eigen gebruik %, teruglevering, verwachting

### 6. Geschiedenis (`screen-history.jsx`)
- **Doel:** Historisch overzicht laden/ontladen, besparingen per dag/week/maand
- **Layout:** Filter-tabs bovenaan, bar chart, lijst van dagtransacties
- **Key componenten:** Periode-selector, animated bar chart, export-knop

### 7. Strategie (`screen-strategy.jsx`)
- **Doel:** Configureer laadstrategie (maximaal besparen / maximaal groen / handmatig)
- **Layout:** Strategie-selector cards + configuratie-sliders + preview dagplanning
- **Key componenten:** Strategy-cards (3 opties), threshold-sliders, plan-preview

### 8. Dagplanning (`screen-dayplan.jsx`)
- **Doel:** Uurlijks plan voor vandaag — laden/ontladen/wachten per uur
- **Layout:** 24-uurs tijdlijn als grid-6, kleurcode per actie
- **Kleuren:** Laden = `--c-charge` (blauw), Ontladen = `--c-discharge` (oranje), Wachten = `--c-idle` (grijs)

### 9. EV Laden (`screen-ev.jsx`)
- **Doel:** Slim laden van elektrische auto op goedkoopste uren
- **Layout:** EV-status card + laadschema + kosten-vergelijking
- **Key componenten:** SoC-indicator auto, vertrek-tijd picker, slimme/directe laadschakelaar

### 10. Abonnement (`enhanced-subscription.jsx`)
- **Doel:** Upgrade naar Plus — toont features, prijs en vergelijking
- **Layout:** 2 plan-cards side-by-side (Gratis vs Plus), feature-lijst, animerende Plus-kaart
- **Key componenten:** `.card-glow-pulse`, feature-checklist, maandprijsbadge

### 11. Profiel (`screen-profile.jsx`)
- **Doel:** Account gegevens, batterijconfiguratie, API-sleutels
- **Layout:** Profiel-header + sectie-cards (Account / Systeem / Beveiliging)

### 12. Meldingen (`screen-notifications.jsx`)
- **Doel:** Notificaties overzicht (prijsalerts, actiebevestigingen, systeemmeldingen)
- **Layout:** Lijst van notificatie-items per dag, read/unread states

### 13. Instellingen (`screen-settings.jsx`)
- **Doel:** App-instellingen (thema, taal, meldingsvoorkeuren, inverter-koppeling)
- **Layout:** Settingsgroepen in sectie-cards, toggle-switches, selects

---

## Interacties & Gedrag

### Navigatie
- Desktop (≥ 860px): zijbalk met `NavItem` knoppen
- Tablet (860–1100px): compacte zijbalk, alleen iconen
- Mobiel (< 860px): topbar + sticky bottom nav
- Routing: `route` state in `AppShell`, `go(routeName)` functie

### Hover-states
- Cards: `translateY(-4px) scale(1.005)` + glow shadow
- Knoppen: `translateY(-2px)` + versterkte glow
- Nav-items: `translateX(2px)`, lichte achtergrond

### Animaties op scherm-intrede
- Elementen animeren from `opacity:0, translateY(20px)` → zichtbaar
- Stagger per element: `delay: index * 80ms`
- Gated op `[data-deck-active]` (niet in prototype nodig)

### Glassmorphism
- `backdrop-filter: blur(28px) saturate(180%)`
- Background: `rgba(12, 26, 20, 0.52)`
- Border: `rgba(170, 240, 205, 0.07)`
- Sheen overlay: `linear-gradient(165deg, rgba(255,255,255,0.08) 0%, transparent 38%)`

---

## State Management

```javascript
// Demo-state snapshot (via useDemo() hook)
{
  mins: Number,          // minuten van dag (0–1440), realtime klok
  soc: Number,           // batterij % (0–100)
  socExact: Number,      // float precisie
  action: "charge" | "discharge" | "idle",
  price: Number,         // ct/kWh huidige prijs
  targetSoc: Number,     // doel-SoC %
  chargeLimit: Number,   // prijs-drempel laden (als fractie van dagmax)
  dischargeThreshold: Number, // prijs-drempel ontladen
  savings: Number,       // €-besparing vandaag
  system: { inverter, provider, capacity, tier },
  plan: { curve: Number[24], actions: string[24] }
}
```

### Tweaks (design switches)
Via `useTweaks()` hook + TweaksPanel:
- `theme`: "dark" | "light"
- `accent`: kleurpalet array
- `fonts`: "clash" | "space" | "sora"
- `density`: "compact" | "regular" | "comfy"

---

## Design Tokens

Zie `enhanced-styles.css` voor alle `--*` variabelen. Kernwaarden:

| Token | Waarde | Gebruik |
|-------|--------|---------|
| `--accent` | `#2fd07a` | Primaire accentkleur |
| `--accent-2` | `#14b88a` | Gradient-eindpunt |
| `--bg` | `#050d09` | Pagina-achtergrond |
| `--surface` | `rgba(12,26,20,.52)` | Card-achtergrond |
| `--border` | `rgba(170,240,205,.07)` | Card-rand |
| `--text` | `#ecf6f0` | Primaire tekst |
| `--text-dim` | `#9fb6ab` | Labels, secundair |
| `--text-faint` | `#6a847a` | Meta, placeholder |
| `--c-charge` | `#4f8cff` | Laden (blauw) |
| `--c-discharge` | `#ff9a3d` | Ontladen (oranje) |
| `--c-pv` | `#ffd84d` | Zonnepanelen (geel) |
| `--price-low` | `#2fd07a` | Lage prijs |
| `--price-mid` | `#f5b13d` | Middenhoge prijs |
| `--price-high` | `#f5594f` | Hoge prijs |
| `--font-display` | "Clash Display", "Space Grotesk" | Koppen |
| `--font-body` | "Satoshi", "Manrope" | Body, UI |
| `--radius-lg` | `22px` | Card border-radius |
| `--glass-blur` | `28px` | backdrop-filter blur |

---

## Assets

| Asset | Bestand | Beschrijving |
|-------|---------|--------------|
| Logo mark | `logo/battbrain-logo.svg` | Batterij + brein + bliksem icoon |
| Wordmark | `logo/battbrain-wordmark.svg` | Logo + "BattBrain" tekst |
| Icons | `icons.jsx` → `I.{naam}` | 40+ inline SVG iconen |
| Fonts | Fontshare (Clash Display, Satoshi) + Google Fonts | Laad via CDN |

---

## Logo concept

Het BattBrain-logo toont een **neuraal actie-potentiaal trace** (EEG-brainwave) binnen een batterij-silhouet:
- Platte baseline links en rechts → rust/standby
- Kleine pre-spike bump → hersenactiviteit detectie
- Scherpe depolarisatie-piek → neural firing / energie-impuls
- Afterhyperpolarisatie dip → herstel
- Glowing dot op de piek → het vuurpunt (synaptische vrijlating)

Dit combineert "batterij" (energiebar) en "brein" (actie-potentiaal) in één enkelvoudig, schaalbaar icoontje.

---

## Bestanden in dit pakket

```
design_handoff/
├── README.md                       ← dit bestand
├── BattBrain Brandbook.html        ← visueel brandbook (open in browser)
├── logo/
│   ├── battbrain-logo.svg          ← logo mark (140×90)
│   ├── battbrain-icon.svg          ← app icon (100×100)
│   └── battbrain-wordmark.svg      ← logo + naam (300×64)
└── src/                            ← alle bronbestanden prototype
    ├── Stroomslim Enhanced.html    ← hoofd entry point
    ├── enhanced-styles.css         ← alle CSS design tokens
    ├── styles.css                  ← base styles
    ├── data.jsx                    ← realtime data + demo state
    ├── icons.jsx                   ← SVG icon library
    ├── app.jsx                     ← basis app shell
    ├── charts.jsx                  ← basis chart components
    ├── tweaks-panel.jsx            ← design tweaks paneel
    ├── enhanced-app.jsx            ← uitgebreide app shell + routing
    ├── enhanced-effects.jsx        ← glassmorphism effecten
    ├── wow-effects.jsx             ← premium animaties
    ├── enhanced-charts.jsx         ← uitgebreide chart components
    ├── enhanced-dashboard.jsx      ← Scherm: Dashboard
    ├── enhanced-landing.jsx        ← Scherm: Landing (uitgebreid)
    ├── enhanced-subscription.jsx   ← Scherm: Abonnement
    ├── screen-landing.jsx          ← Scherm: Landing (basis)
    ├── screen-auth.jsx             ← Scherm: Inloggen / Registreren
    ├── screen-dashboard.jsx        ← Scherm: Dashboard (basis)
    ├── screen-onboarding.jsx       ← Scherm: Onboarding wizard
    ├── screen-dayplan.jsx          ← Scherm: Dagplanning
    ├── screen-history.jsx          ← Scherm: Geschiedenis
    ├── screen-solar.jsx            ← Scherm: Zonne-energie
    ├── screen-strategy.jsx         ← Scherm: Laadstrategie
    ├── screen-ev.jsx               ← Scherm: EV Laden
    ├── screen-subscription.jsx     ← Scherm: Abonnement (basis)
    ├── screen-profile.jsx          ← Scherm: Profiel
    ├── screen-notifications.jsx    ← Scherm: Meldingen
    └── screen-settings.jsx         ← Scherm: Instellingen
    └── logo/
        ├── battbrain-logo.svg
        ├── battbrain-icon.svg
        └── battbrain-wordmark.svg
```

---

## Nieuw scherm bouwen — checklist

- [ ] Maak `screen-{naam}.jsx`
- [ ] Exporteer via `Object.assign(window, { MijnScherm })`
- [ ] Voeg toe aan `<script type="text/babel" src="...">` in HTML
- [ ] Registreer in `nav`-array in `enhanced-app.jsx`
- [ ] Gebruik `const snap = useDemo()` voor realtime data
- [ ] Wrap in `<div className="dash">` voor standaard layout
- [ ] Gebruik `var(--*)` tokens — geen hardcoded kleuren
- [ ] Test dark én light mode via Tweaks-paneel
- [ ] Controleer op 860px breakpoint (mobiel nav)

---

*BattBrain · Brandbook v1.0 · Juni 2026*

# BattBrain — Project Instructions for Claude

## What this project is
BattBrain is a Dutch smart home battery app (thuisbatterij-app). It helps homeowners charge and discharge their home battery based on real-time electricity prices (Frank Energie / EasyEnergy). The app shows battery status, solar energy, price curves, and AI-driven charge planning.

**App name:** BattBrain (prototype name: Stroomslim)
**Language:** Dutch (nl)
**Entry point:** `Stroomslim Enhanced.html`

---

## Tech stack
- React 18.3.1 (UMD via CDN, no bundler)
- Babel Standalone 7.29.0 (JSX transpilation in browser)
- Vanilla CSS with CSS custom properties (design tokens)
- No URL router — routing via React state in AppShell

**Load order in HTML:**
```html
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" ...></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" ...></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" ...></script>
<!-- then all .jsx files as type="text/babel" -->
```

---

## Design system

### Colors (CSS custom properties in `enhanced-styles.css`)
```css
--accent:          #2fd07a   /* primary green CTA */
--accent-2:        #14b88a   /* gradient endpoint */
--bg:              #050d09   /* page background */
--bg-2:            #0a1a14   /* secondary background */
--surface:         rgba(12,26,20,0.72)  /* card background (glassmorphism) */
--border:          rgba(170,240,205,0.07)
--border-strong:   rgba(170,240,205,0.14)
--text:            #ecf6f0
--text-dim:        #9fb6ab
--text-faint:      #6a847a
--c-charge:        #4f8cff   /* charging = blue */
--c-discharge:     #ff9a3d   /* discharging = orange */
--c-pv:            #ffd84d   /* solar = yellow */
--c-export:        #2fd07a   /* grid export = green */
--c-idle:          #8aa39a   /* idle = grey */
--price-low:       #2fd07a
--price-mid:       #f5b13d
--price-high:      #f5594f
--radius:          16px
--radius-lg:       22px
--font-display:    "Clash Display", "Space Grotesk", system-ui, sans-serif
--font-body:       "Satoshi", "Manrope", system-ui, sans-serif
```

**Rule: NEVER use hardcoded color values. Always use `var(--token-name)`.**

### Typography
- **Headings:** `font-family: var(--font-display)`, `font-weight: 600`, `letter-spacing: -0.03em`
- **Body:** `font-family: var(--font-body)`, `font-weight: 400–600`
- **Eyebrow labels:** `font-size: 11px`, `font-weight: 700`, `text-transform: uppercase`, `letter-spacing: 0.18em`, `color: var(--accent)`

### Glassmorphism (all cards use this)
```css
background: var(--surface);
border: 1px solid var(--border);
border-radius: var(--radius-lg);
backdrop-filter: blur(28px) saturate(180%);
/* sheen overlay via ::before pseudo-element */
```

### Spacing scale
Use multiples of 4: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px. Use `gap:` with flex/grid — never bare inline margins.

---

## File structure
```
Stroomslim Enhanced.html    ← entry point, loads all scripts
enhanced-styles.css          ← ALL design tokens + component CSS
data.jsx                     ← realtime clock, price data, useDemo() hook
icons.jsx                    ← Icon component + I.{name} namespace
tweaks-panel.jsx             ← TweaksPanel + useTweaks() hook
enhanced-app.jsx             ← AppShell, routing, NavItem
enhanced-effects.jsx         ← glassmorphism background effects
wow-effects.jsx              ← LiquidBattery, EnergyFlowChart
enhanced-charts.jsx          ← PriceChart, MiniSparkline
enhanced-dashboard.jsx       ← Screen: Dashboard
enhanced-landing.jsx         ← Screen: Landing page
enhanced-subscription.jsx    ← Screen: Subscription / Plus
screen-auth.jsx              ← Screen: Login / Register
screen-onboarding.jsx        ← Screen: Onboarding wizard
screen-dayplan.jsx           ← Screen: Day planning
screen-history.jsx           ← Screen: History
screen-solar.jsx             ← Screen: Solar energy
screen-strategy.jsx          ← Screen: Charge strategy
screen-ev.jsx                ← Screen: EV charging
screen-profile.jsx           ← Screen: Profile
screen-notifications.jsx     ← Screen: Notifications
screen-settings.jsx          ← Screen: Settings
```

---

## Global window exports (available in every Babel file)
```js
// From data.jsx:
useDemo, fmtEur, fmtCt, fmtKwh, priceColor, priceTone, hourLabel

// From icons.jsx:
Icon, I, actionIcon, actionColor

// From enhanced-effects.jsx:
AppBg, AppNoise, GlassCard

// From tweaks-panel.jsx:
TweaksPanel, useTweaks, setTweak

// From wow-effects.jsx:
LiquidBattery, EnergyFlowChart

// From enhanced-charts.jsx:
PriceChart, MiniSparkline

// From enhanced-app.jsx:
AppShell (mounts everything)
```

---

## How to add a new screen

1. Create `screen-{name}.jsx`
2. Export via `Object.assign(window, { MyScreen })`
3. Add `<script type="text/babel" src="screen-{name}.jsx"></script>` to `Stroomslim Enhanced.html`
4. Register route in `nav` array in `enhanced-app.jsx`
5. Use `const snap = useDemo()` for live data
6. Wrap content in `<div className="dash">` for standard layout

### Screen template
```jsx
/* screen-example.jsx */
function ExampleScreen({ go }) {
  const snap = useDemo();

  return (
    <div className="dash">
      <div className="dash-header">
        <div className="eyebrow">Sectie naam</div>
        <h1 className="dash-title">Schermtitel</h1>
      </div>

      {/* Cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        <div className="card card-hover">
          <div className="card-label">Label</div>
          <div className="stat-value">{fmtEur(snap.savings)}</div>
          <div className="stat-label">Omschrijving</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ExampleScreen });
```

---

## Demo state (useDemo() snapshot)
```js
const snap = useDemo();
// snap contains:
{
  mins: Number,           // minutes since midnight (realtime clock)
  soc: Number,            // battery SoC 0–100%
  socExact: Number,       // float precision
  action: "charge" | "discharge" | "idle",
  price: Number,          // current price in ct/kWh
  targetSoc: Number,      // target SoC %
  chargeLimit: Number,    // price threshold for charging
  dischargeThreshold: Number,
  savings: Number,        // today's savings in €
  system: {
    inverter: String,
    provider: String,
    capacity: Number,     // kWh
    tier: "free" | "plus"
  },
  plan: {
    curve: Number[24],    // price per hour
    actions: String[24]   // "charge"|"discharge"|"idle" per hour
  }
}
```

---

## CSS classes (defined in enhanced-styles.css)

### Layout
```css
.dash          /* screen wrapper: max-width 1180px, padding, flex-col */
.dash-header   /* page header area */
.dash-title    /* h1 style for screens */
.eyebrow       /* small uppercase label above title */
```

### Cards
```css
.card          /* glassmorphism card */
.card-hover    /* + lift + glow on hover */
.card-glow-pulse  /* animated green border pulse */
.card-label    /* small uppercase label inside card */
.stat-value    /* large number display */
.stat-unit     /* unit suffix (kW, €, %) */
.stat-label    /* description below stat */
```

### Buttons
```css
.btn           /* base button */
.btn-primary   /* green gradient CTA */
.btn-ghost     /* glass background */
.btn-danger    /* red destructive */
.btn-sm / .btn-lg  /* size modifiers */
```

### Badges & Pills
```css
.badge .badge-green / .badge-blue / .badge-orange / .badge-red / .badge-muted
.pill          /* status pill with .dot */
.dot           /* colored status dot */
```

### Forms
```css
.input / .select   /* form fields */
.field             /* label + input + hint wrapper */
.prog / .prog-fill /* progress bar */
```

---

## Navigation
- Desktop (≥ 860px): sidebar with `NavItem` buttons
- Mobile (< 860px): topbar + bottom nav
- Routing: `route` state in AppShell, `go(routeName)` function passed as prop

---

## Icons
All icons are inline SVG, `currentColor` stroke, 24×24 viewBox, `stroke-width: 1.8`, `stroke-linecap: round`.

```jsx
// Usage:
<I.bolt size={20}/>
<I.battery size={24}/>
<I.sun size={20}/>
<I.dashboard size={20}/>
// Available: bolt, battery, sun, grid, arrowUp, arrowDown,
// wait, euro, gauge, leaf, dashboard, settings, crown,
// bell, history, strategy, car, shield, trend, user, ...
```

---

## Responsive breakpoints
Use container queries (not media queries):
- `≥ 1100px`: full sidebar (252px) with labels
- `860–1100px`: compact sidebar (72px), icons only
- `< 860px`: sidebar hidden, topbar + bottom nav

---

## Do's and Don'ts

### Do
- Use `var(--*)` tokens for all colors, spacing, radius
- Use `display: flex/grid` with `gap:` for all layouts
- Use `text-wrap: pretty` on body text
- Export components via `Object.assign(window, { ... })`
- Test dark mode (default) and light mode via Tweaks panel

### Don't
- Don't hardcode colors (`#hex` or `rgb()` values)
- Don't use `const styles = { ... }` — name it per component: `const dashStyles = { ... }`
- Don't use `type="module"` on script imports
- Don't use URL routing — use the `go()` prop
- Don't add filler/placeholder content

---

*BattBrain · Design System v1.0 · June 2026*

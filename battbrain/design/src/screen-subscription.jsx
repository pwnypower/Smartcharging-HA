/* screen-subscription.jsx — Abonnement: Gratis vs Plus + premium features */

const PLUS_PRICE = "€6,95";

/* comparison matrix: [feature, gratis, plus] — true / false / string */
const COMPARE = [
  ["Live dashboard & prijsinzicht", true, true],
  ["Handmatige drempels instellen", true, true],
  ["Geschiedenis", "7 dagen", "Onbeperkt"],
  ["Automatisch laden & ontladen", false, true],
  ["Slimme strategieën", false, true],
  ["Slim EV-laden", false, true],
  ["Prijsalerts (push)", false, true],
  ["Maandrapport & teruglever­overzicht", false, true],
  ["Noodstroom-reserve", false, true],
  ["Meerdere omvormers", false, true],
  ["Prioriteit support", false, true],
];

const STRATEGIES = [
  ["Max rendement", "Haal het maximale uit elk prijsverschil — handelen tot de batterijgrenzen.", "var(--accent)"],
  ["Zelfvoorzienend", "Bewaar lading voor eigen verbruik 's avonds, minimale netafname.", "var(--c-charge)"],
  ["Eco / CO₂-arm", "Laad alleen wanneer het net het groenst is, niet enkel het goedkoopst.", "var(--c-pv)"],
];

function CompCell({ v, plus }) {
  if (v === true) return <span style={{ color: plus ? "var(--accent)" : "var(--text-dim)" }}>{I.check({ size: 19 })}</span>;
  if (v === false) return <span className="faint" style={{ opacity: 0.4 }}>{I.close({ size: 17 })}</span>;
  return <span style={{ fontWeight: 600, fontSize: 14, color: plus ? "var(--accent)" : "var(--text-dim)" }}>{v}</span>;
}

function FeatureSpot({ icon, tone, title, body }) {
  return (
    <div className="card" style={{ padding: "var(--sp-5)" }}>
      <div style={{ width: 48, height: 48, borderRadius: 13, display: "grid", placeItems: "center", color: tone, background: `color-mix(in oklab, ${tone} 16%, transparent)`, marginBottom: "var(--sp-4)" }}>{icon}</div>
      <h4 style={{ fontSize: 18, marginBottom: 6 }}>{title}</h4>
      <p className="muted" style={{ fontSize: 14.5, lineHeight: 1.5, textWrap: "pretty" }}>{body}</p>
    </div>
  );
}

function Subscription({ go, flags }) {
  const snap = useDemo();
  const active = flags.active;
  const monthlyEst = Math.round((snap.savings || 1.8) * 21);

  return (
    <div className="dash">
      <div className="dash-statusbar">
        <h1 style={{ fontSize: "clamp(24px, 3vw, 34px)" }}>Abonnement</h1>
        <p className="muted" style={{ fontSize: 15.5, marginTop: 6 }}>Kies het plan dat bij je batterij past. Maandelijks opzegbaar.</p>
      </div>

      {/* value hero */}
      <div className="card" style={{ padding: "var(--sp-8)", background: "radial-gradient(700px 400px at 85% -20%, color-mix(in oklab, var(--accent) 22%, transparent), transparent 60%), linear-gradient(150deg, var(--surface-3), var(--surface))" }}>
        <div className="between" style={{ flexWrap: "wrap", gap: "var(--sp-6)" }}>
          <div style={{ maxWidth: 480 }}>
            <span className="eyebrow">{I.crown({ size: 15 })} Stroomslim Plus</span>
            <h2 style={{ fontSize: "clamp(26px, 3.4vw, 40px)", margin: "var(--sp-3) 0 var(--sp-3)" }}>Het verschil zit in het <span style={{ color: "var(--accent)" }}>automatisch handelen</span></h2>
            <p className="muted" style={{ fontSize: 16.5, lineHeight: 1.55, textWrap: "pretty" }}>
              Gratis zie je de prijzen — met Plus handelt je batterij er ook écht naar, 24 uur per dag, zonder dat je iets hoeft te doen.
            </p>
          </div>
          <div style={{ textAlign: "center" }}>
            <div className="faint" style={{ fontSize: 13.5 }}>Geschat extra rendement</div>
            <div className="display tabnum" style={{ fontSize: "clamp(44px, 6vw, 68px)", color: "var(--accent)", lineHeight: 1 }}>€{monthlyEst}</div>
            <div className="faint" style={{ fontSize: 13.5 }}>per maand · jouw setup</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>≈ {Math.round(monthlyEst / 6.95)}× de abonnementsprijs</div>
          </div>
        </div>
      </div>

      {/* pricing cards */}
      <div className="grid-2 plan-cards">
        {/* gratis */}
        <div className="card" style={{ padding: "var(--sp-8)" }}>
          <div className="card-label">Gratis</div>
          <div className="row" style={{ alignItems: "flex-end", gap: 6, margin: "var(--sp-3) 0 var(--sp-5)" }}>
            <span className="display tabnum" style={{ fontSize: 44 }}>€0</span>
            <span className="faint" style={{ fontSize: 15, paddingBottom: 8 }}>/mnd</span>
          </div>
          <p className="muted" style={{ fontSize: 14.5, marginBottom: "var(--sp-5)" }}>Volg je batterij en prijzen mee. Handmatig sturen.</p>
          <button className="btn btn-ghost btn-block" disabled={!active} style={!active ? {} : { opacity: 0.6 }}>
            {active ? "Downgraden naar Gratis" : "Je huidige plan"}
          </button>
        </div>

        {/* plus */}
        <div className="card plan-plus" style={{ padding: "var(--sp-8)", borderColor: "color-mix(in oklab, var(--accent) 55%, transparent)", boxShadow: "var(--glow)" }}>
          <div className="between">
            <div className="card-label" style={{ color: "var(--accent)" }}>Plus · meest gekozen</div>
            <span className="pill" style={{ background: "color-mix(in oklab, var(--accent) 16%, transparent)", borderColor: "color-mix(in oklab, var(--accent) 45%, transparent)", color: "var(--accent)", padding: "4px 11px", fontSize: 12.5 }}>14 dagen gratis</span>
          </div>
          <div className="row" style={{ alignItems: "flex-end", gap: 6, margin: "var(--sp-3) 0 var(--sp-5)" }}>
            <span className="display tabnum" style={{ fontSize: 44, color: "var(--accent)" }}>{PLUS_PRICE}</span>
            <span className="faint" style={{ fontSize: 15, paddingBottom: 8 }}>/mnd</span>
          </div>
          <p className="muted" style={{ fontSize: 14.5, marginBottom: "var(--sp-5)" }}>Volledig automatisch handelen + alle slimme functies.</p>
          <button className="btn btn-primary btn-block btn-lg" onClick={() => go("dashboard")}>
            {active ? "Plus is actief" : "Start 14 dagen gratis"} {!active && I.arrowRight({ size: 18 })}
          </button>
        </div>
      </div>

      {/* comparison table */}
      <div className="card">
        <div className="eyebrow" style={{ marginBottom: "var(--sp-4)" }}>{I.gauge({ size: 14 })} Vergelijking</div>
        <table className="cmp-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "0 var(--sp-2) var(--sp-3)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-faint)" }}>Functie</th>
              <th style={{ width: 110, padding: "0 var(--sp-2) var(--sp-3)", fontSize: 13, color: "var(--text-dim)" }}>Gratis</th>
              <th style={{ width: 110, padding: "0 var(--sp-2) var(--sp-3)", fontSize: 13, color: "var(--accent)", fontWeight: 700 }}>Plus</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE.map(([f, g, p], i) => (
              <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "var(--sp-3) var(--sp-2)", fontSize: 15 }}>{f}</td>
                <td style={{ padding: "var(--sp-3) var(--sp-2)", textAlign: "center" }}><CompCell v={g} /></td>
                <td style={{ padding: "var(--sp-3) var(--sp-2)", textAlign: "center", background: "color-mix(in oklab, var(--accent) 6%, transparent)" }}><CompCell v={p} plus /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* premium feature spotlights */}
      <div>
        <div className="eyebrow" style={{ marginBottom: "var(--sp-4)" }}>{I.spark({ size: 14 })} Alleen met Plus</div>
        <div className="grid-2 spot-grid">
          <FeatureSpot tone="var(--c-charge)" icon={I.car({ size: 24 })} title="Slim EV-laden"
            body="Koppel je laadpaal en laad je auto automatisch op de goedkoopste uren van de nacht — afgestemd op je vertrektijd." />
          <FeatureSpot tone="var(--price-mid)" icon={I.bell({ size: 24 })} title="Prijsalerts"
            body="Push-melding bij negatieve prijzen of pieken, zodat je grootverbruikers slim kunt inplannen." />
          <FeatureSpot tone="var(--accent)" icon={I.report({ size: 24 })} title="Maandrapport"
            body="Helder overzicht van besparing, teruglevering en saldering — klaar voor je energieafrekening." />
          <FeatureSpot tone="var(--c-pv)" icon={I.strategy({ size: 24 })} title="Strategieën"
            body="Kies hoe je batterij denkt: maximaal rendement, zelfvoorzienend of zo groen mogelijk." />
        </div>
      </div>

      {/* strategy detail */}
      <div className="card">
        <div className="between" style={{ marginBottom: "var(--sp-5)", flexWrap: "wrap", gap: "var(--sp-3)" }}>
          <div><div className="eyebrow">{I.strategy({ size: 14 })} Handelsstrategie</div>
            <h3 style={{ fontSize: 22, marginTop: 8 }}>Stuur het algoritme op jouw doel</h3></div>
        </div>
        <div className="grid-3 strat-grid">
          {STRATEGIES.map(([name, body, tone], i) => (
            <div key={i} className="plan-col" style={{ borderColor: `color-mix(in oklab, ${tone} 35%, transparent)` }}>
              <div className="row" style={{ gap: 9, marginBottom: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 99, background: tone }} />
                <span style={{ fontWeight: 700, fontSize: 16, color: tone }}>{name}</span>
                {i === 0 && <span className="faint" style={{ fontSize: 12, marginLeft: "auto" }}>standaard</span>}
              </div>
              <p className="muted" style={{ fontSize: 14, lineHeight: 1.5, textWrap: "pretty" }}>{body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* guarantee */}
      <div className="card" style={{ padding: "var(--sp-6)", textAlign: "center" }}>
        <div className="row" style={{ gap: 10, justifyContent: "center", color: "var(--accent)", fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
          {I.shield({ size: 20 })} Geen risico
        </div>
        <p className="muted" style={{ fontSize: 15, maxWidth: 560, margin: "0 auto" }}>
          14 dagen gratis proberen, daarna {PLUS_PRICE} per maand. Maandelijks opzegbaar — verdien je de eerste maand de abonnementskosten niet terug, dan zit je nergens aan vast.
        </p>
      </div>
    </div>
  );
}
Object.assign(window, { Subscription });

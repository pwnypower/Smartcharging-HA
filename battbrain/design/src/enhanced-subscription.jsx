/* enhanced-subscription.jsx — premium glow + animated savings counter */

const PLUS_PRICE = "€6,95";

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

function FeatureSpot({ icon, tone, title, body, delay = 0 }) {
  return (
    <RevealOnScroll delay={delay}>
      <div className="card card-hover" style={{ padding: "var(--sp-5)", height: "100%" }}>
        <div style={{
          width: 48, height: 48, borderRadius: 13, display: "grid", placeItems: "center",
          color: tone, background: `color-mix(in oklab, ${tone} 16%, transparent)`,
          boxShadow: `0 8px 20px -8px color-mix(in oklab, ${tone} 35%, transparent)`,
          marginBottom: "var(--sp-4)",
        }}>{icon}</div>
        <h4 style={{ fontSize: 18, marginBottom: 6 }}>{title}</h4>
        <p className="muted" style={{ fontSize: 14.5, lineHeight: 1.5, textWrap: "pretty" }}>{body}</p>
      </div>
    </RevealOnScroll>
  );
}

function Subscription({ go, flags }) {
  const snap = useDemo();
  const active = flags.active;
  const monthlyEst = Math.round(Math.min(snap.savings, 4.2) * 28);
  const [billing, setBilling] = React.useState("monthly"); // monthly | yearly
  const yearlyPrice = 55.60;
  const monthlyPrice = 6.95;
  const yearlySaving = Math.round((monthlyPrice * 12 - yearlyPrice) * 100) / 100;

  return (
    <PageWrap>
      <div className="dash stagger">
        <div className="dash-statusbar">
          <h1 style={{ fontSize: "clamp(24px, 3vw, 34px)" }}>Abonnement</h1>
          <p className="muted" style={{ fontSize: 15.5, marginTop: 6 }}>Kies het plan dat bij je batterij past. Maandelijks opzegbaar.</p>
        </div>

        {/* value hero */}
        <div className="card" style={{
          padding: "var(--sp-8)", position: "relative", overflow: "hidden",
          background: "radial-gradient(700px 400px at 85% -20%, color-mix(in oklab, var(--accent) 22%, transparent), transparent 60%), linear-gradient(150deg, var(--surface-3), var(--surface))",
        }}>
          {/* decorative orb */}
          <div style={{ position: "absolute", top: "-40%", right: "-8%", width: 350, height: 280, borderRadius: "50%", background: "radial-gradient(circle, color-mix(in oklab, var(--accent) 18%, transparent), transparent 70%)", filter: "blur(50px)", pointerEvents: "none", animation: "orbFloat1 15s ease-in-out infinite" }} />
          <div className="between" style={{ flexWrap: "wrap", gap: "var(--sp-6)", position: "relative" }}>
            <div style={{ maxWidth: 480 }}>
              <span className="eyebrow">{I.crown({ size: 15 })} BattBrain Plus</span>
              <h2 style={{ fontSize: "clamp(26px, 3.4vw, 40px)", margin: "var(--sp-3) 0 var(--sp-3)" }}>Het verschil zit in het <span style={{ color: "var(--accent)" }}>automatisch handelen</span></h2>
              <p className="muted" style={{ fontSize: 16.5, lineHeight: 1.55, textWrap: "pretty" }}>
                Gratis monitor je je batterij — met Plus handelt BattBrain er automatisch naar, 24 uur per dag, zonder dat je iets hoeft te doen.
              </p>
            </div>
            <div style={{ textAlign: "center" }}>
              <div className="faint" style={{ fontSize: 13.5 }}>Geschat extra rendement</div>
              <div className="display tabnum" style={{ fontSize: "clamp(44px, 6vw, 68px)", color: "var(--accent)", lineHeight: 1 }}>
                <AnimNum value={monthlyEst} decimals={0} prefix="€" />
              </div>
              <div className="faint" style={{ fontSize: 13.5 }}>per maand · jouw setup</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>≈ {Math.round(monthlyEst / 6.95)}× de abonnementsprijs</div>
            </div>
          </div>
        </div>

        {/* billing toggle */}
        <div className="between" style={{ flexWrap: "wrap", gap: "var(--sp-4)" }}>
          <div />
          <div className="row" style={{ gap: 4, padding: 4, borderRadius: 999, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            {[["monthly", "Maandelijks"], ["yearly", "Jaarlijks"]].map(([k, l]) => (
              <button key={k} onClick={() => setBilling(k)} style={{
                border: 0, borderRadius: 999, padding: "8px 20px", fontSize: 14, fontWeight: 600,
                background: billing === k ? "var(--accent)" : "transparent",
                color: billing === k ? "#06140d" : "var(--text-dim)",
                cursor: "pointer", transition: "all 0.2s ease", position: "relative",
              }}>
                {l}
                {k === "yearly" && <span style={{ position: "absolute", top: -10, right: -4, fontSize: 10.5, fontWeight: 800, color: "var(--accent)", background: "color-mix(in oklab, var(--accent) 16%, transparent)", padding: "1px 6px", borderRadius: 99, border: "1px solid color-mix(in oklab, var(--accent) 40%, transparent)", whiteSpace: "nowrap" }}>2 mnd gratis</span>}
              </button>
            ))}
          </div>
        </div>

        {/* pricing cards */}
        <div className="grid-2 plan-cards">
          {/* gratis */}
          <TiltCard className="card card-hover" intensity={6} style={{ padding: "var(--sp-8)" }}>
            <div className="card-label">Gratis</div>
            <div className="row" style={{ alignItems: "flex-end", gap: 6, margin: "var(--sp-3) 0 var(--sp-5)" }}>
              <span className="display tabnum" style={{ fontSize: 44 }}>€0</span>
              <span className="faint" style={{ fontSize: 15, paddingBottom: 8 }}>/mnd</span>
            </div>
            <p className="muted" style={{ fontSize: 14.5, marginBottom: "var(--sp-5)" }}>Volg je batterij en prijzen mee. Handmatig sturen.</p>
            <button className="btn btn-ghost btn-block" disabled={!active} style={!active ? {} : { opacity: 0.6 }}>
              {active ? "Downgraden naar Gratis" : "Je huidige plan"}
            </button>
          </TiltCard>

          {/* plus — animated glow border */}
          <AnimatedBorder borderWidth={2} speed={5}>
          <TiltCard className="card" intensity={6} style={{ padding: "var(--sp-8)", borderColor: "color-mix(in oklab, var(--accent) 55%, transparent)" }}>
            <div className="between">
              <div className="card-label" style={{ color: "var(--accent)" }}>Plus · meest gekozen</div>
              <span className="pill" style={{ background: "color-mix(in oklab, var(--accent) 16%, transparent)", borderColor: "color-mix(in oklab, var(--accent) 45%, transparent)", color: "var(--accent)", padding: "4px 11px", fontSize: 12.5 }}>14 dagen gratis</span>
            </div>
            <div className="row" style={{ alignItems: "flex-end", gap: 6, margin: "var(--sp-3) 0 var(--sp-2)" }}>
              <span className="display tabnum" style={{ fontSize: 44, color: "var(--accent)" }}>
                {billing === "yearly" ? `€${(yearlyPrice / 12).toFixed(2).replace(".", ",")}` : PLUS_PRICE}
              </span>
              <span className="faint" style={{ fontSize: 15, paddingBottom: 8 }}>/mnd</span>
            </div>
            {billing === "yearly" ? (
              <div className="row" style={{ gap: 8, marginBottom: "var(--sp-5)" }}>
                <span className="pill" style={{ background: "color-mix(in oklab, var(--accent) 16%, transparent)", borderColor: "color-mix(in oklab, var(--accent) 40%, transparent)", color: "var(--accent)", fontSize: 12.5 }}>€{yearlyPrice}/jaar · bespaar €{yearlySaving.toFixed(2).replace(".", ",")}</span>
              </div>
            ) : (
              <p className="muted" style={{ fontSize: 14.5, marginBottom: "var(--sp-5)" }}>Volledig automatisch handelen + alle slimme functies.</p>
            )}
            <button className="btn btn-primary btn-block btn-lg" onClick={() => go("dashboard")}>
              {active ? "Plus is actief" : "Start 14 dagen gratis"} {!active && I.arrowRight({ size: 18 })}
            </button>
          </TiltCard>
          </AnimatedBorder>
        </div>

        {/* comparison table */}
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: "var(--sp-4)" }}>{I.gauge({ size: 14 })} Vergelijking</div>
          <table className="cmp-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={{ textAlign: "left", padding: "0 var(--sp-2) var(--sp-3)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-faint)" }}>Functie</th>
              <th style={{ width: 110, padding: "0 var(--sp-2) var(--sp-3)", fontSize: 13, color: "var(--text-dim)" }}>Gratis</th>
              <th style={{ width: 110, padding: "0 var(--sp-2) var(--sp-3)", fontSize: 13, color: "var(--accent)", fontWeight: 700 }}>Plus</th>
            </tr></thead>
            <tbody>
              {COMPARE.map(([f, g, p], i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "var(--sp-3) var(--sp-2)", fontSize: 15 }}>{f}</td>
                  <td style={{ padding: "var(--sp-3) var(--sp-2)", textAlign: "center" }}><CompCell v={g} /></td>
                  <td style={{ padding: "var(--sp-3) var(--sp-2)", textAlign: "center", background: "color-mix(in oklab, var(--accent) 5%, transparent)" }}><CompCell v={p} plus /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* premium feature spotlights */}
        <div>
          <div className="eyebrow" style={{ marginBottom: "var(--sp-4)" }}>{I.spark({ size: 14 })} Alleen met Plus</div>
          <div className="grid-2 spot-grid">
            <FeatureSpot tone="var(--c-charge)" icon={I.car({ size: 24 })} title="Slim EV-laden" delay={0}
              body="Koppel je laadpaal en laad je auto automatisch op de goedkoopste uren van de nacht — afgestemd op je vertrektijd." />
            <FeatureSpot tone="var(--price-mid)" icon={I.bell({ size: 24 })} title="Prijsalerts" delay={0.06}
              body="Push-melding bij negatieve prijzen of pieken, zodat je grootverbruikers slim kunt inplannen." />
            <FeatureSpot tone="var(--accent)" icon={I.report({ size: 24 })} title="Maandrapport" delay={0.12}
              body="Helder overzicht van besparing, teruglevering en saldering — klaar voor je energieafrekening." />
            <FeatureSpot tone="var(--c-pv)" icon={I.strategy({ size: 24 })} title="Strategieën" delay={0.18}
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
              <div key={i} className="plan-col" style={{ borderColor: `color-mix(in oklab, ${tone} 35%, transparent)`, transition: "transform 0.3s ease, box-shadow 0.3s ease", cursor: "default" }}>
                <div className="row" style={{ gap: 9, marginBottom: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 99, background: tone, boxShadow: `0 0 8px color-mix(in oklab, ${tone} 60%, transparent)` }} />
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
    </PageWrap>
  );
}

Object.assign(window, { Subscription });

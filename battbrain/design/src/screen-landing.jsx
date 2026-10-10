/* screen-landing.jsx */
const APP_NAME = "Stroomslim";

function Logo({ size = 30 }) {
  return (
    <div className="row" style={{ gap: 10 }}>
      <div style={{
        width: size, height: size, borderRadius: 9,
        background: "linear-gradient(150deg, color-mix(in oklab, var(--accent) 90%, white), var(--accent-2))",
        display: "grid", placeItems: "center", color: "#06140d",
        boxShadow: "0 6px 18px -6px color-mix(in oklab, var(--accent) 80%, transparent)",
      }}>
        {I.bolt({ size: size * 0.6 })}
      </div>
      <span className="display" style={{ fontSize: size * 0.66, fontWeight: 600, letterSpacing: "-0.03em" }}>{APP_NAME}</span>
    </div>
  );
}

function FeatureCard({ icon, tone, title, body }) {
  return (
    <div className="card fade-up" style={{ padding: "var(--sp-8)" }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14, display: "grid", placeItems: "center",
        background: `color-mix(in oklab, ${tone} 16%, transparent)`, color: tone, marginBottom: "var(--sp-5)",
      }}>{icon}</div>
      <h3 style={{ fontSize: "clamp(20px, 2.2vw, 25px)", marginBottom: "var(--sp-3)" }}>{title}</h3>
      <p className="muted" style={{ fontSize: "var(--sp-4, 16px)", lineHeight: 1.55, textWrap: "pretty" }}>{body}</p>
    </div>
  );
}

function Landing({ go }) {
  const snap = useDemo();
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* top bar */}
      <header style={{ maxWidth: "var(--maxw)", margin: "0 auto", width: "100%", padding: "var(--sp-6) var(--sp-6)" }} className="between">
        <Logo />
        <div className="row" style={{ gap: "var(--sp-3)" }}>
          <button className="btn btn-ghost" onClick={() => go("login")}>Inloggen</button>
          <button className="btn btn-primary" onClick={() => go("register")}>Start gratis</button>
        </div>
      </header>

      {/* hero */}
      <section style={{ maxWidth: "var(--maxw)", margin: "0 auto", width: "100%", padding: "var(--sp-10) var(--sp-6) var(--sp-12)" }}>
        <div className="hero-grid">
          <div className="fade-up" style={{ maxWidth: 600 }}>
            <span className="eyebrow">{I.leaf({ size: 15 })} Slim handelen met je thuisbatterij</span>
            <h1 style={{ fontSize: "clamp(40px, 6vw, 76px)", margin: "var(--sp-5) 0 var(--sp-5)", letterSpacing: "-0.035em" }}>
              Koop stroom goedkoop.<br /><span style={{ color: "var(--accent)" }}>Verkoop duur.</span> Automatisch.
            </h1>
            <p className="muted" style={{ fontSize: "clamp(17px, 1.5vw, 21px)", lineHeight: 1.5, maxWidth: 520, textWrap: "pretty" }}>
              Laat je batterij automatisch laden wanneer stroom goedkoop is en ontladen wanneer die duur is. Stroomslim leest de dynamische prijzen en stuurt je omvormer — jij verdient er aan terwijl je slaapt.
            </p>
            <div className="row" style={{ gap: "var(--sp-3)", marginTop: "var(--sp-8)", flexWrap: "wrap" }}>
              <button className="btn btn-primary btn-lg" onClick={() => go("register")}>
                Start gratis proefperiode {I.arrowRight({ size: 18 })}
              </button>
              <button className="btn btn-ghost btn-lg" onClick={() => go("dashboard")}>Bekijk demo-dashboard</button>
            </div>
            <div className="row" style={{ gap: "var(--sp-6)", marginTop: "var(--sp-8)", flexWrap: "wrap" }}>
              {[["Solis","GoodWe","Growatt"].join(" · "), "Frank · Tibber · Energie Zero"].map((t, i) => (
                <div key={i} className="row faint" style={{ gap: 8, fontSize: 13.5 }}>
                  {i === 0 ? I.plug({ size: 15 }) : I.cloud({ size: 15 })}<span>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* live preview card */}
          <div className="card fade-up live-preview" style={{ padding: "var(--sp-6)", animationDelay: ".1s" }}>
            <div className="between" style={{ marginBottom: "var(--sp-5)" }}>
              <div className="pill" style={{ background: "color-mix(in oklab, var(--accent) 14%, transparent)", borderColor: "color-mix(in oklab, var(--accent) 40%, transparent)", color: "var(--accent)" }}>
                <span className="dot pulse" style={{ background: "var(--accent)" }} />Actief
              </div>
              <span className="faint" style={{ fontSize: 13 }}>Vandaag · {snap.clock}</span>
            </div>
            <div className="between" style={{ alignItems: "flex-end", marginBottom: "var(--sp-4)" }}>
              <div>
                <div className="card-label">Huidige prijs</div>
                <div className="display tabnum" style={{ fontSize: 40, color: priceColor(snap.priceCt) }}>
                  {fmtCt(snap.priceCt)}<span style={{ fontSize: 16, color: "var(--text-dim)" }}>/kWh</span>
                </div>
              </div>
              <div className="row" style={{ gap: 7, color: actionColor(snap.action), fontWeight: 600 }}>
                {actionIcon(snap.action, { size: 18 })}{snap.actionLabel}
              </div>
            </div>
            <PriceCurve snap={snap} height={190} />
            <div className="between" style={{ marginTop: "var(--sp-4)", paddingTop: "var(--sp-4)", borderTop: "1px solid var(--border)" }}>
              <div><div className="card-label">Besparing vandaag</div><div className="display tabnum" style={{ fontSize: 24, color: "var(--accent)" }}>{fmtEur(snap.savings)}</div></div>
              <div style={{ textAlign: "right" }}><div className="card-label">Batterij</div><div className="display tabnum" style={{ fontSize: 24 }}>{snap.soc}%</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* features */}
      <section style={{ maxWidth: "var(--maxw)", margin: "0 auto", width: "100%", padding: "0 var(--sp-6) var(--sp-16)" }}>
        <div className="feature-grid">
          <FeatureCard tone="var(--c-charge)" icon={I.spark({ size: 26 })}
            title="Automatisch laden & ontladen"
            body="Stroomslim stuurt je omvormer realtime aan op basis van de dynamische uurprijzen. Geen knoppen, geen gokwerk." />
          <FeatureCard tone="var(--accent)" icon={I.trend({ size: 26 })}
            title="Dagelijks handelsplan"
            body="Elke ochtend bepaalt het algoritme de goedkoopste en duurste uren en plant precies wanneer er geladen en verkocht wordt." />
          <FeatureCard tone="var(--c-pv)" icon={I.sun({ size: 26 })}
            title="Energiesamenvatting"
            body="Zie in één oogopslag hoeveel je hebt geladen, teruggeleverd en bespaard — met je zonne-opbrengst meegerekend." />
        </div>
      </section>

      {/* cta band */}
      <section style={{ maxWidth: "var(--maxw)", margin: "0 auto var(--sp-16)", width: "100%", padding: "0 var(--sp-6)" }}>
        <div className="card" style={{ padding: "var(--sp-12)", textAlign: "center", background: "linear-gradient(150deg, var(--surface-3), var(--surface))" }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 46px)", marginBottom: "var(--sp-4)" }}>Verdien aan elke kilowattuur</h2>
          <p className="muted" style={{ fontSize: 18, maxWidth: 540, margin: "0 auto var(--sp-8)", textWrap: "pretty" }}>
            Gemiddeld €25–€60 per maand extra rendement uit je batterij. 14 dagen gratis, daarna €6,95 per maand. Maandelijks opzegbaar.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => go("register")}>Start gratis proefperiode {I.arrowRight({ size: 18 })}</button>
        </div>
      </section>

      {/* footer */}
      <footer style={{ borderTop: "1px solid var(--border)", marginTop: "auto" }}>
        <div className="between footer-inner" style={{ maxWidth: "var(--maxw)", margin: "0 auto", width: "100%", padding: "var(--sp-6)", flexWrap: "wrap", gap: "var(--sp-4)" }}>
          <Logo size={24} />
          <div className="row faint" style={{ gap: "var(--sp-6)", fontSize: 13.5, flexWrap: "wrap" }}>
            <span>Privacy</span><span>Voorwaarden</span><span>Support</span><span>© 2026 Stroomslim B.V.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
Object.assign(window, { Landing, Logo, APP_NAME });

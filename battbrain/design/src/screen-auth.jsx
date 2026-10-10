/* screen-auth.jsx */
function PasswordField({ value, onChange, placeholder }) {
  const [show, setShow] = React.useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input className="input" type={show ? "text" : "password"} value={value}
             onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ paddingRight: 44 }} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label="Toon wachtwoord"
              style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: 0, color: "var(--text-faint)", padding: 8, display: "grid", placeItems: "center" }}>
        {I.eye({ size: 18 })}
      </button>
    </div>
  );
}

function Auth({ mode, go }) {
  const register = mode === "register";
  const [email, setEmail] = React.useState(register ? "" : "jij@voorbeeld.nl");
  const [pw, setPw] = React.useState("");
  const [name, setName] = React.useState("");
  const snap = useDemo();

  const submit = (e) => { e.preventDefault(); go(register ? "onboarding" : "dashboard", name); };

  return (
    <div className="auth-wrap">
      {/* brand panel */}
      <aside className="auth-aside">
        <HeroReveal delay={0.05}>
        <div className="between">
          <Logo />
          <button className="btn btn-ghost" onClick={() => go("landing")} style={{ padding: "8px 16px", fontSize: 14 }}>← Terug</button>
        </div>
        </HeroReveal>
        <div style={{ margin: "auto 0" }}>
          <HeroReveal delay={0.15}><span className="eyebrow">{I.leaf({ size: 15 })} Welkom terug</span></HeroReveal>
          <HeroReveal delay={0.25}><h2 style={{ fontSize: "clamp(30px, 3.4vw, 48px)", margin: "var(--sp-4) 0 var(--sp-5)", letterSpacing: "-0.03em" }}>
            Jouw brein.<br />Jouw batterij.
          </h2></HeroReveal>
          <HeroReveal delay={0.38}><p className="muted" style={{ fontSize: 17, maxWidth: 380, textWrap: "pretty" }}>
            Sinds vannacht {fmtKwh(snap.summary.charged)} kWh goedkoop geladen en {fmtKwh(snap.summary.discharged)} kWh duur teruggeleverd.
          </p></HeroReveal>
          <HeroReveal delay={0.5}><div className="card" style={{ marginTop: "var(--sp-8)", maxWidth: 380, padding: "var(--sp-5)" }}>
            <div className="between">
              <div className="pill" style={{ background: "color-mix(in oklab, var(--accent) 14%, transparent)", borderColor: "color-mix(in oklab, var(--accent) 40%, transparent)", color: "var(--accent)" }}>
                <span className="dot pulse" style={{ background: "var(--accent)" }} />Actief
              </div>
              <span className="display tabnum" style={{ fontSize: 22, color: "var(--accent)" }}>{fmtEur(snap.savings)}</span>
            </div>
            <Sparkline data={snap.plan.curve} w={340} h={70} />
            <div className="between faint" style={{ fontSize: 12.5 }}><span>00u</span><span>prijsverloop vandaag</span><span>24u</span></div>
          </div></HeroReveal>
        </div>
        <div className="faint" style={{ fontSize: 13 }}>© 2026 Stroomslim B.V.</div>
      </aside>

      {/* form */}
      <main className="auth-main">
        <form className="auth-form" onSubmit={submit}>
          <HeroReveal delay={0.2}><div style={{ marginBottom: "var(--sp-8)" }}>
            <h1 style={{ fontSize: "clamp(28px, 3vw, 38px)", marginBottom: "var(--sp-2)" }}>
              {register ? "Maak je account aan" : "Inloggen"}
            </h1>
            <p className="muted" style={{ fontSize: 16 }}>
              {register ? "14 dagen gratis. Geen creditcard nodig." : "Welkom terug bij BattBrain."}
            </p>
          </div></HeroReveal>

          <HeroReveal delay={0.35}><div className="stack" style={{ gap: "var(--sp-5)" }}>
            {register && (
              <div className="field">
                <label>Naam</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Voor- en achternaam" />
              </div>
            )}
            <div className="field">
              <label>E-mailadres</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jij@voorbeeld.nl" />
            </div>
            <div className="field">
              <div className="between"><label>Wachtwoord</label>
                {!register && <span className="faint" style={{ fontSize: 13 }}>Vergeten?</span>}
              </div>
              <PasswordField value={pw} onChange={setPw} placeholder={register ? "Minimaal 8 tekens" : "••••••••"} />
            </div>

            <button className="btn btn-primary btn-block btn-lg" type="submit" style={{ marginTop: "var(--sp-2)" }}>
              {register ? "Account aanmaken" : "Inloggen"} {I.arrowRight({ size: 18 })}
            </button>

            <div className="row" style={{ gap: "var(--sp-3)", color: "var(--text-faint)", fontSize: 13 }}>
              <div style={{ height: 1, background: "var(--border)", flex: 1 }} /> of <div style={{ height: 1, background: "var(--border)", flex: 1 }} />
            </div>
            <button className="btn btn-ghost btn-block" type="button" onClick={submit}>
              {I.shield({ size: 17 })} Verder met DigiD
            </button>
          </div>
          </HeroReveal>
          <p className="muted" style={{ textAlign: "center", marginTop: "var(--sp-8)", fontSize: 15 }}>
            {register ? "Heb je al een account? " : "Nog geen account? "}
            <a onClick={() => go(register ? "login" : "register")} style={{ color: "var(--accent)", fontWeight: 600, cursor: "pointer" }}>
              {register ? "Inloggen" : "Start gratis"}
            </a>
          </p>
        </form>
      </main>
    </div>
  );
}
Object.assign(window, { Auth });

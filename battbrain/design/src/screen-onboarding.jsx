/* screen-onboarding.jsx — 4-step setup wizard */

const OB_STEPS = [
  { id: "welkom",    label: "Welkom",     icon: "🏠" },
  { id: "omvormer",  label: "Omvormer",   icon: "🔌" },
  { id: "provider",  label: "Provider",   icon: "☁️"  },
  { id: "strategie", label: "Strategie",  icon: "🎯" },
  { id: "klaar",     label: "Klaar",      icon: "✓"  },
];

const OB_INVERTERS = {
  Solis:   { portal: "SolisCloud", color: "var(--c-charge)",    fields: [["apiKey","API Key","text"],["secret","API Secret","password"],["station","Station ID","text"]] },
  GoodWe:  { portal: "SEMS Portal", color: "var(--accent)",     fields: [["apiKey","E-mailadres","email"],["secret","Wachtwoord","password"],["station","Plant ID","text"]] },
  Growatt: { portal: "ShinePhone",  color: "var(--price-mid)",  fields: [["apiKey","E-mailadres","email"],["secret","Wachtwoord","password"],["station","Serienummer","text"]] },
  Huawei:  { portal: "FusionSolar", color: "var(--c-pv)",       fields: [["apiKey","Gebruikersnaam","text"],["secret","Systeemwachtwoord","password"],["station","Plant ID","text"]] },
};

const OB_PROVIDERS = [
  { name: "Frank Energie", desc: "Populair in NL · geen token nodig", token: false, color: "var(--accent)" },
  { name: "Tibber",        desc: "Scandinavische app · token vereist", token: true,  color: "var(--c-charge)" },
  { name: "Energie Zero",  desc: "Gronings · geen token nodig",        token: false, color: "var(--c-pv)" },
  { name: "ENTSO-E",       desc: "Directe beursprijs · token vereist", token: true,  color: "var(--price-mid)" },
];

const OB_STRATEGIES = [
  {
    id: "max",
    name: "Max rendement",
    sub: "Aanbevolen",
    desc: "Haal het maximale uit elk prijsverschil — handelen tot de batterijgrenzen.",
    color: "var(--accent)",
    icon: I => I.trend({ size: 24 }),
    est: "€35–60 / mnd",
  },
  {
    id: "self",
    name: "Zelfvoorzienend",
    sub: "Populair",
    desc: "Bewaar lading voor eigen verbruik 's avonds. Minimale netafname.",
    color: "var(--c-charge)",
    icon: I => I.shield({ size: 24 }),
    est: "€20–40 / mnd",
  },
  {
    id: "eco",
    name: "Eco / CO₂-arm",
    sub: "Groen",
    desc: "Laad alleen wanneer het net het groenst is, niet enkel het goedkoopst.",
    color: "var(--c-pv)",
    icon: I => I.leaf({ size: 24 }),
    est: "€15–35 / mnd",
  },
];

/* ---- Step progress dots ---- */
function StepDots({ current, total }) {
  return (
    <div className="row" style={{ gap: 8, justifyContent: "center" }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          height: 6, borderRadius: 3,
          background: i <= current ? "var(--accent)" : "var(--border)",
          width: i === current ? 24 : 6,
          transition: "all 0.4s cubic-bezier(0.16, 0.84, 0.44, 1)",
          boxShadow: i === current ? "0 0 8px var(--accent)" : "none",
        }} />
      ))}
    </div>
  );
}

/* ---- Animated step wrapper ---- */
function StepFrame({ stepKey, children }) {
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 40);
    return () => clearTimeout(t);
  }, [stepKey]);

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "none" : "translateY(18px)",
      transition: "opacity 0.45s cubic-bezier(0.16,0.84,0.44,1), transform 0.45s cubic-bezier(0.16,0.84,0.44,1)",
    }}>
      {children}
    </div>
  );
}

/* ---- Step 0: Welkom ---- */
function StepWelkom({ name, onNext }) {
  const snap = useDemo();
  return (
    <StepFrame stepKey="welkom">
      <div style={{ textAlign: "center", padding: "var(--sp-4) 0" }}>
        <div style={{ position: "relative", display: "inline-block", marginBottom: "var(--sp-6)" }}>
          <LiquidBattery soc={72} action="charge" size={120} />
          <PulseRing color="var(--accent)" size={90} count={2} />
        </div>
        <h2 style={{ fontSize: "clamp(26px, 3.5vw, 38px)", marginBottom: "var(--sp-3)" }}>
          Welkom{name ? `, ${name.split(" ")[0]}` : ""}! 👋
        </h2>
        <p className="muted" style={{ fontSize: 17, maxWidth: 420, margin: "0 auto var(--sp-8)", lineHeight: 1.55, textWrap: "pretty" }}>
          Je bent er bijna. Verbind je omvormer en BattBrain handelt automatisch — gemiddeld <strong style={{ color: "var(--accent)" }}>€35–60</strong> per maand extra rendement.
        </p>

        <div className="stack" style={{ gap: "var(--sp-3)", maxWidth: 380, margin: "0 auto var(--sp-8)", textAlign: "left" }}>
          {[
            ["Koppel je omvormer", "var(--c-charge)", I.plug({ size: 17 })],
            ["Kies je energieprovider", "var(--c-pv)", I.cloud({ size: 17 })],
            ["Stel je handelsstrategie in", "var(--accent)", I.strategy({ size: 17 })],
          ].map(([label, color, icon], i) => (
            <div key={i} className="row" style={{ gap: 12, padding: "var(--sp-3) var(--sp-4)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12 }}>
              <span style={{ color, flex: "none" }}>{icon}</span>
              <span style={{ fontSize: 15, fontWeight: 500 }}>{label}</span>
              <span style={{ marginLeft: "auto" }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: `color-mix(in oklab, ${color} 18%, transparent)`, display: "grid", placeItems: "center", color }}>
                  {I.check({ size: 13 })}
                </span>
              </span>
            </div>
          ))}
        </div>

        <button className="btn btn-primary btn-lg" onClick={onNext} style={{ width: "100%", maxWidth: 380 }}>
          Aan de slag {I.arrowRight({ size: 18 })}
        </button>
      </div>
    </StepFrame>
  );
}

/* ---- Step 1: Omvormer ---- */
function StepOmvormer({ onNext, onSkip }) {
  const [brand, setBrand] = React.useState("Solis");
  const [vals, setVals] = React.useState({ apiKey: "", secret: "", station: "" });
  const [test, setTest] = React.useState({ state: "idle", msg: "" });
  const cfg = OB_INVERTERS[brand];
  const set = (k, v) => { setVals(s => ({ ...s, [k]: v })); setTest({ state: "idle", msg: "" }); };

  const runTest = () => {
    const empty = cfg.fields.some(([k]) => !vals[k].trim());
    if (empty) { setTest({ state: "err", msg: "Vul eerst alle velden in." }); return; }
    setTest({ state: "loading", msg: "" });
    setTimeout(() => setTest({ state: "ok", msg: `Verbinding gelukt · SoC ${Demo.snapshot().soc}%` }), 1600);
  };

  return (
    <StepFrame stepKey="omvormer">
      <div style={{ marginBottom: "var(--sp-5)" }}>
        <h2 style={{ fontSize: "clamp(22px, 2.8vw, 30px)", marginBottom: 6 }}>Koppel je omvormer</h2>
        <p className="muted" style={{ fontSize: 15.5 }}>Stroomslim stuurt je omvormer via de cloud-API van jouw portal.</p>
      </div>

      {/* brand selector */}
      <div className="row" style={{ gap: "var(--sp-3)", flexWrap: "wrap", marginBottom: "var(--sp-5)" }}>
        {Object.entries(OB_INVERTERS).map(([b, cfg]) => (
          <button key={b} onClick={() => { setBrand(b); setVals({ apiKey: "", secret: "", station: "" }); setTest({ state: "idle", msg: "" }); }}
            style={{
              border: `2px solid ${brand === b ? cfg.color : "var(--border)"}`,
              borderRadius: 12, padding: "10px 20px",
              background: brand === b ? `color-mix(in oklab, ${cfg.color} 12%, transparent)` : "var(--surface-2)",
              color: brand === b ? cfg.color : "var(--text-dim)",
              fontWeight: brand === b ? 700 : 500, fontSize: 14.5,
              cursor: "pointer", transition: "all 0.2s ease",
            }}>
            {b}
          </button>
        ))}
      </div>

      <div className="faint" style={{ fontSize: 13, marginBottom: "var(--sp-4)" }}>
        {I.shield({ size: 13 })} Verbindt via <strong>{cfg.portal}</strong> · alleen leestoegang
      </div>

      <div className="stack" style={{ gap: "var(--sp-4)", marginBottom: "var(--sp-5)" }}>
        {cfg.fields.map(([k, label, type]) => (
          <div className="field" key={k}>
            <label>{label}</label>
            <input className="input" type={type === "password" ? "password" : type}
              value={vals[k]} onChange={e => set(k, e.target.value)} placeholder={label} />
          </div>
        ))}
      </div>

      <div className="row" style={{ gap: "var(--sp-3)", marginBottom: "var(--sp-6)", flexWrap: "wrap" }}>
        <button className="btn btn-ghost" onClick={runTest} disabled={test.state === "loading"}>
          {test.state === "loading"
            ? <React.Fragment><span className="spinner" /> Verbinden…</React.Fragment>
            : <React.Fragment>{I.spark({ size: 16 })} Test verbinding</React.Fragment>}
        </button>
        {test.state === "ok" && (
          <span className="row" style={{ gap: 7, color: "var(--accent)", fontWeight: 600, fontSize: 14.5 }}>
            {I.check({ size: 16 })} {test.msg}
          </span>
        )}
        {test.state === "err" && (
          <span className="row" style={{ gap: 7, color: "var(--price-high)", fontWeight: 600, fontSize: 14.5 }}>
            {I.close({ size: 16 })} {test.msg}
          </span>
        )}
      </div>

      <div className="row" style={{ gap: "var(--sp-3)" }}>
        <button className="btn btn-primary" onClick={onNext} style={{ flex: 1 }}>
          {test.state === "ok" ? "Opgeslagen · Verder" : "Opslaan & verder"} {I.arrowRight({ size: 17 })}
        </button>
        <button className="btn btn-ghost" onClick={onSkip}>Overslaan</button>
      </div>
    </StepFrame>
  );
}

/* ---- Step 2: Provider ---- */
function StepProvider({ onNext, onSkip }) {
  const [selected, setSelected] = React.useState("Frank Energie");
  const [token, setToken] = React.useState("");
  const prov = OB_PROVIDERS.find(p => p.name === selected);

  return (
    <StepFrame stepKey="provider">
      <div style={{ marginBottom: "var(--sp-5)" }}>
        <h2 style={{ fontSize: "clamp(22px, 2.8vw, 30px)", marginBottom: 6 }}>Kies je energieprovider</h2>
        <p className="muted" style={{ fontSize: 15.5 }}>Bron voor de dynamische uurprijzen. Je kunt dit later altijd wijzigen.</p>
      </div>

      <div className="stack" style={{ gap: "var(--sp-3)", marginBottom: "var(--sp-5)" }}>
        {OB_PROVIDERS.map(p => (
          <button key={p.name} onClick={() => setSelected(p.name)} style={{
            display: "flex", alignItems: "center", gap: "var(--sp-4)",
            padding: "var(--sp-4) var(--sp-5)",
            border: `2px solid ${selected === p.name ? p.color : "var(--border)"}`,
            borderRadius: 14,
            background: selected === p.name ? `color-mix(in oklab, ${p.color} 10%, transparent)` : "var(--surface-2)",
            cursor: "pointer", textAlign: "left", transition: "all 0.2s ease",
          }}>
            <span style={{
              width: 40, height: 40, borderRadius: 10, flex: "none",
              background: `color-mix(in oklab, ${p.color} 16%, transparent)`,
              color: p.color, display: "grid", placeItems: "center",
            }}>{I.cloud({ size: 20 })}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15.5, color: selected === p.name ? p.color : "var(--text)" }}>{p.name}</div>
              <div className="faint" style={{ fontSize: 13 }}>{p.desc}</div>
            </div>
            <div style={{
              width: 22, height: 22, borderRadius: "50%", flex: "none",
              border: `2px solid ${selected === p.name ? p.color : "var(--border)"}`,
              background: selected === p.name ? p.color : "transparent",
              display: "grid", placeItems: "center",
              transition: "all 0.2s ease",
            }}>
              {selected === p.name && <span style={{ color: "#06140d", fontSize: 13, fontWeight: 900 }}>✓</span>}
            </div>
          </button>
        ))}
      </div>

      {prov?.token && (
        <div className="field" style={{ marginBottom: "var(--sp-5)" }}>
          <label>API-token ({selected})</label>
          <input className="input" value={token} onChange={e => setToken(e.target.value)} placeholder="Plak je token hier" />
          <span className="hint">Te vinden in je {selected}-account onder Ontwikkelaar / API.</span>
        </div>
      )}

      {!prov?.token && (
        <div className="row muted" style={{ gap: 10, padding: "var(--sp-4)", background: "var(--surface-2)", borderRadius: 12, border: "1px solid var(--border)", fontSize: 14.5, marginBottom: "var(--sp-5)" }}>
          {I.check({ size: 18, style: { color: "var(--accent)" } })} Geen token nodig — prijzen worden automatisch opgehaald.
        </div>
      )}

      <div className="row" style={{ gap: "var(--sp-3)" }}>
        <button className="btn btn-primary" onClick={onNext} style={{ flex: 1 }}>
          Opslaan & verder {I.arrowRight({ size: 17 })}
        </button>
        <button className="btn btn-ghost" onClick={onSkip}>Overslaan</button>
      </div>
    </StepFrame>
  );
}

/* ---- Step 3: Strategie ---- */
function StepStrategie({ onNext, onSkip }) {
  const [selected, setSelected] = React.useState("max");

  return (
    <StepFrame stepKey="strategie">
      <div style={{ marginBottom: "var(--sp-5)" }}>
        <h2 style={{ fontSize: "clamp(22px, 2.8vw, 30px)", marginBottom: 6 }}>Kies je strategie</h2>
        <p className="muted" style={{ fontSize: 15.5 }}>Stroomslim past het handelsalgoritme aan op jouw doel.</p>
      </div>

      <div className="stack" style={{ gap: "var(--sp-3)", marginBottom: "var(--sp-6)" }}>
        {OB_STRATEGIES.map(s => (
          <button key={s.id} onClick={() => setSelected(s.id)} style={{
            display: "flex", alignItems: "flex-start", gap: "var(--sp-4)",
            padding: "var(--sp-5)",
            border: `2px solid ${selected === s.id ? s.color : "var(--border)"}`,
            borderRadius: 16,
            background: selected === s.id ? `color-mix(in oklab, ${s.color} 10%, transparent)` : "var(--surface-2)",
            cursor: "pointer", textAlign: "left", transition: "all 0.25s ease",
            transform: selected === s.id ? "scale(1.015)" : "scale(1)",
          }}>
            <span style={{
              width: 48, height: 48, borderRadius: 13, flex: "none",
              background: `color-mix(in oklab, ${s.color} 16%, transparent)`,
              color: s.color, display: "grid", placeItems: "center",
              boxShadow: selected === s.id ? `0 8px 20px -8px color-mix(in oklab, ${s.color} 45%, transparent)` : "none",
              transition: "box-shadow 0.25s ease",
            }}>{s.icon(I)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 16, color: selected === s.id ? s.color : "var(--text)" }}>{s.name}</span>
                {s.sub && <span style={{ fontSize: 11.5, padding: "2px 8px", borderRadius: 99, background: `color-mix(in oklab, ${s.color} 16%, transparent)`, color: s.color, fontWeight: 600 }}>{s.sub}</span>}
                <span style={{ marginLeft: "auto", fontSize: 13.5, color: s.color, fontWeight: 700 }} className="tabnum">{s.est}</span>
              </div>
              <p className="muted" style={{ fontSize: 14, lineHeight: 1.45, textWrap: "pretty", margin: 0 }}>{s.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="row" style={{ gap: "var(--sp-3)" }}>
        <button className="btn btn-primary" onClick={onNext} style={{ flex: 1 }}>
          Strategie instellen {I.arrowRight({ size: 17 })}
        </button>
        <button className="btn btn-ghost" onClick={onSkip}>Overslaan</button>
      </div>
    </StepFrame>
  );
}

/* ---- Step 4: Klaar ---- */
function StepKlaar({ go, name }) {
  const [launched, setLaunched] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setLaunched(true), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <StepFrame stepKey="klaar">
      <div style={{ textAlign: "center", padding: "var(--sp-2) 0" }}>
        {/* success ring */}
        <div style={{ position: "relative", display: "inline-flex", marginBottom: "var(--sp-6)" }}>
          <div style={{
            width: 100, height: 100, borderRadius: "50%",
            background: "color-mix(in oklab, var(--accent) 16%, transparent)",
            border: "2px solid color-mix(in oklab, var(--accent) 50%, transparent)",
            display: "grid", placeItems: "center",
            color: "var(--accent)",
            boxShadow: "0 0 40px -8px color-mix(in oklab, var(--accent) 50%, transparent)",
            opacity: launched ? 1 : 0,
            transform: launched ? "scale(1)" : "scale(0.7)",
            transition: "opacity 0.6s cubic-bezier(0.16,0.84,0.44,1), transform 0.6s cubic-bezier(0.16,0.84,0.44,1)",
          }}>
            {I.check({ size: 44 })}
          </div>
          <PulseRing color="var(--accent)" size={80} count={3} />
        </div>

        <h2 style={{ fontSize: "clamp(26px, 3.5vw, 38px)", marginBottom: "var(--sp-3)" }}>
          Alles staat klaar!
        </h2>
        <p className="muted" style={{ fontSize: 17, maxWidth: 400, margin: "0 auto var(--sp-8)", lineHeight: 1.55 }}>
          BattBrain is nu actief en bewaakt de stroomprijzen voor je. Zodra er een gunstig moment is, gaat je batterij automatisch aan de slag.
        </p>

        {/* projected savings */}
        <div className="card" style={{
          maxWidth: 380, margin: "0 auto var(--sp-8)",
          padding: "var(--sp-6)",
          background: "linear-gradient(145deg, var(--surface-3), var(--surface))",
        }}>
          <div className="row" style={{ justifyContent: "space-around" }}>
            <div style={{ textAlign: "center" }}>
              <div className="faint" style={{ fontSize: 12.5, marginBottom: 4 }}>Per maand</div>
              <CountUp value={47} prefix="€" color="var(--accent)" duration={1800} />
            </div>
            <div style={{ width: 1, background: "var(--border)" }} />
            <div style={{ textAlign: "center" }}>
              <div className="faint" style={{ fontSize: 12.5, marginBottom: 4 }}>Per jaar</div>
              <CountUp value={564} prefix="€" color="var(--c-pv)" duration={2000} />
            </div>
            <div style={{ width: 1, background: "var(--border)" }} />
            <div style={{ textAlign: "center" }}>
              <div className="faint" style={{ fontSize: 12.5, marginBottom: 4 }}>Terugverdientijd</div>
              <div className="display tabnum" style={{ fontSize: 26 }}>3 <span style={{ fontSize: 14, color: "var(--text-faint)" }}>jr</span></div>
            </div>
          </div>
        </div>

        <button className="btn btn-primary btn-lg" onClick={() => go("dashboard")}
          style={{ width: "100%", maxWidth: 380 }}>
          Naar het dashboard {I.arrowRight({ size: 18 })}
        </button>
      </div>
    </StepFrame>
  );
}

/* ---- Main Onboarding component ---- */
function Onboarding({ go, userName }) {
  const [step, setStep] = React.useState(0);
  const next = () => setStep(s => Math.min(OB_STEPS.length - 1, s + 1));
  const skip = () => setStep(s => Math.min(OB_STEPS.length - 1, s + 1));
  const totalDots = OB_STEPS.length;

  const stepContent = () => {
    if (step === 0) return <StepWelkom name={userName} onNext={next} />;
    if (step === 1) return <StepOmvormer onNext={next} onSkip={skip} />;
    if (step === 2) return <StepProvider onNext={next} onSkip={skip} />;
    if (step === 3) return <StepStrategie onNext={next} onSkip={skip} />;
    if (step === 4) return <StepKlaar go={go} name={userName} />;
    return null;
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "var(--sp-6)", position: "relative", overflow: "hidden",
    }}>
      {/* background orbs */}
      <GlassOrb color="var(--accent)" size={600} x="80%" y="10%" delay={0} idx={1} />
      <GlassOrb color="var(--c-charge)" size={400} x="10%" y="85%" delay={5} idx={2} />
      <ParticleField count={20} />

      {/* card */}
      <div style={{
        width: "100%", maxWidth: 580,
        background: "var(--surface)",
        backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-sat))",
        WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-sat))",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow), var(--card-inset)",
        padding: "var(--sp-8)",
        position: "relative",
      }}>
        {/* top: logo + step label */}
        <div className="between" style={{ marginBottom: "var(--sp-6)" }}>
          <Logo size={26} />
          {step < OB_STEPS.length - 1 && (
            <span className="faint" style={{ fontSize: 13.5 }}>
              Stap {step + 1} van {OB_STEPS.length - 1}
            </span>
          )}
        </div>

        {/* progress dots */}
        <div style={{ marginBottom: "var(--sp-7)" }}>
          <StepDots current={step} total={totalDots} />
        </div>

        {/* step content */}
        {stepContent()}

        {/* skip all */}
        {step > 0 && step < OB_STEPS.length - 1 && (
          <div style={{ textAlign: "center", marginTop: "var(--sp-5)" }}>
            <button className="btn btn-ghost" style={{ fontSize: 13.5, opacity: 0.6 }}
              onClick={() => go("dashboard")}>
              Alles overslaan, direct naar dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { Onboarding });

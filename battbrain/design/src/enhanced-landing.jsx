/* enhanced-landing.jsx — dramatic hero with liquid battery + energy flow */

const APP_NAME = "BattBrain";

/* ---- LiveSavingsCounter: cumulatief optellend op basis van gebruikersrate ---- */
// ~500 gebruikers × €1,82/dag ÷ 86400s = €0,0105/s gezamenlijk
const SAVINGS_RATE_PER_SEC = (500 * 1.82) / 86400;
const SAVINGS_BASE = 24800;
const LS_KEY = "bb-total-savings-v1";

function loadSavings() {
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY));
    if (s && s.ts && s.value) {
      const elapsed = Math.max(0, (Date.now() - s.ts) / 1000);
      return s.value + elapsed * SAVINGS_RATE_PER_SEC;
    }
  } catch (e) {}
  return SAVINGS_BASE;
}

function saveSavings(v) {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ value: v, ts: Date.now() })); } catch (e) {}
}

function fmtEurNL(v) {
  // Dutch formatting: €24.823
  return "€" + Math.floor(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function LiveSavingsCounter() {
  const [value, setValue] = React.useState(loadSavings);
  const [flash, setFlash] = React.useState(false);
  const [ref, inView] = useInView();

  React.useEffect(() => {
    const id = setInterval(() => {
      setValue(v => {
        const next = v + SAVINGS_RATE_PER_SEC * 3; // tick elke 3s
        saveSavings(next);
        return next;
      });
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <span ref={ref} className="display tabnum" style={{
      color: "var(--c-pv)",
      textShadow: flash ? "0 0 20px color-mix(in oklab, var(--c-pv) 70%, transparent)" : "none",
      transition: "text-shadow 0.5s ease",
      fontSize: "inherit",
    }}>
      {fmtEurNL(value)}
    </span>
  );
}

/* ---- EPEX suppliers ---- */
const EPEX_SUPPLIERS = [
  { id: "epex",        name: "EPEX kaal",       markup: 0   },
  { id: "frank",       name: "Frank Energie",   markup: 1.2 },
  { id: "tibber",      name: "Tibber",          markup: 0.9 },
  { id: "vattenfall",  name: "Vattenfall",      markup: 2.1 },
  { id: "energiezero", name: "Energie Zero",    markup: 1.5 },
  { id: "engie",       name: "Engie",           markup: 1.8 },
];

function EpexPriceSection() {
  const snap = useDemo();
  const [supplier, setSupplier] = React.useState("frank");
  const [resolution, setResolution] = React.useState(60);
  const [hoverSlot, setHoverSlot] = React.useState(null);
  const sup = EPEX_SUPPLIERS.find(s => s.id === supplier);

  // Gebruik live curve van Demo (Frank/EasyEnergy/fallback)
  const liveCurve = (snap.priceCurve && snap.priceCurve.length === 24) ? snap.priceCurve : BASE_CURVE;

  const data15 = React.useMemo(() => liveCurve.flatMap((v, h) => {
    const next = liveCurve[(h + 1) % 24];
    return [0,1,2,3].map(q => {
      const interp = v + (next - v) * (q / 4);
      const noise = Math.sin(h * 13.7 + q * 4.3) * 0.85 + Math.cos(h * 7.1 + q * 2.1) * 0.45;
      return interp + noise;
    });
  }), [liveCurve]);

  const rawData = resolution === 60 ? liveCurve : data15;
  const displayData = rawData.map(v => v + sup.markup);
  const slotCount = displayData.length;
  const minVal = Math.min(...displayData);
  const maxVal = Math.max(...displayData, 1) * 1.12;
  const hasNegative = minVal < 0;
  const range = maxVal - Math.min(minVal, 0);

  const nowH = snap.mins / 60;
  const currentSlot = resolution === 60 ? Math.floor(nowH) : Math.floor(nowH * 4);

  const W = 720, H = 170, padX = 8, padT = 14, padB = 30;
  const innerW = W - padX * 2, innerH = H - padT - padB;
  const barW = innerW / slotCount;

  const zeroY = hasNegative
    ? padT + innerH * (maxVal / range)
    : padT + innerH;

  const tone = v => v < 0 ? "var(--c-charge)" : v < 12 ? "var(--price-low)" : v < 25 ? "var(--price-mid)" : "var(--price-high)";
  const yOf  = v => hasNegative
    ? padT + ((maxVal - v) / range) * innerH
    : padT + innerH - Math.max(0, (v / maxVal) * innerH);
  const hOf  = v => hasNegative
    ? Math.max(2, Math.abs(v / range * innerH))
    : Math.max(3, (Math.max(0, v) / maxVal) * innerH);

  const labelFor = i => resolution === 60
    ? String(i).padStart(2,"0") + ":00"
    : String(Math.floor(i/4)).padStart(2,"0") + ":" + String((i%4)*15).padStart(2,"0");
  const xLabels = resolution === 60 ? [0,4,8,12,16,20] : [0,16,32,48,64,80];

  const sourceLabel = { frank: "Frank Energie — live", easyenergy: "EasyEnergy — live", simulated: "Gesimuleerde data" }[snap.priceSource || "simulated"];
  const sourceDot   = snap.priceSource && snap.priceSource !== "simulated" ? "var(--accent)" : "var(--price-mid)";

  return (
    <RevealOnScroll>
      <section style={{ maxWidth: "var(--maxw)", margin: "0 auto", width: "100%", padding: "0 var(--sp-6) var(--sp-12)" }}>
        <div className="card" style={{ padding: "var(--sp-8)", position: "relative", overflow: "hidden" }}>

          {/* header */}
          <div className="between" style={{ marginBottom: "var(--sp-5)", flexWrap: "wrap", gap: "var(--sp-4)" }}>
            <div>
              <div className="eyebrow" style={{ gap: "var(--sp-3)" }}>
                {I.trend({ size: 14 })} Live EPEX Spotprijzen
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600,
                  padding: "2px 9px", borderRadius: 99, marginLeft: 8, letterSpacing: "0.06em",
                  background: `color-mix(in oklab, ${sourceDot} 14%, transparent)`,
                  border: `1px solid color-mix(in oklab, ${sourceDot} 40%, transparent)`,
                  color: sourceDot,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: sourceDot,
                    boxShadow: snap.priceSource !== "simulated" ? `0 0 5px ${sourceDot}` : "none" }} />
                  {sourceLabel}
                </span>
              </div>
              <h2 style={{ fontSize: "clamp(20px, 2.4vw, 28px)", marginTop: "var(--sp-2)" }}>Stroomprijs vandaag</h2>
            </div>
            <div style={{ display: "flex", gap: 3, background: "var(--surface-2)", borderRadius: 12, padding: 4, border: "1px solid var(--border)" }}>
              {[60, 15].map(r => (
                <button key={r} onClick={() => setResolution(r)} style={{
                  border: 0, borderRadius: 9, padding: "7px 18px", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
                  background: resolution === r ? "var(--surface-3)" : "transparent",
                  color: resolution === r ? "var(--text)" : "var(--text-faint)",
                  transition: "all 0.2s ease",
                  boxShadow: resolution === r ? "0 2px 8px rgba(0,0,0,0.18)" : "none",
                }}>{r} min</button>
              ))}
            </div>
          </div>

          {/* leverancier selector */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "var(--sp-6)" }}>
            {EPEX_SUPPLIERS.map(s => (
              <button key={s.id} onClick={() => setSupplier(s.id)} style={{
                display: "flex", alignItems: "center", gap: 7,
                border: `1px solid ${supplier === s.id ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 10, padding: "7px 14px", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
                background: supplier === s.id ? "color-mix(in oklab, var(--accent) 14%, transparent)" : "var(--surface-2)",
                color: supplier === s.id ? "var(--accent)" : "var(--text-dim)",
                transition: "all 0.2s ease",
              }}>
                {supplier === s.id && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 6px var(--accent)", flex: "none" }} />}
                {s.name}
                {s.markup > 0 && <span style={{ fontSize: 11, opacity: 0.75 }}>+{s.markup.toFixed(1)} ct</span>}
              </button>
            ))}
          </div>

          {/* grafiek */}
          <div style={{ position: "relative" }} onMouseLeave={() => setHoverSlot(null)}>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible", cursor: "crosshair" }}
              onMouseMove={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const idx = Math.floor(((e.clientX - rect.left) / rect.width * W - padX) / barW);
                setHoverSlot(idx >= 0 && idx < slotCount ? idx : null);
              }}>
              <defs><filter id="epx-gl"><feGaussianBlur stdDeviation="3"/></filter></defs>

              {/* nul-lijn bij negatieve prijzen */}
              {hasNegative && <line x1={padX} x2={W-padX} y1={zeroY} y2={zeroY}
                stroke="var(--border-strong)" strokeWidth="1.5" strokeDasharray="4 4"/>}

              {[0.25,0.5,0.75].map(f => (
                <line key={f} x1={padX} x2={W-padX}
                  y1={padT+(1-f)*innerH} y2={padT+(1-f)*innerH}
                  stroke="var(--border)" strokeWidth="1" strokeDasharray="3 4"/>
              ))}

              {displayData.map((v, idx) => {
                const bh = hOf(v), by = yOf(v);
                const bx = padX + idx * barW;
                const isCur = idx === currentSlot, isHov = idx === hoverSlot;
                const c = tone(v);
                return (
                  <g key={idx}>
                    {(isCur||isHov) && <rect x={bx} y={padT} width={barW} height={innerH} fill="color-mix(in oklab, var(--text) 4%, transparent)"/>}
                    <rect x={bx+0.5} y={by} width={Math.max(1,barW-1)} height={Math.max(2,bh)}
                      rx={barW>8?3:1} fill={c} opacity={isCur?1:isHov?0.88:0.62}/>
                    {isCur && <rect x={bx+0.5} y={v>=0?by-3:by+bh} width={Math.max(1,barW-1)} height={3} rx={2} fill={c} filter="url(#epx-gl)"/>}
                  </g>
                );
              })}

              {(() => {
                const cx = padX + (nowH / 24) * innerW;
                return (
                  <React.Fragment>
                    <line x1={cx} y1={padT-4} x2={cx} y2={padT+innerH} stroke="var(--text)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.35"/>
                    <circle cx={cx} cy={padT-3} r={5} fill="var(--accent)" filter="url(#epx-gl)"/>
                    <circle cx={cx} cy={padT-3} r={3} fill="var(--accent)"/>
                    <text x={Math.min(W-padX-22, Math.max(padX+22, cx))} y={padT+innerH+18}
                      textAnchor="middle" fontSize="10.5" fill="var(--accent)" fontWeight="800">{snap.clock}</text>
                  </React.Fragment>
                );
              })()}

              {xLabels.map(lx => (
                <text key={lx} x={padX+lx*barW+barW/2} y={H-6}
                  textAnchor="middle" fontSize="10.5" fill="var(--text-faint)">{labelFor(lx)}</text>
              ))}
            </svg>

            {hoverSlot != null && (() => {
              const v = displayData[hoverSlot];
              const c = tone(v);
              const epexH = Math.floor(hoverSlot / (resolution === 60 ? 1 : 4));
              const leftPct = Math.min(80, Math.max(4, ((hoverSlot+0.5)/slotCount)*100));
              return (
                <div style={{
                  position: "absolute", left: `${leftPct}%`, top: 0, zIndex: 5,
                  transform: leftPct > 60 ? "translateX(-110%)" : "translateX(8px)",
                  pointerEvents: "none",
                  background: "color-mix(in oklab, var(--surface) 96%, transparent)",
                  backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
                  border: `1px solid ${c}`, borderRadius: 12, padding: "10px 14px",
                  boxShadow: "0 16px 40px -10px rgba(0,0,0,0.5)", whiteSpace: "nowrap", minWidth: 170,
                }}>
                  <div className="faint" style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 4 }}>
                    {labelFor(hoverSlot)}{resolution === 60 ? `–${String(epexH+1).padStart(2,"0")}:00` : ""}
                  </div>
                  <div className="display tabnum" style={{ fontSize: 26, color: c, lineHeight: 1.1 }}>
                    {v.toFixed(1).replace(".",",")} ct
                  </div>
                  {sup.markup > 0 && (
                    <div className="faint" style={{ fontSize: 12, marginTop: 3 }}>
                      EPEX: {liveCurve[epexH].toFixed(1).replace(".",",")} ct + {sup.markup.toFixed(1)} ct opslag
                    </div>
                  )}
                  <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 5, color: c }}>
                    {v < 0 ? "🎉 Negatief — bijna gratis!" : v < 12 ? "⚡ Laden — voordelig" : v > 25 ? "💰 Ontladen — duur" : "⏸ Neutraal"}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* stats + disclaimer */}
          <div className="between" style={{ marginTop: "var(--sp-5)", paddingTop: "var(--sp-4)", borderTop: "1px solid var(--border)", flexWrap: "wrap", gap: "var(--sp-5)" }}>
            <div className="row" style={{ gap: "var(--sp-6)", flexWrap: "wrap" }}>
              {[
                ["Nu · " + snap.clock, (displayData[currentSlot]||0).toFixed(1).replace(".",",") + " ct", tone(displayData[currentSlot]||0), 30],
                ["Laagste", Math.min(...displayData).toFixed(1).replace(".",",") + " ct", "var(--price-low)", 22],
                ["Hoogste", Math.max(...displayData).toFixed(1).replace(".",",") + " ct", "var(--price-high)", 22],
                ["Gemiddelde", (displayData.reduce((a,b)=>a+b,0)/displayData.length).toFixed(1).replace(".",",") + " ct", "var(--text-dim)", 22],
              ].map(([lbl, val, col, sz]) => (
                <div key={lbl}>
                  <div className="faint" style={{ fontSize: 12 }}>{lbl}</div>
                  <div className="display tabnum" style={{ fontSize: sz, color: col, lineHeight: 1 }}>{val}</div>
                </div>
              ))}
            </div>
            <div className="row" style={{ gap: 8, fontSize: 13, color: "var(--text-faint)", maxWidth: 360, alignItems: "flex-start" }}>
              {I.warning({ size: 15, style: { flex: "none", marginTop: 1, color: "var(--price-mid)" } })}
              <span style={{ textWrap: "pretty", lineHeight: 1.45 }}>
                Prijzen zijn <strong>EPEX spotprijzen incl. 21% BTW</strong>, excl. energiebelasting, netwerkkosten en leveranciersopslag. Werkelijke prijs verschilt per leverancier.
              </span>
            </div>
          </div>
        </div>
      </section>
    </RevealOnScroll>
  );
}

function Logo({ size = 30 }) {
  const iconSize = Math.round(size * 0.62);
  return (
    <div className="row" style={{ gap: 10 }}>
      <div style={{
        width: size, height: size, borderRadius: Math.round(size * 0.3),
        background: "linear-gradient(150deg, color-mix(in oklab, var(--accent) 85%, white 15%), var(--accent-2))",
        display: "grid", placeItems: "center", color: "#04130c",
        boxShadow: "0 6px 18px -6px color-mix(in oklab, var(--accent) 75%, transparent), inset 0 1px 0 rgba(255,255,255,0.25)",
        flexShrink: 0,
      }}>
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.5 2A2.5 2.5 0 0 0 7 4.5V5A4 4 0 0 0 3 9a4 4 0 0 0 1.6 3.2A3 3 0 0 0 4 14a3 3 0 0 0 3 3v2h10v-2a3 3 0 0 0 3-3 3 3 0 0 0-.6-1.8A4 4 0 0 0 21 9a4 4 0 0 0-4-4v-.5A2.5 2.5 0 0 0 14.5 2a2.5 2.5 0 0 0-2 1A2.5 2.5 0 0 0 9.5 2Z" />
          <path d="M12 5v14M8 9.5c0-.8.7-1.5 1.5-1.5M14.5 8c.8 0 1.5.7 1.5 1.5M9 13.5h6" />
        </svg>
      </div>
      <span className="display" style={{ fontSize: size * 0.66, fontWeight: 700, letterSpacing: "-0.04em" }}>
        Batt<span style={{ color: "var(--accent)" }}>Brain</span>
      </span>
    </div>
  );
}

function FeatureCard({ icon, tone, title, body, delay = 0 }) {
  return (
    <RevealOnScroll delay={delay}>
      <div className="card card-hover" style={{ padding: "var(--sp-8)", height: "100%" }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, display: "grid", placeItems: "center",
          background: `color-mix(in oklab, ${tone} 16%, transparent)`, color: tone, marginBottom: "var(--sp-5)",
          boxShadow: `0 8px 24px -8px color-mix(in oklab, ${tone} 35%, transparent)`,
        }}>{icon}</div>
        <h3 style={{ fontSize: "clamp(20px, 2.2vw, 25px)", marginBottom: "var(--sp-3)" }}>{title}</h3>
        <p className="muted" style={{ fontSize: "var(--sp-4, 16px)", lineHeight: 1.55, textWrap: "pretty" }}>{body}</p>
      </div>
    </RevealOnScroll>
  );
}

function SocialStat({ value, label, color, delay }) {
  return (
    <RevealOnScroll delay={delay}>
      <div className="card card-hover" style={{ padding: "var(--sp-6)", textAlign: "center" }}>
        <div className="display tabnum" style={{ fontSize: "clamp(34px, 4.5vw, 48px)", color, lineHeight: 1.1 }}>{value}</div>
        <div className="muted" style={{ fontSize: 15, marginTop: 6 }}>{label}</div>
      </div>
    </RevealOnScroll>
  );
}

function Landing({ go }) {
  const snap = useDemo();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      {/* floating orbs */}
      <GlassOrb color="var(--accent)" size={700} x="78%" y="15%" delay={0} idx={1} />
      <GlassOrb color="var(--c-charge)" size={450} x="12%" y="75%" delay={4} idx={2} />
      <GlassOrb color="var(--c-pv)" size={350} x="60%" y="85%" delay={7} idx={1} />

      {/* particles */}
      <ParticleField count={30} />

      {/* header */}
      <header style={{ maxWidth: "var(--maxw)", margin: "0 auto", width: "100%", padding: "var(--sp-6)", position: "relative", zIndex: 2 }} className="between">
        <HeroReveal delay={0.1}><Logo /></HeroReveal>
        <HeroReveal delay={0.1}>
          <div className="row" style={{ gap: "var(--sp-3)" }}>
            <button className="btn btn-ghost" onClick={() => go("login")}>Inloggen</button>
            <button className="btn btn-primary" onClick={() => go("register")}>Start gratis</button>
          </div>
        </HeroReveal>
      </header>

      {/* hero */}
      <section style={{ maxWidth: "var(--maxw)", margin: "0 auto", width: "100%", padding: "var(--sp-10) var(--sp-6) var(--sp-12)", position: "relative", zIndex: 2 }}>
        <div className="hero-grid">
          {/* left — text */}
          <div style={{ maxWidth: 600 }}>
            <HeroReveal delay={0.15}>
              <span className="eyebrow">{I.brain({ size: 15 })} AI-gestuurde thuisbatterij optimizer</span>
            </HeroReveal>
            <HeroReveal delay={0.25}>
              <h1 style={{ fontSize: "clamp(40px, 6vw, 76px)", margin: "var(--sp-5) 0 var(--sp-5)", letterSpacing: "-0.035em" }}>
                Jouw batterij.<br /><GlowText>Één brein.</GlowText> Altijd slim.
              </h1>
            </HeroReveal>
            <HeroReveal delay={0.4}>
              <p className="muted" style={{ fontSize: "clamp(17px, 1.5vw, 21px)", lineHeight: 1.5, maxWidth: 520, textWrap: "pretty" }}>
                BattBrain leert de markt, leest dynamische uurprijzen en stuurt je omvormer automatisch aan. Laden als stroom goedkoop is, ontladen als die duur is — jij verdient er aan terwijl je slaapt.
              </p>
            </HeroReveal>
            <HeroReveal delay={0.55}>
              <div className="row" style={{ gap: "var(--sp-3)", marginTop: "var(--sp-8)", flexWrap: "wrap" }}>
                <button className="btn btn-primary btn-lg" onClick={() => go("register")}>
                  Probeer BattBrain gratis {I.arrowRight({ size: 18 })}
                </button>
                <button className="btn btn-ghost btn-lg" onClick={() => go("dashboard")}>Bekijk demo</button>
              </div>
            </HeroReveal>
            <HeroReveal delay={0.7}>
              <div className="row" style={{ gap: "var(--sp-6)", marginTop: "var(--sp-8)", flexWrap: "wrap" }}>
                {[["Solis · GoodWe · Growatt", I.plug({ size: 15 })], ["Frank · Tibber · Energie Zero", I.cloud({ size: 15 })]].map(([t, ic], i) => (
                  <div key={i} className="row faint" style={{ gap: 8, fontSize: 13.5 }}>{ic}<span>{t}</span></div>
                ))}
              </div>
            </HeroReveal>
          </div>

          {/* right — live preview with liquid battery + 3D tilt */}
          <TiltCard className="card live-preview-wow" intensity={8} style={{
            padding: "var(--sp-6)", display: "flex", flexDirection: "column", alignItems: "center",
            gap: "var(--sp-4)", position: "relative", overflow: "hidden",
            background: "var(--surface)",
            backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-sat))",
            WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-sat))",
            border: "1px solid var(--border)", borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow), var(--card-inset)",
          }}>
            {/* status bar */}
            <div className="between" style={{ width: "100%", position: "relative" }}>
              <div className="pill" style={{ background: "color-mix(in oklab, var(--accent) 14%, transparent)", borderColor: "color-mix(in oklab, var(--accent) 40%, transparent)", color: "var(--accent)" }}>
                <span className="dot pulse" style={{ background: "var(--accent)" }} />Actief
              </div>
              <span className="faint" style={{ fontSize: 13 }}>Vandaag · {snap.clock}</span>
            </div>

            {/* liquid battery with pulse rings */}
            <div style={{ position: "relative" }}>
              <LiquidBattery soc={snap.soc} action={snap.action} size={140} />
              <PulseRing color={actionColor(snap.action)} size={100} count={3} />
            </div>

            {/* live stats */}
            <div className="between" style={{ width: "100%", paddingTop: "var(--sp-3)", borderTop: "1px solid var(--border)" }}>
              <div>
                <div className="card-label">Huidige prijs</div>
                <div className="display tabnum" style={{ fontSize: 30, color: priceColor(snap.priceCt) }}>
                  <AnimNum value={snap.priceCt} decimals={1} suffix=" ct" />
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="card-label">Besparing</div>
                <div className="display tabnum" style={{ fontSize: 24, color: "var(--accent)" }}>
                  <AnimNum value={snap.savings} decimals={2} prefix="€" />
                </div>
              </div>
            </div>

            {/* energy flow */}
            <EnergyFlow action={snap.action} style={{ width: "100%", marginTop: "var(--sp-2)" }} />
          </TiltCard>
        </div>
      </section>

      {/* features */}
      <section style={{ maxWidth: "var(--maxw)", margin: "0 auto", width: "100%", padding: "0 var(--sp-6) var(--sp-12)" }}>
        <StaggerIn className="feature-grid" stagger={0.1}>
          <FeatureCard tone="var(--c-charge)" icon={I.spark({ size: 26 })}
            title="Automatisch laden & ontladen"
            body="BattBrain stuurt je omvormer realtime aan op basis van de dynamische uurprijzen. Geen knoppen, geen gokwerk." />
          <FeatureCard tone="var(--accent)" icon={I.trend({ size: 26 })}
            title="Dagelijks handelsplan"
            body="Elke ochtend bepaalt het algoritme de goedkoopste en duurste uren en plant precies wanneer er geladen en verkocht wordt." />
          <FeatureCard tone="var(--c-pv)" icon={I.sun({ size: 26 })}
            title="Energiesamenvatting"
            body="Zie in één oogopslag hoeveel je hebt geladen, teruggeleverd en bespaard — met je zonne-opbrengst meegerekend." />
        </StaggerIn>
      </section>

      {/* EPEX prijsgrafiek */}
      <EpexPriceSection />

      {/* social proof */}
      <section style={{ maxWidth: "var(--maxw)", margin: "0 auto", width: "100%", padding: "0 var(--sp-6) var(--sp-12)" }}>
        <StaggerIn className="feature-grid" stagger={0.1}>
          <div className="card card-hover summary-stat-wow" style={{ padding: "var(--sp-6)", textAlign: "center" }}>
            <div className="display tabnum" style={{ fontSize: "clamp(34px, 4.5vw, 48px)", lineHeight: 1.1 }}>
              <CountUp value={500} suffix="+" color="var(--accent)" />
            </div>
            <div className="muted" style={{ fontSize: 15, marginTop: 6 }}>Actieve gebruikers</div>
          </div>
          <div className="card card-hover summary-stat-wow" style={{ padding: "var(--sp-6)", textAlign: "center" }}>
            <div className="display tabnum" style={{ fontSize: "clamp(34px, 4.5vw, 48px)", lineHeight: 1.1 }}>
              <LiveSavingsCounter />
            </div>
            <div className="muted" style={{ fontSize: 15, marginTop: 6 }}>Totaal bespaard deze maand</div>
            <div className="faint" style={{ fontSize: 12, marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--c-pv)", boxShadow: "0 0 6px var(--c-pv)", display: "inline-block" }} />
              Live · loopt op
            </div>
          </div>
          <div className="card card-hover summary-stat-wow" style={{ padding: "var(--sp-6)", textAlign: "center" }}>
            <div className="display tabnum" style={{ fontSize: "clamp(34px, 4.5vw, 48px)", lineHeight: 1.1 }}>
              <CountUp value={4.8} decimals={1} suffix=" ★" color="var(--text)" />
            </div>
            <div className="muted" style={{ fontSize: 15, marginTop: 6 }}>Gebruikersbeoordeling</div>
          </div>
        </StaggerIn>
      </section>

      {/* CTA band */}
      <section style={{ maxWidth: "var(--maxw)", margin: "0 auto var(--sp-16)", width: "100%", padding: "0 var(--sp-6)" }}>
        <RevealOnScroll>
          <MouseGlow color="var(--accent)" size={400} opacity={0.12}>
            <div className="card" style={{
              padding: "var(--sp-12)", textAlign: "center", position: "relative", overflow: "hidden",
              background: "linear-gradient(150deg, var(--surface-3), var(--surface))",
            }}>
              {/* inner glow orb */}
              <div style={{ position: "absolute", top: "-30%", right: "-10%", width: 400, height: 300, borderRadius: "50%", background: "radial-gradient(circle, color-mix(in oklab, var(--accent) 20%, transparent), transparent 70%)", filter: "blur(40px)", pointerEvents: "none" }} />
              <div style={{ position: "relative" }}>
                <h2 style={{ fontSize: "clamp(28px, 4vw, 46px)", marginBottom: "var(--sp-4)" }}>Zet je batterij aan het werk</h2>
                <p className="muted" style={{ fontSize: 18, maxWidth: 540, margin: "0 auto var(--sp-8)", textWrap: "pretty" }}>
                  Gemiddeld €25–€60 per maand extra rendement. 14 dagen gratis uitproberen, daarna €6,95 per maand. Maandelijks opzegbaar.
                </p>
                <button className="btn btn-primary btn-lg" onClick={() => go("register")}>Probeer BattBrain gratis {I.arrowRight({ size: 18 })}</button>
              </div>
            </div>
          </MouseGlow>
        </RevealOnScroll>
      </section>

      {/* footer */}
      <footer style={{ borderTop: "1px solid var(--border)", marginTop: "auto" }}>
        <div className="between" style={{ maxWidth: "var(--maxw)", margin: "0 auto", width: "100%", padding: "var(--sp-6)", flexWrap: "wrap", gap: "var(--sp-4)" }}>
          <Logo size={24} />
          <div className="row faint" style={{ gap: "var(--sp-6)", fontSize: 13.5, flexWrap: "wrap" }}>
            <span>Privacy</span><span>Voorwaarden</span><span>Support</span><span>© 2026 BattBrain B.V.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

Object.assign(window, { Landing, Logo, APP_NAME, LiveSavingsCounter, EpexPriceSection });

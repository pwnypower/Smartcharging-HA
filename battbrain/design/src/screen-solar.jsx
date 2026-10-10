/* screen-solar.jsx — Zonne-energie / Solar monitoring */

const SOLAR_SYSTEM = { capacity: 8.4, panels: 21, brand: "SolarEdge", azimuth: "Oost-West", tilt: 38, installed: "nov 2023" };

function makeSolarHours() {
  const rise = 6.5, set = 21.0, peak = (rise + set) / 2;
  return Array.from({ length: 24 }, (_, h) => {
    const t = (h - peak) / ((set - rise) / 2.4);
    const bell = h >= rise && h <= set ? Math.max(0, 1 - t * t) : 0;
    const cloud = 0.88 + Math.sin(h * 1.7) * 0.07;
    const prod = bell * SOLAR_SYSTEM.capacity * cloud;
    const toBatt = Math.min(prod * 0.54, 3.4);
    const toHome = Math.min(prod * 0.14, 0.85);
    const toGrid = Math.max(0, prod - toBatt - toHome);
    const r = v => Math.round(v * 100) / 100;
    return { h, prod: r(prod), toBatt: r(toBatt), toHome: r(toHome), toGrid: r(toGrid) };
  });
}

const SOLAR_HOURS = makeSolarHours();

const MONTHLY_PV = [
  { m: "jan", kwh: 148, target: 160 }, { m: "feb", kwh: 214, target: 220 },
  { m: "mrt", kwh: 388, target: 370 }, { m: "apr", kwh: 514, target: 490 },
  { m: "mei", kwh: 621, target: 600 }, { m: "jun", kwh: 674, target: 640 },
  { m: "jul", kwh: 643, target: 620 }, { m: "aug", kwh: 587, target: 600 },
  { m: "sep", kwh: 441, target: 450 }, { m: "okt", kwh: 278, target: 290 },
  { m: "nov", kwh: 0, target: 158 },   { m: "dec", kwh: 0, target: 112 },
];

const FORECAST = [
  { day: "Vandaag", icon: "☀️", pct: 95, kwh: 48.2, temp: 19 },
  { day: "Morgen",  icon: "⛅", pct: 55, kwh: 28.5, temp: 17 },
  { day: "Za",      icon: "🌤", pct: 72, kwh: 36.1, temp: 21 },
  { day: "Zo",      icon: "☀️", pct: 92, kwh: 51.4, temp: 23 },
];

/* ---- 24h production chart ---- */
function SolarHourChart({ hours, nowHour }) {
  const W = 720, H = 190, padX = 8, padT = 16, padB = 36;
  const maxP = Math.max(...hours.map(h => h.prod)) * 1.1 || 1;
  const gap = (W - padX * 2) / 24;
  const barW = gap * 0.7;
  const uid = React.useMemo(() => "sh" + Math.random().toString(36).substr(2, 4), []);
  const [hover, setHover] = React.useState(null);

  return (
    <div style={{ position: "relative" }}
      onMouseLeave={() => setHover(null)}
      onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        setHover(Math.max(0, Math.min(23, Math.floor((e.clientX - rect.left) / rect.width * 24))));
      }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        <defs>
          <linearGradient id={`${uid}pvg`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--c-pv)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--c-pv)" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id={`${uid}bg`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--c-charge)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--c-charge)" stopOpacity="0.2" />
          </linearGradient>
          <filter id={`${uid}gl`}><feGaussianBlur stdDeviation="3" /></filter>
        </defs>
        {[0.25, 0.5, 0.75, 1].map(f => (
          <line key={f} x1={padX} x2={W - padX}
            y1={padT + (1 - f) * (H - padT - padB)}
            y2={padT + (1 - f) * (H - padT - padB)}
            stroke="var(--border)" strokeWidth={f === 1 ? 0.5 : 1} />
        ))}
        {hours.map(({ h, prod, toBatt }) => {
          const cx = padX + gap * h + gap / 2;
          const bx = cx - barW / 2;
          const innerH = H - padT - padB;
          const prodH = (prod / maxP) * innerH;
          const battH = (toBatt / maxP) * innerH;
          const isPast = h < nowHour, isCur = h === nowHour;
          return (
            <g key={h} opacity={isPast ? 0.45 : 1}>
              {isCur && <rect x={bx - 3} y={padT} width={barW + 6} height={innerH} rx={5} fill="var(--c-pv)" opacity="0.07" />}
              {prod > 0 && (
                <React.Fragment>
                  <rect x={bx} y={padT + innerH - prodH} width={barW} height={prodH} rx={3}
                    fill={hover === h ? "var(--c-pv)" : `url(#${uid}pvg)`}
                    style={{ filter: isCur ? `drop-shadow(0 0 6px var(--c-pv))` : "none" }} />
                  {toBatt > 0 && (
                    <rect x={bx + 2} y={padT + innerH - battH} width={barW - 4} height={battH} rx={2}
                      fill={`url(#${uid}bg)`} opacity={0.7} />
                  )}
                </React.Fragment>
              )}
            </g>
          );
        })}
        {[0, 4, 8, 12, 16, 20].map(h => (
          <text key={h} x={padX + gap * h + gap / 2} y={H - 10}
            textAnchor="middle" fontSize="11" fill="var(--text-faint)">
            {String(h).padStart(2, "0")}u
          </text>
        ))}
        {/* sunrise/sunset markers */}
        {[{ h: 6.5, label: "↑ zon" }, { h: 21, label: "zon ↓" }].map(({ h, label }) => {
          const x = padX + gap * h;
          return (
            <g key={label} opacity="0.45">
              <line x1={x} y1={padT} x2={x} y2={H - padB} stroke="var(--c-pv)" strokeWidth="1" strokeDasharray="2 3" />
              <text x={x + 4} y={padT + 12} fontSize="10" fill="var(--c-pv)">{label}</text>
            </g>
          );
        })}
      </svg>
      {hover !== null && hours[hover]?.prod > 0.05 && (
        <div style={{
          position: "absolute", top: 4,
          left: `${(hover / 24) * 100}%`,
          transform: `translateX(${hover > 15 ? "-110%" : "10px"})`,
          pointerEvents: "none", zIndex: 5,
          background: "color-mix(in oklab, var(--surface) 94%, transparent)",
          backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
          border: "1px solid color-mix(in oklab, var(--c-pv) 55%, transparent)",
          borderRadius: 12, padding: "9px 14px", whiteSpace: "nowrap",
          boxShadow: "0 12px 32px -8px rgba(0,0,0,.45)",
        }}>
          <div className="faint" style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>
            {String(hover).padStart(2, "0")}:00–{String(hover + 1).padStart(2, "0")}:00
          </div>
          <div className="display tabnum" style={{ fontSize: 22, color: "var(--c-pv)", lineHeight: 1.1 }}>
            {hours[hover].prod.toFixed(2).replace(".", ",")} <span style={{ fontSize: 13, color: "var(--text-faint)" }}>kW</span>
          </div>
          <div className="faint" style={{ fontSize: 12, marginTop: 4 }}>
            {I.battery({ size: 12 })} batterij: {hours[hover].toBatt.toFixed(2).replace(".", ",")} kW
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Monthly bar chart ---- */
function MonthlyPVChart({ data }) {
  const W = 720, H = 200, padX = 12, padT = 16, padB = 36;
  const max = Math.max(...data.map(d => Math.max(d.kwh, d.target))) * 1.1 || 1;
  const gap = (W - padX * 2) / data.length;
  const barW = gap * 0.38;
  const uid = React.useMemo(() => "mp" + Math.random().toString(36).substr(2, 4), []);
  const curMonth = new Date().getMonth();
  const innerH = H - padT - padB;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      <defs>
        <linearGradient id={`${uid}pvg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--c-pv)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--c-pv)" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map(f => (
        <line key={f} x1={padX} x2={W - padX}
          y1={padT + (1 - f) * innerH} y2={padT + (1 - f) * innerH}
          stroke="var(--border)" strokeWidth="1" />
      ))}
      {data.map((d, i) => {
        const cx = padX + gap * i + gap / 2;
        const isCur = i === curMonth;
        const targetH = (d.target / max) * innerH;
        const actualH = d.kwh > 0 ? (d.kwh / max) * innerH : 0;
        return (
          <g key={i}>
            {isCur && <rect x={cx - barW - 5} y={padT} width={barW * 2 + 10} height={innerH} rx={5} fill="color-mix(in oklab, var(--c-pv) 7%, transparent)" />}
            <rect x={cx - barW - 1} y={padT + innerH - targetH} width={barW * 2 + 2} height={targetH}
              rx={4} fill="none"
              stroke="color-mix(in oklab, var(--c-pv) 28%, transparent)" strokeWidth="1.5" strokeDasharray="3 2" />
            {actualH > 0 && (
              <rect x={cx - barW} y={padT + innerH - actualH} width={barW * 2} height={actualH}
                rx={4} fill={isCur ? "var(--c-pv)" : `url(#${uid}pvg)`} opacity={isCur ? 1 : 0.82} />
            )}
            <text x={cx} y={H - 10} textAnchor="middle"
              fontSize="11" fill={isCur ? "var(--c-pv)" : "var(--text-faint)"}
              fontWeight={isCur ? "700" : "400"}>{d.m}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---- Main Solar component ---- */
function Solar({ go }) {
  const snap = useDemo();
  const nowH = Math.floor(snap.mins / 60);

  const todayProd  = SOLAR_HOURS.slice(0, nowH + 1).reduce((s, h) => s + h.prod, 0);
  const todayBatt  = SOLAR_HOURS.slice(0, nowH + 1).reduce((s, h) => s + h.toBatt, 0);
  const todayGrid  = SOLAR_HOURS.slice(0, nowH + 1).reduce((s, h) => s + h.toGrid, 0);
  const todayHome  = SOLAR_HOURS.slice(0, nowH + 1).reduce((s, h) => s + h.toHome, 0);
  const selfCons   = todayProd > 0 ? Math.round(((todayBatt + todayHome) / todayProd) * 100) : 0;
  const currentProd = SOLAR_HOURS[nowH]?.prod || 0;
  const maxProd     = Math.max(...SOLAR_HOURS.map(h => h.prod));
  const prodPct     = maxProd > 0 ? (currentProd / maxProd) * 100 : 0;
  const ytdKwh      = MONTHLY_PV.reduce((s, m) => s + m.kwh, 0);
  const isProducing = currentProd > 0.3;

  return (
    <PageWrap>
      <div className="dash">
        {/* header */}
        <div className="between dash-statusbar" style={{ flexWrap: "wrap", gap: "var(--sp-4)" }}>
          <div>
            <h1 style={{ fontSize: "clamp(24px, 3vw, 34px)" }}>Zonne-energie</h1>
            <p className="muted" style={{ fontSize: 15.5, marginTop: 6 }}>
              {SOLAR_SYSTEM.panels} panelen · {SOLAR_SYSTEM.capacity} kWp · {SOLAR_SYSTEM.brand}
            </p>
          </div>
          <div className="pill" style={{
            background: isProducing ? "color-mix(in oklab, var(--c-pv) 14%, transparent)" : "var(--surface-2)",
            borderColor: isProducing ? "color-mix(in oklab, var(--c-pv) 45%, transparent)" : "var(--border)",
            color: isProducing ? "var(--c-pv)" : "var(--text-faint)",
          }}>
            <span className={"dot" + (isProducing ? " pulse" : "")} style={{ background: isProducing ? "var(--c-pv)" : "var(--text-faint)" }} />
            {isProducing ? "Actief producerend" : "Geen productie"}
          </div>
        </div>

        {/* top KPIs */}
        <StaggerIn className="grid-3" stagger={0.07}>
          <div className="card card-hover" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
            <div className="card-label">Huidig vermogen</div>
            <div className="display tabnum" style={{ fontSize: "clamp(40px, 5vw, 56px)", color: "var(--c-pv)", lineHeight: 1 }}>
              <AnimNum value={currentProd} decimals={2} />
              <span style={{ fontSize: 17, color: "var(--text-faint)", marginLeft: 4 }}>kW</span>
            </div>
            <div>
              <div className="between faint" style={{ fontSize: 12, marginBottom: 4 }}>
                <span>0 kW</span><span>{SOLAR_SYSTEM.capacity} kWp</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "var(--surface-3)" }}>
                <div style={{ height: "100%", width: `${prodPct}%`, borderRadius: 3, background: "var(--c-pv)", boxShadow: prodPct > 10 ? "0 0 8px var(--c-pv)" : "none", transition: "width 1s ease" }} />
              </div>
            </div>
            <div className="faint" style={{ fontSize: 13, marginTop: "auto" }}>{Math.round(prodPct)}% van piekwaarde</div>
          </div>

          <div className="card card-hover" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
            <div className="card-label">Vandaag opgewekt</div>
            <div className="display tabnum" style={{ fontSize: "clamp(40px, 5vw, 56px)", lineHeight: 1 }}>
              <AnimNum value={todayProd} decimals={1} />
              <span style={{ fontSize: 17, color: "var(--text-faint)", marginLeft: 4 }}>kWh</span>
            </div>
            <div className="faint" style={{ fontSize: 13, marginTop: "auto" }}>
              Prognose vandaag: <strong className="tabnum" style={{ color: "var(--c-pv)" }}>{FORECAST[0].kwh.toFixed(1).replace(".", ",")} kWh</strong>
            </div>
          </div>

          <div className="card card-hover" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
            <div className="card-label">Eigen verbruik</div>
            <div className="display tabnum" style={{ fontSize: "clamp(40px, 5vw, 56px)", color: "var(--accent)", lineHeight: 1 }}>
              {selfCons}<span style={{ fontSize: 17, color: "var(--text-faint)", marginLeft: 2 }}>%</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "var(--surface-3)", marginTop: 4 }}>
              <div style={{ height: "100%", width: `${selfCons}%`, borderRadius: 3, background: "var(--accent)", boxShadow: "0 0 6px var(--accent)", transition: "width 1s ease" }} />
            </div>
            <div className="faint" style={{ fontSize: 13, marginTop: "auto" }}>Niet teruggeleverd aan het net</div>
          </div>
        </StaggerIn>

        {/* energy split */}
        <div className="card">
          <div className="between" style={{ marginBottom: "var(--sp-5)", flexWrap: "wrap", gap: "var(--sp-3)" }}>
            <div>
              <div className="eyebrow">{I.solar({ size: 14 })} Verdeling vandaag</div>
              <h3 style={{ fontSize: 22, marginTop: 8 }}>Waar gaat je zonne-energie naartoe?</h3>
            </div>
          </div>
          <div className="grid-3" style={{ gap: "var(--sp-3)" }}>
            {[
              ["Naar batterij", todayBatt, "var(--c-charge)", I.battery({ size: 18 })],
              ["Eigen gebruik", todayHome, "var(--c-pv)", I.sun({ size: 18 })],
              ["Naar het net", todayGrid, "var(--c-export)", I.grid({ size: 18 })],
            ].map(([label, val, color, icon]) => (
              <div key={label} style={{ padding: "var(--sp-4)", borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="row" style={{ gap: 8, color }}>{icon}<span className="faint" style={{ fontSize: 12.5 }}>{label}</span></div>
                <div className="display tabnum" style={{ fontSize: "clamp(20px, 2.5vw, 28px)", color }}>
                  {val.toFixed(1).replace(".", ",")} <span style={{ fontSize: 13, color: "var(--text-faint)" }}>kWh</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: "var(--surface-3)" }}>
                  <div style={{ height: "100%", borderRadius: 2, width: todayProd > 0 ? `${(val / todayProd) * 100}%` : "0%", background: color, transition: "width 1s ease" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 24h chart */}
        <div className="card">
          <div className="between" style={{ marginBottom: "var(--sp-5)", flexWrap: "wrap", gap: "var(--sp-3)" }}>
            <div>
              <div className="eyebrow">{I.sun({ size: 14 })} Uurproductie</div>
              <h3 style={{ fontSize: 22, marginTop: 8 }}>Opwekking vandaag · kW</h3>
            </div>
            <div className="row" style={{ gap: "var(--sp-4)" }}>
              {[["Totaal opgewekt", "var(--c-pv)"], ["→ Batterij deel", "var(--c-charge)"]].map(([l, c]) => (
                <div key={l} className="row" style={{ gap: 6, fontSize: 13 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: c, boxShadow: `0 0 5px ${c}` }} />
                  <span className="faint">{l}</span>
                </div>
              ))}
            </div>
          </div>
          <SolarHourChart hours={SOLAR_HOURS} nowHour={nowH} />
        </div>

        {/* forecast + system */}
        <div className="grid-2">
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: "var(--sp-5)" }}>{I.cloud({ size: 14 })} Weersvoorspelling</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--sp-3)" }}>
              {FORECAST.map(f => (
                <div key={f.day} className="card card-hover" style={{
                  padding: "var(--sp-4)", textAlign: "center",
                  borderColor: f.day === "Vandaag" ? "color-mix(in oklab, var(--c-pv) 50%, transparent)" : "var(--border)",
                  background: f.day === "Vandaag" ? "color-mix(in oklab, var(--c-pv) 8%, var(--surface))" : "var(--surface-2)",
                }}>
                  <div style={{ fontSize: 26, marginBottom: "var(--sp-2)" }}>{f.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: f.day === "Vandaag" ? "var(--c-pv)" : "var(--text)" }}>{f.day}</div>
                  <div className="display tabnum" style={{ fontSize: 20, color: "var(--c-pv)", lineHeight: 1 }}>
                    {f.kwh.toFixed(1).replace(".", ",")}
                    <span style={{ fontSize: 12, color: "var(--text-faint)", marginLeft: 2 }}>kWh</span>
                  </div>
                  <div className="faint" style={{ fontSize: 11.5, marginTop: 4 }}>{f.pct}% zon · {f.temp}°C</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-hover">
            <div className="eyebrow" style={{ marginBottom: "var(--sp-4)" }}>{I.shield({ size: 14 })} Installatie</div>
            <div className="stack">
              {[
                ["Omvormer", SOLAR_SYSTEM.brand, I.plug({ size: 17 })],
                ["Panelen", `${SOLAR_SYSTEM.panels} stuks`, I.sun({ size: 17 })],
                ["Piekvermogen", `${SOLAR_SYSTEM.capacity} kWp`, I.spark({ size: 17 })],
                ["Oriëntatie", SOLAR_SYSTEM.azimuth, I.compass({ size: 17 })],
                ["Helling", `${SOLAR_SYSTEM.tilt}°`, I.trend({ size: 17 })],
                ["Geïnstalleerd", SOLAR_SYSTEM.installed, I.calendar({ size: 17 })],
              ].map(([k, v, ic], i) => (
                <div key={k} className="between" style={{ padding: "var(--sp-3) 0", borderTop: i ? "1px solid var(--border)" : "none" }}>
                  <span className="row muted" style={{ gap: 10, fontSize: 14.5 }}>{ic}{k}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* monthly */}
        <div className="card">
          <div className="between" style={{ marginBottom: "var(--sp-5)", flexWrap: "wrap", gap: "var(--sp-3)" }}>
            <div>
              <div className="eyebrow">{I.calendar({ size: 14 })} Jaaroverzicht 2026</div>
              <h3 style={{ fontSize: 22, marginTop: 8 }}>Maandelijkse opbrengst · kWh</h3>
            </div>
            <div className="row" style={{ gap: "var(--sp-5)" }}>
              <div style={{ textAlign: "right" }}>
                <div className="faint" style={{ fontSize: 12.5 }}>YTD opgewekt</div>
                <div className="display tabnum" style={{ fontSize: 22, color: "var(--c-pv)" }}>{ytdKwh.toLocaleString("nl-NL")} kWh</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="faint" style={{ fontSize: 12.5 }}>Waarde @ €0,085</div>
                <div className="display tabnum" style={{ fontSize: 22, color: "var(--accent)" }}>€{Math.round(ytdKwh * 0.085).toLocaleString("nl-NL")}</div>
              </div>
            </div>
          </div>
          <MonthlyPVChart data={MONTHLY_PV} />
          <div className="row" style={{ gap: "var(--sp-5)", marginTop: "var(--sp-4)", flexWrap: "wrap" }}>
            {[["Werkelijke opbrengst", "var(--c-pv)", false], ["Verwachte opbrengst", "var(--c-pv)", true]].map(([l, c, dashed]) => (
              <div key={l} className="row" style={{ gap: 8, fontSize: 13 }}>
                <svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke={c} strokeWidth="2" strokeDasharray={dashed ? "3 2" : undefined} opacity={dashed ? 0.5 : 1} /></svg>
                <span className="faint">{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* synergy card */}
        <div className="card" style={{ background: "radial-gradient(600px 350px at 15% 50%, color-mix(in oklab, var(--c-pv) 13%, transparent), transparent 60%), linear-gradient(150deg, var(--surface-3), var(--surface))", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "-25%", right: "-5%", width: 300, height: 240, borderRadius: "50%", background: "radial-gradient(circle, color-mix(in oklab, var(--accent) 12%, transparent), transparent 70%)", filter: "blur(40px)", pointerEvents: "none" }} />
          <div className="between" style={{ flexWrap: "wrap", gap: "var(--sp-6)", position: "relative" }}>
            <div style={{ maxWidth: 480 }}>
              <div className="eyebrow">{I.battery({ size: 14 })} Zon + Batterij synergie</div>
              <h3 style={{ fontSize: "clamp(20px, 2.6vw, 28px)", margin: "var(--sp-3) 0" }}>Zonnestroom eerst in de batterij</h3>
              <p className="muted" style={{ fontSize: 15, lineHeight: 1.55, textWrap: "pretty" }}>
                BattBrain geeft zonne-energie voorrang boven netinkoop. Op zonnige dagen laad je bijna gratis — en ontlaad je duur zodra de zon weg is. Dat maximaliseert je rendement automatisch.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)", minWidth: 230 }}>
              {[
                ["Gratis geladen", `${todayBatt.toFixed(1).replace(".", ",")} kWh`, "var(--c-pv)"],
                ["Besparing zon", `€${(todayBatt * 0.22).toFixed(2).replace(".", ",")}`, "var(--accent)"],
              ].map(([l, v, c]) => (
                <div key={l} style={{ padding: "var(--sp-4)", background: "var(--surface-2)", borderRadius: 12, border: "1px solid var(--border)" }}>
                  <div className="faint" style={{ fontSize: 12.5, marginBottom: 5 }}>{l}</div>
                  <div className="display tabnum" style={{ fontSize: 22, color: c }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageWrap>
  );
}

Object.assign(window, { Solar });

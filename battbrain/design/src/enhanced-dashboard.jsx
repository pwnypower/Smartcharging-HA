/* enhanced-dashboard.jsx — liquid battery + animated numbers + glass cards
   v2: + SmartInsightCard · QuickActionsBar · WeekStreak · battery ETA */

/* ---- SmartInsightCard: Tibber-style AI recommendation strip ---- */
function SmartInsightCard({ snap, go }) {
  const curve  = snap.plan.curve;
  const nowH   = snap.mins / 60;
  const nowInt = Math.floor(nowH);

  const getAction = (h) => {
    const p = curve[h] / 100;
    if (p <= snap.chargeLimit) return "charge";
    if (p >= snap.dischargeThreshold) return "discharge";
    return "idle";
  };

  // time until current window ends
  let nextChangeH = null, nextAct = null;
  for (let h = nowInt + 1; h < 24; h++) {
    const a = getAction(h);
    if (a !== snap.action) { nextChangeH = h; nextAct = a; break; }
  }
  const minsLeft = nextChangeH != null ? Math.max(0, nextChangeH * 60 - snap.mins) : null;
  const timeLeftStr = minsLeft == null ? null
    : minsLeft >= 60 ? `${Math.floor(minsLeft / 60)}u ${minsLeft % 60}m`
    : `${Math.round(minsLeft)}m`;

  // next non-idle window after current
  let nxtH = null, nxtAct = null, nxtPrice = null;
  for (let h = nowInt + 1; h < 24; h++) {
    const a = getAction(h);
    if (a !== "idle" && a !== snap.action) { nxtH = h; nxtAct = a; nxtPrice = curve[h]; break; }
  }

  // battery ETA
  const chargePower = 3.5;
  let battETA = null;
  if (snap.action === "charge") {
    const hrs = ((snap.targetSoc - snap.socExact) / 100 * snap.system.capacity) / chargePower;
    battETA = hrs < 1 ? `Vol over ~${Math.round(hrs * 60)} min` : `Vol over ~${hrs.toFixed(1).replace(".", ",")} uur`;
  } else if (snap.action === "discharge") {
    const hrs = ((snap.socExact - 15) / 100 * snap.system.capacity) / chargePower;
    battETA = hrs < 1 ? `Leeg over ~${Math.round(hrs * 60)} min` : `Leeg over ~${hrs.toFixed(1).replace(".", ",")} uur`;
  }

  // monthly projection
  const dayFrac = Math.max(0.04, snap.mins / 1440);
  const monthly = (snap.savings / dayFrac) * 30;

  const col = actionColor(snap.action);
  const actionLabel = { charge: "Aan het laden", discharge: "Aan het ontladen", idle: "Wachten op kans" }[snap.action];

  return (
    <div className="card smart-insight-card" style={{
      padding: 0, overflow: "hidden",
      background: `linear-gradient(135deg, color-mix(in oklab, ${col} 9%, var(--surface)), var(--surface))`,
      border: `1px solid color-mix(in oklab, ${col} 32%, var(--border))`,
    }}>
      {/* header strip */}
      <div className="between" style={{
        padding: "var(--sp-3) var(--sp-6)", borderBottom: "1px solid var(--border)",
        background: `color-mix(in oklab, ${col} 5%, transparent)`,
      }}>
        <span className="eyebrow" style={{ color: col }}>{I.brain({ size: 14 })} BattBrain Advies</span>
        <div className="row faint" style={{ gap: "var(--sp-5)", fontSize: 13.5 }}>
          <span className="tabnum">Vandaag&nbsp;
            <strong style={{ color: "var(--accent)" }}>+€{snap.savings.toFixed(2).replace(".", ",")}</strong>
          </span>
          <span className="tabnum">Prognose&nbsp;
            <strong style={{ color: "var(--c-pv)" }}>~€{Math.round(monthly)}/mnd</strong>
          </span>
        </div>
      </div>

      {/* body */}
      <div style={{
        display: "grid", gridTemplateColumns: "auto 1fr auto",
        gap: "var(--sp-5)", alignItems: "center", padding: "var(--sp-5) var(--sp-6)",
      }}>
        {/* pulsing action icon */}
        <div className="action-icon-pulse" style={{
          width: 54, height: 54, borderRadius: 16, display: "grid", placeItems: "center",
          color: col, background: `color-mix(in oklab, ${col} 18%, transparent)`,
          boxShadow: `0 8px 24px -8px color-mix(in oklab, ${col} 45%, transparent)`,
          "--glow-color": col, flex: "none",
        }}>
          {actionIcon(snap.action, { size: 26 })}
        </div>

        {/* status text */}
        <div>
          <div className="row" style={{ gap: "var(--sp-3)", flexWrap: "wrap", marginBottom: 4, alignItems: "baseline" }}>
            <span style={{ fontWeight: 700, fontSize: 18, color: col, whiteSpace: "nowrap" }}>{actionLabel}</span>
            {timeLeftStr && (
              <span className="faint tabnum" style={{ fontSize: 14, whiteSpace: "nowrap" }}>
                · nog {timeLeftStr} in dit venster
              </span>
            )}
          </div>
          <div className="faint" style={{ fontSize: 14 }}>
            {snap.decisions[0]?.reason || "Algoritme actief · wacht op marktdata"}
          </div>
          {battETA && (
            <div style={{ fontSize: 13.5, color: col, marginTop: 6, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              {I.clock({ size: 13 })} {battETA}
            </div>
          )}
        </div>

        {/* next window chip */}
        {nxtH != null && (
          <div style={{
            textAlign: "right", padding: "var(--sp-3) var(--sp-4)",
            background: "var(--surface-2)", borderRadius: 12, border: "1px solid var(--border)",
            flex: "none",
          }}>
            <div className="faint" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Volgende</div>
            <div style={{ fontWeight: 700, fontSize: 14.5, color: actionColor(nxtAct) }}>
              {nxtAct === "charge" ? "⚡ Laden" : "💰 Ontladen"}
            </div>
            <div className="faint tabnum" style={{ fontSize: 13, marginTop: 2 }}>
              {String(nxtH).padStart(2, "0")}:00 · {nxtPrice.toFixed(1).replace(".", ",")} ct
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- QuickActionsBar: manual override (Powerwall-style) ---- */
function QuickActionsBar() {
  const [override, setOverride] = React.useState(null);
  const [duration, setDuration] = React.useState(30);

  const handle = (act) => {
    if (override === act) {
      setOverride(null);
      showToast("AI-besturing hervat", "success", "Handmatige override opgeheven");
    } else {
      setOverride(act);
      const lbl = { charge: "Forceer laden", discharge: "Forceer ontladen", pause: "AI gepauzeerd" };
      showToast(lbl[act], act === "charge" ? "charge" : act === "discharge" ? "discharge" : "info",
        `${duration} minuten actief · daarna hervat AI automatisch`);
    }
  };

  const BtnStyle = (act, baseColor) => ({
    padding: "9px 16px", fontSize: 14, gap: 7,
    background: override === act ? baseColor : undefined,
    color: override === act ? (act === "pause" ? "var(--text)" : "#06140d") : undefined,
    borderColor: override === act ? baseColor : undefined,
    boxShadow: override === act ? `0 6px 20px -6px color-mix(in oklab, ${baseColor} 60%, transparent)` : undefined,
  });

  return (
    <div className="card" style={{ padding: "var(--sp-4) var(--sp-6)" }}>
      <div className="between" style={{ flexWrap: "wrap", gap: "var(--sp-4)" }}>
        <div className="row" style={{ gap: "var(--sp-3)" }}>
          <div className="eyebrow">{I.bolt({ size: 14 })} Handmatige besturing</div>
          {override ? (
            <span className="pill" style={{ background: "color-mix(in oklab, var(--price-mid) 14%, transparent)", borderColor: "color-mix(in oklab, var(--price-mid) 40%, transparent)", color: "var(--price-mid)", fontSize: 12 }}>
              Override actief
            </span>
          ) : (
            <span className="pill" style={{ background: "color-mix(in oklab, var(--accent) 12%, transparent)", borderColor: "color-mix(in oklab, var(--accent) 35%, transparent)", color: "var(--accent)", fontSize: 12 }}>
              <span className="dot pulse" style={{ background: "var(--accent)" }} /> AI actief
            </span>
          )}
        </div>
        <div className="row" style={{ gap: "var(--sp-2)", flexWrap: "wrap" }}>
          <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="select"
            style={{ width: "auto", padding: "8px 32px 8px 12px", fontSize: 13.5, borderRadius: 10, height: 38 }}>
            {[15, 30, 60, 120].map(d => <option key={d} value={d}>{d} min</option>)}
          </select>
          <button className={"btn " + (override === "charge" ? "btn-primary" : "btn-ghost")}
            style={BtnStyle("charge", "var(--c-charge)")} onClick={() => handle("charge")}>
            {I.arrowUp({ size: 15 })} Laden
          </button>
          <button className={"btn " + (override === "discharge" ? "btn-primary" : "btn-ghost")}
            style={BtnStyle("discharge", "var(--c-discharge)")} onClick={() => handle("discharge")}>
            {I.arrowDown({ size: 15 })} Ontladen
          </button>
          <button className={"btn " + (override === "pause" ? "btn-primary" : "btn-ghost")}
            style={BtnStyle("pause", "var(--surface-3)")} onClick={() => handle("pause")}>
            {I.wait({ size: 15 })} Pauzeer AI
          </button>
          {override && (
            <button className="btn btn-ghost" style={{ padding: "9px 14px", fontSize: 14, color: "var(--price-high)" }}
              onClick={() => { setOverride(null); showToast("Override opgeheven", "success"); }}>
              {I.close({ size: 14 })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- WeekStreak: last-7-days savings bars ---- */
function WeekStreak() {
  const days = React.useMemo(() => {
    const base = [1.45, 2.1, 0.88, 2.67, 1.92, 3.1, 1.82];
    const labels = [];
    const d = new Date();
    for (let i = 6; i >= 0; i--) {
      const dd = new Date(d); dd.setDate(d.getDate() - i);
      labels.push(["zo","ma","di","wo","do","vr","za"][dd.getDay()]);
    }
    return base.map((v, i) => ({ v, label: labels[i], today: i === 6 }));
  }, []);

  const maxV = Math.max(...days.map(d => d.v));
  const total = days.reduce((s, d) => s + d.v, 0);

  return (
    <div className="card card-hover">
      <div className="between" style={{ marginBottom: "var(--sp-5)" }}>
        <div>
          <div className="eyebrow">{I.trend({ size: 14 })} Afgelopen 7 dagen</div>
          <h3 style={{ fontSize: 20, marginTop: 6 }}>Besparingsreeks</h3>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="faint" style={{ fontSize: 12.5 }}>Week totaal</div>
          <div className="display tabnum" style={{ fontSize: 28, color: "var(--accent)" }}>
            €{total.toFixed(2).replace(".", ",")}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 80 }}>
        {days.map((d, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{
              width: "100%", borderRadius: 6,
              height: Math.max(6, (d.v / maxV) * 64),
              background: d.today
                ? "linear-gradient(180deg, color-mix(in oklab, var(--accent) 92%, white), var(--accent))"
                : "color-mix(in oklab, var(--accent) 35%, transparent)",
              boxShadow: d.today ? "0 4px 14px -4px color-mix(in oklab, var(--accent) 60%, transparent)" : "none",
              transition: "height 0.6s cubic-bezier(.4,1,.4,1)",
            }} />
            <div style={{ fontSize: 11.5, color: d.today ? "var(--accent)" : "var(--text-faint)", fontWeight: d.today ? 700 : 500 }}>
              {d.label}
            </div>
          </div>
        ))}
      </div>
      <div className="between faint" style={{ marginTop: "var(--sp-3)", fontSize: 13 }}>
        <span>gem. €{(total / 7).toFixed(2).replace(".", ",")} / dag</span>
        <span style={{ color: "var(--accent)" }}>Prognose ~€{Math.round(total / 7 * 30)}/mnd</span>
      </div>
    </div>
  );
}

function Banner({ tone, icon, title, body, cta, onCta, onClose }) {
  const c = tone === "warn" ? "var(--price-mid)" : "var(--c-charge)";
  return (
    <div className="card" style={{
      padding: "var(--sp-4) var(--sp-5)", borderColor: `color-mix(in oklab, ${c} 45%, transparent)`,
      background: `color-mix(in oklab, ${c} 10%, var(--surface))`,
    }}>
      <div className="between" style={{ flexWrap: "wrap", gap: "var(--sp-4)" }}>
        <div className="row" style={{ gap: "var(--sp-4)" }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, display: "grid", placeItems: "center", color: c, background: `color-mix(in oklab, ${c} 18%, transparent)`, flex: "none" }}>{icon}</div>
          <div><div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div><div className="muted" style={{ fontSize: 14.5 }}>{body}</div></div>
        </div>
        <div className="row" style={{ gap: "var(--sp-2)" }}>
          <button className="btn" style={{ background: c, color: "#06140d", padding: "10px 18px", fontSize: 14.5 }} onClick={onCta}>{cta}</button>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: 10 }} aria-label="Sluiten">{I.close({ size: 16 })}</button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, children, accent, sub }) {
  return (
    <div className="card card-hover" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
      <div className="card-label">{label}</div>
      {children}
      {sub && <div className="faint" style={{ fontSize: 13.5, marginTop: "auto" }}>{sub}</div>}
    </div>
  );
}

function ThresholdItem({ icon, tone, label, value }) {
  return (
    <div className="row" style={{ gap: "var(--sp-3)", padding: "var(--sp-3) 0" }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", color: tone, background: `color-mix(in oklab, ${tone} 15%, transparent)`, flex: "none", boxShadow: `0 4px 14px -6px color-mix(in oklab, ${tone} 40%, transparent)` }}>{icon}</div>
      <div className="grow"><div className="faint" style={{ fontSize: 13 }}>{label}</div>
        <div className="display tabnum" style={{ fontSize: 22 }}>{value}</div></div>
    </div>
  );
}

function SummaryStat({ icon, tone, label, value, unit }) {
  return (
    <div className="summary-stat-wow" style={{
      padding: "var(--sp-4)", borderRadius: 14,
      background: "var(--surface-2)", border: "1px solid var(--border)",
      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
    }}>
      <div className="row" style={{ gap: 8, color: tone, marginBottom: 10 }}>{icon}<span className="faint" style={{ fontSize: 12.5, color: "var(--text-dim)" }}>{label}</span></div>
      <div className="display tabnum" style={{ fontSize: "clamp(22px, 2.4vw, 30px)" }}>{value}<span style={{ fontSize: 14, color: "var(--text-faint)", marginLeft: 3 }}>{unit}</span></div>
    </div>
  );
}

function DecisionRow({ d, last }) {
  const col = actionColor(d.action);
  const tag = { charge: "Laden", discharge: "Ontladen", idle: "Wachten" }[d.action];
  return (
    <tr style={{ borderTop: last ? "none" : "1px solid var(--border)" }}>
      <td className="tabnum" style={{ padding: "var(--sp-3) var(--sp-2)", color: "var(--text-dim)", whiteSpace: "nowrap" }}>{clockLabel(d.mins)}</td>
      <td style={{ padding: "var(--sp-3) var(--sp-2)" }}>
        <span className="row" style={{ gap: 7, color: col, fontWeight: 600, fontSize: 14.5 }}>
          <span style={{ width: 26, height: 26, borderRadius: 7, display: "grid", placeItems: "center", background: `color-mix(in oklab, ${col} 16%, transparent)` }}>{actionIcon(d.action, { size: 15 })}</span>
          {tag}
        </span>
      </td>
      <td className="tabnum" style={{ padding: "var(--sp-3) var(--sp-2)", textAlign: "right" }}>{d.soc}%</td>
      <td className="tabnum" style={{ padding: "var(--sp-3) var(--sp-2)", textAlign: "right", color: d.price == null ? "var(--text-faint)" : priceColor(d.price) }}>
        {d.price == null ? "—" : d.price.toFixed(1).replace(".", ",")}
      </td>
      <td className="muted" style={{ padding: "var(--sp-3) var(--sp-2)", fontSize: 13.5 }}>{d.reason}</td>
    </tr>
  );
}

const ACTION_TOAST = {
  charge:    ["Batterij begint laden", "charge"],
  discharge: ["Terugleveren aan het net", "discharge"],
  idle:      ["Wachten op gunstig moment", "idle"],
};

function Dashboard({ flags, go }) {
  const snap = useDemo();
  const prevAction = React.useRef(snap.action);
  React.useEffect(() => {
    if (snap.action !== prevAction.current) {
      const [msg, type] = ACTION_TOAST[snap.action] || ["Actie gewijzigd", "info"];
      const sub = snap.decisions[0]?.reason || "";
      showToast(msg, type, sub);
      prevAction.current = snap.action;
    }
  }, [snap.action]);
  const [sub, setSub] = React.useState(flags.showSub);
  const [cfg, setCfg] = React.useState(flags.showConfig);
  React.useEffect(() => setSub(flags.showSub), [flags.showSub]);
  React.useEffect(() => setCfg(flags.showConfig), [flags.showConfig]);
  const p = snap.plan;

  // Battery ETA for SoC card
  const chargePower = 3.5;
  let battETA = null;
  if (snap.action === "charge") {
    const hrs = Math.max(0, (snap.targetSoc - snap.socExact) / 100 * snap.system.capacity) / chargePower;
    battETA = hrs < 1 ? `Vol over ~${Math.round(hrs * 60)} min` : `Vol over ~${hrs.toFixed(1).replace(".", ",")} uur`;
  } else if (snap.action === "discharge") {
    const hrs = Math.max(0, (snap.socExact - 15) / 100 * snap.system.capacity) / chargePower;
    battETA = hrs < 1 ? `Leeg over ~${Math.round(hrs * 60)} min` : `Leeg over ~${hrs.toFixed(1).replace(".", ",")} uur`;
  }

  return (
    <PageWrap>
      <div className="dash">
        {/* status bar */}
        <div className="between dash-statusbar" style={{ flexWrap: "wrap", gap: "var(--sp-4)" }}>
          <div className="row" style={{ gap: "var(--sp-3)", flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "clamp(24px, 3vw, 34px)" }}>Dashboard</h1>
            <div className="pill" style={flags.active
              ? { background: "color-mix(in oklab, var(--accent) 14%, transparent)", borderColor: "color-mix(in oklab, var(--accent) 40%, transparent)", color: "var(--accent)" }
              : { background: "color-mix(in oklab, var(--text) 8%, transparent)", color: "var(--text-dim)" }}>
              <span className={"dot" + (flags.active ? " pulse" : "")} style={{ background: flags.active ? "var(--accent)" : "var(--text-faint)" }} />
              {flags.active ? "Actief" : "Inactief"}
            </div>
            {flags.demoMode && <div className="pill" style={{ background: "color-mix(in oklab, var(--c-pv) 14%, transparent)", borderColor: "color-mix(in oklab, var(--c-pv) 40%, transparent)", color: "var(--c-pv)" }}>Demo-modus</div>}
          </div>
          <div className="row faint" style={{ gap: 8, fontSize: 14.5 }}>{I.clock({ size: 16 })}<span className="tabnum">Vandaag · {snap.clock}</span></div>
        </div>

        {/* AI insight card — Tibber/Powerwall style */}
        <SmartInsightCard snap={snap} go={go} />

        {/* banners */}
        {(sub || cfg) && (
          <div className="stack" style={{ gap: "var(--sp-3)" }}>
            {sub && <Banner tone="warn" icon={I.crown({ size: 20 })} title="Start je abonnement"
              body="Activeer BattBrain Plus om automatisch te blijven handelen — €6,95/mnd." cta="Abonneren" onCta={() => go("subscription")} onClose={() => setSub(false)} />}
            {cfg && <Banner tone="info" icon={I.settings({ size: 20 })} title="Nog geen omvormer ingesteld"
              body="Koppel je omvormer en energieprovider om te beginnen met optimaliseren." cta="Instellingen openen" onCta={() => go("settings")} onClose={() => setCfg(false)} />}
          </div>
        )}

        {/* 3 status cards — LIQUID BATTERY */}
        <StaggerIn className="grid-3" stagger={0.08}>
          <StatCard label="Laadtoestand (SoC)" sub={`${fmtKwh(snap.socExact / 100 * snap.system.capacity)} van ${fmtKwh(snap.system.capacity)} kWh`}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-4)" }}>
              <LiquidBattery soc={snap.soc} action={snap.action} size={110} />
              <div className="stack" style={{ gap: "var(--sp-3)", flex: 1 }}>
                <div>
                  <div className="faint" style={{ fontSize: 13 }}>Doel-SoC</div>
                  <div className="display tabnum" style={{ fontSize: 22 }}>{snap.targetSoc}%</div>
                </div>
                <div className="prog"><div className="prog-fill" style={{ width: `${snap.soc}%`, background: actionColor(snap.action) }} /></div>
                {battETA && (
                  <div style={{ fontSize: 12.5, color: actionColor(snap.action), fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                    {I.clock({ size: 12 })} {battETA}
                  </div>
                )}
              </div>
            </div>
          </StatCard>

          <StatCard label="Huidige prijs" sub="Dynamisch · per uur">
            <div className="display tabnum" style={{ fontSize: "clamp(40px, 5vw, 56px)", color: priceColor(snap.priceCt), lineHeight: 1 }}>
              <AnimNum value={snap.priceCt} decimals={1} suffix="" />
              <span style={{ fontSize: "clamp(14px, 1.4vw, 18px)", color: "var(--text-dim)", marginLeft: 2 }}>ct</span>
            </div>
            <div className="faint" style={{ fontSize: 14 }}>per kWh</div>
            <div className="row" style={{ gap: "var(--sp-2)", marginTop: "var(--sp-2)" }}>
              {["low", "mid", "high"].map((t) => (
                <span key={t} style={{ flex: 1, height: 6, borderRadius: 3, transition: "background 0.5s ease", background: priceTone(snap.priceCt) === t ? (t === "low" ? "var(--price-low)" : t === "mid" ? "var(--price-mid)" : "var(--price-high)") : "color-mix(in oklab, var(--text) 12%, transparent)" }} />
              ))}
            </div>
          </StatCard>

          <StatCard label="Huidige actie" sub={snap.decisions[0]?.reason}>
            <div className="row" style={{ gap: "var(--sp-4)" }}>
              <div className="action-icon-pulse" style={{
                width: 64, height: 64, borderRadius: 16, display: "grid", placeItems: "center",
                color: actionColor(snap.action),
                background: `color-mix(in oklab, ${actionColor(snap.action)} 16%, transparent)`,
                '--glow-color': actionColor(snap.action),
                flex: "none", transition: "all 0.5s ease",
              }}>
                {actionIcon(snap.action, { size: 30 })}
              </div>
              <div>
                <div className="display" style={{ fontSize: "clamp(28px, 3.4vw, 38px)", color: actionColor(snap.action), transition: "color 0.5s ease" }}>{snap.actionLabel}</div>
                <div className="faint" style={{ fontSize: 14 }}>{snap.action === "charge" ? "Batterij wordt geladen" : snap.action === "discharge" ? "Terugleveren aan het net" : "Wachten op gunstig moment"}</div>
              </div>
            </div>
          </StatCard>
        </StaggerIn>

        {/* quick manual override — Powerwall style */}
        <QuickActionsBar />

        {/* dagplan — 24h trading timeline */}
        <DagplanCard snap={snap} />

        {/* energy flow diagram */}
        <MouseGlow color={actionColor(snap.action)} size={400} opacity={0.1}>
          <div className="card" style={{ position: "relative" }}>
            <div className="eyebrow" style={{ marginBottom: "var(--sp-3)" }}>{I.bolt({ size: 14 })} Energiestroom</div>
            <EnergyFlow action={snap.action} />
          </div>
        </MouseGlow>

        {/* trading plan + curve */}
        <div className="card">
          <div className="between" style={{ marginBottom: "var(--sp-5)", flexWrap: "wrap", gap: "var(--sp-3)" }}>
            <div><div className="eyebrow">{I.trend({ size: 14 })} Handelsplan vandaag</div>
              <h3 style={{ fontSize: 24, marginTop: 8 }}>Prijsverloop &amp; geplande acties</h3></div>
            <div className="row" style={{ gap: "var(--sp-5)" }}>
              <div style={{ textAlign: "right" }}><div className="faint" style={{ fontSize: 12.5 }}>Verwacht laden</div><div className="display tabnum" style={{ fontSize: 22, color: "var(--c-charge)" }}><AnimNum value={p.expected_charge_kwh} decimals={1} suffix=" kWh" /></div></div>
              <div style={{ textAlign: "right" }}><div className="faint" style={{ fontSize: 12.5 }}>Verwachte besparing</div><div className="display tabnum" style={{ fontSize: 22, color: "var(--accent)" }}><AnimNum value={p.expected_savings} decimals={2} prefix="€" /></div></div>
            </div>
          </div>
          {p.available ? (
            <React.Fragment>
              <PriceCurve snap={snap} height={250} />
              <div className="plan-split">
                <div className="plan-col" style={{ borderColor: "color-mix(in oklab, var(--price-low) 35%, transparent)" }}>
                  <div className="row" style={{ gap: 8, color: "var(--price-low)", fontWeight: 700, marginBottom: 6 }}>{I.arrowUp({ size: 16 })} Goedkope uren · laden</div>
                  <div className="row tabnum" style={{ gap: 6, flexWrap: "wrap", fontSize: 15 }}>
                    {p.cheap_hours.map((h) => <span key={h} className="hour-chip" style={{ background: "color-mix(in oklab, var(--price-low) 16%, transparent)", color: "var(--price-low)" }}>{hourLabel(h)}</span>)}
                  </div>
                  <div className="faint" style={{ fontSize: 13.5, marginTop: 8 }}>gem. {fmtCt(p.avg_cheap)}/kWh</div>
                </div>
                <div className="plan-col" style={{ borderColor: "color-mix(in oklab, var(--price-high) 35%, transparent)" }}>
                  <div className="row" style={{ gap: 8, color: "var(--price-high)", fontWeight: 700, marginBottom: 6 }}>{I.arrowDown({ size: 16 })} Dure uren · ontladen</div>
                  <div className="row tabnum" style={{ gap: 6, flexWrap: "wrap", fontSize: 15 }}>
                    {p.expensive_hours.map((h) => <span key={h} className="hour-chip" style={{ background: "color-mix(in oklab, var(--price-high) 16%, transparent)", color: "var(--price-high)" }}>{hourLabel(h)}</span>)}
                  </div>
                  <div className="faint" style={{ fontSize: 13.5, marginTop: 8 }}>gem. {fmtCt(p.avg_expensive)}/kWh</div>
                </div>
              </div>
            </React.Fragment>
          ) : (
            <div className="center" style={{ flexDirection: "column", gap: "var(--sp-3)", padding: "var(--sp-12) 0", color: "var(--text-dim)" }}>
              {I.clock({ size: 40 })}<div style={{ fontSize: 17 }}>Het handelsplan komt beschikbaar rond <strong>13:00</strong></div>
              <div className="faint" style={{ fontSize: 14 }}>Zodra de uurprijzen voor morgen zijn gepubliceerd.</div>
            </div>
          )}
        </div>

        {/* thresholds + system info */}
        <div className="grid-2">
          <div className="card card-hover">
            <div className="eyebrow" style={{ marginBottom: "var(--sp-4)" }}>{I.gauge({ size: 14 })} Algoritme-drempels</div>
            <div className="grid-2-inner">
              <ThresholdItem icon={I.arrowUp({ size: 18 })} tone="var(--c-charge)" label="Laadgrens" value={fmtEur(snap.chargeLimit) + "/kWh"} />
              <ThresholdItem icon={I.arrowDown({ size: 18 })} tone="var(--c-discharge)" label="Ontlaadgrens" value={fmtEur(snap.dischargeThreshold) + "/kWh"} />
              <ThresholdItem icon={I.sun({ size: 18 })} tone="var(--c-pv)" label="Zon resterend" value={fmtKwh(snap.solarRemaining) + " kWh"} />
              <ThresholdItem icon={I.euro({ size: 18 })} tone="var(--accent)" label="Besparing vandaag" value={<AnimNum value={snap.savings} decimals={2} prefix="€" />} />
            </div>
          </div>
          <div className="card card-hover">
            <div className="eyebrow" style={{ marginBottom: "var(--sp-4)" }}>{I.shield({ size: 14 })} Systeeminformatie</div>
            <div className="stack">
              {[["Omvormer", snap.system.inverter, I.plug({ size: 17 })], ["Energieprovider", snap.system.provider, I.cloud({ size: 17 })], ["Batterijcapaciteit", fmtKwh(snap.system.capacity) + " kWh", I.battery({ size: 17 })], ["Abonnement", "BattBrain " + snap.system.tier, I.crown({ size: 17 })]].map(([k, v, ic], i) => (
                <div key={k} className="between" style={{ padding: "var(--sp-3) 0", borderTop: i ? "1px solid var(--border)" : "none" }}>
                  <span className="row muted" style={{ gap: 10, fontSize: 14.5 }}>{ic}{k}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* energy summary */}
        <div className="card">
          <div className="between" style={{ marginBottom: "var(--sp-5)" }}>
            <div className="eyebrow">{I.bolt({ size: 14 })} Energiesamenvatting vandaag</div>
            <span className="faint" style={{ fontSize: 13.5 }}>sinds 00:00</span>
          </div>
          <StaggerIn className="grid-6" stagger={0.05}>
            <SummaryStat icon={I.arrowUp({ size: 18 })} tone="var(--c-charge)" label="Geladen" value={<AnimNum value={snap.summary.charged} decimals={1} />} unit="kWh" />
            <SummaryStat icon={I.arrowDown({ size: 18 })} tone="var(--c-discharge)" label="Ontladen" value={<AnimNum value={snap.summary.discharged} decimals={1} />} unit="kWh" />
            <SummaryStat icon={I.sun({ size: 18 })} tone="var(--c-pv)" label="Zonne-energie" value={fmtKwh(snap.summary.pv)} unit="kWh" />
            <SummaryStat icon={I.grid({ size: 18 })} tone="var(--text-dim)" label="Netafname" value={fmtKwh(snap.summary.gridImport)} unit="kWh" />
            <SummaryStat icon={I.grid({ size: 18 })} tone="var(--c-export)" label="Teruglevering" value={fmtKwh(snap.summary.gridExport)} unit="kWh" />
            <SummaryStat icon={I.euro({ size: 18 })} tone="var(--accent)" label="Besparing" value={<AnimNum value={snap.summary.savings} decimals={2} prefix="€" />} unit="" />
          </StaggerIn>
        </div>

        {/* 7-day savings streak */}
        <WeekStreak />

        {/* decisions timeline */}
        <div className="card">
          <div className="between" style={{ marginBottom: "var(--sp-4)" }}>
            <div className="eyebrow">{I.clock({ size: 14 })} Beslissingen-tijdlijn</div>
            <span className="faint" style={{ fontSize: 13.5 }}>laatste 24 · nieuwste boven</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
              <thead><tr style={{ textAlign: "left" }}>
                {["Tijd", "Actie", "SoC", "Prijs ct", "Reden"].map((h, i) => (
                  <th key={h} style={{ padding: "0 var(--sp-2) var(--sp-2)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-faint)", textAlign: i === 2 || i === 3 ? "right" : "left" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{snap.decisions.map((d, i) => <DecisionRow key={i} d={d} last={i === 0} />)}</tbody>
            </table>
          </div>
        </div>
      </div>
    </PageWrap>
  );
}

Object.assign(window, { Dashboard, SmartInsightCard, QuickActionsBar, WeekStreak });

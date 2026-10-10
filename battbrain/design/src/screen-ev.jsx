/* screen-ev.jsx — EV smart charging screen */

const DAYS_NL = ["Ma","Di","Wo","Do","Vr","Za","Zo"];

function RecurringSchedule() {
  const [enabled, setEnabled] = React.useState(true);
  const [days, setDays] = React.useState([true,true,true,true,true,false,false]);
  const [depart, setDepart] = React.useState("08:00");
  const [target, setTarget] = React.useState(80);
  const [saved, setSaved] = React.useState(false);

  const toggleDay = (i) => { setDays(d => { const n=[...d]; n[i]=!n[i]; return n; }); setSaved(false); };
  const activeDays = DAYS_NL.filter((_,i) => days[i]).join(", ") || "Geen dag geselecteerd";

  return (
    <div className="card">
      <div className="between" style={{ marginBottom:"var(--sp-5)" }}>
        <div className="row" style={{ gap:"var(--sp-3)" }}>
          <div style={{ width:44, height:44, borderRadius:12, display:"grid", placeItems:"center", color:"var(--c-charge)", background:"color-mix(in oklab, var(--c-charge) 15%, transparent)" }}>{I.repeat({ size:22 })}</div>
          <div><h3 style={{ fontSize:20 }}>Terugkerend schema</h3><div className="faint" style={{ fontSize:13.5, marginTop:2 }}>Automatisch laadplan voor vaste vertrektijden</div></div>
        </div>
        <div onClick={() => setEnabled(s=>!s)} style={{ width:44, height:24, borderRadius:12, cursor:"pointer", background: enabled?"var(--accent)":"var(--surface-3)", border:"1px solid var(--border)", position:"relative", transition:"background 0.3s ease", flex:"none" }}>
          <div style={{ position:"absolute", top:3, left: enabled?"calc(100% - 20px)":3, width:16, height:16, borderRadius:"50%", background:"white", transition:"left 0.3s cubic-bezier(0.16,0.84,0.44,1)", boxShadow:"0 2px 4px rgba(0,0,0,0.3)" }} />
        </div>
      </div>

      <div style={{ opacity: enabled ? 1 : 0.4, pointerEvents: enabled ? "all" : "none", transition:"opacity 0.3s" }}>
        {/* day selector */}
        <div style={{ marginBottom:"var(--sp-5)" }}>
          <div style={{ fontWeight:600, fontSize:15, marginBottom:"var(--sp-3)" }}>Actieve dagen</div>
          <div className="row" style={{ gap:"var(--sp-2)", flexWrap:"wrap" }}>
            {DAYS_NL.map((d,i) => (
              <button key={d} onClick={() => toggleDay(i)} style={{
                width:44, height:44, borderRadius:12, border:"2px solid",
                borderColor: days[i] ? "var(--c-charge)" : "var(--border)",
                background: days[i] ? "color-mix(in oklab, var(--c-charge) 14%, transparent)" : "var(--surface-2)",
                color: days[i] ? "var(--c-charge)" : "var(--text-dim)",
                fontWeight: days[i] ? 700 : 500, fontSize:13.5, cursor:"pointer",
                transition:"all 0.2s ease",
              }}>{d}</button>
            ))}
          </div>
          <div className="faint" style={{ fontSize:13, marginTop:"var(--sp-2)" }}>{activeDays}</div>
        </div>

        <div className="grid-2" style={{ gap:"var(--sp-4)", marginBottom:"var(--sp-5)" }}>
          <div className="field">
            <label>Vertrektijd</label>
            <select className="select" value={depart} onChange={e => { setDepart(e.target.value); setSaved(false); }}>
              {Array.from({length:24},(_,h) => `${String(h).padStart(2,"0")}:00`).map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <div className="between" style={{ marginBottom:"var(--sp-2)" }}>
              <label style={{ fontWeight:600, fontSize:13.5, color:"var(--text-dim)" }}>Doel-laadstand</label>
              <span className="display tabnum" style={{ fontSize:22, color:"var(--accent)" }}>{target}%</span>
            </div>
            <input type="range" min={20} max={100} step={5} value={target}
              onChange={e => { setTarget(Number(e.target.value)); setSaved(false); }}
              style={{ width:"100%", accentColor:"var(--accent)", cursor:"pointer" }} />
          </div>
        </div>

        {/* preview strip */}
        <div style={{ padding:"var(--sp-4)", background:"var(--surface-2)", borderRadius:14, border:"1px solid var(--border)", marginBottom:"var(--sp-5)" }}>
          <div className="row" style={{ gap:"var(--sp-4)", flexWrap:"wrap" }}>
            <div className="row" style={{ gap:8 }}>
              <span style={{ color:"var(--c-charge)" }}>{I.repeat({size:16})}</span>
              <span className="faint" style={{ fontSize:14 }}>
                Elke <strong style={{ color:"var(--text)" }}>{DAYS_NL.filter((_,i)=>days[i]).join(", ")||"—"}</strong>
              </span>
            </div>
            <div className="row" style={{ gap:8 }}>
              <span style={{ color:"var(--c-charge)" }}>{I.clock({size:16})}</span>
              <span className="faint" style={{ fontSize:14 }}>Klaar voor <strong style={{ color:"var(--text)" }}>{depart}</strong></span>
            </div>
            <div className="row" style={{ gap:8 }}>
              <span style={{ color:"var(--accent)" }}>{I.battery({size:16})}</span>
              <span className="faint" style={{ fontSize:14 }}>Doel: <strong style={{ color:"var(--text)" }}>{target}%</strong></span>
            </div>
          </div>
        </div>

        <div className="between" style={{ flexWrap:"wrap", gap:"var(--sp-3)" }}>
          <span className="faint" style={{ fontSize:13.5 }}>
            {saved ? <span style={{ color:"var(--accent)" }}>{I.check({size:14})} Schema actief</span> : "Wijzigingen worden pas actief na opslaan."}
          </span>
          <button className="btn btn-primary" onClick={() => { setSaved(true); showToast("Terugkerend schema opgeslagen","success",`${DAYS_NL.filter((_,i)=>days[i]).join("/")} · ${depart} · ${target}%`); }}>
            {I.repeat({size:16})} Schema opslaan
          </button>
        </div>
      </div>
    </div>
  );
}

const EV_BRANDS = [
  { name: "Alfen",   color: "var(--accent)",   icon: "⚡" },
  { name: "Easee",   color: "var(--c-charge)", icon: "⚡" },
  { name: "Zaptec",  color: "var(--c-pv)",     icon: "⚡" },
  { name: "Wallbox", color: "var(--price-mid)", icon: "⚡" },
];

const EV_CARS = ["Tesla Model 3", "Volkswagen ID.4", "Peugeot e-208", "Kia EV6", "Overig"];

function TimeSelect({ value, onChange, label }) {
  const hours = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);
  return (
    <div className="field">
      <label>{label}</label>
      <select className="select" value={value} onChange={e => onChange(e.target.value)}>
        {hours.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
    </div>
  );
}

/* ---- Smart charge schedule visualizer ---- */
function ChargeScheduleViz({ departureHour, targetPct, currentPct, chargeLimit }) {
  const snap = Demo.snapshot();
  const curve = snap.plan.curve;
  const now = Math.floor(snap.mins / 60);

  // Calculate how many kWh needed (assume 60kWh battery)
  const CAPACITY = 60;
  const needed = Math.max(0, ((targetPct - currentPct) / 100) * CAPACITY);
  const hoursNeeded = Math.ceil(needed / 11); // 11kW charger

  // Find cheapest hours between now and departure
  const future = [];
  for (let h = now; h < departureHour + 24 * (departureHour <= now ? 1 : 0); h++) {
    const hh = h % 24;
    future.push({ h: hh, price: curve[hh] });
  }
  const sorted = [...future].sort((a, b) => a.price - b.price);
  const chargeHours = new Set(sorted.slice(0, hoursNeeded).map(x => x.h));

  const totalCostSmart = sorted.slice(0, hoursNeeded).reduce((s, x) => s + x.price / 100 * 11, 0);
  const avgCurve = curve.reduce((s, v) => s + v, 0) / 24;
  const costDumb = hoursNeeded * avgCurve / 100 * 11;
  const saving = Math.max(0, costDumb - totalCostSmart);

  return (
    <div>
      {/* hour strip */}
      <div style={{ display: "flex", gap: 3, marginBottom: "var(--sp-4)" }}>
        {curve.map((p, h) => {
          const isCharge   = chargeHours.has(h);
          const isPast     = h < now;
          const isCurrent  = h === now;
          const isDeparture = h === departureHour;
          const barH = Math.max(6, Math.round((p / Math.max(...curve)) * 40));
          return (
            <div key={h} style={{ flex: "1 1 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{
                height: barH, width: "100%", borderRadius: 3,
                background: isCharge ? "var(--c-charge)" : isPast ? "color-mix(in oklab, var(--text) 8%, transparent)" : "color-mix(in oklab, var(--text) 18%, transparent)",
                opacity: isPast ? 0.35 : 1,
                boxShadow: isCharge ? "0 0 6px var(--c-charge)" : isCurrent ? "0 0 6px var(--accent)" : "none",
                outline: isCurrent ? "2px solid var(--accent)" : isDeparture ? "2px solid var(--price-mid)" : "none",
                outlineOffset: 1,
                transition: "all 0.3s ease",
              }} title={`${String(h).padStart(2,"0")}:00 · ${p.toFixed(1)} ct${isCharge ? " · laden" : ""}${isDeparture ? " · vertrek" : ""}`} />
              {h % 6 === 0 && <span style={{ fontSize: 9.5, color: "var(--text-faint)", lineHeight: 1 }}>{String(h).padStart(2,"0")}</span>}
            </div>
          );
        })}
      </div>

      {/* legend */}
      <div className="row" style={{ gap: "var(--sp-5)", flexWrap: "wrap", marginBottom: "var(--sp-5)" }}>
        <div className="row" style={{ gap: 7, fontSize: 13 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--c-charge)", boxShadow: "0 0 5px var(--c-charge)" }} />
          <span className="faint">{chargeHours.size} laaduren gepland</span>
        </div>
        <div className="row" style={{ gap: 7, fontSize: 13 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, outline: "2px solid var(--price-mid)", outlineOffset: 1 }} />
          <span className="faint">Vertrek {String(departureHour).padStart(2, "0")}:00</span>
        </div>
        <div className="faint" style={{ fontSize: 13, marginLeft: "auto" }}>
          Besparing vs. direct laden: <strong style={{ color: "var(--accent)" }} className="tabnum">€{saving.toFixed(2).replace(".", ",")}</strong>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid-3" style={{ gap: "var(--sp-3)" }}>
        {[
          ["Gepland te laden", `${needed.toFixed(1).replace(".", ",")} kWh`, "var(--c-charge)"],
          ["Kosten slim laden", `€${totalCostSmart.toFixed(2).replace(".", ",")}`, "var(--accent)"],
          ["Bespaard vs. direct", `€${saving.toFixed(2).replace(".", ",")}`, "var(--c-pv)"],
        ].map(([l, v, c]) => (
          <div key={l} style={{ padding: "var(--sp-4)", background: "var(--surface-2)", borderRadius: 12, border: "1px solid var(--border)", textAlign: "center" }}>
            <div className="faint" style={{ fontSize: 12.5, marginBottom: 4 }}>{l}</div>
            <div className="display tabnum" style={{ fontSize: 22, color: c }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- SoC ring ---- */
function SocRing({ pct, color, size = 80 }) {
  const r = size / 2 - 7;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth="7" />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth="7"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.16,0.84,0.44,1)", filter: `drop-shadow(0 0 6px ${color})` }} />
      <text x={size/2} y={size/2 + 6} textAnchor="middle" fontSize="16" fontWeight="700" fill={color}>{pct}%</text>
    </svg>
  );
}

/* ---- Main EV screen ---- */
function EvCharging({ go }) {
  const snap = useDemo();
  const [connected, setConnected] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);
  const [brand, setBrand] = React.useState("Alfen");
  const [car, setCar]   = React.useState("Tesla Model 3");
  const [evSoc, setEvSoc] = React.useState(28);
  const [targetSoc, setTargetSoc] = React.useState(80);
  const [departureTime, setDepartureTime] = React.useState("08:00");
  const [smartEnabled, setSmartEnabled] = React.useState(true);
  const [saved, setSaved] = React.useState(false);

  const departureHour = parseInt(departureTime.split(":")[0]);
  const selectedBrand = EV_BRANDS.find(b => b.name === brand);

  const connect = () => {
    setConnecting(true);
    setTimeout(() => { setConnecting(false); setConnected(true); showToast("Laadpaal verbonden", "success", `${brand} · slim laden actief`); }, 1800);
  };

  const save = () => {
    setSaved(true);
    showToast("EV-schema opgeslagen", "success", `Vertrek ${departureTime} · doel ${targetSoc}%`);
  };

  return (
    <PageWrap>
      <div className="dash">
        {/* header */}
        <div className="dash-statusbar">
          <h1 style={{ fontSize: "clamp(24px, 3vw, 34px)" }}>EV-laden</h1>
          <p className="muted" style={{ fontSize: 15.5, marginTop: 6 }}>Laad je elektrische auto op de goedkoopste uren, automatisch gepland.</p>
        </div>

        {/* connect card */}
        <div className="card" style={{ position: "relative", overflow: "hidden" }}>
          {connected && <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "40%", background: `radial-gradient(ellipse at 100% 50%, color-mix(in oklab, ${selectedBrand.color} 12%, transparent), transparent 70%)`, pointerEvents: "none" }} />}
          <div className="between" style={{ flexWrap: "wrap", gap: "var(--sp-6)", position: "relative" }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: "var(--sp-4)" }}>{I.car({ size: 14 })} Laadpaal</div>
              {/* brand selector */}
              <div className="row" style={{ gap: "var(--sp-3)", flexWrap: "wrap", marginBottom: "var(--sp-4)" }}>
                {EV_BRANDS.map(b => (
                  <button key={b.name} onClick={() => { setBrand(b.name); setConnected(false); }} style={{
                    border: `2px solid ${brand === b.name ? b.color : "var(--border)"}`,
                    borderRadius: 12, padding: "8px 18px", fontSize: 14.5, fontWeight: brand === b.name ? 700 : 500,
                    background: brand === b.name ? `color-mix(in oklab, ${b.color} 14%, transparent)` : "var(--surface-2)",
                    color: brand === b.name ? b.color : "var(--text-dim)",
                    cursor: "pointer", transition: "all 0.2s ease",
                  }}>{b.name}</button>
                ))}
              </div>

              {connected ? (
                <div className="row" style={{ gap: 10, color: "var(--accent)", fontWeight: 600, fontSize: 15 }}>
                  {I.check({ size: 18 })} Verbonden met {brand}
                  <button className="btn btn-ghost" style={{ fontSize: 13, padding: "5px 12px", marginLeft: 8 }} onClick={() => setConnected(false)}>Ontkoppelen</button>
                </div>
              ) : (
                <button className="btn btn-primary" onClick={connect} disabled={connecting}>
                  {connecting ? <React.Fragment><span className="spinner" /> Verbinden…</React.Fragment>
                              : <React.Fragment>{I.plug({ size: 17 })} Verbind {brand}</React.Fragment>}
                </button>
              )}
            </div>

            {connected && (
              <div style={{ textAlign: "center" }}>
                <div className="faint" style={{ fontSize: 13, marginBottom: "var(--sp-2)" }}>Laadpaal status</div>
                <div className="row" style={{ gap: 3, justifyContent: "center", marginBottom: 6 }}>
                  <span className="dot pulse" style={{ background: "var(--accent)" }} />
                  <span style={{ fontWeight: 600, color: "var(--accent)", fontSize: 14.5 }}>Slim laden actief</span>
                </div>
                <div className="faint" style={{ fontSize: 12.5 }}>11 kW · {brand}</div>
              </div>
            )}
          </div>
        </div>

        {connected && (
          <React.Fragment>
            {/* vehicle + SoC */}
            <div className="grid-2">
              <div className="card">
                <div className="eyebrow" style={{ marginBottom: "var(--sp-5)" }}>{I.car({ size: 14 })} Voertuig</div>
                <div className="field" style={{ marginBottom: "var(--sp-5)" }}>
                  <label>Auto</label>
                  <select className="select" value={car} onChange={e => setCar(e.target.value)}>
                    {EV_CARS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="between" style={{ marginBottom: "var(--sp-3)" }}>
                  <label style={{ fontWeight: 600, fontSize: 15 }}>Huidige acculading</label>
                  <span className="display tabnum" style={{ fontSize: 22, color: evSoc < 20 ? "var(--price-high)" : "var(--c-charge)" }}>{evSoc}%</span>
                </div>
                <input type="range" min={0} max={100} step={1} value={evSoc} onChange={e => setEvSoc(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--c-charge)", cursor: "pointer", marginBottom: "var(--sp-5)" }} />
                <div className="between" style={{ marginBottom: "var(--sp-3)" }}>
                  <label style={{ fontWeight: 600, fontSize: 15 }}>Doel-laadstand</label>
                  <span className="display tabnum" style={{ fontSize: 22, color: "var(--accent)" }}>{targetSoc}%</span>
                </div>
                <input type="range" min={20} max={100} step={5} value={targetSoc} onChange={e => setTargetSoc(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }} />
              </div>

              <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
                <div className="eyebrow">{I.calendar({ size: 14 })} Vertrekschema</div>
                <TimeSelect label="Vertrektijd" value={departureTime} onChange={v => { setDepartureTime(v); setSaved(false); }} />
                <div className="row" style={{ justifyContent: "space-around", padding: "var(--sp-5) 0" }}>
                  <div style={{ textAlign: "center" }}>
                    <div className="faint" style={{ fontSize: 12.5, marginBottom: 8 }}>Huidige lading</div>
                    <SocRing pct={evSoc} color={evSoc < 20 ? "var(--price-high)" : "var(--c-charge)"} size={90} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", color: "var(--text-faint)", fontSize: 22 }}>→</div>
                  <div style={{ textAlign: "center" }}>
                    <div className="faint" style={{ fontSize: 12.5, marginBottom: 8 }}>Doel</div>
                    <SocRing pct={targetSoc} color="var(--accent)" size={90} />
                  </div>
                </div>
                <button className="btn btn-primary" onClick={save} style={{ marginTop: "auto" }}>
                  {saved ? <React.Fragment>{I.check({ size: 16 })} Schema opgeslagen</React.Fragment>
                         : <React.Fragment>{I.spark({ size: 16 })} Schema toepassen</React.Fragment>}
                </button>
              </div>
            </div>

            {/* schedule */}
            <div className="card">
              <div className="between" style={{ marginBottom: "var(--sp-5)", flexWrap: "wrap", gap: "var(--sp-3)" }}>
                <div>
                  <div className="eyebrow">{I.calendar({ size: 14 })} Laadschema</div>
                  <h3 style={{ fontSize: 22, marginTop: 8 }}>Slim laden naar {targetSoc}% voor {departureTime}</h3>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <span className="faint" style={{ fontSize: 14 }}>Slim laden</span>
                  <div onClick={() => setSmartEnabled(s => !s)} style={{
                    width: 44, height: 24, borderRadius: 12, cursor: "pointer",
                    background: smartEnabled ? "var(--accent)" : "var(--surface-3)",
                    border: "1px solid var(--border)",
                    position: "relative", transition: "background 0.3s ease",
                  }}>
                    <div style={{
                      position: "absolute", top: 3, left: smartEnabled ? "calc(100% - 20px)" : 3,
                      width: 16, height: 16, borderRadius: "50%", background: "white",
                      transition: "left 0.3s cubic-bezier(0.16,0.84,0.44,1)",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                    }} />
                  </div>
                </div>
              </div>
              <ChargeScheduleViz
                departureHour={departureHour}
                targetPct={targetSoc}
                currentPct={evSoc}
                chargeLimit={Demo.chargeLimit * 100}
              />
            </div>
          </React.Fragment>
        )}

        {/* recurring schedule — always visible once connected */}
        {connected && <RecurringSchedule />}

        {/* not connected placeholder */}
        {!connected && (
          <div className="card" style={{ padding: "var(--sp-12)", textAlign: "center" }}>
            <div style={{ width: 80, height: 80, borderRadius: 20, background: "color-mix(in oklab, var(--c-charge) 14%, transparent)", color: "var(--c-charge)", display: "grid", placeItems: "center", margin: "0 auto var(--sp-4)" }}>{I.plug({ size: 38 })}</div>
            <h3 style={{ fontSize: 22, marginBottom: "var(--sp-3)" }}>Verbind je laadpaal</h3>
            <p className="muted" style={{ fontSize: 15.5, maxWidth: 440, margin: "0 auto", textWrap: "pretty" }}>
              Koppel je laadpaal hierboven en BattBrain plant automatisch de goedkoopste laaduren vóór je vertrek.
            </p>
          </div>
        )}
      </div>
    </PageWrap>
  );
}

Object.assign(window, { EvCharging });

/* screen-strategy.jsx — strategy selector + fine-tuning */

const STRAT_PRESETS = {
  max: {
    name: "Max rendement",
    sub: "Aanbevolen",
    desc: "Haal het maximale uit elk prijsverschil — handelen tot de batterijgrenzen.",
    color: "var(--accent)",
    chargeLimit: 10,        // ct/kWh
    dischargeThreshold: 25, // ct/kWh
    targetSoc: 95,
    reserveSoc: 10,
  },
  self: {
    name: "Zelfvoorzienend",
    sub: "Populair",
    desc: "Bewaar lading voor eigen verbruik 's avonds. Minimale netafname.",
    color: "var(--c-charge)",
    chargeLimit: 8,
    dischargeThreshold: 32,
    targetSoc: 100,
    reserveSoc: 20,
  },
  eco: {
    name: "Eco / CO₂-arm",
    sub: "Groen",
    desc: "Laad alleen wanneer het net het groenst is, niet enkel het goedkoopst.",
    color: "var(--c-pv)",
    chargeLimit: 6,
    dischargeThreshold: 28,
    targetSoc: 90,
    reserveSoc: 15,
  },
};

// Detect which preset matches current values (or 'custom')
function detectPreset(vals) {
  for (const [id, p] of Object.entries(STRAT_PRESETS)) {
    if (p.chargeLimit === vals.chargeLimit &&
        p.dischargeThreshold === vals.dischargeThreshold &&
        p.targetSoc === vals.targetSoc &&
        p.reserveSoc === vals.reserveSoc) return id;
  }
  return "custom";
}

/* ---- Impact preview: mini hour grid showing charge/discharge windows ---- */
function ImpactPreview({ chargeLimit, dischargeThreshold }) {
  const uid = React.useMemo(() => "ip" + Math.random().toString(36).substr(2, 4), []);
  const snap = Demo.snapshot();
  const curve = snap.plan.curve;

  const chargeHours  = curve.map((p, h) => p / 100 <= chargeLimit / 100 ? h : null).filter(h => h !== null);
  const dischargeHours = curve.map((p, h) => p / 100 >= dischargeThreshold / 100 ? h : null).filter(h => h !== null);
  const spread = (curve.filter((_, h) => dischargeHours.includes(h)).reduce((s, v) => s + v, 0) / (dischargeHours.length || 1))
               - (curve.filter((_, h) => chargeHours.includes(h)).reduce((s, v) => s + v, 0) / (chargeHours.length || 1));
  const estSavings = Math.max(0, spread / 100 * chargeHours.length * 1.7);

  return (
    <div>
      {/* hour strip */}
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: "var(--sp-4)" }}>
        {curve.map((p, h) => {
          const isCharge   = p / 100 <= chargeLimit / 100;
          const isDischarge = p / 100 >= dischargeThreshold / 100;
          const color = isCharge ? "var(--c-charge)" : isDischarge ? "var(--accent)" : "var(--surface-3)";
          const height = Math.max(6, Math.round((p / Math.max(...curve)) * 36));
          return (
            <div key={h} title={`${String(h).padStart(2,"0")}:00 · ${p.toFixed(1)} ct`} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flex: "1 1 0",
            }}>
              <div style={{
                height, width: "100%", borderRadius: 3,
                background: color,
                opacity: isCharge || isDischarge ? 0.9 : 0.25,
                transition: "all 0.3s ease",
                boxShadow: isCharge ? "0 0 6px var(--c-charge)" : isDischarge ? "0 0 6px var(--accent)" : "none",
              }} />
              {h % 6 === 0 && (
                <span style={{ fontSize: 9.5, color: "var(--text-faint)", lineHeight: 1 }}>
                  {String(h).padStart(2, "0")}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* legend + stats */}
      <div className="row" style={{ gap: "var(--sp-5)", flexWrap: "wrap" }}>
        <div className="row" style={{ gap: 8, fontSize: 13.5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--c-charge)", boxShadow: "0 0 5px var(--c-charge)", flex: "none" }} />
          <span className="faint">{chargeHours.length} laaduren</span>
        </div>
        <div className="row" style={{ gap: 8, fontSize: 13.5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--accent)", boxShadow: "0 0 5px var(--accent)", flex: "none" }} />
          <span className="faint">{dischargeHours.length} ontlaaduren</span>
        </div>
        <div className="faint" style={{ fontSize: 13.5, marginLeft: "auto" }}>
          Verwachte besparing vandaag:&nbsp;
          <strong style={{ color: "var(--accent)" }} className="tabnum">€{estSavings.toFixed(2).replace(".", ",")}</strong>
        </div>
      </div>
    </div>
  );
}

/* ---- Slider with live value display ---- */
function StratSlider({ label, hint, value, onChange, min, max, step, unit, color = "var(--accent)" }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="between" style={{ marginBottom: "var(--sp-2)" }}>
        <div>
          <label style={{ fontWeight: 600, fontSize: 15 }}>{label}</label>
          {hint && <div className="faint" style={{ fontSize: 13 }}>{hint}</div>}
        </div>
        <div className="display tabnum" style={{ fontSize: 24, color }}>{value}{unit}</div>
      </div>
      <div style={{ position: "relative", height: 6, borderRadius: 3, background: "var(--surface-3)", cursor: "pointer" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`,
          borderRadius: 3, background: color,
          boxShadow: `0 0 8px color-mix(in oklab, ${color} 50%, transparent)`,
          transition: "width 0.15s ease",
        }} />
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            position: "absolute", inset: 0, opacity: 0, cursor: "pointer",
            width: "100%", height: "100%", margin: 0,
          }} />
      </div>
      <div className="between faint" style={{ fontSize: 11.5, marginTop: 4 }}>
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

/* ---- Save confirmation ---- */
function SaveConfirm({ saved, onSave }) {
  return (
    <div className="between" style={{ paddingTop: "var(--sp-5)", borderTop: "1px solid var(--border)", flexWrap: "wrap", gap: "var(--sp-3)" }}>
      <span className="faint" style={{ fontSize: 13.5 }}>
        {saved
          ? <span style={{ color: "var(--accent)" }}>{I.check({ size: 15 })} Instellingen opgeslagen &amp; actief</span>
          : "Wijzigingen worden pas actief na opslaan."}
      </span>
      <button className="btn btn-primary" onClick={onSave}>
        {saved ? <React.Fragment>{I.check({ size: 16 })} Opgeslagen</React.Fragment> : <React.Fragment>{I.spark({ size: 16 })} Toepassen</React.Fragment>}
      </button>
    </div>
  );
}

/* ---- PriceAlerts component ---- */
function PriceAlerts() {
  const snap = useDemo();
  const [highAlert, setHighAlert] = React.useState(28);
  const [lowAlert, setLowAlert]   = React.useState(5);
  const [highOn, setHighOn]       = React.useState(true);
  const [lowOn, setLowOn]         = React.useState(true);
  const [saved, setSaved]         = React.useState(false);

  const save = () => {
    setSaved(true);
    showToast("Prijsalerts ingesteld", "success",
      `Hoog: ${highAlert} ct · Laag: ${lowAlert} ct`);
  };

  const priceNow = snap.priceCt;
  const highTriggered = highOn && priceNow >= highAlert;
  const lowTriggered  = lowOn  && priceNow <= lowAlert;

  return (
    <div className="stack" style={{ gap: "var(--sp-6)" }}>
      <div className="grid-2">
        {/* high alert */}
        <div style={{ padding: "var(--sp-5)", borderRadius: 14, border: `2px solid ${highTriggered ? "var(--price-high)" : highOn ? "color-mix(in oklab, var(--price-high) 40%, transparent)" : "var(--border)"}`, background: highTriggered ? "color-mix(in oklab, var(--price-high) 8%, transparent)" : "var(--surface-2)", transition: "all 0.3s ease" }}>
          <div className="between" style={{ marginBottom: "var(--sp-4)" }}>
            <div className="row" style={{ gap: 9 }}>
              <span style={{ color: "var(--price-high)" }}>{I.trend({ size: 18 })}</span>
              <span style={{ fontWeight: 700, fontSize: 15.5 }}>Hoge prijs</span>
              {highTriggered && <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 99, background: "color-mix(in oklab, var(--price-high) 18%, transparent)", color: "var(--price-high)", fontWeight: 700 }}>ACTIEF</span>}
            </div>
            <div onClick={() => setHighOn(s => !s)} style={{ width: 40, height: 22, borderRadius: 11, cursor: "pointer", background: highOn ? "var(--price-high)" : "var(--surface-3)", position: "relative", transition: "background 0.25s ease", border: "1px solid var(--border)" }}>
              <div style={{ position: "absolute", top: 3, left: highOn ? "calc(100% - 18px)" : 3, width: 14, height: 14, borderRadius: "50%", background: "white", transition: "left 0.25s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.35)" }} />
            </div>
          </div>
          <div className="between" style={{ marginBottom: "var(--sp-2)" }}>
            <span className="faint" style={{ fontSize: 13.5 }}>Drempel</span>
            <span className="display tabnum" style={{ fontSize: 22, color: "var(--price-high)" }}>{highAlert} ct</span>
          </div>
          <input type="range" min={15} max={50} step={0.5} value={highAlert} onChange={e => { setHighAlert(Number(e.target.value)); setSaved(false); }} disabled={!highOn}
            style={{ width: "100%", accentColor: "var(--price-high)", opacity: highOn ? 1 : 0.4, cursor: highOn ? "pointer" : "default" }} />
          <p className="faint" style={{ fontSize: 13, marginTop: "var(--sp-3)", textWrap: "pretty" }}>Melding wanneer de prijs boven {highAlert} ct/kWh uitkomt — goed moment om te ontladen.</p>
        </div>

        {/* low alert */}
        <div style={{ padding: "var(--sp-5)", borderRadius: 14, border: `2px solid ${lowTriggered ? "var(--c-charge)" : lowOn ? "color-mix(in oklab, var(--c-charge) 40%, transparent)" : "var(--border)"}`, background: lowTriggered ? "color-mix(in oklab, var(--c-charge) 8%, transparent)" : "var(--surface-2)", transition: "all 0.3s ease" }}>
          <div className="between" style={{ marginBottom: "var(--sp-4)" }}>
            <div className="row" style={{ gap: 9 }}>
              <span style={{ color: "var(--c-charge)" }}>{I.bolt({ size: 18 })}</span>
              <span style={{ fontWeight: 700, fontSize: 15.5 }}>Lage prijs</span>
              {lowTriggered && <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 99, background: "color-mix(in oklab, var(--c-charge) 18%, transparent)", color: "var(--c-charge)", fontWeight: 700 }}>ACTIEF</span>}
            </div>
            <div onClick={() => setLowOn(s => !s)} style={{ width: 40, height: 22, borderRadius: 11, cursor: "pointer", background: lowOn ? "var(--c-charge)" : "var(--surface-3)", position: "relative", transition: "background 0.25s ease", border: "1px solid var(--border)" }}>
              <div style={{ position: "absolute", top: 3, left: lowOn ? "calc(100% - 18px)" : 3, width: 14, height: 14, borderRadius: "50%", background: "white", transition: "left 0.25s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.35)" }} />
            </div>
          </div>
          <div className="between" style={{ marginBottom: "var(--sp-2)" }}>
            <span className="faint" style={{ fontSize: 13.5 }}>Drempel</span>
            <span className="display tabnum" style={{ fontSize: 22, color: "var(--c-charge)" }}>{lowAlert} ct</span>
          </div>
          <input type="range" min={0} max={15} step={0.5} value={lowAlert} onChange={e => { setLowAlert(Number(e.target.value)); setSaved(false); }} disabled={!lowOn}
            style={{ width: "100%", accentColor: "var(--c-charge)", opacity: lowOn ? 1 : 0.4, cursor: lowOn ? "pointer" : "default" }} />
          <p className="faint" style={{ fontSize: 13, marginTop: "var(--sp-3)", textWrap: "pretty" }}>Melding wanneer de prijs onder {lowAlert} ct/kWh zakt — goed moment om te laden.</p>
        </div>
      </div>

      <div className="between" style={{ paddingTop: "var(--sp-4)", borderTop: "1px solid var(--border)", flexWrap: "wrap", gap: "var(--sp-3)" }}>
        <span className="faint" style={{ fontSize: 13.5 }}>
          Huidige prijs: <strong className="tabnum" style={{ color: priceColor(priceNow) }}>{priceNow.toFixed(1).replace(".", ",")} ct</strong>
          {highTriggered && <span style={{ color: "var(--price-high)", marginLeft: 10 }}> ⚠ Hoge prijs actief</span>}
          {lowTriggered  && <span style={{ color: "var(--c-charge)",  marginLeft: 10 }}> ⚡ Lage prijs actief</span>}
        </span>
        <button className="btn btn-primary" onClick={save}>
          {saved ? <React.Fragment>{I.check({ size: 16 })} Opgeslagen</React.Fragment> : <React.Fragment>{I.bell({ size: 16 })} Alerts opslaan</React.Fragment>}
        </button>
      </div>
    </div>
  );
}

/* ---- Main Strategy screen ---- */
function Strategy({ go }) {
  const snap = useDemo();

  // initialise from demo engine live values
  const [vals, setVals] = React.useState({
    chargeLimit:         Math.round(Demo.chargeLimit * 100),
    dischargeThreshold:  Math.round(Demo.dischargeThreshold * 100),
    targetSoc:           Demo.targetSoc,
    reserveSoc:          20,
  });
  const [saved, setSaved] = React.useState(false);
  const preset = detectPreset(vals);

  const set = (k, v) => { setVals(s => ({ ...s, [k]: v })); setSaved(false); };

  const applyPreset = (id) => {
    const p = STRAT_PRESETS[id];
    setVals({ chargeLimit: p.chargeLimit, dischargeThreshold: p.dischargeThreshold, targetSoc: p.targetSoc, reserveSoc: p.reserveSoc });
    setSaved(false);
  };

  const save = () => {
    Demo.chargeLimit         = vals.chargeLimit / 100;
    Demo.dischargeThreshold  = vals.dischargeThreshold / 100;
    Demo.targetSoc           = vals.targetSoc;
    Demo.recompute();
    Demo.emit();
    setSaved(true);
    showToast("Strategie bijgewerkt", "success", `${vals.chargeLimit} ct laden · ${vals.dischargeThreshold} ct ontladen`);
  };

  return (
    <PageWrap>
      <div className="dash">
        {/* header */}
        <div className="dash-statusbar">
          <h1 style={{ fontSize: "clamp(24px, 3vw, 34px)" }}>Strategie</h1>
          <p className="muted" style={{ fontSize: 15.5, marginTop: 6 }}>
            Kies hoe je batterij handelt en pas de drempelwaarden aan op jouw situatie.
          </p>
        </div>

        {/* preset cards */}
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: "var(--sp-5)" }}>{I.strategy({ size: 14 })} Handelsprofiel</div>
          <div className="grid-3" style={{ marginBottom: "var(--sp-2)" }}>
            {Object.entries(STRAT_PRESETS).map(([id, p]) => {
              const active = preset === id;
              return (
                <TiltCard key={id} intensity={5} className="card" onClick={() => applyPreset(id)} style={{
                  padding: "var(--sp-5)",
                  border: `2px solid ${active ? p.color : "var(--border)"}`,
                  background: active ? `color-mix(in oklab, ${p.color} 10%, transparent)` : "var(--surface-2)",
                  cursor: "pointer",
                  transition: "border-color 0.2s ease, background 0.2s ease",
                  position: "relative", overflow: "hidden",
                }}>
                  {active && (
                    <div style={{ position: "absolute", top: 10, right: 10 }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: "50%",
                        background: p.color, display: "grid", placeItems: "center",
                        color: "#06140d", fontWeight: 900, fontSize: 13,
                        boxShadow: `0 4px 12px -4px color-mix(in oklab, ${p.color} 60%, transparent)`,
                      }}>✓</span>
                    </div>
                  )}
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: `color-mix(in oklab, ${p.color} 16%, transparent)`,
                    color: p.color, display: "grid", placeItems: "center",
                    marginBottom: "var(--sp-3)",
                    boxShadow: active ? `0 8px 20px -8px color-mix(in oklab, ${p.color} 40%, transparent)` : "none",
                    transition: "box-shadow 0.25s ease",
                  }}>
                    {I.strategy({ size: 22 })}
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 16, color: active ? p.color : "var(--text)" }}>{p.name}</span>
                    <span style={{ marginLeft: 8, fontSize: 11.5, padding: "2px 7px", borderRadius: 99, background: `color-mix(in oklab, ${p.color} 16%, transparent)`, color: p.color, fontWeight: 600 }}>{p.sub}</span>
                  </div>
                  <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.4, textWrap: "pretty", margin: 0 }}>{p.desc}</p>
                </TiltCard>
              );
            })}
          </div>

          {preset === "custom" && (
            <div className="row muted" style={{ gap: 10, padding: "var(--sp-3) var(--sp-4)", background: "var(--surface-2)", borderRadius: 12, border: "1px solid var(--border)", fontSize: 14, marginTop: "var(--sp-3)" }}>
              {I.spark({ size: 16, style: { color: "var(--accent)" } })}
              Aangepaste instellingen actief — geen standaard profiel geselecteerd.
            </div>
          )}

          <SaveConfirm saved={saved} onSave={save} />
        </div>

        {/* fine tuning */}
        <div className="grid-2">
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: "var(--sp-5)" }}>{I.bolt({ size: 14 })} Prijsdrempels</div>
            <div className="stack" style={{ gap: "var(--sp-7)" }}>
              <StratSlider
                label="Laadgrens"
                hint="Laad de batterij als de stroomprijs hieronder ligt"
                value={vals.chargeLimit}
                onChange={v => set("chargeLimit", v)}
                min={1} max={20} step={0.5} unit=" ct"
                color="var(--c-charge)"
              />
              <StratSlider
                label="Verkoopgrens"
                hint="Lever terug aan het net als de prijs hierboven ligt"
                value={vals.dischargeThreshold}
                onChange={v => set("dischargeThreshold", v)}
                min={10} max={50} step={0.5} unit=" ct"
                color="var(--accent)"
              />
            </div>
            <div style={{ marginTop: "var(--sp-5)", padding: "var(--sp-4)", background: "var(--surface-2)", borderRadius: 12, border: "1px solid var(--border)" }}>
              <div className="faint" style={{ fontSize: 13 }}>Prijsspread</div>
              <div className="display tabnum" style={{ fontSize: 28, color: "var(--accent)", marginTop: 2 }}>
                {Math.max(0, vals.dischargeThreshold - vals.chargeLimit).toFixed(1).replace(".", ",")} ct
              </div>
              <div className="faint" style={{ fontSize: 12.5 }}>verschil laden / ontladen</div>
            </div>
          </div>

          <div className="card">
            <div className="eyebrow" style={{ marginBottom: "var(--sp-5)" }}>{I.battery({ size: 14 })} Batterijbeheer</div>
            <div className="stack" style={{ gap: "var(--sp-7)" }}>
              <StratSlider
                label="Doel-SoC"
                hint="Maximale laadstand bij goedkope uren"
                value={vals.targetSoc}
                onChange={v => set("targetSoc", v)}
                min={50} max={100} step={5} unit="%"
                color="var(--c-pv)"
              />
              <StratSlider
                label="Minimale reserve"
                hint="Houdt altijd minstens dit percentage achter de hand"
                value={vals.reserveSoc}
                onChange={v => set("reserveSoc", v)}
                min={0} max={40} step={5} unit="%"
                color="var(--price-mid)"
              />
            </div>
            <div style={{ marginTop: "var(--sp-5)", padding: "var(--sp-4)", background: "var(--surface-2)", borderRadius: 12, border: "1px solid var(--border)" }}>
              <div className="faint" style={{ fontSize: 13 }}>Handelsmarge</div>
              <div className="display tabnum" style={{ fontSize: 28, color: "var(--c-pv)", marginTop: 2 }}>
                {Math.max(0, vals.targetSoc - vals.reserveSoc)}%
              </div>
              <div className="faint" style={{ fontSize: 12.5 }}>beschikbare bandbreedte</div>
            </div>
          </div>
        </div>

        {/* live impact preview */}
        <div className="card">
          <div className="between" style={{ marginBottom: "var(--sp-5)", flexWrap: "wrap", gap: "var(--sp-3)" }}>
            <div>
              <div className="eyebrow">{I.trend({ size: 14 })} Live impact</div>
              <h3 style={{ fontSize: 22, marginTop: 8 }}>Dagplan op basis van huidige instellingen</h3>
            </div>
            {!saved && (
              <span className="pill" style={{ background: "color-mix(in oklab, var(--price-mid) 14%, transparent)", borderColor: "color-mix(in oklab, var(--price-mid) 40%, transparent)", color: "var(--price-mid)", fontSize: 12.5 }}>
                {I.spark({ size: 13 })} Voorbeeld — nog niet opgeslagen
              </span>
            )}
          </div>
          <ImpactPreview chargeLimit={vals.chargeLimit} dischargeThreshold={vals.dischargeThreshold} />
        </div>

        {/* price alerts */}
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: "var(--sp-5)" }}>{I.bell({ size: 14 })} Prijsalerts</div>
          <PriceAlerts />
        </div>

        {/* tips */}
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: "var(--sp-4)" }}>{I.shield({ size: 14 })} Tips</div>
          <div className="grid-3">
            {[
              ["Kleine laadgrens = minder laden", "Een lagere laadgrens (bijv. 6 ct) betekent dat je batterij alleen bij de goedkoopste uren laadt — perfecter getimed, maar minder kWh totaal.", "var(--c-charge)"],
              ["Hoge verkoopgrens = vaker wachten", "Stel je verkoopgrens te hoog in, dan verkoop je te weinig. Probeer een grens net boven het daggemiddelde van 15–20 ct.", "var(--accent)"],
              ["Reserve voor thuisverbruik", "Met een reserve-SoC van 20–30% houd je altijd genoeg lading achter de hand voor je eigen verbruik 's avonds.", "var(--c-pv)"],
            ].map(([title, body, color], i) => (
              <div key={i} style={{ padding: "var(--sp-4)", background: "var(--surface-2)", borderRadius: 14, border: "1px solid var(--border)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}`, marginBottom: "var(--sp-3)" }} />
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{title}</div>
                <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.45, textWrap: "pretty", margin: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageWrap>
  );
}

Object.assign(window, { Strategy });

/* screen-settings.jsx — Inverter · Provider · Battery config */

const INVERTERS = {
  Solis:   { portal: "SolisCloud", fields: [["apiKey","API Key","text"],["secret","API Secret","password"],["station","Station ID","text"]] },
  GoodWe:  { portal: "SEMS Portal", fields: [["apiKey","E-mailadres","email"],["secret","Wachtwoord","password"],["station","Plant ID","text"]] },
  Growatt: { portal: "ShinePhone",  fields: [["apiKey","E-mailadres","email"],["secret","Wachtwoord","password"],["station","Serienummer omvormer","text"]] },
  Huawei:  { portal: "FusionSolar", fields: [["apiKey","Gebruikersnaam","text"],["secret","Systeemwachtwoord","password"],["station","Plant ID","text"]] },
};
const PROVIDERS = {
  "Frank Energie": { token: false },
  "Tibber":        { token: true,  tokenLabel: "Tibber API-token" },
  "ENTSO-E":       { token: true,  tokenLabel: "ENTSO-E security token" },
  "Energie Zero":  { token: false },
};
const BATTERY_BRANDS = ["BYD", "Pylontech", "Dyness", "FoxESS", "Victron", "Huawei LUNA", "Overig"];

/* ---- reusable sub-components ---- */
function SectionHeader({ icon, title, sub }) {
  return (
    <div className="row" style={{ gap: "var(--sp-3)", marginBottom: "var(--sp-5)" }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--surface-3)", color: "var(--accent)", flex: "none" }}>{icon}</div>
      <div>
        <h3 style={{ fontSize: 20 }}>{title}</h3>
        {sub && <div className="faint" style={{ fontSize: 13.5, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function SaveBar({ saved, onSave, hint }) {
  return (
    <div className="between" style={{ marginTop: "var(--sp-6)", paddingTop: "var(--sp-5)", borderTop: "1px solid var(--border)", flexWrap: "wrap", gap: "var(--sp-3)" }}>
      <div className="faint" style={{ fontSize: 13.5 }}>{hint}</div>
      <button className="btn btn-primary" onClick={onSave}>
        {saved ? <React.Fragment>{I.check({ size: 17 })} Opgeslagen</React.Fragment> : "Opslaan"}
      </button>
    </div>
  );
}

function SettingsSlider({ label, hint, value, onChange, min, max, step, unit, color = "var(--accent)" }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="between" style={{ marginBottom: "var(--sp-2)" }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{label}</div>
          {hint && <div className="faint" style={{ fontSize: 13 }}>{hint}</div>}
        </div>
        <div className="display tabnum" style={{ fontSize: 22, color }}>{value}{unit}</div>
      </div>
      <div style={{ position: "relative", height: 6, borderRadius: 3, background: "var(--surface-3)" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, borderRadius: 3, background: color, boxShadow: `0 0 7px color-mix(in oklab, ${color} 45%, transparent)`, transition: "width 0.15s" }} />
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%", margin: 0 }} />
      </div>
      <div className="between faint" style={{ fontSize: 11.5, marginTop: 4 }}>
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

/* ---- Omvormer sectie ---- */
function InverterForm() {
  const [brand, setBrand] = React.useState("Solis");
  const [vals, setVals]   = React.useState({ apiKey: "", secret: "", station: "" });
  const [test, setTest]   = React.useState({ state: "idle", msg: "" });
  const [saved, setSaved] = React.useState(false);
  const cfg = INVERTERS[brand];
  const set = (k, v) => { setVals(s => ({ ...s, [k]: v })); setSaved(false); };

  const runTest = () => {
    if (cfg.fields.some(([k]) => !vals[k].trim())) { setTest({ state: "err", msg: "Vul eerst alle velden in." }); return; }
    setTest({ state: "loading", msg: "" });
    setTimeout(() => setTest({ state: "ok", msg: `Verbinding gelukt · SoC ${Demo.snapshot().soc}%` }), 1400);
  };

  return (
    <div className="card">
      <SectionHeader icon={I.plug({ size: 22 })} title="Omvormer" sub="Koppel je omvormer zodat BattBrain kan sturen" />
      <div className="stack" style={{ gap: "var(--sp-5)" }}>
        <div className="field">
          <label>Merk &amp; portal</label>
          <select className="select" value={brand} onChange={e => { setBrand(e.target.value); setVals({ apiKey: "", secret: "", station: "" }); setTest({ state: "idle", msg: "" }); setSaved(false); }}>
            {Object.keys(INVERTERS).map(b => <option key={b} value={b}>{b} ({INVERTERS[b].portal})</option>)}
          </select>
        </div>
        {cfg.fields.map(([k, label, type]) => (
          <div className="field" key={k}>
            <label>{label}</label>
            <input className="input" type={type === "password" ? "password" : type} value={vals[k]} onChange={e => set(k, e.target.value)} placeholder={label} />
          </div>
        ))}
        <div className="row" style={{ gap: "var(--sp-3)", flexWrap: "wrap" }}>
          <button className="btn btn-ghost" onClick={runTest} disabled={test.state === "loading"}>
            {test.state === "loading" ? <React.Fragment><span className="spinner" /> Verbinden…</React.Fragment> : <React.Fragment>{I.spark({ size: 16 })} Test verbinding</React.Fragment>}
          </button>
          {test.state === "ok"  && <span className="row" style={{ gap: 7, color: "var(--accent)", fontWeight: 600, fontSize: 14.5 }}>{I.check({ size: 16 })}{test.msg}</span>}
          {test.state === "err" && <span className="row" style={{ gap: 7, color: "var(--price-high)", fontWeight: 600, fontSize: 14.5 }}>{I.close({ size: 16 })}{test.msg}</span>}
        </div>
      </div>
      <SaveBar saved={saved} onSave={() => setSaved(true)} hint="Inloggegevens worden versleuteld opgeslagen." />
    </div>
  );
}

/* ---- Provider sectie ---- */
function ProviderForm() {
  const [prov, setProv]   = React.useState("Frank Energie");
  const [token, setToken] = React.useState("");
  const [saved, setSaved] = React.useState(false);
  const cfg = PROVIDERS[prov];

  return (
    <div className="card">
      <SectionHeader icon={I.cloud({ size: 22 })} title="Energieprovider" sub="Bron voor de dynamische uurprijzen" />
      <div className="stack" style={{ gap: "var(--sp-5)" }}>
        <div className="field">
          <label>Provider</label>
          <select className="select" value={prov} onChange={e => { setProv(e.target.value); setSaved(false); }}>
            {Object.keys(PROVIDERS).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        {cfg.token ? (
          <div className="field">
            <label>{cfg.tokenLabel}</label>
            <input className="input" value={token} onChange={e => { setToken(e.target.value); setSaved(false); }} placeholder="Plak je token" />
            <span className="hint">Te vinden in je {prov}-account onder Ontwikkelaar / API.</span>
          </div>
        ) : (
          <div className="row muted" style={{ gap: 10, padding: "var(--sp-4)", background: "var(--surface-2)", borderRadius: 12, border: "1px solid var(--border)", fontSize: 14.5 }}>
            {I.check({ size: 18, style: { color: "var(--accent)" } })} Geen token nodig — prijzen worden automatisch opgehaald.
          </div>
        )}
      </div>
      <SaveBar saved={saved} onSave={() => setSaved(true)} hint="Prijzen worden elke dag om 13:00 ververst." />
    </div>
  );
}

/* ---- Batterij-configuratie sectie ---- */
function BatteryForm() {
  const snap = useDemo();
  const [battBrand, setBattBrand] = React.useState("BYD");
  const [capacity, setCapacity]   = React.useState(10.0);
  const [maxCharge, setMaxCharge] = React.useState(5.0);
  const [maxDisch, setMaxDisch]   = React.useState(5.0);
  const [minSoc, setMinSoc]       = React.useState(10);
  const [saved, setSaved]         = React.useState(false);
  const save = () => { setSaved(true); showToast("Batterij-configuratie opgeslagen", "success", `${capacity} kWh · max ${maxCharge} kW laden`); };

  // Calculated stats
  const chargeTime  = Math.round((capacity * (1 - minSoc / 100)) / maxCharge * 10) / 10;
  const maxCycles   = Math.round(capacity * 365 * 0.8 / (maxCharge * 2));

  return (
    <div className="card">
      <SectionHeader icon={I.battery({ size: 22 })} title="Batterij-configuratie" sub="Capaciteit en laadlimieten voor optimale levensduur" />
      <div className="stack" style={{ gap: "var(--sp-6)" }}>
        <div className="field">
          <label>Batterijmerk / model</label>
          <select className="select" value={battBrand} onChange={e => { setBattBrand(e.target.value); setSaved(false); }}>
            {BATTERY_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <SettingsSlider label="Capaciteit" hint="Bruikbare capaciteit van je batterij" value={capacity} onChange={v => { setCapacity(v); setSaved(false); }} min={2.5} max={30} step={0.5} unit=" kWh" color="var(--c-pv)" />
        <SettingsSlider label="Max. laadvermogen" hint="Maximaal toegestaan AC-laadvermogen" value={maxCharge} onChange={v => { setMaxCharge(v); setSaved(false); }} min={1} max={15} step={0.5} unit=" kW" color="var(--c-charge)" />
        <SettingsSlider label="Max. ontlaadvermogen" hint="Maximaal toegestaan AC-ontlaadvermogen" value={maxDisch} onChange={v => { setMaxDisch(v); setSaved(false); }} min={1} max={15} step={0.5} unit=" kW" color="var(--c-discharge)" />
        <SettingsSlider label="Minimale SoC-reserve" hint="Bewaar altijd minstens dit percentage" value={minSoc} onChange={v => { setMinSoc(v); setSaved(false); }} min={0} max={40} step={5} unit="%" color="var(--price-mid)" />

        {/* calculated stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--sp-3)" }}>
          {[
            ["Laadtijd (leeg→vol)", `${chargeTime} u`, "var(--c-charge)"],
            ["Gebruiksbandbreedte", `${Math.round(capacity * (1 - minSoc / 100) * 10) / 10} kWh`, "var(--c-pv)"],
            ["Est. cycli/jaar", `${maxCycles}`, "var(--accent)"],
          ].map(([l, v, c]) => (
            <div key={l} style={{ padding: "var(--sp-4)", background: "var(--surface-2)", borderRadius: 12, border: "1px solid var(--border)", textAlign: "center" }}>
              <div className="faint" style={{ fontSize: 12, marginBottom: 4 }}>{l}</div>
              <div className="display tabnum" style={{ fontSize: 20, color: c }}>{v}</div>
            </div>
          ))}
        </div>

        {/* health note */}
        <div className="row" style={{ gap: 10, padding: "var(--sp-4)", background: "color-mix(in oklab, var(--accent) 7%, transparent)", borderRadius: 12, border: "1px solid color-mix(in oklab, var(--accent) 30%, transparent)", fontSize: 14 }}>
          {I.shield({ size: 17, style: { color: "var(--accent)", flexShrink: 0 } })}
          <span className="muted">BattBrain houdt automatisch rekening met de maximale laadsnelheid van je batterij om de levensduur te verlengen.</span>
        </div>
      </div>
      <SaveBar saved={saved} onSave={save} hint="Wordt direct toegepast op het handelsalgoritme." />
    </div>
  );
}

/* ---- Main Settings ---- */
function Settings({ go }) {
  const [tab, setTab] = React.useState("omvormer");
  const tabs = [
    ["omvormer",  "Omvormer",  I.plug({ size: 16 })],
    ["provider",  "Provider",  I.cloud({ size: 16 })],
    ["batterij",  "Batterij",  I.battery({ size: 16 })],
  ];

  return (
    <div className="dash">
      <div className="dash-statusbar">
        <h1 style={{ fontSize: "clamp(24px, 3vw, 34px)" }}>Instellingen</h1>
        <p className="muted" style={{ fontSize: 15.5, marginTop: 6 }}>Koppel je hardware en configureer je batterij.</p>
      </div>

      {/* tab bar */}
      <div className="row" style={{ gap: 4, padding: 4, borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border)", alignSelf: "flex-start", flexWrap: "wrap" }}>
        {tabs.map(([k, l, ic]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            display: "flex", alignItems: "center", gap: 8,
            border: 0, borderRadius: 10, padding: "9px 18px",
            fontSize: 14, fontWeight: 600,
            background: tab === k ? "var(--accent)" : "transparent",
            color: tab === k ? "#04130c" : "var(--text-dim)",
            cursor: "pointer", transition: "all 0.2s ease",
          }}>{ic}{l}</button>
        ))}
      </div>

      {tab === "omvormer" && <InverterForm />}
      {tab === "provider" && <ProviderForm />}
      {tab === "batterij" && <BatteryForm />}
    </div>
  );
}

Object.assign(window, { Settings });

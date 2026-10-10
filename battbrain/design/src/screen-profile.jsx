/* screen-profile.jsx — user profile, billing, connected services, danger zone */

const AVATAR_COLORS = [
  ["#2fd07a","#0a2e1a"],
  ["#4f8cff","#0a1e3a"],
  ["#f5a623","#2e1a0a"],
  ["#8b7bff","#1a0e3a"],
  ["#18c2c2","#0a2e2e"],
];

function AvatarRing({ initials, size = 72, colorIdx = 0 }) {
  const [bg, fg] = AVATAR_COLORS[colorIdx % AVATAR_COLORS.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `radial-gradient(135deg, ${bg}, color-mix(in oklab, ${bg} 70%, black))`,
      color: fg, display: "grid", placeItems: "center",
      fontSize: size * 0.36, fontWeight: 800, letterSpacing: "-0.02em",
      boxShadow: `0 0 0 3px var(--surface), 0 0 0 5px color-mix(in oklab, ${bg} 50%, transparent), 0 8px 24px -8px color-mix(in oklab, ${bg} 40%, transparent)`,
      fontFamily: "var(--font-display)",
      flex: "none",
      transition: "box-shadow 0.3s ease",
    }}>
      {initials}
    </div>
  );
}

function ProfileSection({ icon, title, children }) {
  return (
    <div className="card">
      <div className="row" style={{ gap: "var(--sp-3)", marginBottom: "var(--sp-5)" }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: "var(--surface-3)", display: "grid", placeItems: "center", color: "var(--accent)", flex: "none" }}>{icon}</div>
        <h3 style={{ fontSize: 19, fontWeight: 700 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function FieldRow({ label, value, type = "text", hint, onChange }) {
  const [editing, setEditing] = React.useState(false);
  const [val, setVal] = React.useState(value);
  const [saved, setSaved] = React.useState(false);

  const save = () => {
    setEditing(false);
    setSaved(true);
    onChange && onChange(val);
    setTimeout(() => setSaved(false), 3000);
  };
  const cancel = () => { setEditing(false); setVal(value); };

  return (
    <div style={{ padding: "var(--sp-4) 0", borderBottom: "1px solid var(--border)" }}>
      <div className="between" style={{ marginBottom: editing ? "var(--sp-3)" : 0, flexWrap: "wrap", gap: "var(--sp-3)" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="faint" style={{ fontSize: 12.5, marginBottom: 3 }}>{label}</div>
          {!editing && (
            <div style={{ fontSize: 15.5, fontWeight: 500 }}>
              {type === "password" ? "••••••••••••" : val}
              {saved && <span style={{ color: "var(--accent)", marginLeft: 10, fontSize: 13 }}>{I.check({ size: 14 })} Opgeslagen</span>}
            </div>
          )}
        </div>
        {!editing && (
          <button className="btn btn-ghost" style={{ fontSize: 13, padding: "6px 14px", flex: "none" }} onClick={() => setEditing(true)}>
            {I.edit({ size: 14 })} Wijzigen
          </button>
        )}
      </div>
      {editing && (
        <div className="stack" style={{ gap: "var(--sp-3)" }}>
          <input
            className="input" type={type} value={val}
            onChange={e => setVal(e.target.value)}
            placeholder={label}
            autoFocus
          />
          {hint && <span className="hint">{hint}</span>}
          <div className="row" style={{ gap: "var(--sp-3)" }}>
            <button className="btn btn-primary" style={{ padding: "8px 20px" }} onClick={save}>{I.check({ size: 15 })} Opslaan</button>
            <button className="btn btn-ghost" style={{ padding: "8px 16px" }} onClick={cancel}>Annuleren</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ConnectedService({ name, icon, color, connected, onToggle }) {
  return (
    <div className="between" style={{ padding: "var(--sp-4)", background: "var(--surface-2)", borderRadius: 14, border: `1px solid ${connected ? `color-mix(in oklab, ${color} 40%, transparent)` : "var(--border)"}`, transition: "border-color 0.3s ease" }}>
      <div className="row" style={{ gap: "var(--sp-3)" }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: `color-mix(in oklab, ${color} 14%, transparent)`, color, display: "grid", placeItems: "center", flex: "none" }}>{icon}</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{name}</div>
          <div className="faint" style={{ fontSize: 13 }}>{connected ? "Verbonden" : "Niet verbonden"}</div>
        </div>
      </div>
      <div className="row" style={{ gap: "var(--sp-3)" }}>
        {connected && <span className="row" style={{ gap: 5, color, fontSize: 13, fontWeight: 600 }}>{I.check({ size: 14 })} Actief</span>}
        <button className={`btn ${connected ? "btn-ghost" : "btn-primary"}`} style={{ fontSize: 13, padding: "7px 16px" }} onClick={onToggle}>
          {connected ? "Ontkoppelen" : "Verbinden"}
        </button>
      </div>
    </div>
  );
}

/* ---- Billing history ---- */
const MOCK_INVOICES = [
  { date: "1 jun 2026", amount: "€6,95", status: "Betaald" },
  { date: "1 mei 2026", amount: "€6,95", status: "Betaald" },
  { date: "1 apr 2026", amount: "€6,95", status: "Betaald" },
  { date: "1 mrt 2026", amount: "€6,95", status: "Betaald" },
];

/* ---- Main Profile component ---- */
function Profile({ go }) {
  const [name, setName]   = React.useState("Jan de Vries");
  const [email, setEmail] = React.useState("jan@example.nl");
  const [colorIdx] = React.useState(0);
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const [services, setServices] = React.useState({
    solis: true, goodwe: false, tibber: true, frank: false,
  });
  const toggleService = (k) => setServices(s => ({ ...s, [k]: !s[k] }));

  const [showDanger, setShowDanger] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState("");

  return (
    <PageWrap>
      <div className="dash">
        {/* header */}
        <div className="dash-statusbar">
          <h1 style={{ fontSize: "clamp(24px, 3vw, 34px)" }}>Profiel</h1>
          <p className="muted" style={{ fontSize: 15.5, marginTop: 6 }}>Beheer je account, koppelingen en abonnement.</p>
        </div>

        {/* profile hero */}
        <div className="card" style={{ padding: "var(--sp-8)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "-20%", right: "-5%", width: 300, height: 250, borderRadius: "50%", background: `radial-gradient(circle, color-mix(in oklab, var(--accent) 14%, transparent), transparent 70%)`, filter: "blur(40px)", pointerEvents: "none" }} />
          <div className="row" style={{ gap: "var(--sp-6)", flexWrap: "wrap", position: "relative", alignItems: "flex-start" }}>
            <AvatarRing initials={initials} size={88} colorIdx={colorIdx} />
            <div style={{ flex: 1 }}>
              <div className="display" style={{ fontSize: "clamp(22px, 2.8vw, 34px)", marginBottom: 4 }}>{name}</div>
              <div className="faint" style={{ fontSize: 15, marginBottom: "var(--sp-4)" }}>{email}</div>
              <div className="row" style={{ gap: "var(--sp-3)", flexWrap: "wrap" }}>
                <span className="pill" style={{ background: "color-mix(in oklab, var(--accent) 14%, transparent)", borderColor: "color-mix(in oklab, var(--accent) 40%, transparent)", color: "var(--accent)" }}>
                  {I.crown({ size: 14 })} Plus
                </span>
                <span className="pill">{I.calendar({ size: 14 })} Lid sinds februari 2026</span>
                <span className="pill">{I.shield({ size: 14 })} Geverifieerd</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="faint" style={{ fontSize: 12.5 }}>Totale besparing</div>
              <div className="display tabnum" style={{ fontSize: 36, color: "var(--accent)", lineHeight: 1.1 }}>
                <CountUp value={247.80} prefix="€" decimals={2} duration={1600} />
              </div>
              <div className="faint" style={{ fontSize: 12.5 }}>sinds aanmelding</div>
            </div>
          </div>
        </div>

        {/* personal details */}
        <ProfileSection icon={I.user({ size: 20 })} title="Persoonlijke gegevens">
          <FieldRow label="Naam" value={name} onChange={setName} hint="Zo wordt je begroet in de app." />
          <FieldRow label="E-mailadres" value={email} type="email" onChange={setEmail} hint="Voor facturen en meldingen." />
          <FieldRow label="Wachtwoord" value="geheim" type="password" hint="Minimaal 8 tekens, inclusief een cijfer." />
          <div style={{ paddingTop: "var(--sp-3)" }}>
            <div className="faint" style={{ fontSize: 12.5 }}>
              Twee-factor-authenticatie: <span style={{ color: "var(--c-pv)", fontWeight: 600 }}>Niet ingesteld</span>
              <button className="btn btn-ghost" style={{ marginLeft: 12, fontSize: 12.5, padding: "4px 10px" }} onClick={() => showToast("2FA is in bèta", "info", "Binnenkort beschikbaar")}>Instellen</button>
            </div>
          </div>
        </ProfileSection>

        {/* connected services */}
        <ProfileSection icon={I.plug({ size: 20 })} title="Gekoppelde diensten">
          <div className="stack" style={{ gap: "var(--sp-3)" }}>
            <ConnectedService name="Solis / SolisCloud" icon={I.bolt({ size: 20 })} color="var(--c-charge)"  connected={services.solis}  onToggle={() => { toggleService("solis"); showToast(services.solis ? "Solis ontkoppeld" : "Solis verbonden", services.solis ? "info" : "success"); }} />
            <ConnectedService name="GoodWe / SEMS"      icon={I.bolt({ size: 20 })} color="var(--accent)"    connected={services.goodwe} onToggle={() => { toggleService("goodwe"); showToast(services.goodwe ? "GoodWe ontkoppeld" : "GoodWe verbonden", services.goodwe ? "info" : "success"); }} />
            <ConnectedService name="Tibber"              icon={I.cloud({ size: 20 })} color="var(--c-pv)"    connected={services.tibber} onToggle={() => { toggleService("tibber"); showToast(services.tibber ? "Tibber ontkoppeld" : "Tibber verbonden", services.tibber ? "info" : "success"); }} />
            <ConnectedService name="Frank Energie"       icon={I.cloud({ size: 20 })} color="var(--price-mid)" connected={services.frank} onToggle={() => { toggleService("frank"); showToast(services.frank ? "Frank ontkoppeld" : "Frank verbonden", services.frank ? "info" : "success"); }} />
          </div>
        </ProfileSection>

        {/* billing */}
        <ProfileSection icon={I.tag({ size: 20 })} title="Abonnement &amp; facturen">
          <div className="between" style={{ padding: "var(--sp-5)", background: "color-mix(in oklab, var(--accent) 8%, transparent)", border: "1px solid color-mix(in oklab, var(--accent) 40%, transparent)", borderRadius: 14, marginBottom: "var(--sp-5)" }}>
            <div>
              <div className="row" style={{ gap: 10, marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 16, color: "var(--accent)" }}>BattBrain Plus</span>
                <span className="pill" style={{ background: "color-mix(in oklab, var(--accent) 16%, transparent)", borderColor: "color-mix(in oklab, var(--accent) 40%, transparent)", color: "var(--accent)", fontSize: 11.5 }}>Actief</span>
              </div>
              <div className="faint" style={{ fontSize: 14 }}>€6,95 per maand · volgende betaling 1 jul 2026</div>
            </div>
            <button className="btn btn-ghost" style={{ fontSize: 13, padding: "8px 16px" }} onClick={() => go("subscription")}>Beheren</button>
          </div>

          <div className="eyebrow" style={{ marginBottom: "var(--sp-3)" }}>{I.report({ size: 13 })} Betalingsgeschiedenis</div>
          <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)" }}>
            {MOCK_INVOICES.map((inv, i) => (
              <div key={i} className="between" style={{ padding: "var(--sp-3) var(--sp-4)", background: i % 2 === 0 ? "transparent" : "color-mix(in oklab, var(--text) 2%, transparent)", borderTop: i ? "1px solid var(--border)" : "none" }}>
                <span style={{ fontSize: 14.5 }}>{inv.date}</span>
                <span className="tabnum" style={{ fontWeight: 600, fontSize: 14.5 }}>{inv.amount}</span>
                <span style={{ fontSize: 13, color: "var(--accent)" }}>{I.check({ size: 14 })} {inv.status}</span>
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => showToast("Factuur gedownload", "success", `${inv.date} · ${inv.amount}`)}>
                  {I.download({ size: 13 })} PDF
                </button>
              </div>
            ))}
          </div>
        </ProfileSection>

        {/* notifications prefs */}
        <ProfileSection icon={I.bell({ size: 20 })} title="Meldingsvoorkeuren">
          <div className="stack" style={{ gap: 0 }}>
            {[
              ["Push-meldingen bij actiewijziging", true],
              ["Dagelijks bespaarrapport",           true],
              ["Wekelijkse samenvatting (e-mail)",   false],
              ["Prijsalerts (real-time)",            true],
              ["Nieuws &amp; updates",               false],
            ].map(([label, def], i) => {
              const [on, setOn] = React.useState(def);
              return (
                <div key={i} className="between" style={{ padding: "var(--sp-3) 0", borderBottom: i < 4 ? "1px solid var(--border)" : "none" }}>
                  <span style={{ fontSize: 15, dangerouslySetInnerHTML: undefined }}>{label}</span>
                  <div onClick={() => { setOn(s => !s); showToast(on ? "Melding uitgeschakeld" : "Melding ingeschakeld", "info"); }} style={{
                    width: 44, height: 24, borderRadius: 12, cursor: "pointer",
                    background: on ? "var(--accent)" : "var(--surface-3)",
                    border: "1px solid var(--border)",
                    position: "relative", transition: "background 0.3s ease",
                  }}>
                    <div style={{ position: "absolute", top: 3, left: on ? "calc(100% - 20px)" : 3, width: 16, height: 16, borderRadius: "50%", background: "white", transition: "left 0.3s cubic-bezier(0.16,0.84,0.44,1)", boxShadow: "0 2px 4px rgba(0,0,0,0.3)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </ProfileSection>

        {/* danger zone */}
        <div className="card" style={{ border: "1px solid color-mix(in oklab, var(--price-high) 35%, transparent)" }}>
          <div className="between" style={{ cursor: "pointer" }} onClick={() => setShowDanger(s => !s)}>
            <div className="row" style={{ gap: "var(--sp-3)" }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: "color-mix(in oklab, var(--price-high) 12%, transparent)", color: "var(--price-high)", display: "grid", placeItems: "center" }}>{I.warning({ size: 20 })}</div>
              <div>
                <h3 style={{ fontSize: 17, color: "var(--price-high)" }}>Gevarenzone</h3>
                <div className="faint" style={{ fontSize: 13 }}>Account verwijderen of abonnement opzeggen</div>
              </div>
            </div>
            <div style={{ color: "var(--text-faint)", transform: showDanger ? "rotate(180deg)" : "none", transition: "transform 0.3s ease" }}>{I.arrowDown({ size: 18 })}</div>
          </div>

          {showDanger && (
            <div style={{ marginTop: "var(--sp-5)", paddingTop: "var(--sp-5)", borderTop: "1px solid color-mix(in oklab, var(--price-high) 25%, transparent)" }}>
              <div className="grid-2" style={{ gap: "var(--sp-4)", marginBottom: "var(--sp-6)" }}>
                <div style={{ padding: "var(--sp-5)", background: "var(--surface-2)", borderRadius: 14, border: "1px solid var(--border)" }}>
                  <h4 style={{ fontSize: 16, marginBottom: 6 }}>Abonnement opzeggen</h4>
                  <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.45, marginBottom: "var(--sp-4)" }}>Je behoudt Plus tot einde van de betaalperiode (1 jul 2026). Daarna terugval naar gratis.</p>
                  <button className="btn btn-ghost" style={{ borderColor: "color-mix(in oklab, var(--price-mid) 50%, transparent)", color: "var(--price-mid)", fontSize: 13.5 }} onClick={() => showToast("Opzegging verwerkt", "warning", "Plus loopt door tot 1 jul 2026")}>
                    Opzeggen
                  </button>
                </div>
                <div style={{ padding: "var(--sp-5)", background: "color-mix(in oklab, var(--price-high) 6%, transparent)", borderRadius: 14, border: "1px solid color-mix(in oklab, var(--price-high) 25%, transparent)" }}>
                  <h4 style={{ fontSize: 16, marginBottom: 6, color: "var(--price-high)" }}>Account verwijderen</h4>
                  <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.45, marginBottom: "var(--sp-4)" }}>Alle gegevens worden permanent verwijderd. Dit kan niet ongedaan worden gemaakt.</p>
                  <div className="field" style={{ marginBottom: "var(--sp-3)" }}>
                    <input className="input" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                      placeholder={`Typ "${email}" om te bevestigen`}
                      style={{ borderColor: "color-mix(in oklab, var(--price-high) 30%, transparent)", fontSize: 13 }} />
                  </div>
                  <button className="btn" disabled={deleteConfirm !== email}
                    style={{ background: deleteConfirm === email ? "var(--price-high)" : "var(--surface-3)", color: deleteConfirm === email ? "white" : "var(--text-faint)", border: 0, borderRadius: 10, padding: "8px 18px", fontSize: 13.5, fontWeight: 700, cursor: deleteConfirm === email ? "pointer" : "not-allowed" }}
                    onClick={() => { if (deleteConfirm === email) { showToast("Account verwijderd", "warning"); go("landing"); } }}>
                    {I.trash({ size: 15 })} Permanent verwijderen
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrap>
  );
}

Object.assign(window, { Profile });

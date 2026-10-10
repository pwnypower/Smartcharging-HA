/* screen-dashboard.jsx */

function Banner({ tone, icon, title, body, cta, onCta, onClose }) {
  const c = tone === "warn" ? "var(--price-mid)" : "var(--c-charge)";
  return (
    <div className="card fade-up" style={{
      padding: "var(--sp-4) var(--sp-5)", borderColor: `color-mix(in oklab, ${c} 45%, transparent)`,
      background: `color-mix(in oklab, ${c} 12%, var(--surface))`,
    }}>
      <div className="between" style={{ flexWrap: "wrap", gap: "var(--sp-4)" }}>
        <div className="row" style={{ gap: "var(--sp-4)" }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, display: "grid", placeItems: "center", color: c, background: `color-mix(in oklab, ${c} 18%, transparent)`, flex: "none" }}>{icon}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
            <div className="muted" style={{ fontSize: 14.5 }}>{body}</div>
          </div>
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
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
      <div className="card-label">{label}</div>
      {children}
      {sub && <div className="faint" style={{ fontSize: 13.5, marginTop: "auto" }}>{sub}</div>}
    </div>
  );
}

function ThresholdItem({ icon, tone, label, value }) {
  return (
    <div className="row" style={{ gap: "var(--sp-3)", padding: "var(--sp-3) 0" }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", color: tone, background: `color-mix(in oklab, ${tone} 15%, transparent)`, flex: "none" }}>{icon}</div>
      <div className="grow"><div className="faint" style={{ fontSize: 13 }}>{label}</div>
        <div className="display tabnum" style={{ fontSize: 22 }}>{value}</div></div>
    </div>
  );
}

function SummaryStat({ icon, tone, label, value, unit }) {
  return (
    <div style={{ padding: "var(--sp-4)", borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
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

function Dashboard({ flags, go }) {
  const snap = useDemo();
  const [sub, setSub] = React.useState(flags.showSub);
  const [cfg, setCfg] = React.useState(flags.showConfig);
  React.useEffect(() => setSub(flags.showSub), [flags.showSub]);
  React.useEffect(() => setCfg(flags.showConfig), [flags.showConfig]);
  const p = snap.plan;

  return (
    <div className="dash">
      {/* status bar */}
      <div className="between dash-statusbar" style={{ flexWrap: "wrap", gap: "var(--sp-4)" }}>
        <div className="row" style={{ gap: "var(--sp-3)", flexWrap: "wrap" }}>
          <h1 style={{ fontSize: "clamp(24px, 3vw, 34px)" }}>Dashboard</h1>
          <div className="pill" style={ flags.active
            ? { background: "color-mix(in oklab, var(--accent) 14%, transparent)", borderColor: "color-mix(in oklab, var(--accent) 40%, transparent)", color: "var(--accent)" }
            : { background: "color-mix(in oklab, var(--text) 8%, transparent)", color: "var(--text-dim)" }}>
            <span className={"dot" + (flags.active ? " pulse" : "")} style={{ background: flags.active ? "var(--accent)" : "var(--text-faint)" }} />
            {flags.active ? "Actief" : "Inactief"}
          </div>
          {flags.demoMode && <div className="pill" style={{ background: "color-mix(in oklab, var(--c-pv) 14%, transparent)", borderColor: "color-mix(in oklab, var(--c-pv) 40%, transparent)", color: "var(--c-pv)" }}>Demo-modus</div>}
        </div>
        <div className="row faint" style={{ gap: 8, fontSize: 14.5 }}>{I.clock({ size: 16 })}<span className="tabnum">Vandaag · {snap.clock}</span></div>
      </div>

      {/* banners */}
      {(sub || cfg) && (
        <div className="stack" style={{ gap: "var(--sp-3)" }}>
          {sub && <Banner tone="warn" icon={I.crown({ size: 20 })} title="Start je abonnement"
            body="Activeer Stroomslim Plus om automatisch te blijven handelen — €6,95/mnd." cta="Abonneren" onCta={() => go("subscription")} onClose={() => setSub(false)} />}
          {cfg && <Banner tone="info" icon={I.settings({ size: 20 })} title="Nog geen omvormer ingesteld"
            body="Koppel je omvormer en energieprovider om te beginnen met optimaliseren." cta="Instellingen openen" onCta={() => go("settings")} onClose={() => setCfg(false)} />}
        </div>
      )}

      {/* 3 live status cards */}
      <div className="grid-3">
        <StatCard label="Laadtoestand (SoC)" sub={`${fmtKwh(snap.socExact / 100 * snap.system.capacity)} van ${fmtKwh(snap.system.capacity)} kWh`}>
          <div className="row" style={{ gap: "var(--sp-5)" }}>
            <SocRing soc={snap.soc} action={snap.action} size={130} stroke={12} />
            <div className="stack" style={{ gap: "var(--sp-3)", flex: 1 }}>
              <div><div className="faint" style={{ fontSize: 13 }}>Doel-SoC</div><div className="display tabnum" style={{ fontSize: 22 }}>{snap.targetSoc}%</div></div>
              <div className="prog"><div className="prog-fill" style={{ width: `${snap.soc}%`, background: actionColor(snap.action) }} /></div>
            </div>
          </div>
        </StatCard>

        <StatCard label="Huidige prijs" sub="Dynamisch · per uur">
          <div className="display tabnum" style={{ fontSize: "clamp(40px, 5vw, 56px)", color: priceColor(snap.priceCt), lineHeight: 1 }}>
            {fmtCt(snap.priceCt)}
          </div>
          <div className="faint" style={{ fontSize: 14 }}>per kWh</div>
          <div className="row" style={{ gap: "var(--sp-2)", marginTop: "var(--sp-2)" }}>
            {["low", "mid", "high"].map((t) => (
              <span key={t} style={{ flex: 1, height: 6, borderRadius: 3, background: priceTone(snap.priceCt) === t ? (t === "low" ? "var(--price-low)" : t === "mid" ? "var(--price-mid)" : "var(--price-high)") : "color-mix(in oklab, var(--text) 12%, transparent)" }} />
            ))}
          </div>
        </StatCard>

        <StatCard label="Huidige actie" sub={snap.decisions[0]?.reason}>
          <div className="row" style={{ gap: "var(--sp-4)" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, display: "grid", placeItems: "center", color: actionColor(snap.action), background: `color-mix(in oklab, ${actionColor(snap.action)} 16%, transparent)`, flex: "none" }}>
              {actionIcon(snap.action, { size: 30 })}
            </div>
            <div>
              <div className="display" style={{ fontSize: "clamp(28px, 3.4vw, 38px)", color: actionColor(snap.action) }}>{snap.actionLabel}</div>
              <div className="faint" style={{ fontSize: 14 }}>{snap.action === "charge" ? "Batterij wordt geladen" : snap.action === "discharge" ? "Terugleveren aan het net" : "Wachten op gunstig moment"}</div>
            </div>
          </div>
        </StatCard>
      </div>

      {/* trading plan + curve */}
      <div className="card">
        <div className="between" style={{ marginBottom: "var(--sp-5)", flexWrap: "wrap", gap: "var(--sp-3)" }}>
          <div><div className="eyebrow">{I.trend({ size: 14 })} Handelsplan vandaag</div>
            <h3 style={{ fontSize: 24, marginTop: 8 }}>Prijsverloop &amp; geplande acties</h3></div>
          <div className="row" style={{ gap: "var(--sp-5)" }}>
            <div style={{ textAlign: "right" }}><div className="faint" style={{ fontSize: 12.5 }}>Verwacht laden</div><div className="display tabnum" style={{ fontSize: 22, color: "var(--c-charge)" }}>{fmtKwh(p.expected_charge_kwh)} kWh</div></div>
            <div style={{ textAlign: "right" }}><div className="faint" style={{ fontSize: 12.5 }}>Verwachte besparing</div><div className="display tabnum" style={{ fontSize: 22, color: "var(--accent)" }}>{fmtEur(p.expected_savings)}</div></div>
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

      {/* drempels + systeem */}
      <div className="grid-2">
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: "var(--sp-4)" }}>{I.gauge({ size: 14 })} Algoritme-drempels</div>
          <div className="grid-2-inner">
            <ThresholdItem icon={I.arrowUp({ size: 18 })} tone="var(--c-charge)" label="Laadgrens" value={fmtEur(snap.chargeLimit) + "/kWh"} />
            <ThresholdItem icon={I.arrowDown({ size: 18 })} tone="var(--c-discharge)" label="Ontlaadgrens" value={fmtEur(snap.dischargeThreshold) + "/kWh"} />
            <ThresholdItem icon={I.sun({ size: 18 })} tone="var(--c-pv)" label="Zon resterend" value={fmtKwh(snap.solarRemaining) + " kWh"} />
            <ThresholdItem icon={I.euro({ size: 18 })} tone="var(--accent)" label="Besparing vandaag" value={fmtEur(snap.savings)} />
          </div>
        </div>
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: "var(--sp-4)" }}>{I.shield({ size: 14 })} Systeeminformatie</div>
          <div className="stack">
            {[["Omvormer", snap.system.inverter, I.plug({ size: 17 })], ["Energieprovider", snap.system.provider, I.cloud({ size: 17 })], ["Batterijcapaciteit", fmtKwh(snap.system.capacity) + " kWh", I.battery({ size: 17 })], ["Abonnement", "Stroomslim " + snap.system.tier, I.crown({ size: 17 })]].map(([k, v, ic], i) => (
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
        <div className="grid-6">
          <SummaryStat icon={I.arrowUp({ size: 18 })} tone="var(--c-charge)" label="Geladen" value={fmtKwh(snap.summary.charged)} unit="kWh" />
          <SummaryStat icon={I.arrowDown({ size: 18 })} tone="var(--c-discharge)" label="Ontladen" value={fmtKwh(snap.summary.discharged)} unit="kWh" />
          <SummaryStat icon={I.sun({ size: 18 })} tone="var(--c-pv)" label="Zonne-energie" value={fmtKwh(snap.summary.pv)} unit="kWh" />
          <SummaryStat icon={I.grid({ size: 18 })} tone="var(--text-dim)" label="Netafname" value={fmtKwh(snap.summary.gridImport)} unit="kWh" />
          <SummaryStat icon={I.grid({ size: 18 })} tone="var(--c-export)" label="Teruglevering" value={fmtKwh(snap.summary.gridExport)} unit="kWh" />
          <SummaryStat icon={I.euro({ size: 18 })} tone="var(--accent)" label="Besparing" value={fmtEur(snap.summary.savings)} unit="" />
        </div>
      </div>

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
  );
}
Object.assign(window, { Dashboard });

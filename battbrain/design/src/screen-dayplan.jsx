/* screen-dayplan.jsx — 24h trading timeline card */

function smoothPath(pts) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const cp1x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * 0.4;
    const cp2x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * 0.6;
    d += ` C ${cp1x},${pts[i][1]} ${cp2x},${pts[i + 1][1]} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

function DagplanCard({ snap }) {
  const { plan, mins } = snap;
  const uid = React.useMemo(() => "dp" + Math.random().toString(36).substr(2, 4), []);
  const [hoverHour, setHoverHour] = React.useState(null);

  const W = 720, H = 190, padX = 12, padT = 14, padB = 44;
  const innerW = W - padX * 2;
  const innerH = H - padT - padB;
  const hourW = innerW / 24;
  const currentHourFrac = mins / 60; // 0..24
  const currentHour = Math.floor(mins / 60);
  const currentX = padX + currentHourFrac * hourW;

  const maxP = Math.max(...plan.curve) * 1.12 || 1;
  const yFor = (p) => padT + (1 - p / maxP) * innerH;

  // curve mid-points of each bar
  const pts = plan.curve.map((p, i) => [padX + (i + 0.5) * hourW, yFor(p)]);

  const chargeSet = new Set(plan.cheap_hours);
  const dischargeSet = new Set(plan.expensive_hours);

  const actionFor = (h) => {
    if (chargeSet.has(h)) return "charge";
    if (dischargeSet.has(h)) return "discharge";
    return "idle";
  };

  const barColor = (h, hover) => {
    const a = actionFor(h);
    if (a === "charge") return hover ? "var(--c-charge)" : "color-mix(in oklab, var(--c-charge) 55%, transparent)";
    if (a === "discharge") return hover ? "var(--accent)" : "color-mix(in oklab, var(--accent) 55%, transparent)";
    return hover ? "color-mix(in oklab, var(--text) 35%, transparent)" : "color-mix(in oklab, var(--text) 14%, transparent)";
  };

  // action windows: consecutive same-action hours
  const windows = [];
  let wStart = 0, wAction = actionFor(0);
  for (let h = 1; h <= 24; h++) {
    const a = h < 24 ? actionFor(h) : null;
    if (a !== wAction) {
      windows.push({ start: wStart, end: h, action: wAction });
      wStart = h; wAction = a;
    }
  }

  const labelHours = [0, 4, 8, 12, 16, 20, 23];

  // expected savings from plan
  const expectedSavings = plan.expected_savings > 0
    ? `€${plan.expected_savings.toFixed(2).replace(".", ",")} verwachte besparing`
    : "Optimalisatie loopt";

  return (
    <div className="card">
      <div className="between" style={{ marginBottom: "var(--sp-5)", flexWrap: "wrap", gap: "var(--sp-3)" }}>
        <div>
          <div className="eyebrow">{I.calendar({ size: 14 })} Dagplan</div>
          <h3 style={{ fontSize: 22, marginTop: 8 }}>Vandaag's handelsstrategie</h3>
        </div>
        <div className="row" style={{ gap: "var(--sp-5)", flexWrap: "wrap" }}>
          {/* legend */}
          {[
            ["Laden", "var(--c-charge)"],
            ["Ontladen", "var(--accent)"],
            ["Wachten", "color-mix(in oklab, var(--text) 28%, transparent)"],
          ].map(([l, c]) => (
            <div key={l} className="row" style={{ gap: 7, fontSize: 13 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: c, boxShadow: c.startsWith("var") ? `0 0 6px color-mix(in oklab, ${c} 50%, transparent)` : "none" }} />
              <span className="faint">{l}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: "relative" }} onMouseLeave={() => setHoverHour(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const rx = (e.clientX - rect.left) / rect.width * W;
            const h = Math.floor((rx - padX) / hourW);
            setHoverHour(h >= 0 && h < 24 ? h : null);
          }}>
          <defs>
            {/* charge fill gradient */}
            <linearGradient id={`${uid}cg`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--c-charge)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--c-charge)" stopOpacity="0.03" />
            </linearGradient>
            {/* discharge fill gradient */}
            <linearGradient id={`${uid}dg`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.03" />
            </linearGradient>
            {/* glow filter */}
            <filter id={`${uid}gl`}><feGaussianBlur stdDeviation="3" /></filter>
            <filter id={`${uid}gls`}><feGaussianBlur stdDeviation="1.5" /></filter>
          </defs>

          {/* grid lines */}
          {[0.25, 0.5, 0.75].map(f => (
            <line key={f} x1={padX} x2={W - padX}
              y1={padT + (1 - f) * innerH} y2={padT + (1 - f) * innerH}
              stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
          ))}

          {/* action window fills (area behind bars) */}
          {windows.map((w, i) => {
            if (w.action === "idle") return null;
            const x = padX + w.start * hourW;
            const width = (w.end - w.start) * hourW;
            const grad = w.action === "charge" ? `url(#${uid}cg)` : `url(#${uid}dg)`;
            return (
              <rect key={i} x={x} y={padT} width={width} height={innerH}
                fill={grad} rx={0} />
            );
          })}

          {/* price bars */}
          {plan.curve.map((p, h) => {
            const bx = padX + h * hourW;
            const bh = (p / maxP) * innerH;
            const by = padT + innerH - bh;
            const isHover = hoverHour === h;
            const isCurrent = h === currentHour;
            return (
              <g key={h}>
                {isHover && (
                  <rect x={bx} y={padT} width={hourW} height={innerH}
                    fill="color-mix(in oklab, var(--text) 5%, transparent)" rx={0} />
                )}
                <rect
                  x={bx + 1} y={by} width={Math.max(1, hourW - 2)} height={bh}
                  rx={hourW > 16 ? 4 : 2}
                  fill={barColor(h, isHover || isCurrent)}
                  opacity={isCurrent ? 1 : 0.85}
                />
              </g>
            );
          })}

          {/* price curve line */}
          <path d={smoothPath(pts)} fill="none"
            stroke="color-mix(in oklab, var(--text) 30%, transparent)" strokeWidth="1.5" />
          {/* glow copy */}
          <path d={smoothPath(pts)} fill="none"
            stroke="color-mix(in oklab, var(--text) 15%, transparent)" strokeWidth="4"
            filter={`url(#${uid}gls)`} />

          {/* current time marker */}
          <line x1={currentX} y1={padT - 6} x2={currentX} y2={padT + innerH + 4}
            stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="4 3" />
          {/* glowing dot at top */}
          <circle cx={currentX} cy={padT - 2} r={5}
            fill="var(--accent)"
            filter={`url(#${uid}gl)`} />
          <circle cx={currentX} cy={padT - 2} r={3.5} fill="var(--accent)" />

          {/* hour labels */}
          {labelHours.map(h => (
            <text key={h}
              x={padX + h * hourW + (h === 23 ? hourW * 0.5 : hourW * 0.5)}
              y={H - 12}
              textAnchor="middle" fontSize="11" fill="var(--text-faint)">
              {String(h).padStart(2, "0")}:00
            </text>
          ))}

          {/* current time label */}
          <rect x={Math.max(padX, Math.min(W - padX - 46, currentX - 23))} y={padT + innerH + 5}
            width={46} height={17} rx={5}
            fill="color-mix(in oklab, var(--accent) 18%, transparent)"
            stroke="color-mix(in oklab, var(--accent) 40%, transparent)" strokeWidth="1" />
          <text
            x={Math.max(padX + 23, Math.min(W - padX - 23, currentX))}
            y={padT + innerH + 17}
            textAnchor="middle" fontSize="10.5" fill="var(--accent)" fontWeight="700">
            {snap.clock}
          </text>
        </svg>

        {/* hover tooltip */}
        {hoverHour != null && (
          <div style={{
            position: "absolute",
            left: `${Math.min(85, Math.max(5, ((hoverHour + 0.5) / 24) * 100))}%`,
            top: 0,
            transform: hoverHour > 15 ? "translateX(-110%)" : "translateX(8px)",
            pointerEvents: "none", zIndex: 5,
            background: "color-mix(in oklab, var(--surface) 94%, transparent)",
            backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            border: `1px solid color-mix(in oklab, ${
              actionFor(hoverHour) === "charge" ? "var(--c-charge)"
              : actionFor(hoverHour) === "discharge" ? "var(--accent)"
              : "var(--border)"} 60%, transparent)`,
            borderRadius: 12, padding: "10px 14px",
            boxShadow: "0 16px 40px -10px rgba(0,0,0,0.5)",
            whiteSpace: "nowrap", minWidth: 160,
          }}>
            <div className="row" style={{ gap: 8, marginBottom: 4 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: actionFor(hoverHour) === "charge" ? "var(--c-charge)"
                  : actionFor(hoverHour) === "discharge" ? "var(--accent)"
                  : "var(--text-faint)",
              }} />
              <span className="faint" style={{ fontSize: 12, fontWeight: 600 }}>
                {String(hoverHour).padStart(2, "0")}:00 – {String(hoverHour + 1).padStart(2, "0")}:00
              </span>
            </div>
            <div className="display tabnum" style={{
              fontSize: 24, lineHeight: 1.1,
              color: priceColor(plan.curve[hoverHour]),
            }}>
              {plan.curve[hoverHour].toFixed(1).replace(".", ",")} ct
            </div>
            <div style={{ fontSize: 13, marginTop: 4, fontWeight: 600 }}>
              {actionFor(hoverHour) === "charge" ? "⚡ Laden (goedkoop)"
                : actionFor(hoverHour) === "discharge" ? "💰 Ontladen (duur)"
                : "⏸ Wachten"}
            </div>
          </div>
        )}
      </div>

      {/* summary strip */}
      <div className="row" style={{
        marginTop: "var(--sp-5)", paddingTop: "var(--sp-4)",
        borderTop: "1px solid var(--border)",
        flexWrap: "wrap", gap: "var(--sp-6)",
      }}>
        <div className="row" style={{ gap: 10 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--c-charge)", boxShadow: "0 0 6px var(--c-charge)", flex: "none" }} />
          <span className="faint" style={{ fontSize: 14 }}>
            {plan.cheap_hours.length} laaduren ·&nbsp;
            <strong className="tabnum">{plan.expected_charge_kwh.toFixed(1).replace(".", ",")} kWh</strong> gepland
          </span>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--accent)", boxShadow: "0 0 6px var(--accent)", flex: "none" }} />
          <span className="faint" style={{ fontSize: 14 }}>
            {plan.expensive_hours.length} ontlaaduren ·&nbsp;
            <strong style={{ color: "var(--accent)" }} className="tabnum">{expectedSavings}</strong>
          </span>
        </div>
        <div className="faint" style={{ fontSize: 14, marginLeft: "auto" }}>
          Spread: <strong className="tabnum" style={{ color: "var(--text)" }}>
            {(plan.avg_expensive - plan.avg_cheap).toFixed(1).replace(".", ",")} ct/kWh
          </strong>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DagplanCard });

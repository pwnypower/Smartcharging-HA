/* enhanced-charts.jsx — price curve with glow, SocRing kept for compact use */

function smoothPath(pts) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function SocRing({ soc, action, size = 168, stroke = 14 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - soc / 100);
  const col = actionColor(action);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke="color-mix(in oklab, var(--text) 10%, transparent)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={col} strokeWidth={stroke} strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={off}
                style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.4,1,.4,1), stroke .4s", filter: `drop-shadow(0 0 10px color-mix(in oklab, ${col} 55%, transparent))` }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div className="display tabnum" style={{ fontSize: size * 0.30, fontWeight: 600, lineHeight: 1 }}>
          {soc}<span style={{ fontSize: size * 0.13, color: "var(--text-dim)" }}>%</span>
        </div>
        <div className="row" style={{ gap: 5, color: col, fontWeight: 600, fontSize: size * 0.085, marginTop: 4 }}>
          {actionIcon(action, { size: size * 0.1 })}
          <span>{ {charge:"Laden", discharge:"Ontladen", idle:"Wachten"}[action] }</span>
        </div>
      </div>
    </div>
  );
}

function PriceCurve({ snap, height = 230 }) {
  const W = 760, H = height, padX = 14, padT = 22, padB = 34;
  const curve = snap.plan.curve;
  const max = Math.max(...curve) * 1.12;
  const min = 0;
  const x = (h) => padX + (h / 23) * (W - padX * 2);
  const y = (v) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
  const pts = curve.map((v, h) => [x(h), y(v)]);
  const line = smoothPath(pts);
  const area = `${line} L ${x(23)},${H - padB} L ${x(0)},${H - padB} Z`;
  const nowH = snap.mins / 60;
  const nowX = x(nowH);
  const nowY = y(snap.priceCt);
  const chargeY = y(snap.chargeLimit * 100);
  const dischargeY = y(snap.dischargeThreshold * 100);

  const wrapRef = React.useRef(null);
  const [hover, setHover] = React.useState(null);
  const uid = React.useMemo(() => 'pc' + Math.random().toString(36).substr(2, 4), []);

  const updateFromClientX = (clientX) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    const svgX = ratio * W;
    const h = Math.round(((svgX - padX) / (W - padX * 2)) * 23);
    setHover(Math.max(0, Math.min(23, h)));
  };
  const onMove = (e) => updateFromClientX(e.clientX);
  const onTouch = (e) => { if (e.touches[0]) updateFromClientX(e.touches[0].clientX); };

  let tip = null;
  if (hover != null) {
    const v = curve[hover];
    const tone = priceTone(v);
    const tcol = tone === "low" ? "var(--price-low)" : tone === "high" ? "var(--price-high)" : "var(--price-mid)";
    const tlabel = tone === "low" ? "Laden" : tone === "high" ? "Ontladen" : "Wachten";
    const leftPct = (x(hover) / W) * 100;
    const topPct = (y(v) / H) * 100;
    tip = { v, tcol, tlabel, leftPct, topPct, hx: x(hover), hy: y(v) };
  }

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", touchAction: "pan-y" }}
         onMouseMove={onMove} onMouseLeave={() => setHover(null)}
         onTouchStart={onTouch} onTouchMove={onTouch} onTouchEnd={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible", cursor: "crosshair" }}>
        <defs>
          <linearGradient id={`${uid}f`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
          <filter id={`${uid}gl`}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
          </filter>
        </defs>

        {/* threshold guides */}
        <line x1={padX} x2={W - padX} y1={chargeY} y2={chargeY} stroke="var(--price-low)" strokeWidth="1" strokeDasharray="3 5" opacity="0.55" />
        <line x1={padX} x2={W - padX} y1={dischargeY} y2={dischargeY} stroke="var(--price-high)" strokeWidth="1" strokeDasharray="3 5" opacity="0.55" />
        <text x={W - padX} y={chargeY - 6} textAnchor="end" fontSize="11" fill="var(--price-low)" fontWeight="600">laadgrens</text>
        <text x={W - padX} y={dischargeY - 6} textAnchor="end" fontSize="11" fill="var(--price-high)" fontWeight="600">ontlaadgrens</text>

        {/* area fill */}
        <path d={area} fill={`url(#${uid}f)`} />

        {/* glow line (blurred duplicate) */}
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round"
              opacity="0.3" filter={`url(#${uid}gl)`} />

        {/* main line */}
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" />

        {/* price zone dots */}
        {curve.map((v, h) => {
          const tone = priceTone(v);
          if (tone === "mid") return null;
          return <circle key={h} cx={x(h)} cy={y(v)} r="3.2"
                   fill={tone === "low" ? "var(--price-low)" : "var(--price-high)"}
                   style={{ filter: `drop-shadow(0 0 4px ${tone === 'low' ? 'var(--price-low)' : 'var(--price-high)'})` }} />;
        })}

        {/* now marker */}
        {hover == null && (
          <React.Fragment>
            <line x1={nowX} x2={nowX} y1={padT - 6} y2={H - padB} stroke="var(--text)" strokeWidth="1" opacity="0.2" />
            <circle cx={nowX} cy={nowY} r="7" fill="var(--bg)" stroke="var(--accent)" strokeWidth="3"
                    style={{ filter: "drop-shadow(0 0 8px color-mix(in oklab, var(--accent) 70%, transparent))" }}>
              <animate attributeName="r" values="7;10;7" dur="2.2s" repeatCount="indefinite" />
            </circle>
            <text x={nowX} y={padT - 10} textAnchor="middle" fontSize="11.5" fill="var(--text)" fontWeight="700">{snap.clock}</text>
          </React.Fragment>
        )}

        {/* scrubber */}
        {tip && (
          <React.Fragment>
            <line x1={tip.hx} x2={tip.hx} y1={padT - 6} y2={H - padB} stroke={tip.tcol} strokeWidth="1.5" opacity="0.5" />
            <circle cx={tip.hx} cy={tip.hy} r="7" fill="var(--bg)" stroke={tip.tcol} strokeWidth="3"
                    style={{ filter: `drop-shadow(0 0 8px ${tip.tcol})` }} />
          </React.Fragment>
        )}

        {/* x axis */}
        {[0, 4, 8, 12, 16, 20].map((h) => (
          <text key={h} x={x(h)} y={H - 12} textAnchor="middle" fontSize="11" fill="var(--text-faint)">{String(h).padStart(2, "0")}u</text>
        ))}
      </svg>

      {/* tooltip */}
      {tip && (
        <div style={{
          position: "absolute", left: `${tip.leftPct}%`, top: `${tip.topPct}%`,
          transform: `translate(${tip.leftPct > 60 ? "calc(-100% - 14px)" : "14px"}, -50%)`,
          pointerEvents: "none", zIndex: 5,
          background: "color-mix(in oklab, var(--surface) 92%, transparent)",
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          border: `1px solid ${tip.tcol}`, borderRadius: 12,
          padding: "8px 12px", boxShadow: `0 12px 32px -8px rgba(0,0,0,0.4), 0 0 0 1px ${tip.tcol}33`, whiteSpace: "nowrap",
        }}>
          <div className="faint" style={{ fontSize: 11.5, fontWeight: 600 }}>{hourLabel(hover)}–{hourLabel(hover + 1)}</div>
          <div className="display tabnum" style={{ fontSize: 21, color: tip.tcol, lineHeight: 1.1 }}>{fmtCt(tip.v)}</div>
          <div className="row" style={{ gap: 5, fontSize: 11.5, fontWeight: 700, color: tip.tcol, marginTop: 2 }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: tip.tcol, boxShadow: `0 0 6px ${tip.tcol}` }} />{tip.tlabel}
          </div>
        </div>
      )}
    </div>
  );
}

function Sparkline({ data, w = 320, h = 90, color = "var(--accent)" }) {
  const max = Math.max(...data), min = Math.min(...data);
  const xf = (i) => (i / (data.length - 1)) * w;
  const yf = (v) => h - 8 - ((v - min) / (max - min || 1)) * (h - 16);
  const pts = data.map((v, i) => [xf(i), yf(v)]);
  const line = smoothPath(pts);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L ${w},${h} L 0,${h} Z`} fill="url(#spark)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.4" />
    </svg>
  );
}

Object.assign(window, { SocRing, PriceCurve, DayBars: function(){return null;}, Sparkline, smoothPath });

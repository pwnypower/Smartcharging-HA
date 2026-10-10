/* enhanced-effects.jsx — LiquidBattery, EnergyFlow, AnimNum, GlassOrb */

/* ---- AnimNum: smoothly animates between numeric values ---- */
function AnimNum({ value, decimals = 0, prefix = '', suffix = '', duration = 800 }) {
  const [display, setDisplay] = React.useState(value);
  const raf = React.useRef(null);
  const prev = React.useRef(value);

  React.useEffect(() => {
    const from = prev.current;
    const to = value;
    if (Math.abs(from - to) < 0.001) { setDisplay(to); prev.current = to; return; }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * ease);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf.current = requestAnimationFrame(tick);
    prev.current = to;
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  const formatted = display.toFixed(decimals).replace('.', ',');
  return <span className="tabnum">{prefix}{formatted}{suffix}</span>;
}

/* ---- GlassOrb: decorative floating background orb ---- */
function GlassOrb({ color = 'var(--accent)', size = 500, x = '50%', y = '50%', delay = 0, idx = 1 }) {
  return (
    <div style={{
      position: 'absolute', width: size, height: size, left: x, top: y,
      transform: 'translate(-50%, -50%)',
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      opacity: 0.12, filter: 'blur(80px)',
      animation: `orbFloat${idx} ${18 + delay * 2}s ease-in-out ${delay}s infinite`,
      pointerEvents: 'none', willChange: 'transform',
    }} />
  );
}

/* ---- LiquidBattery: animated SVG battery with wave fill ---- */
function LiquidBattery({ soc, action, size = 180 }) {
  const col = actionColor(action);
  const isCharging = action === 'charge';
  const uid = React.useMemo(() => 'lb' + Math.random().toString(36).substr(2, 5), []);

  // viewBox: 120 x 160
  const bx = 20, by = 24, bw = 80, bh = 116, br = 14;
  const liquidH = bh * Math.max(0.02, soc / 100);
  const liquidY = by + bh - liquidH;

  // generate smooth wave path (double-width for seamless loop)
  const amp = isCharging ? 6 : action === 'discharge' ? 4 : 2.5;
  const makeWave = (phase) => {
    let d = '';
    for (let x = 0; x <= bw * 2; x += 4) {
      const y = Math.sin((x / bw) * Math.PI * 2 + phase) * amp;
      d += (x === 0 ? 'M' : 'L') + `${bx - bw + x},${amp + y}`;
    }
    d += ` V${liquidH + 20} H${bx - bw} Z`;
    return d;
  };
  const wave1 = makeWave(0);
  const wave2 = makeWave(2.2);

  // bubble positions (deterministic from soc)
  const bubbles = isCharging ? [0,1,2,3,4].map(i => ({
    cx: bx + 12 + ((i * 17 + 7) % (bw - 24)),
    r: 1.5 + (i % 3) * 0.8,
    dur: 1.8 + i * 0.35,
    delay: i * 0.45,
  })) : [];

  return (
    <div style={{ position: 'relative', width: size, height: size * (160 / 120) }}>
      <svg viewBox="0 0 120 160" width={size} height={size * (160 / 120)}
           style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <clipPath id={`${uid}c`}>
            <rect x={bx} y={by} width={bw} height={bh} rx={br} />
          </clipPath>
          <linearGradient id={`${uid}lg`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={col} stopOpacity="0.92" />
            <stop offset="100%" stopColor={col} stopOpacity="0.48" />
          </linearGradient>
          <filter id={`${uid}gl`}>
            <feGaussianBlur stdDeviation="10" />
          </filter>
          <linearGradient id={`${uid}bg`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
          </linearGradient>
        </defs>

        {/* outer glow */}
        <rect x={bx - 6} y={by - 6} width={bw + 12} height={bh + 12} rx={br + 3}
              fill={col} opacity="0.08" filter={`url(#${uid}gl)`}>
          <animate attributeName="opacity" values="0.06;0.14;0.06" dur="3s" repeatCount="indefinite" />
        </rect>

        {/* terminal */}
        <rect x="42" y="8" width="36" height="18" rx="6"
              fill={`url(#${uid}bg)`} stroke="rgba(255,255,255,0.12)" strokeWidth="2" />

        {/* body */}
        <rect x={bx} y={by} width={bw} height={bh} rx={br}
              fill={`url(#${uid}bg)`} stroke="rgba(255,255,255,0.10)" strokeWidth="2" />

        {/* liquid + waves */}
        <g clipPath={`url(#${uid}c)`}>
          {/* main fill */}
          <rect x={bx} y={liquidY} width={bw} height={liquidH + 2}
                fill={`url(#${uid}lg)`}
                style={{ transition: 'y 1.4s cubic-bezier(.4,1,.4,1), height 1.4s cubic-bezier(.4,1,.4,1)' }} />

          {/* glow at surface */}
          <rect x={bx} y={liquidY - 8} width={bw} height={16}
                fill={col} opacity="0.22" filter={`url(#${uid}gl)`}
                style={{ transition: 'y 1.4s cubic-bezier(.4,1,.4,1)' }} />

          {/* wave 1 */}
          <g style={{ transform: `translateY(${liquidY - amp}px)`, transition: 'transform 1.4s cubic-bezier(.4,1,.4,1)' }}>
            <path d={wave1} fill={col} opacity="0.45"
                  style={{ animation: 'lbWave1 2.8s linear infinite' }} />
          </g>

          {/* wave 2 */}
          <g style={{ transform: `translateY(${liquidY - amp * 0.7}px)`, transition: 'transform 1.4s cubic-bezier(.4,1,.4,1)' }}>
            <path d={wave2} fill={col} opacity="0.28"
                  style={{ animation: 'lbWave2 3.6s linear infinite' }} />
          </g>

          {/* bubbles */}
          {bubbles.map((b, i) => (
            <circle key={i} cx={b.cx} cy={liquidY + liquidH * 0.7} r={b.r}
                    fill="rgba(255,255,255,0.45)"
                    style={{ animation: `lbBubble ${b.dur}s ease-in-out ${b.delay}s infinite` }} />
          ))}
        </g>

        {/* SoC text */}
        <text x="60" y="84" textAnchor="middle" dominantBaseline="central"
              fontSize="28" fontWeight="700" fill="var(--text)"
              style={{ fontFamily: 'var(--font-display)' }}>
          {soc}<tspan fontSize="13" dy="-2" fill="var(--text-dim)">%</tspan>
        </text>

        {/* action label */}
        <text x="60" y="107" textAnchor="middle" fontSize="9.5" fontWeight="700"
              fill={col} letterSpacing="0.12em">
          {action === 'charge' ? 'LADEN' : action === 'discharge' ? 'ONTLADEN' : 'STANDBY'}
        </text>

        {/* charge indicator arrows */}
        {isCharging && (
          <g opacity="0.6" stroke={col} strokeWidth="1.5" fill="none">
            <path d="M60 130 L60 122" style={{ animation: 'lbBubble 1.5s ease-in-out infinite' }} />
            <path d="M55 126 L60 122 L65 126" style={{ animation: 'lbBubble 1.5s ease-in-out infinite' }} />
          </g>
        )}
      </svg>
    </div>
  );
}

/* ---- EnergyFlow: animated diagram with live watt labels (Victron-style) ---- */
function EnergyFlow({ action, style: outerStyle }) {
  const snap = useDemo();
  const nowH = snap.mins / 60;

  // live power values (kW)
  const hasSolar = nowH >= 7.5 && nowH <= 19.5;
  const solarKw  = hasSolar ? parseFloat((Math.max(0, Math.sin(((nowH - 7.5) / 12) * Math.PI)) * 3.2).toFixed(1)) : 0;
  const battKw   = action === 'charge' ? 3.5 : action === 'discharge' ? 3.5 : 0;
  const homeKw   = 0.65;
  const gridKw   = action === 'charge'
    ? Math.max(0, parseFloat((battKw - solarKw).toFixed(1)))
    : action === 'discharge' ? 0 : 0;
  const exportKw = action === 'discharge' ? parseFloat((battKw - homeKw).toFixed(1)) : 0;

  const fmtW = (kw) => kw < 0.05 ? '—' : kw >= 1 ? `${kw.toFixed(1)} kW` : `${Math.round(kw * 1000)} W`;

  const nodes = {
    solar:   { x: 200, y: 28,  label: 'Zon',      color: 'var(--c-pv)',    icon: '☀', watts: fmtW(solarKw) },
    grid:    { x: 56,  y: 120, label: 'Net',       color: 'var(--text-dim)', icon: '⚡', watts: action === 'discharge' ? `-${fmtW(exportKw)}` : fmtW(gridKw) },
    battery: { x: 200, y: 120, label: 'Batterij',  color: 'var(--accent)',  icon: '🔋', watts: fmtW(battKw) },
    home:    { x: 344, y: 120, label: 'Huis',      color: 'var(--c-charge)', icon: '🏠', watts: fmtW(homeKw) },
  };

  const conns = [
    ['solar', 'battery', 'M200,52 L200,96'],
    ['grid',  'battery', 'M88,120 L168,120'],
    ['battery','home',   'M232,120 L312,120'],
  ];

  const flows = {};
  if (action === 'charge') {
    flows['solar-battery'] = solarKw > 0 ? 'forward' : 'idle'; // zon → batterij
    flows['grid-battery']  = gridKw  > 0 ? 'forward' : 'idle'; // net → batterij
    flows['battery-home']  = 'idle';                            // batterij levert niet tijdens laden
  } else if (action === 'discharge') {
    flows['solar-battery'] = solarKw > 0 ? 'forward' : 'idle'; // zon → batterij (altijd actief bij zon)
    flows['grid-battery']  = 'reverse';                          // batterij → net (export)
    flows['battery-home']  = 'forward';                          // batterij → huis
  } else {
    // IDLE: batterij doet niets, geen richtingsanimaties
    flows['solar-battery'] = 'idle';
    flows['grid-battery']  = 'idle';
    flows['battery-home']  = 'idle';
  }

  // midpoint labels for each connection
  const connMids = {
    'solar-battery': { x: 262, y: 72 },
    'grid-battery':  { x: 128, y: 108 },
    'battery-home':  { x: 272, y: 108 },
  };
  const connWatts = {
    'solar-battery': fmtW(solarKw),
    'grid-battery':  action === 'discharge' ? fmtW(exportKw) : fmtW(gridKw),
    'battery-home':  fmtW(homeKw),
  };

  return (
    <div style={{ position: 'relative', ...outerStyle }}>
      <svg viewBox="0 0 400 178" width="100%" style={{ display: 'block' }}>
        <defs>
          <filter id="ef-glow"><feGaussianBlur stdDeviation="3" /></filter>
        </defs>

        {/* connections */}
        {conns.map(([from, to, d]) => {
          const key = `${from}-${to}`;
          const flow = flows[key] || 'idle';
          const fromNode = nodes[from];
          const toNode   = nodes[to];
          const activeColor = flow === 'idle'
            ? 'var(--text-faint)'
            : flow === 'forward' ? fromNode.color : toNode.color;

          return (
            <React.Fragment key={key}>
              <path d={d} fill="none" stroke="var(--border-strong)" strokeWidth="2" />
              <path d={d} fill="none" stroke={activeColor} strokeWidth="2.5"
                strokeDasharray={flow === 'idle' ? '3 10' : '6 14'}
                strokeLinecap="round" opacity={flow === 'idle' ? 0.3 : 0.85}
                style={{ animation: flow === 'idle' ? 'flowPulse 2s ease-in-out infinite'
                  : flow === 'forward' ? 'flowForward 1.2s linear infinite'
                  : 'flowReverse 1.2s linear infinite' }} />
              {flow !== 'idle' && (
                <path d={d} fill="none" stroke={activeColor} strokeWidth="4"
                  strokeDasharray="6 14" strokeLinecap="round" opacity="0.18"
                  filter="url(#ef-glow)"
                  style={{ animation: flow === 'forward' ? 'flowForward 1.2s linear infinite' : 'flowReverse 1.2s linear infinite' }} />
              )}

              {/* watt label on connection */}
              {connWatts[key] && connWatts[key] !== '—' && (
                <React.Fragment>
                  {/* shadow glow behind pill */}
                  {flow !== 'idle' && (
                    <rect x={connMids[key].x - 27} y={connMids[key].y - 11}
                      width={54} height={21} rx={7}
                      fill={activeColor} opacity="0.18" filter="url(#ef-glow)" />
                  )}
                  <rect
                    x={connMids[key].x - 26} y={connMids[key].y - 10}
                    width={52} height={20} rx={6}
                    fill="var(--surface)"
                    stroke={activeColor} strokeWidth={flow !== 'idle' ? 1.5 : 1}
                    opacity="0.96" />
                  <text x={connMids[key].x} y={connMids[key].y + 1}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize="11" fontWeight="800"
                    fill={flow === 'idle' ? 'var(--text-faint)' : activeColor}>
                    {connWatts[key]}
                  </text>
                </React.Fragment>
              )}
            </React.Fragment>
          );
        })}

        {/* nodes */}
        {Object.entries(nodes).map(([key, n]) => {
          const isActive = key === 'battery'
            || (key === 'solar' && solarKw > 0)
            || (key === 'grid' && (gridKw > 0 || exportKw > 0))
            || (key === 'home');
          return (
            <g key={key} style={{ animation: isActive ? 'nodeGlow 3s ease-in-out infinite' : 'none' }}>
              {isActive && <circle cx={n.x} cy={n.y} r="26" fill={n.color} opacity="0.08" filter="url(#ef-glow)" />}
              <circle cx={n.x} cy={n.y} r="22"
                fill="var(--surface)" stroke={isActive ? n.color : 'var(--border-strong)'}
                strokeWidth={isActive ? 2 : 1.5} opacity={isActive ? 1 : 0.55} />
              <text x={n.x} y={n.y + 1} textAnchor="middle" dominantBaseline="central"
                fontSize="16" fill={isActive ? n.color : 'var(--text-faint)'}>
                {n.icon}
              </text>
              <text x={n.x} y={n.y + 37} textAnchor="middle"
                fontSize="11" fontWeight="600" fill={isActive ? n.color : 'var(--text-faint)'}
                letterSpacing="0.04em">
                {n.label}
              </text>
              {/* watt label under node */}
              {n.watts && n.watts !== '—' && (
                <text x={n.x} y={n.y + 50} textAnchor="middle"
                  fontSize="10" fontWeight="700" fill={isActive ? n.color : 'var(--text-faint)'}
                  opacity={isActive ? 0.85 : 0.35}>
                  {n.watts}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ---- PageWrap: simple wrapper (entrance animations removed for reliability) ---- */
function PageWrap({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}

/* ---- Stagger: simple wrapper ---- */
function Stagger({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}

/* ---- useInView: trigger animation when element enters viewport ---- */
function useInView(opts = {}) {
  const ref = React.useRef(null);
  const [inView, setInView] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    let done = false;
    const mark = () => { if (!done) { done = true; setInView(true); obs.disconnect(); clearTimeout(timer); } };
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) mark(); }, { threshold: opts.threshold || 0.05 });
    obs.observe(el);
    // fallback: always reveal after 1.2s even if IO never fires (iframes, scroll contexts)
    const timer = setTimeout(mark, 1200);
    return () => { obs.disconnect(); clearTimeout(timer); };
  }, []);
  return [ref, inView];
}

/* ---- RevealOnScroll: fades in children when they enter the viewport ---- */
function RevealOnScroll({ children, delay = 0, className = '' }) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} className={className} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? 'none' : 'translateY(24px)',
      transition: `opacity 0.7s cubic-bezier(0.16,0.84,0.44,1) ${delay}s, transform 0.7s cubic-bezier(0.16,0.84,0.44,1) ${delay}s`,
    }}>
      {children}
    </div>
  );
}

/* export all to window */
Object.assign(window, {
  AnimNum, GlassOrb, LiquidBattery, EnergyFlow,
  PageWrap, Stagger, useInView, RevealOnScroll,
});

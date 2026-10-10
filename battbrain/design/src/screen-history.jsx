/* screen-history.jsx — Geschiedenis / Analytics screen */

/* ---- generate realistic mock history data ---- */
function generateHistoryData() {
  const now = new Date();
  const days = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const seasonFactor = 1 + Math.sin((d.getMonth() - 3) * Math.PI / 6) * 0.3;
    const baseSavings = (1.2 + Math.random() * 2.8) * seasonFactor;
    const charged = 4 + Math.random() * 8;
    const discharged = 3 + Math.random() * 7;
    const pv = isWeekend ? 6 + Math.random() * 12 : 5 + Math.random() * 14;
    const gridImport = 2 + Math.random() * 5;
    const gridExport = 3 + Math.random() * 6;
    const avgBuyPrice = 3 + Math.random() * 8;
    const avgSellPrice = 18 + Math.random() * 18;
    const cycles = 0.4 + Math.random() * 1.2;

    days.push({
      date: d,
      dateStr: d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }),
      dayName: d.toLocaleDateString('nl-NL', { weekday: 'short' }),
      savings: Math.round(baseSavings * 100) / 100,
      charged: Math.round(charged * 10) / 10,
      discharged: Math.round(discharged * 10) / 10,
      pv: Math.round(pv * 10) / 10,
      gridImport: Math.round(gridImport * 10) / 10,
      gridExport: Math.round(gridExport * 10) / 10,
      avgBuyPrice: Math.round(avgBuyPrice * 10) / 10,
      avgSellPrice: Math.round(avgSellPrice * 10) / 10,
      cycles: Math.round(cycles * 10) / 10,
      trades: Math.floor(4 + Math.random() * 12),
    });
  }
  return days;
}

const HISTORY_DATA = generateHistoryData();

function getPeriodData(period) {
  if (period === 'week')  return HISTORY_DATA.slice(-7);
  if (period === 'month') return HISTORY_DATA;
  if (period === 'year')  return HISTORY_DATA; // yearly uses monthly aggregation
  return HISTORY_DATA.slice(-1);
}

// Generate monthly aggregates for the year view
function generateYearlyData() {
  const months = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
  return months.map((m, i) => {
    const factor = 1 + Math.sin((i - 3) * Math.PI / 6) * 0.35;
    const days = [31,28,31,30,31,30,31,31,30,31,30,31][i];
    const savings = Math.round((factor * 38 + Math.random() * 12) * 100) / 100;
    return {
      month: m, days,
      savings: i < 6 ? savings : 0,
      charged: i < 6 ? Math.round((factor * 120 + Math.random() * 30) * 10) / 10 : 0,
      discharged: i < 6 ? Math.round((factor * 95 + Math.random() * 25) * 10) / 10 : 0,
      pv: i < 6 ? Math.round((factor * 180 + Math.random() * 60) * 10) / 10 : 0,
      trades: i < 6 ? Math.round(factor * 220 + Math.random() * 40) : 0,
      cycles: i < 6 ? Math.round((factor * 28 + Math.random() * 8) * 10) / 10 : 0,
    };
  });
}
const YEARLY_DATA = generateYearlyData();

function aggregateData(days) {
  const sum = (k) => days.reduce((s, d) => s + d[k], 0);
  const avg = (k) => sum(k) / days.length;
  return {
    totalSavings: Math.round(sum('savings') * 100) / 100,
    totalCharged: Math.round(sum('charged') * 10) / 10,
    totalDischarged: Math.round(sum('discharged') * 10) / 10,
    totalPv: Math.round(sum('pv') * 10) / 10,
    totalGridImport: Math.round(sum('gridImport') * 10) / 10,
    totalGridExport: Math.round(sum('gridExport') * 10) / 10,
    avgBuyPrice: Math.round(avg('avgBuyPrice') * 10) / 10,
    avgSellPrice: Math.round(avg('avgSellPrice') * 10) / 10,
    totalCycles: Math.round(sum('cycles') * 10) / 10,
    totalTrades: Math.round(sum('trades')),
    avgSavingsPerDay: Math.round((sum('savings') / days.length) * 100) / 100,
    days: days.length,
  };
}

/* ---- Bar chart component ---- */
function HistoryBarChart({ data, dataKey, color, unit, height = 200 }) {
  const W = 720, H = height, padX = 8, padT = 16, padB = 36;
  const vals = data.map(d => d[dataKey]);
  const max = Math.max(...vals) * 1.15 || 1;
  const barW = Math.min(28, (W - padX * 2) / data.length * 0.7);
  const gap = (W - padX * 2) / data.length;
  const uid = React.useMemo(() => 'hb' + Math.random().toString(36).substr(2, 4), []);

  const [hoverIdx, setHoverIdx] = React.useState(null);
  const wrapRef = React.useRef(null);

  const onMove = (e) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const idx = Math.floor(ratio * data.length);
    setHoverIdx(Math.max(0, Math.min(data.length - 1, idx)));
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', touchAction: 'pan-y' }}
         onMouseMove={onMove} onMouseLeave={() => setHoverIdx(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={`${uid}g`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.95" />
            <stop offset="100%" stopColor={color} stopOpacity="0.4" />
          </linearGradient>
          <filter id={`${uid}gl`}><feGaussianBlur stdDeviation="4" /></filter>
        </defs>

        {/* grid lines */}
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} x1={padX} x2={W - padX}
                y1={padT + (1 - f) * (H - padT - padB)}
                y2={padT + (1 - f) * (H - padT - padB)}
                stroke="var(--border)" strokeWidth="1" />
        ))}

        {/* bars */}
        {data.map((d, i) => {
          const v = d[dataKey];
          const barH = (v / max) * (H - padT - padB);
          const cx = padX + gap * i + gap / 2;
          const bx = cx - barW / 2;
          const by = H - padB - barH;
          const isHover = hoverIdx === i;
          return (
            <React.Fragment key={i}>
              {isHover && (
                <rect x={bx - 3} y={by - 3} width={barW + 6} height={barH + 3}
                      rx={6} fill={color} opacity="0.12" filter={`url(#${uid}gl)`} />
              )}
              <rect x={bx} y={by} width={barW} height={barH}
                    rx={barW > 12 ? 6 : 4}
                    fill={isHover ? color : `url(#${uid}g)`}
                    opacity={isHover ? 1 : 0.85}
                    style={{ transition: 'opacity 0.2s ease' }} />
            </React.Fragment>
          );
        })}

        {/* x labels */}
        {data.map((d, i) => {
          const cx = padX + gap * i + gap / 2;
          const showLabel = data.length <= 7 || i % Math.ceil(data.length / 10) === 0 || i === data.length - 1;
          if (!showLabel) return null;
          return (
            <text key={i} x={cx} y={H - 10} textAnchor="middle"
                  fontSize="11" fill="var(--text-faint)">
              {data.length <= 7 ? d.dayName : d.dateStr}
            </text>
          );
        })}
      </svg>

      {/* tooltip */}
      {hoverIdx != null && (
        <div style={{
          position: 'absolute',
          left: `${((hoverIdx + 0.5) / data.length) * 100}%`,
          top: 0,
          transform: `translateX(${hoverIdx > data.length * 0.65 ? 'calc(-100% - 10px)' : '10px'})`,
          pointerEvents: 'none', zIndex: 5,
          background: 'color-mix(in oklab, var(--surface) 92%, transparent)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${color}`, borderRadius: 12,
          padding: '8px 14px', boxShadow: `0 12px 32px -8px rgba(0,0,0,0.4)`,
          whiteSpace: 'nowrap',
        }}>
          <div className="faint" style={{ fontSize: 12, fontWeight: 600 }}>
            {data[hoverIdx].dayName} {data[hoverIdx].dateStr}
          </div>
          <div className="display tabnum" style={{ fontSize: 22, color, lineHeight: 1.2 }}>
            {typeof data[hoverIdx][dataKey] === 'number'
              ? data[hoverIdx][dataKey].toFixed(dataKey === 'savings' ? 2 : 1).replace('.', ',')
              : data[hoverIdx][dataKey]}
            <span style={{ fontSize: 13, color: 'var(--text-dim)', marginLeft: 3 }}>{unit}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Stacked area chart for energy mix ---- */
function EnergyMixChart({ data, height = 220 }) {
  const W = 720, H = height, padX = 8, padT = 12, padB = 36;
  const uid = React.useMemo(() => 'em' + Math.random().toString(36).substr(2, 4), []);
  const keys = ['pv', 'charged', 'discharged'];
  const colors = ['var(--c-pv)', 'var(--c-charge)', 'var(--c-discharge)'];
  const labels = ['Zonne-energie', 'Geladen', 'Ontladen'];

  const maxTotal = Math.max(...data.map(d => d.pv + d.charged + d.discharged)) * 1.1 || 1;
  const gap = (W - padX * 2) / (data.length - 1 || 1);
  const y = (v) => padT + (1 - v / maxTotal) * (H - padT - padB);
  const x = (i) => padX + gap * i;

  // Build stacked areas
  const areas = [];
  keys.forEach((key, ki) => {
    const pts = data.map((d, i) => {
      let stackY = 0;
      for (let j = 0; j <= ki; j++) stackY += d[keys[j]];
      return [x(i), y(stackY)];
    });
    const ptsBelow = data.map((d, i) => {
      let stackY = 0;
      for (let j = 0; j < ki; j++) stackY += d[keys[j]];
      return [x(i), y(stackY)];
    }).reverse();
    const allPts = [...pts, ...ptsBelow];
    const path = allPts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + ',' + p[1]).join(' ') + ' Z';
    areas.push({ path, color: colors[ki], label: labels[ki] });
  });

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          {colors.map((c, i) => (
            <linearGradient key={i} id={`${uid}a${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c} stopOpacity="0.55" />
              <stop offset="100%" stopColor={c} stopOpacity="0.08" />
            </linearGradient>
          ))}
        </defs>

        {areas.map((a, i) => (
          <path key={i} d={a.path} fill={`url(#${uid}a${i})`} stroke={a.color} strokeWidth="1.5" strokeOpacity="0.5" />
        ))}

        {/* x labels */}
        {data.map((d, i) => {
          const showLabel = data.length <= 7 || i % Math.ceil(data.length / 10) === 0 || i === data.length - 1;
          if (!showLabel) return null;
          return (
            <text key={i} x={x(i)} y={H - 10} textAnchor="middle"
                  fontSize="11" fill="var(--text-faint)">
              {data.length <= 7 ? d.dayName : d.dateStr}
            </text>
          );
        })}
      </svg>

      {/* legend */}
      <div className="row" style={{ gap: 'var(--sp-5)', justifyContent: 'center', marginTop: 'var(--sp-3)' }}>
        {labels.map((l, i) => (
          <div key={i} className="row" style={{ gap: 6, fontSize: 13 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: colors[i], boxShadow: `0 0 6px color-mix(in oklab, ${colors[i]} 50%, transparent)` }} />
            <span className="faint">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Yearly bar chart ---- */
function YearlyBarChart({ data, dataKey, color, unit, height = 200 }) {
  const W = 720, H = height, padX = 8, padT = 16, padB = 36;
  const vals = data.map(d => d[dataKey]);
  const max = Math.max(...vals) * 1.15 || 1;
  const barW = Math.min(36, (W - padX * 2) / data.length * 0.62);
  const gap = (W - padX * 2) / data.length;
  const uid = React.useMemo(() => 'yb' + Math.random().toString(36).substr(2,4), []);
  const curMonth = new Date().getMonth();
  const [hover, setHover] = React.useState(null);
  return (
    <div style={{ position: 'relative' }}
      onMouseLeave={() => setHover(null)}
      onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        setHover(Math.max(0, Math.min(11, Math.floor((e.clientX - rect.left) / rect.width * 12))));
      }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        <defs>
          <linearGradient id={`${uid}g`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.95" />
            <stop offset="100%" stopColor={color} stopOpacity="0.4" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} x1={padX} x2={W-padX} y1={padT+(1-f)*(H-padT-padB)} y2={padT+(1-f)*(H-padT-padB)} stroke="var(--border)" strokeWidth="1" />
        ))}
        {data.map((d, i) => {
          const v = d[dataKey];
          const barH = (v / max) * (H - padT - padB);
          const cx = padX + gap * i + gap / 2;
          const bx = cx - barW / 2;
          const by = H - padB - barH;
          const isCur = i === curMonth;
          const isFuture = v === 0;
          return (
            <g key={i}>
              {isCur && <rect x={bx-4} y={padT} width={barW+8} height={H-padT-padB} rx={6} fill={color} opacity="0.06" />}
              {!isFuture && (
                <rect x={bx} y={by} width={barW} height={barH} rx={barW > 12 ? 6 : 4}
                  fill={isCur ? color : `url(#${uid}g)`}
                  opacity={hover===i ? 1 : 0.85}
                  style={{ filter: isCur ? `drop-shadow(0 0 6px ${color})` : 'none', transition: 'opacity 0.2s' }} />
              )}
              {isFuture && (
                <rect x={bx} y={padT} width={barW} height={H-padT-padB} rx={barW > 12 ? 6 : 4}
                  fill="var(--surface-3)" opacity={0.4} strokeDasharray="3 2" />
              )}
              <text x={cx} y={H-10} textAnchor="middle" fontSize="11"
                fill={isCur ? color : 'var(--text-faint)'}
                fontWeight={isCur ? '700' : '400'}>{d.month}</text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div style={{
          position: 'absolute', top: 0,
          left: `${(hover / 12) * 100}%`,
          transform: `translateX(${hover > 8 ? '-110%' : '10px'})`,
          pointerEvents: 'none', zIndex: 5,
          background: 'color-mix(in oklab, var(--surface) 94%, transparent)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          border: `1px solid ${color}`, borderRadius: 12,
          padding: '8px 14px', whiteSpace: 'nowrap',
          boxShadow: '0 12px 32px -8px rgba(0,0,0,.4)',
        }}>
          <div className="faint" style={{ fontSize: 12, fontWeight: 600 }}>{data[hover].month}</div>
          <div className="display tabnum" style={{ fontSize: 22, color, lineHeight: 1.2 }}>
            {data[hover][dataKey] > 0
              ? (typeof data[hover][dataKey] === 'number' ? data[hover][dataKey].toFixed(dataKey==='savings'?2:1).replace('.',',') : data[hover][dataKey])
              : '—'}
            <span style={{ fontSize: 13, color: 'var(--text-dim)', marginLeft: 3 }}>{unit}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Period selector ---- */
function PeriodSelector({ value, onChange }) {
  const opts = [
    ['day', 'Vandaag'],
    ['week', 'Week'],
    ['month', 'Maand'],
    ['year', 'Jaar'],
  ];
  return (
    <div className="row" style={{
      gap: 3, padding: 4, borderRadius: 999,
      background: 'var(--surface-2)', border: '1px solid var(--border)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    }}>
      {opts.map(([k, l]) => (
        <button key={k} onClick={() => onChange(k)} style={{
          border: 0, borderRadius: 999,
          padding: '8px 18px', fontSize: 14, fontWeight: 600,
          background: value === k ? 'var(--accent)' : 'transparent',
          color: value === k ? '#06140d' : 'var(--text-dim)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}>{l}</button>
      ))}
    </div>
  );
}

/* ---- Top trade item ---- */
function TradeHighlight({ label, time, value, color, icon }) {
  return (
    <div className="row" style={{ gap: 'var(--sp-3)', padding: 'var(--sp-3) 0' }}>
      <div style={{
        width: 40, height: 40, borderRadius: 11, display: 'grid', placeItems: 'center',
        color, background: `color-mix(in oklab, ${color} 15%, transparent)`,
        boxShadow: `0 4px 14px -6px color-mix(in oklab, ${color} 40%, transparent)`,
        flex: 'none',
      }}>{icon}</div>
      <div className="grow">
        <div className="faint" style={{ fontSize: 13 }}>{label}</div>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{time}</div>
      </div>
      <div className="display tabnum" style={{ fontSize: 20, color }}>{value}</div>
    </div>
  );
}

/* ---- Main History component ---- */
function History({ go }) {
  const [period, setPeriod] = React.useState('week');
  const data = getPeriodData(period);
  const agg = aggregateData(data);

  const bestDay = [...data].sort((a, b) => b.savings - a.savings)[0];
  const worstDay = [...data].sort((a, b) => a.savings - b.savings)[0];
  const bestTradeSpread = agg.avgSellPrice - agg.avgBuyPrice;
  const monthProjection = Math.round(agg.avgSavingsPerDay * 30 * 100) / 100;

  return (
    <PageWrap>
      <div className="dash">
        {/* header */}
        <div className="between dash-statusbar" style={{ flexWrap: 'wrap', gap: 'var(--sp-4)' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(24px, 3vw, 34px)' }}>Geschiedenis</h1>
            <p className="muted" style={{ fontSize: 15.5, marginTop: 6 }}>Bekijk je prestaties en besparingen over tijd.</p>
          </div>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>

        {/* top-level KPIs */}
        <div className="grid-3">
          <div className="card card-hover" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            <div className="card-label">Totale besparing</div>
            <div className="display tabnum" style={{ fontSize: 'clamp(36px, 4.5vw, 50px)', color: 'var(--accent)', lineHeight: 1 }}>
              <AnimNum value={agg.totalSavings} decimals={2} prefix="€" />
            </div>
            <div className="faint" style={{ fontSize: 13.5, marginTop: 'auto' }}>
              gem. €{agg.avgSavingsPerDay.toFixed(2).replace('.', ',')} per dag
            </div>
          </div>

          <div className="card card-hover" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            <div className="card-label">Handelstransacties</div>
            <div className="display tabnum" style={{ fontSize: 'clamp(36px, 4.5vw, 50px)', lineHeight: 1 }}>
              {agg.totalTrades}
            </div>
            <div className="faint" style={{ fontSize: 13.5, marginTop: 'auto' }}>
              {agg.totalCycles} batterijcycli
            </div>
          </div>

          <div className="card card-hover" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            <div className="card-label">Maandprognose</div>
            <div className="display tabnum" style={{ fontSize: 'clamp(36px, 4.5vw, 50px)', color: 'var(--accent)', lineHeight: 1 }}>
              €{monthProjection.toFixed(0)}
            </div>
            <div className="faint" style={{ fontSize: 13.5, marginTop: 'auto' }}>
              op basis van huidige prestaties
            </div>
          </div>
        </div>

        {/* savings chart */}
        <div className="card">
          <div className="between" style={{ marginBottom: 'var(--sp-5)', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
            <div>
              <div className="eyebrow">{I.euro({ size: 14 })} Besparingen</div>
              <h3 style={{ fontSize: 22, marginTop: 8 }}>Dagelijkse besparing</h3>
            </div>
            <div className="row" style={{ gap: 'var(--sp-5)' }}>
              <div style={{ textAlign: 'right' }}>
                <div className="faint" style={{ fontSize: 12.5 }}>Gem. inkoopprijs</div>
                <div className="display tabnum" style={{ fontSize: 20, color: 'var(--price-low)' }}>
                  {agg.avgBuyPrice.toFixed(1).replace('.', ',')} ct
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="faint" style={{ fontSize: 12.5 }}>Gem. verkoopprijs</div>
                <div className="display tabnum" style={{ fontSize: 20, color: 'var(--price-high)' }}>
                  {agg.avgSellPrice.toFixed(1).replace('.', ',')} ct
                </div>
              </div>
            </div>
          </div>
          {period !== 'day' ? (
            <HistoryBarChart data={data} dataKey="savings" color="var(--accent)" unit="€" />
          ) : (
            <div className="center" style={{ flexDirection: 'column', gap: 'var(--sp-3)', padding: 'var(--sp-8) 0', color: 'var(--text-dim)' }}>
              {I.barChart({ size: 40 })}
              <div style={{ fontSize: 16 }}>Daggrafiek beschikbaar op het <strong>Dashboard</strong></div>
              <button className="btn btn-ghost" onClick={() => go('dashboard')}>Naar Dashboard {I.arrowRight({ size: 16 })}</button>
            </div>
          )}
        </div>

        {/* energy mix chart */}
        {period !== 'day' && (
          <div className="card">
            <div className="between" style={{ marginBottom: 'var(--sp-5)', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
              <div>
                <div className="eyebrow">{I.bolt({ size: 14 })} Energiemix</div>
                <h3 style={{ fontSize: 22, marginTop: 8 }}>Opgewekt, geladen &amp; ontladen</h3>
              </div>
            </div>
            <EnergyMixChart data={data} />
          </div>
        )}

        {/* energy summary + trade performance side by side */}
        <div className="grid-2">
          <div className="card card-hover">
            <div className="eyebrow" style={{ marginBottom: 'var(--sp-4)' }}>{I.bolt({ size: 14 })} Energieoverzicht</div>
            <div className="stack" style={{ gap: 'var(--sp-1)' }}>
              {[
                ['Geladen', fmtKwh(agg.totalCharged) + ' kWh', 'var(--c-charge)', I.arrowUp({ size: 17 })],
                ['Ontladen', fmtKwh(agg.totalDischarged) + ' kWh', 'var(--c-discharge)', I.arrowDown({ size: 17 })],
                ['Zonne-energie', fmtKwh(agg.totalPv) + ' kWh', 'var(--c-pv)', I.sun({ size: 17 })],
                ['Netafname', fmtKwh(agg.totalGridImport) + ' kWh', 'var(--text-dim)', I.grid({ size: 17 })],
                ['Teruglevering', fmtKwh(agg.totalGridExport) + ' kWh', 'var(--c-export)', I.grid({ size: 17 })],
              ].map(([k, v, c, ic], i) => (
                <div key={k} className="between" style={{ padding: 'var(--sp-3) 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                  <span className="row muted" style={{ gap: 10, fontSize: 14.5 }}>
                    <span style={{ color: c }}>{ic}</span>{k}
                  </span>
                  <span className="tabnum" style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-hover">
            <div className="eyebrow" style={{ marginBottom: 'var(--sp-4)' }}>{I.trend({ size: 14 })} Handelsprestaties</div>
            <div className="stack" style={{ gap: 'var(--sp-1)' }}>
              <TradeHighlight
                label="Beste dag" time={bestDay.dayName + ' ' + bestDay.dateStr}
                value={'€' + bestDay.savings.toFixed(2).replace('.', ',')}
                color="var(--accent)" icon={I.trend({ size: 18 })} />
              <div style={{ borderTop: '1px solid var(--border)' }}>
                <TradeHighlight
                  label="Laagste dag" time={worstDay.dayName + ' ' + worstDay.dateStr}
                  value={'€' + worstDay.savings.toFixed(2).replace('.', ',')}
                  color="var(--price-mid)" icon={I.barChart({ size: 18 })} />
              </div>
              <div style={{ borderTop: '1px solid var(--border)' }}>
                <TradeHighlight
                  label="Gem. prijsspread" time="inkoop → verkoop"
                  value={bestTradeSpread.toFixed(1).replace('.', ',') + ' ct'}
                  color="var(--c-pv)" icon={I.spark({ size: 18 })} />
              </div>
              <div style={{ borderTop: '1px solid var(--border)' }}>
                <TradeHighlight
                  label="Batterijcycli" time={agg.days + ' dagen'}
                  value={agg.totalCycles.toFixed(1).replace('.', ',')}
                  color="var(--c-charge)" icon={I.infinity({ size: 18 })} />
              </div>
            </div>
          </div>
        </div>

        {/* daily breakdown table */}
        {period !== 'day' && (
          <div className="card">
            <div className="between" style={{ marginBottom: 'var(--sp-4)', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
              <div className="eyebrow">{I.calendar({ size: 14 })} Dagelijks overzicht</div>
              <span className="faint" style={{ fontSize: 13.5 }}>laatste {data.length} dagen</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                <thead><tr style={{ textAlign: 'left' }}>
                  {['Dag', 'Besparing', 'Geladen', 'Ontladen', 'Zon', 'Trades', 'Cycli'].map((h, i) => (
                    <th key={h} style={{
                      padding: '0 var(--sp-2) var(--sp-3)', fontSize: 12,
                      textTransform: 'uppercase', letterSpacing: '0.1em',
                      color: 'var(--text-faint)',
                      textAlign: i >= 1 ? 'right' : 'left',
                    }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {[...data].reverse().map((d, i) => {
                    const isBest = d === bestDay;
                    return (
                      <tr key={i} style={{
                        borderTop: '1px solid var(--border)',
                        background: isBest ? 'color-mix(in oklab, var(--accent) 6%, transparent)' : 'transparent',
                      }}>
                        <td style={{ padding: 'var(--sp-3) var(--sp-2)', fontSize: 14.5, whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 600 }}>{d.dayName}</span>
                          <span className="faint" style={{ marginLeft: 8 }}>{d.dateStr}</span>
                          {isBest && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>BEST</span>}
                        </td>
                        <td className="tabnum" style={{ padding: 'var(--sp-3) var(--sp-2)', textAlign: 'right', color: 'var(--accent)', fontWeight: 700 }}>€{d.savings.toFixed(2).replace('.', ',')}</td>
                        <td className="tabnum" style={{ padding: 'var(--sp-3) var(--sp-2)', textAlign: 'right', color: 'var(--c-charge)' }}>{d.charged.toFixed(1).replace('.', ',')} kWh</td>
                        <td className="tabnum" style={{ padding: 'var(--sp-3) var(--sp-2)', textAlign: 'right', color: 'var(--c-discharge)' }}>{d.discharged.toFixed(1).replace('.', ',')} kWh</td>
                        <td className="tabnum" style={{ padding: 'var(--sp-3) var(--sp-2)', textAlign: 'right', color: 'var(--c-pv)' }}>{d.pv.toFixed(1).replace('.', ',')} kWh</td>
                        <td className="tabnum" style={{ padding: 'var(--sp-3) var(--sp-2)', textAlign: 'right' }}>{d.trades}</td>
                        <td className="tabnum" style={{ padding: 'var(--sp-3) var(--sp-2)', textAlign: 'right' }}>{d.cycles.toFixed(1).replace('.', ',')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Jaar view */}
        {period === 'year' && (
          <React.Fragment>
            {/* year KPIs */}
            <div className="grid-3">
              {[[
                'Totale besparing YTD',
                `€${YEARLY_DATA.reduce((s,m)=>s+m.savings,0).toFixed(2).replace('.',',')}`,
                'var(--accent)', I.euro({size:20})
              ],[
                'Opgewekte energie YTD',
                `${YEARLY_DATA.reduce((s,m)=>s+m.pv,0).toFixed(1).replace('.',',')} kWh`,
                'var(--c-pv)', I.sun({size:20})
              ],[
                'Handelstransacties YTD',
                `${YEARLY_DATA.reduce((s,m)=>s+m.trades,0)}`,
                'var(--text)', I.trend({size:20})
              ]].map(([label,value,color,icon]) => (
                <div key={label} className="card card-hover" style={{ display:'flex', flexDirection:'column', gap:'var(--sp-3)' }}>
                  <div className="row" style={{ gap:8, color }}>{icon}<span className="card-label" style={{color:'var(--text-faint)'}}>{label}</span></div>
                  <div className="display tabnum" style={{ fontSize:'clamp(28px,3.5vw,40px)', color, lineHeight:1 }}>{value}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="between" style={{ marginBottom:'var(--sp-5)', flexWrap:'wrap', gap:'var(--sp-3)' }}>
                <div><div className="eyebrow">{I.euro({size:14})} Besparing per maand</div><h3 style={{fontSize:22,marginTop:8}}>Jaaroverzicht 2026</h3></div>
              </div>
              <YearlyBarChart data={YEARLY_DATA} dataKey="savings" color="var(--accent)" unit="€" />
            </div>

            <div className="grid-2">
              <div className="card">
                <div className="eyebrow" style={{marginBottom:'var(--sp-5)'}}>{I.bolt({size:14})} Energie per maand</div>
                <YearlyBarChart data={YEARLY_DATA} dataKey="charged" color="var(--c-charge)" unit="kWh" height={160} />
              </div>
              <div className="card">
                <div className="eyebrow" style={{marginBottom:'var(--sp-5)'}}>{I.sun({size:14})} Zon per maand</div>
                <YearlyBarChart data={YEARLY_DATA} dataKey="pv" color="var(--c-pv)" unit="kWh" height={160} />
              </div>
            </div>

            <div className="card">
              <div className="between" style={{ marginBottom:'var(--sp-4)', flexWrap:'wrap', gap:'var(--sp-3)' }}>
                <div className="eyebrow">{I.calendar({size:14})} Maandoverzicht</div>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:560 }}>
                  <thead><tr style={{textAlign:'left'}}>
                    {['Maand','Besparing','Geladen','Zon','Trades','Cycli'].map((h,i) => (
                      <th key={h} style={{ padding:'0 var(--sp-2) var(--sp-3)', fontSize:12, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--text-faint)', textAlign:i>=1?'right':'left' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {YEARLY_DATA.map((d,i) => {
                      const isCur = i === new Date().getMonth();
                      const isFuture = d.savings === 0;
                      return (
                        <tr key={i} style={{ borderTop:'1px solid var(--border)', opacity: isFuture ? 0.4 : 1, background: isCur ? 'color-mix(in oklab, var(--accent) 6%, transparent)' : 'transparent' }}>
                          <td style={{ padding:'var(--sp-3) var(--sp-2)', fontWeight:600, fontSize:14.5 }}>
                            {d.month} {isCur && <span style={{fontSize:11,color:'var(--accent)',fontWeight:700,marginLeft:6}}>NU</span>}
                          </td>
                          <td className="tabnum" style={{ padding:'var(--sp-3) var(--sp-2)', textAlign:'right', color:'var(--accent)', fontWeight:700 }}>{isFuture ? '—' : `€${d.savings.toFixed(2).replace('.',',')}`}</td>
                          <td className="tabnum" style={{ padding:'var(--sp-3) var(--sp-2)', textAlign:'right', color:'var(--c-charge)' }}>{isFuture ? '—' : `${d.charged.toFixed(1).replace('.',',')} kWh`}</td>
                          <td className="tabnum" style={{ padding:'var(--sp-3) var(--sp-2)', textAlign:'right', color:'var(--c-pv)' }}>{isFuture ? '—' : `${d.pv.toFixed(1).replace('.',',')} kWh`}</td>
                          <td className="tabnum" style={{ padding:'var(--sp-3) var(--sp-2)', textAlign:'right' }}>{isFuture ? '—' : d.trades}</td>
                          <td className="tabnum" style={{ padding:'var(--sp-3) var(--sp-2)', textAlign:'right' }}>{isFuture ? '—' : d.cycles.toFixed(1).replace('.',',')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </React.Fragment>
        )}

        {/* Maandrapport */}
        <div className="card">
          <div className="between" style={{ marginBottom: 'var(--sp-5)', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
            <div>
              <div className="eyebrow">{I.report({ size: 14 })} Maandrapport</div>
              <h3 style={{ fontSize: 22, marginTop: 8 }}>Samenvatting {new Date().toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}</h3>
            </div>
            <button className="btn btn-ghost" style={{ gap: 8 }} onClick={() => showToast('Rapport gedownload', 'success', 'PDF opgeslagen in Downloads')}>
              {I.download({ size: 16 })} PDF exporteren
            </button>
          </div>
          <div className="grid-3" style={{ gap: 'var(--sp-4)' }}>
            {[
              ['Totale besparing', `€${agg.totalSavings.toFixed(2).replace('.', ',')}`, 'var(--accent)', I.euro({ size: 18 })],
              ['Geladen', `${fmtKwh(agg.totalCharged)} kWh`, 'var(--c-charge)', I.arrowUp({ size: 18 })],
              ['Teruggeleverd', `${fmtKwh(agg.totalGridExport)} kWh`, 'var(--c-pv)', I.grid({ size: 18 })],
              ['Zonne-energie', `${fmtKwh(agg.totalPv)} kWh`, 'var(--c-pv)', I.sun({ size: 18 })],
              ['Handelstransacties', `${agg.totalTrades}`, 'var(--text)', I.trend({ size: 18 })],
              ['Batterijcycli', `${agg.totalCycles.toFixed(1).replace('.', ',')}`, 'var(--text-dim)', I.infinity({ size: 18 })],
            ].map(([label, value, color, icon]) => (
              <div key={label} className="summary-stat-wow" style={{ padding: 'var(--sp-4)', background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div className="row" style={{ gap: 8, color, marginBottom: 8 }}>{icon}<span className="faint" style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>{label}</span></div>
                <div className="display tabnum" style={{ fontSize: 'clamp(20px, 2.5vw, 28px)', color }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 'var(--sp-5)', padding: 'var(--sp-4)', background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', gap: 'var(--sp-4)', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--accent)' }}>{I.shield({ size: 18 })}</span>
            <span className="faint" style={{ fontSize: 14 }}>Abonnementskosten mei 2025:</span>
            <span className="tabnum" style={{ fontWeight: 700 }}>€6,95</span>
            <span className="faint" style={{ fontSize: 14 }}>·</span>
            <span className="faint" style={{ fontSize: 14 }}>Netto rendement:</span>
            <span className="display tabnum" style={{ fontSize: 20, color: 'var(--accent)' }}>€{Math.max(0, agg.totalSavings - 6.95).toFixed(2).replace('.', ',')}</span>
            <span className="faint" style={{ fontSize: 13, marginLeft: 'auto' }}>Verhouding {Math.round(agg.totalSavings / 6.95 * 10) / 10}× abonnementsprijs</span>
          </div>
        </div>

        {/* ROI card */}
        <div className="card" style={{
          padding: 'var(--sp-8)', position: 'relative', overflow: 'hidden',
          background: 'radial-gradient(600px 350px at 20% -15%, color-mix(in oklab, var(--accent) 18%, transparent), transparent 60%), linear-gradient(150deg, var(--surface-3), var(--surface))',
        }}>
          <div style={{ position: 'absolute', bottom: '-30%', right: '-5%', width: 300, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, color-mix(in oklab, var(--accent) 15%, transparent), transparent 70%)', filter: 'blur(45px)', pointerEvents: 'none' }} />
          <div className="between" style={{ flexWrap: 'wrap', gap: 'var(--sp-6)', position: 'relative' }}>
            <div style={{ maxWidth: 440 }}>
              <div className="eyebrow">{I.shield({ size: 14 })} Rendement op investering</div>
              <h3 style={{ fontSize: 'clamp(22px, 2.8vw, 30px)', margin: 'var(--sp-3) 0 var(--sp-3)' }}>
                Je batterij verdient zichzelf terug
              </h3>
              <p className="muted" style={{ fontSize: 15, lineHeight: 1.55, textWrap: 'pretty' }}>
                Op basis van je huidige handelsprestaties verdien je jaarlijks circa <strong style={{ color: 'var(--accent)' }}>€{Math.round(monthProjection * 12)}</strong> aan je thuisbatterij — ruim boven de abonnementskosten van €83,40 per jaar.
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="faint" style={{ fontSize: 13 }}>Jaarprognose</div>
              <div className="display tabnum" style={{ fontSize: 'clamp(40px, 5vw, 58px)', color: 'var(--accent)', lineHeight: 1 }}>
                €{Math.round(monthProjection * 12)}
              </div>
              <div className="faint" style={{ fontSize: 13, marginTop: 4 }}>netto na abonnementskosten</div>
              <div className="display tabnum" style={{ fontSize: 24, color: 'var(--accent)', marginTop: 8 }}>
                €{Math.round(monthProjection * 12 - 83.40)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageWrap>
  );
}

Object.assign(window, { History });

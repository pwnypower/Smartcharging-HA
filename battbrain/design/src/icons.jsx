/* icons.jsx — inline stroke icons, currentColor */
const Icon = ({ d, size = 20, fill = "none", sw = 1.8, children, vb = "0 0 24 24", style }) => (
  <svg width={size} height={size} viewBox={vb} fill={fill} stroke="currentColor"
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {d ? <path d={d} /> : children}
  </svg>
);

const I = {
  bolt: (p) => <Icon {...p} fill="currentColor" sw={0} d="M13 2 4.5 13.5H11l-1 8.5 9-12H12l1-8Z" />,
  arrowUp: (p) => <Icon {...p}><path d="M12 19V5" /><path d="m6 11 6-6 6 6" /></Icon>,
  arrowDown: (p) => <Icon {...p}><path d="M12 5v14" /><path d="m6 13 6 6 6-6" /></Icon>,
  wait: (p) => <Icon {...p}><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 2" /></Icon>,
  sun: (p) => <Icon {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Icon>,
  battery: (p) => <Icon {...p}><rect x="2" y="7" width="16" height="10" rx="2.5" /><path d="M22 10v4" /></Icon>,
  grid: (p) => <Icon {...p}><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></Icon>,
  euro: (p) => <Icon {...p}><path d="M15 6.5A5.5 5.5 0 0 0 7 11c0 3 2 5.5 8 5.5M5 10h7M5 13h6" /></Icon>,
  gauge: (p) => <Icon {...p}><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /><path d="m13.4 10.6 3.6-3.6" /><path d="M4 16a8 8 0 1 1 16 0" /></Icon>,
  leaf: (p) => <Icon {...p}><path d="M11 20A7 7 0 0 1 4 13c0-5 4.5-9 16-9 0 7-4 12-11 12Z" /><path d="M8 16c2-4 5-6 9-7" /></Icon>,
  dashboard: (p) => <Icon {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></Icon>,
  settings: (p) => <Icon {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 2.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V1a2 2 0 0 1 4 0v.1A1.6 1.6 0 0 0 15 2.6a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" /></Icon>,
  crown: (p) => <Icon {...p}><path d="m3 7 4 4 5-7 5 7 4-4-2 12H5L3 7Z" /></Icon>,
  logout: (p) => <Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></Icon>,
  check: (p) => <Icon {...p}><path d="m20 6-11 11-5-5" /></Icon>,
  arrowRight: (p) => <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>,
  shield: (p) => <Icon {...p}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" /></Icon>,
  plug: (p) => <Icon {...p}><path d="M9 2v6M15 2v6M7 8h10v3a5 5 0 0 1-10 0V8ZM12 16v6" /></Icon>,
  cloud: (p) => <Icon {...p}><path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.8A6 6 0 0 0 4 12.5 4.5 4.5 0 0 0 6 19h11.5Z" /></Icon>,
  menu: (p) => <Icon {...p}><path d="M3 6h18M3 12h18M3 18h18" /></Icon>,
  close: (p) => <Icon {...p}><path d="M18 6 6 18M6 6l12 12" /></Icon>,
  eye: (p) => <Icon {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></Icon>,
  spark: (p) => <Icon {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" /></Icon>,
  trend: (p) => <Icon {...p}><path d="M3 17l6-6 4 4 8-8" /><path d="M21 10V7h-3" /></Icon>,
  clock: (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>,
  moon: (p) => <Icon {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" /></Icon>,
  bell: (p) => <Icon {...p}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></Icon>,
  car: (p) => <Icon {...p}><path d="M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13M5 13h14v4a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H8v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-4Z" /><circle cx="7.5" cy="15.5" r="0.6" fill="currentColor" /><circle cx="16.5" cy="15.5" r="0.6" fill="currentColor" /></Icon>,
  report: (p) => <Icon {...p}><path d="M6 3h9l5 5v13a0 0 0 0 1 0 0H6a0 0 0 0 1 0 0V3Z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></Icon>,
  strategy: (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 12 16 8M12 12v5" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /></Icon>,
  infinity: (p) => <Icon {...p}><path d="M7 12c0-2 1.5-3.5 3-3.5s2 1 2.5 2 1 2.5 2.5 2.5 3-1.5 3-3.5S19.5 8.5 18 8.5s-2 1-2.5 2-1.5 3.5-4.5 3.5C7.5 14 7 12.5 7 12Z" /></Icon>,
  history: (p) => <Icon {...p}><circle cx="12" cy="13" r="8" /><path d="M5 4.5 3 6.5" /><path d="M21 6.5 19 4.5" /><path d="M12 9v4l2 2" /></Icon>,
  calendar: (p) => <Icon {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Icon>,
  download: (p) => <Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></Icon>,
  barChart: (p) => <Icon {...p}><path d="M12 20V10M6 20v-6M18 20V4" /></Icon>,
  pieChart: (p) => <Icon {...p}><path d="M21.2 8.4c.5.9.8 2 .8 3.1a9.5 9.5 0 1 1-6.2-8.9" /><path d="M22 12h-9V3a9 9 0 0 1 9 9Z" /></Icon>,
  user: (p) => <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></Icon>,
  mail: (p) => <Icon {...p}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 7 10 7 10-7" /></Icon>,
  lock: (p) => <Icon {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></Icon>,
  trash: (p) => <Icon {...p}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></Icon>,
  edit: (p) => <Icon {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" /></Icon>,
  warning: (p) => <Icon {...p}><path d="M10.3 3.2 2.1 18A2 2 0 0 0 4 21h16a2 2 0 0 0 1.9-2.8L13.7 3.2a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></Icon>,
  tag: (p) => <Icon {...p}><path d="M12 2H2v10l10 10 10-10L12 2Z" /><circle cx="7" cy="7" r="1.3" fill="currentColor" /></Icon>,
  brain: (p) => <Icon {...p}>
    <path d="M9.5 2A2.5 2.5 0 0 0 7 4.5V5A4 4 0 0 0 3 9a4 4 0 0 0 1.6 3.2A3 3 0 0 0 4 14a3 3 0 0 0 3 3v2h10v-2a3 3 0 0 0 3-3 3 3 0 0 0-.6-1.8A4 4 0 0 0 21 9a4 4 0 0 0-4-4v-.5A2.5 2.5 0 0 0 14.5 2a2.5 2.5 0 0 0-2 1A2.5 2.5 0 0 0 9.5 2Z" />
    <path d="M12 5v14M8 9.5c0-.8.7-1.5 1.5-1.5M14.5 8c.8 0 1.5.7 1.5 1.5M9 13.5h6" />
  </Icon>,
  solar: (p) => <Icon {...p}>
    <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
    <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
  </Icon>,
  compass: (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="m16.2 7.8-2 6.3-6.2 2 2-6.3 6.2-2Z" /></Icon>,
  repeat: (p) => <Icon {...p}><path d="M17 2l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></Icon>,
};

const actionIcon = (action, props) => {
  if (action === "charge") return I.arrowUp(props);
  if (action === "discharge") return I.arrowDown(props);
  return I.wait(props);
};
const actionColor = (action) =>
  action === "charge" ? "var(--c-charge)" : action === "discharge" ? "var(--c-discharge)" : "var(--c-idle)";

Object.assign(window, { Icon, I, actionIcon, actionColor });

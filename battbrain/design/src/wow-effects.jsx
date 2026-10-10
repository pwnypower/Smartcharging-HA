/* wow-effects.jsx — premium animation layer: tilt, glow, particles, transitions */

/* ---- TiltCard: 3D perspective card that follows mouse ---- */
function TiltCard({ children, className = '', style = {}, intensity = 12, glare = true }) {
  const ref = React.useRef(null);
  const [transform, setTransform] = React.useState('perspective(800px) rotateX(0deg) rotateY(0deg)');
  const [glareStyle, setGlareStyle] = React.useState({ opacity: 0 });
  const rafId = React.useRef(null);

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rotY = (x - 0.5) * intensity;
      const rotX = (0.5 - y) * intensity;
      setTransform(`perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.02,1.02,1.02)`);
      if (glare) {
        const angle = Math.atan2(y - 0.5, x - 0.5) * (180 / Math.PI) + 90;
        setGlareStyle({
          opacity: 0.15,
          background: `linear-gradient(${angle}deg, rgba(255,255,255,0.35) 0%, transparent 60%)`,
        });
      }
    });
  };

  const onLeave = () => {
    cancelAnimationFrame(rafId.current);
    setTransform('perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)');
    setGlareStyle({ opacity: 0 });
  };

  return (
    <div ref={ref} className={className} onMouseMove={onMove} onMouseLeave={onLeave}
      style={{
        ...style,
        transform,
        transition: 'transform 0.4s cubic-bezier(0.16, 0.84, 0.44, 1)',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
      }}>
      {children}
      {glare && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 'inherit',
          pointerEvents: 'none', zIndex: 10,
          transition: 'opacity 0.4s ease',
          ...glareStyle,
        }} />
      )}
    </div>
  );
}

/* ---- MouseGlow: spotlight that follows cursor inside a container ---- */
function MouseGlow({ color = 'var(--accent)', size = 350, opacity = 0.08, children, className = '', style = {} }) {
  const ref = React.useRef(null);
  const [pos, setPos] = React.useState({ x: -999, y: -999 });
  const [visible, setVisible] = React.useState(false);

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setVisible(true);
  };

  return (
    <div ref={ref} className={className} onMouseMove={onMove} onMouseLeave={() => setVisible(false)}
      style={{ position: 'relative', ...style }}>
      <div style={{
        position: 'absolute',
        width: size, height: size,
        left: pos.x - size / 2, top: pos.y - size / 2,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        opacity: visible ? opacity : 0,
        transition: 'opacity 0.3s ease',
        pointerEvents: 'none', zIndex: 0,
        filter: 'blur(20px)',
      }} />
      {children}
    </div>
  );
}

/* ---- ParticleField: floating energy particles ---- */
function ParticleField({ count = 35, colors = ['var(--accent)', 'var(--c-charge)', 'var(--c-pv)'] }) {
  const particles = React.useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
      duration: 15 + Math.random() * 25,
      delay: Math.random() * -20,
      color: colors[i % colors.length],
      drift: 10 + Math.random() * 30,
      opacity: 0.15 + Math.random() * 0.35,
    }));
  }, [count]);

  return (
    <div className="particle-field" aria-hidden="true">
      {particles.map((p, i) => (
        <div key={i} className="particle" style={{
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: p.size,
          height: p.size,
          background: p.color,
          boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
          opacity: p.opacity,
          animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`,
          '--drift': `${p.drift}px`,
        }} />
      ))}
    </div>
  );
}

/* ---- StaggerIn: stagger-reveal children with spring ---- */
function StaggerIn({ children, stagger = 0.06, from = 'bottom', className = '', style = {} }) {
  const [ref, inView] = useInView({ threshold: 0.05 });
  const items = React.Children.toArray(children);

  const getFrom = () => {
    if (from === 'bottom') return 'translateY(32px) scale(0.97)';
    if (from === 'left') return 'translateX(-32px) scale(0.97)';
    if (from === 'right') return 'translateX(32px) scale(0.97)';
    if (from === 'scale') return 'scale(0.85)';
    return 'translateY(32px)';
  };

  return (
    <div ref={ref} className={className} style={style}>
      {items.map((child, i) => (
        <div key={i} style={{
          opacity: inView ? 1 : 0,
          transform: inView ? 'none' : getFrom(),
          transition: `opacity 0.65s cubic-bezier(0.16, 0.84, 0.44, 1) ${i * stagger}s, transform 0.65s cubic-bezier(0.16, 0.84, 0.44, 1) ${i * stagger}s`,
          minWidth: 0,
        }}>
          {child}
        </div>
      ))}
    </div>
  );
}

/* ---- RouteTransition: crossfade + slide between routes ---- */
function RouteTransition({ routeKey, children }) {
  const [phase, setPhase] = React.useState('idle'); // idle | exit | enter
  const prevKeyRef = React.useRef(routeKey);

  React.useEffect(() => {
    if (routeKey === prevKeyRef.current) return;
    prevKeyRef.current = routeKey;
    setPhase('exit');
    const t1 = setTimeout(() => setPhase('enter'), 180);
    const t2 = setTimeout(() => setPhase('idle'), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [routeKey]);

  return (
    <div style={{
      opacity: phase === 'exit' ? 0.35 : 1,
      transform: phase === 'exit' ? 'translateY(10px)' : 'none',
      transition: phase === 'idle' ? 'none'
        : 'opacity 0.38s cubic-bezier(0.16, 0.84, 0.44, 1), transform 0.38s cubic-bezier(0.16, 0.84, 0.44, 1)',
    }}>
      {children}
    </div>
  );
}

/* ---- CountUp: dramatic reveal counter ---- */
function CountUp({ value, duration = 1600, prefix = '', suffix = '', decimals = 0, color }) {
  const [display, setDisplay] = React.useState(0);
  const [ref, inView] = useInView();
  const started = React.useRef(false);

  React.useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // elastic ease out
      const ease = t === 1 ? 1 : 1 - Math.pow(2, -10 * t) * Math.cos((t * 10 - 0.75) * (2 * Math.PI) / 3);
      setDisplay(value * ease);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, value, duration]);

  return (
    <span ref={ref} className="display tabnum" style={{ color }}>
      {prefix}{display.toFixed(decimals).replace('.', ',')}{suffix}
    </span>
  );
}

/* ---- PulseRing: emanating rings from a center point ---- */
function PulseRing({ color = 'var(--accent)', size = 120, count = 3 }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: size, height: size,
          borderRadius: '50%',
          border: `2px solid ${color}`,
          opacity: 0,
          animation: `pulseRing 3s ease-out ${i * (3 / count)}s infinite`,
        }} />
      ))}
    </div>
  );
}

/* ---- GlowText: text with animated gradient glow ---- */
function GlowText({ children, style = {} }) {
  return (
    <span className="glow-text" style={style}>
      {children}
    </span>
  );
}

/* ---- AnimatedBorder: rotating gradient border ---- */
function AnimatedBorder({ children, className = '', style = {}, borderWidth = 2, speed = 4 }) {
  return (
    <div className={`animated-border ${className}`} style={{
      ...style,
      '--ab-width': `${borderWidth}px`,
      '--ab-speed': `${speed}s`,
    }}>
      {children}
    </div>
  );
}

/* ---- HeroReveal: React state-based stagger reveal ---- */
function HeroReveal({ children, delay = 0, className = '' }) {
  // Start visible immediately for zero-delay; otherwise animate in
  const [visible, setVisible] = React.useState(delay === 0);
  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    mountedRef.current = true;
    if (delay === 0) { setVisible(true); return; }
    // Use rAF first so the initial opacity:0 paint happens before transition starts
    const raf = requestAnimationFrame(() => {
      const t = setTimeout(() => {
        if (mountedRef.current) setVisible(true);
      }, delay * 1000);
      // no cleanup for the inner timeout — let it always fire
    });
    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'none' : 'translateY(28px)',
      filter: visible ? 'blur(0px)' : 'blur(6px)',
      transition: 'opacity 0.85s cubic-bezier(0.16, 0.84, 0.44, 1), transform 0.85s cubic-bezier(0.16, 0.84, 0.44, 1), filter 0.85s cubic-bezier(0.16, 0.84, 0.44, 1)',
    }}>
      {children}
    </div>
  );
}

/* ---- Toast notification system ---- */
const TOAST_ICONS = {
  charge: "⚡",
  discharge: "💰",
  idle: "⏸",
  success: "✓",
  info: "ℹ",
  warning: "⚠",
  savings: "€",
};

const TOAST_COLORS = {
  charge: "var(--c-charge)",
  discharge: "var(--accent)",
  idle: "var(--text-dim)",
  success: "var(--accent)",
  info: "var(--c-charge)",
  warning: "var(--price-mid)",
  savings: "var(--accent)",
};

let _toastId = 0;
let _setToasts = null;

function showToast(msg, type = "info", sub = "") {
  if (!_setToasts) return;
  const id = ++_toastId;
  _setToasts(ts => [...ts.slice(-4), { id, msg, sub, type }]);
  setTimeout(() => {
    _setToasts(ts => ts.filter(t => t.id !== id));
  }, 4500);
}

function ToastContainer() {
  const [toasts, setToasts] = React.useState([]);
  _setToasts = setToasts;

  return (
    <div style={{
      position: "fixed", bottom: 80, right: 24, zIndex: 1000,
      display: "flex", flexDirection: "column", gap: 10,
      pointerEvents: "none",
    }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          display: "flex", alignItems: "flex-start", gap: 12,
          background: "color-mix(in oklab, var(--surface) 92%, transparent)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          border: `1px solid color-mix(in oklab, ${TOAST_COLORS[t.type] || "var(--border)"} 40%, transparent)`,
          borderRadius: 14, padding: "12px 16px",
          boxShadow: `0 16px 48px -8px rgba(0,0,0,0.45), 0 0 0 1px color-mix(in oklab, ${TOAST_COLORS[t.type] || "var(--border)"} 15%, transparent)`,
          minWidth: 260, maxWidth: 320, pointerEvents: "auto",
          animation: "toastIn 0.35s cubic-bezier(0.16, 0.84, 0.44, 1) both",
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, flex: "none",
            display: "grid", placeItems: "center",
            fontSize: 16,
            background: `color-mix(in oklab, ${TOAST_COLORS[t.type] || "var(--accent)"} 16%, transparent)`,
            boxShadow: `0 4px 12px -4px color-mix(in oklab, ${TOAST_COLORS[t.type] || "var(--accent)"} 35%, transparent)`,
          }}>
            {TOAST_ICONS[t.type] || "ℹ"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{t.msg}</div>
            {t.sub && <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginTop: 2 }}>{t.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, {
  TiltCard, MouseGlow, ParticleField, StaggerIn,
  RouteTransition, CountUp, PulseRing, GlowText, AnimatedBorder, HeroReveal,
  ToastContainer, showToast,
});

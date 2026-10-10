/* enhanced-app.jsx — page transitions, glass shell, tweaks */

const FONTS = {
  clash: ['"Clash Display", sans-serif', '"Satoshi", sans-serif', "Clash Display + Satoshi"],
  space: ['"Space Grotesk", sans-serif', '"Manrope", sans-serif', "Space Grotesk + Manrope"],
  sora:  ['"Sora", sans-serif', '"Hanken Grotesk", sans-serif', "Sora + Hanken Grotesk"],
};
const DENSITY = { compact: 0.93, regular: 1, comfy: 1.08 };

const TWEAK_DEFAULTS = {
  "theme": "dark",
  "accent": ["#2fd07a", "#14b88a"],
  "fonts": "clash",
  "density": "regular",
  "soc": 64,
  "price": 6,
  "savings": 1.82,
  "active": true,
  "demoMode": true,
  "showSub": false,
  "showConfig": false
};

function NavItem({ icon, label, active, onClick }) {
  return (
    <button className={"nav-item" + (active ? " is-active" : "")} onClick={onClick}>
      {icon}<span>{label}</span>
    </button>
  );
}

function AppShell({ route, go, children }) {
  const [notifOpen, setNotifOpen] = React.useState(false);
  const navRef = React.useRef(null);

  // Scroll sidebar nav so active item is always visible
  React.useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.querySelector('.nav-item.is-active');
    if (!active) return;
    const navTop = nav.getBoundingClientRect().top;
    const itemTop = active.getBoundingClientRect().top;
    const offset = itemTop - navTop - 40;
    if (offset > 0) nav.scrollTop += offset;
    else if (itemTop - navTop < 0) nav.scrollTop += itemTop - navTop - 10;
  }, [route]);

  const nav = [
    ["dashboard",    "Dashboard",     I.dashboard({ size: 20 }), "1"],
    ["solar",        "Zonne-energie", I.solar({ size: 20 }),     "2"],
    ["history",      "Geschiedenis",  I.history({ size: 20 }),   "3"],
    ["strategy",     "Strategie",     I.strategy({ size: 20 }),  "4"],
    ["ev",           "EV-laden",      I.car({ size: 20 }),       "5"],
    ["subscription", "Abonnement",    I.crown({ size: 20 }),     "6"],
    ["settings",     "Instellingen",  I.settings({ size: 20 }), "7"],
  ];

  // Setup progress: how many key things are configured
  const setupSteps = [true, true, false, true]; // inverter, provider, ev, strategy — mock
  const setupPct = Math.round(setupSteps.filter(Boolean).length / setupSteps.length * 100);
  return (
    <div className="shell">
      <aside className="sidebar">
        <div style={{ padding: "var(--sp-5) var(--sp-5) var(--sp-8)" }} className="between">
          <Logo size={28} />
          <NotifBell onClick={() => setNotifOpen(true)} />
        </div>
        <nav ref={navRef} className="stack" style={{ gap: 6, padding: "0 var(--sp-4)", flex: 1, overflowY: "auto", minHeight: 0 }}>
          {nav.map(([r, l, ic, key]) => (
            <button key={r} className={"nav-item" + (route === r ? " is-active" : "")} onClick={() => go(r)}
              title={`${l} (${key})`}>
              {ic}
              <span className="nav-label">{l}</span>
              <span className="nav-key">{key}</span>
            </button>
          ))}
        </nav>
        <div style={{ padding: "var(--sp-4)", display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
          {/* setup progress */}
          {setupPct < 100 && (
            <div style={{ padding: "var(--sp-3) var(--sp-4)", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <div className="between" style={{ marginBottom: 6 }}>
                <span className="faint" style={{ fontSize: 12 }}>Setup</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>{setupPct}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "var(--surface-3)" }}>
                <div style={{ height: "100%", width: `${setupPct}%`, borderRadius: 2, background: "var(--accent)", boxShadow: "0 0 6px var(--accent)", transition: "width 0.6s cubic-bezier(0.16,0.84,0.44,1)" }} />
              </div>
            </div>
          )}
          {/* avatar — clickable to profile */}
          <button className="card" onClick={() => go("profile")} style={{ padding: "var(--sp-3) var(--sp-4)", background: "var(--surface-2)", border: "1px solid var(--border)", cursor: "pointer", textAlign: "left", transition: "border-color 0.2s ease, background 0.2s ease" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border-strong)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
          >
            <div className="row" style={{ gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), var(--accent-2))", display: "grid", placeItems: "center", fontWeight: 800, color: "#06140d", fontSize: 14, fontFamily: "var(--font-display)", flex: "none", boxShadow: "0 0 0 2px var(--surface), 0 0 0 3.5px color-mix(in oklab, var(--accent) 40%, transparent)" }}>JD</div>
              <div style={{ lineHeight: 1.2, flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Jan de Vries</div>
                <div className="faint" style={{ fontSize: 11.5 }}>Plus · BattBrain</div>
              </div>
              <div style={{ color: "var(--text-faint)" }}>{I.edit({ size: 14 })}</div>
            </div>
          </button>
          <button className="nav-item" onClick={() => go("landing")}>{I.logout({ size: 19 })}<span>Uitloggen</span></button>
        </div>
      </aside>

      <header className="topbar">
        <Logo size={26} />
        <div className="row" style={{ gap: "var(--sp-2)" }}>
          <NotifBell onClick={() => setNotifOpen(true)} />
          <button className="btn btn-ghost" onClick={() => go("landing")} style={{ padding: 9 }} aria-label="Uitloggen">{I.logout({ size: 18 })}</button>
        </div>
      </header>

      <main className="shell-main">{children}</main>

      <nav className="bottomnav">
        {nav.map(([r, l, ic]) => <NavItem key={r} icon={ic} label={l} active={route === r} onClick={() => go(r)} />)}
        <button className="nav-item" onClick={() => go("landing")}>{I.logout({ size: 20 })}<span>Uit</span></button>
      </nav>

      <NotifDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = React.useState("landing");
  const [view, setView] = React.useState("fluid");
  const [userName, setUserName] = React.useState("");
  const go = (r, name) => { setRoute(r); if (name) setUserName(name); window.scrollTo(0, 0); };

  // Keyboard shortcuts: 1-7 navigate dashboard screens
  React.useEffect(() => {
    const NAV_ROUTES = ["dashboard","solar","history","strategy","ev","subscription","settings"];
    const handler = (e) => {
      if (e.altKey || e.metaKey || e.ctrlKey) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const idx = parseInt(e.key, 10) - 1;
      if (idx >= 0 && idx < NAV_ROUTES.length) go(NAV_ROUTES[idx]);
      if (e.key === "Escape" && route !== "landing") go("dashboard");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [route]);

  React.useEffect(() => {
    const el = document.documentElement;
    el.setAttribute("data-theme", t.theme);
    const acc = Array.isArray(t.accent) ? t.accent : [t.accent, t.accent];
    el.style.setProperty("--accent", acc[0]);
    el.style.setProperty("--accent-2", acc[1] || acc[0]);
    const f = FONTS[t.fonts] || FONTS.clash;
    el.style.setProperty("--font-display", f[0]);
    el.style.setProperty("--font-body", f[1]);
    el.style.setProperty("--scale", DENSITY[t.density] || 1);
  }, [t.theme, t.accent, t.fonts, t.density]);

  React.useEffect(() => { Demo.setAnchors({ soc: t.soc, price: t.price, savings: t.savings }); }, [t.soc, t.price, t.savings]);

  const flags = { active: t.active, demoMode: t.demoMode, showSub: t.showSub, showConfig: t.showConfig };

  let screen;
  if (route === "landing") screen = <Landing go={go} />;
  else if (route === "login") screen = <Auth mode="login" go={go} />;
  else if (route === "onboarding") screen = <Onboarding go={go} userName={userName} />;
  else if (route === "register") screen = <Auth mode="register" go={go} />;
  else if (route === "dashboard") screen = <AppShell route={route} go={go}><Dashboard flags={flags} go={go} /></AppShell>;
  else if (route === "subscription") screen = <AppShell route={route} go={go}><Subscription flags={flags} go={go} /></AppShell>;
  else if (route === "history") screen = <AppShell route={route} go={go}><History go={go} /></AppShell>;
  else if (route === "strategy") screen = <AppShell route={route} go={go}><Strategy go={go} /></AppShell>;
  else if (route === "ev")       screen = <AppShell route={route} go={go}><EvCharging go={go} /></AppShell>;
  else if (route === "profile")  screen = <AppShell route={route} go={go}><Profile go={go} /></AppShell>;
  else if (route === "solar")    screen = <AppShell route={route} go={go}><Solar go={go} /></AppShell>;
  else if (route === "settings") screen = <AppShell route={route} go={go}><PageWrap><Settings go={go} /></PageWrap></AppShell>;

  return (
    <React.Fragment>
      <div className="app-bg" /><div className="app-noise" />
      <ToastContainer />

      <div className={"viewport vp-" + view}>
        <div className="app-container">
          <RouteTransition routeKey={route}>
            {screen}
          </RouteTransition>
        </div>
      </div>

      <div className="device-toggle">
        <button className={view === "fluid" ? "on" : ""} onClick={() => setView("fluid")} title="Volledig scherm">{I.dashboard({ size: 15 })} Desktop</button>
        <button className={view === "phone" ? "on" : ""} onClick={() => setView("phone")} title="Mobiele weergave">{I.battery({ size: 15 })} Mobiel</button>
      </div>

      <TweaksPanel>
        <TweakSection label="Thema" />
        <TweakRadio label="Modus" value={t.theme} options={["dark", "light"]} onChange={(v) => setTweak("theme", v)} />
        <TweakColor label="Accentkleur" value={t.accent}
          options={[["#2fd07a", "#14b88a"], ["#4f8cff", "#2f6bd0"], ["#18c2c2", "#0e9a9a"], ["#8b7bff", "#6a55e6"], ["#f5a623", "#d98512"]]}
          onChange={(v) => setTweak("accent", v)} />

        <TweakSection label="Typografie" />
        <TweakSelect label="Lettertype" value={t.fonts}
          options={Object.keys(FONTS).map((k) => ({ value: k, label: FONTS[k][2] }))}
          onChange={(v) => setTweak("fonts", v)} />
        <TweakRadio label="Dichtheid" value={t.density} options={["compact", "regular", "comfy"]} onChange={(v) => setTweak("density", v)} />

        <TweakSection label="Demo-data" />
        <TweakSlider label="Laadtoestand" value={t.soc} min={10} max={100} step={1} unit="%" onChange={(v) => setTweak("soc", v)} />
        <TweakSlider label="Huidige prijs" value={t.price} min={0} max={45} step={0.5} unit=" ct" onChange={(v) => setTweak("price", v)} />
        <TweakSlider label="Besparing" value={t.savings} min={0} max={12} step={0.05} unit=" €" onChange={(v) => setTweak("savings", v)} />

        <TweakSection label="Scenario (dashboard)" />
        <TweakToggle label="Optimizer actief" value={t.active} onChange={(v) => setTweak("active", v)} />
        <TweakToggle label="Demo-modus badge" value={t.demoMode} onChange={(v) => setTweak("demoMode", v)} />
        <TweakToggle label="Banner: geen abonnement" value={t.showSub} onChange={(v) => setTweak("showSub", v)} />
        <TweakToggle label="Banner: niet geconfigureerd" value={t.showConfig} onChange={(v) => setTweak("showConfig", v)} />
      </TweaksPanel>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

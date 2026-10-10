/* app.jsx — router, app chrome, tweaks */

const FONTS = {
  clash: ['"Clash Display", sans-serif', '"Satoshi", sans-serif', "Clash Display + Satoshi"],
  space: ['"Space Grotesk", sans-serif', '"Manrope", sans-serif', "Space Grotesk + Manrope"],
  sora:  ['"Sora", sans-serif', '"Hanken Grotesk", sans-serif', "Sora + Hanken Grotesk"],
};
const DENSITY = { compact: 0.93, regular: 1, comfy: 1.08 };

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
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
}/*EDITMODE-END*/;

function NavItem({ icon, label, active, onClick }) {
  return (
    <button className={"nav-item" + (active ? " is-active" : "")} onClick={onClick}>
      {icon}<span>{label}</span>
    </button>
  );
}

function AppShell({ route, go, children }) {
  const nav = [
    ["dashboard", "Dashboard", I.dashboard({ size: 20 })],
    ["subscription", "Abonnement", I.crown({ size: 20 })],
    ["settings", "Instellingen", I.settings({ size: 20 })],
  ];
  return (
    <div className="shell">
      <aside className="sidebar">
        <div style={{ padding: "var(--sp-5) var(--sp-5) var(--sp-8)" }}><Logo size={28} /></div>
        <nav className="stack" style={{ gap: 6, padding: "0 var(--sp-4)", flex: 1 }}>
          {nav.map(([r, l, ic]) => <NavItem key={r} icon={ic} label={l} active={route === r} onClick={() => go(r)} />)}
        </nav>
        <div style={{ padding: "var(--sp-4)" }}>
          <div className="card" style={{ padding: "var(--sp-4)", marginBottom: "var(--sp-3)" }}>
            <div className="row" style={{ gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--surface-3)", display: "grid", placeItems: "center", fontWeight: 700, color: "var(--accent)" }}>JD</div>
              <div style={{ lineHeight: 1.2 }}><div style={{ fontWeight: 600, fontSize: 14 }}>Jij</div><div className="faint" style={{ fontSize: 12 }}>Plus · €6,95/mnd</div></div>
            </div>
          </div>
          <button className="nav-item" onClick={() => go("landing")}>{I.logout({ size: 19 })}<span>Uitloggen</span></button>
        </div>
      </aside>

      {/* mobile top bar */}
      <header className="topbar">
        <Logo size={26} />
        <button className="btn btn-ghost" onClick={() => go("landing")} style={{ padding: 9 }} aria-label="Uitloggen">{I.logout({ size: 18 })}</button>
      </header>

      <main className="shell-main">{children}</main>

      {/* mobile bottom nav */}
      <nav className="bottomnav">
        {nav.map(([r, l, ic]) => <NavItem key={r} icon={ic} label={l} active={route === r} onClick={() => go(r)} />)}
        <button className="nav-item" onClick={() => go("landing")}>{I.logout({ size: 20 })}<span>Uit</span></button>
      </nav>
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = React.useState("landing");
  const [view, setView] = React.useState("fluid"); // fluid | phone
  const go = (r) => { setRoute(r); window.scrollTo(0, 0); };

  // apply visual tweaks
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

  // apply demo-data tweaks
  React.useEffect(() => { Demo.setAnchors({ soc: t.soc, price: t.price, savings: t.savings }); }, [t.soc, t.price, t.savings]);

  const flags = { active: t.active, demoMode: t.demoMode, showSub: t.showSub, showConfig: t.showConfig };
  const inApp = route === "dashboard" || route === "settings";

  let screen;
  if (route === "landing") screen = <Landing go={go} />;
  else if (route === "login") screen = <Auth mode="login" go={go} />;
  else if (route === "register") screen = <Auth mode="register" go={go} />;
  else if (route === "dashboard") screen = <AppShell route={route} go={go}><Dashboard flags={flags} go={go} /></AppShell>;
  else if (route === "subscription") screen = <AppShell route={route} go={go}><Subscription flags={flags} go={go} /></AppShell>;
  else if (route === "settings") screen = <AppShell route={route} go={go}><Settings go={go} /></AppShell>;

  return (
    <React.Fragment>
      <div className="app-bg" /><div className="app-noise" />

      <div className={"viewport vp-" + view} key={route}>
        <div className="app-container">{screen}</div>
      </div>

      {/* device toggle */}
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

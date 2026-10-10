// BattBrain dashboard (advice mode). Fetches api/snapshot (relative, so it works behind HA ingress).
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const $ = (id) => document.getElementById(id);
  const nf = (d) => new Intl.NumberFormat("nl-NL", { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmt = (v, d = 0) => (v === null || v === undefined || Number.isNaN(v) ? "–" : nf(d).format(v));
  const eur = (v, d = 2) => (v === null || v === undefined ? "–" : (v < 0 ? "−€" : "€") + nf(d).format(Math.abs(v)));
  const signedEur = (v) => (v === null || v === undefined ? "–" : (v >= 0 ? "+" : "−") + "€" + nf(2).format(Math.abs(v)));
  const hm = (iso) => new Date(iso).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  const dayHm = (iso) => {
    const d = new Date(iso), today = new Date();
    const prefix = d.toDateString() === today.toDateString() ? "" : d.toLocaleDateString("nl-NL", { weekday: "short" }) + " ";
    return prefix + hm(iso);
  };
  const power = (w) => {
    if (w === null || w === undefined) return "–";
    const a = Math.abs(w);
    return a >= 1000 ? fmt(a / 1000, 1) + " kW" : fmt(a, 0) + " W";
  };
  const el = (name, attrs = {}, parent) => {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };

  const ACTIONS = {
    charge_grid: { label: "Laden van het net", color: "var(--c-charge)", icon: "M13 2 4 14h7l-1 8 9-12h-7z" },
    charge_solar: { label: "Zon opslaan", color: "var(--c-pv)", icon: "M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" },
    discharge: { label: "Ontladen", color: "var(--c-discharge)", icon: "M12 4v12M6 10l6 6 6-6M5 20h14" },
    hold: { label: "Vasthouden", color: "var(--c-hold)", icon: "M8 5v14M16 5v14" },
    idle: { label: "Zelfverbruik", color: "var(--c-idle)", icon: "M3 11 12 4l9 7M5 10v10h14V10" },
  };
  const LEVEL = { low: "laag", mid: "gemiddeld", high: "hoog" };
  const LABELS = {
    soc: "batterij-SoC", price: "prijssensor", solar_today: "zon vandaag", solar_remaining: "zon nog verwacht",
    solar_tomorrow: "zon morgen", grid_power: "netvermogen (P1)", solar_power: "zonnevermogen",
    battery_power: "batterijvermogen", reserve_switch: "reserveschakelaar", target_soc: "doel-SoC",
  };

  /* ---------------- notices ---------------- */
  function notices(s) {
    const box = $("notices");
    box.textContent = "";
    const add = (t) => { const d = document.createElement("div"); d.className = "notice"; d.textContent = t; box.appendChild(d); };
    if (s.demo) add("Demomodus: voorbeeldgegevens met echte Frank-prijzen van 9 en 10 oktober, niet jouw installatie.");
    if (!s.connected) add("Geen verbinding met Home Assistant. De laatst bekende waarden worden getoond.");
    if (s.missing_entities && s.missing_entities.length) add("Niet gevonden in Home Assistant: " + s.missing_entities.join(", ") + ". Controleer de entity_id's in de app-instellingen.");
    if (s.unconfigured && s.unconfigured.length && !s.demo) add("Nog niet ingesteld: " + s.unconfigured.map((k) => LABELS[k] || k).join(", ") + ".");
    if (s.advice && s.advice.error) add(s.advice.error);
  }

  /* ---------------- hero ---------------- */
  function hero(s) {
    const a = s.advice || {};
    const act = ACTIONS[a.action] || ACTIONS.idle;
    $("hero").dataset.action = a.action || "idle";
    $("hero-label").textContent = a.label || "Nog geen advies";
    $("hero-reason").textContent = a.reason || "Het plan wordt berekend zodra laadtoestand en prijzen bekend zijn.";
    const icon = $("hero-icon");
    icon.textContent = "";
    el("path", { d: act.icon }, icon);
    $("hero-until").textContent = a.until ? "tot " + dayHm(a.until) : "";
    $("hero-next").textContent = a.next ? "daarna " + a.next.label.toLowerCase() + " · " + dayHm(a.next.t) : "";
    const m = $("hero-match");
    m.className = "match" + (a.matches_current === true ? " yes" : a.matches_current === false ? " no" : "");
    m.textContent = a.matches_current === true ? "Doet hetzelfde ✓" : a.matches_current === false ? "Doet nu iets anders" : "Onbekend";
    $("hero-agree").textContent = a.agreement_today == null ? (a.matches_current == null ? "Stel de reserveschakelaar in om te vergelijken." : "")
      : `Vandaag ${a.agreement_today}% van de tijd gelijk aan het advies`;
    const sv = a.savings || {};
    $("sav-none").textContent = sv.vs_no_battery == null ? "–" : signedEur(sv.vs_no_battery);
    $("sav-self").textContent = sv.vs_self_use == null ? "–" : signedEur(sv.vs_self_use);
    $("sav-horizon").textContent = sv.horizon_end ? "Verwachting tot " + dayHm(sv.horizon_end) + ", op basis van voorspellingen" : "";
  }

  /* ---------------- energy flow (animated) ---------------- */
  const N = { sun: [200, 54], grid: [58, 182], home: [342, 182], bat: [200, 296] };
  const R = 34;
  const FLOWS = [
    { id: "sun-home", d: "M200,88 C200,150 270,182 308,182", color: "var(--c-pv)" },
    { id: "sun-bat", d: "M200,88 L200,262", color: "var(--c-pv)" },
    { id: "sun-grid", d: "M200,88 C200,150 130,182 92,182", color: "var(--c-pv)" },
    { id: "grid-home", d: "M92,182 L308,182", color: "var(--c-grid)" },
    { id: "grid-bat", d: "M92,182 C140,182 200,215 200,262", color: "var(--c-charge)" },
    { id: "bat-home", d: "M200,262 C200,215 260,182 308,182", color: "var(--c-discharge)" },
  ];
  const NODE_ICONS = {
    sun: { color: "var(--c-pv)", d: ACTIONS.charge_solar.icon },
    grid: { color: "var(--c-grid)", d: "M7 21 12 3l5 18M8.5 15h7M9.8 10h4.4M4 7h16" },
    home: { color: "var(--accent)", d: "M3 11 12 4l9 7M5 10v10h14V10M10 20v-5h4v5" },
    bat: { color: "var(--c-charge)", d: "M7 7h10v13H7zM10 4h4v3" },
  };
  let flowBuilt = false;
  const flowState = {};

  function buildFlow() {
    const svg = el("svg", { viewBox: "0 0 400 392", role: "img", "aria-label": "Energiestroom nu" });
    const defs = el("defs", {}, svg);
    FLOWS.forEach((f) => {
      el("path", { id: "fp-" + f.id, d: f.d, class: "f-path" }, defs);
      const p = el("use", { href: "#fp-" + f.id, class: "f-path", id: "fu-" + f.id }, svg);
      p.style.stroke = f.color; p.style.strokeOpacity = 0.12;
      const g = el("g", { id: "fd-" + f.id, visibility: "hidden" }, svg);
      for (let k = 0; k < 3; k++) {
        const c = el("circle", { r: 4.2, class: "f-dot" }, g);
        c.style.fill = f.color; c.style.color = f.color;
        const am = el("animateMotion", { dur: "3s", repeatCount: "indefinite", begin: `-${k}s`, rotate: "auto" }, c);
        el("mpath", { href: "#fp-" + f.id }, am);
      }
    });
    Object.entries(N).forEach(([key, [x, y]]) => {
      const g = el("g", { class: "f-node", id: "fn-" + key }, svg);
      el("circle", { cx: x, cy: y, r: R, class: "bgc" }, g);
      if (key === "bat") {
        const circ = 2 * Math.PI * (R + 5);
        el("circle", { cx: x, cy: y, r: R + 5, fill: "none", stroke: "var(--border-strong)", "stroke-width": 3 }, g);
        const arc = el("circle", { cx: x, cy: y, r: R + 5, fill: "none", stroke: "var(--accent)", "stroke-width": 3, "stroke-linecap": "round",
          "stroke-dasharray": `0 ${circ}`, transform: `rotate(-90 ${x} ${y})`, id: "bat-arc" }, g);
        arc.dataset.circ = circ;
      }
      const ic = el("g", { transform: `translate(${x - 12},${y - 12})` }, g);
      const path = el("path", { d: NODE_ICONS[key].d, class: "f-ico" }, ic);
      path.style.stroke = NODE_ICONS[key].color;
      const below = key === "sun" ? y - R - 12 : y + R + (key === "bat" ? 24 : 20);
      const nameY = key === "sun" ? below - 18 : below;
      const valY = key === "sun" ? below : below + 18;
      const name = el("text", { x, y: nameY, class: "f-name", id: "fname-" + key }, g);
      name.textContent = { sun: "Zon", grid: "Net", home: "Huis", bat: "Batterij" }[key];
      el("text", { x, y: valY, class: "f-val", id: "fval-" + key }, g).textContent = "–";
    });
    $("flow").appendChild(svg);
    flowBuilt = true;
  }

  function splitFlows(p) {
    const s = Math.max(p.solar_w || 0, 0), h = Math.max(p.house_w || 0, 0), b = p.battery_w || 0;
    const sunHome = Math.min(s, h);
    let sr = s - sunHome;
    const sunBat = Math.min(sr, Math.max(b, 0));
    sr -= sunBat;
    const batHome = Math.min(Math.max(-b, 0), h - sunHome);
    const gridHome = Math.max(h - sunHome - batHome, 0);
    const gridBat = Math.max(Math.max(b, 0) - sunBat, 0);
    return { "sun-home": sunHome, "sun-bat": sunBat, "sun-grid": sr, "grid-home": gridHome, "grid-bat": gridBat, "bat-home": batHome };
  }

  function flow(s) {
    if (!flowBuilt) buildFlow();
    const p = s.power || {};
    const f = splitFlows(p);
    FLOWS.forEach((fl) => {
      const w = f[fl.id] || 0, on = w > 30;
      const dots = $("fd-" + fl.id), use = $("fu-" + fl.id);
      dots.setAttribute("visibility", on ? "visible" : "hidden");
      use.style.strokeOpacity = on ? 0.45 : 0.1;
      use.style.strokeWidth = on ? 2 + Math.min(w / 1000, 3) : 2;
      const dur = Math.max(0.7, Math.min(5, 4.5 / (0.6 + w / 1000))).toFixed(1);
      if (on && flowState[fl.id] !== dur) {
        flowState[fl.id] = dur;
        dots.querySelectorAll("animateMotion").forEach((am, k) => { am.setAttribute("dur", dur + "s"); am.setAttribute("begin", `-${(k * dur / 3).toFixed(2)}s`); });
      }
    });
    $("fval-sun").textContent = power(p.solar_w);
    $("fval-home").textContent = power(p.house_w);
    $("fval-grid").textContent = power(p.grid_w);
    $("fname-grid").textContent = p.grid_w == null ? "Net" : p.grid_w > 30 ? "Net · afname" : p.grid_w < -30 ? "Net · teruglevering" : "Net";
    $("fval-bat").textContent = (s.soc == null ? "–" : fmt(s.soc) + "%") + (p.battery_w && Math.abs(p.battery_w) > 30 ? " · " + power(p.battery_w) : "");
    $("fname-bat").textContent = p.battery_w > 30 ? "Batterij · laden" : p.battery_w < -30 ? "Batterij · ontladen" : "Batterij";
    const arc = $("bat-arc");
    const circ = +arc.dataset.circ;
    arc.setAttribute("stroke-dasharray", `${circ * (s.soc || 0) / 100} ${circ}`);
    ["sun", "grid", "home", "bat"].forEach((k) => $("fn-" + k).classList.toggle("on",
      k === "sun" ? p.solar_w > 30 : k === "grid" ? Math.abs(p.grid_w || 0) > 30 : k === "bat" ? Math.abs(p.battery_w || 0) > 30 : true));
    const self = p.house_w > 0 ? Math.round(100 * Math.min(1, ((f["sun-home"] || 0) + (f["bat-home"] || 0)) / p.house_w)) : null;
    $("flow-summary").textContent = self == null ? "" : `${self}% van je verbruik uit zon en batterij`;
  }

  /* ---------------- KPIs ---------------- */
  function kpis(s) {
    $("soc").textContent = fmt(s.soc);
    $("soc-ring").style.setProperty("--p", s.soc || 0);
    $("soc-kwh").textContent = s.stored_kwh == null ? "–" : `${fmt(s.stored_kwh, 1)} van ${fmt(s.system.capacity_kwh, 1)} kWh`;
    $("soc-reserve").textContent = `Reserve ${fmt(s.system.reserve_soc)}%`;
    $("price").textContent = s.price.now == null ? "–" : nf(3).format(s.price.now);
    const lvl = $("price-level");
    lvl.className = "badge" + (s.price.level_now ? " " + s.price.level_now : "");
    lvl.textContent = s.price.level_now ? "tarief " + LEVEL[s.price.level_now] : "onbekend";
    $("price-range").textContent = s.price.today_min == null ? "" : `vandaag ${eur(s.price.today_min, 3)} – ${eur(s.price.today_max, 3)}`;
    $("solar-remaining").textContent = fmt(s.solar.remaining_kwh, 1);
    $("solar-sub").textContent = `Vandaag ${fmt(s.solar.today_kwh, 1)} kWh · morgen ${fmt(s.solar.tomorrow_kwh, 1)} kWh`;
  }

  /* ---------------- plan chart ---------------- */
  function legend() {
    const box = $("legend");
    if (box.childElementCount) return;
    Object.entries(ACTIONS).forEach(([k, a]) => {
      const s = document.createElement("span");
      const i = document.createElement("i");
      i.style.background = a.color;
      if (k === "idle") i.style.opacity = 0.5;
      s.appendChild(i);
      s.appendChild(document.createTextNode(k === "charge_solar" ? "zon opslaan" : a.label.toLowerCase()));
      box.appendChild(s);
    });
  }

  let planData = null;
  function plan(s) {
    planData = s;
    legend();
    const a = s.advice || {};
    const pts = a.plan || [];
    const box = $("plan");
    box.querySelectorAll("svg").forEach((n) => n.remove());
    $("cheap").textContent = a.cheapest_window ? `Goedkoopste 2 uur: ${hm(a.cheapest_window.start)}–${hm(a.cheapest_window.end)} · ${eur(a.cheapest_window.price, 3)}` : "";
    if (!pts.length) { $("plan-note").textContent = "Nog geen plan."; return; }
    const W = Math.max(box.clientWidth, 300), L = 40, Rm = 8, socH = 96, gap = 40, prH = 140, axis = 24;
    const top1 = 28, top2 = top1 + socH + gap, H = top2 + prH + axis;
    const n = pts.length, bw = (W - L - Rm) / n;
    const x = (i) => L + i * bw;
    const pmax = Math.max(0.1, ...pts.map((p) => p.price)), pmin = Math.min(0, ...pts.map((p) => p.price));
    const yP = (v) => top2 + prH * (1 - (v - pmin) / (pmax - pmin));
    const yS = (v) => top1 + socH * (1 - v / 100);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Plan: verwachte laadtoestand en prijs per kwartier" });
    const defs = el("defs", {}, svg);
    const grad = el("linearGradient", { id: "socfill", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el("stop", { offset: "0%", "stop-color": "#2fd07a", "stop-opacity": 0.45 }, grad);
    el("stop", { offset: "100%", "stop-color": "#2fd07a", "stop-opacity": 0.02 }, grad);

    // panel labels + gridlines
    el("text", { x: L, y: top1 - 14, class: "p-panel" }, svg).textContent = "LAADTOESTAND";
    el("text", { x: L, y: top2 - 14, class: "p-panel" }, svg).textContent = "PRIJS (€/KWH) EN ACTIE";
    [0, 50, 100].forEach((v) => {
      el("line", { x1: L, x2: W - Rm, y1: yS(v), y2: yS(v), class: "p-grid" }, svg);
      el("text", { x: L - 6, y: yS(v) + 4, "text-anchor": "end", class: "p-tick" }, svg).textContent = v + "%";
    });
    const step = pmax > 0.3 ? 0.1 : 0.05;
    for (let v = 0; v <= pmax + 1e-9; v += step) {
      el("line", { x1: L, x2: W - Rm, y1: yP(v), y2: yP(v), class: "p-grid" }, svg);
      el("text", { x: L - 6, y: yP(v) + 4, "text-anchor": "end", class: "p-tick" }, svg).textContent = nf(2).format(v);
    }
    // SoC area
    let d = `M${x(0)},${yS(pts[0].soc)}`;
    pts.forEach((p, i) => { d += ` L${x(i + 1)},${yS(p.soc)}`; });
    el("path", { d: d + ` L${x(n)},${yS(0)} L${x(0)},${yS(0)} Z`, fill: "url(#socfill)" }, svg);
    el("path", { d, class: "p-soc" }, svg);
    // price bars coloured by action
    pts.forEach((p, i) => el("rect", { x: x(i) + 0.4, y: Math.min(yP(p.price), yP(0)), width: Math.max(bw - 0.8, 0.6), height: Math.abs(yP(0) - yP(p.price)), class: "a-" + p.action }, svg));
    // time axis
    pts.forEach((p, i) => {
      const t = new Date(p.t);
      if (t.getMinutes() !== 0 || t.getHours() % (n > 100 ? 6 : 3) !== 0) return;
      const major = t.getHours() === 0;
      el("line", { x1: x(i), x2: x(i), y1: top1, y2: top2 + prH, class: "p-grid", "stroke-opacity": major ? 1 : 0.5 }, svg);
      el("text", { x: x(i) + 3, y: H - 6, class: "p-tick" }, svg).textContent = major ? t.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric" }) : `${t.getHours()}:00`;
    });
    // now line (inside the first step)
    const now = new Date(s.updated), t0 = new Date(pts[0].t);
    const nowX = x(Math.max(0, Math.min(1, (now - t0) / 9e5)));
    el("line", { x1: nowX, x2: nowX, y1: top1, y2: top2 + prH, class: "p-now" }, svg);
    // hover
    const hover = el("line", { y1: top1, y2: top2 + prH, class: "p-hover", visibility: "hidden" }, svg);
    const hit = el("rect", { x: L, y: top1, width: W - L - Rm, height: top2 + prH - top1, fill: "transparent" }, svg);
    const tip = $("plan-tip");
    const move = (ev) => {
      const r = svg.getBoundingClientRect();
      const sx = (ev.clientX - r.left) * W / r.width;
      const i = Math.max(0, Math.min(n - 1, Math.floor((sx - L) / bw)));
      const p = pts[i];
      hover.setAttribute("x1", x(i) + bw / 2); hover.setAttribute("x2", x(i) + bw / 2); hover.setAttribute("visibility", "visible");
      tip.innerHTML = "";
      const b = document.createElement("b"); b.textContent = dayHm(p.t); tip.appendChild(b);
      tip.appendChild(document.createElement("br"));
      tip.appendChild(document.createTextNode(`${(ACTIONS[p.action] || ACTIONS.idle).label} · ${eur(p.price, 3)}/kWh · ${fmt(p.soc)}%`));
      tip.hidden = false;
      const px = (x(i) + bw / 2) * r.width / W;
      tip.style.left = Math.min(Math.max(px + 12, 0), r.width - tip.offsetWidth) + "px";
      tip.style.top = "0px";
    };
    hit.addEventListener("pointermove", move);
    hit.addEventListener("pointerdown", move);
    hit.addEventListener("pointerleave", () => { tip.hidden = true; hover.setAttribute("visibility", "hidden"); });
    box.insertBefore(svg, tip);
    const sv = a.savings || {};
    $("plan-title").textContent = "Plan tot " + (sv.horizon_end ? dayHm(sv.horizon_end) : "–");
    $("plan-note").textContent = s.price.tomorrow_known ? "" : "Het plan loopt verder zodra de prijzen voor morgen bekend zijn (meestal 13:00–15:00).";
  }

  /* ---------------- timeline + control ---------------- */
  function timeline(s) {
    const a = s.advice || {};
    const box = $("timeline");
    const items = a.log || [];
    box.textContent = "";
    if (!items.length) { const li = document.createElement("li"); li.className = "empty"; li.textContent = "Nog geen beslissingen."; box.appendChild(li); return; }
    items.forEach((it) => {
      const li = document.createElement("li");
      const t = document.createElement("time"); t.textContent = dayHm(it.t);
      const dot = document.createElement("span"); dot.className = "dot d-" + it.action;
      const body = document.createElement("div");
      const what = document.createElement("div"); what.className = "what"; what.textContent = it.label;
      const why = document.createElement("div"); why.className = "why"; why.textContent = it.reason;
      body.append(what, why);
      const ok = document.createElement("span");
      ok.className = "ok" + (it.matches_current === false ? " no" : "");
      ok.textContent = it.matches_current === true ? "gelijk" : it.matches_current === false ? "anders" : "";
      li.append(t, dot, body, ok);
      box.appendChild(li);
    });
  }

  function control(s) {
    const a = s.advice || {};
    const c = a.control;
    $("ctl-advice").textContent = !c ? "–" : c.reserve_on ? `reserve aan, doel ${fmt(c.target_soc)}%` : "reserve uit (zelfverbruik)";
    const cur = s.control || {};
    $("ctl-current").textContent = cur.reserve_on == null ? "onbekend" : cur.reserve_on ? `reserve aan, doel ${fmt(cur.target_soc)}%` : "reserve uit";
    $("ctl-export").textContent = a.export || "–";
    $("sys").textContent = `${fmt(s.system.capacity_kwh, 1)} kWh · ${fmt(s.system.max_power_kw, 1)} kW`;
  }

  /* ---------------- main loop ---------------- */
  function render(s) {
    notices(s);
    const pill = $("mode-pill");
    pill.className = "pill" + (s.demo ? " demo" : s.connected ? "" : " offline");
    $("mode-text").textContent = s.demo ? "Demo · adviesmodus" : s.connected ? "Adviesmodus · stuurt niets" : "Geen verbinding";
    $("updated").textContent = "Bijgewerkt " + new Date(s.updated).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    hero(s); flow(s); kpis(s); plan(s); timeline(s); control(s);
  }

  async function tick() {
    try {
      const r = await fetch("api/snapshot", { cache: "no-store" });
      render(await r.json());
    } catch (e) {
      $("mode-text").textContent = "App niet bereikbaar";
      $("mode-pill").className = "pill offline";
    }
  }
  tick();
  setInterval(tick, 15000);
  let to;
  window.addEventListener("resize", () => { clearTimeout(to); to = setTimeout(() => planData && plan(planData), 150); });
})();

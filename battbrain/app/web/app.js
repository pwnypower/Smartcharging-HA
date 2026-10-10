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
    const st = s.steering || {};
    $("hero-eyebrow").textContent = st.mode === "control" && st.active && !st.fallback ? "BattBrain doet nu" : "BattBrain adviseert nu";
    if (st.mode === "control") {
      $("hero-match-label").textContent = "Sturing";
      if (st.active && !st.fallback) {
        m.className = "match" + (a.matches_current === false ? " no" : " yes");
        m.textContent = a.matches_current === false ? "Omvormer wordt bijgestuurd" : "BattBrain stuurt ✓";
      } else {
        m.className = "match no";
        m.textContent = st.paused_until ? "Gepauzeerd" : st.fallback ? "Terugval: zelfverbruik" : "Staat stil";
      }
    } else {
      $("hero-match-label").textContent = "Je huidige sturing";
    }
    const sv = a.savings || {};
    const today = ((a.realised || {}).today) || {};
    const measuring = today.minutes != null && today.minutes < 15;
    $("sav-today").textContent = today.saving == null || measuring ? "–" : signedEur(today.saving);
    $("sav-today").classList.toggle("neg", !measuring && today.saving != null && today.saving < 0);
    $("sav-today-sub").textContent = measuring ? "vandaag: meten is net begonnen"
      : today.saving < 0 && sv.vs_no_battery > 0 ? "vandaag tot nu: laden kost nu, levert later vandaag op"
      : "vandaag tot nu, gemeten";
    $("sav-plan").textContent = sv.vs_no_battery == null ? "–" : signedEur(sv.vs_no_battery);
    $("sav-plan-sub").textContent = sv.horizon_end ? "verwacht tot " + dayHm(sv.horizon_end) : "verwacht met dit plan";
    $("sav-self").textContent = sv.vs_self_use == null ? "" : `Daarvan ${signedEur(sv.vs_self_use)} door slim plannen, t.o.v. alleen zelfverbruik`;
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
    const a = s.advice || {};
    $("soc").textContent = fmt(s.soc);
    $("soc-ring").style.setProperty("--p", s.soc || 0);
    $("soc-kwh").textContent = s.stored_kwh == null ? "–" : `${fmt(s.stored_kwh, 1)} van ${fmt(s.system.capacity_kwh, 1)} kWh`;
    $("soc-eta").textContent = a.full_at && (!a.empty_at || a.full_at < a.empty_at) ? "Volgens plan vol om " + dayHm(a.full_at)
      : a.empty_at ? "Volgens plan op reserve om " + dayHm(a.empty_at) : "";
    $("soc-reserve").textContent = `Reserve ${fmt(s.system.reserve_soc)}%`;
    $("price").textContent = s.price.now == null ? "–" : nf(3).format(s.price.now);
    const lvl = $("price-level");
    lvl.className = "badge" + (s.price.level_now ? " " + s.price.level_now : "");
    lvl.textContent = s.price.level_now ? LEVEL[s.price.level_now] : "onbekend";
    const todayPts = (s.price.curve || []).filter((c) => new Date(c.t).toDateString() === new Date(s.updated).toDateString());
    const avg = todayPts.length ? todayPts.reduce((t, c) => t + c.price, 0) / todayPts.length : null;
    $("price-range").textContent = avg == null ? "" : `gem. vandaag ${eur(avg, 3)} · ${eur(s.price.today_min, 3)} – ${eur(s.price.today_max, 3)}`;
    spark(todayPts, avg, new Date(s.updated));
    $("solar-remaining").textContent = fmt(s.solar.remaining_kwh, 1);
    const sc = a.solar_correction || {};
    $("solar-sub").textContent = `Vandaag ${fmt(s.solar.today_kwh, 1)} kWh · morgen ${fmt(s.solar.tomorrow_kwh, 1)} kWh`
      + (sc.days >= 3 && Math.abs(sc.factor - 1) > 0.02 ? ` · BattBrain rekent met ×${nf(2).format(sc.factor)} (gemeten over ${sc.days} dagen)`
        : sc.days != null && sc.days < 3 ? ` · zoncorrectie na ${3 - sc.days} volle dag${3 - sc.days === 1 ? "" : "en"} meten` : "");
  }

  function spark(pts, avg, now) {
    const box = $("spark");
    box.textContent = "";
    if (pts.length < 2) return;
    const W = 300, H = 46, n = pts.length;
    const max = Math.max(...pts.map((p) => p.price)), min = Math.min(...pts.map((p) => p.price));
    const x = (i) => (i / n) * W, y = (v) => 4 + (H - 8) * (1 - (v - min) / Math.max(max - min, 0.01));
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none", "aria-hidden": "true" }, box);
    let d = "";
    pts.forEach((p, i) => { d += `${i ? "L" : "M"}${x(i)},${y(p.price)} L${x(i + 1)},${y(p.price)} `; });
    el("path", { d: d + `L${W},${H} L0,${H} Z`, class: "area" }, svg);
    el("path", { d, class: "line", "vector-effect": "non-scaling-stroke" }, svg);
    if (avg != null) el("line", { x1: 0, x2: W, y1: y(avg), y2: y(avg), class: "avg", "vector-effect": "non-scaling-stroke" }, svg);
    const i = pts.findIndex((p, k) => now >= new Date(p.t) && (k === n - 1 || now < new Date(pts[k + 1].t)));
    if (i >= 0) {
      const cx = x(i) + (x(i + 1) - x(i)) / 2;
      el("rect", { x: x(i), y: 0, width: x(i + 1) - x(i), height: H, fill: "var(--text)", "fill-opacity": 0.06 }, svg);
      el("circle", { cx, cy: y(pts[i].price), r: 4, class: "nowdot lv-" + pts[i].level, "vector-effect": "non-scaling-stroke" }, svg);
    }
  }

  /* ---------------- savings per day ---------------- */
  function days(s) {
    const r = ((s.advice || {}).realised) || {};
    const ds = r.days || [];
    const box = $("days");
    box.textContent = "";
    $("days-avg").textContent = r.avg_saving == null ? "" : `gem. ${signedEur(r.avg_saving)} per dag`;
    if (!ds.length) return;
    const W = 420, H = 170, top = 22, bot = 26, n = ds.length, bw = W / n;
    const vals = ds.map((d) => d.saving).filter((v) => v != null);
    const max = Math.max(0.05, ...vals.map(Math.abs));
    const hasNeg = vals.some((v) => v < 0);
    const zero = hasNeg ? top + (H - top - bot) / 2 : H - bot;
    const scale = (H - top - bot) / (hasNeg ? 2 * max : max);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Besparing per dag, afgelopen week" }, box);
    el("line", { x1: 0, x2: W, y1: zero, y2: zero, class: "zero" }, svg);
    ds.forEach((d, i) => {
      const isToday = i === n - 1;
      const x0 = i * bw + bw * 0.18, w = bw * 0.64;
      const day = new Date(d.day + "T12:00:00");
      el("text", { x: i * bw + bw / 2, y: H - 8, class: "lab" }, svg).textContent = isToday ? "vandaag" : day.toLocaleDateString("nl-NL", { weekday: "short" });
      if (d.saving == null) {
        el("rect", { x: x0, y: zero - 2, width: w, height: 2, class: "bar-none" }, svg);
        return;
      }
      const h = Math.max(Math.abs(d.saving) * scale, 2);
      const r = el("rect", { x: x0, y: d.saving >= 0 ? zero - h : zero, width: w, height: h, rx: 4,
        class: (d.saving >= 0 ? "bar-pos" : "bar-neg") + (isToday ? " today" : "") }, svg);
      el("title", {}, r).textContent = `${day.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "short" })}: ${signedEur(d.saving)}${isToday ? " (tot nu)" : ""}`;
      el("text", { x: i * bw + bw / 2, y: d.saving >= 0 ? zero - h - 6 : zero + h + 14, class: "val" }, svg).textContent = signedEur(d.saving).replace("+", "");
    });
  }

  /* ---------------- plan chart ---------------- */
  function legend() {
    const box = $("legend");
    if (box.childElementCount) return;
    const add = (color, text, opacity) => {
      const sp = document.createElement("span"), i = document.createElement("i");
      i.style.background = color;
      if (opacity) i.style.opacity = opacity;
      sp.append(i, document.createTextNode(text));
      box.appendChild(sp);
    };
    Object.entries(ACTIONS).forEach(([k, a]) => add(a.color, k === "charge_solar" ? "zon opslaan" : a.label.toLowerCase(), k === "idle" ? 0.5 : 0));
    const sep = document.createElement("span"); sep.className = "sep"; sep.textContent = "·"; box.appendChild(sep);
    add("var(--price-low)", "prijs laag"); add("var(--price-mid)", "midden"); add("var(--price-high)", "hoog");
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
    // price level per hour from the snapshot's curve (same thirds as the price card)
    const levelAt = {};
    (s.price.curve || []).forEach((c) => { levelAt[new Date(c.t).getTime()] = c.level; });
    const lvl = (iso) => { const t = new Date(iso); t.setMinutes(0, 0, 0); return levelAt[t.getTime()] || "mid"; };

    const W = Math.max(box.clientWidth, 300), L = 40, Rm = 8;
    const socTop = 28, socH = 92, ribTop = socTop + socH + 30, ribH = 22, prTop = ribTop + ribH + 30, prH = 130, axis = 24;
    const H = prTop + prH + axis;
    const n = pts.length, bw = (W - L - Rm) / n;
    const x = (i) => L + i * bw;
    const pmax = Math.max(0.1, ...pts.map((p) => p.price)), pmin = Math.min(0, ...pts.map((p) => p.price));
    const yP = (v) => prTop + prH * (1 - (v - pmin) / (pmax - pmin));
    const yS = (v) => socTop + socH * (1 - v / 100);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Plan: laadtoestand, actie en prijs per kwartier" });
    const defs = el("defs", {}, svg);
    const grad = el("linearGradient", { id: "socfill", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el("stop", { offset: "0%", "stop-color": "#2fd07a", "stop-opacity": 0.45 }, grad);
    el("stop", { offset: "100%", "stop-color": "#2fd07a", "stop-opacity": 0.02 }, grad);

    const panel = (y, text) => { el("text", { x: L, y, class: "p-panel" }, svg).textContent = text; };
    panel(socTop - 12, "LAADTOESTAND");
    panel(ribTop - 10, "WAT DE BATTERIJ DOET");
    panel(prTop - 12, "PRIJS PER KWARTIER (€/KWH)");
    [0, 50, 100].forEach((v) => {
      el("line", { x1: L, x2: W - Rm, y1: yS(v), y2: yS(v), class: "p-grid" }, svg);
      el("text", { x: L - 6, y: yS(v) + 4, "text-anchor": "end", class: "p-tick" }, svg).textContent = v + "%";
    });
    const step = pmax > 0.3 ? 0.1 : 0.05;
    for (let v = 0; v <= pmax + 1e-9; v += step) {
      el("line", { x1: L, x2: W - Rm, y1: yP(v), y2: yP(v), class: "p-grid" }, svg);
      el("text", { x: L - 6, y: yP(v) + 4, "text-anchor": "end", class: "p-tick" }, svg).textContent = nf(2).format(v);
    }
    // 1) SoC
    let d = `M${x(0)},${yS(pts[0].soc)}`;
    pts.forEach((p, i) => { d += ` L${x(i + 1)},${yS(p.soc)}`; });
    el("path", { d: d + ` L${x(n)},${yS(0)} L${x(0)},${yS(0)} Z`, fill: "url(#socfill)" }, svg);
    el("path", { d, class: "p-soc" }, svg);
    // 2) action ribbon, merged into blocks, labelled when wide enough
    let start = 0;
    for (let i = 1; i <= n; i++) {
      if (i < n && pts[i].action === pts[start].action) continue;
      const act = pts[start].action, x0 = x(start), w = x(i) - x0;
      el("rect", { x: x0 + 0.5, y: ribTop, width: Math.max(w - 1, 1), height: ribH, rx: 5, class: "a-" + act }, svg);
      const label = act === "charge_solar" ? "zon" : act === "charge_grid" ? "laden" : act === "discharge" ? "ontladen" : act === "hold" ? "vasthouden" : "";
      if (label && w > label.length * 7 + 10) el("text", { x: x0 + w / 2, y: ribTop + 15, "text-anchor": "middle", class: "p-act-lab" }, svg).textContent = label;
      start = i;
    }
    // 3) price bars coloured by price level, average line
    const avg = pts.reduce((t, p) => t + p.price, 0) / n;
    pts.forEach((p, i) => el("rect", { x: x(i) + 0.5, y: Math.min(yP(p.price), yP(0)), width: Math.max(bw - 1, 0.6),
      height: Math.max(Math.abs(yP(0) - yP(p.price)), 1), rx: Math.min(2, bw / 4), class: `p-bar lv-${lvl(p.t)}${i === 0 ? " now" : ""}` }, svg));
    el("line", { x1: L, x2: W - Rm, y1: yP(avg), y2: yP(avg), class: "p-avg" }, svg);
    el("text", { x: W - Rm, y: yP(avg) - 5, "text-anchor": "end", class: "p-avglab" }, svg).textContent = "gem. " + eur(avg, 3);
    // time axis
    pts.forEach((p, i) => {
      const t = new Date(p.t);
      if (t.getMinutes() !== 0 || t.getHours() % (n > 100 ? 6 : 3) !== 0) return;
      const major = t.getHours() === 0;
      el("line", { x1: x(i), x2: x(i), y1: socTop, y2: prTop + prH, class: "p-grid", "stroke-opacity": major ? 1 : 0.5 }, svg);
      el("text", { x: x(i) + 3, y: H - 6, class: "p-tick" }, svg).textContent = major ? t.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric" }) : `${t.getHours()}:00`;
    });
    const now = new Date(s.updated), t0 = new Date(pts[0].t);
    const nowX = x(Math.max(0, Math.min(1, (now - t0) / 9e5)));
    el("line", { x1: nowX, x2: nowX, y1: socTop, y2: prTop + prH, class: "p-now" }, svg);
    // hover
    const hover = el("line", { y1: socTop, y2: prTop + prH, class: "p-hover", visibility: "hidden" }, svg);
    const hit = el("rect", { x: L, y: socTop, width: W - L - Rm, height: prTop + prH - socTop, fill: "transparent" }, svg);
    const tip = $("plan-tip");
    const move = (ev) => {
      const r = svg.getBoundingClientRect();
      const i = Math.max(0, Math.min(n - 1, Math.floor(((ev.clientX - r.left) * W / r.width - L) / bw)));
      const p = pts[i];
      hover.setAttribute("x1", x(i) + bw / 2); hover.setAttribute("x2", x(i) + bw / 2); hover.setAttribute("visibility", "visible");
      tip.textContent = "";
      const b = document.createElement("b"); b.textContent = dayHm(p.t);
      tip.append(b, document.createElement("br"),
        document.createTextNode(`${(ACTIONS[p.action] || ACTIONS.idle).label} · batterij ${fmt(p.soc)}%`),
        document.createElement("br"), document.createTextNode(`${eur(p.price, 3)}/kWh · prijs ${LEVEL[lvl(p.t)]}`));
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
    const st = s.steering || {};
    const c = a.control;
    const desc = (on, t) => (on == null ? "onbekend" : on ? `reserve aan, doel ${fmt(t)}%` : "reserve uit (zelfverbruik)");
    $("ctl-advice").textContent = c ? desc(c.reserve_on, c.target_soc) : "–";
    $("ctl-current").textContent = desc((s.control || {}).reserve_on, (s.control || {}).target_soc);
    const lc = st.last_command;
    $("ctl-last").textContent = !lc ? "nog geen" : `${dayHm(lc.t)} · ${desc(lc.reserve_on, lc.target_soc)}${lc.ok ? "" : " (mislukt)"}`;
    $("ctl-export").textContent = a.export || "–";

    const state = st.mode !== "control" ? "advice" : st.error && !st.fallback ? "error" : st.fallback ? "fallback"
      : st.paused_until ? "paused" : st.blocked ? "blocked" : "active";
    $("steer").dataset.state = state;
    $("steer-title").textContent = { advice: "Adviesmodus", active: "BattBrain stuurt je batterij", paused: "Sturing gepauzeerd",
      blocked: "Sturing staat stil", fallback: "Terugval naar zelfverbruik", error: "Let op" }[state];
    $("steer-msg").textContent = state === "advice" ? "BattBrain adviseert alleen. Zet control_mode op \"control\" in de app-instellingen om het te laten sturen."
      : state === "paused" ? "Gepauzeerd tot " + dayHm(st.paused_until) + ". De omvormer houdt zijn laatste stand."
      : state === "active" ? (lc && lc.reason ? "Laatste keuze: " + lc.reason : "Volgt het plan.")
      : st.error || st.blocked || "";
    $("btn-pause").hidden = !(state === "active" || state === "fallback" || state === "error");
    $("btn-resume").hidden = state !== "paused";
    const pill = $("mode-pill");
    if (!s.demo && s.connected) {
      pill.className = "pill" + (state === "active" ? " active" : state === "advice" ? "" : state === "paused" || state === "blocked" ? " demo" : " offline");
      $("mode-text").textContent = { advice: "Adviesmodus", active: "Stuurt", paused: "Gepauzeerd", blocked: "Sturing staat stil",
        fallback: "Terugval", error: "Let op" }[state];
    }
  }

  async function steer(action, minutes) {
    try {
      const r = await fetch("api/control", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, minutes }) });
      if (r.ok) render(await r.json());
    } catch (e) { /* next tick shows the state */ }
  }
  document.addEventListener("click", (ev) => {
    if (ev.target.id === "btn-pause") steer("pause", 60);
    if (ev.target.id === "btn-resume") steer("resume");
  });

  /* ---------------- main loop ---------------- */
  function render(s) {
    notices(s);
    const pill = $("mode-pill");
    pill.className = "pill" + (s.demo ? " demo" : s.connected ? "" : " offline");
    const steering = (s.steering || {}).mode === "control";
    $("mode-text").textContent = s.demo ? (steering ? "Demo · stuurt" : "Demo · adviesmodus") : s.connected ? "Adviesmodus" : "Geen verbinding";
    $("updated").textContent = "Bijgewerkt " + new Date(s.updated).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    hero(s); flow(s); kpis(s); plan(s); days(s); timeline(s); control(s);
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

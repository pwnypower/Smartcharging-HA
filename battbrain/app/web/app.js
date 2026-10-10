// BattBrain dashboard (read-only). Fetches api/snapshot (relative, so it works behind HA ingress).
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const nf = (d) => new Intl.NumberFormat("nl-NL", { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmt = (v, d = 0) => (v === null || v === undefined || Number.isNaN(v) ? "–" : nf(d).format(v));
  const eur = (v) => (v === null || v === undefined ? "–" : "€" + nf(3).format(v));
  const power = (w) => {
    if (w === null || w === undefined) return "–";
    const a = Math.abs(w);
    return a >= 1000 ? fmt(a / 1000, 1) + " kW" : fmt(a, 0) + " W";
  };
  const LEVEL = { low: "Laag tarief", mid: "Gemiddeld tarief", high: "Hoog tarief" };
  const LABELS = {
    soc: "batterij-SoC", price: "prijssensor", solar_today: "zonvoorspelling vandaag",
    solar_remaining: "zon nog verwacht", solar_tomorrow: "zonvoorspelling morgen",
    grid_power: "netvermogen (P1)", solar_power: "zonnevermogen", battery_power: "batterijvermogen",
    reserve_switch: "reserveschakelaar", target_soc: "doel-SoC",
  };

  function notices(s) {
    const box = $("notices");
    box.textContent = "";
    const add = (text) => { const d = document.createElement("div"); d.className = "notice"; d.textContent = text; box.appendChild(d); };
    if (s.demo) add("Demomodus: dit zijn voorbeeldgegevens, niet jouw installatie.");
    if (!s.connected) add("Geen verbinding met Home Assistant. De laatst bekende waarden worden getoond.");
    if (s.missing_entities && s.missing_entities.length) add("Niet gevonden in Home Assistant: " + s.missing_entities.join(", ") + ". Controleer de entity_id's in de app-instellingen.");
    if (s.unconfigured && s.unconfigured.length && !s.demo) add("Nog niet ingesteld: " + s.unconfigured.map((k) => LABELS[k] || k).join(", ") + ".");
  }

  function curve(price, now) {
    const box = $("curve");
    box.textContent = "";
    const pts = price.curve || [];
    if (!pts.length) { $("curve-note").textContent = "Geen prijslijst gevonden in de prijssensor."; return; }
    const W = Math.max(box.clientWidth, 280), H = 180, L = 40, B = 22, T = 8;
    const max = Math.max(...pts.map((p) => p.price), 0.05), min = Math.min(0, ...pts.map((p) => p.price));
    const y = (v) => T + (H - T - B) * (1 - (v - min) / (max - min));
    const bw = (W - L) / pts.length;
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Prijs per uur");
    const el = (name, attrs, parent = svg) => { const e = document.createElementNS(ns, name); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };
    const step = max > 0.3 ? 0.1 : 0.05;
    for (let v = 0; v <= max + 1e-9; v += step) {
      el("line", { x1: L, x2: W, y1: y(v), y2: y(v), class: "grid", "stroke-width": 1 });
      const t = el("text", { x: L - 6, y: y(v) + 4, "text-anchor": "end", class: "tick" });
      t.textContent = nf(2).format(v);
    }
    let nowX = null;
    pts.forEach((p, i) => {
      const t = new Date(p.t), next = pts[i + 1] ? new Date(pts[i + 1].t) : new Date(t.getTime() + 3600e3);
      const isNow = now >= t && now < next;
      const x = L + i * bw;
      const r = el("rect", { x: x + 1, y: Math.min(y(p.price), y(0)), width: Math.max(bw - 2, 1), height: Math.abs(y(0) - y(p.price)), rx: 2, class: `bar ${p.level}${isNow ? " now" : ""}` });
      const title = el("title", {}, r);
      title.textContent = `${t.toLocaleDateString("nl-NL", { weekday: "short" })} ${t.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}: ${eur(p.price)}/kWh`;
      if (isNow) nowX = x + bw / 2;
      if (t.getMinutes() === 0 && t.getHours() % 6 === 0) {
        const lab = el("text", { x: x, y: H - 6, class: "tick" });
        lab.textContent = t.getHours() === 0 ? t.toLocaleDateString("nl-NL", { weekday: "short" }) : `${t.getHours()}:00`;
      }
    });
    if (nowX !== null) el("line", { x1: nowX, x2: nowX, y1: T, y2: H - B, class: "nowline" });
    box.appendChild(svg);
    $("curve-title").textContent = price.tomorrow_known ? "Vandaag en morgen" : "Vandaag";
    $("curve-note").textContent = price.tomorrow_known ? "" : "De prijzen voor morgen verschijnen meestal rond 13:00–15:00.";
  }

  function render(s) {
    const now = new Date(s.updated);
    notices(s);
    const pill = $("mode-pill");
    pill.className = "pill" + (s.demo ? " demo" : s.connected ? "" : " offline");
    $("mode-text").textContent = s.demo ? "Demo · alleen lezen" : s.connected ? "Adviesmodus · alleen lezen" : "Geen verbinding";
    $("updated").textContent = "Bijgewerkt " + now.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    $("soc").textContent = fmt(s.soc);
    $("soc-fill").style.height = (s.soc ?? 0) + "%";
    $("soc-kwh").textContent = s.stored_kwh == null ? "–" : `${fmt(s.stored_kwh, 1)} van ${fmt(s.system.capacity_kwh, 1)} kWh`;
    $("soc-reserve").textContent = `Minimale reserve ${fmt(s.system.reserve_soc)}%`;

    $("price").textContent = s.price.now == null ? "–" : nf(3).format(s.price.now);
    const lvl = $("price-level");
    lvl.className = "badge" + (s.price.level_now ? " " + s.price.level_now : "");
    lvl.textContent = LEVEL[s.price.level_now] || "Onbekend";
    $("price-range").textContent = s.price.today_min == null ? "–" : `Vandaag ${eur(s.price.today_min)} – ${eur(s.price.today_max)}`;

    $("solar-today").textContent = fmt(s.solar.today_kwh, 1);
    $("solar-remaining").textContent = `Nog verwacht: ${fmt(s.solar.remaining_kwh, 1)} kWh`;
    $("solar-tomorrow").textContent = `Morgen: ${fmt(s.solar.tomorrow_kwh, 1)} kWh`;

    const p = s.power;
    $("flow-solar").textContent = power(p.solar_w);
    $("flow-house").textContent = power(p.house_w);
    $("flow-grid").textContent = power(p.grid_w);
    $("flow-grid-dir").textContent = p.grid_w == null ? "" : p.grid_w > 20 ? "afname" : p.grid_w < -20 ? "teruglevering" : "in balans";
    $("flow-bat").textContent = power(p.battery_w);
    const bat = document.querySelector(".node.bat");
    bat.classList.toggle("charging", p.battery_w > 20);
    bat.classList.toggle("discharging", p.battery_w < -20);
    $("flow-bat-dir").textContent = p.battery_w == null ? "" : p.battery_w > 20 ? "laden" : p.battery_w < -20 ? "ontladen" : "rust";

    $("ctl-mode").textContent = s.control.mode;
    $("ctl-reserve").textContent = s.control.reserve_on == null ? "–" : s.control.reserve_on ? "aan" : "uit";
    $("ctl-target").textContent = s.control.target_soc == null ? "–" : fmt(s.control.target_soc) + "%";
    $("sys-cap").textContent = fmt(s.system.capacity_kwh, 1) + " kWh";
    $("sys-pow").textContent = fmt(s.system.max_power_kw, 1) + " kW";
    $("sys-res").textContent = fmt(s.system.reserve_soc) + "%";
    curve(s.price, now);
  }

  let last = null;
  async function tick() {
    try {
      const r = await fetch("api/snapshot", { cache: "no-store" });
      last = await r.json();
      render(last);
    } catch (e) {
      $("mode-text").textContent = "App niet bereikbaar";
      $("mode-pill").className = "pill offline";
    }
  }
  tick();
  setInterval(tick, 15000);
  let to;
  window.addEventListener("resize", () => { clearTimeout(to); to = setTimeout(() => last && curve(last.price, new Date(last.updated)), 150); });
})();

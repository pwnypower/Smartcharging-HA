/* data.jsx — real-time clock + Frank Energie / EasyEnergy prijzen */

// Fallback: gesimuleerde NL dagcurve (ct/kWh incl BTW, kale marktprijs)
const BASE_CURVE = [
  9.2, 7.1, 5.0, 4.3, 4.8, 6.9, 11.2, 18.4, 22.1, 18.6,
  13.8, 8.7, 5.6, 3.7, 3.3, 6.1, 12.4, 21.3, 30.2, 34.1,
  30.8, 23.6, 15.9, 10.8
];

const SYSTEM = {
  inverter: "Solis (SolisCloud)",
  provider: "Frank Energie",
  capacity: 10.0,
  tier: "Plus",
};

function priceColor(ct) {
  if (ct < 12) return "var(--price-low)";
  if (ct <= 25) return "var(--price-mid)";
  return "var(--price-high)";
}
function priceTone(ct) {
  if (ct < 12) return "low";
  if (ct <= 25) return "mid";
  return "high";
}

const fmtEur  = (v) => "€" + v.toFixed(2).replace(".", ",");
const fmtCt   = (v) => v.toFixed(1).replace(".", ",") + " ct";
const fmtKwh  = (v) => v.toFixed(1).replace(".", ",");
const hourLabel  = (h) => String(((h % 24) + 24) % 24).padStart(2, "0") + ":00";
const clockLabel = (mins) => {
  const h = Math.floor(mins / 60) % 24;
  const m = Math.floor(mins % 60);
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
};

const REASONS = {
  charge:     (p, soc, tgt) => `Goedkoop uur (${fmtCt(p)}), SoC ${soc}% < doel ${tgt}%`,
  discharge:  (p, soc)      => `Duur uur (${fmtCt(p)}), batterij ontladen naar het net`,
  idle_full:  (soc)          => `Batterij vol (${soc}%), wachten op duur uur`,
  idle_mid:   (p)            => `Neutrale prijs (${fmtCt(p)}), wachten op gunstig moment`,
  idle_low:   (soc)          => `Batterij bijna leeg (${soc}%), wachten op goedkoop uur`,
};

/* ---- Prijs-fetcher ---- */
async function fetchFrankPrices() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const res = await fetch("https://frank-energie.com/api/frank-energie/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `{ marketPrices(date: "${today}") { electricityPrices { from till marketPrice marketPriceTax } } }`,
        variables: {},
      }),
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    const prices = json?.data?.marketPrices?.electricityPrices;
    if (!Array.isArray(prices) || prices.length < 20) throw new Error("Geen data");
    const curve = new Array(24).fill(null);
    prices.forEach(p => {
      const h = new Date(p.from).getHours(); // lokale tijd browser
      const ct = (p.marketPrice + p.marketPriceTax) * 100; // €/kWh → ct/kWh incl BTW
      if (h >= 0 && h < 24) curve[h] = Math.max(-20, ct); // negatieve prijzen zijn ok
    });
    const filled = curve.map((v, i) => v != null ? v : BASE_CURVE[i]);
    console.log("✅ Frank Energie prijzen geladen:", filled.map(v => v.toFixed(1) + "ct").join(", "));
    return { curve: filled, source: "frank" };
  } catch (e) {
    console.warn("Frank Energie API:", e.message, "→ probeer EasyEnergy");
    return null;
  }
}

async function fetchEasyEnergyPrices() {
  const d = new Date();
  const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const url = `https://mijn.easyenergy.com/nl/api/tariff/getapxtariffs?startTimestamp=${ds}T00:00:00Z&endTimestamp=${ds}T23:59:00Z&grouping=`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if (!Array.isArray(data) || data.length < 20) throw new Error("Geen data");
    const curve = new Array(24).fill(null);
    data.forEach(item => {
      const h = new Date(item.Timestamp).getHours();
      if (h >= 0 && h < 24) curve[h] = Math.max(-20, item.TariffUsage * 100); // €/kWh incl BTW → ct
    });
    const filled = curve.map((v, i) => v != null ? v : BASE_CURVE[i]);
    console.log("✅ EasyEnergy/EPEX prijzen geladen");
    return { curve: filled, source: "easyenergy" };
  } catch (e) {
    console.warn("EasyEnergy API:", e.message, "→ fallback BASE_CURVE");
    return null;
  }
}

class DemoEngine {
  constructor() {
    this.subs = new Set();
    this.anchors = { soc: 64, price: null, savings: 1.82 };

    // ← Echte klok van bezoeker
    const now = new Date();
    this.mins = now.getHours() * 60 + now.getMinutes();

    this.chargeLimit       = 0.10;  // €/kWh
    this.dischargeThreshold = 0.25; // €/kWh
    this.targetSoc = 90;
    this.soc = this.anchors.soc;
    this.savings = this.anchors.savings;
    this.priceOffset = 0;

    // Schaal samenvatting op basis van hoe ver de dag gevorderd is
    const dayFrac = Math.max(0.01, (now.getHours() * 60 + now.getMinutes()) / 1440);
    this.summary = {
      charged:    parseFloat((7.4  * dayFrac).toFixed(1)),
      discharged: parseFloat((4.9  * dayFrac).toFixed(1)),
      pv:         parseFloat((11.2 * dayFrac).toFixed(1)),
      gridImport: parseFloat((3.1  * dayFrac).toFixed(1)),
      gridExport: parseFloat((5.8  * dayFrac).toFixed(1)),
      savings:    this.anchors.savings,
    };

    // Prijscurve: start met fallback, vervang zodra API klaar is
    this.priceCurve = BASE_CURVE;
    this.priceSource = "simulated";

    this.decisions = this._seedDecisions();
    this.recompute(true);

    // Haal echte prijzen op (async, vervang curve zodra beschikbaar)
    this._loadPrices();
  }

  async _loadPrices() {
    const result = await fetchFrankPrices() || await fetchEasyEnergyPrices();
    if (result) {
      this.priceCurve  = result.curve;
      this.priceSource = result.source;
      this.recompute();
      this.emit();
    }
  }

  setAnchors({ soc, price, savings }) {
    if (typeof soc     === "number") { this.anchors.soc = soc; this.soc = soc; }
    if (typeof savings === "number") { this.anchors.savings = savings; this.savings = savings; this.summary.savings = savings; }
    if (typeof price   === "number") { this.priceOffset = price - this.curvePrice(this.mins / 60); }
    this.recompute();
    this.emit();
  }

  curvePrice(hf) {
    const curve = this.priceCurve;
    const h = ((hf % 24) + 24) % 24;
    const i = Math.floor(h), n = (i + 1) % 24, f = h - i;
    return curve[i] * (1 - f) + curve[n] * f;
  }

  currentAction(priceEur, soc) {
    if (priceEur <= this.chargeLimit       && soc < this.targetSoc) return "charge";
    if (priceEur >= this.dischargeThreshold && soc > 20)             return "discharge";
    return "idle";
  }

  recompute() {
    const hf = this.mins / 60;
    this.priceCt  = Math.max(-20, this.curvePrice(hf) + this.priceOffset);
    this.priceEur = this.priceCt / 100;
    this.action   = this.currentAction(this.priceEur, this.soc);

    const curve = this.priceCurve.map(v => Math.max(-20, v + this.priceOffset));
    const cheap = [], exp = [];
    curve.forEach((v, h) => {
      if (v / 100 <= this.chargeLimit)        cheap.push(h);
      if (v / 100 >= this.dischargeThreshold) exp.push(h);
    });
    const avg = (arr) => arr.length ? arr.reduce((s, h) => s + curve[h], 0) / arr.length : 0;
    this.plan = {
      curve,
      cheap_hours:       cheap,
      expensive_hours:   exp,
      avg_cheap:         avg(cheap),
      avg_expensive:     avg(exp),
      expected_charge_kwh: Math.round(cheap.length * 1.7 * 10) / 10,
      expected_savings:  (avg(exp) - avg(cheap)) / 100 * cheap.length * 1.7,
      available:         this.mins / 60 >= 13,
    };
    this.actionLabel = { charge: "Laden", discharge: "Ontladen", idle: "Wachten" }[this.action];
  }

  _seedDecisions() {
    const out = [];
    const now = new Date();
    // Seed last 5 decisions based on past hours of today
    for (let i = 4; i >= 0; i--) {
      const pastMins = this.mins - (i + 1) * 42;
      if (pastMins < 0) continue;
      const h = pastMins / 60;
      const p = this.curvePrice(h);
      const pe = p / 100;
      let soc = this.soc - (i * 3);
      let action = pe <= 0.10 && soc < 90 ? "charge" : pe >= 0.25 && soc > 20 ? "discharge" : "idle";
      out.push({
        mins:   Math.round(pastMins),
        action,
        soc:    Math.round(Math.max(15, Math.min(98, soc))),
        price:  p,
        reason: this._reason(action, p, Math.round(soc)),
      });
    }
    return out.reverse();
  }

  _reason(action, ct, soc) {
    if (action === "charge")    return REASONS.charge(ct, soc, this.targetSoc);
    if (action === "discharge") return REASONS.discharge(ct, soc);
    if (soc >= 88)              return REASONS.idle_full(soc);
    if (soc <= 25)              return REASONS.idle_low(soc);
    return REASONS.idle_mid(ct);
  }

  tick() {
    // Real-time: +1 minuut per tick (60s interval)
    this.mins = (this.mins + 1) % (24 * 60);

    // Sync klok met echte tijd elke 10 ticks om drift te voorkomen
    if (this.mins % 10 === 0) {
      const real = new Date();
      this.mins = real.getHours() * 60 + real.getMinutes();
    }

    const prevAction = this.action;
    this.recompute();

    // SoC: realistische laadsnelheid ~0,5%/min bij 3,5 kW / 10 kWh
    if (this.action === "charge")
      this.soc = Math.min(98, this.soc + 0.50 + Math.random() * 0.10);
    else if (this.action === "discharge")
      this.soc = Math.max(12, this.soc - 0.55 - Math.random() * 0.10);
    else
      this.soc = Math.max(12, this.soc - 0.025); // lichte standby-drain
    this.soc = Math.round(this.soc * 10) / 10;

    // Besparings-drift
    if (this.action !== "idle") this.savings += Math.random() * 0.007;
    this.summary.savings = this.savings;
    if (this.action === "charge")    this.summary.charged    += 0.02;
    if (this.action === "discharge") this.summary.discharged += 0.023;

    if (this.action !== prevAction) {
      this.decisions.unshift({
        mins:   this.mins,
        action: this.action,
        soc:    Math.round(this.soc),
        price:  this.priceCt,
        reason: this._reason(this.action, this.priceCt, Math.round(this.soc)),
      });
      this.decisions = this.decisions.slice(0, 24);
    }
    this.emit();
  }

  snapshot() {
    return {
      mins:               this.mins,
      clock:              clockLabel(this.mins),
      soc:                Math.round(this.soc),
      socExact:           this.soc,
      priceCt:            this.priceCt,
      action:             this.action,
      actionLabel:        this.actionLabel,
      chargeLimit:        this.chargeLimit,
      dischargeThreshold: this.dischargeThreshold,
      targetSoc:          this.targetSoc,
      solarRemaining:     Math.max(0, Math.round((this.plan.expected_charge_kwh * 0.4) * 10) / 10),
      savings:            this.savings,
      plan:               this.plan,
      summary:            { ...this.summary },
      decisions:          this.decisions,
      system:             SYSTEM,
      priceSource:        this.priceSource,  // "frank" | "easyenergy" | "simulated"
      priceCurve:         this.priceCurve,
    };
  }

  subscribe(fn) { this.subs.add(fn); return () => this.subs.delete(fn); }
  emit() { const s = this.snapshot(); this.subs.forEach(f => f(s)); }
}

const Demo = new DemoEngine();

// Real-time tick: elke 60 echte seconden = 1 minuut vooruit
setInterval(() => Demo.tick(), 60000);

function useDemo() {
  const [s, setS] = React.useState(() => Demo.snapshot());
  React.useEffect(() => Demo.subscribe(setS), []);
  return s;
}

Object.assign(window, {
  Demo, useDemo, priceColor, priceTone,
  fmtEur, fmtCt, fmtKwh, hourLabel, clockLabel, BASE_CURVE, SYSTEM,
});

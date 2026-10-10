"""Self-contained HTML report (inline SVG, no external dependencies)."""
from __future__ import annotations

import html
import json
from collections import defaultdict
from datetime import datetime

from .model import Battery, Dataset
from .runner import ADVICE, Scenario

DAYS_NL = ["ma", "di", "wo", "do", "vr", "za", "zo"]
SERIES = ["var(--s1)", "var(--s2)", "var(--s3)"]


def eur(x: float) -> str:
    s = f"{abs(x):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return ("−€" if x < 0 else "€") + s


def num(x: float, d: int = 1) -> str:
    return f"{x:.{d}f}".replace(".", ",")


def _line_chart(cid: str, times: list[datetime], series: list[tuple[str, list[float]]],
                y_min: float, y_max: float, y_ticks: list[float], unit: str,
                step_shape: bool = False, height: int = 220) -> str:
    """Chart data + placeholder; drawn client-side at the real width so text stays legible."""
    data = {"labels": [f"{DAYS_NL[t.weekday()]} {t:%d-%m %H:%M}" for t in times],
            "day": [f"{DAYS_NL[t.weekday()]} {t.day}" if t.hour == 0 and t.minute == 0 else
                    ("12:00" if t.hour == 12 and t.minute == 0 else "") for t in times],
            "series": [{"name": nme, "values": [round(v, 3) for v in vals]} for nme, vals in series],
            "unit": unit, "ymin": y_min, "ymax": y_max, "ticks": y_ticks, "step": step_shape, "h": height}
    legend = "".join(f'<span class="key"><i style="background:{SERIES[k]}"></i>{html.escape(nme)}</span>'
                     for k, (nme, _) in enumerate(series)) if len(series) > 1 else ""
    return (f'<div class="chart-wrap">{"<div class=legend>" + legend + "</div>" if legend else ""}'
            f'<div class="plot" id="{cid}" style="height:{height}px"></div><div class="tip" hidden></div>'
            f'<script type="application/json" data-for="{cid}">{json.dumps(data)}</script></div>')


def _bar_chart(rows: list[tuple[str, list[float]]], names: list[str]) -> str:
    """Grouped horizontal bars in plain HTML (savings vs. no battery)."""
    vmax = max(max(v) for _, v in rows) or 1
    vmin = min(0.0, min(min(v) for _, v in rows))
    span = vmax - vmin
    zero = -vmin / span * 100
    out = []
    for label, vals in rows:
        bars = []
        for k, v in enumerate(vals):
            w = abs(v) / span * 100
            left = zero if v >= 0 else zero - w
            bars.append(f'<div class="bar-row"><div class="bar" style="left:{left:.1f}%;width:{max(w, 0.4):.1f}%;'
                        f'background:{SERIES[k]}" title="{html.escape(names[k])}: {eur(v)}"></div>'
                        f'<span class="bar-val" style="left:calc({left + w:.1f}% + 6px)">{eur(v)}</span></div>')
        out.append(f'<div class="bgroup"><div class="blabel">{html.escape(label)}</div>'
                   f'<div class="btrack">{"".join(bars)}</div></div>')
    legend = "".join(f'<span class="key"><i style="background:{SERIES[k]}"></i>{html.escape(n)}</span>'
                     for k, n in enumerate(names))
    return f'<div class="legend">{legend}</div><div class="bars">{"".join(out)}</div>'


def build_report(ds: Dataset, bat: Battery, sc_2026: list[Scenario], sc_2027: list[Scenario],
                 export_deduction: float, actual_import: dict | None = None,
                 source_note: str = "") -> str:
    by = {s.result.name: s for s in sc_2026}
    by27 = {s.result.name: s for s in sc_2027}
    base, base27 = by["none"].net_cost, by27["none"].net_cost
    days = sorted({t.date() for t in ds.steps})
    period = f"{days[0]:%d-%m} t/m {days[-1]:%d-%m-%Y}"

    # --- headline numbers
    bp, opt, selfu, adv = by["bp"], by["optimal"], by["self"], by["bp_advice"]
    gap_now = bp.net_cost - opt.net_cost
    gap27 = by27["bp"].net_cost - by27["optimal"].net_cost
    tiles = [
        ("Besparing blueprint nu", eur(base - bp.net_cost), f"t.o.v. geen batterij, {len(days)} dagen"),
        ("Nog te halen (max.)", eur(gap_now), "verschil met optimale sturing"),
        ("Zelfverbruik zonder sturing", eur(base - selfu.net_cost), "besparing met alleen de omvormer"),
        ("Zelfde week in 2027", eur(gap27), "te halen extra zonder salderen"),
    ]
    tiles_html = "".join(f'<div class="tile"><div class="tl">{a}</div><div class="tv">{b}</div><div class="ts">{c}</div></div>'
                         for a, b, c in tiles)

    order = ["self", "bp", "bp_bias", "bp_advice", "planner", "optimal"]
    bar_rows = [(by[k].result.label, [base - by[k].net_cost, base27 - by27[k].net_cost]) for k in order]
    bars = _bar_chart(bar_rows, ["2026 (salderen)", f"2027 (teruglevering −€{num(export_deduction, 2)}/kWh)"])

    # --- scenario table
    trs = []
    for k in ["none"] + order:
        s, s27 = by[k], by27[k]
        r = s.result
        trs.append(f"<tr><td>{html.escape(r.label)}</td><td class=n>{eur(s.net_cost)}</td>"
                   f"<td class=n>{eur(base - s.net_cost)}</td><td class=n>{eur(base27 - s27.net_cost)}</td>"
                   f"<td class=n>{num(r.grid_import)}</td><td class=n>{num(r.grid_export)}</td>"
                   f"<td class=n>{num(r.throughput)}</td><td class=n>{num(r.end_soc(), 0)}%</td></tr>")
    table = ("<table><thead><tr><th>Scenario</th><th>Netto kosten</th><th>Besparing 2026</th>"
             "<th>Besparing 2027</th><th>Afname kWh</th><th>Teruglevering kWh</th>"
             "<th>Ontladen kWh</th><th>Eind-SoC</th></tr></thead><tbody>" + "".join(trs) + "</tbody></table>")

    # --- per-day table
    def per_day(res):
        d = defaultdict(float)
        for t, r in zip(ds.steps, res.steps):
            d[t.date()] += r.cost
        return d
    pd_ = {k: per_day(by[k].result) for k in ["none", "self", "bp", "optimal"]}
    day_rows = []
    for d in days:
        prices = [p for t, p in ds.hourly_prices if t.date() == d]
        load = sum(l for t, l in zip(ds.steps, ds.load) if t.date() == d)
        sol = sum(s for t, s in zip(ds.steps, ds.solar) if t.date() == d)
        day_rows.append(
            f"<tr><td class=d>{DAYS_NL[d.weekday()]} {d:%d-%m}</td><td class=n>{num(min(prices), 3)}–{num(max(prices), 3)}</td>"
            f"<td class=n>{num(load)}</td><td class=n>{num(sol)}</td>"
            + "".join(f"<td class=n>{eur(pd_[k][d])}</td>" for k in ["none", "self", "bp", "optimal"]) + "</tr>")
    day_table = ("<table><thead><tr><th>Dag</th><th>Prijs min–max €/kWh</th><th>Verbruik kWh</th><th>Zon kWh</th>"
                 "<th>Geen batterij</th><th>Zelfverbruik</th><th>Blueprint</th><th>Optimaal</th></tr></thead><tbody>"
                 + "".join(day_rows) + "</tbody></table>")

    # --- what did the blueprint do
    branch_names = {"laden": "Laden van net", "ontladen": "Ontladen (vrij)", "vasthouden": "Smart Hold",
                    "noodladen": "Noodladen", "default": "Standaard (vrij)"}
    cnt = defaultdict(lambda: defaultdict(float))
    for t, b in zip(ds.steps, bp.result.branches):
        cnt[t.date()][b] += 0.25
    br_rows = "".join(
        f"<tr><td class=d>{DAYS_NL[d.weekday()]} {d:%d-%m}</td>" +
        "".join(f"<td class=n>{num(cnt[d][b])}</td>" for b in branch_names) + "</tr>" for d in days)
    br_table = ("<table><thead><tr><th>Dag (uren)</th>" + "".join(f"<th>{v}</th>" for v in branch_names.values())
                + "</tr></thead><tbody>" + br_rows + "</tbody></table>")

    # --- validation
    val_html = ""
    if actual_import:
        rows = []
        for d in days:
            sim = sum(max(r.grid, 0) for t, r in zip(ds.steps, bp.result.steps) if t.date() == d)
            act = actual_import.get(d.isoformat())
            if act is not None:
                rows.append(f"<tr><td class=d>{DAYS_NL[d.weekday()]} {d:%d-%m}</td><td class=n>{num(act, 2)}</td><td class=n>{num(sim, 2)}</td></tr>")
        val_html = ("<h2>Controle tegen de werkelijkheid</h2><p class=muted>Netafname volgens het Home Assistant-energiedashboard "
                    "tegenover de gesimuleerde blueprint. Verschillen komen vooral doordat de invoer van screenshots is afgelezen "
                    "en doordat de echte instellingen en startprijs onbekend zijn.</p>"
                    "<table><thead><tr><th>Dag</th><th>Werkelijk kWh</th><th>Simulatie kWh</th></tr></thead><tbody>"
                    + "".join(rows) + "</tbody></table>")

    # --- charts
    times = ds.steps
    price_series = [("Stroomprijs all-in", [ds.price_at(t) for t in times])]
    pmax = max(v for v in price_series[0][1])
    price_chart = _line_chart("price", times, price_series, 0.0, max(0.5, round(pmax + 0.05, 1)),
                              [0, 0.1, 0.2, 0.3, 0.4, 0.5], "€", step_shape=True, height=170)
    soc_chart = _line_chart("soc", times, [
        ("Blueprint (huidig)", [r.soc for r in bp.result.steps]),
        ("Optimaal", [r.soc for r in opt.result.steps]),
        ("Zelfverbruik", [r.soc for r in selfu.result.steps]),
    ], 0, 100, [0, 25, 50, 75, 100], "%")

    findings = []
    findings.append(f"De blueprint bespaarde in deze {len(days)} dagen {eur(base - bp.net_cost)}; een batterij die "
                    f"alleen zelfverbruik doet bespaart {eur(base - selfu.net_cost)}. De slimme laag voegt nu dus "
                    f"{eur(selfu.net_cost - bp.net_cost)} toe.")
    findings.append(f"Met perfecte voorspelling was {eur(base - opt.net_cost)} haalbaar: {eur(gap_now)} meer dan nu. "
                    "Dat is het plafond voor elke verbetering van de regels.")
    if adv.net_cost > bp.net_cost:
        findings.append(f"Het herfstadvies ({', '.join(f'{k}={v}' for k, v in ADVICE.items())}) kost hier "
                        f"{eur(adv.net_cost - bp.net_cost)} méér: er wordt dan vaker van het net geladen terwijl "
                        "de zon daarna de batterij ook had gevuld. Losse drempels bijstellen helpt dus niet.")
    else:
        findings.append(f"Het herfstadvies levert {eur(bp.net_cost - adv.net_cost)} extra op.")
    findings.append(f"Zonder salderen (2027) groeit het verschil tussen blueprint en optimaal naar {eur(gap27)} "
                    "voor dezelfde dagen, omdat elke kWh die je zelf opslaat dan veel meer waard is.")
    pl, pl27 = by["planner"].net_cost, by27["planner"].net_cost
    findings.append(f"De planner (voorspelling + optimalisatie, zelfde schakelaars) bespaart {eur(base - pl)} nu en "
                    f"{eur(base27 - pl27)} in 2027, tegen {eur(base - bp.net_cost)} en {eur(base27 - by27['bp'].net_cost)} "
                    "voor de blueprint. Met meer verbruiksgeschiedenis wordt de voorspelling, en dus de planner, beter.")
    self27, bp27 = by27["self"].net_cost, by27["bp"].net_cost
    if self27 < bp27:
        findings.append(f"Let op: in 2027 doet gewoon zelfverbruik het {eur(bp27 - self27)} beter dan de blueprint. "
                        "Het vasthouden en bijladen van het net kost dan zonnestroom die tegen een lage "
                        "terugleververgoeding het net op gaat. De regels moeten daarvoor anders worden opgezet.")
    findings_html = "".join(f"<li>{f}</li>" for f in findings)

    settings_note = (f"Batterij {num(bat.capacity_kwh)} kWh, {num(bat.max_power_kw)} kW, rendement "
                     f"{round(bat.eta_charge * bat.eta_discharge * 100)}% rondgang, ondergrens omvormer "
                     f"{num(bat.hw_min_soc, 0)}%, start-SoC {num(ds.start_soc, 0)}%.")

    return TEMPLATE.format(period=period, tiles=tiles_html, bars=bars, table=table, day_table=day_table,
                           br_table=br_table, val_html=val_html, price_chart=price_chart, soc_chart=soc_chart,
                           findings=findings_html, settings_note=settings_note,
                           source_note=html.escape(source_note),
                           deduction=num(export_deduction, 2),
                           generated=datetime.now().strftime("%d-%m-%Y %H:%M"))


TEMPLATE = """<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Batterij Simulatie</title>
<style>
:root{{color-scheme:light;--bg:#f9f9f7;--surface:#fcfcfb;--ink:#0b0b0b;--ink2:#52514e;--muted:#898781;
--grid:#e1e0d9;--axis:#c3c2b7;--border:rgba(11,11,11,.10);--s1:#2a78d6;--s2:#eb6834;--s3:#1baf7a}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{color-scheme:dark;--bg:#0d0d0d;--surface:#1a1a19;
--ink:#f0efec;--ink2:#c3c2b7;--muted:#898781;--grid:#2c2c2a;--axis:#383835;--border:rgba(255,255,255,.10);
--s1:#3987e5;--s2:#d95926;--s3:#199e70}}}}
:root[data-theme="dark"]{{color-scheme:dark;--bg:#0d0d0d;--surface:#1a1a19;--ink:#f0efec;--ink2:#c3c2b7;--muted:#898781;
--grid:#2c2c2a;--axis:#383835;--border:rgba(255,255,255,.10);--s1:#3987e5;--s2:#d95926;--s3:#199e70}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}}
main{{max-width:820px;margin:0 auto;padding:24px 16px 48px}}
h1{{font-size:24px;margin:0 0 4px}} h2{{font-size:18px;margin:32px 0 8px}}
.muted{{color:var(--ink2)}} .small{{font-size:13px}}
.note{{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:10px 14px;margin:16px 0;color:var(--ink2);font-size:14px}}
.tiles{{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:16px 0}}
.tile{{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 14px}}
.tl{{font-size:13px;color:var(--ink2)}} .tv{{font-size:26px;font-weight:600;margin:2px 0}} .ts{{font-size:12px;color:var(--muted)}}
.card{{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 12px 6px;margin:8px 0;position:relative}}
.plot svg{{display:block;overflow:visible}}
.bars{{display:flex;flex-direction:column;gap:14px;padding:4px 0 8px}}
.blabel{{font-size:13px;margin-bottom:4px}}
.btrack{{position:relative;margin-right:64px}}
.bar-row{{position:relative;height:16px;margin:2px 0}}
.bar{{position:absolute;top:0;height:14px;border-radius:0 4px 4px 0}}
.bar-val{{position:absolute;top:-1px;font-size:12px;color:var(--ink2);font-variant-numeric:tabular-nums;white-space:nowrap}}
.grid{{stroke:var(--grid);stroke-width:1}} .grid.strong{{stroke:var(--axis)}} .axis{{stroke:var(--axis);stroke-width:1}}
.tick{{fill:var(--muted);font-size:11px;font-variant-numeric:tabular-nums}}
.lab{{fill:var(--ink);font-size:12px}} .val{{fill:var(--ink2);font-size:11px;font-variant-numeric:tabular-nums}}
.xhair{{stroke:var(--axis);stroke-width:1}}
.legend{{display:flex;flex-wrap:wrap;gap:14px;font-size:13px;color:var(--ink2);margin:0 0 6px 4px}}
.key i{{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}}
.chart-wrap{{position:relative}}
.tip{{position:absolute;pointer-events:none;background:var(--surface);border:1px solid var(--border);border-radius:8px;
padding:6px 9px;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,.15);white-space:nowrap;z-index:2}}
.tip b{{font-weight:600}} .tip .sw{{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:5px}}
.scroll{{overflow-x:auto}}
table{{border-collapse:collapse;width:100%;font-size:13px;background:var(--surface);border:1px solid var(--border);border-radius:10px}}
th,td{{padding:6px 8px;border-bottom:1px solid var(--grid);text-align:left;vertical-align:top}}
th{{color:var(--ink2);font-weight:600}} td.n,th:not(:first-child){{text-align:right;font-variant-numeric:tabular-nums}}
tbody tr:last-child td{{border-bottom:0}}
ul.f li{{margin:6px 0}} td.d{{white-space:nowrap}}
</style></head><body><main>
<h1>Batterij-simulatie</h1>
<div class="muted">Periode {period} · Frank Energie all-in prijzen · gegenereerd {generated}</div>
<div class="note">{source_note} {settings_note} Besparingen zijn netto: energie die aan het eind extra in de batterij zit
wordt gewaardeerd tegen de gemiddelde prijs van de dag erna.</div>
<div class="tiles">{tiles}</div>

<h2>Conclusies</h2>
<ul class="f">{findings}</ul>

<h2>Besparing per scenario</h2>
<p class="muted small">Ten opzichte van dezelfde dagen zonder batterij. 2027: teruglevering levert €{deduction}/kWh minder op dan
de all-in inkoopprijs (salderingsregeling stopt).</p>
<div class="card">{bars}</div>

<h2>Prijs en laadtoestand</h2>
<div class="card"><div class="legend">Stroomprijs all-in (€/kWh)</div>{price_chart}</div>
<div class="card">{soc_chart}</div>

<h2>Alle scenario's (2026)</h2>
<div class="scroll">{table}</div>

<h2>Per dag</h2>
<div class="scroll">{day_table}</div>

<h2>Wat deed de blueprint?</h2>
<p class="muted small">Uren per dag in elke tak van de automatisering.</p>
<div class="scroll">{br_table}</div>
{val_html}
</main>
<script>
(function(){{
var NS='http://www.w3.org/2000/svg', cols=['var(--s1)','var(--s2)','var(--s3)'];
function el(n,a,p){{var e=document.createElementNS(NS,n);for(var k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e;}}
function draw(box,d){{
  box.innerHTML='';
  var W=box.clientWidth,H=d.h,L=38,R=8,T=8,B=22,pw=W-L-R,ph=H-T-B,n=d.labels.length;
  var X=function(i){{return L+pw*i/(n-1);}}, Y=function(v){{return T+ph*(1-(v-d.ymin)/(d.ymax-d.ymin));}};
  var svg=el('svg',{{width:W,height:H,role:'img'}},box);
  d.ticks.forEach(function(t){{
    el('line',{{x1:L,x2:W-R,y1:Y(t),y2:Y(t),'class':'grid'}},svg);
    var tx=el('text',{{x:L-6,y:Y(t)+4,'class':'tick','text-anchor':'end'}},svg);
    tx.textContent=d.unit==='€'?t.toFixed(2).replace('.',','):t+'%';
  }});
  var narrow=W<520;
  d.day.forEach(function(lab,i){{
    if(!lab) return; var major=lab!=='12:00';
    el('line',{{x1:X(i),x2:X(i),y1:T,y2:T+ph,'class':major?'grid strong':'grid'}},svg);
    if(major||!narrow){{var tx=el('text',{{x:X(i)+3,y:H-6,'class':'tick'}},svg);tx.textContent=lab;}}
  }});
  d.series.forEach(function(se,k){{
    var pts=[];se.values.forEach(function(v,i){{if(d.step&&i>0)pts.push(X(i)+','+Y(se.values[i-1]));pts.push(X(i)+','+Y(v));}});
    el('polyline',{{points:pts.join(' '),fill:'none',stroke:cols[k],'stroke-width':2,'stroke-linejoin':'round'}},svg);
  }});
  var xh=el('line',{{y1:T,y2:T+ph,'class':'xhair',visibility:'hidden'}},svg);
  var hit=el('rect',{{x:L,y:T,width:pw,height:ph,fill:'transparent'}},svg);
  var tip=box.parentNode.querySelector('.tip');
  function fmt(v){{return d.unit==='€'?'€'+v.toFixed(3).replace('.',','):Math.round(v)+'%';}}
  function move(ev){{
    var r=svg.getBoundingClientRect(),i=Math.max(0,Math.min(n-1,Math.round((ev.clientX-r.left-L)/pw*(n-1)))),px=X(i);
    xh.setAttribute('x1',px);xh.setAttribute('x2',px);xh.setAttribute('visibility','visible');
    var h='<b>'+d.labels[i]+'</b>';
    d.series.forEach(function(se,k){{h+='<br><span class="sw" style="background:'+cols[k]+'"></span>'+se.name+': '+fmt(se.values[i]);}});
    tip.innerHTML=h;tip.hidden=false;
    var tw=tip.offsetWidth;tip.style.left=Math.min(Math.max(px+12,0),W-tw)+'px';
    tip.style.top=(box.offsetTop+4)+'px';
  }}
  hit.addEventListener('pointermove',move);hit.addEventListener('pointerdown',move);
  hit.addEventListener('pointerleave',function(){{tip.hidden=true;xh.setAttribute('visibility','hidden');}});
}}
var charts=[];
document.querySelectorAll('script[data-for]').forEach(function(s){{
  charts.push([document.getElementById(s.dataset.for),JSON.parse(s.textContent)]);
}});
function all(){{charts.forEach(function(c){{draw(c[0],c[1]);}});}}
all(); var to; addEventListener('resize',function(){{clearTimeout(to);to=setTimeout(all,100);}});
}})();
</script>
</body></html>
"""

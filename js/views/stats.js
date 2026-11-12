// Экран «Статистика».
import { store, activeStudents } from "../store.js";
import { stats } from "../srs.js";
import { avatar, emptyBlock } from "../components.js";
import { esc, today, addD, dstr, fmtDay, fmtWd, parseD } from "../utils.js";
import { S } from "../surahs.js";

export function viewStats() {
  const studs = activeStudents();
  if (!studs.length) {
    return `<div class="page-head reveal"><div><h1>Статистика</h1></div></div>${emptyBlock("Пока нечего считать", "")}`;
  }
  const t = today();
  const all = studs.map((s) => ({ s, st: stats(s.id) }));
  const sumA = all.reduce((a, x) => a + x.st.ayahs, 0);
  const sumF = all.reduce((a, x) => a + x.st.full, 0);
  const avg = all.reduce((a, x) => a + x.st.pct, 0) / all.length;
  const min30 = addD(t, -29);
  let sol = 0, err = 0;
  const per = {};
  for (const e of store.state.events) {
    if (dstr(new Date(e.ts)) < min30) continue;
    if (e.type === "solid") { sol++; (per[e.sid] ??= { s: 0, e: 0 }).s++; }
    else if (e.type === "errors") { err++; (per[e.sid] ??= { s: 0, e: 0 }).e++; }
  }
  const acc = sol + err ? Math.round((sol / (sol + err)) * 100) : 100;

  const ds = [...Array(14)].map((_, i) => addD(t, -13 + i));
  const counts = ds.map((d) => {
    let s = 0, e = 0;
    for (const ev of store.state.events) {
      if (dstr(new Date(ev.ts)) !== d) continue;
      if (ev.type === "solid") s++; else if (ev.type === "errors") e++;
    }
    return { d, s, e };
  });
  const maxC = Math.max(1, ...counts.map((c) => c.s + c.e));

  const cov = [];
  for (let n = 1; n <= 114; n++) {
    let f = 0, p = 0;
    for (const { st } of all) {
      const c = st.cov[n];
      if (!c) continue;
      c.count >= c.total ? f++ : p++;
    }
    cov.push({ n, f, p });
  }

  const board = [...all].sort((a, b) => b.st.ayahs - a.st.ayahs);
  const maxA = Math.max(1, ...board.map((x) => x.st.ayahs));
  const gm = {};
  for (const { s, st } of all) { const g = (gm[s.group] ??= { n: 0, a: 0 }); g.n++; g.a += st.ayahs; }

  return `<div class="page-head reveal"><div><h1>Статистика</h1></div></div>
    <div class="stats-grid reveal" style="--i:1">
      <div class="kpi"><b data-count="${all.length}">0</b><span>учениц</span></div>
      <div class="kpi"><b data-count="${sumA}">0</b><span>аятов</span></div>
      <div class="kpi k-violet"><b data-count="${avg.toFixed(1)}" data-dec="1">0</b><span>средний %</span></div>
      <div class="kpi k-amber"><b data-count="${sumF}">0</b><span>сур целиком</span></div>
      <div class="kpi k-green"><b data-count="${acc}">0</b><span>% «твёрдо»</span></div>
    </div>
    <section class="card chart-card reveal" style="--i:2"><h2>Повторения за 14 дней</h2>
      <div class="chart">${counts.map((c, i) => {
        const tt = c.s + c.e, h = Math.round((tt / maxC) * 140), hs = tt ? Math.round((c.s / tt) * h) : 0;
        return `<div class="ch-col ${i === 13 ? "today" : ""}" data-tip="${fmtDay.format(parseD(c.d))}\nТвёрдо: ${c.s}\nОшибки: ${c.e}">
          <div class="ch-bar" style="height:${Math.max(2, h)}px"><div class="ch-solid" style="height:${hs}px"></div><div class="ch-errors" style="height:${h - hs}px"></div></div>
          <span class="ch-label">${fmtWd.format(parseD(c.d))}</span></div>`;
      }).join("")}</div>
      <div class="chart-legend"><span class="lg-item"><span class="sw sw-full"></span>твёрдо</span><span class="lg-item"><span class="sw" style="background:var(--red)"></span>ошибки</span></div>
    </section>
    <section class="card chart-card reveal" style="--i:3"><h2>Покрытие сур</h2>
      <div class="coverage">${cov.map((c) => `<div class="cov-cell cov-c${Math.min(4, Math.ceil(c.f + c.p * 0.5))}" data-tip="${c.n}. ${esc(S(c.n)[1])}\nЦеликом: ${c.f} · частично: ${c.p}">${c.n}</div>`).join("")}</div>
    </section>
    <section class="card board reveal" style="--i:4"><h2>Прогресс</h2>
      ${board.map(({ s, st }, i) => {
        const p = per[s.id], a = p && p.s + p.e ? Math.round((p.s / (p.s + p.e)) * 100) + "%" : "—";
        return `<div class="b-row"><span class="rank ${i < 3 ? "r" + (i + 1) : ""}">${i + 1}</span>${avatar(s, "sm")}
          <div class="b-info"><b>${esc(s.name)}</b><span>${esc(s.group)}</span></div>
          <div class="b-bar-wrap"><div class="b-bar" style="width:${Math.max(2, Math.round((st.ayahs / maxA) * 100))}%"></div></div>
          <span class="b-nums"><b>${st.ayahs}</b> · ${st.full} сур · ${a}</span></div>`;
      }).join("")}
    </section>
    <section class="card reveal" style="--i:5"><h2>Группы</h2>
      ${Object.entries(gm).map(([g, v]) => `<span class="g-chip"><b>${esc(g)}</b> · ${v.n} · ${v.a} аят.</span>`).join("")}
    </section>`;
}

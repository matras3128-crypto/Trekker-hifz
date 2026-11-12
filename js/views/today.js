// Экран «Сегодня»: сводка, неделя, группы к повтору.
import { store, isStaff, isStudent, byId, activeStudents } from "../store.js";
import { stats, totalDue } from "../srs.js";
import { avatar, passageRow, emptyBlock } from "../components.js";
import { icon } from "../icons.js";
import { esc, today, addD, diffD, cap, fmtFull, fmtWd, parseD } from "../utils.js";

export function viewToday() {
  if (isStudent() && !store.member.student_id) {
    return `<div class="page-head reveal"><div><h1>Салам, ${esc(store.member.name)}</h1></div></div>
      ${emptyBlock("Аккаунт не привязан", "Обратитесь к владельцу журнала.")}`;
  }
  if (!activeStudents().length) {
    return `<div class="page-head reveal"><div><h1>Сегодня</h1>
      <p class="sub">${cap(fmtFull.format(new Date()))}</p></div></div>
      ${emptyBlock("Учениц пока нет", isStaff() ? "Добавьте первую ученицу." : "",
        isStaff() ? `<button class="btn primary" data-action="add-student">${icon("plus", 15)} Добавить ученицу</button>` : "")}`;
  }

  const t = today();
  const studs = isStudent()
    ? store.state.students.filter((s) => s.id === store.member.student_id)
    : activeStudents();

  let over = 0, due = 0, tom = 0, mast = 0;
  const week = [0, 0, 0, 0, 0, 0, 0];
  for (const p of store.state.passages) {
    const s = byId(p.sid);
    if (!s || s.archived) continue;
    if (p.stage >= 7) { mast++; continue; }
    const d = diffD(p.next, t);
    if (d < 0) over++;
    else if (d === 0) due++;
    else if (d === 1) tom++;
    if (d >= 0 && d < 7) week[d]++;
  }

  const groups = studs
    .map((s) => ({
      s,
      ps: store.state.passages
        .filter((p) => p.sid === s.id && p.stage < 7 && diffD(p.next, t) <= 0)
        .sort((a, b) => (a.next < b.next ? -1 : 1)),
    }))
    .map((g) => ({ ...g, over: g.ps.filter((p) => diffD(p.next, t) < 0).length }))
    .filter((g) => g.ps.length)
    .sort((a, b) => b.over - a.over || a.s.name.localeCompare(b.s.name, "ru"));

  const maxW = Math.max(1, ...week);

  let h = `<div class="page-head reveal">
      <div><h1>${isStudent() ? esc(store.member.name) + ", сегодня" : "Повторения на сегодня"}</h1>
      <p class="sub">${cap(fmtFull.format(new Date()))}</p></div>
      ${isStudent() ? `<button class="btn primary" data-action="nav" data-view="requests">${icon("send", 15)} Подать заявку</button>` : ""}
    </div>
    <div class="summary reveal" style="--i:1">
      <div class="sum-chip sc-red"><b data-count="${over}">0</b><span>просрочено</span></div>
      <div class="sum-chip sc-amber"><b data-count="${due}">0</b><span>сегодня</span></div>
      <div class="sum-chip sc-blue"><b data-count="${tom}">0</b><span>завтра</span></div>
      <div class="sum-chip sc-green"><b data-count="${mast}">0</b><span>закреплено</span></div>
    </div>
    <section class="card week-card reveal" style="--i:2"><h2>Ближайшая неделя</h2>
      <div class="week">${week.map((n, i) => `
        <div class="w-day ${i === 0 ? "today" : ""}"><b>${n}</b>
          <div class="w-bar-wrap"><div class="w-bar" style="height:${Math.round((n / maxW) * 100)}%"></div></div>
          <span>${i === 0 ? "сегодня" : fmtWd.format(parseD(addD(t, i)))}</span>
        </div>`).join("")}
      </div>
    </section>`;

  if (!groups.length) {
    h += emptyBlock("На сегодня повторений нет", "",
      isStaff()
        ? `<button class="btn primary" data-action="go-add">${icon("plus", 15)} Записать сдачу</button>`
        : `<button class="btn primary" data-action="nav" data-view="requests">${icon("send", 15)} Подать заявку</button>`);
  } else {
    h += groups.map((g, gi) => `
      <section class="card today-group reveal" style="--i:${Math.min(gi + 3, 9)}">
        <header class="tg-head">
          ${avatar(g.s, "md")}
          <div class="tg-name"><b>${esc(g.s.name)}</b><span>${esc(g.s.group)}</span></div>
          ${isStaff() ? `<label class="group-check"><input type="checkbox" data-check-group="${g.s.id}"> все</label>` : ""}
          <span class="tg-count ${g.over ? "has-over" : ""}">${g.ps.length} к повтору</span>
          ${isStaff() ? `
            <button class="btn soft sm" data-action="bulk-solid" data-id="${g.s.id}">${icon("check", 14)} Все твёрдо</button>
            <button class="btn ghost sm" data-action="open-student" data-id="${g.s.id}">Открыть</button>` : ""}
        </header>
        <div class="tg-rows">${g.ps.map((p, i) => passageRow(p, i, "today")).join("")}</div>
      </section>`).join("");
  }
  return h;
                 }

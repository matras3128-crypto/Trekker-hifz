// Экран «Ученицы»: поиск, группы, сортировка, карточки.
import { store, activeStudents, groupsList } from "../store.js";
import { stats, streak } from "../srs.js";
import { avatar, emptyBlock, streakChip } from "../components.js";
import { icon } from "../icons.js";
import { esc, ayahsW } from "../utils.js";

export function groupChipsHTML() {
  return `<button class="chip ${store.ui.sg === "all" ? "active" : ""}" data-action="gfilter" data-val="all">Все группы</button>` +
    groupsList().map((g) =>
      `<button class="chip ${store.ui.sg === g ? "active" : ""}" data-action="gfilter" data-val="${esc(g)}">${esc(g)}</button>`
    ).join("");
}

export function studentsGridHTML() {
  const list = store.state.students.filter((s) =>
    !!s.archived === store.ui.arch &&
    (store.ui.sg === "all" || s.group === store.ui.sg) &&
    (!store.ui.sq || s.name.toLowerCase().includes(store.ui.sq.toLowerCase()))
  );
  const all = list.map((s) => ({ s, st: stats(s.id) }));
  const maxA = Math.max(1, ...all.map((x) => x.st.ayahs));
  all.sort((a, b) => {
    if (store.ui.ss === "progress") return b.st.ayahs - a.st.ayahs;
    if (store.ui.ss === "due") return (b.st.due + b.st.over) - (a.st.due + a.st.over);
    if (store.ui.ss === "manual") return store.state.students.indexOf(a.s) - store.state.students.indexOf(b.s);
    return a.s.name.localeCompare(b.s.name, "ru");
  });

  if (!all.length) {
    return `<div style="grid-column:1/-1">${emptyBlock(
      store.ui.arch ? "В архиве пусто" : "Учениц пока нет", "",
      `<button class="btn primary" data-action="add-student">${icon("plus", 15)} Добавить ученицу</button>`
    )}</div>`;
  }

  return all.map(({ s, st }, i) => {
    const dueN = st.due + st.over;
    return `<article class="student-card reveal" style="--i:${Math.min(i, 10)}"
        data-action="open-student" data-id="${s.id}" tabindex="0"
        draggable="${store.ui.ss === "manual" && !store.ui.arch}">
      <div class="sc-top">
        ${store.ui.ss === "manual" && !store.ui.arch ? `<span class="grip">${icon("grip", 16)}</span>` : ""}
        ${avatar(s, "md")}
        <div class="sc-name"><h3>${esc(s.name)}</h3><span class="sc-group">${esc(s.group)}</span></div>
        <div class="sc-icons">
          <button class="icon-btn" data-action="edit-student" data-id="${s.id}">${icon("pencil", 13)}</button>
          <button class="icon-btn" data-action="archive-student" data-id="${s.id}">${icon("archive", 13)}</button>
        </div>
      </div>
      <div class="sc-stats"><b>${st.ayahs}</b> ${ayahsW(st.ayahs)} · <b>${st.full}</b> сур · ${st.pct.toFixed(1)}%</div>
      <div class="progress"><i style="width:${Math.max(2, Math.round((st.ayahs / maxA) * 100))}%"></i></div>
      <div class="sc-foot">
        ${dueN ? `<span class="badge ${st.over ? "b-red" : "b-amber"}">${dueN} к повтору</span>` : '<span class="badge b-green">всё повторено</span>'}
        ${streakChip(s.id, streak)}
        ${s.archived ? '<span class="badge b-violet">архив</span>' : ""}
      </div>
    </article>`;
  }).join("");
}

function viewsHTML() {
  return `<div class="views-row reveal" style="--i:2">
    ${store.state.views.map((v) => `
      <span class="view-chip">
        <button data-action="apply-view" data-id="${v.id}">${esc(v.name)}</button>
        <button class="vx" data-action="delete-view" data-id="${v.id}">${icon("x", 12)}</button>
      </span>`).join("")}
    <button class="chip" data-action="save-view">${icon("save", 13)} Сохранить вид</button>
  </div>`;
}

export function viewStudents() {
  const arch = store.state.students.filter((s) => s.archived).length;
  return `<div class="page-head reveal">
      <div><h1>Ученицы<span class="count-pill">${activeStudents().length}</span></h1></div>
      <button class="btn primary" data-action="add-student">${icon("plus", 15)} Добавить ученицу</button>
    </div>
    <div class="toolbar card reveal" style="--i:1">
      <input id="studentSearch" class="search" type="search" placeholder="Поиск по имени" value="${esc(store.ui.sq)}">
      <div class="chips" id="groupChips">${groupChipsHTML()}</div>
      <button class="chip ${store.ui.arch ? "active" : ""}" data-action="toggle-arch">${icon("archive", 13)} Архив${arch ? ` (${arch})` : ""}</button>
      <select id="studentSort" class="mini-select">
        <option value="name">По имени</option>
        <option value="progress">По прогрессу</option>
        <option value="due">По повторам</option>
        <option value="manual">Мой порядок</option>
      </select>
    </div>
    ${viewsHTML()}
    <div class="students-grid" id="studentsGrid">${studentsGridHTML()}</div>`;
}

// Карточка ученицы: статистика, карта, форма сдачи, отрывки.
import { store, byId, isStaff } from "../store.js";
import { stats, coverage, streak, nextGap } from "../srs.js";
import { avatar, cellsHTML, legendHTML, statsHTML, streakChip, passageRow, surahOptions } from "../components.js";
import { icon } from "../icons.js";
import { esc, today, diffD, ayahsW } from "../utils.js";
import { S } from "../surahs.js";

function pChipsHTML() {
  return [["all", "Все"], ["due", "К повтору"], ["overdue", "Просрочено"], ["mastered", "Закреплено"]]
    .map(([v, l]) => `<button class="chip ${store.ui.ps === v ? "active" : ""}" data-action="pfilter" data-val="${v}">${l}</button>`)
    .join("");
}

export function viewStudent(id) {
  const s = byId(id);
  const st = stats(id);
  const staff = isStaff();
  return `<div id="detailRoot">
    ${staff
      ? `<button class="back reveal" data-action="back-students">${icon("left", 15)} Все ученицы</button>`
      : `<button class="back reveal" data-action="nav" data-view="today">${icon("left", 15)} Сегодня</button>`}
    <div class="detail-head reveal" style="--i:1">
      ${avatar(s, "lg")}
      <div class="dh-info">
        <h1>${esc(s.name)}</h1>
        <div class="dh-sub">${esc(s.group)} ${streakChip(s.id, streak)} ${s.archived ? '<span class="badge b-violet">архив</span>' : ""}</div>
        ${s.note ? `<div class="student-note">${esc(s.note)}</div>` : ""}
      </div>
      ${staff ? `<div class="dh-actions">
        <button class="btn ghost sm" data-action="edit-student" data-id="${s.id}">${icon("pencil", 14)} Изменить</button>
        <button class="btn ghost sm" data-action="archive-student" data-id="${s.id}">${icon("archive", 14)} ${s.archived ? "Вернуть" : "В архив"}</button>
        <button class="btn ghost sm danger-text" data-action="delete-student" data-id="${s.id}">Удалить</button>
        <button class="btn soft sm" data-action="student-report" data-id="${s.id}">${icon("download", 14)} Отчёт</button>
      </div>` : ""}
    </div>
    <div class="stats-row reveal" id="detailStats" style="--i:2">${statsHTML(st)}</div>
    <section class="card map-card reveal" style="--i:3">
      <h2>Карта выученного</h2>
      <div class="map anim" id="mapGrid">${cellsHTML(id, coverage)}</div>
      ${legendHTML()}
    </section>
    <div class="detail-cols">
      ${staff ? `
        <section class="card form-card reveal" style="--i:4" id="formCard">
          <h2>Новая сдача</h2>
          <form id="newPassageForm" autocomplete="off">
            <div class="field-row">
              <label class="field" style="flex:2">Сура<select name="surah" id="npSurah">${surahOptions(114)}</select></label>
              <label class="field">С аята<input name="from" id="npFrom" type="number" min="1" value="1"></label>
              <label class="field">По аят<input name="to" id="npTo" type="number" min="1" placeholder="конец"></label>
            </div>
            <div class="f-hint" id="surahHint"></div>
            <div class="field-row">
              <label class="field">Дата<input name="date" id="npDate" type="date" value="${today()}" max="${today()}"></label>
              <label class="field" style="flex:2">Заметка<input name="note" maxlength="160" placeholder="Что проверить"></label>
            </div>
            <div class="f-msg" id="formMsg"></div>
            <button class="btn primary block" type="submit">${icon("plus", 15)} Записать</button>
          </form>
        </section>`
        : `<section class="card reveal" style="--i:4">
            <button class="btn primary block" data-action="nav" data-view="requests">${icon("send", 15)} Подать заявку</button>
          </section>`}
      <section class="passages reveal" style="--i:5">
        <div class="p-head">
          <h2 class="upper" id="passageCount"></h2>
          <div class="p-tools">
            <div class="chips" id="pChips">${pChipsHTML()}</div>
            <select id="passageSort" class="mini-select">
              <option value="new">Сначала новые</option>
              <option value="review">По дате повтора</option>
              <option value="surah">По номеру суры</option>
            </select>
          </div>
        </div>
        <div id="passageList" class="p-list card"></div>
      </section>
    </div>
  </div>`;
}

export function renderPassageList() {
  const wrap = document.querySelector("#passageList");
  if (!wrap) return;
  const t = today();
  let ps = store.state.passages.filter((p) => p.sid === store.ui.studentId);
  const total = ps.length;
  if (store.ui.ps === "due") ps = ps.filter((p) => p.stage < 7 && diffD(p.next, t) <= 0);
  else if (store.ui.ps === "overdue") ps = ps.filter((p) => p.stage < 7 && diffD(p.next, t) < 0);
  else if (store.ui.ps === "mastered") ps = ps.filter((p) => p.stage >= 7);
  ps.sort((a, b) => {
    if (store.ui.po === "review") {
      if ((a.stage >= 7) !== (b.stage >= 7)) return a.stage >= 7 ? 1 : -1;
      return (a.next || "9999") < (b.next || "9999") ? -1 : 1;
    }
    if (store.ui.po === "surah") return a.surah - b.surah || a.from - b.from;
    return a.added < b.added ? 1 : a.added > b.added ? -1 : (a.id < b.id ? 1 : -1);
  });
  document.querySelector("#passageCount").textContent =
    `Отрывки · ${ps.length}${ps.length !== total ? ` из ${total}` : ""}`;
  document.querySelector("#pChips").innerHTML = pChipsHTML();
  wrap.innerHTML = ps.length
    ? ps.map((p, i) => passageRow(p, i, "detail")).join("")
    : '<div class="empty-list">Отрывков пока нет.</div>';
}

export function hintHTML(sid, n) {
  const c = coverage(sid)[n];
  const total = S(n)[3];
  if (!c) return `В суре ${total} ${ayahsW(total)}.`;
  if (c.count >= c.total) return "Сура закрыта целиком.";
  return `Записано: ${c.ranges.map((r) => (r[0] === r[1] ? r[0] : `${r[0]}–${r[1]}`)).join(", ")} · следующий: ${nextGap(sid, n)}`;
}

export function onSurahChange(set) {
  const sel = document.querySelector("#npSurah");
  if (!sel) return;
  const n = +sel.value;
  const total = S(n)[3];
  const from = document.querySelector("#npFrom");
  const to = document.querySelector("#npTo");
  from.max = total; to.max = total;
  if (set) { from.value = nextGap(store.ui.studentId, n); to.value = ""; }
  else if (+from.value > total) from.value = total;
  document.querySelector("#surahHint").textContent = hintHTML(store.ui.studentId, n);
}

export function prefillForm(n, scroll) {
  const sel = document.querySelector("#npSurah");
  if (!sel) return;
  sel.value = n;
  onSurahChange(true);
  document.querySelector("#formMsg").textContent = "";
  if (scroll) {
    const c = document.querySelector("#formCard");
    c.scrollIntoView({ behavior: "smooth", block: "center" });
    c.classList.remove("pulse"); void c.offsetWidth; c.classList.add("pulse");
  }
}

export function updateDetail() {
  const st = stats(store.ui.studentId);
  const ds = document.querySelector("#detailStats");
  if (ds) ds.innerHTML = statsHTML(st);
  const mg = document.querySelector("#mapGrid");
  if (mg) { mg.classList.remove("anim"); mg.innerHTML = cellsHTML(store.ui.studentId, coverage); }
  renderPassageList();
  onSurahChange(false);
    }

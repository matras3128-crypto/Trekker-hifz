// Экран «Журнал»: лента событий за 30 дней.
import { store, isStaff, byId } from "../store.js";
import { emptyBlock } from "../components.js";
import { icon } from "../icons.js";
import { esc, today, addD, dstr, cap, fmtDay, fmtTime, parseD } from "../utils.js";
import { S } from "../surahs.js";

const EV = {
  add: "записала сдачу", solid: "повторила твёрдо", errors: "повторила с ошибками",
  edit: "изменила отрывок", merge: "объединила диапазон", delete: "удалила отрывок",
};
const EVI = {
  add: ["ji-add", "plus"], solid: ["ji-solid", "check"], errors: ["ji-errors", "alert"],
  edit: ["ji-edit", "pencil"], merge: ["ji-edit", "plus"], delete: ["ji-edit", "trash"],
};

function jChipsHTML() {
  return [["all", "Все"], ["add", "Сдачи"], ["solid", "Твёрдо"], ["errors", "Ошибки"]]
    .map(([v, l]) => `<button class="chip ${store.ui.jt === v ? "active" : ""}" data-action="jfilter" data-val="${v}">${l}</button>`)
    .join("");
}

export function viewJournal() {
  return `<div class="page-head reveal">
      <div><h1>Журнал</h1></div>
      <button class="btn soft" data-action="export-csv">${icon("download", 15)} CSV</button>
    </div>
    <div class="toolbar card reveal" style="--i:1">
      ${isStaff() ? `<select id="journalStudent" class="mini-select">
        <option value="all">Все ученицы</option>
        ${store.state.students.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("")}
      </select>` : ""}
      <div class="chips" id="jChips">${jChipsHTML()}</div>
    </div>
    <div id="journalList"></div><p class="j-foot" id="jFoot"></p>`;
}

export function renderJournalList() {
  const wrap = document.querySelector("#journalList");
  if (!wrap) return;
  const t = today(), min = addD(t, -29);
  const evs = store.state.events.filter((e) => {
    if (store.ui.js !== "all" && e.sid !== store.ui.js) return false;
    if (store.ui.jt === "add" && !["add", "edit", "merge", "delete"].includes(e.type)) return false;
    if (store.ui.jt === "solid" && e.type !== "solid") return false;
    if (store.ui.jt === "errors" && e.type !== "errors") return false;
    return dstr(new Date(e.ts)) >= min;
  }).sort((a, b) => (a.ts < b.ts ? 1 : -1));

  const byDay = {};
  for (const e of evs) (byDay[dstr(new Date(e.ts))] ??= []).push(e);
  const keys = Object.keys(byDay).sort().reverse();

  if (!keys.length) {
    wrap.innerHTML = emptyBlock("Записей пока нет", "");
    document.querySelector("#jFoot").textContent = "";
    return;
  }

  wrap.innerHTML = keys.map((d, di) => `
    <div class="j-day reveal" style="--i:${Math.min(di, 8)}">
      <div class="j-day-head">${d === t ? "Сегодня" : d === addD(t, -1) ? "Вчера" : cap(fmtDay.format(parseD(d)))}</div>
      ${byDay[d].map((e) => {
        const s = byId(e.sid);
        const su = e.surah ? S(e.surah) : null;
        const ic = EVI[e.type] || EVI.edit;
        return `<div class="j-entry">
          <span class="j-ico ${ic[0]}">${icon(ic[1], 13)}</span>
          <span class="j-text"><b>${esc(s?.name || "—")}</b> ${EV[e.type] || e.type}${su ? ` — <b>${su[0]}. ${esc(su[1])}</b>${e.from ? `, ${e.from === 1 && e.to === su[3] ? "целиком" : `аяты ${e.from}–${e.to}`}` : ""}` : ""}</span>
          <span class="j-time">${fmtTime.format(new Date(e.ts))}</span>
        </div>`;
      }).join("")}
    </div>`).join("");
  document.querySelector("#jFoot").textContent = `Записей: ${evs.length}`;
  document.querySelector("#jChips").innerHTML = jChipsHTML();
                         }

// Шапка: вкладки и правые кнопки.
import { store, isStaff, isOwner, isStudent, initials, roleLabel } from "./store.js";
import { totalDue, pendingRequests } from "./srs.js";
import { icon } from "./icons.js";
import { esc, $, fmtTime } from "./utils.js";

function tabsForRole() {
  if (isStudent()) return [
    ["today", "Сегодня", "calendar"], ["student", "Мой хифз", "book"],
    ["requests", "Заявки", "send"], ["journal", "Журнал", "book"],
  ];
  const t = [
    ["today", "Сегодня", "calendar"], ["students", "Ученицы", "users"],
    ["requests", "Заявки", "send"], ["journal", "Журнал", "book"], ["stats", "Статистика", "chart"],
  ];
  if (isOwner()) t.push(["team", "Команда", "shield"]);
  return t;
}

export function renderHeader() {
  if (store.screen !== "app") {
    $("#tabs").innerHTML = "";
    $("#topActions").innerHTML = `
      <button class="icon-btn" data-action="theme">${icon(store.prefs.theme === "dark" ? "sun" : "moon", 17)}</button>
      <button class="icon-btn ${store.prefs.sound ? "" : "off"}" data-action="sound">${icon(store.prefs.sound ? "vol" : "volx", 17)}</button>`;
    return;
  }

  $("#tabs").innerHTML = tabsForRole().map(([v, l, ic]) => {
    const active = store.ui.view === v || (v === "students" && store.ui.view === "student" && isStaff());
    const badge = v === "today" ? totalDue() : v === "requests" ? pendingRequests() : 0;
    return `<button class="tab ${active ? "active" : ""}" data-action="nav" data-view="${v}">
      ${icon(ic, 14)} ${l}${badge ? `<span class="tab-badge">${badge}</span>` : ""}</button>`;
  }).join("");

  $("#topActions").innerHTML = `
    <button class="chip-btn" data-action="open-sync"><span id="syncDot" class="dot ${store.sync.status}"></span><span id="syncText">Облако</span></button>
    <button class="account-chip" data-action="account">
      <span class="avatar sm">${esc(initials(store.member?.name))}</span>
      <span class="ac-name">${esc(store.member?.name || "")}</span>
      ${store.member ? `<span class="role-badge rb-${store.member.role}">${roleLabel(store.member.role)}</span>` : ""}
    </button>
    <button class="icon-btn" data-action="theme">${icon(store.prefs.theme === "dark" ? "sun" : "moon", 17)}</button>
    <button class="icon-btn ${store.prefs.sound ? "" : "off"}" data-action="sound">${icon(store.prefs.sound ? "vol" : "volx", 17)}</button>
    <div class="menu-wrap">
      <button class="icon-btn" data-action="data-menu">${icon("db", 17)}</button>
      <div id="dataMenu" class="menu hidden">
        <button class="menu-item" data-action="open-sync">${icon("cloud", 15)} Синхронизация</button>
        <button class="menu-item" data-action="export-json">${icon("download", 15)} Резервная копия</button>
        ${isStaff() ? `<button class="menu-item" data-action="import-json">${icon("upload", 15)} Загрузить копию</button>` : ""}
        <button class="menu-item" data-action="export-csv">${icon("download", 15)} Журнал CSV</button>
        ${isStaff() ? `<div class="menu-sep"></div><button class="menu-item danger" data-action="clear-all">${icon("trash", 15)} Очистить всё</button>` : ""}
      </div>
    </div>`;
  updateSyncUI();
}

export function updateSyncUI() {
  const labels = { syncing: "Сохранение…", synced: "Синхронизировано", error: "Ошибка связи" };
  const d = $("#syncDot"), t = $("#syncText");
  if (d) d.className = "dot " + store.sync.status;
  if (t) t.textContent = labels[store.sync.status] || "Облако";
  const line = $("#syncLine");
  if (line) line.innerHTML = `<span class="dot ${store.sync.status}"></span>${labels[store.sync.status] || "Облако"}${store.sync.last ? " · " + fmtTime.format(store.sync.last) : ""}`;
}

// ============================================================
// Переиспользуемые UI-кусочки: аватар, бейджи, строки, карта,
// тосты, drawer, модалки, тултипы.
// ============================================================

import { COLORS } from "./config.js";
import { S } from "./surahs.js";
import { store, isStaff, initials, roleLabel } from "./store.js";
import { esc, $, today, diffD, daysW, ayahsW, fmtDay, parseD, uid } from "./utils.js";
import { icon } from "./icons.js";

/* ---------- мелкие элементы ---------- */

export function avatar(s, size = "md") {
  const c = COLORS[(s.color || 0) % COLORS.length];
  return `<span class="avatar ${size}" style="background:linear-gradient(135deg,${c[0]},${c[1]})">${esc(initials(s.name))}</span>`;
}

export function roleBadge(r) {
  return `<span class="role-badge rb-${r}">${roleLabel(r)}</span>`;
}

export function dueBadge(p) {
  if (p.stage >= 7) return '<span class="badge b-green">закреплено</span>';
  const d = diffD(p.next, today());
  if (d < 0) return `<span class="badge b-red">просрочено · ${-d} ${daysW(-d)}</span>`;
  if (d === 0) return '<span class="badge b-amber">сегодня</span>';
  if (d === 1) return '<span class="badge b-blue">завтра</span>';
  return `<span class="badge b-blue">через ${d} ${daysW(d)}</span>`;
}

export function dots(stage) {
  let h = `<span class="dots ${stage >= 7 ? "mastered" : ""}" data-tip="Ступень: ${stage} из 7">`;
  for (let i = 0; i < 7; i++) h += `<i class="${i < stage ? "on" : ""}"></i>`;
  return h + "</span>";
}

export const statusText = (p) =>
  p.stage >= 7 ? "закреплено" : p.stage === 0 ? "новое" : "закрепляется";

export function rangeText(p) {
  const t = S(p.surah)[3];
  return p.from === 1 && p.to === t ? `целиком, ${t} ${ayahsW(t)}` : `аяты ${p.from}–${p.to}`;
}

export function streakChip(sid, streakFn) {
  const n = streakFn(sid);
  return n >= 2 ? `<span class="streak">${n} ${daysW(n)} подряд</span>` : "";
}

export function emptyBlock(title, text = "", btn = "") {
  return `<div class="card empty reveal">${icon("book", 42)}<h3>${title}</h3><p>${text}</p>${btn}</div>`;
}

export function surahOptions(sel) {
  return SURAHS_OPTIONS(sel);
}
function SURAHS_OPTIONS(sel) {
  // отдельная функция, чтобы не тянуть весь массив в каждый импорт
  return window.__surahOptions ? window.__surahOptions(sel) : "";
}

/* ---------- строка отрывка ---------- */

export function passageRow(p, i, ctx) {
  const s = S(p.surah);
  const sel = store.ui.selected.has(p.id);
  const staff = isStaff();
  const check = ctx === "today" && staff
    ? `<label class="row-check"><input type="checkbox" data-check="${p.id}" ${sel ? "checked" : ""}></label>`
    : "";
  return `<article class="p-row ${ctx === "detail" ? "reveal" : ""} ${sel ? "selected" : ""}" data-pid="${p.id}" style="--i:${Math.min(i, 10)}">
    ${check}
    <div class="p-main">
      <button class="p-title-btn" data-action="open-passage" data-id="${p.id}">
        <b>${s[0]}. ${esc(s[1])}</b><span class="ar" dir="rtl">${s[2]}</span>
      </button>
      <div class="p-range">${rangeText(p)} · сдано ${fmtDay.format(parseD(p.added))}</div>
      <div class="p-meta">${dueBadge(p)}${dots(p.stage)}<span class="p-status">${statusText(p)}</span></div>
      ${p.note ? `<div class="p-note">${esc(p.note)}</div>` : ""}
      ${p.errors ? `<div class="p-err">ошибок: ${p.errors}</div>` : ""}
    </div>
    <div class="p-actions">
      <button class="btn ghost sm" data-action="open-passage" data-id="${p.id}">${icon("pencil", 14)}</button>
      ${staff ? `
        <button class="btn ghost sm danger-text" data-action="delete-passage" data-id="${p.id}">Удалить</button>
        ${p.stage < 7 ? `<button class="btn primary sm" data-action="solid" data-id="${p.id}">${icon("check", 14)} Твёрдо</button>` : ""}
        <button class="btn outline-danger sm" data-action="errors" data-id="${p.id}">С ошибками</button>` : ""}
    </div>
  </article>`;
}

/* ---------- карта сур ---------- */

export function cellsHTML(sid, coverage) {
  const cov = coverage(sid);
  const t = today();
  const dm = {};
  for (const p of store.state.passages) {
    if (p.sid !== sid || p.stage >= 7) continue;
    const d = diffD(p.next, t);
    if (d < 0) dm[p.surah] = "over";
    else if (d === 0 && dm[p.surah] !== "over") dm[p.surah] = "due";
  }
  let h = "";
  for (let n = 1; n <= 114; n++) {
    const s = S(n);
    const c = cov[n];
    let cls = "c-none", mem = 0;
    if (c) { mem = c.count; cls = mem >= c.total ? "c-full" : "c-part"; }
    const ring = dm[n] === "over" ? "r-over" : dm[n] === "due" ? "r-due" : "";
    const tip = `${n}. ${s[1]} · ${s[2]}\nВыучено: ${mem} из ${s[3]}`;
    h += `<button class="cell ${cls} ${ring}" style="--i:${n}"
      ${isStaff() ? `data-action="map-cell" data-surah="${n}"` : ""}
      data-tip="${esc(tip)}">${n}</button>`;
  }
  return h;
}

export function legendHTML() {
  return `<div class="legend">
    <span class="lg-item"><span class="sw sw-full"></span>целиком</span>
    <span class="lg-item"><span class="sw sw-part"></span>частично</span>
    <span class="lg-item"><span class="sw sw-due"></span>повтор сегодня</span>
    <span class="lg-item"><span class="sw sw-over"></span>просрочено</span>
  </div>`;
}

export function statsHTML(st) {
  return `
    <div class="stat"><b data-count="${st.ayahs}">0</b><span>${ayahsW(st.ayahs)} · ${st.pct.toFixed(1)}% Корана</span></div>
    <div class="stat"><b data-count="${st.full}">0</b><span>сур целиком</span></div>
    <div class="stat ${st.due + st.over ? "warn" : ""}"><b data-count="${st.due + st.over}">0</b><span>к повтору</span></div>
    <div class="stat"><b data-count="${st.mastered}">0</b><span>закреплено</span></div>`;
}

/* ---------- тосты ---------- */

const toastActions = new Map();

export function toast(msg, o = {}) {
  const id = uid();
  const root = $("#toasts");
  const el = document.createElement("div");
  el.className = `toast t-${o.type || "success"}`;
  el.dataset.tid = id;
  el.innerHTML = `
    <span class="t-ico">${icon(o.type === "danger" ? "alert" : "check", 12)}</span>
    <span class="t-msg">${esc(msg)}</span>
    ${o.action ? `<button class="t-act" data-action="toast-act" data-tid="${id}">${esc(o.action)}</button>` : ""}
    <button class="t-x" data-action="toast-close" data-tid="${id}">${icon("x", 12)}</button>`;
  root.appendChild(el);
  if (o.onAction) toastActions.set(id, o.onAction);
  setTimeout(() => dismissToast(id), o.duration || 4200);
  while (root.children.length > 3) dismissToast(root.firstChild.dataset.tid);
}

export function dismissToast(id) {
  const el = document.querySelector(`.toast[data-tid="${id}"]`);
  toastActions.delete(id);
  if (!el) return;
  el.classList.add("out");
  setTimeout(() => el.remove(), 220);
}

export function runToastAction(id) {
  const cb = toastActions.get(id);
  dismissToast(id);
  cb?.();
}

/* ---------- drawer / modal ---------- */

export function openDrawer(html) {
  $("#drawerRoot").innerHTML =
    `<div class="drawer-back" data-action="drawer-close"><aside class="drawer">${html}</aside></div>`;
  setTimeout(() => $("#drawerRoot input, #drawerRoot select, #drawerRoot textarea")?.focus(), 60);
}
export const closeDrawer = () => { $("#drawerRoot").innerHTML = ""; };

export function openModal(html) {
  $("#modalRoot").innerHTML =
    `<div class="modal-back" data-action="modal-close"><div class="modal">${html}</div></div>`;
}
export const closeModal = () => { $("#modalRoot").innerHTML = ""; };

/* ---------- тултип ---------- */

const tipEl = () => $("#tooltip");
export function showTip(t) {
  const x = t.dataset.tip;
  if (!x) return;
  const el = tipEl();
  el.textContent = x;
  el.classList.add("show");
  const r = t.getBoundingClientRect();
  let l = Math.max(8, Math.min(r.left + r.width / 2 - el.offsetWidth / 2, innerWidth - el.offsetWidth - 8));
  let top = r.top - el.offsetHeight - 8;
  if (top < 8) top = r.bottom + 8;
  el.style.left = l + "px";
  el.style.top = top + "px";
}
export const hideTip = () => tipEl().classList.remove("show");

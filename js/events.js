// ============================================================
// Делегированные события: клики, формы, изменения, drag, клавиши.
// ============================================================

import { store, byId, pById, isStaff, isOwner, isStudent, savePrefs, groupsList } from "./store.js";
import * as api from "./api.js";
import * as actions from "./actions.js";
import { stats, coverage, streak } from "./srs.js";
import { S } from "./surahs.js";
import { icon } from "./icons.js";
import { Sound } from "./sound.js";
import { esc, $, $$, today, diffD, uid, bus, download, fmtTime, fmtDay, fmtFull, cap, dstr, ayahsW } from "./utils.js";
import {
  toast, runToastAction, dismissToast, openDrawer, closeDrawer, openModal, closeModal,
  showTip, hideTip, avatar, roleBadge, dueBadge, dots, rangeText, surahOptions,
} from "./components.js";
import { renderAll, renderView, refresh, go, updateBulkBar } from "./router.js";
import { renderHeader, updateSyncUI } from "./header.js";
import { studentsGridHTML, groupChipsHTML } from "./views/students.js";
import { renderPassageList, onSurahChange, prefillForm, updateDetail } from "./views/student.js";
import { renderJournalList } from "./views/journal.js";

/* ----------抽屉 (drawer)具体内容 ---------- */

function openStudentDrawer(id) {
  const s = id ? byId(id) : null;
  const colors = ["#1a6fd6", "#0d94b4", "#6a5ae0", "#1e8e52", "#b97708", "#cf3d3d", "#0ea5e9", "#64748b"];
  openDrawer(`<button class="drawer-x" data-action="drawer-close">${icon("x", 15)}</button>
    <h3>${s ? "Карточка ученицы" : "Новая ученица"}</h3>
    <form id="studentForm" data-id="${s?.id || ""}">
      <label class="field">Имя<input name="name" required maxlength="60" value="${esc(s?.name || "")}"></label>
      <label class="field">Группа<input name="group" list="groupList" maxlength="40" value="${esc(s?.group || "")}">
        <datalist id="groupList">${groupsList().map((g) => `<option value="${esc(g)}">`).join("")}</datalist></label>
      <label class="field">Заметка<textarea name="note" maxlength="240">${esc(s?.note || "")}</textarea></label>
      <div class="field"><span>Цвет</span><div class="color-row">
        ${colors.map((c, i) => `<label class="color-opt"><input type="radio" name="color" value="${i}" ${(s?.color || 0) === i ? "checked" : ""}><span style="background:${c}"></span></label>`).join("")}
      </div></div>
      <div class="drawer-actions">
        <button type="button" class="btn ghost" data-action="drawer-close">Отмена</button>
        <button class="btn primary" type="submit">${icon("save", 15)} ${s ? "Сохранить" : "Добавить"}</button>
      </div>
    </form>`);
}

function openPassageDrawer(id) {
  const p = pById(id);
  if (!p) return;
  const s = S(p.surah);
  const hist = [...(p.reviews || [])].sort((a, b) => (a.d < b.d ? 1 : -1));
  openDrawer(`<button class="drawer-x" data-action="drawer-close">${icon("x", 15)}</button>
    <h3>${s[0]}. ${esc(s[1])} <span class="ar" dir="rtl">${s[2]}</span></h3>
    <p class="drawer-note">${rangeText(p)} · сдано ${fmtDay.format(new Date(p.added + "T00:00:00"))}</p>
    <div class="p-meta" style="margin-bottom:14px">${dueBadge(p)}${dots(p.stage)}${p.errors ? `<span class="badge b-red">ошибок: ${p.errors}</span>` : ""}</div>
    ${isStaff() ? `<form id="passageForm" data-id="${p.id}">
      <div class="field-row">
        <label class="field">С аята<input name="from" type="number" min="1" max="${s[3]}" value="${p.from}"></label>
        <label class="field">По аят<input name="to" type="number" min="1" max="${s[3]}" value="${p.to}"></label>
      </div>
      <label class="field">Дата<input name="date" type="date" value="${p.added}" max="${today()}"></label>
      <label class="field">Заметка<textarea name="note" maxlength="240">${esc(p.note)}</textarea></label>
      <div class="f-msg" id="modalMsg"></div>
      <div class="drawer-actions">
        <button type="button" class="btn ghost danger-text" data-action="delete-passage" data-id="${p.id}">${icon("trash", 14)} Удалить</button>
        <button class="btn primary" type="submit">${icon("save", 15)} Сохранить</button>
      </div>
    </form>` : ""}
    <div class="drawer-section"><h4>История</h4><div class="history">
      ${hist.length ? hist.map((r) => `<div class="hist-row"><span class="j-ico ${r.r === "solid" ? "ji-solid" : "ji-errors"}">${icon(r.r === "solid" ? "check" : "alert", 12)}</span>${r.r === "solid" ? "Твёрдо" : "С ошибками"}<span class="hist-date">${fmtDay.format(new Date(r.d + "T00:00:00"))}</span></div>`).join("") : '<div class="empty-list" style="padding:14px">Повторений не было.</div>'}
    </div></div>`);
}

function openAccountDrawer() {
  openDrawer(`<button class="drawer-x" data-action="drawer-close">${icon("x", 15)}</button>
    <h3>Аккаунт</h3>
    <div class="db-account"><b>${esc(store.member?.name || "")} ${store.member ? roleBadge(store.member.role) : ""}</b>
      ${esc(store.member?.email || "")}${store.member?.student_id ? `<br>Карточка: ${esc(byId(store.member.student_id)?.name || store.member.student_id)}` : ""}</div>
    <form id="nameForm"><label class="field">Имя<input name="name" maxlength="60" value="${esc(store.member?.name || "")}"></label>
      <button class="btn primary block" type="submit">${icon("save", 15)} Сохранить</button></form>
    <div class="drawer-section"><button class="btn outline-danger block" data-action="signout">${icon("logout", 15)} Выйти</button></div>`);
}

function openSyncDrawer() {
  openDrawer(`<button class="drawer-x" data-action="drawer-close">${icon("x", 15)}</button>
    <h3>Синхронизация</h3>
    <div class="db-status" id="syncLine"><span class="dot ${store.sync.status}"></span>Облако</div>
    <div class="drawer-actions">
      <button class="btn soft" data-action="pull-cloud">${icon("refresh", 15)} Загрузить</button>
      ${isStaff() ? `<button class="btn primary" data-action="push-cloud">${icon("upload", 15)} Отправить</button>` : ""}
    </div>
    <div class="drawer-section"><h4>Данные</h4><div class="drawer-actions" style="justify-content:flex-start">
      <button class="btn soft" data-action="export-json">${icon("download", 14)} Копия</button>
      ${isStaff() ? `<button class="btn soft" data-action="import-json">${icon("upload", 14)} Загрузить</button>
      <button class="btn outline-danger" data-action="clear-all">Очистить</button>` : ""}
    </div></div>`);
  updateSyncUI();
}

function openViewDrawer() {
  openDrawer(`<button class="drawer-x" data-action="drawer-close">${icon("x", 15)}</button>
    <h3>Сохранить вид</h3>
    <form id="viewForm"><label class="field">Название<input name="name" required maxlength="40"></label>
      <div class="drawer-actions"><button type="button" class="btn ghost" data-action="drawer-close">Отмена</button>
      <button class="btn primary" type="submit">${icon("save", 15)} Сохранить</button></div></form>`);
}

function openClearConfirm() {
  openModal(`<h3>Очистить все данные?</h3><p>Сразу после можно нажать «Вернуть».</p>
    <div class="modal-actions"><button class="btn ghost" data-action="modal-close">Отмена</button>
    <button class="btn danger" data-action="confirm-clear">Очистить</button></div>`);
}

/* ---------- экспорт / отчёты ---------- */

function exportJSON() {
  download(JSON.stringify({ app: "hifz-journal", version: 7, exportedAt: new Date().toISOString(), state: store.state }, null, 2),
    `hifz-backup-${today()}.json`, "application/json");
  toast("Копия скачана");
}

function exportCSV() {
  const EV = { add: "сдача", solid: "твёрдо", errors: "ошибки", edit: "изменение", merge: "объединение", delete: "удаление" };
  const rows = [["Дата", "Время", "Ученица", "Группа", "Событие", "Сура", "Аяты"]];
  for (const e of [...store.state.events].sort((a, b) => (a.ts < b.ts ? -1 : 1))) {
    const s = byId(e.sid), d = new Date(e.ts);
    rows.push([dstr(d), fmtTime.format(d), s?.name || "—", s?.group || "—", EV[e.type] || e.type,
      e.surah ? `${e.surah}. ${S(e.surah)[1]}` : "", e.from ? `${e.from}–${e.to}` : ""]);
  }
  download("\uFEFF" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n"),
    `hifz-journal-${today()}.csv`, "text/csv;charset=utf-8");
  toast("CSV выгружен");
}

function studentReport(sid) {
  const s = byId(sid), st = stats(sid);
  const ps = store.state.passages.filter((p) => p.sid === sid).sort((a, b) => a.surah - b.surah);
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Отчёт — ${esc(s.name)}</title>
    <style>body{font-family:system-ui,sans-serif;color:#12263f;max-width:800px;margin:30px auto;padding:0 20px}
    table{width:100%;border-collapse:collapse;margin-top:16px}td,th{border:1px solid #dbe8f4;padding:8px;text-align:left;font-size:13px}
    th{background:#f6f9fd}.k{display:flex;gap:24px;margin:16px 0}.k div b{font-size:22px;display:block}</style></head>
    <body><h1>${esc(s.name)}</h1><p>${esc(s.group)} · ${cap(fmtFull.format(new Date()))}</p>
    <div class="k"><div><b>${st.ayahs}</b>аятов</div><div><b>${st.full}</b>сур</div><div><b>${st.due + st.over}</b>к повтору</div></div>
    <table><tr><th>Сура</th><th>Аяты</th><th>Сдано</th><th>Повтор</th><th>Ступень</th></tr>
    ${ps.map((p) => `<tr><td>${p.surah}. ${esc(S(p.surah)[1])}</td><td>${p.from}–${p.to}</td><td>${p.added}</td><td>${p.next || "закреплено"}</td><td>${p.stage}/7</td></tr>`).join("")}</table>
    <p style="margin-top:24px;font-size:11px;color:#92a8c0">by Synthetix Lab (kosh) with KoranVdom</p></body></html>`;
  download(html, `hifz-report-${today()}.html`, "text/html;charset=utf-8");
  toast("Отчёт скачан");
}

function importFile(input) {
  const file = input.files[0];
  input.value = "";
  if (!file || !isStaff()) return;
  file.text().then((txt) => {
    const data = JSON.parse(txt);
    actions.withUndo("Копия загружена", () => actions.importState(data), "info");
  }).catch(() => toast("Не удалось прочитать файл", { type: "danger" }));
}

/* ---------- заявки / команда ---------- */

async function approveRequest(id) {
  const r = store.requests.find((x) => x.id === id);
  if (!r || !isStaff()) return;
  const s = byId(r.student_id);
  if (!s) { toast("Карточка не найдена", { type: "danger" }); return; }
  const res = actions.addPassageData(s.id, r.surah, r.from_ayah, r.to_ayah, today(), r.note || "");
  if (!res.ok) { toast(res.msg, { type: "info" }); return; }
  actions.persist();
  try {
    await api.rpc("hifz_resolve_request", { req: id, approve: true });
    await api.loadRequests();
    renderAll();
    toast("Заявка принята");
    Sound.play("ok");
  } catch (e) { toast(api.humanError(e), { type: "danger" }); }
}

async function rejectRequest(id) {
  try {
    await api.rpc("hifz_resolve_request", { req: id, approve: false });
    await api.loadRequests();
    renderAll();
    toast("Заявка отклонена", { type: "info" });
  } catch (e) { toast(api.humanError(e), { type: "danger" }); }
}

async function saveMember(uid) {
  const roleSel = document.querySelector(`[data-member-role="${uid}"]`);
  const linkSel = document.querySelector(`[data-member-link="${uid}"]`);
  const newRole = roleSel.value;
  const link = newRole === "student" ? (linkSel.value || null) : null;
  try {
    const { error } = await api.rpc("hifz_set_role", { target: uid, new_role: newRole, link_student: link });
    if (error) throw error;
    await api.loadTeam();
    renderAll();
    toast("Роль обновлена");
    Sound.play("ok");
  } catch (e) { toast(api.humanError(e), { type: "danger" }); }
}

/* ---------- клик ---------- */

document.addEventListener("click", async (e) => {
  if (!e.target.closest(".menu-wrap")) $("#dataMenu")?.classList.add("hidden");
  const t = e.target.closest("[data-action]");
  if (!t) return;
  const a = t.dataset.action, id = t.dataset.id;
  try {
    switch (a) {
      case "home": if (store.screen === "app") go("today"); break;
      case "nav": go(t.dataset.view); Sound.play("open"); break;
      case "theme": store.prefs.theme = store.prefs.theme === "dark" ? "light" : "dark"; savePrefs(); renderAll(); break;
      case "sound": store.prefs.sound = !store.prefs.sound; savePrefs(); Sound.setEnabled(store.prefs.sound); renderHeader(); if (store.prefs.sound) Sound.play("open"); break;
      case "auth-mode": store.ui.authMode = t.dataset.mode; renderView(); break;
      case "google-login": await api.signInGoogle(); break;
      case "signout": closeDrawer(); await api.signOut(); break;
      case "account": openAccountDrawer(); break;
      case "open-sync": openSyncDrawer(); break;
      case "data-menu": $("#dataMenu").classList.toggle("hidden"); break;
      case "copy-invite": await navigator.clipboard.writeText(t.dataset.code); toast("Код скопирован"); break;
      case "pull-cloud": await api.pullState(); toast("Загружено из облака"); break;
      case "push-cloud": await api.pushState(); toast("Отправлено в облако"); break;
      case "export-json": exportJSON(); break;
      case "import-json": $("#importFile").click(); break;
      case "export-csv": exportCSV(); break;
      case "student-report": studentReport(id); break;
      case "clear-all": openClearConfirm(); break;
      case "confirm-clear": closeModal(); actions.clearAll(); go("today"); break;
      case "drawer-close": if (t.classList.contains("drawer-back") && e.target !== t) break; closeDrawer(); break;
      case "modal-close": if (t.classList.contains("modal-back") && e.target !== t) break; closeModal(); break;
      case "open-student": go("student", id); break;
      case "back-students": go("students"); break;
      case "add-student": openStudentDrawer(); break;
      case "edit-student": openStudentDrawer(id); break;
      case "delete-student": actions.deleteStudent(id); break;
      case "archive-student": actions.archiveStudent(id); break;
      case "map-cell": prefillForm(+t.dataset.surah, true); Sound.play("tap"); break;
      case "open-passage": openPassageDrawer(id); break;
      case "delete-passage": actions.deletePassage(id); closeDrawer(); break;
      case "solid": actions.review(id, "solid"); break;
      case "errors": actions.review(id, "errors"); break;
      case "bulk-solid": actions.bulkReview(store.state.passages.filter((p) => p.sid === id && p.stage < 7 && diffD(p.next, today()) <= 0).map((p) => p.id), "solid"); break;
      case "bulk-bar-solid": actions.bulkReview([...store.ui.selected], "solid"); break;
      case "bulk-bar-errors": actions.bulkReview([...store.ui.selected], "errors"); break;
      case "bulk-bar-clear": store.ui.selected.clear(); renderView(); break;
      case "pfilter": store.ui.ps = t.dataset.val; renderPassageList(); break;
      case "gfilter": store.ui.sg = t.dataset.val; $("#groupChips").innerHTML = groupChipsHTML(); $("#studentsGrid").innerHTML = studentsGridHTML(); break;
      case "toggle-arch": store.ui.arch = !store.ui.arch; renderView(); break;
      case "jfilter": store.ui.jt = t.dataset.val; renderJournalList(); break;
      case "rfilter": store.ui.rs = t.dataset.val; renderView(); break;
      case "go-add": if (isStudent()) go("requests"); else if (store.ui.studentId && byId(store.ui.studentId)) go("student", store.ui.studentId); else go("students"); break;
      case "save-view": openViewDrawer(); break;
      case "apply-view": { const v = store.state.views.find((x) => x.id === id); if (v) { store.ui.sq = v.q; store.ui.sg = v.group; store.ui.ss = v.sort; store.ui.arch = !!v.arch; renderView(); } break; }
      case "delete-view": actions.withUndo("Вид удалён", () => { store.state.views = store.state.views.filter((v) => v.id !== id); }, "info"); break;
      case "refresh-requests": await api.loadRequests(); renderAll(); break;
      case "approve-request": await approveRequest(id); break;
      case "reject-request": await rejectRequest(id); break;
      case "refresh-team": await api.loadTeam(); renderAll(); break;
      case "save-member": await saveMember(id); break;
      case "revoke-invite": await api.rpc("hifz_revoke_invite", { inv_code: t.dataset.code }); await api.loadTeam(); renderAll(); toast("Приглашение отозвано", { type: "info" }); break;
      case "toast-act": runToastAction(t.dataset.tid); break;
      case "toast-close": dismissToast(t.dataset.tid); break;
    }
  } catch (err) { toast(api.humanError(err), { type: "danger" }); Sound.play("err"); }
});

/* ---------- формы ---------- */

document.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  try {
    if (f.id === "authForm") {
      const F = f.elements, reg = store.ui.authMode === "signup", msg = $("#authMsg");
      msg.textContent = "";
      const btn = f.querySelector('button[type="submit"]'); btn.disabled = true;
      try {
        if (reg) await api.signUp(F.email.value.trim(), F.password.value, F.name.value.trim() || "Участник", F.invite?.value.trim());
        else await api.signIn(F.email.value.trim(), F.password.value);
      } finally { btn.disabled = false; }
    }
    else if (f.id === "studentForm") {
      const F = f.elements, name = F.name.value.trim(), group = F.group.value.trim() || "Без группы",
        note = F.note.value.trim(), color = +F.color.value || 0, id = f.dataset.id;
      if (!name) return;
      if (id) {
        const s = byId(id);
        if (s) Object.assign(s, { name, group, note, color });
        actions.persist(); closeDrawer(); refresh(); toast("Сохранено");
      } else {
        const s = { id: uid(), name, group, note, color, archived: false, created: today() };
        store.state.students.push(s);
        actions.persist(); closeDrawer(); go("student", s.id); toast("Ученица добавлена");
      }
      Sound.play("save");
    }
    else if (f.id === "newPassageForm") {
      const F = f.elements, sid = store.ui.studentId, n = +F.surah.value,
        from = parseInt(F.from.value, 10),
        to = F.to.value.trim() === "" ? S(n)[3] : parseInt(F.to.value, 10),
        date = F.date.value || today(), note = F.note.value.trim(), msg = $("#formMsg");
      const err = actions.validateRange(n, from, to, date);
      if (err) { msg.textContent = err; f.classList.add("shake"); setTimeout(() => f.classList.remove("shake"), 420); Sound.play("err"); return; }
      let res;
      actions.withUndo("", () => { res = actions.addPassageData(sid, n, from, to, date, note); if (!res.ok) throw new Error(res.msg); }, "success");
      toast(res?.msg || "Сдача записана");
      F.note.value = ""; F.date.value = today(); prefillForm(n, false); Sound.play("save");
    }
    else if (f.id === "passageForm") {
      const p = pById(f.dataset.id); if (!p) return;
      const total = S(p.surah)[3], from = parseInt(f.elements.from.value, 10), to = parseInt(f.elements.to.value, 10),
        date = f.elements.date.value || p.added, note = f.elements.note.value.trim(), msg = $("#modalMsg");
      if (isNaN(from) || isNaN(to) || from < 1 || to > total || from > to) { msg.textContent = `Диапазон: 1–${total}.`; return; }
      if (date > today()) { msg.textContent = "Дата не может быть в будущем."; return; }
      actions.withUndo("Отрывок изменён", () => {
        p.from = from; p.to = to; p.added = date; p.note = note;
        if (p.stage === 0) p.next = date; // пересчёт ниже
        p.next = p.stage === 0 ? new Date(new Date(date).getTime() + 864e5).toISOString().slice(0, 10) : p.next;
      });
      closeDrawer(); Sound.play("save");
    }
    else if (f.id === "viewForm") {
      const name = f.elements.name.value.trim();
      if (name) {
        store.state.views.push({ id: uid(), name, q: store.ui.sq, group: store.ui.sg, sort: store.ui.ss, arch: store.ui.arch });
        actions.persist(); closeDrawer(); renderView(); toast("Вид сохранён");
      }
    }
    else if (f.id === "requestForm") {
      if (!isStudent()) return;
      const F = f.elements, n = +F.surah.value, total = S(n)[3],
        from = parseInt(F.from.value, 10), to = F.to.value.trim() === "" ? total : parseInt(F.to.value, 10),
        note = F.note.value.trim(), msg = $("#requestMsg");
      if (isNaN(from) || isNaN(to) || from < 1 || to > total || from > to) { msg.textContent = `Диапазон: 1–${total}.`; return; }
      const { error } = await api.rpc("hifz_submit_request", { p_surah: n, p_from: from, p_to: to, p_note: note || null });
      if (error) throw error;
      await api.loadRequests(); renderAll(); toast("Заявка отправлена"); Sound.play("save"); f.reset();
    }
    else if (f.id === "inviteForm") {
      const F = f.elements;
      const { data, error } = await api.rpc("hifz_create_invite", { inv_role: F.role.value, link_student: F.student.value || null, inv_note: F.note.value.trim() || null });
      if (error) throw error;
      await api.loadTeam(); renderAll(); toast(`Код: ${data}`, { duration: 8000 }); Sound.play("save");
    }
    else if (f.id === "nameForm") {
      const { error } = await api.rpc("hifz_set_name", { new_name: f.elements.name.value.trim() });
      if (error) throw error;
      store.member.name = f.elements.name.value.trim(); closeDrawer(); renderAll(); toast("Имя сохранено");
    }
  } catch (err) {
    const m = f.querySelector(".f-msg");
    if (m) m.textContent = api.humanError(err);
    else toast(api.humanError(err), { type: "danger" });
    Sound.play("err");
  }
});

/* ---------- изменения / ввод ---------- */

document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.id === "studentSort") { store.ui.ss = t.value; renderView(); }
  else if (t.id === "passageSort") { store.ui.po = t.value; renderPassageList(); }
  else if (t.id === "journalStudent") { store.ui.js = t.value; renderJournalList(); }
  else if (t.id === "npSurah") onSurahChange(true);
  else if (t.id === "importFile") importFile(t);
  else if (t.dataset.check) {
    t.checked ? store.ui.selected.add(t.dataset.check) : store.ui.selected.delete(t.dataset.check);
    t.closest(".p-row")?.classList.toggle("selected", t.checked);
    updateBulkBar();
  }
  else if (t.dataset.checkGroup) {
    store.state.passages
      .filter((p) => p.sid === t.dataset.checkGroup && p.stage < 7 && diffD(p.next, today()) <= 0)
      .forEach((p) => (t.checked ? store.ui.selected.add(p.id) : store.ui.selected.delete(p.id)));
    renderView();
  }
  else if (t.dataset.memberRole) {
    const link = document.querySelector(`[data-member-link="${t.dataset.memberRole}"]`);
    if (link) link.disabled = t.value !== "student";
  }
});

document.addEventListener("input", (e) => {
  if (e.target.id === "studentSearch") {
    store.ui.sq = e.target.value;
    $("#studentsGrid").innerHTML = studentsGridHTML();
  }
});

/* ---------- клавиши / тултипы / фокус ---------- */

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeDrawer(); closeModal(); $("#dataMenu")?.classList.add("hidden"); hideTip(); }
  if ((e.key === "Enter" || e.key === " ") && e.target.classList?.contains("student-card")) {
    e.preventDefault(); go("student", e.target.dataset.id);
  }
});
document.addEventListener("mouseover", (e) => { const t = e.target.closest("[data-tip]"); if (t) showTip(t); });
document.addEventListener("mouseout", (e) => { if (e.target.closest("[data-tip]")) hideTip(); });
document.addEventListener("focusin", (e) => { const t = e.target.closest("[data-tip]"); if (t) showTip(t); });
document.addEventListener("focusout", hideTip);
addEventListener("scroll", hideTip, { passive: true });
addEventListener("focus", () => { if (api.getClient() && store.member) { api.pullState().catch(() => {}); api.loadRequests().catch(() => {}); } });

/* ---------- drag-and-drop порядок ---------- */

document.addEventListener("dragstart", (e) => {
  const c = e.target.closest(".student-card");
  if (!c || store.ui.ss !== "manual") return;
  store.ui.dragId = c.dataset.id; c.classList.add("dragging");
  e.dataTransfer.setData("text/plain", store.ui.dragId);
});
document.addEventListener("dragover", (e) => {
  const c = e.target.closest(".student-card");
  if (!c || !store.ui.dragId || c.dataset.id === store.ui.dragId) return;
  e.preventDefault(); c.classList.add("drag-over");
});
document.addEventListener("dragleave", (e) => e.target.closest(".student-card")?.classList.remove("drag-over"));
document.addEventListener("drop", (e) => {
  const c = e.target.closest(".student-card");
  if (!c || !store.ui.dragId) return;
  e.preventDefault();
  const from = store.state.students.findIndex((s) => s.id === store.ui.dragId);
  const to = store.state.students.findIndex((s) => s.id === c.dataset.id);
  if (from > -1 && to > -1 && from !== to) {
    const [m] = store.state.students.splice(from, 1);
    store.state.students.splice(to, 0, m);
    actions.persist();
    $("#studentsGrid").innerHTML = studentsGridHTML();
    toast("Порядок сохранён", { duration: 1800 });
  }
  store.ui.dragId = null;
});
document.addEventListener("dragend", () => {
  store.ui.dragId = null;
  $$(".dragging,.drag-over").forEach((x) => x.classList.remove("dragging", "drag-over"));
});

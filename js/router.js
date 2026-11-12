// Рендер и навигация.
import { store, isStaff, isOwner, isStudent, byId, activeStudents, savePrefs } from "./store.js";
import { renderHeader } from "./header.js";
import { loadTeam, loadRequests } from "./api.js";
import { reducedMotion, $, bus } from "./utils.js";
import { Sound } from "./sound.js";

import { viewAuth, loadingView } from "./views/auth.js";
import { viewToday } from "./views/today.js";
import { viewStudents } from "./views/students.js";
import { viewStudent, renderPassageList, onSurahChange } from "./views/student.js";
import { viewJournal, renderJournalList } from "./views/journal.js";
import { viewStats } from "./views/stats.js";
import { viewRequests } from "./views/requests.js";
import { viewTeam } from "./views/team.js";

export function applyTheme() {
  document.documentElement.dataset.theme = store.prefs.theme;
  document.querySelector('meta[name="theme-color"]').content =
    store.prefs.theme === "dark" ? "#0b1119" : "#f4f8fd";
}

export function renderView() {
  const m = $("#main");
  if (store.screen === "loading") { m.innerHTML = loadingView(); return; }
  if (store.screen === "auth") { m.innerHTML = viewAuth(); return; }

  if (store.ui.view === "student" && isStudent()) store.ui.studentId = store.member.student_id;
  if (store.ui.view === "student" && !byId(store.ui.studentId)) store.ui.view = isStudent() ? "today" : "students";
  if (store.ui.view === "team" && !isOwner()) store.ui.view = "today";
  if (store.ui.view === "students" && !isStaff()) store.ui.view = "today";

  switch (store.ui.view) {
    case "today": m.innerHTML = viewToday(); break;
    case "students": m.innerHTML = viewStudents(); $("#studentSort").value = store.ui.ss; break;
    case "student":
      m.innerHTML = viewStudent(store.ui.studentId);
      $("#passageSort").value = store.ui.po;
      onSurahChange(true); renderPassageList(); break;
    case "journal":
      m.innerHTML = viewJournal();
      if ($("#journalStudent")) $("#journalStudent").value = store.ui.js;
      renderJournalList(); break;
    case "stats": m.innerHTML = viewStats(); break;
    case "requests": m.innerHTML = viewRequests(); break;
    case "team": m.innerHTML = viewTeam(); break;
    default: store.ui.view = "today"; m.innerHTML = viewToday();
  }
  countUps(m);
  updateBulkBar();
}

export function renderAll() {
  applyTheme();
  renderHeader();
  renderView();
}

export function refresh() {
  renderHeader();
  if (store.ui.view === "student" && byId(store.ui.studentId) && $("#detailRoot")) {
    // частичное обновление карточки
    import("./views/student.js").then((m) => m.updateDetail());
  } else {
    renderView();
  }
}

export function go(view, id) {
  store.ui.view = view;
  if (id) store.ui.studentId = id;
  store.ui.selected.clear();
  if (view === "student") {
    if (isStudent()) store.ui.studentId = store.member.student_id;
    if (!store.ui.studentId) store.ui.studentId = activeStudents()[0]?.id;
    store.ui.ps = "all"; store.ui.po = "new";
  }
  if (view === "team") loadTeam().then(renderAll).catch(() => {});
  if (view === "requests") loadRequests().then(renderAll).catch(() => {});
  renderHeader();
  renderView();
  window.scrollTo(0, 0);
}

export function countUps(root) {
  root.querySelectorAll("[data-count]").forEach((el) => {
    const to = parseFloat(el.dataset.count) || 0;
    const dec = !!el.dataset.dec;
    if (reducedMotion) { el.textContent = dec ? to.toFixed(1) : Math.round(to); return; }
    const st = performance.now();
    (function step(now) {
      const k = Math.min(1, (now - st) / 650);
      const v = to * (1 - Math.pow(1 - k, 3));
      el.textContent = dec ? v.toFixed(1) : Math.round(v);
      if (k < 1) requestAnimationFrame(step);
    })(st);
  });
}

export function updateBulkBar() {
  const n = store.ui.selected.size;
  const bar = $("#bulkBar");
  $("#bulkCount").textContent = `Выбрано: ${n}`;
  bar.classList.toggle("hidden", !n || store.ui.view !== "today" || !isStaff());
      }

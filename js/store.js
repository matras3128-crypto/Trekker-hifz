// ============================================================
// Единое хранилище состояния + локальная persistence.
// ============================================================

import { PREF_KEY, DATA_PREFIX, APP_VERSION } from "./config.js";
import { uid } from "./utils.js";

function loadPrefs() {
  try {
    return { theme: "light", sound: true, ...JSON.parse(localStorage.getItem(PREF_KEY) || "{}") };
  } catch {
    return { theme: "light", sound: true };
  }
}

export function freshState() {
  return {
    students: [],
    passages: [],
    events: [],
    views: [],
    meta: { version: APP_VERSION, updatedAt: null },
  };
}

export const store = {
  screen: "loading",          // loading | auth | app
  prefs: loadPrefs(),
  member: null,               // профиль из hifz_members
  session: null,
  cacheKey: null,
  state: freshState(),
  requests: [],
  team: [],
  invites: [],
  sync: { status: "syncing", last: null, dirty: false, timer: null, rev: null },
  ui: {
    view: "today",
    studentId: null,
    sq: "", sg: "all", ss: "name", arch: false,
    ps: "all", po: "new",
    js: "all", jt: "all",
    rs: "pending",
    selected: new Set(),
    dragId: null,
    authMode: "signin",
  },
};

/* ---------- persistence ---------- */

export function savePrefs() {
  localStorage.setItem(PREF_KEY, JSON.stringify(store.prefs));
}

export function loadCache() {
  try {
    const s = JSON.parse(localStorage.getItem(store.cacheKey));
    return validState(s) ? normalize(s) : null;
  } catch {
    return null;
  }
}

export function writeCache() {
  if (store.cacheKey) {
    try { localStorage.setItem(store.cacheKey, JSON.stringify(store.state)); } catch {}
  }
}

export function validState(s) {
  return (
    s &&
    Array.isArray(s.students) &&
    Array.isArray(s.passages) &&
    Array.isArray(s.events) &&
    s.students.every((x) => x?.id && x.name) &&
    s.passages.every((p) => p?.id && p.sid && p.surah >= 1 && p.surah <= 114 && p.from >= 1 && p.to >= p.from)
  );
}

export function normalize(s) {
  const f = freshState();
  return {
    ...f,
    ...s,
    views: Array.isArray(s.views) ? s.views : [],
    meta: { ...f.meta, ...(s.meta || {}) },
    students: (s.students || []).map((x) => ({ archived: false, note: "", color: 0, ...x })),
    passages: (s.passages || []).map((p) => ({ note: "", stage: 0, errors: 0, reviews: [], ...p })),
  };
}

// Данные, которые уходят в облако.
export function payload() {
  return {
    students: store.state.students,
    passages: store.state.passages,
    events: store.state.events,
    views: store.state.views,
    meta: { version: APP_VERSION },
  };
}

export function logEvent(sid, type, p) {
  store.state.events.push({
    id: uid(),
    ts: new Date().toISOString(),
    sid,
    type,
    surah: p?.surah || null,
    from: p?.from || null,
    to: p?.to || null,
  });
}

/* ---------- селекторы ---------- */

export const isStaff = () => store.member && ["owner", "teacher"].includes(store.member.role);
export const isOwner = () => store.member?.role === "owner";
export const isStudent = () => store.member?.role === "student";

export const byId = (id) => store.state.students.find((s) => s.id === id);
export const pById = (id) => store.state.passages.find((p) => p.id === id);
export const activeStudents = () => store.state.students.filter((s) => !s.archived);
export const groupsList = () =>
  [...new Set(store.state.students.map((s) => s.group))].sort((a, b) => a.localeCompare(b, "ru"));

export function roleLabel(r) {
  return r === "owner" ? "Владелец" : r === "teacher" ? "Учитель" : "Ученица";
}

export function initials(name) {
  return (
    String(name || "")
      .split(/\s+/)
      .filter((w) => /[а-яёa-z0-9]/i.test(w[0] || ""))
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "—"
  );
      }

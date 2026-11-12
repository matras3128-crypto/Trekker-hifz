// ============================================================
// Утилиты: DOM, даты, склонения, форматирование, шина событий.
// ============================================================

export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => [...document.querySelectorAll(sel)];

// Экранирование пользовательского текста перед вставкой в HTML.
export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const clone = (o) => JSON.parse(JSON.stringify(o));

export const pad = (n) => String(n).padStart(2, "0");

export const dstr = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const today = () => dstr(new Date());

export const parseD = (s) => new Date(s + "T00:00:00Z");

export const addD = (s, n) => {
  const d = parseD(s);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const diffD = (a, b) =>
  Math.round((parseD(a) - parseD(b)) / 864e5);

// Склонение: plural(5, ["день","дня","дней"]) -> "дней"
export const plural = (n, forms) => {
  const m = Math.abs(n) % 100;
  const k = m % 10;
  if (m > 10 && m < 20) return forms[2];
  if (k > 1 && k < 5) return forms[1];
  if (k === 1) return forms[0];
  return forms[2];
};

export const daysW = (n) => plural(n, ["день", "дня", "дней"]);
export const ayahsW = (n) => plural(n, ["аят", "аята", "аятов"]);
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const fmtFull = new Intl.DateTimeFormat("ru-RU", {
  weekday: "long", day: "numeric", month: "long",
});
export const fmtDay = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric", month: "long",
});
export const fmtWd = new Intl.DateTimeFormat("ru-RU", { weekday: "short" });
export const fmtTime = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit", minute: "2-digit",
});

export const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Простая шина событий, чтобы модули не зависели друг от друга циклически.
const listeners = {};
export const bus = {
  on(event, fn) {
    (listeners[event] ??= []).push(fn);
  },
  emit(event, data) {
    (listeners[event] || []).forEach((fn) => fn(data));
  },
};

// Скачивание файла.
export function download(content, name, mime) {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

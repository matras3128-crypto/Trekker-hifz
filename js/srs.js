// ============================================================
// Логика интервального повторения и производные метрики.
// ============================================================

import { INTERVALS, TOTAL_AYAHS } from "./config.js";
import { S } from "./surahs.js";
import { store } from "./store.js";
import { today, addD, diffD, dstr } from "./utils.js";

// Покрытие суры: объединённые диапазоны выученных аятов.
export function coverage(sid) {
  const map = {};
  for (const p of store.state.passages) {
    if (p.sid === sid) (map[p.surah] ??= []).push([p.from, p.to]);
  }
  const out = {};
  for (const k in map) {
    const rs = map[k].sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const r of rs) {
      const last = merged[merged.length - 1];
      if (last && r[0] <= last[1] + 1) last[1] = Math.max(last[1], r[1]);
      else merged.push([r[0], r[1]]);
    }
    out[k] = {
      ranges: merged,
      count: merged.reduce((a, r) => a + r[1] - r[0] + 1, 0),
      total: S(+k)[3],
    };
  }
  return out;
}

export function stats(sid) {
  const cov = coverage(sid);
  let ayahs = 0, full = 0, due = 0, over = 0, mastered = 0, count = 0;
  const t = today();
  for (const k in cov) {
    ayahs += cov[k].count;
    if (cov[k].count >= cov[k].total) full++;
  }
  for (const p of store.state.passages) {
    if (p.sid !== sid) continue;
    count++;
    if (p.stage >= 7) { mastered++; continue; }
    const d = diffD(p.next, t);
    if (d < 0) over++;
    else if (d === 0) due++;
  }
  return { ayahs, pct: (ayahs / TOTAL_AYAHS) * 100, full, due, over, mastered, cov, count };
}

export function totalDue() {
  const t = today();
  let n = 0;
  for (const p of store.state.passages) {
    const s = store.state.students.find((x) => x.id === p.sid);
    if (!s || s.archived) continue;
    if (p.stage < 7 && diffD(p.next, t) <= 0) n++;
  }
  return n;
}

export const pendingRequests = () => store.requests.filter((r) => r.status === "pending").length;

export function streak(sid) {
  const set = new Set(
    store.state.events
      .filter((e) => e.sid === sid && ["solid", "errors"].includes(e.type))
      .map((e) => dstr(new Date(e.ts)))
  );
  let n = 0, d = today();
  if (!set.has(d)) d = addD(d, -1);
  while (set.has(d)) { n++; d = addD(d, -1); }
  return n;
}

export function nextGap(sid, surah) {
  const c = coverage(sid)[surah];
  if (!c) return 1;
  const set = new Set();
  c.ranges.forEach((r) => { for (let i = r[0]; i <= r[1]; i++) set.add(i); });
  for (let i = 1; i <= c.total; i++) if (!set.has(i)) return i;
  return 1;
}

// Применить результат повторения к отрывку (мутирует объект).
export function applyReview(p, result) {
  const t = today();
  p.reviews.push({ d: t, r: result });
  if (result === "solid") {
    p.stage = Math.min(7, p.stage + 1);
    p.next = p.stage >= 7 ? null : addD(t, INTERVALS[p.stage]);
  } else {
    p.stage = 0;
    p.errors++;
    p.next = addD(t, 1);
  }
}

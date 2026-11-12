// ============================================================
// Мутации данных: CRUD, повторения, отмена (undo).
// ============================================================

import { store, byId, pById, isStaff, writeCache, logEvent, normalize } from "./store.js";
import { applyReview } from "./srs.js";
import { schedulePush } from "./api.js";
import { today, addD, diffD, uid, clone, bus } from "./utils.js";
import { toast } from "./components.js";
import { Sound } from "./sound.js";
import { S } from "./surahs.js";
import { ayahsW } from "./utils.js";

// Сохранить локально + поставить в очередь отправку в облако.
export function persist() {
  if (!isStaff()) return;
  store.state.meta.updatedAt = new Date().toISOString();
  writeCache();
  schedulePush();
}

// Обёртка с возможностью отмены.
export function withUndo(label, fn, type = "success") {
  if (!isStaff()) { toast("Доступно только учителю", { type: "info" }); return; }
  const snap = clone({
    students: store.state.students,
    passages: store.state.passages,
    events: store.state.events,
    views: store.state.views,
  });
  fn();
  persist();
  bus.emit("render");
  if (label) {
    toast(label, {
      type, action: "Вернуть", duration: 6500,
      onAction: () => {
        Object.assign(store.state, snap);
        persist();
        bus.emit("render");
        toast("Отменено", { type: "info" });
        Sound.play("undo");
      },
    });
  }
}

// Добавить сдачу с учётом объединения пересекающихся диапазонов.
export function addPassageData(sid, surah, from, to, date, note) {
  const ov = store.state.passages.filter(
    (p) => p.sid === sid && p.surah === surah && p.from <= to && p.to >= from
  );
  if (ov.length) {
    const nf = Math.min(from, ...ov.map((p) => p.from));
    const nt = Math.max(to, ...ov.map((p) => p.to));
    const base = [...ov].sort((a, b) => (a.added < b.added ? -1 : 1))[0];
    if (ov.length === 1 && base.from === nf && base.to === nt) {
      return { ok: false, msg: "Диапазон уже записан" };
    }
    base.from = nf; base.to = nt;
    if (note) base.note = (base.note ? base.note + "; " : "") + note;
    store.state.passages = store.state.passages.filter((p) => !ov.includes(p) || p.id === base.id);
    logEvent(sid, "merge", base);
    return { ok: true, msg: "Диапазон объединён" };
  }
  const p = {
    id: uid(), sid, surah, from, to, added: date, note,
    stage: 0, errors: 0, reviews: [], next: addD(date, 1),
  };
  store.state.passages.push(p);
  logEvent(sid, "add", p);
  return { ok: true, msg: "Сдача записана" };
}

export function review(pid, result) {
  const p = pById(pid);
  if (!p || !isStaff() || (result === "solid" && p.stage >= 7)) return;
  withUndo(
    result === "solid" ? "Повтор отмечен" : "С ошибками — повтор завтра",
    () => { applyReview(p, result); logEvent(p.sid, result, p); },
    result === "solid" ? "success" : "info"
  );
  Sound.play(result === "solid" ? "ok" : "err");
  document.querySelector(`[data-pid="${pid}"]`)?.classList.add("flash");
}

export function bulkReview(ids, result) {
  const ps = ids.map(pById).filter(Boolean).filter((p) => result === "errors" || p.stage < 7);
  if (!ps.length || !isStaff()) return;
  withUndo(
    `Отмечено: ${ps.length}`,
    () => { for (const p of ps) { applyReview(p, result); logEvent(p.sid, result, p); } },
    result === "solid" ? "success" : "info"
  );
  store.ui.selected.clear();
  Sound.play(result === "solid" ? "ok" : "err");
}

export function deletePassage(pid) {
  const p = pById(pid);
  if (!p) return;
  withUndo("Отрывок удалён", () => {
    logEvent(p.sid, "delete", p);
    store.state.passages = store.state.passages.filter((x) => x.id !== pid);
  }, "info");
  Sound.play("tap");
}

export function deleteStudent(sid) {
  const s = byId(sid);
  if (!s) return;
  withUndo(`Ученица «${s.name}» удалена`, () => {
    store.state.students = store.state.students.filter((x) => x.id !== sid);
    store.state.passages = store.state.passages.filter((p) => p.sid !== sid);
    store.state.events = store.state.events.filter((e) => e.sid !== sid);
  }, "info");
  Sound.play("tap");
}

export function archiveStudent(sid) {
  const s = byId(sid);
  if (!s) return;
  withUndo(s.archived ? "Ученица возвращена" : "Ученица в архиве", () => {
    s.archived = !s.archived;
  }, "info");
  Sound.play("tap");
}

export function clearAll() {
  withUndo("Все данные очищены", () => {
    store.state.students = [];
    store.state.passages = [];
    store.state.events = [];
    store.state.views = [];
  }, "info");
}

export function importState(raw) {
  const s = raw.state || raw;
  store.state = normalize(s);
  persist();
  bus.emit("render");
}

// Валидация диапазона для формы.
export function validateRange(surah, from, to, date) {
  const total = S(surah)[3];
  if (isNaN(from) || from < 1) return "Укажите начальный аят.";
  if (isNaN(to) || to < 1) return "Укажите конечный аят.";
  if (from > total || to > total) return `В суре ${total} ${ayahsW(total)}.`;
  if (from > to) return "Начальный аят больше конечного.";
  if (date > today()) return "Дата не может быть в будущем.";
  return "";
             }

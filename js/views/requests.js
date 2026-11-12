// Экран «Заявки»: ученица отправляет, учитель принимает.
import { store, isStudent, isStaff, byId } from "../store.js";
import { pendingRequests } from "../srs.js";
import { emptyBlock, surahOptions } from "../components.js";
import { icon } from "../icons.js";
import { esc, fmtDay } from "../utils.js";
import { S } from "../surahs.js";

function statusBadge(s) {
  return s === "pending" ? '<span class="badge b-amber">ожидает</span>'
    : s === "approved" ? '<span class="badge b-green">принята</span>'
    : '<span class="badge b-red">отклонена</span>';
}

function reqCard(r, staff) {
  const s = byId(r.student_id);
  const su = S(r.surah);
  return `<article class="req-card">
    <div class="req-main">
      <b>${esc(s?.name || "Ученица")}</b> — ${su[0]}. ${esc(su[1])} <span class="ar" dir="rtl">${su[2]}</span>
      <div class="req-meta">${r.from_ayah === 1 && r.to_ayah === su[3] ? "целиком" : `аяты ${r.from_ayah}–${r.to_ayah}`} · ${fmtDay.format(new Date(r.created_at))}</div>
      ${r.note ? `<div class="req-note">${esc(r.note)}</div>` : ""}
      <div style="margin-top:8px">${statusBadge(r.status)}</div>
    </div>
    ${staff && r.status === "pending" ? `<div class="req-actions">
      <button class="btn primary sm" data-action="approve-request" data-id="${r.id}">${icon("check", 14)} Принять</button>
      <button class="btn outline-danger sm" data-action="reject-request" data-id="${r.id}">Отклонить</button>
    </div>` : ""}
  </article>`;
}

export function viewRequests() {
  if (isStudent()) {
    if (!store.member.student_id) return emptyBlock("Аккаунт не привязан", "Обратитесь к владельцу.");
    const mine = store.requests.filter((r) => r.student_id === store.member.student_id);
    return `<div class="page-head reveal"><div><h1>Заявки на сдачу</h1></div></div>
      <div class="detail-cols">
        <section class="card form-card reveal"><h2>Новая заявка</h2>
          <form id="requestForm">
            <div class="field-row">
              <label class="field" style="flex:2">Сура<select name="surah">${surahOptions(114)}</select></label>
              <label class="field">С аята<input name="from" type="number" min="1" value="1"></label>
              <label class="field">По аят<input name="to" type="number" min="1" placeholder="конец"></label>
            </div>
            <label class="field">Комментарий<textarea name="note" maxlength="240"></textarea></label>
            <div class="f-msg" id="requestMsg"></div>
            <button class="btn primary block" type="submit">${icon("send", 15)} Отправить</button>
          </form>
        </section>
        <section class="card reveal" style="--i:1;padding:0;overflow:hidden">
          <div style="padding:16px 18px"><h2 style="margin:0">Мои заявки · ${mine.length}</h2></div>
          ${mine.length ? mine.map((r) => reqCard(r, false)).join("") : '<div class="empty-list">Заявок пока нет.</div>'}
        </section>
      </div>`;
  }

  const list = store.requests.filter((r) => store.ui.rs === "all" || r.status === store.ui.rs);
  return `<div class="page-head reveal">
      <div><h1>Заявки<span class="count-pill">${pendingRequests()}</span></h1></div>
      <button class="btn soft" data-action="refresh-requests">${icon("refresh", 15)} Обновить</button>
    </div>
    <div class="toolbar card reveal">
      <button class="chip ${store.ui.rs === "pending" ? "active" : ""}" data-action="rfilter" data-val="pending">Ожидают</button>
      <button class="chip ${store.ui.rs === "approved" ? "active" : ""}" data-action="rfilter" data-val="approved">Принятые</button>
      <button class="chip ${store.ui.rs === "rejected" ? "active" : ""}" data-action="rfilter" data-val="rejected">Отклонённые</button>
      <button class="chip ${store.ui.rs === "all" ? "active" : ""}" data-action="rfilter" data-val="all">Все</button>
    </div>
    <section class="card reveal" style="--i:1;padding:0;overflow:hidden">
      ${list.length ? list.map((r) => reqCard(r, true)).join("") : '<div class="empty-list">Заявок нет.</div>'}
    </section>`;
    }

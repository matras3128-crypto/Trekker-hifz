// Экран «Команда» (только владелец): роли и приглашения.
import { store, isOwner } from "../store.js";
import { emptyBlock, roleBadge } from "../components.js";
import { icon } from "../icons.js";
import { esc, initials } from "../utils.js";
import { initials as init } from "../store.js";

export function viewTeam() {
  if (!isOwner()) return emptyBlock("Только для владельца", "");
  const studentOpts = `<option value="">Без привязки</option>` +
    store.state.students.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("");

  return `<div class="page-head reveal">
      <div><h1>Команда<span class="count-pill">${store.team.length}</span></h1></div>
      <button class="btn soft" data-action="refresh-team">${icon("refresh", 15)} Обновить</button>
    </div>
    <div class="team-grid">
      <section class="card reveal"><h2>Участники</h2>
        ${store.team.map((m) => `
          <div class="member-row">
            <span class="avatar sm">${esc(init(m.name || m.email))}</span>
            <div class="member-info"><b>${esc(m.name || "Участник")} ${roleBadge(m.role)}</b><span>${esc(m.email || "")}</span></div>
            <div class="member-controls">
              <select class="mini-select" data-member-role="${m.user_id}">
                <option value="owner" ${m.role === "owner" ? "selected" : ""}>Владелец</option>
                <option value="teacher" ${m.role === "teacher" ? "selected" : ""}>Учитель</option>
                <option value="student" ${m.role === "student" ? "selected" : ""}>Ученица</option>
              </select>
              <select class="mini-select" data-member-link="${m.user_id}" ${m.role !== "student" ? "disabled" : ""}>
                ${studentOpts.replace(`value="${m.student_id || ""}"`, `value="${m.student_id || ""}" selected`)}
              </select>
              <button class="btn soft sm" data-action="save-member" data-id="${m.user_id}">Сохранить</button>
            </div>
          </div>`).join("")}
      </section>
      <aside class="card reveal" style="--i:1"><h2>Приглашение</h2>
        <form id="inviteForm">
          <label class="field">Роль<select name="role"><option value="student">Ученица</option><option value="teacher">Учитель</option></select></label>
          <label class="field">Ученица<select name="student"><option value="">Выбрать позже</option>${store.state.students.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select></label>
          <label class="field">Заметка<input name="note" maxlength="80"></label>
          <button class="btn primary block" type="submit">${icon("plus", 15)} Создать код</button>
        </form>
        <div class="drawer-section"><h4>Приглашения</h4>
          ${store.invites.length ? store.invites.map((v) => `
            <div class="invite-row">
              <span class="invite-code">${esc(v.code)}</span>${roleBadge(v.role)}
              <span class="sub" style="margin:0">${v.used_by ? "использовано" : "активно"}</span>
              <button class="icon-btn" data-action="copy-invite" data-code="${esc(v.code)}">${icon("copy", 13)}</button>
              ${!v.used_by ? `<button class="icon-btn" data-action="revoke-invite" data-code="${esc(v.code)}">${icon("trash", 13)}</button>` : ""}
            </div>`).join("") : '<div class="empty-list" style="padding:16px">Нет приглашений.</div>'}
        </div>
      </aside>
    </div>`;
}

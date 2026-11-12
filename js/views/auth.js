// Экран входа / регистрации.
import { store } from "../store.js";
import { icon } from "../icons.js";

export function viewAuth() {
  const reg = store.ui.authMode === "signup";
  return `<div class="auth-wrap">
    <section class="auth-hero reveal">
      <h1>Журнал хифза</h1>
      <p>Вход для владельца, учителей и учениц.</p>
    </section>
    <section class="card auth-card reveal" style="--i:1">
      <h2>${reg ? "Регистрация" : "Вход"}</h2>
      <div class="auth-tabs">
        <button class="auth-tab ${!reg ? "active" : ""}" data-action="auth-mode" data-mode="signin">Вход</button>
        <button class="auth-tab ${reg ? "active" : ""}" data-action="auth-mode" data-mode="signup">Регистрация</button>
      </div>
      <button class="btn google" data-action="google-login">${icon("google", 18)} Войти через Google</button>
      <div class="auth-or">или по почте</div>
      <form id="authForm">
        ${reg ? `
          <label class="field">Имя<input name="name" maxlength="60"></label>
          <label class="field">Код приглашения<input name="invite" maxlength="20" placeholder="Если есть"></label>` : ""}
        <label class="field">Email<input name="email" type="email" required></label>
        <label class="field">Пароль<input name="password" type="password" required minlength="6"></label>
        <div class="f-msg" id="authMsg"></div>
        <button class="btn primary block" type="submit">${icon("mail", 15)} ${reg ? "Создать аккаунт" : "Войти"}</button>
      </form>
      ${reg ? '<p class="auth-foot">Первый аккаунт становится владельцем.</p>' : ""}
    </section>
  </div>`;
}

export function loadingView() {
  return `<div class="loading-screen"><div><div class="spinner"></div><h2>Загрузка…</h2></div></div>`;
}

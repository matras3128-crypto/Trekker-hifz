// ============================================================
// Работа с Supabase: клиент, авторизация, синхронизация, RPC.
// ============================================================

import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";
import { store, normalize, writeCache, loadCache, payload, isStaff, isOwner } from "./store.js";
import { bus } from "./utils.js";

let client = null;
let channel = null;
let reqChannel = null;
let entering = false;

export const getClient = () => client;

// Человекочитаемые ошибки.
export function humanError(e) {
  const m = String(e?.message || e || "");
  if (/CONFLICT/i.test(m)) return "Данные изменились на другом устройстве. Загружаю свежую версию.";
  if (/LAST_OWNER/i.test(m)) return "Нельзя убрать последнего владельца.";
  if (/INVITE_INVALID/i.test(m)) return "Приглашение недействительно или уже использовано.";
  if (/NOT_LINKED/i.test(m)) return "Аккаунт не привязан к карточке ученицы.";
  if (/FORBIDDEN/i.test(m)) return "Недостаточно прав.";
  if (/relation|does not exist|schema cache/i.test(m)) return "Таблицы не найдены. Выполните SQL в Supabase.";
  if (/invalid login|credentials/i.test(m)) return "Неверный email или пароль.";
  if (/already registered|already exists/i.test(m)) return "Такой аккаунт уже есть. Войдите.";
  if (/rate limit|too many/i.test(m)) return "Слишком много попыток. Подождите минуту.";
  if (/apikey|api key|jwt/i.test(m)) return "Проверьте ключ проекта.";
  if (/fetch|network/i.test(m)) return "Нет связи с Supabase.";
  return m || "Не получилось. Попробуйте ещё раз.";
}

async function makeClient() {
  const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
}

export async function init() {
  store.screen = "loading";
  bus.emit("render");
  try {
    client = await makeClient();
    const { data } = await client.auth.getSession();
    if (data.session) await enter(data.session);
    else { store.screen = "auth"; bus.emit("render"); }

    client.auth.onAuthStateChange((_e, s) => {
      if (s && !entering && store.screen !== "app") {
        enter(s).catch((e) => {
          bus.emit("toast", { msg: humanError(e), type: "danger" });
          store.screen = "auth";
          bus.emit("render");
        });
      }
      if (!s && store.screen === "app") {
        store.member = null;
        store.session = null;
        store.screen = "auth";
        bus.emit("render");
      }
    });
  } catch (e) {
    store.screen = "auth";
    bus.emit("render");
    bus.emit("toast", { msg: humanError(e), type: "danger" });
  }
}

async function enter(sess) {
  if (entering) return;
  entering = true;
  try {
    store.session = sess;
    const invite = sessionStorage.getItem("hifz-invite");
    const { data: prof, error } = await client.rpc("hifz_bootstrap", { invite_code: invite || null });
    if (error) throw error;
    sessionStorage.removeItem("hifz-invite");

    store.member = prof;
    store.cacheKey = "hifz-data-v7:" + prof.user_id;
    store.state = loadCache() || store.state;
    store.sync = { status: "syncing", last: null, dirty: false, timer: null, rev: null };
    store.screen = "app";
    store.ui.view = "today";
    bus.emit("render");

    await pullState();
    await loadRequests();
    if (isOwner()) await loadTeam();
    subscribe();
    bus.emit("render");
    bus.emit("toast", { msg: "Вы вошли в журнал", type: "info" });
  } finally {
    entering = false;
  }
}

/* ---------- авторизация ---------- */

export async function signIn(email, password) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (data.session) await enter(data.session);
}

export async function signUp(email, password, name, invite) {
  if (invite) sessionStorage.setItem("hifz-invite", invite.toUpperCase());
  const { data, error } = await client.auth.signUp({
    email, password,
    options: { data: { name }, emailRedirectTo: location.href.split("#")[0] },
  });
  if (error) throw error;
  if (data.session) await enter(data.session);
  else bus.emit("toast", { msg: "Подтвердите почту, затем войдите", type: "info", duration: 7000 });
}

export async function signInGoogle() {
  const { error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: location.href.split("#")[0] },
  });
  if (error) throw error;
}

export async function signOut() {
  unsubscribe();
  await client?.auth.signOut();
  store.member = null;
  store.session = null;
  store.screen = "auth";
  bus.emit("render");
}

/* ---------- синхронизация ---------- */

export async function pullState() {
  store.sync.status = "syncing";
  bus.emit("sync");
  const { data, error } = await client.rpc("hifz_get_state");
  if (error) throw error;
  store.state = normalize(data);
  store.sync.rev = data.rev ?? 0;
  store.sync.last = new Date();
  store.sync.status = "synced";
  store.sync.dirty = false;
  writeCache();
  bus.emit("render");
}

export async function pushState() {
  if (!isStaff()) return;
  store.sync.status = "syncing";
  bus.emit("sync");
  const { data, error } = await client.rpc("hifz_save_state", {
    new_data: payload(),
    expected_rev: store.sync.rev,
  });
  if (error) {
    if (/CONFLICT/i.test(error.message)) {
      await pullState();
      bus.emit("toast", { msg: "Загружена свежая версия с другого устройства", type: "info" });
      return;
    }
    throw error;
  }
  store.sync.rev = data.rev;
  store.state.meta.updatedAt = data.updated_at;
  store.sync.last = new Date();
  store.sync.dirty = false;
  store.sync.status = "synced";
  writeCache();
  bus.emit("sync");
}

export function schedulePush() {
  if (!isStaff()) return;
  store.sync.dirty = true;
  clearTimeout(store.sync.timer);
  store.sync.timer = setTimeout(() => {
    pushState().catch((e) => {
      store.sync.status = "error";
      bus.emit("sync");
      bus.emit("toast", { msg: humanError(e), type: "danger" });
    });
  }, 850);
}

function subscribe() {
  unsubscribe();
  if (!client || !store.member) return;
  try {
    if (isStaff()) {
      channel = client
        .channel("hifz-workspace")
        .on("postgres_changes",
          { event: "UPDATE", schema: "public", table: "hifz_workspace", filter: "id=eq.1" },
          (p) => {
            if (p.new?.rev > store.sync.rev && !store.sync.dirty) pullState().catch(() => {});
          })
        .subscribe();
    }
    reqChannel = client
      .channel("hifz-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "hifz_requests" }, () => {
        loadRequests().then(() => bus.emit("render")).catch(() => {});
      })
      .subscribe();
  } catch {}
}

function unsubscribe() {
  if (channel) { try { client.removeChannel(channel); } catch {} channel = null; }
  if (reqChannel) { try { client.removeChannel(reqChannel); } catch {} reqChannel = null; }
}

/* ---------- заявки / команда ---------- */

export async function loadRequests() {
  const { data, error } = await client
    .from("hifz_requests").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  store.requests = data || [];
}

export async function loadTeam() {
  if (!isOwner()) return;
  const [m, i] = await Promise.all([
    client.from("hifz_members").select("*").order("created_at"),
    client.from("hifz_invites").select("*").order("created_at", { ascending: false }),
  ]);
  if (m.error) throw m.error;
  if (i.error) throw i.error;
  store.team = m.data || [];
  store.invites = i.data || [];
}

export const rpc = (fn, args) => client.rpc(fn, args);

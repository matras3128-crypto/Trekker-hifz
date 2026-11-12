// ============================================================
// Точка входа: связываем шину, звук, рендер и запускаем API.
// ============================================================

import { store } from "./store.js";
import { bus } from "./utils.js";
import { Sound } from "./sound.js";
import { toast } from "./components.js";
import { renderAll, applyTheme } from "./router.js";
import { updateSyncUI } from "./header.js";
import * as api from "./api.js";
import "./events.js";

// Подписки на события шины.
bus.on("render", renderAll);
bus.on("sync", updateSyncUI);
bus.on("toast", ({ msg, type, duration }) => toast(msg, { type, duration }));

// Стартовые настройки.
Sound.setEnabled(store.prefs.sound);
applyTheme();

// Запуск.
api.init();

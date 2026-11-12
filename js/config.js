// ============================================================
// Конфигурация приложения.
// Supabase уже подключён — ключи зашиты сюда.
// ============================================================

export const SUPABASE_URL = "https://jchlvruopyfszpsqsbdr.supabase.co";
export const SUPABASE_KEY = "sb_publishable_RmlQz7_mPvXxuVsAjzoFXw_Z-ElWtfk";

// Интервалы повторения (в днях). 7 ступеней до «закреплено».
export const INTERVALS = [1, 3, 7, 14, 30, 60, 120];

// Всего аятов в Коране.
export const TOTAL_AYAHS = 6236;

// Ключи локального хранилища.
export const PREF_KEY = "hifz-pref-v7";
export const DATA_PREFIX = "hifz-data-v7:";

// Палитра меток учениц.
export const COLORS = [
  ["#1a6fd6", "#0f57b3"],
  ["#0d94b4", "#0b7285"],
  ["#6a5ae0", "#5f3dc4"],
  ["#1e8e52", "#2b8a3e"],
  ["#b97708", "#d9480f"],
  ["#cf3d3d", "#c92a2a"],
  ["#0ea5e9", "#0369a1"],
  ["#64748b", "#334155"],
];

export const APP_VERSION = 7;
export const CREDIT = "by Synthetix Lab (kosh) with KoranVdom";

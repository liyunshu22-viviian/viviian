import { content } from "./content.js";

const LANG_KEY = "viviian-portfolio-lang";

function getPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

export function getLang() {
  return localStorage.getItem(LANG_KEY) || "zh";
}

export function setLang(lang) {
  localStorage.setItem(LANG_KEY, lang);
}

export function t(path, lang = getLang()) {
  const entry = getPath(content, path);
  if (!entry) return "";
  return entry[lang] ?? entry.zh ?? "";
}

const listeners = [];
export function onLangChange(fn) {
  listeners.push(fn);
}

export function applyLang(lang) {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.documentElement.dataset.lang = lang;
  document.body.dataset.lang = lang;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const value = t(key, lang);
    if (value) el.textContent = value;
  });

  document.title = t("meta.title", lang);

  listeners.forEach((fn) => fn(lang));
}

export function initLangToggle() {
  const btn = document.getElementById("lang-toggle");
  let lang = getLang();
  applyLang(lang);

  btn?.addEventListener("click", () => {
    lang = lang === "zh" ? "en" : "zh";
    setLang(lang);
    applyLang(lang);
  });
}

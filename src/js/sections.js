import { content, XHS_FAN_URL, XHS_FIC_URL, PROOF_FAN_COUNT, PROOF_FIC_COUNT } from "./content.js";
import { getLang } from "./i18n.js";

const ARROW_SVG = `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12L12 4M12 4H5M12 4V11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const WORK_ICONS = {
  tower: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
    <rect x="10" y="34" width="28" height="5.2"/>
    <rect x="13" y="28.4" width="22" height="5.2"/>
    <rect x="16" y="22.8" width="16" height="5.2"/>
    <rect x="19" y="17.2" width="10" height="5.2"/>
    <line x1="24" y1="17.2" x2="24" y2="9"/>
    <path class="ink-accent" d="M24 9 L21.5 17.2 L26.5 22.8 L20.5 28.4 L25.5 34 L22 39.2"/>
    <g class="ink-accent" transform="translate(24,43.5) scale(1.35)">
      <circle r="1.1" fill="currentColor" stroke="none"/>
      <path d="M0,-3.2 C1.6,-2.4 1.6,-0.8 0,0 C-1.6,-0.8 -1.6,-2.4 0,-3.2Z"/>
      <path d="M0,-3.2 C1.6,-2.4 1.6,-0.8 0,0 C-1.6,-0.8 -1.6,-2.4 0,-3.2Z" transform="rotate(72)"/>
      <path d="M0,-3.2 C1.6,-2.4 1.6,-0.8 0,0 C-1.6,-0.8 -1.6,-2.4 0,-3.2Z" transform="rotate(144)"/>
      <path d="M0,-3.2 C1.6,-2.4 1.6,-0.8 0,0 C-1.6,-0.8 -1.6,-2.4 0,-3.2Z" transform="rotate(216)"/>
      <path d="M0,-3.2 C1.6,-2.4 1.6,-0.8 0,0 C-1.6,-0.8 -1.6,-2.4 0,-3.2Z" transform="rotate(288)"/>
    </g>
  </svg>`,
  pod: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="24" cy="25" rx="19" ry="8.5" transform="rotate(-18 24 25)" stroke-dasharray="1.2 3.4"/>
    <g transform="translate(39.5,15.5)" fill="currentColor" stroke="none">
      <path d="M0,-2.6 L0.7,-0.7 L2.6,0 L0.7,0.7 L0,2.6 L-0.7,0.7 L-2.6,0 L-0.7,-0.7 Z"/>
    </g>
    <rect x="15" y="12" width="18" height="27" rx="9"/>
    <ellipse cx="24" cy="24.5" rx="5.4" ry="6.4"/>
    <line x1="19.4" y1="34" x2="28.6" y2="34"/>
  </svg>`,
};

function bilingual(entry, lang) {
  if (entry == null) return "";
  if (typeof entry === "string") return entry;
  return entry[lang] ?? entry.zh ?? "";
}

function renderAboutStats(lang) {
  const el = document.getElementById("about-stats");
  if (!el) return;
  el.innerHTML = content.about.stats
    .map(
      (s) => `
      <li>
        <span class="about__stat-value">${bilingual(s.value, lang)}</span>
        <span class="about__stat-label">${bilingual(s.label, lang)}</span>
      </li>`
    )
    .join("");
}

function renderChart(chartData, lang) {
  const max = Math.max(...chartData.map((d) => d.value));
  return `
    <div class="chart-bars">
      ${chartData
        .map(
          (d) => `
        <div class="bar-row">
          <span class="bar-row__label">${bilingual(d.label, lang)}</span>
          <span class="bar-row__track"><span class="bar-row__fill" data-target="${d.value}" style="width:${(d.value / max) * 100}%"></span></span>
          <span class="bar-row__value">${d.value}%</span>
        </div>`
        )
        .join("")}
    </div>`;
}

function renderSocialCard(data, url, lang) {
  return `
    <article class="card">
      <span class="card__badge">${bilingual(data.badge, lang)}</span>
      <h3 class="card__title">${bilingual(data.title, lang)}</h3>
      <p class="card__desc">${bilingual(data.desc, lang)}</p>
      <div class="card__stats">
        ${data.stats
          .map(
            (s) => `
          <div>
            <div class="card__stat-value">${s.value}</div>
            <div class="card__stat-label">${bilingual(s.label, lang)}</div>
          </div>`
          )
          .join("")}
      </div>
      <div class="card__chart">
        <p class="card__chart-title">${bilingual(data.chartTitle, lang)}</p>
        ${renderChart(data.chartData, lang)}
      </div>
      <a class="card__cta" href="${url}" target="_blank" rel="noopener noreferrer">
        <span data-i18n="social.cta">${bilingual(content.social.cta, lang)}</span>
        ${ARROW_SVG}
      </a>
    </article>`;
}

function renderSocialCards(lang) {
  const el = document.getElementById("social-cards");
  if (!el) return;
  el.innerHTML =
    renderSocialCard(content.social.fan, XHS_FAN_URL, lang) +
    renderSocialCard(content.social.fic, XHS_FIC_URL, lang);
}

function renderProjectBullets(lang) {
  const el = document.getElementById("project-bullets");
  if (!el) return;
  el.innerHTML = content.project.bullets
    .map(
      (b, i) => `<li data-index="0${i + 1}">${bilingual(b, lang)}</li>`
    )
    .join("");
}

function renderGallery(lang) {
  const el = document.getElementById("project-gallery");
  if (!el) return;
  el.innerHTML = content.gallery
    .map((g) => {
      const spanClass = g.span ? `span-${g.span}` : "";
      const caption = lang === "zh" ? g.zh : g.en;
      return `
        <div class="gallery-item ${spanClass}" data-reveal-item>
          <img src="${import.meta.env.BASE_URL}img/${g.file}.jpg" alt="${caption}" loading="lazy" />
          <span class="gallery-item__caption">${caption}</span>
        </div>`;
    })
    .join("");
}

function renderProofGrid(elId, prefix, count) {
  const el = document.getElementById(elId);
  if (!el) return;
  const base = import.meta.env.BASE_URL;
  el.innerHTML = Array.from({ length: count }, (_, i) => {
    const n = String(i + 1).padStart(2, "0");
    const src = `${base}img/proof/${prefix}-${n}.jpg`;
    return `
      <div class="proof-item">
        <img src="${src}" alt="${prefix}-${n}" loading="lazy" />
      </div>`;
  }).join("");
}

function renderProofGallery() {
  renderProofGrid("proof-fan", "fan", PROOF_FAN_COUNT);
  renderProofGrid("proof-fic", "fic", PROOF_FIC_COUNT);
}

function renderWorks(lang) {
  const el = document.getElementById("novels-list");
  if (!el) return;
  const base = import.meta.env.BASE_URL;
  el.innerHTML = content.works
    .map(
      (w) => `
      <a class="novel-row" href="${base}${w.slug}.html" style="--novel-accent:${w.accent}">
        <span class="novel-row__icon">${WORK_ICONS[w.icon] || ""}</span>
        <span class="novel-row__body">
          <span class="novel-row__top">
            <span class="novel-row__title">${bilingual(w.title, lang)}</span>
            <span class="novel-row__tags">${bilingual(w.tag, lang)} · ${bilingual(w.status, lang)}</span>
          </span>
          <span class="novel-row__logline">${bilingual(w.logline, lang)}</span>
          <span class="novel-row__meta">${lang === "zh" ? "约 " + w.wordcount + " 字" : w.wordcount + " characters"} · <span class="novel-row__hint">${bilingual(content.novels.hint, lang)}</span></span>
        </span>
        ${ARROW_SVG}
      </a>`
    )
    .join("");
}

export function renderDynamicSections() {
  const lang = getLang();
  renderAboutStats(lang);
  renderSocialCards(lang);
  renderProjectBullets(lang);
  renderGallery(lang);
  renderProofGallery();
  renderWorks(lang);
}

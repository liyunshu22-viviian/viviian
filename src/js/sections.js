import { content, XHS_FAN_URL, XHS_FIC_URL } from "./content.js";
import { getLang } from "./i18n.js";

const ARROW_SVG = `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12L12 4M12 4H5M12 4V11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

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

export function renderDynamicSections() {
  const lang = getLang();
  renderAboutStats(lang);
  renderSocialCards(lang);
  renderProjectBullets(lang);
  renderGallery(lang);
}

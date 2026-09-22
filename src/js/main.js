import "../styles/main.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { initLangToggle, onLangChange } from "./i18n.js";
import { renderDynamicSections } from "./sections.js";
import { initWaterBackground } from "./water-shader.js";

gsap.registerPlugin(ScrollTrigger);

/* ---------------- language ---------------- */
renderDynamicSections();
initLangToggle();
onLangChange(() => {
  renderDynamicSections();
  ScrollTrigger.refresh();
  requestAnimationFrame(() => {
    animateVisibleBars();
    revealCards();
  });
});

/* ---------------- mobile nav ---------------- */
const burger = document.getElementById("nav-burger");
const navLinks = document.querySelector(".nav__links");
burger?.addEventListener("click", () => {
  const open = navLinks.classList.toggle("is-open");
  burger.classList.toggle("is-open", open);
});
document.querySelectorAll(".nav__links a").forEach((a) =>
  a.addEventListener("click", () => {
    navLinks?.classList.remove("is-open");
    burger?.classList.remove("is-open");
  })
);

/* ---------------- site-wide water shader background ---------------- */
initWaterBackground(document.getElementById("water-bg"));

/* ---------------- hero entrance ---------------- */
gsap.timeline({ defaults: { ease: "power3.out", duration: 1 } })
  .to(".nav", { opacity: 1, y: 0, duration: 0.8 }, 0)
  .to(".hero__eyebrow", { opacity: 1, y: 0 }, 0.15)
  .to(".hero__name", { opacity: 1, y: 0 }, 0.28)
  .to(".hero__role", { opacity: 1, y: 0 }, 0.42)
  .to(".hero__scroll", { opacity: 1, y: 0 }, 0.62);

/* ---------------- scroll reveals ---------------- */
function setupReveals() {
  gsap.utils.toArray("[data-reveal]").forEach((el) => {
    if (el.closest(".nav") || el.closest(".hero")) return;
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
        toggleActions: "play none none none",
      },
    });
  });

  gsap.utils.toArray(".gallery-item").forEach((el, i) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 34 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        delay: (i % 4) * 0.06,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 90%",
          toggleActions: "play none none none",
        },
      }
    );
  });
}

function revealCards() {
  gsap.utils.toArray(".social__cards .card").forEach((el, i) => {
    gsap.fromTo(
      el,
      { opacity: 0, filter: "blur(16px)", y: 22 },
      {
        opacity: 1,
        filter: "blur(0px)",
        y: 0,
        duration: 1.1,
        delay: i * 0.12,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 88%",
          toggleActions: "play none none none",
        },
      }
    );
  });
}

function animateVisibleBars() {
  document.querySelectorAll(".card__chart").forEach((chart) => {
    const fills = [...chart.querySelectorAll(".bar-row__fill")];
    const targets = fills.map((f) => f.style.width);
    fills.forEach((f) => (f.style.width = "0%"));
    requestAnimationFrame(() => {
      gsap.to(fills, {
        width: (i) => targets[i],
        duration: 1,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: {
          trigger: chart,
          start: "top 90%",
          toggleActions: "play none none none",
        },
      });
    });
  });
}

setupReveals();
animateVisibleBars();
revealCards();

/* ---------------- project video ---------------- */
const videoFrame = document.getElementById("video-frame");
const video = document.getElementById("promo-video");
const playBtn = document.getElementById("video-play");

playBtn?.addEventListener("click", () => {
  video.preload = "auto";
  video.play();
  videoFrame.classList.add("is-playing");
});

video?.addEventListener("pause", () => {
  videoFrame.classList.remove("is-playing");
});
video?.addEventListener("play", () => {
  videoFrame.classList.add("is-playing");
});

/* ---------------- mail icon (tap-to-toggle for touch devices) ---------------- */
const mailIcon = document.getElementById("mail-icon");
mailIcon?.addEventListener("click", (e) => {
  e.stopPropagation();
  mailIcon.classList.toggle("is-open");
});
document.addEventListener("click", () => mailIcon?.classList.remove("is-open"));

import "../styles/main.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { initLangToggle, onLangChange } from "./i18n.js";
import { renderDynamicSections } from "./sections.js";

gsap.registerPlugin(ScrollTrigger);

/* ---------------- language ---------------- */
renderDynamicSections();
initLangToggle();
onLangChange(() => {
  renderDynamicSections();
  ScrollTrigger.refresh();
  requestAnimationFrame(animateVisibleBars);
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

/* ---------------- hero: cursor-reactive blobs + glow ---------------- */
const isFinePointer = window.matchMedia("(pointer: fine)").matches;
const glow = document.querySelector(".cursor-glow");
const blobs = gsap.utils.toArray(".blob");

if (isFinePointer && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const quickX = gsap.quickTo(glow, "x", { duration: 0.6, ease: "power3.out" });
  const quickY = gsap.quickTo(glow, "y", { duration: 0.6, ease: "power3.out" });

  const blobSetters = blobs.map((b, i) => ({
    x: gsap.quickTo(b, "x", { duration: 1.1 + i * 0.25, ease: "power3.out" }),
    y: gsap.quickTo(b, "y", { duration: 1.1 + i * 0.25, ease: "power3.out" }),
    strength: 0.06 + i * 0.03,
  }));

  window.addEventListener("pointermove", (e) => {
    const { innerWidth: w, innerHeight: h } = window;
    const relX = e.clientX - w / 2;
    const relY = e.clientY - h / 2;

    quickX(e.clientX);
    quickY(e.clientY);
    gsap.to(glow, { opacity: 1, duration: 0.4, overwrite: "auto" });

    blobSetters.forEach((s) => {
      s.x(relX * s.strength);
      s.y(relY * s.strength);
    });
  });

  window.addEventListener("pointerleave", () => {
    gsap.to(glow, { opacity: 0, duration: 0.6 });
  });
} else {
  glow?.remove();
}

/* subtle idle float even without pointer movement */
blobs.forEach((b, i) => {
  gsap.to(b, {
    y: "+=18",
    duration: 5 + i,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1,
    delay: i * 0.4,
  });
});

/* ---------------- hero entrance ---------------- */
gsap.timeline({ defaults: { ease: "power3.out", duration: 1 } })
  .to(".nav", { opacity: 1, y: 0, duration: 0.8 }, 0)
  .to(".hero__eyebrow", { opacity: 1, y: 0 }, 0.15)
  .to(".hero__name", { opacity: 1, y: 0 }, 0.28)
  .to(".hero__role", { opacity: 1, y: 0 }, 0.42)
  .to(".hero__tagline", { opacity: 1, y: 0 }, 0.52)
  .to(".hero__scroll", { opacity: 1, y: 0 }, 0.7);

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

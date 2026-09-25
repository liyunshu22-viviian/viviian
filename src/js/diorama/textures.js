import * as THREE from "three";

const CJK =
  "'Noto Sans SC','Noto Sans JP','Hiragino Sans','PingFang SC','Microsoft YaHei','Yu Gothic',sans-serif";
const LATIN = "'Inter','Helvetica Neue',Arial,sans-serif";

function make(w, h, draw, opt = {}) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opt.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (opt.wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function seeded(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const BOTTLE = ["#ff6b6b", "#ffd166", "#06d6a0", "#2f9bd6", "#ef476f", "#f78c6b", "#83c5be", "#ffffff", "#9b5de5", "#b5e48c"];

/* ---------- signage ---------- */

export function signTexture() {
  return make(1536, 128, (g, w, h) => {
    g.fillStyle = "#f7fbfa";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#1fa39a";
    g.fillRect(0, 0, w, 24);
    g.fillStyle = "#ff8a3d";
    g.fillRect(0, 24, w, 9);
    g.fillStyle = "#1fa39a";
    g.fillRect(0, h - 15, w, 15);

    g.fillStyle = "#1fa39a";
    g.beginPath();
    g.arc(96, 76, 33, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#ffffff";
    g.font = `800 42px ${LATIN}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("Y", 97, 78);

    g.textAlign = "left";
    g.fillStyle = "#13857d";
    g.font = `italic 800 62px ${LATIN}`;
    g.fillText("YUN MART", 150, 79);

    g.fillStyle = "#ff8a3d";
    g.font = `700 22px ${LATIN}`;
    g.fillText("24 HOURS", 480, 60);
    g.fillStyle = "#6c7a80";
    g.font = `600 20px ${LATIN}`;
    g.fillText("OPEN EVERYDAY", 480, 90);

    g.textAlign = "right";
    g.fillStyle = "#22313a";
    g.font = `800 58px ${CJK}`;
    g.fillText("云舒便利店", w - 60, 80);
  });
}

export function pylonTexture() {
  return make(256, 256, (g, w, h) => {
    g.fillStyle = "#f7fbfa";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#1fa39a";
    g.fillRect(0, 0, w, 40);
    g.fillStyle = "#ff8a3d";
    g.fillRect(0, 40, w, 12);
    g.fillStyle = "#1fa39a";
    g.fillRect(0, h - 26, w, 26);
    g.beginPath();
    g.arc(128, 118, 46, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fff";
    g.font = `800 58px ${LATIN}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("Y", 129, 121);
    g.fillStyle = "#13857d";
    g.font = `italic 800 34px ${LATIN}`;
    g.fillText("YUN MART", 128, 196);
  });
}

export function headerTexture(text, sub, bg = "#1fa39a") {
  return make(1024, 64, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#ffffff";
    g.font = `800 34px ${CJK}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, w / 2 - (sub ? 120 : 0), h / 2 + 2);
    if (sub) {
      g.font = `600 22px ${LATIN}`;
      g.fillStyle = "rgba(255,255,255,0.8)";
      g.fillText(sub, w / 2 + 210, h / 2 + 2);
    }
  });
}

/* ---------- store interior ---------- */

export function fridgeTexture() {
  const rnd = seeded(11);
  return make(1024, 360, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "#fbfdff");
    grd.addColorStop(1, "#dcecf6");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    const doors = 6;
    const dw = w / doors;
    for (let d = 0; d < doors; d++) {
      const x0 = d * dw;
      for (let s = 0; s < 5; s++) {
        const y1 = 22 + (s + 1) * 66;
        g.fillStyle = "#b9c6cf";
        g.fillRect(x0 + 6, y1, dw - 12, 5);
        let x = x0 + 12;
        while (x < x0 + dw - 26) {
          const bw = 14 + rnd() * 10;
          const bh = 30 + rnd() * 24;
          const col = BOTTLE[Math.floor(rnd() * BOTTLE.length)];
          g.fillStyle = col;
          rr(g, x, y1 - bh, bw, bh, 5);
          g.fill();
          g.fillStyle = "rgba(255,255,255,0.55)";
          g.fillRect(x + 3, y1 - bh + 8, 3, bh - 14);
          g.fillStyle = "#3b4550";
          g.fillRect(x + bw / 2 - 3, y1 - bh - 5, 6, 5);
          x += bw + 4;
        }
      }
      g.strokeStyle = "#5d6974";
      g.lineWidth = 7;
      g.strokeRect(x0 + 3, 3, dw - 6, h - 6);
      g.fillStyle = "#8b98a3";
      g.fillRect(x0 + dw - 18, 120, 6, 110);
    }
  });
}

export function menuBoardTexture() {
  return make(512, 150, (g, w, h) => {
    g.fillStyle = "#23303a";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#ff8a3d";
    rr(g, 12, 12, 236, h - 24, 12);
    g.fill();
    g.fillStyle = "#1fa39a";
    rr(g, 264, 12, 236, h - 24, 12);
    g.fill();
    g.fillStyle = "#fff";
    g.textAlign = "center";
    g.font = `800 34px ${CJK}`;
    g.fillText("ホットスナック", 130, 64);
    g.font = `700 28px ${CJK}`;
    g.fillText("からあげ 220", 130, 108);
    g.font = `800 36px ${LATIN}`;
    g.fillText("COFFEE", 382, 64);
    g.font = `700 26px ${LATIN}`;
    g.fillText("S 100  ·  L 150", 382, 108);
  });
}

export function windowPosterTexture(kind) {
  return make(200, 280, (g, w, h) => {
    if (kind === "oden") {
      g.fillStyle = "#ffcf5c";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#d9481f";
      g.font = `900 46px ${CJK}`;
      g.textAlign = "center";
      g.fillText("おでん", w / 2, 64);
      g.fillStyle = "#6b3d1f";
      g.beginPath();
      g.ellipse(w / 2, 150, 62, 40, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#fff5dc";
      g.beginPath();
      g.arc(w / 2 - 22, 140, 18, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#f2a65a";
      g.fillRect(w / 2 + 2, 124, 30, 30);
      g.fillStyle = "#d9481f";
      g.font = `900 40px ${LATIN}`;
      g.fillText("70円", w / 2, 238);
    } else {
      g.fillStyle = "#e9f5e1";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#4f8a3a";
      g.font = `900 30px ${CJK}`;
      g.textAlign = "center";
      g.fillText("新発売", w / 2, 50);
      g.fillStyle = "#79b35a";
      rr(g, 64, 80, 72, 110, 14);
      g.fill();
      g.fillStyle = "#fff";
      g.fillRect(64, 104, 72, 26);
      g.fillStyle = "#4f8a3a";
      g.font = `800 28px ${CJK}`;
      g.fillText("抹茶ラテ", w / 2, 236);
    }
    g.strokeStyle = "#ffffff";
    g.lineWidth = 8;
    g.strokeRect(4, 4, w - 8, h - 8);
  });
}

export function tileTexture(base, line, n = 4, jitter = 10) {
  const rnd = seeded(base.length * 31 + n);
  return make(
    256,
    256,
    (g, w, h) => {
      const s = w / n;
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const c = new THREE.Color(base);
          const k = 1 + (rnd() - 0.5) * (jitter / 100);
          c.multiplyScalar(k);
          g.fillStyle = `#${c.getHexString()}`;
          g.fillRect(x * s, y * s, s, s);
        }
      }
      g.strokeStyle = line;
      g.lineWidth = 3;
      for (let i = 0; i <= n; i++) {
        g.beginPath();
        g.moveTo(i * s, 0);
        g.lineTo(i * s, h);
        g.stroke();
        g.beginPath();
        g.moveTo(0, i * s);
        g.lineTo(w, i * s);
        g.stroke();
      }
    },
    { wrap: true }
  );
}

export function asphaltTexture(base = "#2b303d") {
  const rnd = seeded(7);
  return make(
    256,
    256,
    (g, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1400; i++) {
        const v = rnd();
        g.fillStyle = v > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.12)";
        g.fillRect(rnd() * w, rnd() * h, 2, 2);
      }
      g.strokeStyle = "rgba(0,0,0,0.25)";
      g.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        let x = rnd() * w;
        let y = rnd() * h;
        g.moveTo(x, y);
        for (let k = 0; k < 6; k++) {
          x += (rnd() - 0.5) * 40;
          y += (rnd() - 0.5) * 40;
          g.lineTo(x, y);
        }
        g.stroke();
      }
    },
    { wrap: true }
  );
}

export function grateTexture() {
  return make(
    64,
    64,
    (g, w, h) => {
      g.fillStyle = "#3c4150";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#12141b";
      for (let i = 0; i < 4; i++) g.fillRect(6 + i * 14, 8, 7, h - 16);
    },
    { wrap: true }
  );
}

/* ---------- vending machines ---------- */

export function vendingTexture(kind) {
  const rnd = seeded(kind === "books" ? 23 : 5);
  return make(256, 512, (g, w, h) => {
    const body = kind === "books" ? "#b8483e" : "#2f6fb3";
    g.fillStyle = body;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#f6fbff";
    rr(g, 14, 14, w - 28, 300, 10);
    g.fill();

    if (kind === "books") {
      g.fillStyle = "#7d241d";
      rr(g, 20, 20, w - 40, 40, 8);
      g.fill();
      g.fillStyle = "#fff";
      g.font = `900 26px ${CJK}`;
      g.textAlign = "center";
      g.fillText("本 · BOOKS", w / 2, 49);
      const covers = [
        ["#1f2b44", "巴别塔"],
        ["#2f7d78", "远航日志"],
        ["#e6c9a8", ""],
        ["#9b5de5", ""],
        ["#ffd166", ""],
        ["#ef476f", ""],
        ["#83c5be", ""],
        ["#f78c6b", ""],
        ["#118ab2", ""],
      ];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const [col, title] = covers[r * 3 + c];
          const x = 30 + c * 68;
          const y = 76 + r * 78;
          g.fillStyle = col;
          g.fillRect(x, y, 56, 62);
          g.fillStyle = "rgba(0,0,0,0.25)";
          g.fillRect(x, y, 6, 62);
          if (title) {
            g.fillStyle = "#fff";
            g.font = `800 13px ${CJK}`;
            g.fillText(title, x + 31, y + 36);
          }
          g.fillStyle = "#d9481f";
          g.fillRect(x + 8, y + 64, 40, 8);
        }
      }
    } else {
      const tags = ["#2f9bd6", "#2f9bd6", "#e5484d"];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 5; c++) {
          const x = 26 + c * 42;
          const y = 38 + r * 92;
          const col = BOTTLE[Math.floor(rnd() * BOTTLE.length)];
          g.fillStyle = col;
          rr(g, x, y, 28, 56, 8);
          g.fill();
          g.fillStyle = "rgba(255,255,255,0.6)";
          g.fillRect(x + 5, y + 8, 4, 40);
          g.fillStyle = tags[r];
          g.fillRect(x - 2, y + 62, 32, 12);
        }
      }
    }

    g.fillStyle = "#e4ebf2";
    rr(g, 20, 330, w - 40, 70, 8);
    g.fill();
    g.fillStyle = "#2b3440";
    g.fillRect(40, 350, 50, 10);
    g.fillStyle = "#39d98a";
    g.fillRect(150, 348, 70, 26);
    g.fillStyle = "#1a1f26";
    rr(g, 26, 420, w - 52, 70, 8);
    g.fill();
  });
}

/* ---------- bulletin board posters ---------- */

export function posterMainTexture() {
  return make(256, 360, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#2f7d78");
    sky.addColorStop(0.55, "#f2a38a");
    sky.addColorStop(1, "#ffe0c2");
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#1d5a58";
    g.beginPath();
    g.moveTo(0, 260);
    g.lineTo(60, 190);
    g.lineTo(110, 240);
    g.lineTo(170, 170);
    g.lineTo(256, 250);
    g.lineTo(256, 360);
    g.lineTo(0, 360);
    g.fill();
    g.fillStyle = "#143f3e";
    g.beginPath();
    g.moveTo(0, 300);
    g.lineTo(90, 250);
    g.lineTo(150, 290);
    g.lineTo(256, 240);
    g.lineTo(256, 360);
    g.lineTo(0, 360);
    g.fill();
    g.fillStyle = "#f3e6d0";
    g.fillRect(118, 280, 20, 44);
    g.fillStyle = "#c65b3b";
    g.beginPath();
    g.arc(128, 284, 40, Math.PI, 0);
    g.fill();
    g.fillStyle = "#fff";
    [[108, 270, 7], [134, 258, 6], [150, 276, 5]].forEach(([x, y, r]) => {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    });
    g.textAlign = "center";
    g.fillStyle = "#fff";
    g.font = `900 70px ${CJK}`;
    g.fillText("广元", w / 2, 96);
    g.font = `800 20px ${LATIN}`;
    g.fillText("FIELD  PROJECT", w / 2, 132);
    g.font = `600 15px ${CJK}`;
    g.fillText("2026 · 川珍实业 调研纪实", w / 2, 158);
    g.strokeStyle = "#fff";
    g.lineWidth = 10;
    g.strokeRect(5, 5, w - 10, h - 10);
  });
}

export function posterSmallTexture(kind) {
  return make(180, 250, (g, w, h) => {
    g.textAlign = "center";
    if (kind === "notice") {
      g.fillStyle = "#fbf7ee";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#2c3e66";
      g.font = `900 26px ${CJK}`;
      g.fillText("お知らせ", w / 2, 42);
      g.fillStyle = "#9aa3b5";
      for (let i = 0; i < 7; i++) g.fillRect(24, 70 + i * 22, w - 48 - (i % 3) * 20, 7);
      g.fillStyle = "#e5484d";
      g.beginPath();
      g.arc(w - 36, h - 36, 18, 0, Math.PI * 2);
      g.fill();
    } else if (kind === "cat") {
      g.fillStyle = "#fff";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#e5484d";
      g.font = `900 30px ${CJK}`;
      g.fillText("迷い猫", w / 2, 42);
      g.fillStyle = "#1b1a22";
      g.beginPath();
      g.arc(w / 2, 120, 38, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.moveTo(w / 2 - 34, 100);
      g.lineTo(w / 2 - 22, 66);
      g.lineTo(w / 2 - 6, 90);
      g.fill();
      g.beginPath();
      g.moveTo(w / 2 + 34, 100);
      g.lineTo(w / 2 + 22, 66);
      g.lineTo(w / 2 + 6, 90);
      g.fill();
      g.fillStyle = "#ffd166";
      g.beginPath();
      g.arc(w / 2 - 14, 118, 5, 0, Math.PI * 2);
      g.arc(w / 2 + 14, 118, 5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#9aa3b5";
      for (let i = 0; i < 4; i++) g.fillRect(26, 180 + i * 16, w - 52, 6);
    } else {
      g.fillStyle = "#1c2748";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#ffd166";
      g.font = `900 34px ${CJK}`;
      g.fillText("夏祭り", w / 2, 50);
      for (let i = 0; i < 5; i++) {
        g.fillStyle = i % 2 ? "#ff6b6b" : "#ff9f43";
        g.beginPath();
        g.ellipse(26 + i * 32, 110 + (i % 2) * 8, 13, 18, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.strokeStyle = "#ffd166";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, 88);
      g.quadraticCurveTo(w / 2, 108, w, 88);
      g.stroke();
      g.fillStyle = "#fff";
      g.font = `700 18px ${CJK}`;
      g.fillText("8/24 · 桜台公園", w / 2, 190);
    }
  });
}

export function aBoardTexture() {
  return make(160, 220, (g, w, h) => {
    g.fillStyle = "#26352f";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#c9a27a";
    g.lineWidth = 10;
    g.strokeRect(5, 5, w - 10, h - 10);
    g.textAlign = "center";
    g.fillStyle = "#fff";
    g.font = `800 22px ${CJK}`;
    g.fillText("本日のおすすめ", w / 2, 48);
    g.fillStyle = "#ffd166";
    g.font = `900 34px ${CJK}`;
    g.fillText("おでん", w / 2, 104);
    g.fillStyle = "#ff8a8a";
    g.font = `900 36px ${LATIN}`;
    g.fillText("70円", w / 2, 156);
    g.fillStyle = "#b8e0c8";
    g.font = `600 16px ${CJK}`;
    g.fillText("あったかいよ", w / 2, 192);
  });
}

/* ---------- misc street textures ---------- */

export function neighborWindowTexture(lit) {
  return make(128, 128, (g, w, h) => {
    if (lit) {
      const grd = g.createRadialGradient(64, 70, 10, 64, 64, 90);
      grd.addColorStop(0, "#ffe6b3");
      grd.addColorStop(1, "#f0a95e");
      g.fillStyle = grd;
    } else {
      g.fillStyle = "#2a3350";
    }
    g.fillRect(0, 0, w, h);
    g.fillStyle = lit ? "rgba(214,128,72,0.75)" : "rgba(60,72,110,0.9)";
    g.fillRect(0, 0, 30, h);
    g.fillRect(w - 30, 0, 30, h);
    if (lit) {
      g.fillStyle = "#6a8f4a";
      g.beginPath();
      g.arc(64, 104, 16, Math.PI, 0);
      g.fill();
      g.fillStyle = "#8a5a3c";
      g.fillRect(56, 104, 16, 18);
    }
    g.strokeStyle = "#2a2230";
    g.lineWidth = 6;
    g.strokeRect(0, 0, w, h);
    g.beginPath();
    g.moveTo(w / 2, 0);
    g.lineTo(w / 2, h);
    g.stroke();
  });
}

export function neonTexture() {
  return make(96, 320, (g, w, h) => {
    g.fillStyle = "#1c1424";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#ff7ac6";
    g.lineWidth = 5;
    rr(g, 8, 8, w - 16, h - 16, 10);
    g.stroke();
    g.fillStyle = "#ffd6ef";
    g.shadowColor = "#ff4fb3";
    g.shadowBlur = 14;
    g.font = `900 44px ${CJK}`;
    g.textAlign = "center";
    ["ス", "ナ", "ッ", "ク"].forEach((ch, i) => g.fillText(ch, w / 2, 70 + i * 56));
    g.fillStyle = "#9ff5ff";
    g.shadowColor = "#39d6ff";
    g.font = `900 30px ${CJK}`;
    g.fillText("灯", w / 2, h - 26);
  });
}

export function tomareTexture() {
  return make(256, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = "rgba(240,244,250,0.9)";
    g.font = `900 92px ${CJK}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("止まれ", w / 2, h / 2 + 4);
  });
}

export function stopSignTexture() {
  return make(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.moveTo(8, 20);
    g.lineTo(w - 8, 20);
    g.lineTo(w / 2, h - 12);
    g.closePath();
    g.fill();
    g.fillStyle = "#d8262f";
    g.beginPath();
    g.moveTo(24, 30);
    g.lineTo(w - 24, 30);
    g.lineTo(w / 2, h - 34);
    g.closePath();
    g.fill();
    g.fillStyle = "#fff";
    g.font = `900 46px ${CJK}`;
    g.textAlign = "center";
    g.fillText("止まれ", w / 2, 104);
  });
}

export function guideSignTexture() {
  return make(384, 160, (g, w, h) => {
    g.fillStyle = "#1f56a8";
    rr(g, 0, 0, w, h, 14);
    g.fill();
    g.strokeStyle = "#fff";
    g.lineWidth = 6;
    rr(g, 8, 8, w - 16, h - 16, 10);
    g.stroke();
    g.fillStyle = "#fff";
    g.font = `900 44px ${CJK}`;
    g.textAlign = "left";
    g.fillText("桜台駅", 36, 72);
    g.font = `600 22px ${LATIN}`;
    g.fillText("Sakuradai Sta.", 38, 112);
    g.beginPath();
    g.moveTo(w - 40, 80);
    g.lineTo(w - 90, 44);
    g.lineTo(w - 90, 64);
    g.lineTo(w - 140, 64);
    g.lineTo(w - 140, 96);
    g.lineTo(w - 90, 96);
    g.lineTo(w - 90, 116);
    g.closePath();
    g.fill();
  });
}

export function addressPlateTexture() {
  return make(64, 256, (g, w, h) => {
    g.fillStyle = "#1f56a8";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#fff";
    g.font = `800 34px ${CJK}`;
    g.textAlign = "center";
    ["桜", "台", "二", "丁", "目"].forEach((ch, i) => g.fillText(ch, w / 2, 44 + i * 42));
  });
}

export function staffDoorTexture() {
  return make(128, 48, (g, w, h) => {
    g.fillStyle = "#f3f1ea";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#23303a";
    g.font = `800 20px ${LATIN}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("STAFF ONLY", w / 2, h / 2 + 1);
  });
}

export function plaqueTexture() {
  return make(768, 96, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "#e2c48a");
    grd.addColorStop(0.5, "#c19a5b");
    grd.addColorStop(1, "#9c7740");
    g.fillStyle = grd;
    rr(g, 0, 0, w, h, 10);
    g.fill();
    g.strokeStyle = "rgba(70,48,20,0.6)";
    g.lineWidth = 3;
    rr(g, 8, 8, w - 16, h - 16, 6);
    g.stroke();
    g.fillStyle = "#3d2c14";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `700 30px ${LATIN}`;
    g.fillText("RAINY NIGHT CORNER  ·  云舒便利店  ·  1/80", w / 2, h / 2 + 2);
  });
}

export function mirrorTexture() {
  return make(128, 128, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, "#9fb7d8");
    grd.addColorStop(0.5, "#3c4f78");
    grd.addColorStop(1, "#1d2640");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,0.55)";
    g.beginPath();
    g.ellipse(44, 38, 26, 10, -0.6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "rgba(255,210,150,0.8)";
    g.beginPath();
    g.arc(86, 80, 6, 0, Math.PI * 2);
    g.fill();
  });
}

export function arrowDecalTexture() {
  return make(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#2fb36b";
    g.beginPath();
    g.moveTo(64, 10);
    g.lineTo(112, 62);
    g.lineTo(80, 62);
    g.lineTo(80, 118);
    g.lineTo(48, 118);
    g.lineTo(48, 62);
    g.lineTo(16, 62);
    g.closePath();
    g.fill();
  });
}

/* ---------- light fx (linear) ---------- */

export function glowTexture() {
  return make(
    128,
    128,
    (g, w, h) => {
      const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, "rgba(255,255,255,1)");
      grd.addColorStop(0.22, "rgba(255,255,255,0.55)");
      grd.addColorStop(0.6, "rgba(255,255,255,0.12)");
      grd.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
    },
    { linear: true }
  );
}

export function streakTexture() {
  return make(
    64,
    256,
    (g, w, h) => {
      const v = g.createLinearGradient(0, 0, 0, h);
      v.addColorStop(0, "rgba(255,255,255,1)");
      v.addColorStop(0.35, "rgba(255,255,255,0.55)");
      v.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = v;
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = "destination-out";
      for (let y = 6; y < h; y += 9) {
        g.fillStyle = `rgba(0,0,0,${0.25 + ((y * 7) % 5) * 0.08})`;
        g.fillRect(0, y, w, 3);
      }
      g.globalCompositeOperation = "destination-in";
      const hz = g.createLinearGradient(0, 0, w, 0);
      hz.addColorStop(0, "rgba(0,0,0,0)");
      hz.addColorStop(0.5, "rgba(0,0,0,1)");
      hz.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = hz;
      g.fillRect(0, 0, w, h);
    },
    { linear: true }
  );
}

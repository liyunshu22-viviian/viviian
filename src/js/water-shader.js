// Lightweight WebGL water/caustic background shader, ported from the
// ShaderWater(speed, waves, caustic) look to a live, site-wide canvas.
// Runs a single full-screen triangle + fragment shader; no dependencies.

const VERT_SRC = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAG_SRC = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_speed;
uniform float u_waves;
uniform float u_caustic;
uniform float u_highlights;
uniform vec3 u_colorBack;

float causticField(vec2 p, float t) {
  float v = 0.0;
  v += sin(p.x * 3.0 + t);
  v += sin(p.y * 2.6 - t * 1.15);
  v += sin((p.x + p.y) * 2.1 + t * 0.8);
  v += sin(length(p) * 3.4 - t * 1.6);
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 auv = vec2(uv.x * aspect, uv.y);

  float t = u_time * u_speed;

  vec2 mouse = vec2(u_mouse.x * aspect, u_mouse.y);
  float distToMouse = length(auv - mouse);
  float mouseInfluence = smoothstep(0.95, 0.0, distToMouse) * 0.4;

  vec2 p = auv * (3.2 + u_waves * 3.0);
  p += (auv - mouse) * mouseInfluence;

  float c = causticField(p, t);
  c = c * 0.22 + 0.5;
  c = pow(clamp(c, 0.0, 1.0), 2.3 - u_caustic * 5.0);

  vec3 colDeep = u_colorBack;
  vec3 colMid  = mix(colDeep, vec3(1.0), 0.45);
  vec3 colBase = mix(colDeep, vec3(1.0), 0.85);

  vec3 base = mix(colBase, colMid, uv.y * 0.55 + 0.15);
  vec3 color = mix(base, colDeep, c * (0.30 + mouseInfluence));

  float hi = smoothstep(0.72, 1.0, c);
  color = mix(color, vec3(1.0), hi * u_highlights);

  gl_FragColor = vec4(color, 1.0);
}
`;

function hexToRgb01(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
  if (!m) return [0.4, 0.73, 0.7];
  return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("Water shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function initWaterBackground(canvas, opts = {}) {
  if (!canvas) return;
  const {
    speed = 1,
    waves = 0.3,
    caustic = 0.08,
    highlights = 0.4,
    colorBack = "#66b7b2",
  } = opts;

  const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) {
    canvas.remove();
    document.body.classList.add("no-webgl");
    return;
  }

  const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
  if (!vs || !fs) {
    canvas.remove();
    document.body.classList.add("no-webgl");
    return;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("Water shader link error:", gl.getProgramInfoLog(program));
    canvas.remove();
    document.body.classList.add("no-webgl");
    return;
  }
  gl.useProgram(program);

  const posLoc = gl.getAttribLocation(program, "a_position");
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW
  );
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const u_resolution = gl.getUniformLocation(program, "u_resolution");
  const u_time = gl.getUniformLocation(program, "u_time");
  const u_mouse = gl.getUniformLocation(program, "u_mouse");
  const u_speed = gl.getUniformLocation(program, "u_speed");
  const u_waves = gl.getUniformLocation(program, "u_waves");
  const u_caustic = gl.getUniformLocation(program, "u_caustic");
  const u_highlights = gl.getUniformLocation(program, "u_highlights");
  const u_colorBack = gl.getUniformLocation(program, "u_colorBack");

  gl.uniform1f(u_speed, speed);
  gl.uniform1f(u_waves, waves);
  gl.uniform1f(u_caustic, caustic);
  gl.uniform1f(u_highlights, highlights);
  gl.uniform3fv(u_colorBack, hexToRgb01(colorBack));

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  let w = 0;
  let h = 0;
  function resize() {
    w = Math.floor(window.innerWidth * dpr);
    h = Math.floor(window.innerHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(u_resolution, w, h);
    }
  }
  resize();
  window.addEventListener("resize", resize);

  // mouse position, smoothed toward target for a gentle trailing feel
  let mouseX = 0.5;
  let mouseY = 0.4;
  let targetX = mouseX;
  let targetY = mouseY;
  window.addEventListener("pointermove", (e) => {
    targetX = e.clientX / window.innerWidth;
    targetY = 1 - e.clientY / window.innerHeight;
  });

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let start = performance.now();

  let settleFrames = reduceMotion ? 30 : Infinity;

  function frame(now) {
    mouseX += (targetX - mouseX) * 0.04;
    mouseY += (targetY - mouseY) * 0.04;
    gl.uniform2f(u_mouse, mouseX, mouseY);
    gl.uniform1f(u_time, (now - start) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    settleFrames -= 1;
    if (settleFrames > 0) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

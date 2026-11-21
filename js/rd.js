// Gray-Scott reaction-diffusion background: a faint white pattern on black. The cursor parts the pattern
// (it heals behind), and a slow mouse-follow "camera" drifts the view. Ported from the commms background
// (04_Wes Portfolio src/three/background.ts) via the raw-WebGL1 port in Wes V2, colours inverted.

const SIM_MAX = 512;
const STEPS_PER_FRAME = 6;
const BURN_IN_STEPS = 300;
const FEED = 0.0545;
const KILL = 0.062;
const BRUSH_RADIUS = 16;      // sim px
const RESEED_RADIUS = 5;      // sim px
const RESEED_BASE_S = 4;
const RESEED_JITTER_S = 2;
export const BASE_OVERSCAN = 1.03;   // margin so the parallax never shows the clamped texture edge
export const PARALLAX_MAX = 0.012;   // uv; must stay under (1 - 1/BASE_OVERSCAN) / 2 ≈ 0.0146
const PARALLAX_EASE = 0.06;   // per-frame lerp toward the target
const PATTERN_LUM = 0.24;     // the pattern's brightness on black: faint, so the reels win
const IDLE_PERIOD_S = 40;     // touch screens: slow Lissajous drift instead of a cursor

const VS = `attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0., 1.); }`;

const INIT = `precision highp float; varying vec2 vUv; uniform vec2 uSimDims; uniform float uSeed;
float h(vec2 q){ return fract(sin(dot(q, vec2(12.9898, 78.233)) + uSeed) * 43758.5453); }
void main(){ vec2 cell = floor(vUv * uSimDims / 7.); gl_FragColor = vec4(1., step(0.988, h(cell)), 0., 1.); }`;

const SIM = `precision highp float;
varying vec2 vUv;
uniform sampler2D uState; uniform vec2 uTexel; uniform float uFeed; uniform float uKill;
uniform vec2 uMouse; uniform vec2 uSimDims; uniform float uBrushR; uniform vec2 uSeedPos; uniform float uSeedR;
void main(){
  vec2 uv = vUv;
  vec2 c = texture2D(uState, uv).rg;
  vec2 lap = -c;
  lap += 0.2 * texture2D(uState, uv + vec2(uTexel.x, 0.)).rg;
  lap += 0.2 * texture2D(uState, uv - vec2(uTexel.x, 0.)).rg;
  lap += 0.2 * texture2D(uState, uv + vec2(0., uTexel.y)).rg;
  lap += 0.2 * texture2D(uState, uv - vec2(0., uTexel.y)).rg;
  lap += 0.05 * texture2D(uState, uv + uTexel).rg;
  lap += 0.05 * texture2D(uState, uv - uTexel).rg;
  lap += 0.05 * texture2D(uState, uv + vec2(uTexel.x, -uTexel.y)).rg;
  lap += 0.05 * texture2D(uState, uv + vec2(-uTexel.x, uTexel.y)).rg;
  float A = c.r, B = c.g;
  float reaction = A * B * B;
  float nextA = A + (1.0 * lap.r - reaction + uFeed * (1.0 - A));
  float nextB = B + (0.5 * lap.g + reaction - (uKill + uFeed) * B);
  float d = length((vUv - uMouse) * uSimDims);
  nextB = mix(nextB, 0.0, 1.0 - smoothstep(uBrushR * 0.4, uBrushR, d));
  float ds = length((vUv - uSeedPos) * uSimDims);
  nextB = max(nextB, (1.0 - smoothstep(uSeedR * 0.3, uSeedR, ds)) * 0.9);
  gl_FragColor = vec4(clamp(nextA, 0., 1.), clamp(nextB, 0., 1.), 0., 1.);
}`;

const VIEW = `precision highp float;
varying vec2 vUv;
uniform sampler2D uState; uniform vec2 uOffset; uniform float uOverscan; uniform float uLum;
void main(){
  vec2 uvZ = (vUv - 0.5) / uOverscan + 0.5 + uOffset;
  float B = texture2D(uState, uvZ).g;
  float mask = smoothstep(0.18, 0.22, B);
  gl_FragColor = vec4(vec3(mask * uLum), 1.0);
}`;

/** Screen uv (0..1, y up) → sim uv under the view's overscan + parallax offset. */
export function screenToSim(sx, sy, offset, overscan = BASE_OVERSCAN) {
  return [(sx - 0.5) / overscan + 0.5 + offset[0], (sy - 0.5) / overscan + 0.5 + offset[1]];
}

export function startRD(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false });
  if (!gl) return null;

  const hf = gl.getExtension('OES_texture_half_float');
  const hfLin = gl.getExtension('OES_texture_half_float_linear');
  gl.getExtension('EXT_color_buffer_half_float');
  const fl = gl.getExtension('OES_texture_float');
  const flLin = gl.getExtension('OES_texture_float_linear');
  gl.getExtension('WEBGL_color_buffer_float');
  const candidates = [];
  if (hf) candidates.push([hf.HALF_FLOAT_OES, !!hfLin]);
  if (fl) candidates.push([gl.FLOAT, !!flLin]);
  if (!candidates.length) return null;

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const shader = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const program = (fsrc, names) => {
    const pr = gl.createProgram();
    gl.attachShader(pr, shader(gl.VERTEX_SHADER, VS));
    gl.attachShader(pr, shader(gl.FRAGMENT_SHADER, fsrc));
    gl.bindAttribLocation(pr, 0, 'p');
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    const u = {};
    for (const n of names) u[n] = gl.getUniformLocation(pr, n);
    return { pr, u };
  };
  const simP = program(SIM, ['uState', 'uTexel', 'uFeed', 'uKill', 'uMouse', 'uSimDims', 'uBrushR', 'uSeedPos', 'uSeedR']);
  const initP = program(INIT, ['uSimDims', 'uSeed']);
  const viewP = program(VIEW, ['uState', 'uOffset', 'uOverscan', 'uLum']);

  const draw = () => {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const target = (tw, th, ty, lin) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    const f = lin ? gl.LINEAR : gl.NEAREST;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, tw, th, 0, gl.RGBA, ty, null);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { t, fb, ok };
  };
  const free = x => { if (x) { gl.deleteTexture(x.t); gl.deleteFramebuffer(x.fb); } };

  let w = 0, h = 0, read = null, write = null;
  const seedPos = [-10, -10];
  const step = mouseUv => {
    gl.useProgram(simP.pr);
    gl.uniform2f(simP.u.uTexel, 1 / w, 1 / h);
    gl.uniform1f(simP.u.uFeed, FEED);
    gl.uniform1f(simP.u.uKill, KILL);
    gl.uniform2f(simP.u.uSimDims, w, h);
    gl.uniform1f(simP.u.uBrushR, BRUSH_RADIUS);
    gl.uniform1f(simP.u.uSeedR, RESEED_RADIUS);
    gl.uniform2f(simP.u.uMouse, mouseUv[0], mouseUv[1]);
    gl.uniform2f(simP.u.uSeedPos, seedPos[0], seedPos[1]);
    gl.uniform1i(simP.u.uState, 0);
    gl.viewport(0, 0, w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, write.fb);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, read.t);
    draw();
    [read, write] = [write, read];
    seedPos[0] = seedPos[1] = -10; // a seed is live for one step only
  };

  // DPR capped at 1: the pattern is soft and upscaled anyway, and the reels need the GPU more.
  const build = () => {
    const cw = Math.max(1, Math.round(canvas.clientWidth));
    const ch = Math.max(1, Math.round(canvas.clientHeight));
    canvas.width = cw; canvas.height = ch;
    const aspect = cw / ch;
    const nw = aspect >= 1 ? SIM_MAX : Math.round(SIM_MAX * aspect);
    const nh = aspect >= 1 ? Math.round(SIM_MAX / aspect) : SIM_MAX;
    if (nw === w && nh === h && read) return true;
    free(read); free(write); read = write = null;
    for (const [ty, lin] of candidates) {
      const a = target(nw, nh, ty, lin), b = target(nw, nh, ty, lin);
      if (a.ok && b.ok) { read = a; write = b; break; }
      free(a); free(b);
    }
    if (!read) return false;
    w = nw; h = nh;
    gl.useProgram(initP.pr);
    gl.uniform2f(initP.u.uSimDims, w, h);
    gl.uniform1f(initP.u.uSeed, Math.random() * 100);
    gl.viewport(0, 0, w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, read.fb);
    draw();
    for (let i = 0; i < BURN_IN_STEPS; i++) step([-10, -10]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return true;
  };
  if (!build()) return null;

  // pointer → eased parallax target + erase brush
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const pointer = { x: 0.5, y: 0.5, inside: false };
  const offset = [0, 0];
  const onMove = e => {
    pointer.x = e.clientX / innerWidth;
    pointer.y = 1 - e.clientY / innerHeight;
    pointer.inside = true;
  };
  const onLeave = () => { pointer.inside = false; };
  if (finePointer) {
    addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
  }

  let clock = 0, nextSeed = RESEED_BASE_S, last = 0, raf = 0, running = false;
  const frame = now => {
    const dt = Math.min(0.1, last ? (now - last) / 1000 : 1 / 60);
    last = now;
    clock += dt;

    let tx, ty;
    if (finePointer) { tx = (pointer.x - 0.5) * 2 * PARALLAX_MAX; ty = (pointer.y - 0.5) * 2 * PARALLAX_MAX; }
    else {
      const t = (clock / IDLE_PERIOD_S) * Math.PI * 2;
      tx = Math.sin(t) * PARALLAX_MAX; ty = Math.sin(t * 1.5 + 1) * PARALLAX_MAX * 0.6;
    }
    offset[0] += (tx - offset[0]) * PARALLAX_EASE;
    offset[1] += (ty - offset[1]) * PARALLAX_EASE;

    if (clock >= nextSeed) {
      seedPos[0] = Math.random(); seedPos[1] = Math.random();
      nextSeed = clock + RESEED_BASE_S + (Math.random() * 2 - 1) * RESEED_JITTER_S;
    }
    const brush = finePointer && pointer.inside ? screenToSim(pointer.x, pointer.y, offset) : [-10, -10];
    for (let i = 0; i < STEPS_PER_FRAME; i++) step(brush);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(viewP.pr);
    gl.uniform2f(viewP.u.uOffset, offset[0], offset[1]);
    gl.uniform1f(viewP.u.uOverscan, BASE_OVERSCAN);
    gl.uniform1f(viewP.u.uLum, PATTERN_LUM);
    gl.uniform1i(viewP.u.uState, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, read.t);
    draw();
    if (running) raf = requestAnimationFrame(frame);
  };
  const start = () => { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); };
  const pause = () => { running = false; cancelAnimationFrame(raf); };
  const onVis = () => (document.hidden ? pause() : start());
  document.addEventListener('visibilitychange', onVis);

  let resizeTimer = 0;
  const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(build, 150); };
  addEventListener('resize', onResize);

  if (new URLSearchParams(location.search).has('debug')) window.__rdStep = () => frame(performance.now());
  if (!document.hidden) start();

  return {
    stop() {
      pause();
      document.removeEventListener('visibilitychange', onVis);
      removeEventListener('resize', onResize);
      removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    },
  };
}

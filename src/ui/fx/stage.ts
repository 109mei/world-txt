// eval と new Function を使わずに動かす（公開用の CSP は script-src 'self' のまま）
import 'pixi.js/unsafe-eval';
import 'pixi.js/graphics';
import { Container, Graphics, Sprite, Ticker, WebGLRenderer, type Texture } from 'pixi.js';
import { FX_HOST_ID } from './host';
import { blotMotes, bloomMotes, emberMotes, inkMotes, MOTE_MAX, sparkMotes, streakLanes, type Mote } from './pattern';

/**
 * PixiJS（WebGL）で描く演出（P19）。ふだんの画面は HTML と SVG のまま、その上に1枚の透明な描き場を重ね、
 * 何か起きたとき（書いた・1年進めた・効き始めた・想定外の変化・結末）だけ粒と光を描く。
 * 演出が終わったら ticker を止め、画面を離れたら描き場ごと片づける。粒の形は Graphics で作る（画像を読み込まない。worker も使わない）
 */

/** 粒の下地の半径（画面の点） */
const DOT_R = 16;
/** 光の筋の下地の大きさ */
const STREAK_W = 64;
const STREAK_H = 4;
/** 因果の線をたどる光の尾の粒の数 */
const TRAIL_TAIL = 8;
/** 色をかける下地（白）。演出の色は styles.css の変数から tint でかける */
const TINT_BASE = 0xffffff;

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Palette {
  ink: number;
  text: number;
  warn: number;
  bad: number;
  good: number;
  silver: number;
  /** 明るい画面（紙と墨）。光を足す重ね方ではなく、ふつうに重ねる */
  light: boolean;
}

interface Fx {
  /** 描く。まだ続くなら true */
  tick(now: number): boolean;
  destroy(): void;
}

/** 描き場の細かさの倍率（ふだんは 1。PV でカメラを寄せて撮るときだけ、テスト用の窓口から上げる） */
let scale = 1;
let renderer: WebGLRenderer | null = null;
let starting: Promise<WebGLRenderer | null> | null = null;
let root: Container | null = null;
let ticker: Ticker | null = null;
let tex: { dot: Texture; streak: Texture } | null = null;
const live = new Set<Fx>();
/** いま描いている粒の数（MOTE_MAX を超えない） */
let motes = 0;

/** 画面の色（styles.css の役割の変数。"166 205 255" の形）を読む */
function palette(): Palette | null {
  const cs = getComputedStyle(document.documentElement);
  const rgb = (name: string): number | null => {
    const m = /^(\d+)\s+(\d+)\s+(\d+)/u.exec(cs.getPropertyValue(name).trim());
    return m ? (Number(m[1]) << 16) | (Number(m[2]) << 8) | Number(m[3]) : null;
  };
  const [ink, text, warn, bad, good, silver, bg] = ['--ink-rgb', '--text-rgb', '--warn-rgb', '--bad-rgb', '--good-rgb', '--silver-rgb', '--bg-rgb'].map(rgb);
  if (ink == null || text == null || warn == null || bad == null || good == null || silver == null || bg == null) return null;
  const lum = ((bg >> 16) & 255) * 0.299 + ((bg >> 8) & 255) * 0.587 + (bg & 255) * 0.114;
  return { ink, text, warn, bad, good, silver, light: lum > 128 };
}

function host(): HTMLElement | null {
  return document.getElementById(FX_HOST_ID);
}

function mark(state: 'running' | 'idle'): void {
  const h = host();
  if (!h) return;
  h.dataset.fx = state;
  h.dataset.motes = String(motes);
}

function makeTextures(r: WebGLRenderer): { dot: Texture; streak: Texture } {
  // やわらかい粒：内側ほど濃い円を重ねる
  const g = new Graphics();
  for (let k = 0; k < 6; k++) g.circle(DOT_R, DOT_R, DOT_R * (1 - k / 6)).fill({ color: TINT_BASE, alpha: 0.12 + k * 0.03 });
  const dot = r.generateTexture({ target: g, resolution: 2, antialias: true });
  g.destroy();
  // 光の筋：尾は透明で、頭ほど明るい
  const s = new Graphics();
  const n = 16;
  for (let i = 0; i < n; i++) s.rect((i * STREAK_W) / n, 0, STREAK_W / n, STREAK_H).fill({ color: TINT_BASE, alpha: Math.pow((i + 1) / n, 2) });
  const streak = r.generateTexture({ target: s, resolution: 2, antialias: true });
  s.destroy();
  return { dot, streak };
}

function onResize(): void {
  renderer?.resize(window.innerWidth, window.innerHeight);
}

function onLost(e: Event): void {
  e.preventDefault();
  dispose();
}

async function create(): Promise<WebGLRenderer | null> {
  const h = host();
  if (!h) return null;
  const r = new WebGLRenderer();
  try {
    await r.init({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundAlpha: 0,
      antialias: false,
      resolution: Math.min(2, window.devicePixelRatio || 1) * scale,
      autoDensity: true,
      // 使う部品（粒と筋と輪）だけを読み込む。画像の読み込み・worker・読み上げの層は使わない
      skipExtensionImports: true,
      hello: false,
      powerPreference: 'low-power',
    });
  } catch {
    r.destroy();
    return null;
  }
  // 片づけが先に来ていたら、作った描き場は使わない
  if (starting === null || !host()) {
    r.destroy();
    return null;
  }
  r.canvas.setAttribute('aria-hidden', 'true');
  r.canvas.addEventListener('webglcontextlost', onLost);
  h.appendChild(r.canvas);
  root = new Container();
  tex = makeTextures(r);
  ticker = new Ticker();
  ticker.autoStart = false;
  ticker.add(frame);
  window.addEventListener('resize', onResize);
  renderer = r;
  mark('idle');
  return r;
}

async function ensure(): Promise<boolean> {
  if (renderer) return true;
  starting ??= create();
  const r = await starting;
  if (!r) starting = null;
  return r !== null;
}

/** 描き場の細かさの倍率を変える（次に作る描き場から。いまの描き場は片づける） */
export function setScale(n: number): void {
  scale = Math.max(0.5, Math.min(4, n));
  dispose();
}

/** 描き場を用意しておく（はじめの演出で固まらないよう、読み込んだ直後に作る） */
export function warm(): void {
  void ensure();
}

function frame(): void {
  if (!renderer || !root) return;
  const now = performance.now();
  for (const fx of [...live]) {
    if (!fx.tick(now)) {
      fx.destroy();
      live.delete(fx);
    }
  }
  renderer.render(root);
  if (live.size === 0) {
    // 何も描いていないときは止める（空の描き場を1度描いて消す）
    ticker?.stop();
    mark('idle');
  }
}

function play(build: (p: Palette, r: Container) => Fx | null): void {
  void ensure().then((ok) => {
    const p = palette();
    if (!ok || !root || !tex || !p) return;
    const fx = build(p, root);
    if (!fx) return;
    live.add(fx);
    mark('running');
    if (!ticker?.started) ticker?.start();
  });
}

/** 描き場を片づける（画面を離れたとき・画面が隠れたとき） */
export function dispose(): void {
  starting = null;
  for (const fx of live) fx.destroy();
  live.clear();
  motes = 0;
  ticker?.destroy();
  ticker = null;
  window.removeEventListener('resize', onResize);
  if (tex) {
    tex.dot.destroy(true);
    tex.streak.destroy(true);
    tex = null;
  }
  root?.destroy({ children: true });
  root = null;
  if (renderer) {
    renderer.canvas.removeEventListener('webglcontextlost', onLost);
    renderer.canvas.remove();
    renderer.destroy();
    renderer = null;
  }
  const h = host();
  if (h) {
    delete h.dataset.fx;
    delete h.dataset.motes;
  }
}

// ---------------------------------------------------------------- 粒の群れ

interface Style {
  tex: Texture;
  blend: 'add' | 'normal';
  color: (m: Mote) => number;
  /** 明るさ（k は生まれてから消えるまでの割合 0〜1） */
  alpha: (m: Mote, k: number) => number;
  /** 動き（t は現れてからの秒）。場所のずれと半径（画面の点） */
  move: (m: Mote, t: number, k: number) => { dx: number; dy: number; r: number };
}

function field(list: readonly Mote[], box: Box, style: Style, into: Container): Fx | null {
  const room = Math.max(0, MOTE_MAX - motes);
  const ms = list.slice(0, room);
  if (ms.length === 0) return null;
  const layer = new Container();
  const sprites = ms.map((m) => {
    const s = new Sprite(style.tex);
    s.anchor.set(0.5);
    s.tint = style.color(m);
    s.blendMode = style.blend;
    s.visible = false;
    layer.addChild(s);
    return s;
  });
  into.addChild(layer);
  motes += ms.length;
  const t0 = performance.now();
  return {
    tick(now) {
      const e = now - t0;
      let alive = false;
      for (let i = 0; i < ms.length; i++) {
        const m = ms[i]!;
        const s = sprites[i]!;
        const t = e - m.delay;
        if (t < 0) {
          alive = true;
          continue;
        }
        if (t > m.life) {
          s.visible = false;
          continue;
        }
        alive = true;
        const k = t / m.life;
        const p = style.move(m, t / 1000, k);
        s.visible = true;
        s.position.set(box.left + m.x * box.width + p.dx, box.top + m.y * box.height + p.dy);
        s.scale.set(p.r / DOT_R);
        s.alpha = Math.max(0, Math.min(1, style.alpha(m, k)));
      }
      return alive;
    },
    destroy() {
      motes -= ms.length;
      layer.destroy({ children: true });
    },
  };
}

/** いくつかの演出を1つにまとめる（どれかが続くあいだ続く） */
function group(parts: (Fx | null)[]): Fx | null {
  const list = parts.filter((p): p is Fx => p !== null);
  if (list.length === 0) return null;
  const done = new Set<Fx>();
  return {
    tick(now) {
      let alive = false;
      for (const p of list) {
        if (done.has(p)) continue;
        if (p.tick(now)) alive = true;
        else done.add(p);
      }
      return alive;
    },
    destroy() {
      for (const p of list) p.destroy();
    },
  };
}

const fadeInOut = (k: number, inPart: number, outPart: number): number => Math.min(1, k / inPart, (1 - k) / outPart);
const easeOut = (k: number): number => 1 - Math.pow(1 - k, 3);

function boxOf(r: DOMRect): Box {
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

// ---------------------------------------------------------------- 演出

/** 書いた瞬間：行の上に、インクが左から右へにじんで散る。ペン先の光が行をなぞる */
export function ink(text: string, rect: DOMRect): void {
  play((p, into) => {
    const box = boxOf(rect);
    const blend = p.light ? 'normal' : 'add';
    const drops = field(
      inkMotes(text),
      box,
      {
        tex: tex!.dot,
        blend,
        color: (m) => (m.tone < 0.78 ? p.ink : p.text),
        alpha: (m, k) => fadeInOut(k, 0.08, 0.6) * (0.7 + 0.3 * m.tone),
        // 少し舞い上がってから、ゆっくり落ちる
        move: (m, t, k) => ({ dx: m.vx * t * (1 - 0.4 * k), dy: m.vy * t + 70 * t * t, r: m.size * (1 - 0.35 * k) }),
      },
      into,
    );
    const blots = field(
      blotMotes(text),
      box,
      {
        tex: tex!.dot,
        blend,
        color: () => p.ink,
        alpha: (_m, k) => fadeInOut(k, 0.15, 0.7) * (p.light ? 0.18 : 0.26),
        move: (m, _t, k) => ({ dx: 0, dy: 0, r: m.size * (0.4 + 0.6 * easeOut(k)) }),
      },
      into,
    );
    return group([drops, blots, pen(box, p, into)]);
  });
}

/** ペン先の光：行の左から右へ、書くようになぞる */
function pen(box: Box, p: Palette, into: Container): Fx {
  const s = new Sprite(tex!.streak);
  s.anchor.set(1, 0.5);
  s.tint = p.ink;
  s.blendMode = p.light ? 'normal' : 'add';
  s.scale.set(48 / STREAK_W, 3 / STREAK_H);
  into.addChild(s);
  const t0 = performance.now();
  const MS = 320;
  return {
    tick(now) {
      const k = (now - t0) / MS;
      if (k > 1.4) return false;
      s.position.set(box.left + box.width * easeOut(Math.min(1, k)), box.top + box.height * 0.55);
      s.alpha = k <= 1 ? 0.9 : Math.max(0, (1.4 - k) / 0.4) * 0.9;
      return true;
    },
    destroy() {
      s.destroy();
    },
  };
}

/** 効き始め：散らばった粒が、書いた一文の姿へ吸い寄せられて集まり、灯って消える */
export function bloom(text: string, rect: DOMRect): void {
  play((p, into) =>
    field(
      bloomMotes(text),
      boxOf(rect),
      {
        tex: tex!.dot,
        blend: p.light ? 'normal' : 'add',
        color: (m) => (m.tone < 0.85 ? p.ink : p.text),
        alpha: (_m, k) => (k < 0.8 ? 0.25 + 0.75 * (k / 0.8) : (1 - k) / 0.2),
        move: (m, _t, k) => {
          const g = 1 - easeOut(Math.min(1, k / 0.8));
          return { dx: m.vx * g, dy: m.vy * g, r: m.size * (k < 0.8 ? 1 : 1 + 1.5 * ((k - 0.8) / 0.2)) };
        },
      },
      into,
    ),
  );
}

/**
 * 早回し：時間が速く流れるあいだ、光の筋が左から右へ流れる（モーションブラー）。
 * 年の数字の周りをあけて、上と下の帯だけに流す。active が false になったら（演出を飛ばした・終えた）うすれて消える
 */
export function streaks(key: string, rect: DOMRect, ms: number, active: () => boolean): void {
  play((p, into) => {
    const lanes = streakLanes(key).slice(0, Math.max(0, MOTE_MAX - motes));
    if (lanes.length === 0) return null;
    const box = boxOf(rect);
    const layer = new Container();
    const sprites = lanes.map((l, i) => {
      const s = new Sprite(tex!.streak);
      s.anchor.set(1, 0.5);
      s.tint = i % 4 === 0 ? p.ink : p.silver;
      s.blendMode = p.light ? 'normal' : 'add';
      s.scale.set((l.length * box.width) / STREAK_W, l.thickness / STREAK_H);
      s.visible = false;
      layer.addChild(s);
      return s;
    });
    into.addChild(layer);
    motes += lanes.length;
    const t0 = performance.now();
    let endAt = t0 + ms;
    const FADE = 220;
    return {
      tick(now) {
        if (!active() && endAt > now + FADE) endAt = now + FADE;
        if (now > endAt) return false;
        const e = now - t0;
        const env = Math.min(1, e / 140, (endAt - now) / FADE);
        for (let i = 0; i < lanes.length; i++) {
          const l = lanes[i]!;
          const s = sprites[i]!;
          const t = e - l.delay;
          if (t < 0) continue;
          const span = box.width * (1 + l.length);
          const x = ((t / 1000) * l.speed * box.width) % span;
          s.visible = true;
          s.position.set(box.left + x, box.top + l.y * box.height);
          s.alpha = l.alpha * env;
        }
        return true;
      },
      destroy() {
        motes -= lanes.length;
        layer.destroy({ children: true });
      },
    };
  });
}

/** 因果の線：伸びていく線の先を、光の粒が尾を引いてたどる（線の伸び方と同じ速さ。着いたらうすれて消える） */
export function trail(points: readonly { x: number; y: number }[], delay: number, ms: number, surprise: boolean): void {
  if (points.length < 2) return;
  play((p, into) => {
    const N = TRAIL_TAIL;
    if (MOTE_MAX - motes < N) return null;
    const layer = new Container();
    const sprites = Array.from({ length: N }, () => {
      const s = new Sprite(tex!.dot);
      s.anchor.set(0.5);
      s.tint = surprise ? p.warn : p.ink;
      s.blendMode = p.light ? 'normal' : 'add';
      s.visible = false;
      layer.addChild(s);
      return s;
    });
    into.addChild(layer);
    motes += N;
    const at = (k: number) => {
      const f = Math.max(0, Math.min(1, k)) * (points.length - 1);
      const i = Math.floor(f);
      const a = points[i]!;
      const b = points[Math.min(points.length - 1, i + 1)]!;
      const u = f - i;
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
    };
    const t0 = performance.now();
    const FADE = 260;
    return {
      tick(now) {
        const t = now - t0 - delay;
        if (t < 0) return true;
        if (t > ms + FADE) return false;
        // 線は ease-out で伸びる（Chain.tsx の Web Animations と同じ）
        const head = easeOut(Math.min(1, t / ms));
        const fade = t > ms ? 1 - (t - ms) / FADE : 1;
        for (let i = 0; i < N; i++) {
          const s = sprites[i]!;
          const k = head - i * 0.04;
          if (k < 0) {
            s.visible = false;
            continue;
          }
          const q = at(k);
          s.visible = true;
          s.position.set(q.x, q.y);
          s.scale.set((i === 0 ? 4.5 : 3.2 - i * 0.3) / DOT_R);
          s.alpha = (1 - i / N) * fade * 0.95;
        }
        return true;
      },
      destroy() {
        motes -= N;
        layer.destroy({ children: true });
      },
    };
  });
}

/** 衝撃：輪が広がり、色がずれて（色収差）、火花が散る。small は因果の線の着いた所の小さな衝撃 */
export function shock(key: string, rect: DOMRect, small: boolean): void {
  play((p, into) => {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const R = small ? 26 : Math.max(40, Math.min(rect.width, rect.height) * 0.48);
    const MS = small ? 440 : 760;
    const blend = p.light ? 'normal' : 'add';
    // 3色の輪を少しずつずらして重ねる（赤と金と青の色ずれ）
    const rings = [
      { color: p.bad, dx: -2, dy: 0 },
      { color: p.warn, dx: 0, dy: 1 },
      { color: p.ink, dx: 2, dy: 0 },
    ].map((c) => {
      const g = new Graphics();
      g.blendMode = blend;
      into.addChild(g);
      return { g, ...c };
    });
    const t0 = performance.now();
    const wave: Fx = {
      tick(now) {
        const k = (now - t0) / MS;
        if (k > 1) return false;
        const r = R * easeOut(k);
        const w = (small ? 2 : 3.5) * (1 - k) + 0.6;
        const a = Math.pow(1 - k, 1.2) * (p.light ? 0.7 : 0.85);
        for (const ring of rings)
          ring.g
            .clear()
            .circle(cx + ring.dx * (1 + k * 2), cy + ring.dy, r)
            .stroke({ width: w, color: ring.color, alpha: a });
        return true;
      },
      destroy() {
        for (const ring of rings) ring.g.destroy();
      },
    };
    const sparks = field(
      sparkMotes(key, small ? 14 : 28),
      { left: cx, top: cy, width: 0, height: 0 },
      {
        tex: tex!.dot,
        blend,
        color: (m) => (m.tone < 0.5 ? p.warn : p.bad),
        alpha: (_m, k) => 1 - k,
        move: (m, t) => {
          const d = (1 - Math.exp(-3.2 * t)) / 3.2;
          return { dx: m.vx * d * (small ? 0.5 : 1), dy: m.vy * d * (small ? 0.5 : 1), r: m.size };
        },
      },
      into,
    );
    return group([wave, sparks]);
  });
}

/** 結末：救えた世界は画面のあちこちから光の粒が昇り、崩れた世界は灰が降る（数秒で消え、動き続けない） */
export function ending(key: string, cleared: boolean): void {
  play((p, into) =>
    field(
      emberMotes(key, cleared),
      { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight },
      {
        tex: tex!.dot,
        blend: p.light ? 'normal' : 'add',
        color: (m) => (cleared ? (m.tone < 0.62 ? p.warn : m.tone < 0.86 ? p.good : p.text) : m.tone < 0.84 ? p.silver : p.bad),
        alpha: (_m, k) => fadeInOut(k, 0.15, 0.35) * (cleared ? 0.85 : 0.7),
        move: (m, t) => ({ dx: m.vx * t + m.sway * Math.sin(Math.PI * 2 * (0.25 + 0.45 * m.tone) * t + m.tone * 6), dy: m.vy * t, r: m.size }),
      },
      into,
    ),
  );
}

import { useGame } from '../../store/game';

/**
 * PixiJS の演出の窓口（P19）。PixiJS は演出の部品（./stage）だけが使い、はじめて演出を出す前に後から読み込む（動的 import）。
 * WebGL が使えない端末・動きを減らす設定・「情景を動かす」OFF・画面が隠れているときは PixiJS を起動せず、
 * 今の SVG と CSS の演出だけにする（PixiJS の演出は、その上に重ねる飾り）
 */
type Stage = typeof import('./stage');

let loading: Promise<Stage | null> | null = null;
let webgl: boolean | null = null;

/** この端末で WebGL が使えるか（1度だけ確かめ、確かめた描き場は手放す） */
function webglOk(): boolean {
  if (webgl !== null) return webgl;
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') ?? c.getContext('webgl')) as WebGLRenderingContext | null;
    webgl = gl !== null;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webgl = false;
  }
  return webgl;
}

function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true;
  }
}

/** いま PixiJS の演出を出してよいか */
export function fxAllowed(): boolean {
  if (typeof document === 'undefined' || document.hidden) return false;
  if (!useGame.getState().settings.motion || reducedMotion()) return false;
  return webglOk();
}

function load(): Promise<Stage | null> {
  loading ??= import('./stage').catch(() => null);
  return loading;
}

/** 演出を出す前に、PixiJS を読み込んで描き場を用意しておく（世界の画面を開いたとき） */
export function preloadFx(): void {
  if (!fxAllowed()) return;
  void load().then((s) => s?.warm());
}

/** 描き場を片づける（演出を出す画面を離れたとき・画面が隠れたとき）。次の演出で作り直す */
export function disposeFx(): void {
  if (!loading) return;
  void loading.then((s) => s?.dispose());
}

/** 描き場の細かさの倍率を変える（テスト用の窓口から。PV でカメラを寄せて撮るとき） */
export function setFxScale(n: number): void {
  void load().then((s) => s?.setScale(n));
}

function run(play: (s: Stage) => void): void {
  if (!fxAllowed()) return;
  void load().then((s) => {
    if (s && fxAllowed()) play(s);
  });
}

/** 書いた瞬間：書いた行の上に、インクが左から右へにじんで散る */
export function fxInk(text: string, rect: DOMRect): void {
  run((s) => s.ink(text, rect));
}

/** 効き始め：散らばった粒が、書いた一文の姿へ集まる */
export function fxBloom(text: string, rect: DOMRect): void {
  run((s) => s.bloom(text, rect));
}

/** 早回し：時間が速く流れるあいだ、光の筋が横に流れる（ms は計算の演出の長さ。飛ばしたら active が false になり、うすれて消える） */
export function fxStreaks(key: string, rect: DOMRect, ms: number, active: () => boolean): void {
  run((s) => s.streaks(key, rect, ms, active));
}

/** 因果の線：伸びていく線の先を、光の粒がたどる（points は画面の座標。delay と ms は線の伸び方に合わせる） */
export function fxTrail(points: readonly { x: number; y: number }[], delay: number, ms: number, surprise: boolean): void {
  run((s) => s.trail(points, delay, ms, surprise));
}

/** 衝撃：輪が広がり、色がずれる（想定外の変化・重大な出来事）。small は因果の線の着いた所 */
export function fxShock(key: string, rect: DOMRect, small = false): void {
  run((s) => s.shock(key, rect, small));
}

/** 結末：救えた世界は光の粒が昇り、崩れた世界は灰が降る */
export function fxEnding(key: string, cleared: boolean): void {
  run((s) => s.ending(key, cleared));
}

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { chromium, type Frame } from '@playwright/test';

/**
 * 紹介用の PV（縦 1080×1920・約97秒）のコマを録る。
 * 舞台（scripts/pv/stage.html）に本物のゲーム（暗い画面）を画面いっぱいに置き、カメラで見どころへ寄せ、
 * 字幕と解説の線で遊び方と見どころを見せる。切り替えは BGM の小節の頭（scripts/pv/beats.ts で調べた約1.596秒ごと）に合わせる。
 * 効果音・閃光・揺れ・残像を入れる時刻（cue）は index.json に残し、scripts/pv/encode.ts が音と仕上げを足して MP4 にする。
 * 録るのは、このページが描いたコマだけ（Chrome の開発用の機能 Page.startScreencast。画面全体やほかのアプリは映らない）。
 * 使い方：npm run dev でゲームを動かしてから npx tsx scripts/pv/record.ts → npx tsx scripts/pv/encode.ts
 */
const GAME = process.env.PV_GAME ?? 'http://localhost:5174/world-txt/';
const PORT = 4310;
const FRAMES = join('pv', 'frames');
/** BGM の小節の頭（秒）：0.08 + 1.5963 × k */
const bar = (k: number) => 0.08 + 1.5963 * k;
const FADE_OUT_AT = bar(58);
const END = bar(61);
/** 字幕の下の、カメラで見せる所（舞台の座標） */
const REGION = { x: 30, y: 540, w: 1020, h: 1340 };
/** 画面の幅いっぱいに見せる倍率（左右に余白を出さない） */
const MIN_S = 1080 / 390;

const server = createServer((req, res) => {
  const path = decodeURIComponent((req.url ?? '/').split('?')[0]!);
  const file = path === '/' ? 'scripts/pv/stage.html' : null;
  if (!file || !existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(readFileSync(file));
});
await new Promise<void>((r) => server.listen(PORT, r));
rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
// ゲームは暗い画面（夜の黒と銀）で見せる
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1, colorScheme: 'dark' });
await page.goto(`http://localhost:${PORT}/`);
// tsx は関数に名前をつける補助（__name）を差し込むので、ページの側にも置く
await page.evaluate('window.__name = (f) => f');
await page.evaluate(() => document.fonts.ready);

type Cam = { x: number; y: number; s: number };
type Rect = { x: number; y: number; w: number; h: number };
type Callout = Rect & { lx: number; ly: number; text: string };
type PV = {
  caption(m: string, s: string, l: string, instant?: boolean): void;
  card(p: [string, string][]): void;
  hideCard(): void;
  setGame(u: string): void;
  camera(c: Cam, dur: number, then: Cam | null, hold: number, ease?: string): void;
  tilt(deg: number, dur: number): void;
  callouts(items: Callout[], gap: number): void;
  clearCallouts(): void;
};
const cap = (main: string, sub = '', label = '', instant = false) => page.evaluate(([m, s, l, i]) => (window as unknown as { pv: PV }).pv.caption(m, s, l, i), [main, sub, label, instant] as const);
const card = (parts: [string, string][]) => page.evaluate((p) => (window as unknown as { pv: PV }).pv.card(p), parts);
const hideCard = () => page.evaluate(() => (window as unknown as { pv: PV }).pv.hideCard());
const setGame = (u: string) => page.evaluate((x) => (window as unknown as { pv: PV }).pv.setGame(x), u);
const camera = (c: Cam, dur: number, then: Cam | null = null, hold = 0, ease?: string) =>
  page.evaluate((a) => (window as unknown as { pv: PV }).pv.camera(a.c, a.dur, a.then, a.hold, a.ease), { c, dur, then, hold, ease });
const tilt = (deg: number, dur: number) => page.evaluate(([d, t]) => (window as unknown as { pv: PV }).pv.tilt(d, t), [deg, dur] as const);
const callouts = (items: Callout[], gap: number) => page.evaluate((a) => (window as unknown as { pv: PV }).pv.callouts(a.items, a.gap), { items, gap });
const clearCallouts = () => page.evaluate(() => (window as unknown as { pv: PV }).pv.clearCallouts());

const G = page.frameLocator('#game');
const frame = async (): Promise<Frame> => (await (await page.$('#game'))!.contentFrame())!;
/** PV の間だけ隠す物（情景の「名前」のスイッチ） */
const hideUi = async () => (await frame()).addStyleTag({ content: '.scene-names { visibility: hidden !important; }' });
/** 情景の名前の札を出すか（解説の場面だけ出し、絵だけの画では隠す） */
const labels = async (show: boolean) =>
  (await frame()).evaluate((s) => {
    const old = document.getElementById('pv-labels');
    if (s) old?.remove();
    else if (!old) {
      const el = document.createElement('style');
      el.id = 'pv-labels';
      el.textContent = '.scene-labels { display: none !important; }';
      document.head.append(el);
    }
  }, show);
/** ゲームの頭と世界の寿命を隠すか（情景の上の端に寄る画で、絵の上にある UI の文字が字幕の後ろに透けないように） */
const chrome = async (show: boolean) =>
  (await frame()).evaluate((s) => {
    const old = document.getElementById('pv-chrome');
    if (s) old?.remove();
    else if (!old) {
      const el = document.createElement('style');
      el.id = 'pv-chrome';
      el.textContent = '.game-head, [data-testid="life"] { visibility: hidden !important; }';
      document.head.append(el);
    }
  }, show);
/** ゲームの押す物を押す（カメラで寄せると押す物が画面の外に出るので、マウスではなくページの中から押す） */
const tap = async (id: string) =>
  (await frame()).waitForFunction(
    (i) => {
      const el = document.querySelector(`[data-testid="${i}"]`) as HTMLElement | null;
      if (!el) return false;
      el.click();
      return true;
    },
    id,
    { timeout: 8000, polling: 100 },
  );
/** 1字ずつ打つ */
const typeText = async (sel: string, text: string, delay: number) => {
  await (await frame()).focus(sel);
  await page.keyboard.type(text, { delay });
};
const dbg = async <T = unknown>(code: string): Promise<T> => (await frame()).evaluate(`(() => window.__wtxt.${code})()`) as Promise<T>;
const scrollGame = async (top: number | 'end', smooth = false) =>
  (await frame()).evaluate(
    ([t, s]) => {
      const el = document.querySelector('.game-body') ?? document.scrollingElement!;
      el.scrollTo({ top: t === 'end' ? el.scrollHeight : (t as number), behavior: s ? 'smooth' : 'auto' });
    },
    [top, smooth] as const,
  );
/** ゲームの中の要素（いくつか）を囲む箱（ゲームの座標） */
const rectOf = async (sels: string[]): Promise<Rect | null> =>
  (await frame()).evaluate((ss) => {
    const rs = ss
      .flatMap((s) => [...document.querySelectorAll(s)])
      .map((e) => e.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0);
    if (rs.length === 0) return null;
    const x1 = Math.min(...rs.map((r) => r.left));
    const y1 = Math.min(...rs.map((r) => r.top));
    const x2 = Math.max(...rs.map((r) => r.right));
    const y2 = Math.max(...rs.map((r) => r.bottom));
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }, sels);
/** 箱を、見せる所に収めるカメラ（左右と下に余白を出さない。上は字幕の帯の下まで） */
const fit = (r: Rect, region = REGION, maxS = 4.2, minS = MIN_S): Cam => {
  const s = Math.max(minS, Math.min(maxS, Math.min(region.w / r.w, region.h / r.h)));
  let x = region.x + (region.w - r.w * s) / 2 - r.x * s;
  let y = region.y + (region.h - r.h * s) / 2 - r.y * s;
  x = Math.min(0, Math.max(1080 - 390 * s, x));
  y = Math.min(560, Math.max(1920 - 844 * s, y));
  return { x, y, s };
};
/** 箱が見せる所を覆うまで寄せるカメラ（絵に寄るとき。はみ出した所は切れる） */
const cover = (r: Rect, region = REGION, maxS = 6): Cam => {
  const s = Math.max(MIN_S, Math.min(maxS, Math.max(region.w / r.w, region.h / r.h)));
  let x = region.x + (region.w - r.w * s) / 2 - r.x * s;
  let y = region.y + (region.h - r.h * s) / 2 - r.y * s;
  x = Math.min(0, Math.max(1080 - 390 * s, x));
  y = Math.min(560, Math.max(1920 - 844 * s, y));
  return { x, y, s };
};
/** 情景の絵の中の決めた場所（絵の幅と高さに対する割合） */
const sceneCrop = (st: Rect, fx: number, fy: number, fw: number, fh: number): Rect => ({ x: st.x + st.w * fx, y: st.y + st.h * fy, w: st.w * fw, h: st.h * fh });
/** 画面全体（字幕の下も含む） */
const FULL = { x: 0, y: 0, w: 1080, h: 1920 };
/** 絵を覆うまで寄せて、左から右へ流す（UI の映らない画） */
const sceneTruck = async (hold: number, maxS = 9, dur = 0.8, region = FULL): Promise<void> => {
  const st = await rectOf(['[data-testid="scene-stage"]']);
  if (!st) return;
  const c = cover(st, region, maxS);
  const from = { ...c, x: Math.min(0, -st.x * c.s) };
  const to = { ...c, x: Math.max(1080 - 390 * c.s, 1080 - (st.x + st.w) * c.s) };
  await camera(from, dur, to, hold, 'linear');
};
/** 押し込み：見せる所の中心を保ったまま k だけ寄る */
const push = (c: Cam, k: number, region = REGION): Cam => {
  const cx = region.x + region.w / 2;
  const cy = region.y + region.h / 2;
  const px = (cx - c.x) / c.s;
  const py = (cy - c.y) / c.s;
  const s = c.s * (1 + k);
  return { x: Math.min(0, Math.max(1080 - 390 * s, cx - px * s)), y: Math.min(560, Math.max(1920 - 844 * s, cy - py * s)), s };
};
/** ゲームの箱を舞台の座標へ */
const onStage = (c: Cam, r: Rect): Rect => ({ x: c.x + r.x * c.s, y: c.y + r.y * c.s, w: r.w * c.s, h: r.h * c.s });
/** 要素へ寄せる（dur 秒で移り、hold 秒かけて k だけ押し込む） */
const shot = async (sels: string[], o: { dur?: number; maxS?: number; k?: number; hold?: number; region?: typeof REGION; ease?: string } = {}): Promise<Cam | null> => {
  const r = await rectOf(sels);
  if (!r) {
    console.log('見つからない', sels.join(' '));
    return null;
  }
  const region = o.region ?? REGION;
  const c = fit(r, region, o.maxS ?? 4.2);
  await camera(c, o.dur ?? 0.9, o.k ? push(c, o.k, region) : null, o.hold ?? 0, o.ease);
  return c;
};

// 効果音・閃光・揺れ・残像を入れる時刻（encode.ts が読む）
type Cue = { t: number; kind: 'whoosh' | 'impact' | 'flash' | 'shake' | 'riser' | 'braam' | 'type' | 'stinger' | 'whip' | 'tick'; dur?: number; amp?: number; n?: number; step?: number };
const cues: Cue[] = [];
let t0 = 0;
const cue = (kind: Cue['kind'], o: Omit<Cue, 't' | 'kind'> = {}, when?: number) => cues.push({ t: when ?? (Date.now() - t0) / 1000, kind, ...o });
const at = async (sec: number) => {
  const wait = t0 + sec * 1000 - Date.now();
  if (wait > 0) await page.waitForTimeout(wait);
  else if (wait < -400) console.log(`遅れ：${sec.toFixed(2)}秒の所で ${(-wait / 1000).toFixed(1)}秒`);
};

// ---- 下ごしらえ（録る前）：すべて自由な筆・実績と新発見を先に得る・情景の名前を消す（はじめの画は HUD のない世界の絵）
const url = `${GAME}?seed=7&debug=1`;
await setGame(url);
await G.getByTestId('title').waitFor();
await hideUi();
await dbg('clears(7)');
await dbg("start('food')");
await G.getByTestId('game').waitFor();
await dbg("add('人間は空を飛べる。')");
await dbg("start('food')");
await G.getByTestId('game').waitFor();
await labels(false);
await page.waitForTimeout(5000);
// はじめの画：情景の絵を高さいっぱいに広げ、左の端に置く（そこから右へ流す）
const scene0 = (await rectOf(['[data-testid="scene-stage"]']))!;
const sE = 1920 / scene0.h;
const est0: Cam = { x: -scene0.x * sE, y: -scene0.y * sE, s: sE };
const est1: Cam = { x: 1080 - (scene0.x + scene0.w) * sE, y: est0.y, s: sE };
await camera(est0, 0);
await page.waitForTimeout(1500);

// このページが描いたコマを受け取る（届いた時刻つき）
const cdp = await page.context().newCDPSession(page);
const frames: { t: number; f: string }[] = [];
cdp.on('Page.screencastFrame', (e) => {
  const f = `${String(frames.length).padStart(5, '0')}.jpg`;
  writeFileSync(join(FRAMES, f), Buffer.from(e.data, 'base64'));
  frames.push({ t: e.metadata.timestamp ?? Date.now() / 1000, f });
  cdp.send('Page.screencastFrameAck', { sessionId: e.sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
await page.waitForTimeout(500);
t0 = Date.now();
const start = t0 / 1000;

// ==== はじめの画（HUD のない世界を横に流す）
await at(bar(0));
await hideCard();
await camera(est0, 0, est1, bar(4) - bar(0) + 0.15, 'cubic-bezier(0.55, 0, 0.9, 0.35)');
await at(bar(1));
await cap('未来は\n決まっている');
await at(bar(2.5));
await cap('未来は\n決まっている', '世界のすべてを知る悪魔には\n明日が見えている');

// ==== つかみ
await at(bar(4));
cue('impact');
cue('flash');
await cap('');
await card([['l1', 'もしも\n世界の決まりを\n書き換えられたら']]);
await at(bar(6) - 0.25);
cue('whoosh');
await at(bar(6));
await card([
  ['l1', 'この世界は\n文章でできている'],
  ['logo', 'WORLD.txt'],
  ['l2', '一行一行が世界の決まり'],
]);

// ==== 題（飛び出す絵本）
await at(bar(8) - 0.55);
await setGame(`${url}&v=title`);
await G.getByTestId('title').waitFor();
await hideUi();
// 題：少し寄った所から引いていき、下へ下りる（引きの画で世界を見せる）
const sT = MIN_S * 1.28;
await camera({ x: (1080 - 390 * sT) / 2, y: -40, s: sT }, 0, { x: 0, y: -260, s: MIN_S }, bar(11) - bar(8), 'cubic-bezier(0.25, 0, 0.3, 1)');
await at(bar(8));
cue('impact');
cue('flash');
await hideCard();

// ==== 遊び方 1：世界を読む（解説の線）
await at(bar(11) - 0.3);
cue('whip', { dur: 0.35 });
cue('whoosh');
await dbg("start('food')");
await G.getByTestId('game').waitFor();
await labels(true);
const a1 = await shot(['[data-testid="life"]', '[data-testid="scene"]'], { dur: 0.35, maxS: MIN_S });
await cap('世界を読む', '悪くなっている所が手がかり', '遊び方 1');
await at(bar(11) + 0.7);
if (a1) {
  const items: Callout[] = [];
  const life = await rectOf(['[data-testid="life"]']);
  const scene = await rectOf(['[data-testid="scene-stage"]', '[data-testid="scene"] .scene-frame']);
  if (life) {
    const L = onStage(a1, life);
    items.push({ ...L, lx: L.x + L.w * 0.7, ly: L.y + L.h + 150, text: '世界の寿命' });
  } else console.log('線を引けない：世界の寿命');
  if (scene) {
    const S = onStage(a1, scene);
    items.push({ ...S, lx: S.x + S.w * 0.32, ly: S.y + S.h + 110, text: 'いまの世界の姿' });
  } else console.log('線を引けない：情景');
  await callouts(items, 0.8);
}
await at(bar(13));
await clearCallouts();
await scrollGame(300);
const a2 = await shot(['[data-testid="headline"]', '[data-testid="pillars"]'], { dur: 0.8, maxS: MIN_S });
await at(bar(13) + 0.9);
if (a2) {
  const items: Callout[] = [];
  const head = await rectOf(['[data-testid="headline"]']);
  const pil = await rectOf(['[data-testid="pillars"]']);
  if (head) {
    const Hd = onStage(a2, head);
    items.push({ ...Hd, lx: Hd.x + Hd.w * 0.5, ly: Hd.y - 50, text: '人類文明のようす' });
  } else console.log('線を引けない：人類文明のようす');
  if (pil) {
    const P = onStage(a2, pil);
    items.push({ ...P, lx: P.x + P.w * 0.5, ly: Math.min(1860, P.y + P.h + 90), text: '4つの柱　命・糧・社会・大地' });
  } else console.log('線を引けない：4つの柱');
  await callouts(items, 0.8);
}

// ==== 遊び方 2：法則を書き換える（1字ずつ）
await at(bar(15) - 0.2);
cue('whoosh');
await at(bar(15));
await clearCallouts();
await tap('tab-laws');
await scrollGame('end');
await cap('法則を書き換える', '選択肢はない\n自由な文章で書く', '遊び方 2');
await shot(['[data-testid="add-line"]'], { dur: 0.8, maxS: 3.4, k: 0.08, hold: 1.4 });
await at(bar(16));
await tap('add-line');
await page.waitForTimeout(250);
await shot(['[data-testid="editor"]', '[data-testid="world-reading"]'], { dur: 0.5, maxS: 3.6 });
await at(bar(16) + 0.5);
cue('type', { n: 8, step: 0.17 });
await typeText('[data-testid="editor"]', '人間は空を飛べる', 170);
await at(bar(17));
await cap('法則を書き換える', '世界が言葉を読み取る', '遊び方 2');
await at(bar(18));
await tap('write');
cue('stinger', { amp: 0.5 });
await page.waitForTimeout(200);
await shot(['[data-testid="toast"]'], { dur: 0.5, maxS: 3.6 });

// ==== 遊び方 3：時間を進める
await at(bar(19));
await cap('時間を進める', '悪魔が決まりどおりに\n1年を計算する', '遊び方 3');
cue('riser', { dur: bar(20) - bar(19) });
await camera({ x: 0, y: (1920 - 844 * MIN_S) / 2, s: MIN_S }, 0.5);
await at(bar(20) - 1.5);
await tap('advance');
await G.getByTestId('report-sheet').waitFor();
await at(bar(20));
cue('impact');
cue('flash');
cue('shake', { dur: 0.25, amp: 14 });
await cap('書いた一文が\n世界になる', '人々が空を飛び始めた', '遊び方 3');
await shot(['[data-testid="report-scene"]', '[data-testid="onset"]'], { dur: 0.5, k: 0.1, hold: 4 });

// ==== 空を行く人々
await at(bar(23) - 0.2);
cue('whoosh');
await at(bar(23));
await tap('report-ok');
await tap('tab-world');
await scrollGame(0);
await labels(false);
await sceneTruck(bar(26) - bar(23));
await cap('空を行く人々', '同じ書き方なら\n誰がやっても同じ未来');

// ==== 見どころ：因果（3年後）
await at(bar(26) - 0.2);
cue('whoosh');
await at(bar(26));
await cap('');
await card([['l1', '3年後']]);
for (let i = 0; i < 4; i++) {
  const st = await dbg<{ year: number }>('state()');
  if (st.year >= 4) break;
  await dbg(`advance(${4 - st.year})`);
  await tap('report-ok');
}
await tap('tab-history');
await scrollGame(0);
await (
  await frame()
).evaluate(() => {
  const li = [...document.querySelectorAll('.timeline > li')].find((e) => e.textContent?.includes('空の交通事故'));
  li?.setAttribute('data-pv', 'twist');
});
await shot(['[data-pv="twist"]'], { dur: 0, maxS: 3.4 });
await at(bar(27));
cue('impact', { amp: 0.7 });
cue('shake', { dur: 0.2, amp: 10 });
await hideCard();
await cap('想定外の変化', '空の交通事故が相次ぐ', '見どころ');
await shot(['[data-pv="twist"]'], { dur: 0.3, maxS: 3.4, k: 0.08, hold: 3 });
await at(bar(29));
await cap('変化には\n理由がある', 'なぜ？\n三次元の交通には信号も車線もない', '見どころ');

// ==== 見どころ：無茶な書き換え
await at(bar(31));
cue('impact');
cue('flash');
await cap('');
await card([['l1', 'どんな無茶も\n世界は読み取る']]);
await dbg('boost()');
for (const t of ['空には太陽が二つある。', '恐竜がよみがえる。', 'ロボットが人の代わりに働く。', '宇宙人が現れる。', '災害は起きない。']) await dbg(`add('${t}')`);
await tap('tab-laws');
await scrollGame('end');
await shot(['[data-testid^="law-x"]'], { dur: 0, maxS: 3.2 });
await at(bar(32));
await hideCard();
await cap('無茶も書ける', '太陽を二つに\n恐竜をよみがえらせる', '見どころ');
await shot(['[data-testid^="law-x"]'], { dur: 0.2, maxS: 3.2, k: 0.1, hold: 2.5 });
await at(bar(33));
cue('riser', { dur: bar(34) - bar(33) });
await at(bar(34) - 1.5);
await camera({ x: 0, y: (1920 - 844 * MIN_S) / 2, s: MIN_S }, 0.3);
await tap('advance');
await G.getByTestId('report-sheet').waitFor();
await at(bar(34));
cue('impact');
cue('flash');
cue('shake', { dur: 0.25, amp: 14 });
await cap('書いた数だけ\n世界が変わる', 'ロボットが働き\n宇宙人が現れる', '見どころ');
const on = await shot(['[data-testid="onset"]'], { dur: 0.4, maxS: 3.2 });
if (on) await camera(on, 0, { ...on, y: Math.max(1920 - 844 * on.s, on.y - 520) }, 3, 'linear');

// ==== 奇妙な世界をたたみかける（寄せて次々に切る）
await at(bar(36) - 0.2);
cue('whoosh');
await at(bar(36));
await tap('report-ok');
await tap('tab-world');
await scrollGame(0);
await chrome(false);
const st = await rectOf(['[data-testid="scene-stage"]']);
const MONT = { x: 0, y: 500, w: 1080, h: 1420 };
const montage: [number, number, number, number, string][] = [
  [0.6, 0.0, 0.4, 0.62, '二つの太陽'],
  // 恐竜は森のはずれ（絵の左の端）。ロボットは広場（下の一文の行が映らない高さまで）
  [0.0, 0.36, 0.3, 0.4, 'よみがえった恐竜'],
  [0.12, 0.5, 0.45, 0.28, '働くロボット'],
];
for (let i = 0; i < montage.length; i++) {
  await at(bar(36) + 0.2 + i * 1.05);
  cue('tick');
  if (st) {
    const [fx, fy, fw, fh, name] = montage[i]!;
    const c = cover(sceneCrop(st, fx, fy, fw, fh), MONT, 9);
    await camera(c, 0, push(c, 0.06, MONT), 1.0, 'linear');
    await cap(name, '', '見どころ', true);
  }
}
await at(bar(38));
cue('whoosh');
await sceneTruck(bar(41) - bar(38), 9, 1.0);
// 流す絵に映るもの（恐竜・宇宙人・ロボット・空を行く人）だけを言う（二つの太陽は直前の寄りで見せている）
await cap('奇妙な世界へ', '書いたものが\nひとつの世界に並ぶ', '見どころ');

// ==== 見どころ：危機（いきなり切り替える）
await at(bar(41));
cue('braam');
cue('shake', { dur: 0.6, amp: 22 });
cue('flash', { amp: 0.5 });
await cap('');
await card([['l1 danger', '危機は\nやってくる']]);
await chrome(true);
await dbg('unlock()');
await dbg("start('endless')");
await G.getByTestId('game').waitFor();
for (let i = 0; i < 12; i++) {
  await dbg('advance(30)');
  await tap('report-ok');
  const st = await dbg<{ crisis: unknown }>('state()');
  if (st.crisis) break;
}
await tap('tab-world');
await scrollGame(0);
// 札が暗くなりきってから名前を出す（札のうしろに透けて見えないように）
await labels(true);
await shot(['[data-testid="crisis"]', '[data-testid="scene-stage"]'], { dur: 0, maxS: 3.2 });
await at(bar(43));
cue('impact', { amp: 0.8 });
await hideCard();
await tilt(-4, 1.2);
await cap('危機がやってくる', '襲う年までに書き換えれば\n防げる', '見どころ');
await shot(['[data-testid="crisis"]', '[data-testid="scene-stage"]'], { dur: 0.3, maxS: 3.2, k: 0.12, hold: 4.5 });

// ==== 見どころ：結末
await at(bar(46) - 0.2);
cue('whoosh');
await at(bar(46));
await tilt(0, 0.6);
await cap('');
await card([['l1', '結末は\nひとつじゃない']]);
await dbg("start('plague')");
await dbg('boost()');
await dbg("rewrite('pathogen_infect', '病原体は生き物に感染する。ただし人間には感染しない。')");
await dbg("rewrite('human_food', '人間は数日に一度食事を必要とする。')");
await dbg("add('人類は他の星に住める。')");
for (let i = 0; i < 20; i++) {
  const st = await dbg<{ status: string }>('state()');
  if (st.status !== 'playing') break;
  await dbg('advance(5)');
}
await tap('report-ok');
await G.getByTestId('result').waitFor();
if (await G.getByTestId('home-close').count()) await tap('home-close');
await scrollGame(0);
const endC = await shot(['[data-testid="ending"]'], { dur: 0, maxS: 4.2 });
const wide = await rectOf(['[data-testid="ending"]', '[data-testid="result-scene"]']);
await at(bar(48));
cue('impact');
cue('flash');
await hideCard();
await cap('結末は\nひとつじゃない', '星々への旅立ち\n凍りついた星　核の冬', '見どころ');
// 結末の札から引いて、世界を見せる
if (endC && wide) await camera(endC, 0, fit(wide, REGION, 3), bar(52) - bar(48), 'cubic-bezier(0.3, 0, 0.3, 1)');

// ==== 題名（ロゴ）
await at(bar(52));
cue('impact');
cue('flash');
cue('stinger');
await cap('');
await card([
  ['logo', 'WORLD.txt'],
  ['l1 big', 'ラプラスの庭'],
  ['l2', '未来は決まっている\n法則を書き換えなければ'],
  ['note', 'ブラウザで無料で遊べる'],
  ['url', '109mei.github.io/world-txt'],
]);
await at(END);
await cdp.send('Page.stopScreencast');
// BGM は 0〜1.5秒で入り、FADE_OUT_AT 秒から終わりまでで消える（encode.ts が読む）
writeFileSync(join(FRAMES, 'index.json'), JSON.stringify({ start, end: Date.now() / 1000, fadeIn: 1.5, fadeOutAt: FADE_OUT_AT, frames, cues }));
const span = frames.length > 1 ? frames[frames.length - 1]!.t - frames[0]!.t : 0;
console.log(`コマ ${frames.length}（1秒に約${(frames.length / Math.max(1, span)).toFixed(1)}コマ）・合図 ${cues.length}`);
await browser.close();
server.close();

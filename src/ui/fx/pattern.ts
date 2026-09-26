import { hashText } from '../../core';

/**
 * 演出の粒の散り方（PixiJS から切り離した、純粋な計算）。
 * 散り方は書いた文・世界番号などの文字から決まる式（hashText）だけで決め、Math.random を使わない。
 * 同じ文は、いつ誰が書いても同じ散り方になる
 */

/** 1つの粒。場所は箱の中の割合（0〜1）、速さは1秒あたりの画面の点、時間はミリ秒 */
export interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 半径（画面の点） */
  size: number;
  delay: number;
  life: number;
  /** 色の選び方と明るさ（0〜1） */
  tone: number;
  /** 左右のゆらぎ（画面の点。0 でゆらがない） */
  sway: number;
}

/** 1つの光の筋（早回しのモーションブラー）。場所は箱の中の割合、長さは箱の幅の割合、速さは1秒あたりの箱の幅 */
export interface Streak {
  y: number;
  length: number;
  speed: number;
  thickness: number;
  delay: number;
  alpha: number;
}

/** 1画面に出す粒の上限（演出を重ねても、この数を超えない） */
export const MOTE_MAX = 320;
/** 演出ごとの粒の数 */
export const COUNTS = { ink: [48, 120], blot: 7, bloom: 64, spark: 28, ember: 150, streak: 34 } as const;

const TAU = Math.PI * 2;

/** 文字と番号と名前から [0, 1) の値 */
function h(key: string, i: number, name: string): number {
  return hashText(key, `${name}:${i}`);
}

/** 書いた一文の字数から、インクの粒の数（長い文ほど多い） */
export function inkCount(text: string): number {
  const [lo, hi] = COUNTS.ink;
  return Math.max(lo, Math.min(hi, 36 + Array.from(text).length * 4));
}

/**
 * 書いた瞬間のインク：行の上を左から右へ、書くようににじんで散る粒。
 * 上へ少し舞い上がってから、ゆっくり落ちて消える
 */
export function inkMotes(text: string): Mote[] {
  const n = inkCount(text);
  const out: Mote[] = [];
  for (let i = 0; i < n; i++) {
    const x = h(text, i, 'x');
    const a = -Math.PI / 2 + (h(text, i, 'a') - 0.5) * Math.PI * 1.5;
    const speed = 18 + 96 * Math.pow(h(text, i, 's'), 2);
    out.push({
      x,
      y: 0.25 + 0.5 * h(text, i, 'y'),
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      size: 1 + 2.8 * Math.pow(h(text, i, 'r'), 3),
      delay: x * 280 + h(text, i, 'd') * 90,
      life: 650 + 850 * h(text, i, 'l'),
      tone: h(text, i, 't'),
      sway: 0,
    });
  }
  return out;
}

/** 書いた瞬間のにじみ：行の下に広がって消える、大きくやわらかいインクのしみ */
export function blotMotes(text: string): Mote[] {
  const out: Mote[] = [];
  for (let i = 0; i < COUNTS.blot; i++) {
    const x = (i + 0.2 + 0.6 * h(text, i, 'bx')) / COUNTS.blot;
    out.push({
      x,
      y: 0.35 + 0.3 * h(text, i, 'by'),
      vx: 0,
      vy: 0,
      size: 7 + 10 * h(text, i, 'br'),
      delay: x * 280,
      life: 900 + 400 * h(text, i, 'bl'),
      tone: h(text, i, 'bt'),
      sway: 0,
    });
  }
  return out;
}

/**
 * 効き始め：散らばっていた粒が、書いた一文の姿へ吸い寄せられて集まる（書いた瞬間のインクの逆）。
 * x・y は集まる先、vx・vy は集まる前にいた所までのずれ（画面の点）
 */
export function bloomMotes(text: string): Mote[] {
  const out: Mote[] = [];
  for (let i = 0; i < COUNTS.bloom; i++) {
    const a = h(text, i, 'ga') * TAU;
    const r = 30 + 90 * h(text, i, 'gr');
    out.push({
      x: h(text, i, 'gx'),
      y: 0.2 + 0.6 * h(text, i, 'gy'),
      vx: Math.cos(a) * r,
      vy: Math.sin(a) * r * 0.6,
      size: 0.8 + 1.8 * Math.pow(h(text, i, 'gs'), 2),
      delay: 90 * h(text, i, 'gd'),
      life: 520 + 260 * h(text, i, 'gl'),
      tone: h(text, i, 'gt'),
      sway: 0,
    });
  }
  return out;
}

/** 着いた所の火花：まわりへ放たれて消える粒（想定外の変化・崩れの衝撃） */
export function sparkMotes(key: string, count: number = COUNTS.spark): Mote[] {
  const out: Mote[] = [];
  for (let i = 0; i < count; i++) {
    const a = ((i + h(key, i, 'sa')) / count) * TAU;
    const speed = 50 + 170 * h(key, i, 'ss');
    out.push({
      x: 0.5,
      y: 0.5,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      size: 0.7 + 1.6 * h(key, i, 'sr'),
      delay: 40 * h(key, i, 'sd'),
      life: 380 + 420 * h(key, i, 'sl'),
      tone: h(key, i, 'st'),
      sway: 0,
    });
  }
  return out;
}

/**
 * 結末の粒：救えた世界は画面のあちこちから光の粒が昇り、崩れた世界は灰が降る。
 * 世界番号とステージから決まる（同じ世界の同じ結末は、いつも同じ降り方）
 */
export function emberMotes(key: string, rise: boolean): Mote[] {
  const out: Mote[] = [];
  for (let i = 0; i < COUNTS.ember; i++) {
    const speed = 16 + 46 * h(key, i, 'es');
    out.push({
      x: h(key, i, 'ex'),
      // 画面のあちこちから昇る・降る（下の端からだけだと、画面の上まで届かないうちに消える）
      y: rise ? 0.3 + 0.8 * h(key, i, 'ey') : -0.1 + 0.8 * h(key, i, 'ey'),
      vx: (h(key, i, 'ew') - 0.5) * 10,
      vy: rise ? -speed : speed * 0.8,
      size: 0.9 + 2.4 * Math.pow(h(key, i, 'er'), 2),
      delay: 1600 * h(key, i, 'ed'),
      life: 2400 + 1600 * h(key, i, 'el'),
      tone: h(key, i, 'et'),
      sway: 4 + 14 * h(key, i, 'ea'),
    });
  }
  return out;
}

/**
 * 早回しの光の筋：時間が速く流れるあいだ、左から右へ流れるモーションブラー。
 * 年の数字の周りをあけて、上と下の帯にだけ流す（y は 0〜0.2 と 0.62〜1）
 */
export function streakLanes(key: string): Streak[] {
  const out: Streak[] = [];
  for (let i = 0; i < COUNTS.streak; i++) {
    const top = i % 3 === 0;
    const y = top ? 0.02 + 0.18 * h(key, i, 'ly') : 0.62 + 0.36 * h(key, i, 'ly');
    out.push({
      y,
      length: 0.12 + 0.34 * h(key, i, 'll'),
      speed: 1.1 + 2.2 * h(key, i, 'lv'),
      thickness: 0.8 + 1.8 * h(key, i, 'lt'),
      delay: 420 * h(key, i, 'ld'),
      alpha: 0.12 + 0.32 * h(key, i, 'la'),
    });
  }
  return out;
}

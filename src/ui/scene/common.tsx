import type { CSSProperties, ReactNode } from 'react';
import type { SceneMotif } from '../../data/schema';
import type { SceneView } from '../../store/scene';

/** 情景の大きさと、地面の高さ */
export const W = 390;
export const H = 220;
/** 遠い山と海の水平線 */
export const HORIZON = 150;
/** 町の塔の根元 */
export const GROUND = 172;
/** 人々の立つ広場 */
export const PLAZA = 194;
/** 車の走る道 */
export const ROAD = 207;
/** 海の始まる岸（ここより右が海） */
export const SHORE = 284;

/** 情景の色は CSS の変数（暗い画面は夜の絵、明るい画面は昼の絵。styles.css の --sc-*） */
export const SILVER = 'rgb(var(--sc-line-rgb) / 0.62)';
export const SILVER_DIM = 'rgb(var(--sc-line-rgb) / 0.32)';
export const SILVER_FAINT = 'rgb(var(--sc-line-rgb) / 0.16)';
export const PAPER = 'var(--sc-paper)';
export const DARK = 'var(--sc-fill)';
export const INK = 'var(--ink)';
export const BAD = 'var(--bad)';
export const WARN = 'var(--warn)';
export const GOOD = 'var(--good)';

/** 世界ごとに決まる、0〜1 の数（同じ世界なら同じ景色） */
export function rnd(seed: number, i: number): number {
  let t = (seed * 2654435761 + i * 40503 + 0x9e3779b9) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** 描く要素の強さ（なければ 0） */
export function m(v: SceneView, id: SceneMotif): number {
  return v.motifs[id] ?? 0;
}

/** 書き換えから来た要素はインク、それ以外は銀 */
export function strokeOf(v: SceneView, id: SceneMotif, base = SILVER): string {
  return v.inked.includes(id) ? INK : base;
}

/**
 * 新しく描かれたときの現れ方。書いていないものは、インクがにじむように現れる（ink）。
 * swell ふくらむ・shrink 遠のく・grow 生まれる・spiral 渦を巻いて生まれる・open 開く・burst 炸裂する・
 * rise 下から昇る・descend 上から降りる・fall 斜めに落ちる・drop 落ちて弾む・tide 水面が上がる・
 * sprout 根元から伸びる・erupt 噴き上がる・sweep 左から広がる・sweepBack 右から広がる・
 * walk 歩いてくる・surface 海から現れる・lift 飛び立つ・flicker 明滅して現れる。
 * none は、もとからある物の姿を変えるだけのもの（枯れる・廃墟になる・重くなる）。去年の絵からの塗り替えで見せ、消してから描き直さない
 */
export type EnterKind =
  | 'ink'
  | 'swell'
  | 'shrink'
  | 'grow'
  | 'spiral'
  | 'open'
  | 'burst'
  | 'rise'
  | 'descend'
  | 'fall'
  | 'drop'
  | 'tide'
  | 'sprout'
  | 'erupt'
  | 'sweep'
  | 'sweepBack'
  | 'walk'
  | 'surface'
  | 'lift'
  | 'flicker'
  | 'none';

export const ENTER: Partial<Record<SceneMotif, EnterKind>> = {
  // 空と宇宙
  sunNear: 'swell',
  sunBright: 'swell',
  eternalDay: 'swell',
  sunFar: 'shrink',
  sunDim: 'flicker',
  sunFlicker: 'flicker',
  twoSuns: 'rise',
  sunHole: 'spiral',
  blackHole: 'spiral',
  // 自転が止まる：夜の側（左半分）が、左から広がっていく
  halfNight: 'sweep',
  ozone: 'descend',
  aurora: 'sweep',
  meteors: 'fall',
  meteorMiss: 'fall',
  ufo: 'descend',
  rockets: 'rise',
  starsMore: 'sweep',
  lightTrails: 'sweep',
  sparkles: 'lift',
  godLight: 'descend',
  eye: 'open',
  ghosts: 'lift',
  grid: 'descend',
  clock: 'grow',
  loop: 'spiral',
  strings: 'descend',
  dreams: 'grow',
  flash: 'burst',
  mushroom: 'erupt',
  glitch: 'flicker',
  skyCrack: 'sweep',
  // 天気
  clouds: 'sweep',
  storm: 'sweep',
  rain: 'descend',
  acidRain: 'descend',
  snow: 'descend',
  smog: 'sweep',
  miasma: 'sweep',
  wind: 'sweepBack',
  pollenWind: 'sweep',
  stones: 'descend',
  rainbow: 'sweep',
  volcano: 'erupt',
  quake: 'sweep',
  drought: 'sweep',
  crows: 'lift',
  // 大地と生き物
  forest: 'sprout',
  noForest: 'sweep',
  desert: 'sweep',
  greenDesert: 'sprout',
  moreLand: 'rise',
  fieldsEverywhere: 'sweep',
  seaFields: 'sweep',
  barren: 'none',
  tallCrops: 'sprout',
  withered: 'none',
  glowPlants: 'sprout',
  harvest: 'sprout',
  manna: 'descend',
  granary: 'sprout',
  animals: 'walk',
  bees: 'lift',
  birds: 'lift',
  insects: 'lift',
  rats: 'walk',
  dinosaurs: 'walk',
  mammoth: 'walk',
  animalKing: 'walk',
  talk: 'walk',
  // 海と水
  seaHigh: 'tide',
  freshSea: 'none',
  saltSea: 'sweep',
  seaBubbles: 'rise',
  seaCity: 'rise',
  springs: 'rise',
  reservoir: 'tide',
  ice: 'sweep',
  // 町と技術と社会
  megacity: 'sprout',
  villages: 'sprout',
  ruins: 'none',
  heavy: 'none',
  steam: 'none',
  factoryIdle: 'none',
  oilDry: 'none',
  autoCars: 'none',
  slide: 'none',
  still: 'none',
  walls: 'sprout',
  statue: 'sprout',
  oneFlag: 'sprout',
  flags: 'sprout',
  robots: 'walk',
  robotRevolt: 'walk',
  aiCore: 'sprout',
  dna: 'sprout',
  screensOff: 'flicker',
  wireless: 'sprout',
  noPower: 'flicker',
  battery: 'grow',
  freeEnergy: 'grow',
  fusion: 'sprout',
  reactor: 'sprout',
  oilGush: 'erupt',
  portals: 'grow',
  cureAll: 'sprout',
  noMedicine: 'flicker',
  lab: 'sprout',
  labDark: 'flicker',
  coins: 'drop',
  moneyRain: 'descend',
  paperMoney: 'descend',
  gold: 'grow',
  cashless: 'flicker',
  papers: 'descend',
  lanterns: 'lift',
  cameras: 'sprout',
  graves: 'sprout',
  temple: 'sprout',
  noTemple: 'flicker',
  stadium: 'sprout',
  doves: 'lift',
  soldiers: 'walk',
  noWeapons: 'drop',
  // 人々
  flyers: 'lift',
  float: 'lift',
  giant: 'sprout',
  tiny: 'shrink',
  blink: 'flicker',
  invisible: 'flicker',
  zombies: 'walk',
  beasts: 'walk',
  crowd: 'walk',
  queue: 'walk',
  clones: 'walk',
  couples: 'walk',
  grazers: 'walk',
  divers: 'surface',
  halo: 'grow',
  genius: 'burst',
};

/**
 * この年に新しく描かれた要素は、要素ごとの現れ方で現れる（太陽はふくらみ、船は降り、塔は伸びる）。
 * 現れ方の動きは外側の枠に持たせ、要素そのものの動き（className）は内側に残す。
 * 枠はいつも置く（現れ方を見せ終えて枠の動きを外しても、中の要素を作り直さず、動き続けている絵が跳ばない）
 */
export function Motif({ v, id, children, style, className }: { v: SceneView; id: SceneMotif; children: ReactNode; style?: CSSProperties; className?: string }) {
  const enter = v.fresh.includes(id) && !v.entered && ENTER[id] !== 'none' ? (ENTER[id] ?? 'ink') : null;
  return (
    <g className={enter ? `sc-fresh sc-in-${enter}` : undefined} data-motif={id} data-enter={enter ?? undefined}>
      <g className={className} style={style}>
        {children}
      </g>
    </g>
  );
}

/**
 * 消えていくもの：この年に「〜がない」になったとき（月が消えた・海が干上がった・人がいなくなった）、
 * 前の姿をしばらく残してから、そのものらしく消していく。
 * fade 薄れる・wane 欠けて消える・set 沈む・collapse 吸い込まれる・drain 水が引く・sink 崩れ落ちる・flickerOut 明滅して消える
 */
export type ExitKind = 'fade' | 'wane' | 'set' | 'collapse' | 'drain' | 'sink' | 'flickerOut';

export function Ghost({ v, when, kind, children }: { v: SceneView; when: SceneMotif; kind: ExitKind; children: ReactNode }) {
  if (!v.fresh.includes(when) || v.entered) return null;
  return (
    <g className={`sc-ghost sc-fresh sc-out-${kind}`} data-ghost={when}>
      {children}
    </g>
  );
}

/** アニメーションの長さ（時間の流れが速い世界では短く） */
export function dur(seconds: number): CSSProperties {
  return {
    animationDuration: `calc(${seconds}s * var(--sc-speed, 1))`,
  } as CSSProperties;
}

export function delay(seconds: number): CSSProperties {
  return { animationDelay: `${-seconds}s` };
}

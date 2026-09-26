import { z } from 'zod';
import { StageIdSchema } from '../data/schema';

/** 読み込んだセーブが壊れていないかを確かめる形 */

const num = z.number();
const rec = z.record(z.string(), num);
/**
 * 文字の長さと数の上限。ふつうに遊んで届く量よりずっと大きくとり、壊れたセーブや、
 * よそで作られた大きすぎるセーブ（画面が固まるほどの長い文など）だけを読まないようにする
 */
const id = z.string().max(120);
/** WORLD.txt の1行（書ける上限は80字） */
const line = z.string().max(400);
/** 世界史の文など */
const note = z.string().max(2000);

/** 棋譜の1手 */
export const MoveSchema = z.object({
  year: z.number().int().min(0).max(100000),
  pass: z.number().int().min(0).max(1000),
  target: z.string().max(40),
  kind: z.enum(['rewrite', 'add', 'delete']),
  text: z.string().max(200),
  reading: z.string().max(200).nullable(),
});

/** 書き換えられる範囲・筆の位 */
const AccessSchema = z.object({
  rank: z.number().int().min(0).max(50),
  concepts: z.array(id).max(500),
  margin: z.number().int().min(0).max(10000).nullable(),
  depth: z.number().min(0).max(10000).nullable(),
});

/** 棋譜（世界番号・ステージ・規則の版と、手の並び。版6から） */
export const KifuSchema = z.object({
  rules: z.string().max(40),
  stage: StageIdSchema,
  seed: num,
  cause: id.nullable(),
  access: AccessSchema.nullable(),
  intro: z.record(id, num),
  moves: z.array(MoveSchema).max(400),
  year: z.number().int().min(0).max(100000),
  loops: z.number().int().min(0).max(1000),
  result: z.enum(['cleared', 'failed']).nullable(),
  trial: z.boolean().default(false),
});

/** 世界ごとの3つの印：救った・少ない手で・早く見抜いた（版6から） */
export const MarkSchema = z.enum(['saved', 'few', 'early']);

const SimSchema = z.looseObject({
  pop: num,
  agri: num,
  industry: num,
  energyCap: num,
  renewShare: num,
  oilReserve: num,
  infra: num,
  science: num,
  eco: num,
  co2: num,
  temp: num,
  pathogen: num,
  immunity: num,
  strainR: num,
  strainV: num,
  blight: num,
  foodStock: num,
  stability: num,
  happiness: num,
  tension: num,
  war: num,
  unemployment: num,
  coherence: num,
  capacityMax: num,
  /** 人々の心（版14から。古いセーブにはないので、読み込むときに補う） */
  ref: num.optional(),
  peak: num.optional(),
  trust: num.optional(),
  anxiety: num.optional(),
  caution: num.optional(),
  overshoot: num.optional(),
});

export const GameStateSchema = z.looseObject({
  schema: z.number().int(),
  seed: num,
  /** 版8まで：遊んでいる間の乱数の内部状態（今は使わない。読み込むときに取り除く） */
  rng: z.number().int().optional(),
  /** 出来事の起きる力（版9から。古いセーブにはないので、読み込むときに補う） */
  charge: z.record(id, num).optional(),
  /** 空白の行・消し跡・世界が埋めた行（版10から） */
  voids: z.record(id, num).optional(),
  scars: z.record(id, num).optional(),
  filled: z.record(id, num).optional(),
  /** 原因の型・効きが落ちたと知らせた意味（版12から） */
  cause: id.nullable().optional(),
  adapted: z.array(z.string().max(200)).max(2000).optional(),
  /** 言い切りの強さ・書き直した回数・短く言い換えた行（版11から） */
  strength: z.record(id, num).optional(),
  rewrites: z.record(id, num).optional(),
  trims: z.record(id, z.literal(true)).optional(),
  /** 書き方の読み分けの手がかり（版13から） */
  modes: z.record(id, z.enum(['rule', 'conditional'])).optional(),
  /** 考え方の広がり・締め出された振る舞い（版14から） */
  spread: z.record(id, num).optional(),
  crowded: z.record(id, z.literal(true)).optional(),
  /** 棋譜（書いた手）・世界の決まりの強さ（版15から） */
  moves: z.array(MoveSchema).max(400).optional(),
  intro: z.record(id, num).optional(),
  introStart: z.record(id, num).optional(),
  stageId: StageIdSchema,
  year: z.number().int().nonnegative(),
  status: z.enum(['playing', 'cleared', 'failed']),
  failReason: z.enum(['humanity', 'civilization', 'coherence', 'capacity']).nullable(),
  startPop: num,
  sim: SimSchema,
  derived: z.looseObject({ foodRatio: num, civ: num, capacityRatio: num }),
  scores: rec,
  prevScores: rec,
  prevMeta: z.object({ capacityRatio: num, coherence: num, civ: num }),
  texts: z.record(id, line),
  laws: z.record(id, id),
  understood: z.record(id, z.boolean()),
  extras: z.array(z.object({ id, text: line, phrase: id.nullable().optional(), year: num })).max(1000),
  /** 行が運ぶ意味（版3から。古いセーブにはない） */
  carried: z.record(id, z.object({ phrases: z.array(id).max(100), law: z.object({ id, option: id }).nullable() })).default({}),
  nextExtra: num,
  lawYear: rec,
  edits: z.object({ left: num, used: num, nextAt: num }),
  twists: rec,
  twistAge: rec,
  effects: z.array(z.object({ source: z.string(), mods: rec, remaining: num })),
  flags: z.record(id, z.literal(true)),
  fired: rec,
  combos: z.array(id).max(1000),
  counters: z.object({ civLow: num, capOver: num, peaceYears: num, warCooldown: num, warYears: num }),
  history: z.array(z.looseObject({ year: num, kind: id, icon: id, text: note, ref: id.optional() })).max(5000),
  report: z.looseObject({ from: num, to: num }).nullable(),
  stats: z.looseObject({ edits: num }),
  found: z.array(id).max(20000).default([]),
  /** 人口と文明の曲線（古いセーブにはないので、読み込むときに補う） */
  trace: z.object({ pop: z.array(num).max(100000), civ: z.array(num).max(100000), living: z.array(num).max(100000).optional(), ref: z.array(num).max(100000).optional() }).optional(),
  /** 無限の世界の危機（版4から。古いセーブにはない） */
  crisis: z.object({ id, at: num, strength: num }).nullable().default(null),
  nextCrisis: num.default(-1),
  crises: z.object({ averted: num, softened: num, struck: num }).default({ averted: 0, softened: 0, struck: 0 }),
  /** 今日の世界で遊んでいるなら、その日付 */
  daily: z.string().max(20).nullable().default(null),
  /** 結末（版5から） */
  ending: id.nullable().optional(),
  endingYears: rec.default({}),
  /** くり返す世界（くり返す十年。古いセーブにはないので、読み込むときに補う） */
  loop: z
    .object({
      start: z.number().int().nonnegative(),
      snapshot: z.looseObject({ sim: SimSchema, rng: z.number().int().optional(), charge: z.record(id, num).optional() }),
      count: z.number().int().nonnegative(),
      done: z.boolean(),
    })
    .nullable()
    .optional(),
  /** 去年効いていた意味（版7から。古いセーブにはないので、読み込むときに補う） */
  inEffect: z.array(id).max(5000).optional(),
  /** 書き換えの勢い（版7から） */
  impulse: z.record(id, num).optional(),
  /** 書き換えられる範囲・筆の位（版8から。古いセーブにはないので、すべて自由として補う） */
  access: AccessSchema.nullable().optional(),
  /** 分かれ道からやり直した世界（印の「少ない手で」「早く見抜いた」を付けない）・分かれ道の年・原因に効く手の年（版15から） */
  branched: z.boolean().optional(),
  branch: z.object({ year: z.number().int().nonnegative(), id, pass: z.number().int().nonnegative().default(0) }).nullable().optional(),
  countered: z.number().int().nonnegative().nullable().optional(),
  /** 改稿者の試練（版15から） */
  trial: z.object({ kind: z.enum(['double', 'late', 'few']), cause2: id.nullable(), late: z.number().int().min(0).max(100) }).nullable().optional(),
});

export const SettingsSchema = z.object({
  bgm: z.boolean(),
  volume: z.number().min(0).max(1),
  analysis: z.boolean(),
  /** 効果音（古いセーブにはないので、既定で ON） */
  se: z.boolean().default(true),
  /** 世界の情景を動かす（古いセーブにはないので、既定で ON） */
  motion: z.boolean().default(true),
  /** 画面の明るさ：自動（端末の設定に合わせる）・明るい・暗い（版6から） */
  theme: z.enum(['auto', 'light', 'dark']).default('auto'),
  /** 計算の演出の長さ：自動（初めの数回は約1.2秒、慣れたら約0.6秒）・ゆっくり・はやい（版6から） */
  speed: z.enum(['auto', 'slow', 'fast']).default('auto'),
  /** すべて開いた状態で始める（すべてを一度開いたあとだけ選べる。版6から） */
  allOpen: z.boolean().default(false),
  /** 情景に施設の名前を出す（はじめは出す。版6から） */
  names: z.boolean().default(true),
  /** 文字の大きさ：小・中・大（画面をまとめて縮めたり広げたりする。古いセーブにはないので、既定で中） */
  textSize: z.enum(['small', 'medium', 'large']).default('medium'),
  /** 効果音の音量（音楽の音量とは別。古いセーブにはないので、既定の音量） */
  seVolume: z.number().min(0).max(1).default(0.6),
});

export const ProgressSchema = z.object({
  cleared: z.array(StageIdSchema),
  best: z.partialRecord(
    StageIdSchema,
    z.object({
      years: num,
      title: note,
      cleared: z.boolean(),
      /** クリアしたときの、いちばん少ない書き換えの回数 */
      fewest: z.number().int().nonnegative().optional(),
      /** これまでに付いた印（救った・少ない手で・早く見抜いた。版6から） */
      marks: z.array(MarkSchema).max(3).optional(),
    }),
  ),
  worlds: z.number().int().nonnegative(),
  /** 観測記録：これまでに見つけたもの（読み取り・想定外の変化・出来事・結末など）の id */
  discovered: z.array(id).max(20000),
  /** 無限の世界で、文明が何年続いたか（新しい順） */
  endless: z
    .array(z.object({ years: z.number().int().nonnegative(), daily: z.string().max(20).nullable(), at: num, title: note }))
    .max(1000)
    .default([]),
  /**
   * 無限の世界の記録簿（この端末でのランキング）。長く続いた順に上位だけを残す（版5から）。
   * ending はどう終わったか、edits は書き換えの回数、averted は防いだ危機の数
   */
  ranking: z
    .array(
      z.object({
        years: z.number().int().nonnegative(),
        daily: z.string().max(20).nullable(),
        at: num,
        title: note,
        ending: id.nullable().default(null),
        edits: z.number().int().nonnegative().default(0),
        averted: z.number().int().nonnegative().default(0),
      }),
    )
    .max(1000)
    .default([]),
  /** 得た実績の id（得た順） */
  achievements: z.array(id).max(2000).default([]),
  /** 放棄した世界の数 */
  abandoned: z.number().int().nonnegative().default(0),
  /** 遊び終えた世界（勝ち負けは問わない。放棄は入らない。開いていく順番で使う。版6から） */
  played: z.array(StageIdSchema).max(100).default([]),
  /** ステージごとの負けた数（3回負けるごとに、兆しの読み方を1つ開く。版6から） */
  losses: z.partialRecord(StageIdSchema, z.number().int().nonnegative()).default({}),
  /** ステージごとの、いちばん良かった棋譜（救った中で手の少ないもの。救っていなければ長く続いたもの。版6から） */
  kifu: z.partialRecord(StageIdSchema, KifuSchema).default({}),
  /** 改稿者の試練を救ったステージ（版6から） */
  trials: z.array(StageIdSchema).max(100).default([]),
  /** 最後にセーブを書き出した時刻（まだなら null。版6から） */
  exportedAt: num.nullable().default(null),
  /** 1度だけ出す案内：ホーム画面に追加を出したか・書き出しを勧めた筆の位（まだなら -1。版6から） */
  prompted: z.object({ home: z.boolean(), exportRank: z.number().int().min(-1).max(50) }).default({ home: false, exportRank: -1 }),
});

export const SaveDataSchema = z.object({
  saveVersion: z.number().int().positive(),
  savedAt: num,
  settings: SettingsSchema,
  progress: ProgressSchema,
  current: GameStateSchema.nullable(),
});

export type Settings = z.infer<typeof SettingsSchema>;
export type Progress = z.infer<typeof ProgressSchema>;
export type Mark = z.infer<typeof MarkSchema>;

export const DEFAULT_SETTINGS: Settings = {
  bgm: true,
  volume: 0.6,
  analysis: false,
  se: true,
  motion: true,
  theme: 'auto',
  speed: 'auto',
  allOpen: false,
  names: true,
  textSize: 'medium',
  seVolume: 0.6,
};
export const EMPTY_PROGRESS: Progress = {
  cleared: [],
  best: {},
  worlds: 0,
  discovered: [],
  endless: [],
  ranking: [],
  achievements: [],
  abandoned: 0,
  played: [],
  losses: {},
  kifu: {},
  trials: [],
  exportedAt: null,
  prompted: { home: false, exportRank: -1 },
};

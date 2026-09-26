import { z } from 'zod';
import { IconKeySchema, StageIdSchema } from '../data/schema';

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
  mind: num,
  prices: num,
  /** 人々の心 */
  ref: num,
  peak: num,
  trust: num,
  anxiety: num,
  caution: num,
  overshoot: num,
});

/** 出来事などが世界に残す効き目（くり返しで重なっても、ふつうは数十まで） */
const EffectsSchema = z.array(z.object({ source: id, mods: rec, remaining: num })).max(500);
const CountersSchema = z.object({ civLow: num, capOver: num, peaceYears: num, warCooldown: num, warYears: num });

/** ニュースと、それを育てた行 */
const NewsSchema = z.object({
  year: num,
  category: z.string().max(40),
  icon: IconKeySchema,
  text: note,
  why: note.nullable(),
  severity: z.enum(['info', 'warn', 'critical']),
  surprise: z.boolean(),
  cause: z.object({ text: note, deleted: z.boolean(), year: num.nullable(), via: note.optional(), world: z.boolean().optional() }).nullable(),
  onset: z.boolean().optional(),
});

/** 時間を進めた結果（結果の画面の写し） */
const ReportSchema = z.object({
  from: num,
  to: num,
  requested: num,
  interrupted: note.nullable(),
  changes: z.array(z.object({ id, from: z.string().max(40), to: z.string().max(40), trend: z.string().max(20), better: z.boolean() })).max(200),
  moves: z
    .array(z.object({ id, trend: z.string().max(20), better: z.boolean() }))
    .max(200)
    .optional(),
  pop: z.object({ from: num, to: num }).optional(),
  became: z.array(id).max(5000).optional(),
  news: z.array(NewsSchema).max(2000),
  quiet: z.boolean().optional(),
});

/** 巻き戻すときに戻す、世界の側の様子 */
const SnapshotSchema = z.object({
  sim: SimSchema,
  charge: z.record(id, num),
  twists: rec,
  twistAge: rec,
  effects: EffectsSchema,
  flags: z.record(id, z.literal(true)),
  fired: rec,
  counters: CountersSchema,
  endingYears: rec,
});

export const GameStateSchema = z.looseObject({
  schema: z.number().int(),
  seed: num,
  /** 出来事の起きる力 */
  charge: z.record(id, num),
  /** 空白の行・消し跡・世界が埋めた行 */
  voids: z.record(id, num),
  scars: z.record(id, num),
  filled: z.record(id, num),
  /** 原因の型・効きが落ちたと知らせた意味 */
  cause: id.nullable(),
  adapted: z.array(z.string().max(200)).max(2000),
  /** 言い切りの強さ・書き直した回数・短く言い換えた行 */
  strength: z.record(id, num),
  rewrites: z.record(id, num),
  trims: z.record(id, z.literal(true)),
  /** 書き方の読み分けの手がかり */
  modes: z.record(id, z.enum(['rule', 'conditional'])),
  /** 考え方の広がり・締め出された振る舞い */
  spread: z.record(id, num),
  crowded: z.record(id, z.literal(true)),
  /** 棋譜（書いた手）・世界の決まりの強さ */
  moves: z.array(MoveSchema).max(400),
  intro: z.record(id, num),
  introStart: z.record(id, num),
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
  /** 書き足した行（id は x と番号。ほかの形の id は、行の意味を引くときにオブジェクトの仕組みの名前と取り違えうるので読まない） */
  extras: z.array(z.object({ id: z.string().regex(/^x[0-9]{1,9}$/), text: line, year: num })).max(1000),
  /** 行が運ぶ意味 */
  carried: z.record(id, z.object({ phrases: z.array(id).max(100), law: z.object({ id, option: id }).nullable() })),
  nextExtra: num,
  lawYear: rec,
  edits: z.object({ left: num, used: num, nextAt: num }),
  twists: rec,
  twistAge: rec,
  effects: EffectsSchema,
  flags: z.record(id, z.literal(true)),
  fired: rec,
  combos: z.array(id).max(1000),
  counters: CountersSchema,
  history: z.array(z.looseObject({ year: num, kind: id, icon: id, text: note, ref: id.optional() })).max(5000),
  /** 去年の結果の写し（読めない形なら捨てる。世界は遊べる） */
  report: ReportSchema.nullable().catch(null),
  stats: z.object({ edits: num, wars: num, anomalies: num, minPop: num, maxPop: num, noise: num }),
  found: z.array(id).max(20000),
  /** 人口・文明・暮らしの水準・慣れた水準の曲線と、くり返す世界で巻き戻った位置 */
  trace: z.object({
    pop: z.array(num).max(100000),
    civ: z.array(num).max(100000),
    living: z.array(num).max(100000),
    ref: z.array(num).max(100000),
    laps: z.array(z.number().int().nonnegative().max(100000)).max(10000),
  }),
  /** 無限の世界の危機 */
  crisis: z.object({ id, at: num, strength: num }).nullable(),
  nextCrisis: num,
  crises: z.object({ averted: num, softened: num, struck: num }),
  /** 今日の世界で遊んでいるなら、その日付 */
  daily: z.string().max(20).nullable(),
  /** 結末 */
  ending: id.nullable(),
  endingYears: rec,
  /** くり返す世界（くり返す十年） */
  loop: z
    .object({
      start: z.number().int().nonnegative(),
      snapshot: SnapshotSchema,
      count: z.number().int().nonnegative(),
      done: z.boolean(),
    })
    .nullable(),
  /** 去年効いていた意味 */
  inEffect: z.array(id).max(5000),
  /** 書き換えの勢い */
  impulse: z.record(id, num),
  /** 書き換えられる範囲・筆の位 */
  access: AccessSchema.nullable(),
  /** 分かれ道からやり直した世界（印の「少ない手で」「早く見抜いた」を付けない）・分かれ道の年・原因に効く手の年 */
  branched: z.boolean(),
  branch: z.object({ year: z.number().int().nonnegative(), id, pass: z.number().int().nonnegative() }).nullable(),
  countered: z.number().int().nonnegative().nullable(),
  /** 改稿者の試練 */
  trial: z.object({ kind: z.enum(['double', 'late', 'few']), cause2: id.nullable(), late: z.number().int().min(0).max(100) }).nullable(),
});

/**
 * 設定。どの項目も、ない値・読めない値（範囲の外・知らない選び方・null など）は既定の値にする
 * （設定の1項目が壊れているだけで、記録ごとセーブを読めなくしない。値は DEFAULT_SETTINGS と同じ）
 */
export const SettingsSchema = z.object({
  bgm: z.boolean().catch(true),
  volume: z.number().min(0).max(1).catch(0.6),
  analysis: z.boolean().catch(false),
  /** 効果音（古いセーブにはないので、既定で ON） */
  se: z.boolean().catch(true),
  /** 世界の情景を動かす（古いセーブにはないので、既定で ON） */
  motion: z.boolean().catch(true),
  /** 画面の明るさ：自動（端末の設定に合わせる）・明るい・暗い（版6から） */
  theme: z.enum(['auto', 'light', 'dark']).catch('auto'),
  /** 計算の演出の長さ：自動（初めの数回は約1.2秒、慣れたら約0.6秒）・ゆっくり・はやい（版6から） */
  speed: z.enum(['auto', 'slow', 'fast']).catch('auto'),
  /** すべて開いた状態で始める（すべてを一度開いたあとだけ選べる。版6から） */
  allOpen: z.boolean().catch(false),
  /** 情景に施設の名前を出す（はじめは出す。版6から） */
  names: z.boolean().catch(true),
  /** 文字の大きさ：小・中・大（画面をまとめて縮めたり広げたりする。古いセーブにはないので、既定で中） */
  textSize: z.enum(['small', 'medium', 'large']).catch('medium'),
  /** 効果音の音量（音楽の音量とは別。古いセーブにはないので、既定の音量） */
  seVolume: z.number().min(0).max(1).catch(0.6),
});

/** 世界の辞書の言葉の長さと数の上限・前回の線の長さの上限 */
export const WORD_MAX = 24;
export const WORDS_KNOWN = 400;
export const WORDS_UNKNOWN = 200;
export const PREV_RUN_MAX = 1000;

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
  /**
   * 世界の辞書：書いた文の中の、世界に通じた言葉と、世界がまだ知らない言葉（書いた順。多すぎれば古いものから捨てる）。
   * 古いセーブにはないので空。読めない形なら空にする
   */
  words: z.object({ known: z.array(z.string().max(WORD_MAX)).max(WORDS_KNOWN), unknown: z.array(z.string().max(WORD_MAX)).max(WORDS_UNKNOWN) }).catch(() => ({ known: [], unknown: [] })),
  /**
   * ひとつ前の遊びの人口の線（同じ世界でもう一度・分かれ道で、前回の線を重ねて見せる）。key はステージと世界番号。
   * 古いセーブにはないので null。読めない形なら null にする
   */
  prevRun: z
    .object({ key: z.string().max(40), pop: z.array(num).max(PREV_RUN_MAX) })
    .nullable()
    .catch(null),
  /** 最後に見た更新のお知らせの id（まだなら null。読めない形なら null にする） */
  seenUpdate: z.string().max(40).nullable().catch(null),
});

export const SaveDataSchema = z.object({
  saveVersion: z.number().int().positive(),
  savedAt: num,
  // 設定そのものが読めない（null・配列など）ときも、既定の設定で読む
  settings: SettingsSchema.catch(() => SettingsSchema.parse({})),
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
  words: { known: [], unknown: [] },
  prevRun: null,
  seenUpdate: null,
};

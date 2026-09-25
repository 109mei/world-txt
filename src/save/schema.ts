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
});

export const GameStateSchema = z.looseObject({
  schema: z.number().int(),
  seed: num,
  rng: z.number().int(),
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
  history: z.array(z.looseObject({ year: num, kind: id, icon: id, text: note })).max(5000),
  report: z.looseObject({ from: num, to: num }).nullable(),
  stats: z.looseObject({ edits: num }),
  found: z.array(id).max(20000).default([]),
  /** 人口と文明の曲線（古いセーブにはないので、読み込むときに補う） */
  trace: z.object({ pop: z.array(num).max(100000), civ: z.array(num).max(100000) }).optional(),
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
      snapshot: z.looseObject({ sim: SimSchema, rng: z.number().int() }),
      count: z.number().int().nonnegative(),
      done: z.boolean(),
    })
    .nullable()
    .optional(),
});

export const SettingsSchema = z.object({
  bgm: z.boolean(),
  volume: z.number().min(0).max(1),
  analysis: z.boolean(),
  /** 効果音（古いセーブにはないので、既定で ON） */
  se: z.boolean().default(true),
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

export const DEFAULT_SETTINGS: Settings = { bgm: true, volume: 0.6, analysis: false, se: true };
export const EMPTY_PROGRESS: Progress = { cleared: [], best: {}, worlds: 0, discovered: [], endless: [], ranking: [], achievements: [], abandoned: 0 };

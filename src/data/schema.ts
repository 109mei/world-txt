import { z } from 'zod';

// 文字列からコードを作らない（eval を使わない）。読み込めるものを絞る決まり（CSP）の下でも、決まりに触れずに動くように
z.config({ jitless: true });

/**
 * 世界の「係数」。法則・副作用・出来事は、この係数を動かすことで世界に効く。
 * mul は既定値 1 からの掛け算、add は既定値 0 からの足し算で重なる。
 */
export const CHANNEL_MODES = {
  // 食料
  foodDemand: 'mul', // 1人あたりの食料の必要量
  yield: 'mul', // 作物の収量
  agriMax: 'mul', // 農地にできる土地の広さ
  agriWater: 'mul', // 農業が使う水
  distribution: 'mul', // 食料・物資の行き渡りやすさ
  photosynth: 'add', // 人間が光から得る栄養の割合
  cropDisease: 'mul', // 作物の病気の起こりやすさ
  foodStorage: 'mul', // 食料を蓄えておける量
  // 水
  waterDemand: 'mul', // 人間が必要とする水
  waterSupply: 'mul', // 使える淡水の量
  // エネルギー
  fossilOutput: 'mul', // 化石燃料から得られるエネルギー
  fossilCO2: 'mul', // 化石燃料が出す CO2
  fossilDepletion: 'mul', // 石油の減りやすさ（0 で減らない）
  renewGrowth: 'mul', // 再生可能エネルギーへ移る速さ
  renewPower: 'mul', // 再生可能エネルギー（風・太陽）の出力
  cleanEnergy: 'add', // 燃料なしで得られる電力
  energyDemand: 'mul',
  energySupply: 'mul',
  // 産業・科学
  industry: 'mul',
  unemployment: 'add',
  science: 'mul',
  medicine: 'mul',
  // 病気
  transmission: 'mul',
  virulence: 'mul',
  outbreak: 'mul', // 新しい病原体（動物から）の現れやすさ
  mutation: 'mul', // 変異株の現れやすさ
  immunityDecay: 'mul',
  immunityFloor: 'add', // 生まれつきの免疫
  strainRelax: 'mul', // 流行した病原体が弱い型へ変わる速さ
  // 人口
  fertility: 'mul',
  aging: 'mul', // 老衰による死
  mortality: 'mul', // すべての死
  heatHuman: 'mul', // 暑さの人への害
  // 気候
  heatLife: 'mul', // 暑さの作物・生態系への害
  sun: 'mul',
  greenhouse: 'mul',
  tempEq: 'add', // 気温を直接押し上げる・下げる
  tempHold: 'mul', // 気温の変わりやすさ（0 で気温が止まる）
  co2Removal: 'add', // 大気から直接取り除かれる CO2（ppm/年）
  plantSink: 'mul', // 植物が CO2 を吸う力
  oceanSink: 'mul', // 海が CO2 を吸う力
  humanSink: 'add', // 人間が CO2 を吸う力
  emissions: 'mul',
  wildfire: 'mul',
  // 生態系・物流
  eco: 'add',
  ecoRecovery: 'mul',
  infraDamage: 'add',
  // 社会
  stability: 'add',
  happiness: 'add',
  tension: 'add',
  war: 'mul', // 戦争の起こりやすさ（0 で起こらない）
  warHarm: 'mul', // 戦争の激しさ（兵器の破壊力）
  // 世界
  coherence: 'add',
  // 心と経済・運
  mind: 'add', // 心（心の健康・生きる張り合い）を押し上げる・下げる
  inflation: 'add', // お金の増え方（物価が1年に上がる割合）
  money: 'mul', // お金が使われている度合い（0 でお金のない世界。物価も意味を失う）
  misfortune: 'mul', // 災害などの不運の起こりやすさ
} as const;

export type ChannelId = keyof typeof CHANNEL_MODES;
export const CHANNEL_IDS = Object.keys(CHANNEL_MODES) as ChannelId[];
export const ChannelIdSchema = z.enum(CHANNEL_IDS as [ChannelId, ...ChannelId[]]);
export const ModsSchema = z.partialRecord(ChannelIdSchema, z.number());
export type Mods = z.infer<typeof ModsSchema>;

/** 画面に出す世界の状態（14項目） */
export const INDICATOR_IDS = [
  'humanity',
  'food',
  'water',
  'energy',
  'eco',
  'health',
  'climate',
  'society',
  'peace',
  'science',
  'logistics',
  'industry',
  'mind',
  'prices',
] as const;
export type IndicatorId = (typeof INDICATOR_IDS)[number];
export const IndicatorIdSchema = z.enum(INDICATOR_IDS);

/** アイコン（世界共通言語）。画面ではSVG、共有テキストでは絵文字になる */
export const ICON_KEYS = [
  'humanity',
  'population',
  'food',
  'water',
  'energy',
  'eco',
  'health',
  'climate',
  'society',
  'peace',
  'science',
  'logistics',
  'industry',
  'capacity',
  'coherence',
  'civilization',
  'time',
  'warning',
  'unknown',
  'cycle',
  'war',
  'fire',
  'plant',
  'animal',
  'pathogen',
  'immunity',
  'aging',
  'death',
  'birth',
  'sleep',
  'oil',
  'electricity',
  'agriculture',
  'medicine',
  'education',
  'nation',
  'money',
  'crime',
  'happiness',
  'environment',
  'sun',
  'air',
  'co2',
  'temperature',
  'sea',
  'earth',
  'edit',
  'anomaly',
  'cold',
  'flood',
  'home',
  'dna',
  'news',
  'atom',
  'wind',
  'moon',
  'robot',
  'weapon',
  'record',
  'meteor',
  'volcano',
  'infinity',
  'rocket',
  'trophy',
  'mind',
] as const;
export type IconKey = (typeof ICON_KEYS)[number];
export const IconKeySchema = z.enum(ICON_KEYS);

export const TONES = ['good', 'ok', 'warn', 'bad', 'critical'] as const;
export type Tone = (typeof TONES)[number];

export const NEWS_CATEGORIES = [
  'WORLD',
  'SCIENCE',
  'ECONOMY',
  'TRANSPORT',
  'SOCIETY',
  'NATURE',
  'HEALTH',
  'ENERGY',
  'CLIMATE',
  'ANOMALY',
  'CRISIS',
] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];
export const NewsCategorySchema = z.enum(NEWS_CATEGORIES);

export const STAGE_IDS = ['food', 'plague', 'climate', 'war', 'energy', 'tiny', 'loop', 'endless'] as const;
export type StageId = (typeof STAGE_IDS)[number];
export const StageIdSchema = z.enum(STAGE_IDS);

/** 条件は短い文で書く（例 "foodRatio < 0.9"、"law:human_food=few_days|weekly"、"twist:overgrowth >= 0.3"、"flag:war"） */
const ConditionSchema = z.string().min(3);

const pos = z.number().nonnegative();
const Curve = z.array(z.tuple([z.number(), z.number()])).min(2);
const unit = z.number().min(0).max(1);

// ---------------------------------------------------------------- 概念・法則

export const ConceptSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: IconKeySchema,
});
export type Concept = z.infer<typeof ConceptSchema>;

export const OPTION_KINDS = ['original', 'replace', 'condition', 'exception', 'delete'] as const;

/**
 * 書いた文章をどう読み取るかの規則。1つの規則の中は「すべて満たす」、配列にすると「どれか1つ」。
 *   any: どれか1語を含む / all: すべて含む / none: どれも含まない（「@人」は lexicon.json の言葉のまとまり）
 *   flip: 元の文と肯定・否定が逆になった（「〜しない」など）。書き換え・言い回しの規則は、書かなければ「否定していない文」だけに当たる（削除の規則は別）
 *   less / more: 「少し・弱く・ゆっくり」/「多く・強く・倍」
 *   except: 「ただし〜」「〜を除く」「〜以外」の部分に含まれる言葉
 *   cond: 「〜のとき・〜だけ・〜を超えると」などの条件がある
 *   freqMax / freqMin: 頻度（毎日＝1、週に一度＝約0.14）
 */
export const MatchRuleSchema = z.object({
  any: z.array(z.string()).optional(),
  all: z.array(z.string()).optional(),
  none: z.array(z.string()).optional(),
  flip: z.boolean().optional(),
  less: z.boolean().optional(),
  more: z.boolean().optional(),
  /** 「〜に強い」「〜に負けない」 */
  resist: z.boolean().optional(),
  /** 「〜に弱い」 */
  vulnerable: z.boolean().optional(),
  except: z.array(z.string()).optional(),
  /** 「Xなしで」「Xがなくても」「Xを必要としない」の X に含まれる言葉 */
  without: z.array(z.string()).optional(),
  /** 「Xだけ」「Xのみ」「Xしか〜ない」の X に含まれる言葉 */
  only: z.array(z.string()).optional(),
  cond: z.boolean().optional(),
  freqMax: z.number().optional(),
  freqMin: z.number().optional(),
  /** 主語（「〜は」「〜が」の、「の」より後ろ）に含まれる言葉。「人間の仕事が消える」の主語は「仕事」 */
  subject: z.array(z.string()).optional(),
  /**
   * 述語（主語の「は」「が」より後ろ）がまるごとこの言葉のどれか（「猫はない」の「ない」）。
   * 「猫は泳がない」の「がない」のように、ほかの言葉の中の文字を拾わないため
   */
  rest: z.array(z.string()).optional(),
});
export type MatchRule = z.infer<typeof MatchRuleSchema>;
export const MatchSchema = z.array(MatchRuleSchema).min(1);
export type OptionKind = (typeof OPTION_KINDS)[number];

export const TwistRefSchema = z.object({
  id: z.string(),
  /** 1年に伸びる量（0〜1） */
  rate: z.number().positive().max(1),
  /** 伸び始めるまでの年数 */
  delay: z.number().int().nonnegative().default(0),
  /** 伸びる条件 */
  when: z.array(ConditionSchema).default([]),
});
export type TwistRef = z.infer<typeof TwistRefSchema>;

/** 法則の「読み取り」：書いた文章がどの意味になるか。元の文（original）と、書き換え・削除の読み取り */
export const LawOptionSchema = z.object({
  id: z.string(),
  kind: z.enum(OPTION_KINDS),
  /** 世界がどう読み取ったか（世界史に残す短い言葉） */
  label: z.string(),
  /** 元の文（original のとき）・読み取りの例文（ボットとテスト用） */
  text: z.string().optional(),
  /** 世界整合性をどれだけ下げるか */
  incoherence: pos,
  mods: ModsSchema.default({}),
  /** 遅れて効いてくる副作用 */
  twists: z.array(TwistRefSchema).default([]),
  /** この読み取りになる文章の特徴 */
  match: MatchSchema.optional(),
});
export type LawOption = z.infer<typeof LawOptionSchema>;

export const LawSchema = z.object({
  id: z.string(),
  concept: z.string(),
  /** 主語の言い換え（例：人間 → 人・人類）。元の文の主語は自動で入る */
  subject: z.array(z.string()).default([]),
  /**
   * この行が何について書かれているかを表す言葉（どれか1つ）。
   * 言い換えを「元の意味のまま」と読むときと、書き足した文章をこの行の書き換えとして読むときに使う
   */
  topic: z.array(z.string()).min(1),
  /** 「Xは存在しない」「Xが消える」と書き足したとき、この行の話として読む X（この行が X の存在そのものを表す） */
  exists: z.array(z.string()).default([]),
  /** 削除したとき「存在しないもの」として出す言葉 */
  noun: z.string().optional(),
  /** 現実の世界での事実（詳しく見る画面に出す） */
  fact: z.string().optional(),
  initial: z.string(),
  options: z.array(LawOptionSchema).min(2),
});
export type Law = z.infer<typeof LawSchema>;

// ---------------------------------------------------------------- 書き足した一文の言い回し

export const PhraseSchema = z.object({
  id: z.string(),
  /** 世界がどう読み取ったか */
  name: z.string(),
  icon: IconKeySchema,
  match: MatchSchema,
  /** 新しい概念の重さ（文章の文字数に足す世界容量。文字数で数える） */
  weight: pos,
  incoherence: pos,
  mods: ModsSchema.default({}),
  twists: z.array(TwistRefSchema).default([]),
  /** 出来事を止める印（例：no_quake） */
  setFlag: z.string().optional(),
  /**
   * あとで読む言い回し（願い・世界そのものへの命令など）。
   * 既存の行の書き換えとして読めなかったときだけ当てる
   */
  fallback: z.boolean().default(false),
  /**
   * 種類ごとの読み取り（「{X}がいなくなる」など）。ほかのどの言い回しにも法則にも読めなかったときだけ当てる。
   * fallback と一緒に使う
   */
  generic: z.boolean().default(false),
  /** 同じ意味の法則の読み取り（条件の形）。その読み取りが世界にあれば、この言い回しは重ねて効かない */
  covers: z.array(z.string()).default([]),
  /**
   * この概念が前提にしている法則（例：太陽が二つ → 太陽が照らす）。
   * その法則の行をこの文に書き換えても、法則の意味は消えない
   */
  keeps: z.array(z.string()).default([]),
  /** 例文（テスト用） */
  example: z.string(),
});
export type Phrase = z.infer<typeof PhraseSchema>;

// ---------------------------------------------------------------- 語彙

export const LexiconSchema = z.object({
  /** まとめて扱う言葉（規則の中で「@人」のように書く） */
  groups: z.record(z.string(), z.array(z.string()).min(1)),
  /** 言い換え：左の言葉にそろえてから読む */
  synonyms: z.record(z.string(), z.array(z.string()).min(1)),
  /** 英語（小文字）→ 日本語。空文字は読み飛ばす言葉 */
  english: z.record(z.string(), z.string()),
  /** 意味は持たないが、世界が知っている言葉（「知らない言葉」と言わないため） */
  common: z.array(z.string()),
  /** 日常の言葉の種類（パン→食べ物、猫→動物） */
  kinds: z.record(z.string(), z.array(z.string())).default({}),
  /** 辞書にない言葉の種類を推し量る語尾（「力」→力、「病」→病気） */
  suffixes: z.record(z.string(), z.string()).default({}),
});
export type Lexicon = z.infer<typeof LexiconSchema>;

// ---------------------------------------------------------------- 副作用

export const TwistSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: IconKeySchema,
  /** 最大まで育ったときの係数への影響 */
  mods: ModsSchema,
  /** 原因の法則が元に戻ったときに1年で減る量 */
  decay: unit.default(0.15),
  news: z
    .array(
      z.object({
        at: z.number().gt(0).max(1),
        category: NewsCategorySchema,
        text: z.string(),
        /** なぜそうなるのか（現実の仕組み） */
        why: z.string().optional(),
      }),
    )
    .default([]),
});
export type Twist = z.infer<typeof TwistSchema>;

// ---------------------------------------------------------------- 出来事

export const STATE_EFFECT_KEYS = [
  'pop',
  'agri',
  'industry',
  'energyCap',
  'infra',
  'science',
  'eco',
  'co2',
  'temp',
  'pathogen',
  'immunity',
  'stability',
  'happiness',
  'tension',
  'unemployment',
  'coherence',
  'mind',
] as const;
export type StateEffectKey = (typeof STATE_EFFECT_KEYS)[number];
const StateEffectKeySchema = z.enum(STATE_EFFECT_KEYS);

export const EventEffectsSchema = z.object({
  /** 状態への足し算 */
  add: z.partialRecord(StateEffectKeySchema, z.number()).default({}),
  /** 状態への掛け算 */
  mul: z.partialRecord(StateEffectKeySchema, z.number()).default({}),
  /** しばらく続く係数の変化 */
  mods: ModsSchema.default({}),
  duration: z.number().int().positive().default(1),
  /** 作物の病気（農業の規模と科学で軽くなる） */
  blight: unit.optional(),
  /** 新しい病原体 */
  strain: z
    .object({
      seed: pos,
      r: z.number().positive(),
      virulence: unit,
      escape: unit,
    })
    .optional(),
  /** 戦争の開始（緊張に関係なく） */
  war: unit.optional(),
  setFlag: z.string().optional(),
  clearFlag: z.string().optional(),
  /** 法則を1つ消す（世界異常：存在消失） */
  vanishLaw: z.boolean().optional(),
});
export type EventEffects = z.infer<typeof EventEffectsSchema>;

export const SEVERITIES = ['info', 'warn', 'critical'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const EventSchema = z.object({
  id: z.string(),
  category: NewsCategorySchema,
  icon: IconKeySchema,
  text: z.string(),
  /** なぜそうなるのか（現実の仕組み） */
  why: z.string().optional(),
  when: z.array(ConditionSchema).default([]),
  /** 条件を満たした年に起こる確率 */
  chance: unit.default(1),
  /** 確率に掛ける係数（例 outbreak） */
  chanceChannel: ChannelIdSchema.optional(),
  once: z.boolean().default(true),
  cooldown: z.number().int().nonnegative().default(0),
  severity: z.enum(SEVERITIES).default('info'),
  /** 「想定外の変化」として出す */
  surprise: z.boolean().default(false),
  /** 世界史に残す（既定：info 以外） */
  history: z.boolean().optional(),
  stages: z.array(StageIdSchema).optional(),
  effects: EventEffectsSchema.optional(),
});
export type EventDef = z.infer<typeof EventSchema>;

// ---------------------------------------------------------------- 結末

/**
 * 特別な結末。
 * trigger：条件が years 年続くと、その年に世界が終わる（重力が消えた・宇宙人と友になった など）。
 * flavor：人口や文明の崩壊で世界が終わったとき、条件に合えば、その滅び方の名前になる（核の冬・凍りついた星 など）
 */
export const EndingSchema = z.object({
  id: z.string(),
  kind: z.enum(['clear', 'fail']),
  type: z.enum(['trigger', 'flavor']),
  /** 結末の名前（「重力の消えた星」） */
  title: z.string(),
  /** 世界が終わったときの知らせ */
  text: z.string(),
  /** 現実の根拠 */
  why: z.string(),
  icon: IconKeySchema,
  when: z.array(ConditionSchema).min(1),
  /** 条件が何年続いたら終わるか（trigger） */
  years: z.number().int().positive().default(1),
  /** 条件が成り立った最初の年の知らせ（years が 2 以上の trigger。{n} に残りの年数） */
  warn: z.string().optional(),
  /** 大きいほど先に確かめる */
  priority: z.number().int().default(0),
});
export type Ending = z.infer<typeof EndingSchema>;

// ---------------------------------------------------------------- 実績

/**
 * 実績。world：遊んでいる世界の条件（core の条件の書き方）。end：世界が終わったとき（clear / fail / any）。
 * progress：これまでの進み具合（「cleared >= 6」「discovered >= 300」「endlessBest >= 100」「endings >= 5」）
 */
export const AchievementSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** 得たあとに見せる説明 */
  text: z.string(),
  icon: IconKeySchema,
  /** 得るまで名前も隠す */
  hidden: z.boolean().default(false),
  world: z.array(ConditionSchema).default([]),
  end: z.enum(['clear', 'fail', 'any']).optional(),
  progress: z.array(z.string()).default([]),
});
export type Achievement = z.infer<typeof AchievementSchema>;

// ---------------------------------------------------------------- 危機（無限の世界）

/**
 * 前もって知らされ、数年後に世界を襲う危機。
 * 知らせは世界の出来事で、書き換えの結果の予測ではない。どう書き換えれば防げるかは、プレイヤーが考える
 */
export const CrisisSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: IconKeySchema,
  /** 知らせ（{n} に、襲うまでの年数が入る） */
  warn: z.string(),
  /** 襲ったとき */
  strike: z.string(),
  /** 防げたとき */
  averted: z.string(),
  /** 弱められたとき */
  softened: z.string(),
  /** 現実の根拠 */
  why: z.string(),
  /** 知らせてから襲うまでの年数 */
  lead: z.number().int().positive(),
  /** この年より前には来ない */
  minYear: z.number().int().nonnegative().default(0),
  weight: pos,
  /** どれかの組の条件がすべて成り立っていれば、危機は世界を襲わない */
  avertedBy: z.array(z.array(ConditionSchema).min(1)).default([]),
  /** どれかの組が成り立っていれば、危機は弱まる */
  softenedBy: z.array(z.array(ConditionSchema).min(1)).default([]),
  /** 強さ 1 のときの効果（強さに合わせて大きくなる） */
  effects: EventEffectsSchema,
});
export type Crisis = z.infer<typeof CrisisSchema>;

// ---------------------------------------------------------------- 世界異常

export const AnomalySchema = z.object({
  id: z.string(),
  text: z.string(),
  /** なぜそうなるのか（世界の仕組みとしての説明） */
  why: z.string().optional(),
  weight: pos,
  /** この整合性より下で起こりうる */
  below: z.number(),
  effects: EventEffectsSchema,
});
export type Anomaly = z.infer<typeof AnomalySchema>;

// ---------------------------------------------------------------- コンボ・タグ

export const ComboSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: IconKeySchema,
  when: z.array(ConditionSchema).min(1),
  mods: ModsSchema.default({}),
  /** 成立したときのニュース */
  text: z.string(),
  /** なぜそうなるのか */
  why: z.string().optional(),
  good: z.boolean(),
});
export type Combo = z.infer<typeof ComboSchema>;

export const TagSchema = z.object({
  id: z.string(),
  label: z.string(),
  icon: IconKeySchema,
  when: z.array(ConditionSchema).min(1),
  /** リザルトの世界名に使う言葉（例「眠らない」） */
  title: z.string().optional(),
  /** 並べる順（大きいほど前） */
  priority: z.number().default(0),
});
export type Tag = z.infer<typeof TagSchema>;

// ---------------------------------------------------------------- 表示

const LevelSchema = z.tuple([z.number(), z.string(), z.enum(TONES)]);

export const IndicatorDefSchema = z.object({
  label: z.string(),
  icon: IconKeySchema,
  /** [この点数以上, 状態語, 色] を高い順に */
  levels: z.array(LevelSchema).min(3),
  /** メーターの両端の言葉 */
  ends: z.tuple([z.string(), z.string()]),
  /** 関連する概念（詳細画面の木） */
  related: z.array(IconKeySchema),
});
export type IndicatorDef = z.infer<typeof IndicatorDefSchema>;

export const IndicatorsSchema = z.object({
  items: z.record(IndicatorIdSchema, IndicatorDefSchema),
  climateWords: z.array(z.tuple([z.number(), z.string()])),
  civilization: z.array(z.tuple([z.number(), z.string(), z.string(), z.enum(TONES)])),
  capacity: z.array(z.tuple([z.number(), z.string(), z.enum(TONES)])),
  coherence: z.array(z.tuple([z.number(), z.string(), z.enum(TONES)])),
  /** 無限の世界の称号 [この年数以上, 称号] を短い順に */
  ranks: z.array(z.tuple([z.number(), z.string()])).min(1),
});
export type Indicators = z.infer<typeof IndicatorsSchema>;

// ---------------------------------------------------------------- ステージ

export const SimStartSchema = z.object({
  pop: pos,
  agri: pos,
  industry: pos,
  energyCap: pos,
  renewShare: unit,
  oilReserve: pos,
  infra: unit,
  science: pos,
  eco: z.number().min(0).max(100),
  co2: pos,
  temp: z.number(),
  pathogen: z.number().min(0).max(100),
  immunity: unit,
  strainR: pos,
  strainV: unit,
  stability: z.number().min(0).max(100),
  happiness: z.number().min(0).max(100),
  tension: z.number().min(0).max(100),
  unemployment: unit,
});
export type SimStart = z.infer<typeof SimStartSchema>;

export const StageSchema = z.object({
  id: StageIdSchema,
  order: z.number().int(),
  title: z.string(),
  icon: IconKeySchema,
  mission: z.string(),
  goalYears: z.number().int().positive(),
  briefing: z.array(z.string()),
  focus: z.array(IndicatorIdSchema),
  start: SimStartSchema,
  /** その世界の環境（干ばつなど） */
  mods: ModsSchema.default({}),
  capacity: pos,
  /** 世界容量（文字数）が1年に縮む量 */
  capacityDecay: pos.default(0),
  edits: z.object({ start: z.number().int().nonnegative(), every: z.number().int().positive(), max: z.number().int().positive() }),
  fail: z.object({
    /** 人口がこれ（億人）を下回ると失敗 */
    pop: pos,
    /** 文明がこの点数を下回る年が続くと失敗 */
    civ: pos,
  }),
  /** 最初の世界で法則の形を変えておく */
  overrides: z.record(z.string(), z.string()).default({}),
  /** この数の世界を救うと遊べる */
  unlock: z.number().int().nonnegative().default(0),
  /** 最初から WORLD.txt が世界容量を超えている（極小世界） */
  overflow: z.boolean().default(false),
  /** 無限の世界：目標の年はなく、文明が滅ぶまで続く。危機がやってくる */
  endless: z.boolean().default(false),
  /**
   * くり返す世界：years 年目の終わりに breakWhen を満たしていなければ、世界は0年目へ巻き戻る（暦も乱数も戻る）。
   * その前に文明が崩れても巻き戻る。書いた WORLD.txt・観測記録・世界史は残る。
   * 巻き戻るたびに世界容量が wear だけ擦り切れ、書換の力が ink だけ戻る。breakWhen を満たして越えれば、くり返しは終わる
   */
  loop: z
    .object({
      years: z.number().int().positive(),
      breakWhen: z.array(ConditionSchema).min(1),
      wear: pos,
      ink: z.number().int().nonnegative(),
      /** 巻き戻ったときの知らせ（{n} は戻った年数、{count} は何回目か） */
      news: z.string(),
      /** 途中で文明が崩れて巻き戻ったときの知らせ */
      fallNews: z.string(),
      /** くり返しを抜けたときの知らせ */
      breakNews: z.string(),
      /** 画面に出す、巻き戻る決まり */
      rule: z.string(),
    })
    .optional(),
});
export type Stage = z.infer<typeof StageSchema>;

// ---------------------------------------------------------------- 数値（balance.json）

/** 割り算に使う値は 0 にできない（0 にすると NaN が広がり、セーブが壊れる） */
const divisor = z.number().positive();

export const BalanceSchema = z.object({
  popRef: divisor,
  water: z.object({ supply: pos, heatLoss: pos, ecoBase: unit, human: pos, agri: pos, industry: pos }),
  food: z.object({
    heatCoef: pos,
    heatExp: pos,
    coldCoef: pos,
    waterBase: unit,
    waterCap: pos,
    ecoBase: unit,
    ecoRef: pos,
    energyBase: unit,
    sciCoef: pos,
    co2Curve: Curve,
    sunExp: pos,
    distBase: unit,
    land: pos,
    targetRatio: pos,
    expandRate: pos,
    shrinkAbove: pos,
    shrinkRate: pos,
    agriMin: divisor,
    laborShare: pos,
    blightDecay: unit,
    resBase: unit,
    resAgri: unit,
    resSci: unit,
    warDamage: pos,
    coldExp: pos,
    stockCap: pos,
    stockFill: unit,
    stockRot: unit,
  }),
  energy: z.object({
    reserveComfort: divisor,
    demand: pos,
    climateLoad: pos,
    cleanUnit: pos,
    expand: pos,
    shrink: pos,
    targetRatio: pos,
    transition: pos,
    climatePush: pos,
    warDamage: pos,
  }),
  disease: z.object({
    r0: pos,
    speed: pos,
    background: pos,
    min: pos,
    max: pos,
    densityBase: unit,
    medR: unit,
    medMort: unit,
    immGain: pos,
    immDecay: pos,
    strainRelax: unit,
  }),
  medicine: z.object({ base: pos, sci: pos, indBase: unit, overload: pos, overloadScale: pos }),
  pop: z.object({
    natural: pos,
    birth: pos,
    birthFoodBase: unit,
    crowdExp: pos,
    famine: pos,
    famineRef: pos,
    famineExp: pos,
    thirst: pos,
    thirstRef: pos,
    heat: pos,
    heatRef: z.number(),
    cold: pos,
    coldRef: z.number(),
    war: pos,
  }),
  industry: z.object({ sci: pos, war: pos, sick: pos, unemp: pos, rate: unit }),
  unemployment: z.object({ base: unit, industry: pos, rate: unit }),
  infra: z.object({ ref: divisor.max(1), base: unit, ind: pos, rate: unit, war: pos }),
  science: z.object({ rate: pos, warPenalty: unit }),
  climate: z.object({
    preCO2: pos,
    refCO2: pos,
    fossilEm: pos,
    indEm: pos,
    agriEm: pos,
    landEm: pos,
    fireEm: pos,
    plantSink: pos,
    oceanSink: pos,
    sensitivity: pos,
    natural: pos,
    sunCoef: pos,
    lag: unit,
    comfort: z.number(),
    coldRef: z.number(),
    fireBase: pos,
  }),
  eco: z.object({ base: pos, landCoef: pos, landFree: pos, pollution: pos, heat: pos, war: pos, fire: pos, rate: unit }),
  society: z.object({
    base: pos,
    foodRef: pos,
    food: pos,
    waterRef: pos,
    water: pos,
    energyRef: pos,
    energy: pos,
    unempRef: unit,
    unemp: pos,
    sick: pos,
    war: pos,
    fear: pos,
    happy: pos,
    deaths: pos,
    rate: unit,
  }),
  happiness: z.object({
    base: pos,
    food: pos,
    sick: pos,
    war: pos,
    unemp: pos,
    deaths: pos,
    eco: pos,
    heat: pos,
    rate: unit,
  }),
  tension: z.object({
    base: pos,
    food: pos,
    water: pos,
    energy: pos,
    instability: pos,
    climate: pos,
    rate: unit,
  }),
  war: z.object({
    threshold: pos,
    scale: pos,
    intensity: unit,
    exhaust: pos,
    exhaustGrowth: pos,
    endBelow: pos,
    cooldown: z.number().int().nonnegative(),
  }),
  coherence: z.object({ rate: unit, fearRef: pos, collapse: pos, anomalyFrom: pos, anomalyScale: pos, anomalyMax: unit }),
  capacity: z.object({
    strainFrom: pos,
    strainCoef: pos,
    graceYears: z.number().int().positive(),
    /** 版5までのセーブの世界容量（重さ）を文字数に直す：重さ × legacyChars − legacyShift */
    legacyChars: pos,
    legacyShift: pos,
  }),
  civ: z.object({ weights: z.object({ industry: unit, logistics: unit, science: unit, society: unit, humanity: unit }), graceYears: z.number().int().positive() }),
  /**
   * 心（心の健康・生きる張り合い）：ふだんは base で、概念（係数 mind）と物価で動く。
   * base から離れた分（span で割った量）だけ、幸福・安定・産業・研究・出生が動く。
   * 画面の「心」は、心に幸福の良し悪し（viewRef からの差 × view）を合わせて見せる
   */
  mind: z.object({
    base: pos,
    rate: unit,
    span: divisor,
    happy: pos,
    stability: pos,
    industry: unit,
    science: unit,
    fertility: unit,
    view: pos,
    viewRef: pos,
  }),
  /**
   * 物価（お金の価値）：お金が刷られる（係数 inflation）と、1年ごとにその割合で上がる。刷られなくなると relax で戻る。
   * 上がった分（10倍ごとに1）だけ、物流・産業・失業・安定・幸福・心が悪くなる。
   * 画面の「物価」は、食料とエネルギーの不足（viewShortage）も合わせて見せる
   */
  prices: z.object({
    relax: unit,
    max: divisor,
    distribution: pos,
    industry: pos,
    unemp: pos,
    stability: pos,
    happiness: pos,
    mind: pos,
    viewShortage: pos,
    viewEnergy: pos,
  }),

  scores: z.object({
    humanity: z.object({ base: pos, excess: pos, loss: pos, happy: pos }),
    health: z.object({ base: pos, prevalence: pos, deaths: pos, medicine: pos }),
    food: Curve,
    water: Curve,
    energy: Curve,
    eco: Curve,
    climate: Curve,
    society: Curve,
    peace: Curve,
    science: Curve,
    scienceLevel: Curve,
    logistics: Curve,
    industry: Curve,
    mind: Curve,
    prices: Curve,
  }),
  trend: z.object({ fast: pos, slow: pos }),
  /** 無限の世界の危機：最初の知らせの年、間隔（年とともに縮む）、強さ（年とともに増す） */
  crisis: z.object({
    firstAt: z.number().int().positive(),
    gapStart: pos,
    gapMin: pos,
    gapShrink: pos,
    jitter: z.number().int().nonnegative(),
    growth: pos,
    maxStrength: pos,
    /** 弱められたときの強さの倍率 */
    soften: unit,
  }),
  forecast: z.object({ years: z.number().int().positive(), fast: pos, slow: pos }),
  news: z.object({ perYear: z.number().int().positive(), historyMax: z.number().int().positive() }),
});
export type Balance = z.infer<typeof BalanceSchema>;

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
export const INDICATOR_IDS = ['humanity', 'food', 'water', 'energy', 'eco', 'health', 'climate', 'society', 'peace', 'science', 'logistics', 'industry', 'mind', 'prices'] as const;
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

// ---------------------------------------------------------------- 世界の情景（世界のタブの絵）

/**
 * 情景に描く要素。書き換えた法則・書き足した概念・副作用・危機・結末が、それぞれどの要素をどれだけ描くかを持つ（0〜1）。
 * 要素の絵は src/ui/scene にある。書き換えから来た要素はインクの色で描く
 */
export const SCENE_MOTIFS = [
  // 空と宇宙
  'twoSuns', // 二つ目の太陽
  'noSun', // 太陽が照らさない
  'sunDim', // 太陽が暗い
  'sunBright', // 太陽が明るい
  'sunFlicker', // 太陽が揺らぐ
  'sunNear', // 太陽が大きい（近い）
  'sunFar', // 太陽が小さい（遠い）
  'sunHole', // 太陽がブラックホールになった
  'blackHole', // 空のブラックホール
  'eternalDay', // 夜が来ない
  'eternalNight', // 夜が明けない
  'halfNight', // 昼と夜が分かれたまま（自転が止まった）
  'noMoon', // 月がない
  'ozone', // 紫の日差し（オゾン層がない）
  'aurora', // オーロラ
  'meteors', // 降る隕石
  'meteorMiss', // それていく隕石
  'ufo', // 宇宙人の船
  'rockets', // 星々へ向かうロケット
  'starsDim', // 星が減る
  'starsMore', // 星が増える
  'lightTrails', // 光の尾（光が遅い）
  'sparkles', // ふしぎな光（魔法）
  'godLight', // 天からの光
  'eye', // 空の目（機械・監視）
  'ghosts', // 淡い影（幽霊・魂）
  'grid', // 世界の格子（シミュレーション）
  'clock', // 空の時計（時間の書き換え）
  'frozen', // 止まった時間
  'reverse', // 逆さの時間
  'loop', // くり返す時間
  'fast', // 速い時間
  'parallel', // もう一つの町（並行世界）
  'void', // ほどけていく世界
  'strings', // 空から垂れる糸（運命・水槽の脳）
  'dreams', // 夢の泡
  'flash', // 光の炸裂（反物質・原子炉）
  'mushroom', // きのこ雲
  'glitch', // 世界の揺らぎ
  'skyCrack', // 空の亀裂
  // 天気
  'clouds', // 雲が多い
  'noClouds', // 雲がない・空が澄む
  'rain', // 雨
  'acidRain', // 酸性の雨
  'drought', // 干上がった大地
  'snow', // 雪
  'ice', // 氷（氷河・凍った海）
  'heatHaze', // 陽炎
  'wind', // 強い風
  'still', // 風が止まる
  'smog', // 汚れた空気
  'storm', // 嵐と雷
  'rainbow', // 虹
  'volcano', // 噴火
  'quake', // 地割れ
  'stones', // 降る白い石（二酸化炭素が石になる）
  'pollenWind', // 風に舞う花粉
  'crows', // 不吉な鳥
  'miasma', // 病の瘴気
  // 大地と生き物
  'forest', // 森が茂る
  'noForest', // 切り株
  'wildfire', // 山火事
  'desert', // 砂丘
  'greenDesert', // 緑の砂丘
  'moreLand', // 新しい陸地
  'fieldsEverywhere', // どこでも畑
  'seaFields', // 海の上の畑
  'barren', // 耕されない畑
  'tallCrops', // 高く伸びる作物
  'withered', // 枯れた草木
  'glowPlants', // 光る草木
  'harvest', // 黄金の実り
  'manna', // 空から降る食べ物
  'granary', // 蔵
  'animals', // 獣の群れ
  'noAnimals', // 獣がいない
  'noLivestock', // 牧場の家畜がいない
  'bees', // ハチ
  'noBees', // ハチがいない
  'birds', // 鳥の群れ
  'insects', // 蚊や害虫の群れ
  'noInsects', // 害虫がいない（蝶だけ）
  'rats', // ネズミ
  'dinosaurs', // 恐竜
  'mammoth', // よみがえった生き物
  'animalKing', // 獣の王
  'talk', // 人と動物の会話
  'ruins', // 苔むした廃墟
  // 海と水
  'seaHigh', // 海面が高い
  'noSea', // 干上がった海
  'freshSea', // 澄んだ海
  'saltSea', // 塩の浜
  'seaBubbles', // 海から湧く泡
  'seaCity', // 海底の町
  'springs', // 湧き水
  // 町と技術と社会
  'megacity', // 巨大な塔
  'villages', // 小さな村
  'walls', // 国境の壁
  'noBorders', // 国境がない
  'oneFlag', // 一つの旗
  'statue', // 独裁者の像
  'flags', // たくさんの旗
  'queue', // 人の列
  'robots', // ロボット
  'robotRevolt', // 牙をむく機械
  'aiCore', // 光る機械の塔
  'dna', // 遺伝子の螺旋
  'screensOff', // 消えた電波塔
  'wireless', // 導線のない送電塔
  'noPower', // 電気のない町
  'battery', // 尽きない電池
  'freeEnergy', // 無から生まれる光
  'fusion', // 核融合の炉
  'reactor', // 原子炉が盛ん
  'noReactor', // 原子炉がない
  'oilDry', // 止まった油井
  'oilGush', // 噴き出す油井
  'steam', // 煙が白い湯気
  'factoryIdle', // 止まった工場
  'autoCars', // ひとりでに走る車
  'portals', // 瞬間移動の輪
  'cureAll', // 光る病院
  'noMedicine', // 灯りの消えた病院
  'noSchool', // 鐘の鳴らない学校
  'lab', // 光る研究所
  'labDark', // 灯りの消えた研究所
  'coins', // 金貨
  'noMoney', // 物々交換
  'moneyRain', // 湧き出す金貨
  'paperMoney', // 舞う紙幣
  'gold', // 金のきらめき
  'cashless', // 光る支払い端末
  'papers', // 舞う紙
  'crime', // 夜の影
  'lanterns', // 灯籠
  'cameras', // 見張りのカメラ
  'graves', // 墓標
  'temple', // 光る祠
  'noTemple', // 灯りの消えた祠
  'stadium', // 競技場
  'doves', // 鳩
  'soldiers', // 兵士
  'noWeapons', // 置かれた武器
  'marketEmpty', // 人のいない市場
  'marketBusy', // にぎわう市場
  'marketClosed', // 閉ざされた市場
  // 人々
  'flyers', // 空を飛ぶ人
  'float', // 宙に浮くもの
  'heavy', // 重い体
  'slide', // すべる人
  'tiny', // 小さな人
  'giant', // 巨人
  'green', // 緑の人（光合成）
  'sleepers', // 眠る人
  'sleepless', // 眠らない町
  'blink', // 消えては現れる人
  'linked', // つながる心
  'invisible', // 透明な人
  'zombies', // 歩く死者
  'cyborgs', // 機械の体
  'beasts', // 獣に戻った人
  'naked', // 服を着ない人
  'fight', // 殴り合い
  'cannibal', // 人を食べる人
  'babies', // たくさんの子ども
  'noChildren', // 子どもがいない
  'elders', // 老いた人
  'young', // 若い人
  'halo', // 死なない人
  'joy', // 笑う人
  'blank', // 表情のない人
  'canes', // 杖の人
  'signs', // 手の言葉
  'divers', // 海で暮らす人
  'lying', // 横たわる人
  'noPeople', // 人がいない
  'clones', // 同じ顔の人
  'couples', // 寄り添う二人
  'apart', // 離れて立つ人
  'masks', // 仮面・マスクの人
  'fading', // 倒れていく人
  'crowd', // 群衆と松明
  'genius', // ひらめき
  'forget', // 忘れる人
  'thoughts', // 心の声
  'speech', // 通じる言葉
  'handshake', // 握手
  'bandage', // 包帯の人
  'daring', // 屋根の上の人
  'grazers', // 何でも食べる人
] as const;
export type SceneMotif = (typeof SCENE_MOTIFS)[number];
export const SceneMotifSchema = z.enum(SCENE_MOTIFS);

/** 種類ごとの読み取り（「猫がいなくなる」など）で、言葉を描く小さな絵の形 */
export const SPECIMEN_SHAPES = [
  'animal',
  'plant',
  'food',
  'drink',
  'machine',
  'disease',
  'matter',
  'star',
  'weather',
  'place',
  'job',
  'feeling',
  'body',
  'clothes',
  'culture',
  'study',
  'system',
  'person',
  'thing',
] as const;
export type SpecimenShape = (typeof SPECIMEN_SHAPES)[number];

/** その言葉を、世界がどう変えたか：消えた・増えた・世界を治める・ふしぎな力を持つ */
export const SPECIMEN_MODES = ['gone', 'more', 'rule', 'wonder'] as const;
export type SpecimenMode = (typeof SPECIMEN_MODES)[number];

/**
 * 情景での描き方。motifs：描く要素と強さ。specimen：言葉そのものを小さな絵と名前で描く（「{X}がいなくなる」など。label がなければ書いた文の主語）。
 * stele：絵にしにくい決まり（エネルギー保存など）を、その概念の印を刻んだ石碑として描く
 */
export const SceneSpecSchema = z.object({
  motifs: z.partialRecord(SceneMotifSchema, z.number().min(0).max(1)).default({}),
  specimen: z
    .object({
      shape: z.enum(SPECIMEN_SHAPES),
      mode: z.enum(SPECIMEN_MODES),
      label: z.string().max(12).optional(),
    })
    .optional(),
  stele: z.boolean().default(false),
});
export type SceneSpec = z.infer<typeof SceneSpecSchema>;

export const TONES = ['good', 'ok', 'warn', 'bad', 'critical'] as const;
export type Tone = (typeof TONES)[number];

export const NEWS_CATEGORIES = ['WORLD', 'SCIENCE', 'ECONOMY', 'TRANSPORT', 'SOCIETY', 'NATURE', 'HEALTH', 'ENERGY', 'CLIMATE', 'ANOMALY', 'CRISIS'] as const;
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
  /** この読み取りが効き始めた年の知らせ（世界がそのとおりに変わった姿。元の文にはない） */
  onset: z.string().max(80).optional(),
  /** 情景での描き方（元の文にはない） */
  scene: SceneSpecSchema.optional(),
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
  /** この概念が効き始めた年の知らせ（世界がそのとおりに変わった姿。{X} は書いた文の主語） */
  onset: z.string().max(80),
  /** 情景での描き方 */
  scene: SceneSpecSchema,
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
  /**
   * 世界の終わりまでの近さ（人口・文明・世界整合性・世界容量）。
   * 近さは、終わりの線を 0、状態語が「安定」になる所（人口ははじめの人口）を 1 とした位置。
   * words は [この近さ以上, 言葉, 色] を遠い順に、line は帯の上の終わりの線の位置、
   * eta は「このままなら何年で線に届くか」を見せる上限の年。
   * soon は [この年数以内に届くなら, 近さをここまでに抑える]：遠くても速く近づいていれば、言葉は急ぎを表す（約1年なら「目前」）
   */
  limits: z.object({
    words: z.array(z.tuple([z.number(), z.string(), z.enum(TONES)])).min(2),
    line: z.number().min(0.05).max(0.5),
    eta: z.number().int().positive(),
    soon: z.array(z.tuple([z.number().int().positive(), z.number()])).default([]),
  }),
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
  /**
   * 書き換えの勢い：世界の定義を書き換えると、ゆっくり動く量（産業・社会・心・気温など）の向かう先が動く。
   * その動いた分のこの割合だけ、次の1年ですぐに動く（残りは、ふだんの速さで追いつく）
   */
  impulse: z.record(z.enum(['industry', 'unemployment', 'eco', 'stability', 'happiness', 'tension', 'mind', 'coherence', 'temp']), unit),
});
export type Balance = z.infer<typeof BalanceSchema>;

/** 書き換えの勢いが効く量 */
export const IMPULSE_KEYS = ['industry', 'unemployment', 'eco', 'stability', 'happiness', 'tension', 'mind', 'coherence', 'temp'] as const;
export type ImpulseKey = (typeof IMPULSE_KEYS)[number];

// ---------------------------------------------------------------- 世界の情景（scene.json）

const SceneMotifsSchema = z.partialRecord(SceneMotifSchema, z.number().min(0).max(1));

/**
 * 法則・概念のほかに情景を動かすもの。
 * twists：副作用（育ち具合を掛ける）／crises：知らされた危機の兆し（襲う年が近いほど強い）／endings：世界の結末／
 * anomalies・eventIcons：その年に起きた世界異常と、重大な出来事（アイコンごと）／kinds：言葉の種類ごとの小さな絵の形
 */
export const SceneDataSchema = z.object({
  twists: z.record(z.string(), SceneMotifsSchema),
  crises: z.record(z.string(), SceneMotifsSchema),
  endings: z.record(z.string(), SceneMotifsSchema),
  anomalies: z.record(z.string(), SceneMotifsSchema),
  eventIcons: z.partialRecord(IconKeySchema, SceneMotifsSchema),
  kinds: z.record(z.string(), z.enum(SPECIMEN_SHAPES)),
  /**
   * 両立しない描き方（森が茂る・森がない など）。同時にあれば一つだけ残す：
   * 書き換えから来たものを先に、その中では後に書いたものを、どちらでもなければ強いほうを残す
   */
  exclusive: z.array(z.array(SceneMotifSchema).min(2)).default([]),
  /** あるものが hideAt 以上の強さであれば、それを前提にする絵を描かない（海がなければ潜る人も海の町も描かない） */
  hides: z.partialRecord(SceneMotifSchema, z.array(SceneMotifSchema).min(1)).default({}),
  hideAt: z.number().min(0).max(1).default(0.5),
});
export type SceneData = z.infer<typeof SceneDataSchema>;

// ---------------------------------------------------------------- 筆の位（書き換えられる範囲）

/**
 * 筆の位：救った世界の数で上がり、書き換えられる範囲が広がる。
 * realms は行の分野（どの概念の行を書き換えられるか）、margin は書き足せる行の数（null なら容量の許すかぎり）、
 * depth は書ける概念の無理の大きさ（incoherence）の上限（null なら何でも）、reach はその位で書ける物の言い表し。
 * stages：そのステージの危機に関わる行は、位にかかわらずいつも書き換えられる
 */
export const AccessSchema = z.object({
  realms: z.array(z.object({ id: z.string(), name: z.string().max(20), icon: IconKeySchema, concepts: z.array(z.string()).min(1) })).min(1),
  ranks: z
    .array(
      z.object({
        clears: z.number().int().nonnegative(),
        name: z.string().max(20),
        realms: z.array(z.string()),
        margin: z.number().int().nonnegative().nullable(),
        depth: z.number().nonnegative().nullable(),
        reach: z.string().max(30),
      }),
    )
    .min(2),
  stages: z.record(StageIdSchema, z.array(z.string())),
});
export type Access = z.infer<typeof AccessSchema>;

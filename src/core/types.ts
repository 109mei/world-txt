import type {
  Achievement,
  Anomaly,
  Balance,
  ChannelId,
  Combo,
  Concept,
  Crisis,
  Ending,
  EventDef,
  IconKey,
  ImpulseKey,
  IndicatorId,
  Indicators,
  Law,
  LawOption,
  Lexicon,
  Mods,
  NewsCategory,
  Phrase,
  SceneData,
  Severity,
  Stage,
  StageId,
  Tag,
  Twist,
} from '../data/schema';

/** ゲームが使う内容一式（balance.json と各 JSON を読み込んで索引を付けたもの） */
export interface GameData {
  balance: Balance;
  concepts: Concept[];
  laws: Law[];
  phrases: Phrase[];
  twists: Twist[];
  events: EventDef[];
  anomalies: Anomaly[];
  combos: Combo[];
  tags: Tag[];
  stages: Stage[];
  indicators: Indicators;
  lexicon: Lexicon;
  crises: Crisis[];
  endings: Ending[];
  achievements: Achievement[];
  /** 法則・概念のほかに情景を動かすもの */
  scene: SceneData;
  // 索引
  lawById: Map<string, Law>;
  optionOf: Map<string, Map<string, LawOption>>;
  conceptById: Map<string, Concept>;
  phraseById: Map<string, Phrase>;
  twistById: Map<string, Twist>;
  comboById: Map<string, Combo>;
  stageById: Map<StageId, Stage>;
  crisisById: Map<string, Crisis>;
  endingById: Map<string, Ending>;
}

export type Channels = Record<ChannelId, number>;

/** 世界の内部状態（プレイヤーには状態語で見せる） */
export interface SimState {
  /** 人口（億人） */
  pop: number;
  /** 農業の規模 */
  agri: number;
  industry: number;
  energyCap: number;
  /** 再生可能エネルギーの割合 */
  renewShare: number;
  /** 石油の残り（今の使い方で何年分か） */
  oilReserve: number;
  /** 物流・インフラ（0〜1） */
  infra: number;
  science: number;
  /** 生態系（0〜100） */
  eco: number;
  /** CO2（ppm） */
  co2: number;
  /** 気温（産業革命前との差、℃） */
  temp: number;
  /** 流行の広さ（0〜100） */
  pathogen: number;
  immunity: number;
  /** 今の病原体のうつりやすさ・重さ */
  strainR: number;
  strainV: number;
  /** 作物の病気の被害（0〜1） */
  blight: number;
  /** 食料の備蓄（1年の必要量に対する割合） */
  foodStock: number;
  stability: number;
  happiness: number;
  tension: number;
  /** 戦争の激しさ（0 で平和） */
  war: number;
  unemployment: number;
  /** 世界整合性（0〜100） */
  coherence: number;
  /** 世界容量の上限 */
  capacityMax: number;
  /** 心（心の健康・生きる張り合い。0〜100、ふだんは balance.mind.base） */
  mind: number;
  /** 物価（お金の価値の逆数。はじめは 1、お金が刷られるほど上がる） */
  prices: number;
}

/** 状態から計算した量（表示・条件・原因の説明に使う） */
export interface Derived {
  foodRatio: number;
  waterRatio: number;
  energyRatio: number;
  research: number;
  medicine: number;
  birthRate: number;
  deathRate: number;
  /** 老衰以外の死（飢え・渇き・暑さ・寒さ・戦争・病気） */
  excessDeaths: number;
  famineDeaths: number;
  diseaseDeaths: number;
  heatDeaths: number;
  capacityUsed: number;
  capacityRatio: number;
  incoherence: number;
  civ: number;
  distribution: number;
  /** お金が使われている度合い（0 でお金のない世界） */
  money: number;
  /** 原因の説明に使う要因（1 が普通。小さいほど足を引っぱっている） */
  factors: {
    food: { water: number; heat: number; eco: number; energy: number; blight: number; land: number; demand: number; logistics: number; sun: number; stock: number; production: number };
    water: { supply: number; demand: number; heat: number };
    energy: { fuel: number; demand: number; war: number };
  };
}

export type Trend = 'up2' | 'up' | 'flat' | 'down' | 'down2';

export type FailReason = 'humanity' | 'civilization' | 'coherence' | 'capacity';

/** 出来事の原因になった WORLD.txt の行 */
export interface CauseRef {
  /** 行の文章（消した行は元の文） */
  text: string;
  deleted: boolean;
  /** その行を書いた年 */
  year: number | null;
}

export interface NewsItem {
  year: number;
  category: NewsCategory;
  icon: IconKey;
  text: string;
  /** なぜそうなるのか */
  why: string | null;
  severity: Severity;
  surprise: boolean;
  /** プレイヤーの書いたどの行から来たか */
  cause: CauseRef | null;
  /** 書き換えた一文が効き始めた（世界がそのとおりに変わった）知らせ */
  onset?: boolean;
}

export type HistoryKind = 'start' | 'edit' | 'event' | 'twist' | 'combo' | 'anomaly' | 'war' | 'crisis' | 'end';

export interface HistoryEntry {
  year: number;
  kind: HistoryKind;
  icon: IconKey;
  text: string;
  why: string | null;
  severity: Severity;
  /** プレイヤーの書いたどの行から来たか（古いセーブにはない） */
  cause?: CauseRef | null;
}

/** 状態語は変わらないが、はっきり動いた項目（矢印だけで見せる） */
export interface IndicatorMove {
  id: IndicatorId;
  trend: Trend;
  better: boolean;
}

export interface IndicatorChange {
  id: IndicatorId | 'capacity' | 'coherence';
  from: string;
  to: string;
  trend: Trend;
  better: boolean;
}

/** 時間を進めた結果 */
export interface StepReport {
  from: number;
  to: number;
  requested: number;
  /** 重大な出来事で途中で止まったとき、その理由 */
  interrupted: string | null;
  changes: IndicatorChange[];
  /** 状態語は変わらないが、はっきり動いた項目 */
  moves?: IndicatorMove[];
  /** 人口（億人）：進める前と後 */
  pop?: { from: number; to: number };
  /** この年から効き始めた意味（inEffect の鍵）。情景で、新しく描かれたものを見せる */
  became?: string[];
  news: NewsItem[];
}

export interface ActiveEffect {
  source: string;
  mods: Mods;
  remaining: number;
}

export interface GameState {
  /** state の形の版 */
  schema: number;
  seed: number;
  rng: number;
  stageId: StageId;
  year: number;
  status: 'playing' | 'cleared' | 'failed';
  failReason: FailReason | null;
  startPop: number;
  sim: SimState;
  derived: Derived;
  scores: Record<IndicatorId, number>;
  prevScores: Record<IndicatorId, number>;
  prevMeta: { capacityRatio: number; coherence: number; civ: number };
  /** 法則ごとの今の文章（空なら削除） */
  texts: Record<string, string>;
  /** 法則ごとに、世界が読み取った意味（option id） */
  laws: Record<string, string>;
  /** 法則ごとに、世界が意味を読み取れたか */
  understood: Record<string, boolean>;
  /** 書き足した行 */
  extras: ExtraLine[];
  /**
   * 行が運ぶ意味（法則の行は法則の id、書き足した行は x1 などの id）。
   * その行の法則の読み取りのほかに、書き足した概念や、ほかの法則についての読み取り（重ね書き）を持てる
   */
  carried: Record<string, Carried>;
  nextExtra: number;
  /** 法則を最後に書き換えた年 */
  lawYear: Record<string, number>;
  edits: { left: number; used: number; nextAt: number };
  /** 副作用の育ち具合（0〜1） */
  twists: Record<string, number>;
  /** 副作用の原因が続いた年数 */
  twistAge: Record<string, number>;
  effects: ActiveEffect[];
  flags: Record<string, true>;
  /** 出来事が最後に起きた年 */
  fired: Record<string, number>;
  combos: string[];
  counters: { civLow: number; capOver: number; peaceYears: number; warCooldown: number; warYears: number };
  history: HistoryEntry[];
  report: StepReport | null;
  stats: { edits: number; wars: number; anomalies: number; minPop: number; maxPop: number };
  /**
   * この世界で見つけたもの（観測記録の id。見つけた順）。
   * r:法則.読み取り / p:言い回し / t:副作用 / e:出来事 / c:コンボ / a:世界異常 / g:タグ / end:ステージ.結末
   */
  found: string[];
  /** 年ごとの人口（億人）と文明の点数（リザルトの曲線に使う。0 年目から） */
  trace: { pop: number[]; civ: number[] };
  /** 知らされている危機（無限の世界）。at の年に世界を襲う */
  crisis: ActiveCrisis | null;
  /** 次の危機を知らせる年（-1：危機の来ない世界） */
  nextCrisis: number;
  /** 危機を防いだ・弱めた・受けた数 */
  crises: { averted: number; softened: number; struck: number };
  /** 今日の世界で遊んでいるなら、その日付（YYYY-MM-DD） */
  daily: string | null;
  /** 世界の結末（終わったときだけ）：特別な結末の id、または clear / humanity / civilization / coherence / capacity */
  ending: string | null;
  /** 特別な結末（trigger）の条件が続いている年数 */
  endingYears: Record<string, number>;
  /** くり返す世界（ステージ「くり返す十年」）：くり返しが始まった年と、その年の世界の様子、巻き戻った回数、抜け出したか */
  loop: TimeLoop | null;
  /**
   * 去年1年のあいだ世界に効いていた意味（o:法則.読み取り、o:法則.読み取り@行、p:言い回し@行）。
   * 書いたばかりの行は、時間を進めて初めてここに入る（情景も知らせも、時間を進めてから）
   */
  inEffect: string[];
  /** 書き換えの勢い：まだ世界に届いていない、ゆっくり動く量の向かう先の動き（次の1年で balance.impulse の割合だけ動く） */
  impulse: Partial<Record<ImpulseKey, number>>;
}

/** 巻き戻るときに戻す、世界の側の様子（書き手の側のもの＝WORLD.txt・書換の力・世界容量・観測記録・世界史は含めない） */
export interface WorldSnapshot {
  sim: SimState;
  rng: number;
  twists: Record<string, number>;
  twistAge: Record<string, number>;
  effects: ActiveEffect[];
  flags: Record<string, true>;
  fired: Record<string, number>;
  counters: GameState['counters'];
  endingYears: Record<string, number>;
}

export interface TimeLoop {
  start: number;
  snapshot: WorldSnapshot;
  count: number;
  /** くり返しを抜け出した */
  done: boolean;
}

export interface ActiveCrisis {
  id: string;
  /** 世界を襲う年 */
  at: number;
  /** 強さ（年とともに増す） */
  strength: number;
}

export type EditBlock = 'ended' | 'same' | 'no-edits' | 'capacity' | 'unknown' | 'empty' | 'redundant';

/** 行が運ぶ意味 */
export interface Carried {
  /** 書き足した概念（言い回しの id。1行に複数書ける） */
  phrases: string[];
  /** ほかの法則についての読み取り（その法則の行とは別に、重ねて効く） */
  law: { id: string; option: string } | null;
}

/** 書き足した一文 */
export interface ExtraLine {
  id: string;
  text: string;
  /** 古い形（版2まで）の読み取り。今は GameState.carried に入れる */
  phrase?: string | null;
  year: number;
}

/** 読み取れなかった文の種類 */
export type NoiseInfo = { kind: 'symbols' | 'short' | 'question' | 'foreign' | 'unknown-words' | 'unclear'; words: string[] };

/** 書き換えの結果 */
export interface EditResult {
  block: EditBlock | null;
  understood: boolean;
  /** 世界がどう読み取ったか */
  reading: string | null;
  /** 足りない世界容量 */
  shortage: number;
  /** 書き足した文章を、既存の行の書き換えとして読んだときの行（法則の id） */
  redirect: string | null;
  /** 同じ意味の行がすでにあるとき（block が redundant）、その行 */
  sameAs: { kind: 'law' | 'line'; id: string } | null;
  /** 行をまったく別の話に書き換えて、元の定義が世界から消えた */
  replaced: boolean;
  /** 重ね書き：すでに書き換えた行と同じものについて、別の意味を書き足した（その法則の id） */
  stacked: string | null;
  /** 読み取れなかったとき、その理由 */
  noise: NoiseInfo | null;
}

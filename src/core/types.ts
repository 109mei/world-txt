import type {
  Access,
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
  ReadMode,
  SceneData,
  Severity,
  Source,
  Unlocks,
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
  /** 画面に出る現実の数字の出典（鍵は「ファイル/id/欄」） */
  sources: Record<string, Source>;
  /** 開いていく順番（学問の仕組み・段・発見） */
  unlocks: Unlocks;
  /** 規則の版（データの中身から決まる。棋譜を再生できるかどうかに使う） */
  rulesVersion: string;
  /** 法則・概念のほかに情景を動かすもの */
  scene: SceneData;
  /** 筆の位（救った世界の数で、書き換えられる範囲が広がる） */
  access: Access;
  // 索引
  lawById: Map<string, Law>;
  optionOf: Map<string, Map<string, LawOption>>;
  /**
   * 画面に出る名前（言い回しの name・読み取りの label）→ その意味。名前をそのまま書けば、その意味に読む（P3）。
   * 鍵は読むための形（canonical。文の終わりの「（…）」の説明は除く）
   */
  nameIndex: Map<string, NamedMeaning>;
  conceptById: Map<string, Concept>;
  phraseById: Map<string, Phrase>;
  twistById: Map<string, Twist>;
  comboById: Map<string, Combo>;
  stageById: Map<StageId, Stage>;
  crisisById: Map<string, Crisis>;
  endingById: Map<string, Ending>;
}

/** 名前の索引の中身：言い回し、または法則の読み取り */
export type NamedMeaning = { kind: 'phrase'; id: string } | { kind: 'law'; law: string; option: string };

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
  /** 慣れた暮らしの基準（暮らしの水準の対数。0 で足りている暮らし） */
  ref: number;
  /** 期待：良かったころの暮らしの水準（少しずつ忘れる） */
  peak: number;
  /** 信頼（0〜100。築くのは遅く、壊れるのは速い） */
  trust: number;
  /** 先行きの不安（0〜100） */
  anxiety: number;
  /** 感染への用心（0〜1） */
  caution: number;
  /** 限りを超えた暮らしが続いている年数 */
  overshoot: number;
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
  /** 行と出来事のあいだの、打撃を強めた世界の変化（「農業の縮小」）。直接の原因なら書かない */
  via?: string;
  /** 空白だった行を世界が埋めた文（プレイヤーが書いた文ではない。画面では赤いインク） */
  world?: boolean;
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
  /** どこから来た記録か（出来事 e:・副作用 t:・人々の変わり目 h:・危機 k:・異常 a:。敗因の振り返りで使う） */
  ref?: string;
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
  /**
   * 静かな年：状態語の変わった項目も、注意の知らせも、効き始めた一文もない1年（新しい兆しがないかは、画面の側で signsOf を比べて確かめる）。
   * 画面は計算の演出を短くし、結果の画面を出さずに世界へ戻る
   */
  quiet?: boolean;
}

export interface ActiveEffect {
  source: string;
  mods: Mods;
  remaining: number;
}

/** 世界に書いた1手（棋譜の1行）。同じ世界番号で、同じ年に同じ手を書けば、同じ世界になる */
export interface Move {
  /** 書いた年と、くり返す世界の何周目か */
  year: number;
  pass: number;
  /** 書いた行（law:行の id・line:書き足した行の id）か、新しく書き足したか（new） */
  target: string;
  kind: 'rewrite' | 'add' | 'delete';
  text: string;
  /** 世界がどう読み取ったか（見返すため） */
  reading: string | null;
}

export interface GameState {
  /** state の形の版 */
  schema: number;
  /** この世界に書いた手（棋譜）。書いた順 */
  moves: Move[];
  /** 学問の仕組み（世界の決まり）の強さ：紹介する前は弱く、紹介した年から本来の強さへ（書かなければ本来の強さ） */
  intro: Record<string, number>;
  /** 世界を作ったときの決まりの強さ（棋譜から作り直すため） */
  introStart: Record<string, number>;
  /** 分かれ道からやり直した世界（棋譜で途中まで作り直した世界。印の「少ない手で」「早く見抜いた」は付かない） */
  branched: boolean;
  /** 分かれ道：原因の壁の兆しが最初に出た年とその周、その壁（出ていなければ null） */
  branch: { year: number; id: string; pass: number } | null;
  /** 原因に効く手（原因の壁を止める手）を初めて打った年（まだなら null） */
  countered: number | null;
  /** 改稿者の試練（ふつうの世界は null）：重なる2つ目の原因の型と、型の兆しが遅れる年数 */
  trial: { kind: 'double' | 'late' | 'few'; cause2: string | null; late: number } | null;
  /** 世界番号（世界の初期条件を決める。遊んでいる間は使わない） */
  seed: number;
  stageId: StageId;
  /** この世界の原因の型（ステージの causes の id。型のないステージは null） */
  cause: string | null;
  /** 効きが落ちてきたことを知らせた意味（同じことを何度も知らせない） */
  adapted: string[];
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
  /**
   * 空白の行（消した行と、消した年）。balance.voids.years 年のうちに書き換え・書き足しで埋めなければ、
   * 世界がいちばん起こりやすい形（laws.json の voidFill）で埋める
   */
  voids: Record<string, number>;
  /** 消し跡：空白の行に残る字数（消した文の字数 × balance.voids.scar。世界容量で数える） */
  scars: Record<string, number>;
  /** 世界が埋めた行と、埋めた年（プレイヤーが書き直すまで、画面では赤いインク） */
  filled: Record<string, number>;
  /** 行ごとの言い切りの強さ（書いた文から決まる。効き目と反動に掛かる。書いていない行は 1） */
  strength: Record<string, number>;
  /** 書き方の読み分けの手がかり（行ごと。制度か条件つきと読んだ行だけ。ほかは言い回しの既定の読まれ方） */
  modes: Record<string, 'rule' | 'conditional'>;
  /** 性質として書いた行の、考え方の広がった割合（0〜1） */
  spread: Record<string, number>;
  /** 制度に締め出された振る舞い（言い回しの id）。一度締め出されると、制度を消しても戻らない */
  crowded: Record<string, true>;
  /** 行ごとの、書き直した回数（2度目からは上書きの傷として世界整合性を下げる） */
  rewrites: Record<string, number>;
  /** 短く言い換えて空けた行（同じ意味のまま短くできるのは、1行につき1度まで） */
  trims: Record<string, true>;
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
  /** noise：世界に届かなかった文を書こうとした回数（書換の力は使わない） */
  stats: { edits: number; wars: number; anomalies: number; minPop: number; maxPop: number; noise: number };
  /**
   * 起きる力（出来事・世界異常の、たまり具合）。条件のそろった年ごとに確率の分だけたまり、1 に届いた年に必ず起きる。
   * 鍵は e:出来事 と anomaly。はじめのたまり具合は世界番号から決まる（遊んでいる間はさいころを振らない）
   */
  charge: Record<string, number>;
  /**
   * この世界で見つけたもの（観測記録の id。見つけた順）。
   * r:法則.読み取り / p:言い回し / t:副作用 / e:出来事 / c:コンボ / a:世界異常 / g:タグ / end:ステージ.結末
   */
  found: string[];
  /** 年ごとの人口（億人）と文明の点数（リザルトの曲線に使う。0 年目から） */
  /** 年ごとの曲線：人口・文明と、慣れ（暮らしの水準・慣れた水準） */
  trace: { pop: number[]; civ: number[]; living: number[]; ref: number[] };
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
  /** この世界で書き換えられる範囲（筆の位とステージで決まる。null ならすべて自由） */
  access: WriteAccess | null;
}

/**
 * 書き換えられる範囲。concepts はいつも書き換えられる概念の行（知らされた危機に関わる行は、そのあいだだけ開く）、
 * margin は書き足せる行の数、depth は書ける概念の無理の大きさの上限（どちらも null なら限りなし）、rank は筆の位
 */
export interface WriteAccess {
  rank: number;
  concepts: string[];
  margin: number | null;
  depth: number | null;
}

/** 巻き戻るときに戻す、世界の側の様子（書き手の側のもの＝WORLD.txt・書換の力・世界容量・観測記録・世界史は含めない） */
export interface WorldSnapshot {
  sim: SimState;
  charge: Record<string, number>;
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

export type EditBlock = 'ended' | 'same' | 'no-edits' | 'capacity' | 'unknown' | 'empty' | 'redundant' | 'sealed' | 'margin' | 'heavy' | 'noise' | 'trimmed';

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
  /** 読み取れなかったとき、その理由（block が noise。書換の力も世界容量も使わない） */
  noise: NoiseInfo | null;
  /** 封じられた行を書き換えようとしたとき（block が sealed）、その行（法則の id）と、その行が開く筆の位 */
  sealed?: { law: string; rank: number } | null;
  /** いまの筆には重すぎる概念を書こうとしたとき（block が heavy）、その概念の名前と、それを書ける筆の位 */
  heavy?: { name: string; rank: number } | null;
  /** 書いた文の言い切りの強さ（強い・ふつう・控えめ）。世界の読みとして見せる（結果の予測ではない） */
  strength?: 'strong' | 'plain' | 'mild';
  /** 人の振る舞いの言い回しなら、その読まれ方（性質・制度・条件つき）。世界の読みとして見せる */
  mode?: ReadMode | null;
}

/**
 * 起きかけていること（兆し）。書き換えの結果の予測ではなく、今の世界で育っているものの知らせ。
 * years：このままなら何年ほどで起きるか（わからなければ null）
 */
export interface Sign {
  id: string;
  kind: 'event' | 'war' | 'crisis' | 'twist' | 'people';
  icon: IconKey;
  text: string;
  years: number | null;
  tone: 'warn' | 'bad' | 'critical';
}

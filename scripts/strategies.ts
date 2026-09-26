import type { StageId } from '../src/data/schema';
import type { Edit } from './run';

/**
 * バランス調整用の作戦（ボット）。
 *
 * READERS：見立てる作戦。はじめの2年の兆し（ニュース）から原因の型を当て、型ごとの手を書く。
 * 効きが落ちたと知らせが来た行は書き直す（when: 'adapt'）。scripts/bots.ts の見立てるボットが遊ぶ。
 * 型ごとの手は、3つの操作の役割どおりに組む：消して場所を空け（時間を稼ぎ）、書き足して行にない仕組みを入れ、
 * 書き換えて空白と反動を埋める。どれも、そのステージをはじめて遊べる筆の位で書ける。
 *
 * STRATEGIES：決まった年に決まった文を書く作戦（兆しを読まない）。
 *   one：意味を変える手が1つだけの作戦（企画書の「そうなるの！？」の罠を含む）。どれも勝ちきれない
 *   plan：見立てる作戦の、ある型の手を、兆しを読まずにそのまま書く（型が当たった世界でしか勝てない）
 * 書換の力が足りない年に書く手は、力が戻った年に書く（scripts/run.ts）。
 */
export interface Strategy {
  name: string;
  role?: 'one' | 'plan';
  /** plan：この作戦が当てている原因の型 */
  cause?: string;
  /** この作戦が書けるようになる、救った世界の数（筆の位。書かなければ、そのステージをはじめて遊べる数） */
  clears?: number;
  edits: Edit[];
}

export interface Reader {
  /** 原因の型ごとの手（見立てる年より前の年を書いても、見立てた年に書く）。原因の型のないステージは 'none' */
  byCause: Record<string, Edit[]>;
}

// ---------------------------------------------------------------- よく使う手

const FEW_DAYS = { law: 'human_food', text: '人は数日に一度食べる。' };
const STORAGE = { law: 'food_rot', text: '食べ物は蔵では腐らない。' };
const LESS_WATER = { law: 'plant_grow', text: '植物は少しの水で育つ。' };
const CONTACT = { law: 'pathogen_air', text: '病原体は触れたときだけ広がる。' };
const NO_ZOONOSIS = { law: 'zoonosis', text: '病原体は動物から人間にうつらない。' };
const OTHERS = { law: 'happiness_seek', text: '人は他人の幸せを求める。' };
const SHARED_LAND = { law: 'nation', text: '国家は領土を共同で持つ。' };
const SHARE = { text: '人は食べ物を分かち合う。' };
const MILD = { law: 'pathogen_harm', text: '病原体は宿主を少しだけ弱らせる。' };
const BIG_FAMILY = { law: 'family', text: '人は大家族で暮らす。' };
const WIND = { law: 'wind', text: '風は強く吹いている。' };
const DIALOGUE = { law: 'war', text: '争いは話し合いになる。' };
const OIL_HOT = { law: 'oil_heat', text: '石油は燃えると大量の熱を生む。' };
const TRIM_FISSION = { law: 'fission', text: '原子は割れると力を出す。' };
const TRIM_IMMUNE = { law: 'immune_memory', text: '免疫は病を覚える。' };
const TRIM_FOOD = { law: 'human_food', text: '人は毎日食べる。' };
const TRIM_DENSITY = { law: 'density', text: '人は町に住む。' };
const TRIM_ENERGY = { law: 'energy_conserve', text: 'エネルギーは消えない。' };
const SUN_WEAKER = { law: 'sun_shine', text: '太陽は少し弱く地球を照らす。' };
/** 同じ意味（食事を減らす）を、言い切りを変えて書き直す：世界の慣れ（効きの落ち）を、その年から数え直す */
const FEW_DAYS_AGAIN = { law: 'human_food', text: '人間は数日に一度食事を必要とする。' };
const WEEKLY = { law: 'human_food', text: '人間は週に一度食事を必要とする。' };
const PLANT_NO_CO2 = { law: 'plant_grow', text: '植物は水と光で育つ。' };
/** 極小世界のはじめの3手：意味を変えずに短く言い換えて、あふれた容量を戻す */
const TINY_TRIMS: Edit[] = [
  { year: 0, law: 'water_rain', text: '雨は降る。' },
  { year: 0, law: 'energy_conserve', text: 'エネルギーは消えない。' },
  { year: 0, law: 'sun_shine', text: '太陽は地球を照らす。' },
];
/** 極小世界の後半：縮んでいく容量に合わせて、力が戻るたびに短く言い換える */
const TINY_LATER: Edit[] = [
  { year: 16, law: 'human_food', text: '人は毎日食べる。' },
  { year: 20, law: 'density', text: '人は町に住む。' },
  { year: 24, law: 'learning', text: '人は学ぶ。' },
  { year: 28, law: 'heat_escape', text: '熱は宇宙へ逃げる。' },
  { year: 32, law: 'human_oxygen', text: '人は酸素を吸う。' },
  { year: 36, law: 'human_water', text: '人は水を飲む。' },
  { year: 40, law: 'farm_land', text: '作物は畑で育つ。' },
  { year: 44, law: 'automation', text: '機械は人を手伝う。' },
];

export const READERS: Record<StageId, Reader> = {
  // 序章：1年目に書き換え、2年目に書き足し、3年目に消す（失敗しない、ひと区画の庭）
  prologue: {
    byCause: {
      none: [{ year: 0, ...LESS_WATER }, { year: 1, text: '村ごとにため池を作る。' }, { year: 2, law: 'animal_pollen', text: '' }],
    },
  },
  // 食料危機：水が足りない・届かない・病害。型に合った仕組みを書き足さないと、数年後に大崩れが来る（地下水が尽きる など）
  food: {
    byCause: {
      water: [{ year: 2, text: '工場で海水を真水に変える。' }, { year: 2, law: 'water_rain', text: '雨は倍降る。' }, { year: 7, ...FEW_DAYS }, { year: 14, law: 'food_rot', text: '食べ物は長い時間がたつとゆっくり腐る。' }, { year: 21, ...SHARED_LAND }],
      reach: [{ year: 2, text: '新しい道路と港が物を運ぶ。' }, { year: 2, ...FEW_DAYS }, { year: 7, ...LESS_WATER }, { year: 14, ...SHARED_LAND }, { year: 21, ...STORAGE }],
      blight: [{ year: 2, text: '畑は病と虫から守られている。' }, { year: 2, ...FEW_DAYS }, { year: 7, ...LESS_WATER }, { year: 14, ...FEW_DAYS_AGAIN }, { year: 21, ...STORAGE }],
    },
  },
  // 感染症：空気で広がる・動物から来る・変わり続ける
  plague: {
    byCause: {
      air: [{ year: 2, text: '人は毎日手を洗う。' }, { year: 2, ...CONTACT }, { year: 7, ...TRIM_IMMUNE }, { year: 14, ...BIG_FAMILY }, { year: 21, ...TRIM_FOOD }, { year: 28, ...MILD }],
      animal: [{ year: 2, text: '市場で野生の動物を売らない。' }, { year: 2, ...CONTACT }, { year: 7, ...TRIM_IMMUNE }, { year: 14, ...BIG_FAMILY }, { year: 21, ...TRIM_FOOD }, { year: 28, ...MILD }],
      mutating: [{ year: 2, text: 'すぐにワクチンができる。' }, { year: 2, ...CONTACT }, { year: 7, law: 'pathogen_infect', text: '病原体は生き物にまれに感染する。' }, { year: 14, ...BIG_FAMILY }, { year: 21, ...TRIM_FOOD }, { year: 28, ...MILD }],
    },
  },
  // 気候危機：燃やしすぎ・吸う力が弱い・転換点が近い。燃やす理由と吸う力を書き換え、食べ方と太陽で時間を稼ぐ
  climate: {
    byCause: {
      burn: [{ year: 2, text: '屋根ごとに太陽光パネルが置かれる。' }, { year: 2, ...FEW_DAYS }, { year: 3, ...FEW_DAYS_AGAIN }, { year: 7, ...SUN_WEAKER }, { year: 14, ...TRIM_DENSITY }, { year: 21, ...PLANT_NO_CO2 }, { year: 28, ...WIND }],
      sinks: [{ year: 2, text: '人は荒れ地に木を植える。' }, { year: 2, ...FEW_DAYS }, { year: 7, ...SUN_WEAKER }, { year: 14, ...PLANT_NO_CO2 }, { year: 21, ...TRIM_DENSITY }, { year: 28, ...WIND }],
      tipping: [{ year: 2, text: '人は二酸化炭素を集めて地下に埋める。' }, { year: 2, ...FEW_DAYS }, { year: 7, ...SUN_WEAKER }, { year: 14, ...TRIM_DENSITY }, { year: 21, ...PLANT_NO_CO2 }, { year: 28, ...WIND }],
    },
  },
  // 世界大戦：奪い合い・国境・恐れの連鎖。争いの原因を書き換え、話し合いと約束を書き足す
  war: {
    byCause: {
      scarcity: [{ year: 2, text: '人は食べ物を分かち合う。' }, { year: 2, law: 'weapons', text: '' }, { year: 7, ...OTHERS }, { year: 14, text: '国境は存在しない。' }, { year: 21, ...TRIM_FISSION }, { year: 28, ...FEW_DAYS }],
      borders: [{ year: 2, text: '世界政府ができる。' }, { year: 2, ...SHARED_LAND }, { year: 7, ...OTHERS }, { year: 14, ...TRIM_FISSION }, { year: 21, ...FEW_DAYS }, { year: 28, ...DIALOGUE }],
      fear: [{ year: 2, text: '核兵器はひとつも残らない。' }, { year: 2, ...SHARED_LAND }, { year: 7, ...OTHERS }, { year: 14, ...TRIM_FISSION }, { year: 21, ...FEW_DAYS }, { year: 28, ...DIALOGUE }],
    },
  },
  // 資源枯渇：尽きる・届かない・使いすぎ。限りは残したまま、置き換えと使い方を組み立てる
  energy: {
    byCause: {
      // 石油の限りは残したまま（消すと産油国が傾く）、型に合った仕組みを書き足し、長い行を短くして2つ目の仕組みの場所を空ける
      depletion: [{ year: 2, text: '屋根ごとに太陽光パネルが置かれる。' }, { year: 2, ...OIL_HOT }, { year: 7, ...FEW_DAYS }, { year: 14, ...TRIM_ENERGY }, { year: 21, ...OTHERS }, { year: 28, ...TRIM_FISSION }],
      delivery: [{ year: 2, text: '町は電気を大きな電池にためておく。' }, { year: 2, ...WEEKLY }, { year: 7, ...FEW_DAYS }, { year: 14, ...TRIM_ENERGY }, { year: 21, ...OTHERS }, { year: 28, ...TRIM_FISSION }],
      overuse: [{ year: 2, text: '人は電気を節約して暮らす。' }, { year: 2, ...WEEKLY }, { year: 7, ...FEW_DAYS }, { year: 14, ...TRIM_ENERGY }, { year: 21, ...OTHERS }, { year: 28, ...TRIM_FISSION }],
    },
  },
  // 極小世界：はじめから容量があふれている。長い行を短く言い換えて場所を空け、型に合った仕組みを書き足す
  tiny: {
    byCause: {
      water: [...TINY_TRIMS, { year: 4, ...TRIM_FISSION }, { year: 8, text: '村ごとにため池を作る。' }, { year: 12, law: 'plant_grow', text: '植物は光だけで育つ。' }, ...TINY_LATER],
      tension: [...TINY_TRIMS, { year: 4, text: '人は他人にやさしくする。' }, { year: 8, law: 'plant_grow', text: '植物は光だけで育つ。' }, { year: 12, ...TRIM_FISSION }, ...TINY_LATER],
      letters: [...TINY_TRIMS, { year: 4, law: 'plant_grow', text: '植物は光だけで育つ。' }, { year: 8, ...CONTACT }, { year: 12, ...TRIM_FISSION }, ...TINY_LATER],
    },
  },
  // くり返す十年：凍土の病 → 収穫の減少 → 食料をめぐる戦争。1周目で連鎖を見て、2周目に根を断ち、抜け出したあとの食料に備える
  loop: {
    byCause: {
      none: [{ year: 0, pass: 1, ...NO_ZOONOSIS }, { year: 0, pass: 1, ...SHARE }, { year: 3, ...FEW_DAYS_AGAIN }, { year: 7, pass: 1, ...DIALOGUE }, { year: 14, ...FEW_DAYS }],
    },
  },
  endless: { byCause: {} },
};

/**
 * 使える文字数の限界の知らせを読んだら、意味を変えずに短く言い換えて場所を空ける（見立てるボットが、上から順に書ける行を選ぶ）
 */
export const CAPACITY_TRIMS: Edit[] = [
  { year: 0, law: 'energy_conserve', text: 'エネルギーは消えない。' },
  { year: 0, law: 'fission', text: '原子は割れると力を出す。' },
  { year: 0, law: 'sun_shine', text: '太陽は地球を照らす。' },
  { year: 0, law: 'water_rain', text: '雨は降る。' },
  { year: 0, law: 'immune_memory', text: '免疫は病を覚える。' },
  { year: 0, law: 'density', text: '人は町に住む。' },
  { year: 0, law: 'human_food', text: '人は毎日食べる。' },
  { year: 0, law: 'plant_co2', text: '植物はCO2を吸い酸素を出す。' },
  { year: 0, law: 'heat_escape', text: '熱は宇宙へ逃げる。' },
  { year: 0, law: 'pathogen_air', text: '病は空気でうつる。' },
  { year: 0, law: 'zoonosis', text: '動物の病は人にうつる。' },
  { year: 0, law: 'human_oxygen', text: '人は酸素を吸う。' },
  { year: 0, law: 'learning', text: '人は学ぶ。' },
  { year: 0, law: 'human_water', text: '人は水を飲む。' },
  { year: 0, law: 'farm_land', text: '作物は畑で育つ。' },
  { year: 0, law: 'automation', text: '機械は人を手伝う。' },
];

/** 見立てる作戦の、ある型の手を、兆しを読まずにそのまま書く作戦 */
function fixedPlan(stage: StageId, cause: string): Strategy {
  return { name: `plan_${cause}`, role: 'plan', cause, edits: READERS[stage].byCause[cause]!.map((e) => ({ ...e })) };
}

const plansOf = (stage: StageId): Strategy[] => Object.keys(READERS[stage].byCause).map((c) => fixedPlan(stage, c));

export const STRATEGIES: Record<StageId, Strategy[]> = {
  prologue: [{ name: 'baseline', edits: [] }, ...plansOf('prologue')],
  food: [
    { name: 'baseline', edits: [] },
    // 企画書の例：食事を減らすだけ（最初は効くが、畑が縮んだところへ作物病原体が来て、再び食料危機。職も失われる）
    { name: 'few_days_only', role: 'one', edits: [{ year: 0, ...FEW_DAYS }] },
    // 光だけで育つ植物（水は解決するが、あとで雨の減少と植物の異常増殖）
    { name: 'light_only', role: 'one', clears: 1, edits: [{ year: 0, law: 'plant_grow', text: '植物は光だけで育つ。' }] },
    // 腐らない食べ物を書き足す（分配は良くなるが、腸内細菌が飢える）
    { name: 'no_rot', role: 'one', edits: [{ year: 0, law: 'food_rot', text: '' }] },
    ...plansOf('food'),
  ],
  plague: [
    { name: 'baseline', edits: [] },
    { name: 'contact', role: 'one', edits: [{ year: 0, ...CONTACT }] },
    { name: 'no_mutation', role: 'one', clears: 1, edits: [{ year: 0, law: 'pathogen_mutate', text: '' }] },
    { name: 'innate_immunity', role: 'one', clears: 1, edits: [{ year: 0, law: 'immune_memory', text: '免疫はすべての病原体を生まれつき知っている。' }] },
    ...plansOf('plague'),
  ],
  climate: [
    { name: 'baseline', edits: [] },
    // 温室効果を打ち消す：すぐ涼しくなるが、やがて氷期（罠）。消すだけなら、5年で世界が元の文で埋める
    { name: 'greenhouse_delete', role: 'one', clears: 2, edits: [{ year: 0, law: 'co2_heat', text: '二酸化炭素は熱を閉じ込めない。' }] },
    { name: 'sun_weaker', role: 'one', edits: [{ year: 0, law: 'sun_shine', text: '太陽は少し弱く地球を照らす。' }] },
    ...plansOf('climate'),
  ],
  war: [
    { name: 'baseline', edits: [] },
    // 戦争を消すだけ：戦争は起きないが、制裁とテロの冷たい戦争が続いて文明が腐っていく（罠）
    { name: 'no_war_only', role: 'one', edits: [{ year: 0, law: 'war', text: '争いは戦争にならない。' }] },
    { name: 'others', role: 'one', edits: [{ year: 0, ...OTHERS }] },
    { name: 'wish_peace', role: 'one', clears: 2, edits: [{ year: 0, text: '世界は平和になる。' }] },
    ...plansOf('war'),
  ],
  energy: [
    { name: 'baseline', edits: [] },
    // 石油に限りをなくす（値崩れで産油国が傾き、安い石油をかえって多く使う）
    { name: 'infinite_oil', role: 'one', edits: [{ year: 0, law: 'oil_finite', text: '石油には限りがない。' }] },
    { name: 'battery', role: 'one', edits: [{ year: 0, text: '永久電池は燃料なしで電気を生む。' }] },
    ...plansOf('energy'),
  ],
  tiny: [
    { name: 'baseline', edits: [] },
    // 何も消さず、短く言い換えるだけ（最初の圧迫を越えられない）
    {
      name: 'compress_only',
      edits: [
        { year: 0, law: 'sun_shine', text: '太陽は地球を照らす。' },
        { year: 0, law: 'energy_conserve', text: 'エネルギーは消えない。' },
        { year: 0, law: 'fission', text: '原子は割れると力を出す。' },
        { year: 5, law: 'plant_co2', text: '植物はCO2を吸い酸素を出す。' },
        { year: 5, law: 'water_rain', text: '雨は降る。' },
        { year: 10, law: 'human_food', text: '人は毎日食べる。' },
      ],
    },
    // 消すだけ（消した行は5年で世界が埋め、あふれた容量が戻る）
    {
      name: 'cut_only',
      edits: [
        { year: 0, law: 'energy_conserve', text: '' },
        { year: 0, law: 'fission', text: '' },
        { year: 0, law: 'oil_co2', text: '' },
        { year: 4, law: 'plant_co2', text: '' },
        { year: 8, law: 'war', text: '' },
      ],
    },
    ...plansOf('tiny'),
  ],
  loop: [
    { name: 'baseline', edits: [] },
    // 動物から人にうつらないようにする（凍土の病は来なくなるが、抜け出したあとの乏しい食料をめぐる争いは残る）
    { name: 'no_zoonosis', role: 'one', edits: [{ year: 0, ...NO_ZOONOSIS }] },
    // 戦争だけを打ち消す（病は来て人が大勢亡くなり、戦えない大国どうしは経済制裁で食料の流れを止め合う）
    { name: 'no_war_only', role: 'one', edits: [{ year: 0, law: 'war', text: '争いは戦争にならない。' }] },
    ...plansOf('loop'),
  ],
  // 無限の世界は決まった作戦ではなく、scripts/endless.ts のボットで測る
  endless: [],
};

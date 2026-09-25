import type { StageId } from '../src/data/schema';

/**
 * 決まった年に決まった文章を書く作戦（バランス調整用のボット）。
 * law があればその行を書き換え（空文字で削除）、なければ新しい一文を書き足す。
 * pass があれば、くり返す世界で、その回数だけ巻き戻ったあとの周でだけ書く（書かなければ、どの周でも同じ文を書く）
 */
export interface Strategy {
  name: string;
  edits: { year: number; law?: string; text: string; pass?: number }[];
}

export const STRATEGIES: Record<StageId, Strategy[]> = {
  food: [
    { name: 'baseline', edits: [] },
    // 企画書の例：食事を減らすだけ（最初は効くが、あとで別の食料危機）
    { name: 'few_days_only', edits: [{ year: 0, law: 'human_food', text: '人間は数日に一度食事を必要とする。' }] },
    // 食事を減らし、あとで来る作物の病気に備えて蔵を足す
    {
      name: 'few_days_storage',
      edits: [
        { year: 0, law: 'human_food', text: '人間は数日に一度食事を必要とする。' },
        { year: 0, law: 'food_rot', text: '食べ物は時間がたつと腐る。ただし蔵の中では腐らない。' },
        { year: 10, law: 'plant_grow', text: '植物は少しの水と光と二酸化炭素で育つ。' },
      ],
    },
    // 水から攻める：植物は少しの水で育つ＋どんな土地でも育つ＋雨を乾いた土地に
    {
      name: 'water_route',
      edits: [
        { year: 0, law: 'plant_grow', text: '植物は少しの水と光と二酸化炭素で育つ。' },
        { year: 0, law: 'farm_land', text: '作物はどんな土地でも育つ。' },
        { year: 5, law: 'water_rain', text: '水は空へのぼり、乾いた土地に雨となって降る。' },
      ],
    },
    // 国家を消して分配を良くし、戦争も起きにくくする
    {
      name: 'no_nation',
      edits: [
        { year: 0, law: 'nation', text: '' },
        { year: 0, law: 'plant_grow', text: '植物は少しの水と光と二酸化炭素で育つ。' },
        { year: 0, law: 'food_rot', text: '食べ物は時間がたつと腐る。ただし蔵の中では腐らない。' },
      ],
    },
    // 光だけで育つ植物（水は解決、あとで雨の減少と植物の異常増殖）
    { name: 'light_only', edits: [{ year: 0, law: 'plant_grow', text: '植物は光だけで育つ。' }] },
    // 肉を食べない（家畜の農地が空く）
    { name: 'vegetarian', edits: [{ year: 0, text: '人間は肉を食べない。' }] },
    // 腐らない食べ物（分配は良くなるが、腸内細菌が飢える）
    { name: 'no_rot', edits: [{ year: 0, law: 'food_rot', text: '' }] },
  ],
  plague: [
    { name: 'baseline', edits: [] },
    { name: 'contact', edits: [{ year: 0, law: 'pathogen_air', text: '病原体は触れたときだけ広がる。' }] },
    {
      name: 'contact_villages',
      edits: [
        { year: 0, law: 'pathogen_air', text: '病原体は触れたときだけ広がる。' },
        { year: 2, law: 'density', text: '人間は小さな村に分かれて暮らす。' },
      ],
    },
    {
      name: 'mild_medicine',
      edits: [
        { year: 0, law: 'pathogen_harm', text: '病原体は宿主を少しだけ弱らせる。' },
        { year: 0, law: 'crime', text: '' },
        { year: 2, law: 'medicine', text: '薬はあらゆる病を治す。' },
      ],
    },
    { name: 'no_mutation', edits: [{ year: 2, law: 'pathogen_mutate', text: '' }] },
    {
      name: 'not_human',
      edits: [
        { year: 0, law: 'war', text: '' },
        { year: 0, law: 'pathogen_infect', text: '病原体は生き物に感染する。ただし人間には感染しない。' },
      ],
    },
    { name: 'innate_immunity', edits: [{ year: 1, law: 'immune_memory', text: '免疫はすべての病原体を生まれつき知っている。' }] },
  ],
  climate: [
    { name: 'baseline', edits: [] },
    // 温室効果を消す：すぐ涼しくなるが、やがて氷期（罠）
    { name: 'greenhouse_delete', edits: [{ year: 0, law: 'co2_heat', text: '' }] },
    // 温室効果を弱め、縮む世界容量に合わせて戦争・動物由来の病・犯罪を順に捨てる
    {
      name: 'weak_and_cut',
      edits: [
        { year: 0, law: 'co2_heat', text: '二酸化炭素は熱を少し弱く閉じ込める。' },
        { year: 10, law: 'war', text: '' },
        { year: 20, law: 'zoonosis', text: '' },
        { year: 30, law: 'crime', text: '' },
      ],
    },
    // 吸収源を増やす（植物・海）
    {
      name: 'sinks_and_cut',
      edits: [
        { year: 0, law: 'plant_co2', text: '植物は二酸化炭素を大量に吸って酸素を出す。' },
        { year: 0, law: 'war', text: '' },
        { year: 5, law: 'ocean_co2', text: '海は二酸化炭素を大量に吸い込む。' },
        { year: 15, law: 'zoonosis', text: '' },
        { year: 25, law: 'crime', text: '' },
      ],
    },
    // 石油から二酸化炭素を出さない（すすと石油切れが後で来る）
    {
      name: 'oil_water_and_cut',
      edits: [
        { year: 0, law: 'oil_co2', text: '石油は燃えると水を出す。' },
        { year: 10, law: 'war', text: '' },
        { year: 20, law: 'zoonosis', text: '' },
        { year: 30, law: 'crime', text: '' },
      ],
    },
    // 太陽を少し弱める
    {
      name: 'sun_and_cut',
      edits: [
        { year: 0, law: 'sun_shine', text: '太陽は少し弱く地球を照らす。' },
        { year: 10, law: 'war', text: '' },
        { year: 20, law: 'zoonosis', text: '' },
        { year: 30, law: 'crime', text: '' },
      ],
    },
    // お金と戦争を捨てて永久電池を書き足す
    {
      name: 'battery',
      edits: [
        { year: 0, law: 'money', text: '' },
        { year: 0, law: 'war', text: '' },
        { year: 0, law: 'crime', text: '' },
        { year: 5, text: '永久電池は燃料なしで電気を生む。' },
        { year: 10, law: 'zoonosis', text: '' },
        { year: 15, law: 'oil_finite', text: '' },
        { year: 20, law: 'sea_salt', text: '' },
      ],
    },
  ],
  war: [
    { name: 'baseline', edits: [] },
    // 戦争を消すだけ：戦争は起きないが、制裁とテロの冷たい戦争が続いて文明が腐っていく（罠）
    { name: 'no_war_only', edits: [{ year: 0, law: 'war', text: '争いは戦争にならない。' }] },
    // 戦争を消し、人々の求める幸せを他人に向ける（緊張そのものを下げる）
    {
      name: 'no_war_others',
      edits: [
        { year: 0, law: 'war', text: '争いは戦争にならない。' },
        { year: 0, law: 'happiness_seek', text: '人は他人の幸せを求める。' },
      ],
    },
    // 人は他人の幸せを求める（緊張の根を断つ）
    { name: 'others', edits: [{ year: 0, law: 'happiness_seek', text: '人は他人の幸せを求める。' }] },
    // 兵器も核も消す（戦争は起きうるが、殺し合いにならない）
    {
      name: 'disarm',
      edits: [
        { year: 0, law: 'weapons', text: '兵器は存在しない。' },
        { year: 0, law: 'fission', text: '' },
      ],
    },
    // 兵器が人を傷つけない（血の流れない戦争が何度も起きる）
    { name: 'harmless', edits: [{ year: 0, law: 'weapons', text: '兵器は人を傷つけない。' }] },
    // 争いを競技にする
    { name: 'sports', edits: [{ year: 0, law: 'war', text: '争いは競技になりうる。' }] },
  ],
  energy: [
    { name: 'baseline', edits: [] },
    // 石油に限りをなくす（値崩れで産油国が傾き、安い石油をかえって多く使う）
    { name: 'infinite_oil', edits: [{ year: 0, law: 'oil_finite', text: '石油には限りがない。' }] },
    // 核融合を書き足す（発電所が育つまでの十年ほどをしのぐ）
    { name: 'fusion', edits: [{ year: 0, text: '核融合発電が実用化されている。' }] },
    // 永久電池を書き足す
    { name: 'battery', edits: [{ year: 0, text: '永久電池は燃料なしで電気を生む。' }] },
    // エネルギー保存則を破る（無から生まれるエネルギーの廃熱で暑くなる）
    { name: 'free_energy', edits: [{ year: 0, law: 'energy_conserve', text: 'エネルギーは形を変えると、総量が増える。' }] },
  ],
  tiny: [
    { name: 'baseline', edits: [] },
    // 害の少ない行を消し、残りは短く言い換えて軽くする
    {
      name: 'compress_cut',
      edits: [
        { year: 0, law: 'zoonosis', text: '' },
        { year: 0, law: 'pathogen_air', text: '' },
        { year: 0, law: 'sun_shine', text: '太陽は地球を照らす。' },
        { year: 0, law: 'war', text: '' },
        { year: 3, law: 'energy_conserve', text: 'エネルギーの総量は変わらない。' },
        { year: 6, law: 'oil_finite', text: '石油は有限。' },
        { year: 9, law: 'fission', text: '原子は分裂で力を出す。' },
        { year: 12, law: 'human_food', text: '人は毎日食べる。' },
        { year: 15, law: 'crime', text: '' },
        { year: 18, law: 'animal_pollen', text: '虫が花粉を運ぶ。' },
        { year: 21, law: 'life_heat', text: '生物は暑さで弱る。' },
        { year: 24, law: 'plant_co2', text: '植物はCO2を吸い酸素を出す。' },
        { year: 27, law: 'water_rain', text: '雨は降る。' },
        { year: 30, law: 'pathogen_infect', text: '菌は感染する。' },
        { year: 33, law: 'immune_memory', text: '免疫は敵を覚える。' },
        { year: 36, law: 'automation', text: '機械は人を手伝う。' },
        { year: 39, law: 'human_water', text: '人は水を飲む。' },
        { year: 42, law: 'heat_escape', text: '熱は宇宙へ逃げる。' },
        { year: 45, law: 'learning', text: '人は学ぶ。' },
        { year: 48, law: 'farm_land', text: '作物は畑で育つ。' },
      ],
    },
    // 核と兵器を捨てて軽くし、あとは短く言い換える
    {
      name: 'cut_nukes',
      edits: [
        { year: 0, law: 'fission', text: '' },
        { year: 0, law: 'weapons', text: '' },
        { year: 0, law: 'zoonosis', text: '' },
        { year: 0, law: 'sun_shine', text: '太陽は地球を照らす。' },
        { year: 3, law: 'energy_conserve', text: 'エネルギーの総量は変わらない。' },
        { year: 6, law: 'oil_finite', text: '石油は有限。' },
        { year: 9, law: 'plant_co2', text: '植物はCO2を吸い酸素を出す。' },
        { year: 12, law: 'human_food', text: '人は毎日食べる。' },
        { year: 15, law: 'animal_pollen', text: '虫が花粉を運ぶ。' },
        { year: 18, law: 'life_heat', text: '生物は暑さで弱る。' },
        { year: 21, law: 'water_rain', text: '雨は降る。' },
        { year: 24, law: 'pathogen_infect', text: '菌は感染する。' },
        { year: 27, law: 'immune_memory', text: '免疫は敵を覚える。' },
        { year: 30, law: 'automation', text: '機械は人を手伝う。' },
        { year: 33, law: 'human_water', text: '人は水を飲む。' },
        { year: 36, law: 'heat_escape', text: '熱は宇宙へ逃げる。' },
        { year: 39, law: 'learning', text: '人は学ぶ。' },
        { year: 42, law: 'farm_land', text: '作物は畑で育つ。' },
        { year: 45, law: 'crime', text: '人は規則を破る。' },
        { year: 48, law: 'wind', text: '風は吹く。' },
      ],
    },
    // 何も消さず、短く言い換えるだけ（最初の圧迫を越えられない）
    {
      name: 'compress_only',
      edits: [
        { year: 0, law: 'sun_shine', text: '太陽は地球を照らす。' },
        { year: 0, law: 'energy_conserve', text: 'エネルギーの総量は変わらない。' },
        { year: 0, law: 'oil_finite', text: '石油は有限。' },
        { year: 0, law: 'fission', text: '原子は分裂で力を出す。' },
        { year: 3, law: 'human_food', text: '人は毎日食べる。' },
        { year: 6, law: 'animal_pollen', text: '虫が花粉を運ぶ。' },
        { year: 9, law: 'life_heat', text: '生物は暑さで弱る。' },
        { year: 12, law: 'plant_co2', text: '植物はCO2を吸い酸素を出す。' },
        { year: 15, law: 'water_rain', text: '雨は降る。' },
        { year: 18, law: 'pathogen_infect', text: '菌は感染する。' },
        { year: 21, law: 'immune_memory', text: '免疫は敵を覚える。' },
        { year: 24, law: 'automation', text: '機械は人を手伝う。' },
        { year: 27, law: 'human_water', text: '人は水を飲む。' },
        { year: 30, law: 'heat_escape', text: '熱は宇宙へ逃げる。' },
        { year: 33, law: 'learning', text: '人は学ぶ。' },
        { year: 36, law: 'farm_land', text: '作物は畑で育つ。' },
      ],
    },
    // 消すだけ（世界整合性が保てない）
    {
      name: 'cut_only',
      edits: [
        { year: 0, law: 'zoonosis', text: '' },
        { year: 0, law: 'pathogen_air', text: '' },
        { year: 0, law: 'war', text: '' },
        { year: 0, law: 'crime', text: '' },
        { year: 4, law: 'fission', text: '' },
        { year: 8, law: 'seasons', text: '' },
        { year: 12, law: 'food_rot', text: '' },
        { year: 16, law: 'money', text: '' },
        { year: 20, law: 'nation', text: '' },
        { year: 24, law: 'eco_recover', text: '' },
        { year: 28, law: 'animal_pollen', text: '' },
        { year: 32, law: 'life_heat', text: '' },
        { year: 36, law: 'ocean_co2', text: '' },
        { year: 40, law: 'oil_finite', text: '' },
        { year: 44, law: 'weapons', text: '' },
        { year: 48, law: 'density', text: '' },
      ],
    },
  ],
  // くり返す十年：凍土の病 → 収穫の減少 → 食料をめぐる戦争、の連鎖をどこで断つか
  loop: [
    { name: 'baseline', edits: [] },
    // 病が人にうつらない（根を断つ）
    { name: 'not_human', edits: [{ year: 0, law: 'pathogen_infect', text: '病原体は生き物に感染する。ただし人間には感染しない。' }] },
    // 動物から人にうつらない（凍土の獣の病が人に来ない）
    { name: 'no_zoonosis', edits: [{ year: 0, law: 'zoonosis', text: '' }] },
    // 戦争だけを消す（病は来る）
    { name: 'no_war_only', edits: [{ year: 0, law: 'war', text: '' }] },
    // 1周目は何もせず見届け、巻き戻ったら根を断つ
    { name: 'learn', edits: [{ year: 0, pass: 1, law: 'zoonosis', text: '' }] },
    // 1周目は的外れ（食事を減らす）、2周目に根を断つ
    { name: 'wrong_then_right', edits: [{ year: 0, pass: 0, law: 'human_food', text: '人間は数日に一度食事を必要とする。' }, { year: 0, pass: 1, law: 'pathogen_infect', text: '病原体は生き物に感染する。ただし人間には感染しない。' }] },
  ],
  // 無限の世界は決まった作戦ではなく、scripts/endless.ts のボットで測る
  endless: [],
};

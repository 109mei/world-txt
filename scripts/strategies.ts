import type { StageId } from '../src/data/schema';

/**
 * 決まった年に決まった文章を書く作戦（バランス調整用のボット）。
 * law があればその行を書き換え（空文字で削除）、なければ新しい一文を書き足す。
 * pass があれば、くり返す世界で、その回数だけ巻き戻ったあとの周でだけ書く（書かなければ、どの周でも同じ文を書く）
 *
 * 一手だけの作戦（意味を変える書き換えが1つ）は、どれも勝ちきれない（docs/SPEC.md 5章）。
 * 「考えた作戦」は、最初の危機への手と、その書き換えの副作用・あとから来る危機への手を組み合わせる（2〜4手）。
 * どの作戦も、そのステージをはじめて遊べる筆の位で書ける行・書き足せる数・重さの中で書く。
 */
export interface Strategy {
  name: string;
  /** one：意味を変える書き換えが1つだけの作戦（言い換えで容量を空けるのは数えない）。plan：考えた作戦 */
  role?: 'one' | 'plan';
  /** この作戦が書けるようになる、救った世界の数（筆の位。書かなければ、そのステージをはじめて遊べる数） */
  clears?: number;
  edits: { year: number; law?: string; text: string; pass?: number }[];
}

const FEW_DAYS = { law: 'human_food', text: '人間は数日に一度食事を必要とする。' };
const STORAGE = { law: 'food_rot', text: '食べ物は時間がたつと腐る。ただし蔵の中では腐らない。' };
const LESS_WATER = { law: 'plant_grow', text: '植物は少しの水と光と二酸化炭素で育つ。' };
const CONTACT = { law: 'pathogen_air', text: '病原体は触れたときだけ広がる。' };
const LIFELONG = { law: 'immune_memory', text: '免疫は戦った病原体を一生覚える。' };
const OTHERS = { law: 'happiness_seek', text: '人は他人の幸せを求める。' };
const SHARE = { text: '人は食べ物を分かち合う。' };
/** 意味を変えずに短く言い換えて、世界容量を空ける（資源枯渇） */
const ENERGY_SHORT = { law: 'energy_conserve', text: 'エネルギーの総量は変わらない。' };
const FISSION_SHORT = { law: 'fission', text: '原子は分裂で力を出す。' };

export const STRATEGIES: Record<StageId, Strategy[]> = {
  food: [
    { name: 'baseline', edits: [] },
    // 企画書の例：食事を減らすだけ（最初は効くが、畑が縮んだところへ作物病原体が来て、再び食料危機）
    { name: 'few_days_only', role: 'one', edits: [{ year: 0, ...FEW_DAYS }] },
    // 食事を減らし、あとで来る作物の病気に備えて蔵を足す
    { name: 'few_days_storage', edits: [{ year: 0, ...FEW_DAYS }, { year: 0, ...STORAGE }, { year: 10, ...LESS_WATER }] },
    // 水から攻める：植物は少しの水で育つ＋どんな土地でも育つ＋雨を乾いた土地に
    {
      name: 'water_route',
      edits: [
        { year: 0, ...LESS_WATER },
        { year: 0, law: 'farm_land', text: '作物はどんな土地でも育つ。' },
        { year: 5, law: 'water_rain', text: '水は空へのぼり、乾いた土地に雨となって降る。' },
      ],
    },
    // 国家を消して分配を良くし、戦争も起きにくくする
    { name: 'no_nation', edits: [{ year: 0, law: 'nation', text: '' }, { year: 0, ...LESS_WATER }, { year: 0, ...STORAGE }] },
    // 光だけで育つ植物（水は解決、あとで雨の減少と植物の異常増殖）
    { name: 'light_only', role: 'one', edits: [{ year: 0, law: 'plant_grow', text: '植物は光だけで育つ。' }] },
    // 肉を食べない（家畜の農地が空く）
    { name: 'vegetarian', role: 'one', edits: [{ year: 0, text: '人間は肉を食べない。' }] },
    // 腐らない食べ物（分配は良くなるが、腸内細菌が飢える）
    { name: 'no_rot', role: 'one', edits: [{ year: 0, law: 'food_rot', text: '' }] },
    // 考えた作戦：食事を減らし、蔵に余りをためる。水の不足は植物の水を減らして補う。
    // 作物病原体が広がる頃（7年目）に作物が一年中実るようにして、病気で落ちた収穫の穴を埋める
    {
      name: 'few_store_water_harvest',
      role: 'plan',
      edits: [{ year: 0, ...FEW_DAYS }, { year: 0, ...STORAGE }, { year: 0, ...LESS_WATER }, { year: 7, text: '作物は一年中実る。' }],
    },
    // 考えた作戦：人の体を小さくして食べる量と飲む水を減らし、蔵と少しの水で育つ植物で、あとの不作に備える
    { name: 'tiny_store_water', role: 'plan', edits: [{ year: 0, text: '人間の体は今の半分の大きさになる。' }, { year: 0, ...STORAGE }, { year: 0, ...LESS_WATER }] },
    // 考えた作戦：食事を減らし、蔵をつくる。害虫を消して、作物の病気が広がりにくい畑にする
    { name: 'few_store_mosquito', role: 'plan', edits: [{ year: 0, ...FEW_DAYS }, { year: 0, ...STORAGE }, { year: 5, text: '蚊と害虫は存在しない。' }] },
  ],
  plague: [
    { name: 'baseline', edits: [] },
    { name: 'contact', role: 'one', edits: [{ year: 0, ...CONTACT }] },
    { name: 'contact_villages', edits: [{ year: 0, ...CONTACT }, { year: 2, law: 'density', text: '人間は小さな村に分かれて暮らす。' }] },
    {
      name: 'mild_medicine',
      edits: [
        { year: 0, law: 'pathogen_harm', text: '病原体は宿主を少しだけ弱らせる。' },
        { year: 0, law: 'crime', text: '' },
        { year: 2, law: 'medicine', text: '薬はあらゆる病を治す。' },
      ],
    },
    { name: 'no_mutation', role: 'one', edits: [{ year: 2, law: 'pathogen_mutate', text: '' }] },
    // 戦争を消し、病が人にうつらないようにする（増える人口の食べ物に手を打たないので、家畜の疫病と食料不足で崩れる）
    {
      name: 'not_human',
      edits: [
        { year: 0, law: 'war', text: '' },
        { year: 0, law: 'pathogen_infect', text: '病原体は生き物に感染する。ただし人間には感染しない。' },
      ],
    },
    { name: 'innate_immunity', role: 'one', edits: [{ year: 1, law: 'immune_memory', text: '免疫はすべての病原体を生まれつき知っている。' }] },
    // 考えた作戦：触れたときだけ広がる病にして、免疫を一生覚えさせる（変異株の波を小さくする）。
    // 人が死ななくなると人口が増えて食べ物が足りなくなるので、5年目に食べ物を分かち合う
    { name: 'contact_lifelong_share', role: 'plan', edits: [{ year: 0, ...CONTACT }, { year: 0, ...LIFELONG }, { year: 5, ...SHARE }] },
    // 考えた作戦：同じく病を抑え、増えた人口の食べ物は、食事を減らして賄う
    { name: 'contact_lifelong_few', role: 'plan', edits: [{ year: 0, ...CONTACT }, { year: 0, ...LIFELONG }, { year: 5, ...FEW_DAYS }] },
    // 考えた作戦：病を人から断ち、5年目に食事を減らして、病で人が減らなくなった世界の食べ物を賄う
    {
      name: 'nothuman_few',
      role: 'plan',
      edits: [{ year: 0, law: 'pathogen_infect', text: '病原体は生き物に感染する。ただし人間には感染しない。' }, { year: 5, ...FEW_DAYS }],
    },
  ],
  climate: [
    { name: 'baseline', edits: [] },
    // 温室効果を消す：すぐ涼しくなるが、やがて氷期（罠）
    { name: 'greenhouse_delete', role: 'one', edits: [{ year: 0, law: 'co2_heat', text: '' }] },
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
    // 考えた作戦：太陽を少し弱めて冷やす。冷やすだけでは石油をやめる理由が消え、石油が細っていくので、
    // 15年目に風を強くして再生可能エネルギーを伸ばす。縮む世界容量には、戦争・動物由来の病・犯罪を捨てて払う
    {
      name: 'sun_wind_cut',
      role: 'plan',
      edits: [
        { year: 0, law: 'sun_shine', text: '太陽は少し弱く地球を照らす。' },
        { year: 10, law: 'war', text: '' },
        { year: 15, law: 'wind', text: '風は強く吹いている。' },
        { year: 20, law: 'zoonosis', text: '' },
        { year: 30, law: 'crime', text: '' },
      ],
    },
  ],
  war: [
    { name: 'baseline', edits: [] },
    // 戦争を消すだけ：戦争は起きないが、制裁とテロの冷たい戦争が続いて文明が腐っていく（罠）
    { name: 'no_war_only', role: 'one', edits: [{ year: 0, law: 'war', text: '争いは戦争にならない。' }] },
    // 考えた作戦：戦争を消し、人々の求める幸せを他人に向ける（制裁の引き金になる緊張そのものを下げる）
    { name: 'no_war_others', role: 'plan', edits: [{ year: 0, law: 'war', text: '争いは戦争にならない。' }, { year: 0, ...OTHERS }] },
    // 人は他人の幸せを求める（緊張の根を断つ。陣営の対立が強く、これだけでは足りない）
    { name: 'others', role: 'one', edits: [{ year: 0, ...OTHERS }] },
    // 考えた作戦：兵器も核も消す（戦争は起きうるが、殺し合いにも核の冬にもならない）
    { name: 'disarm', role: 'plan', edits: [{ year: 0, law: 'weapons', text: '兵器は存在しない。' }, { year: 0, law: 'fission', text: '' }] },
    // 兵器が人を傷つけない（血の流れない戦争が何度も起き、街と工場が壊され続ける）
    { name: 'harmless', role: 'one', edits: [{ year: 0, law: 'weapons', text: '兵器は人を傷つけない。' }] },
    // 争いを競技にする（戦争の代わりに制裁が来て、争いの原因も残る）
    { name: 'sports', role: 'one', edits: [{ year: 0, law: 'war', text: '争いは競技になりうる。' }] },
    // 兵器を消すだけ（戦争は素手でも起き、武器を持たない警察と軍では治安を保てない）
    { name: 'weapons_only', role: 'one', edits: [{ year: 0, law: 'weapons', text: '兵器は存在しない。' }] },
    // 平和を願う一文（戦争は起きにくくなるが、争いの原因は残り、緊張が高いとテロと内乱の形で表れる）
    { name: 'wish_peace', role: 'one', edits: [{ year: 0, text: '世界は平和になる。' }] },
    // 考えた作戦：領土を共同で持って陣営の対立をゆるめ、他人の幸せを求め、争いを話し合いに変える
    {
      name: 'shared_others_dialogue',
      role: 'plan',
      edits: [
        { year: 0, law: 'nation', text: '国家は領土を共同で持つ。' },
        { year: 0, ...OTHERS },
        { year: 0, law: 'war', text: '争いは話し合いになりうる。' },
      ],
    },
  ],
  energy: [
    { name: 'baseline', edits: [] },
    // 石油に限りをなくす（値崩れで産油国が傾き、安い石油をかえって多く使う）
    { name: 'infinite_oil', role: 'one', edits: [{ year: 0, law: 'oil_finite', text: '' }] },
    // 核融合を書き足す（世界容量が足りないので、先に2行を短く言い換えて空ける。発電所が育つまでの十年ほどをしのげない）
    { name: 'fusion', role: 'one', edits: [{ year: 0, ...ENERGY_SHORT }, { year: 0, ...FISSION_SHORT }, { year: 0, text: '核融合発電が実用化されている。' }] },
    // 永久電池を書き足す（同じく2行を言い換えて空ける。電気は足りるが、石油由来の肥料と薬の不足と、産油国の崩壊が来る）
    { name: 'battery', role: 'one', edits: [{ year: 0, ...ENERGY_SHORT }, { year: 0, ...FISSION_SHORT }, { year: 0, text: '永久電池は燃料なしで電気を生む。' }] },
    // エネルギー保存則を破る（無から生まれるエネルギーの廃熱で暑くなる）。物の理の根本の書き換えなので、改稿者の筆（救った世界3つ）から書ける
    { name: 'free_energy', role: 'one', clears: 3, edits: [{ year: 0, law: 'energy_conserve', text: 'エネルギーは形を変えると、総量が増える。' }] },
    // 考えた作戦：2行を言い換えて場所を空け、永久電池を書き足す。石油が尽きて肥料が作れなくなる頃に備えて、
    // 5年目に食事を減らしておく
    {
      name: 'battery_few',
      role: 'plan',
      edits: [{ year: 0, ...ENERGY_SHORT }, { year: 0, ...FISSION_SHORT }, { year: 0, text: '永久電池は燃料なしで電気を生む。' }, { year: 5, ...FEW_DAYS }],
    },
    // 考えた作戦：石油の限りをなくし、産油国の崩壊で高まる緊張は、世界政府で抑える
    { name: 'oil_gov', role: 'plan', edits: [{ year: 0, law: 'oil_finite', text: '' }, { year: 0, text: '世界政府ができる。' }] },
  ],
  tiny: [
    { name: 'baseline', edits: [] },
    // 害の少ない行を消し、残りは短く言い換えて軽くする（何も直さないので、水と緊張に押されて崩れる）
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
    // 核と兵器を捨てて軽くし、あとは短く言い換える（同じく、何も直さない）
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
    // 考えた作戦：はじめに害の少ない2行を消し、食事と雨の行を「短く、しかも直す」言い換えにする（人は隔日に食べる・雨は多く降る）。
    // あとは3年ごとに、意味を変えずに短く言い換えていく
    {
      name: 'trim_fix_early',
      role: 'plan',
      edits: [
        { year: 0, law: 'zoonosis', text: '' },
        { year: 0, law: 'war', text: '' },
        { year: 0, law: 'human_food', text: '人は隔日に食べる。' },
        { year: 0, law: 'water_rain', text: '雨は多く降る。' },
        { year: 3, law: 'pathogen_air', text: '' },
        { year: 6, law: 'fission', text: '原子は分裂で力を出す。' },
        { year: 9, law: 'sun_shine', text: '太陽は地球を照らす。' },
        { year: 12, law: 'crime', text: '' },
        { year: 15, law: 'immune_memory', text: '免疫は敵を覚える。' },
        { year: 18, law: 'energy_conserve', text: 'エネルギーの総量は変わらない。' },
        { year: 21, law: 'pathogen_infect', text: '菌は感染する。' },
        { year: 24, law: 'learning', text: '人は学ぶ。' },
        { year: 27, law: 'heat_escape', text: '熱は宇宙へ逃げる。' },
        { year: 30, law: 'food_rot', text: '食べ物は腐る。' },
        { year: 33, law: 'eco_recover', text: '自然は回復する。' },
        { year: 36, law: 'human_oxygen', text: '人は酸素を吸う。' },
        { year: 39, law: 'oil_finite', text: '石油は有限。' },
        { year: 42, law: 'human_water', text: '人は水を飲む。' },
        { year: 45, law: 'farm_land', text: '作物は畑で育つ。' },
        { year: 48, law: 'automation', text: '機械は人を手伝う。' },
      ],
    },
    // 考えた作戦：はじめは害の少ない4行を消して容量に収め、3年目・6年目に雨を増やし、植物を少しの水で育つようにする
    {
      name: 'cut_then_rain',
      role: 'plan',
      edits: [
        { year: 0, law: 'zoonosis', text: '' },
        { year: 0, law: 'pathogen_air', text: '' },
        { year: 0, law: 'crime', text: '' },
        { year: 0, law: 'war', text: '' },
        { year: 3, law: 'water_rain', text: '雨は多く降る。' },
        { year: 6, law: 'plant_grow', text: '植物は少しの水で育つ。' },
        { year: 9, law: 'fission', text: '原子は分裂で力を出す。' },
        { year: 12, law: 'sun_shine', text: '太陽は地球を照らす。' },
        { year: 15, law: 'immune_memory', text: '免疫は敵を覚える。' },
        { year: 18, law: 'energy_conserve', text: 'エネルギーの総量は変わらない。' },
        { year: 21, law: 'pathogen_infect', text: '菌は感染する。' },
        { year: 24, law: 'learning', text: '人は学ぶ。' },
        { year: 27, law: 'heat_escape', text: '熱は宇宙へ逃げる。' },
        { year: 30, law: 'food_rot', text: '食べ物は腐る。' },
        { year: 33, law: 'eco_recover', text: '自然は回復する。' },
        { year: 36, law: 'human_oxygen', text: '人は酸素を吸う。' },
        { year: 39, law: 'oil_finite', text: '石油は有限。' },
        { year: 42, law: 'human_water', text: '人は水を飲む。' },
        { year: 45, law: 'farm_land', text: '作物は畑で育つ。' },
        { year: 48, law: 'automation', text: '機械は人を手伝う。' },
      ],
    },
  ],
  // くり返す十年：凍土の病 → 収穫の減少 → 食料をめぐる戦争、の連鎖をどこで断つか。抜け出したあとの20年も、水と食料の乏しい、緊張した世界が続く
  loop: [
    { name: 'baseline', edits: [] },
    // 病が人にうつらない（根を断つ）
    { name: 'not_human', role: 'one', edits: [{ year: 0, law: 'pathogen_infect', text: '病原体は生き物に感染する。ただし人間には感染しない。' }] },
    // 動物から人にうつらない（凍土の獣の病が人に来ない）
    { name: 'no_zoonosis', role: 'one', edits: [{ year: 0, law: 'zoonosis', text: '' }] },
    // 戦争だけを消す（病は来て人が大勢亡くなり、戦えない大国どうしは経済制裁で食料の流れを止め合う）
    { name: 'no_war_only', role: 'one', edits: [{ year: 0, law: 'war', text: '' }] },
    // 争いを競技にする（戦争は起きないが、飢えの連鎖で高まる緊張は、テロと内乱になって文明を削る）
    { name: 'sports', role: 'one', edits: [{ year: 0, law: 'war', text: '争いは競技になりうる。' }] },
    // 1周目は何もせず見届け、巻き戻ったら根を断つ
    { name: 'learn', role: 'one', edits: [{ year: 0, pass: 1, law: 'zoonosis', text: '' }] },
    // 1周目は的外れ（食事を減らす）、2周目に根を断つ（食事を減らしたことが、抜け出したあとの食料不足に効く）
    { name: 'wrong_then_right', edits: [{ year: 0, pass: 0, ...FEW_DAYS }, { year: 0, pass: 1, law: 'pathogen_infect', text: '病原体は生き物に感染する。ただし人間には感染しない。' }] },
    // 考えた作戦：動物から人にうつらないようにして抜け出し、12年目に食べ物を分かち合って、乏しい食料をめぐる争いを防ぐ
    { name: 'root_then_share', role: 'plan', edits: [{ year: 0, law: 'zoonosis', text: '' }, { year: 12, ...SHARE }] },
    // 考えた作戦：1周目は見届け、2周目に根を断つ。抜け出したあとの12年目に、人々の求める幸せを他人に向ける
    { name: 'learn_then_others', role: 'plan', edits: [{ year: 0, pass: 1, law: 'zoonosis', text: '' }, { year: 12, ...OTHERS }] },
    // 考えた作戦：1周目は見届け、2周目に根を断つ。抜け出したあとの12年目に、食べ物を分かち合う
    { name: 'learn_then_share', role: 'plan', edits: [{ year: 0, pass: 1, law: 'zoonosis', text: '' }, { year: 12, ...SHARE }] },
  ],
  // 無限の世界は決まった作戦ではなく、scripts/endless.ts のボットで測る
  endless: [],
};

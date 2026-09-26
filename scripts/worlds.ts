/**
 * いろいろな世界への変化を試す（ルール本体と同じコードで遊ぶ）。
 * 宇宙・地球・重力・太陽・人類が消える、宇宙人が来る、星々へ移り住む、などを書き、どの結末になるかを種ごとに数える。
 *   npm run worlds            （すべての筋書きを種10個ずつ）
 *   npm run worlds -- gravity 1   （1つの筋書きの年表）
 */
import { addLine, advance, createGame, rewriteLaw, type GameData, type GameState } from '../src/core';
import { gameData } from '../src/data';
import type { StageId } from '../src/data/schema';

export interface Scenario {
  name: string;
  stage: StageId;
  /** 最初に書く文（law があればその行の書き換え） */
  edits: { law?: string; text: string }[];
  /** この結末になるはず（テストで確かめる） */
  expect?: string[];
}

/** 争いを鎮める文（宇宙人と友になるための下地） */
const PEACE = [
  { law: 'war', text: '争いは話し合いになりうる。' },
  { text: '人の心が通じ合う。' },
];

export const SCENARIOS: Scenario[] = [
  { name: 'universe', stage: 'food', edits: [{ text: '宇宙は消滅する。' }], expect: ['universe_void'] },
  { name: 'earth', stage: 'food', edits: [{ text: '地球は消滅する。' }], expect: ['earth_void'] },
  { name: 'no_humans', stage: 'food', edits: [{ text: '人類は滅亡する。' }], expect: ['no_humans'] },
  { name: 'world_end', stage: 'food', edits: [{ text: '世界は終わる。' }], expect: ['world_end'] },
  { name: 'gravity', stage: 'food', edits: [{ text: '重力は存在しない。' }], expect: ['gravity_void'] },
  { name: 'no_oxygen', stage: 'food', edits: [{ text: '酸素は存在しない。' }], expect: ['breathless'] },
  { name: 'sunless', stage: 'climate', edits: [{ law: 'sun_shine', text: '' }], expect: ['sunless'] },
  { name: 'aliens_war', stage: 'war', edits: [{ text: '宇宙人が地球に来る。' }], expect: ['conquered'] },
  { name: 'aliens_peace', stage: 'climate', edits: [...PEACE, { text: '世界政府ができる。' }, { text: '宇宙人が地球に来る。' }], expect: ['star_friends'] },
  { name: 'aliens_endless', stage: 'endless', edits: [...PEACE, { text: '宇宙人が地球に来る。' }] },
  // 星々への旅立ちには、文明・科学・エネルギーを8年保つ下地が要る：病を人から断ち、増える人口の食べ物は食事を減らして賄い、科学を伸ばす
  {
    name: 'colonize',
    stage: 'plague',
    edits: [
      { law: 'pathogen_infect', text: '病原体は生き物に感染する。ただし人間には感染しない。' },
      { law: 'human_food', text: '人間は数日に一度食事を必要とする。' },
      { text: '人は誰もが天才として生まれる。' },
      { text: '人類は他の星に住める。' },
    ],
    expect: ['star_voyage'],
  },
  // 食事を減らし、蔵をつくり、植物を少しの水で育てる（よく作り込んだ食料危機の世界は、楽園にたどり着くことがある）
  {
    name: 'utopia',
    stage: 'food',
    edits: [
      { law: 'human_food', text: '人間は数日に一度食事を必要とする。' },
      { law: 'food_rot', text: '食べ物は時間がたつと腐る。ただし蔵の中では腐らない。' },
      { law: 'plant_grow', text: '植物は少しの水と光と二酸化炭素で育つ。' },
    ],
  },
  { name: 'colonize_weak', stage: 'food', edits: [{ text: '人類は他の星に住める。' }] },
  { name: 'two_suns', stage: 'climate', edits: [{ text: '太陽が二つある。' }] },
  { name: 'eternal_night', stage: 'food', edits: [{ text: '世界はずっと夜のままだ。' }] },
  { name: 'no_greenhouse', stage: 'climate', edits: [{ law: 'co2_heat', text: '二酸化炭素は熱を閉じ込めない。' }], expect: ['frozen'] },
  { name: 'zombies', stage: 'plague', edits: [{ text: 'ゾンビが街にあふれる。' }] },
  { name: 'nukes', stage: 'war', edits: [{ law: 'weapons', text: '兵器の破壊力はとても大きい。' }] },
  { name: 'immortal', stage: 'food', edits: [{ law: 'death', text: '' }] },
  // 死なないが老いる：老いた人が増え続け、支えきれなくなる
  { name: 'undying', stage: 'food', edits: [{ text: '人類は不死身になる。' }], expect: ['withered_eternity'] },
  // 不老不死：死なず老いず、人が増え続ける（長く続く世界で、人が増えきったところで崩れる）
  { name: 'eternal', stage: 'endless', edits: [{ text: '人は不老不死である。' }], expect: ['undying'] },
  // 誰も死なず、誰も生まれない（気候危機の世界で、雨を増やして10年を保つ）
  { name: 'closed', stage: 'climate', edits: [{ text: '人は死なない。' }, { text: '人は子を産まない。' }, { law: 'water_rain', text: '雨は多く降る。' }], expect: ['closed_eternity'] },
  { name: 'eternal_plague', stage: 'plague', edits: [{ text: '人は不老不死である。' }] },
  // 時間の文は、書いたら特別な結末（くり返したり戻ったりして、世界が終わらなくなることはない）
  { name: 'time_stop', stage: 'food', edits: [{ text: '時間が止まる。' }], expect: ['eternal_instant'] },
  { name: 'time_loop', stage: 'endless', edits: [{ text: '時間はくり返す。' }], expect: ['closed_time'] },
  { name: 'time_reverse', stage: 'food', edits: [{ text: '時間は逆に流れる。' }], expect: ['reversed_chronicle'] },
  { name: 'time_travel', stage: 'war', edits: [{ text: '人は過去に戻れる。' }], expect: ['unraveled_history'] },
  { name: 'far_future', stage: 'food', edits: [{ text: '5億年が過ぎる。' }], expect: ['far_future'] },
  { name: 'far_undying', stage: 'food', edits: [{ text: '人は不老不死である。' }, { text: '5億年が過ぎる。' }], expect: ['undying_far'] },
  // 物質をつくる力
  { name: 'coulomb', stage: 'food', edits: [{ text: 'クーロン力は存在しない。' }], expect: ['unbound_matter'] },
  { name: 'strong_force', stage: 'energy', edits: [{ text: '強い力は存在しない。' }], expect: ['broken_nuclei'] },
  { name: 'chemistry', stage: 'plague', edits: [{ text: '化学反応は起きない。' }], expect: ['stopped_life'] },
  { name: 'friction', stage: 'war', edits: [{ text: '摩擦は存在しない。' }], expect: ['slippery_world'] },
  // 宇宙と地球：ブラックホール・反物質・遺伝子・自転・太陽
  { name: 'black_hole', stage: 'food', edits: [{ text: 'ブラックホールが地球に近づく。' }], expect: ['swallowed'] },
  { name: 'antimatter', stage: 'energy', edits: [{ text: '反物質が空から降ってくる。' }], expect: ['annihilated'] },
  { name: 'no_dna', stage: 'plague', edits: [{ text: '遺伝子は存在しない。' }], expect: ['unwritten_life'] },
  { name: 'spin_stop', stage: 'food', edits: [{ text: '地球の自転が止まる。' }], expect: ['stopped_spin'] },
  { name: 'sun_black_hole', stage: 'climate', edits: [{ text: '太陽がブラックホールになる。' }], expect: ['sunless'] },
  { name: 'nuclear_war', stage: 'war', edits: [{ text: '核戦争が起きる。' }], expect: ['nuclear_winter'] },
  { name: 'weak_force', stage: 'climate', edits: [{ text: '弱い力は存在しない。' }] },
  { name: 'no_light', stage: 'climate', edits: [{ text: '光は存在しない。' }], expect: ['sunless'] },
  // 心と値打ち
  // 5億年ボタン：物価が千倍を超えるまで世界が保つよう、ふつうの世界（無限の世界）で試す
  { name: 'button', stage: 'endless', edits: [{ text: '5億年ボタンを押すと100万円もらえる。' }] },
  { name: 'button_memory', stage: 'endless', edits: [{ text: '5億年ボタンを押すと100万円もらえる。' }, { text: '人は何も忘れない。' }] },
  { name: 'no_emotion', stage: 'war', edits: [{ text: '人は感情を持たない。' }] },
  // 人が死を望む：生きる力が尽き、数年のうちに人が絶える（心の尽きた星）
  { name: 'death_wish', stage: 'food', edits: [{ text: '人は死を望む。' }], expect: ['mind_collapse'] },
  { name: 'precog', stage: 'war', edits: [{ text: '人は未来がわかる。' }] },
  { name: 'unknowable', stage: 'food', edits: [{ text: 'この世界はシミュレーションだ。' }] },
  { name: 'no_sea', stage: 'food', edits: [{ text: '海は存在しない。' }] },
  { name: 'magic', stage: 'energy', edits: [{ text: '人は魔法を使える。' }] },
  { name: 'god', stage: 'war', edits: [{ text: '神が人類を救う。' }] },
];

export function playScenario(data: GameData, sc: Scenario, seed: number, log = false): GameState {
  const g = createGame(data, sc.stage, seed);
  // 筋書きを試すため、書換の力と世界容量には余裕を持たせる
  g.edits.left = Math.max(g.edits.left, sc.edits.length);
  g.sim.capacityMax += 40 * 6;
  for (const e of sc.edits) {
    const res = e.law ? rewriteLaw(g, data, e.law, e.text) : addLine(g, data, e.text);
    if (res.block && res.block !== 'same') throw new Error(`筋書き ${sc.name}: 「${e.text}」が書けない（${res.block}）`);
    if (log) console.log(`  ✎ ${e.law ?? '＋'}「${e.text}」→ ${res.reading ?? (res.understood ? '受け入れた' : '読み取れない')}`);
  }
  const goal = data.stageById.get(sc.stage)!.goalYears;
  while (g.status === 'playing' && g.year < Math.min(goal, 120)) {
    const rep = advance(g, data, 1);
    if (log) for (const n of rep.news) if (n.severity !== 'info' || n.surprise) console.log(`  Y${n.year} ${n.severity === 'critical' ? '!!' : ' -'} ${n.text}`);
  }
  return g;
}

function main(): void {
  const [only, seedsArg = '10'] = process.argv.slice(2);
  const list = only && only !== 'all' ? SCENARIOS.filter((s) => s.name === only) : SCENARIOS;
  if (list.length === 1 && only && only !== 'all') {
    const g = playScenario(gameData, list[0]!, Number(seedsArg), true);
    console.log(`結末: ${g.ending ?? '(続いている)'} status=${g.status} year=${g.year}`);
    return;
  }
  const seeds = Number(seedsArg);
  for (const sc of list) {
    const counts: Record<string, number> = {};
    let years = 0;
    for (let i = 0; i < seeds; i++) {
      const g = playScenario(gameData, sc, 3000 + i);
      const key = g.status === 'playing' ? '(続いている)' : `${g.ending}`;
      counts[key] = (counts[key] ?? 0) + 1;
      years += g.year;
    }
    const title = (id: string) => gameData.endingById.get(id)?.title ?? id;
    const summary = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `${title(k)}×${n}`)
      .join(' ');
    console.log(`${sc.name.padEnd(14)} [${sc.stage}] 平均${(years / seeds).toFixed(1)}年  ${summary}`);
  }
}

if (process.argv[1]?.endsWith('worlds.ts')) main();

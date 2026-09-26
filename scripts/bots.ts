/**
 * バランス調整用のボット（ルール本体と同じコードで遊ぶ）。
 *   npx tsx scripts/bots.ts [ステージ|all] [種の数=30]        操作を絞ったボット・決まった手順・見立てるボットの表
 *   npx tsx scripts/bots.ts read [ステージ|all] [種の数=30]   見立てるボットと、型と作戦の表だけ（速い）
 * random：状況を見ずに、書換の力が戻るたびにでたらめに文章を書き換える・消す・書き足す（対照群）
 * 操作を絞ったボット：書き換えだけ・書き足しだけ・消すだけ・2種類だけで、いちばんクリアできる決まった手順を探す（P5）
 * 決まった手順：兆しを読まず、決まった年に決まった文を書く（scripts/strategies.ts の作戦）
 * 見立てるボット：はじめの年の兆し（ニュース）から原因の型を当て、型ごとの手を書き、効きが落ちたと知らせが来たら書き直す
 */
import { addLine, advance, createGame, originalText, rewriteLaw, type GameData, type GameState } from '../src/core';
import { gameData } from '../src/data';
import type { StageId } from '../src/data/schema';
import { candidates, evaluate, FIRST_WORLD, playPlan, YEARS, type ComboResult, type Move, type OpKind, type Planned } from './combos';
import { startWorld, writeDue, type Edit, type Pending } from './run';
import { CAPACITY_TRIMS, READERS, STRATEGIES } from './strategies';

/** 種つきの乱数（ボット専用。ゲームの乱数とは別） */
function botRng(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function playRandom(data: GameData, stage: StageId, seed: number): GameState {
  const g = createGame(data, stage, seed);
  const rnd = botRng(seed * 7 + 3);
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)]!;
  // 無限の世界は、長く続いてもどこかで打ち切る
  while (g.status === 'playing' && g.year < 400) {
    let tries = 0;
    while (g.edits.left > 0 && tries++ < 20) {
      const r = rnd();
      if (r < 0.45) {
        // 法則を、その法則の例文のどれかに書き換える
        const law = pick(data.laws);
        const texts = law.options.map((o) => (o.kind === 'delete' ? '' : (o.text ?? ''))).filter((t) => t !== g.texts[law.id]);
        rewriteLaw(g, data, law.id, pick(texts));
      } else if (r < 0.75) {
        rewriteLaw(g, data, pick(data.laws).id, '');
      } else {
        addLine(g, data, pick(data.phrases).example);
      }
    }
    advance(g, data, 1);
  }
  return g;
}

// ---------------------------------------------------------------- 見立てるボット

/** この年までに出た兆しで、原因の型を当てる（はじめの2年に、型ごとの知らせが2つずつ出る） */
export const READ_YEAR = 2;

/** 原因の型ごとの兆し（その型の世界にだけ出る出来事の知らせ） */
function causeSigns(data: GameData, stage: StageId): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const c of data.stageById.get(stage)?.causes ?? []) {
    const texts = data.events.filter((e) => (!e.stages || e.stages.includes(stage)) && e.when.includes(`cause:${c.id}`)).map((e) => e.text);
    out.set(c.id, new Set(texts));
  }
  return out;
}

/** 世界の記録（ニュース）に出た兆しから、原因の型を当てる。見分けられなければ null */
export function guessCause(g: GameState, data: GameData): string | null {
  let best: string | null = null;
  let most = 0;
  for (const [id, texts] of causeSigns(data, g.stageId)) {
    const n = g.history.filter((h) => h.year <= g.year && texts.has(h.text)).length;
    if (n > most) {
      most = n;
      best = id;
    }
  }
  return best;
}

/** 原因の型のないステージ（くり返す十年）の手は、この名前で置く */
export const NO_CAUSE = 'none';

export interface ReaderOptions {
  /** 兆しを読まず、この型の手を書く（型を外したときの確かめ） */
  plan?: string;
  /** この原因の型の世界で遊ぶ（型ごとに同じ数の世界で測るとき） */
  cause?: string;
  /** 世界の決まりの強さ（開いていく順番で、はじめて遊ぶ世界を測るとき） */
  intro?: Record<string, number>;
  /** 型の手の代わりに書く手（作り手の解を探すとき） */
  edits?: Edit[];
  /** 筆の位（救った世界の数。書かなければ、そのステージをはじめて遊べる位） */
  clears?: number;
}

/**
 * 見立てるボット：READ_YEAR 年目までの兆しで型を当て、その型の手（scripts/strategies.ts の READERS）を書く。
 * 効きが落ちたと知らせが来た行は、書き直す（when: 'adapt' の手）
 */
export function playReader(data: GameData, stage: StageId, seed: number, opts: ReaderOptions = {}): { g: GameState; guess: string | null; blocks: string[] } {
  const st = data.stageById.get(stage)!;
  const g = startWorld(data, stage, seed, {
    ...(opts.cause !== undefined ? { cause: opts.cause } : {}),
    ...(opts.intro ? { intro: opts.intro } : {}),
    ...(opts.clears !== undefined ? { clears: opts.clears } : {}),
  });
  const book = READERS[stage];
  let guess: string | null = null;
  let todo: Pending[] = [];
  const blocks: string[] = [];
  let steps = 0;
  while (g.status === 'playing' && g.year < st.goalYears && steps++ < 600) {
    if (guess === null && (g.year >= READ_YEAR || st.causes.length === 0)) {
      guess = st.causes.length === 0 ? NO_CAUSE : (opts.plan ?? guessCause(g, data) ?? st.causes[0]!.id);
      todo = (opts.edits ?? book?.byCause[guess] ?? []).map((e) => ({ e, done: false }));
    }
    writeDue(g, data, todo, blocks);
    // 使える文字数の限界の知らせを読んだら、書ける行を短く言い換えて場所を空ける
    if (g.derived.capacityRatio >= data.balance.capacity.strainFrom + 0.02 && g.edits.left > 0 && g.status === 'playing') trimForRoom(g, data);
    advance(g, data, 1);
  }
  return { g, guess, blocks };
}

/** 意味を変えずに短く言い換えて、使える文字数を空ける（書けた最初の1行だけ） */
function trimForRoom(g: GameState, data: GameData): void {
  for (const e of CAPACITY_TRIMS) {
    if (!e.law || g.trims[e.law] || (g.texts[e.law] ?? '') !== originalText(data.lawById.get(e.law)!)) continue;
    const res = rewriteLaw(g, data, e.law, e.text);
    if (!res.block) return;
  }
}

/** 見立てるボットのクリア率（世界番号 first から n 個。原因の型は世界番号で決まる） */
export function readerRate(stage: StageId, n: number, first = FIRST_WORLD, opts: ReaderOptions = {}): { rate: number; guessed: number } {
  let clears = 0;
  let guessed = 0;
  for (let i = 0; i < n; i++) {
    const { g, guess } = playReader(gameData, stage, first + i, opts);
    if (g.status === 'cleared') clears += 1;
    if (guess === g.cause || g.cause === null) guessed += 1;
  }
  return { rate: clears / n, guessed: guessed / n };
}

/** 型と作戦の表：行＝書いた型の手、列＝世界の原因の型。それぞれの型の世界 n 個でのクリア率 */
export function causeTable(stage: StageId, n: number): { causes: string[]; rows: { plan: string; rates: number[] }[] } {
  const causes = gameData.stageById.get(stage)!.causes.map((c) => c.id);
  const rows = causes.map((plan) => ({
    plan,
    rates: causes.map((cause) => {
      let clears = 0;
      for (let i = 0; i < n; i++) if (playReader(gameData, stage, FIRST_WORLD + i, { plan, cause }).g.status === 'cleared') clears += 1;
      return clears / n;
    }),
  }));
  return { causes, rows };
}

// ---------------------------------------------------------------- 操作を絞ったボット（P5）

/** 絞り方：書き換えだけ・書き足しだけ・消すだけ・2種類だけ（各組） */
export const KIND_SETS: { name: string; kinds: OpKind[] }[] = [
  { name: '書き換えだけ', kinds: ['rewrite'] },
  { name: '書き足しだけ', kinds: ['add'] },
  { name: '消すだけ', kinds: ['delete'] },
  { name: '書き換え＋書き足し', kinds: ['add', 'rewrite'] },
  { name: '書き換え＋消す', kinds: ['delete', 'rewrite'] },
  { name: '書き足し＋消す', kinds: ['add', 'delete'] },
];

const rank = (a: ComboResult, b: ComboResult) => b.rate - a.rate || b.avgYears - a.avgYears;

function combos<T>(xs: readonly T[], k: number): T[][] {
  if (k === 0) return [[]];
  const out: T[][] = [];
  xs.forEach((x, i) => {
    for (const rest of combos(xs.slice(i + 1), k - 1)) out.push([x, ...rest]);
  });
  return out;
}

function plans(moves: readonly Move[], k: number, years: readonly number[]): Planned[][] {
  const out: Planned[][] = [];
  const seen = new Set<string>();
  for (const set of combos(moves, k)) {
    const laws = set.filter((m) => m.law).map((m) => m.law);
    if (new Set(laws).size < laws.length) continue;
    for (const ys of combos([...years, ...years, ...years], k) as number[][]) {
      const plan = set.map((m, i) => ({ move: m, year: ys[i]! }));
      const key = plan.map((p) => `${p.move.label}@${p.year}`).join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(plan);
    }
  }
  return out;
}

/**
 * その絞り方で、いちばんクリアできる決まった手順（3手まで）を探す。
 * 1手を全部試し、上位 pool 手から2手・3手を組む（消すだけは、消せる行を全部組む）。最後に上位を種 finalSeeds 個で測り直す
 */
export function bestRestricted(stage: StageId, kinds: readonly OpKind[], pool = 12, seeds = 6, finalSeeds = 30): ComboResult {
  const allowed = new Set(kinds);
  const moves = candidates(stage).filter((m) => allowed.has(m.kind));
  const singles: ComboResult[] = [];
  for (const m of moves) for (const y of YEARS) singles.push(evaluate(stage, [{ move: m, year: y }], seeds));
  const best = new Map<string, ComboResult>();
  for (const r of singles.sort(rank)) if (!best.has(r.plan[0]!.move.label)) best.set(r.plan[0]!.move.label, r);
  const exhaustive = kinds.length === 1 && kinds[0] === 'delete';
  const top = exhaustive ? moves : [...best.values()].slice(0, pool).map((r) => r.plan[0]!.move);
  const tried: ComboResult[] = [...singles];
  for (const k of [2, 3]) {
    const years = exhaustive && k === 3 ? [0] : YEARS;
    for (const plan of plans(top, k, years)) tried.push(evaluate(stage, plan, seeds));
  }
  // 絞った種類のほかの操作になってしまった手（書き足しが既存の行の書き換えとして読まれた など）は数えない
  const valid = tried.filter((r) => r.kinds.every((k) => allowed.has(k))).sort(rank);
  const finals = valid.slice(0, 5).map((r) => evaluate(stage, r.plan, finalSeeds)).filter((r) => r.kinds.every((k) => allowed.has(k)));
  return finals.sort(rank)[0] ?? evaluate(stage, [], finalSeeds);
}

/** 決まった手順（兆しを読まず、決まった年に決まった文を書く）：作戦（scripts/strategies.ts）のうち、いちばんクリアできるもの */
export function bestFixed(stage: StageId, finalSeeds = 30): { name: string; rate: number } {
  let out = { name: '-', rate: 0 };
  for (const strat of STRATEGIES[stage] ?? []) {
    const plan: Planned[] = strat.edits
      .filter((e) => e.pass === undefined || e.pass === 0)
      .map((e) => ({ move: { kind: e.law ? (e.text.trim() === '' ? 'delete' : 'rewrite') : 'add', law: e.law ?? null, text: e.text, label: `${e.law ?? '+'}` } as Move, year: e.year }));
    let clears = 0;
    for (let i = 0; i < finalSeeds; i++) if (playPlan(stage, plan, FIRST_WORLD + i, strat.clears).g.status === 'cleared') clears += 1;
    const rate = clears / finalSeeds;
    if (rate > out.rate) out = { name: strat.name, rate };
  }
  return out;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

function printReaders(stages: StageId[], seeds: number): void {
  for (const stage of stages) {
    const r = readerRate(stage, seeds);
    const st = gameData.stageById.get(stage)!;
    console.log(`\n== ${st.title}（${stage}）  見立てるボット ${pct(r.rate)}（型を当てた ${pct(r.guessed)}）  決まった手順の最善 ${(() => {
      const f = bestFixed(stage, seeds);
      return `${pct(f.rate)}（${f.name}）`;
    })()}`);
    if (st.causes.length === 0) continue;
    const t = causeTable(stage, Math.max(10, Math.round(seeds / 2)));
    console.log(`  型と作戦の表（行＝書いた型の手、列＝世界の型。型ごとに ${Math.max(10, Math.round(seeds / 2))} 個の世界）`);
    console.log(`    ${''.padEnd(12)}${t.causes.map((c) => c.padStart(10)).join('')}`);
    for (const row of t.rows) console.log(`    ${row.plan.padEnd(12)}${row.rates.map((x) => pct(x).padStart(10)).join('')}`);
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const readOnly = args[0] === 'read';
  const [which = 'all', seedsArg = '30'] = readOnly ? args.slice(1) : args;
  const seeds = Number(seedsArg);
  const stages = (which === 'all' ? gameData.stages.filter((s) => !s.endless).map((s) => s.id) : [which]) as StageId[];
  if (readOnly) {
    printReaders(stages, seeds);
    return;
  }
  const head = ['ステージ', ...KIND_SETS.map((k) => k.name), '決まった手順', '見立てる'];
  console.log(head.join('\t'));
  for (const stage of stages) {
    const row: string[] = [stage];
    for (const ks of KIND_SETS) {
      const r = bestRestricted(stage, ks.kinds, 12, 6, seeds);
      row.push(pct(r.rate));
      console.error(`  ${stage} ${ks.name}: ${pct(r.rate)}  ${r.plan.map((p) => `${p.move.label}@${p.year}`).join(' + ')}`);
    }
    const f = bestFixed(stage, seeds);
    row.push(`${pct(f.rate)}（${f.name}）`);
    row.push(pct(readerRate(stage, seeds).rate));
    console.log(row.join('\t'));
  }
  printReaders(stages, seeds);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/bots.ts')) main();

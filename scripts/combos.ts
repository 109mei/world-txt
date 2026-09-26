/**
 * 組み合わせの総当たり（P4）：単語・概念・読み取りの組み合わせで起きる現象を回し、
 * 壊れた数値・つまらない必勝法・届かない結末を見つける。
 *   npx tsx scripts/combos.ts <ステージ|all> [1手の上位=30] [3手の上位=15] [世界番号の数=10]
 * はじめて遊べる筆の位（accessFor）で書ける読み取りを集める：laws.json の options（消したときの意味も）と phrases.json の例文。
 * 1手を全部回し（書く年は0年目と5年目）、1手の上位から2手・3手を総当たりする。世界番号 1000〜 で、npm run sim と同じルール本体で回す。
 * 結果は scripts/out/combos-<stage>.csv に出す
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { accessFor, lawTotals, type GameState } from '../src/core';
import { gameData } from '../src/data';
import type { StageId } from '../src/data/schema';
import { runEdits, type Edit } from './run';

export type OpKind = 'rewrite' | 'add' | 'delete';

export interface Move {
  kind: OpKind;
  law: string | null;
  text: string;
  label: string;
}

export interface Planned {
  move: Move;
  year: number;
}

export interface ComboResult {
  plan: readonly Planned[];
  clears: number;
  seeds: number;
  rate: number;
  avgYears: number;
  endings: Record<string, number>;
  /** 実際に書けた手の種類 */
  kinds: OpKind[];
  maxCap: number;
  broken: string | null;
  /** 2年以内に特別な結末で終わった（意図しない組み合わせで入る、その場で終わる結末） */
  instant: string | null;
  found: Set<string>;
}

export const FIRST_WORLD = 1000;
/** 書く年：はじめの年と、書換の力が戻る年（力が足りなければ、戻った年に書く） */
export const YEARS = [0, 7];

/** はじめて遊べる筆の位で、そのステージに書ける1手 */
export function candidates(stage: StageId): Move[] {
  const st = gameData.stageById.get(stage)!;
  const access = accessFor(gameData, stage, st.unlock);
  const open = new Set(access.concepts);
  const out: Move[] = [];
  for (const law of gameData.laws) {
    if (!open.has(law.concept)) continue;
    for (const o of law.options) {
      if (o.kind === 'original') continue;
      if (access.depth !== null && o.incoherence > access.depth) continue;
      if (o.kind === 'delete') out.push({ kind: 'delete', law: law.id, text: '', label: `${law.id}を消す` });
      else if (o.text) out.push({ kind: 'rewrite', law: law.id, text: o.text, label: `${law.id}=${o.id}` });
    }
  }
  if (access.margin === null || access.margin > 0) {
    for (const p of gameData.phrases) {
      if (p.generic) continue;
      if (access.depth !== null && p.incoherence > access.depth) continue;
      out.push({ kind: 'add', law: null, text: p.example, label: `+${p.id}` });
    }
  }
  return out;
}

/**
 * 決めた年に決めた手を書きながら、世界の終わりまで進める（書換の力が足りなければ、戻った年に書く。くり返す世界では最初の周だけ）。
 * clears：救った世界の数（書かなければ、そのステージをはじめて遊べる位）
 */
export function playPlan(stage: StageId, plan: readonly Planned[], seed: number, clears?: number): { g: GameState; kinds: Set<OpKind>; maxCap: number } {
  const kinds = new Set<OpKind>();
  const moveOf = new Map<Edit, Move>();
  const edits: Edit[] = plan.map((p) => {
    const e: Edit = { year: p.year, text: p.move.text, pass: 0, ...(p.move.law !== null ? { law: p.move.law } : {}) };
    moveOf.set(e, p.move);
    return e;
  });
  let maxCap = 0;
  const { g } = runEdits(gameData, stage, edits, seed, {
    clears,
    onEdit: (e, res, w) => {
      const m = moveOf.get(e)!;
      if (!res.block) kinds.add(m.kind === 'add' && res.redirect ? 'rewrite' : m.kind);
      maxCap = Math.max(maxCap, lawTotals(gameData, w).cost / Math.max(1, w.sim.capacityMax));
    },
    onYear: (w) => {
      maxCap = Math.max(maxCap, lawTotals(gameData, w).cost / Math.max(1, w.sim.capacityMax));
    },
  });
  return { g, kinds, maxCap };
}

function brokenOf(g: GameState): string | null {
  for (const [k, v] of Object.entries(g.sim)) if (typeof v === 'number' && !Number.isFinite(v)) return `sim.${k}=${v}`;
  if (g.sim.pop < 0) return `pop=${g.sim.pop}`;
  for (const [k, v] of Object.entries(g.derived)) if (typeof v === 'number' && !Number.isFinite(v)) return `derived.${k}=${v}`;
  return null;
}

export function evaluate(stage: StageId, plan: readonly Planned[], seeds: number): ComboResult {
  let clears = 0;
  let years = 0;
  let maxCap = 0;
  let broken: string | null = null;
  let instant: string | null = null;
  const endings: Record<string, number> = {};
  const kinds = new Set<OpKind>();
  const found = new Set<string>();
  for (let i = 0; i < seeds; i++) {
    const r = playPlan(stage, plan, FIRST_WORLD + i);
    const g = r.g;
    if (g.status === 'cleared') clears += 1;
    years += g.year;
    maxCap = Math.max(maxCap, r.maxCap);
    for (const k of r.kinds) kinds.add(k);
    for (const id of g.found) found.add(id);
    const end = g.ending ?? (g.status === 'playing' ? 'playing' : '?');
    endings[end] = (endings[end] ?? 0) + 1;
    broken ??= brokenOf(g);
    const special = g.ending ? gameData.endingById.get(g.ending) : undefined;
    if (!instant && special?.type === 'trigger' && g.year <= 2) instant = `${special.id}（${g.year}年目）`;
  }
  return { plan, clears, seeds, rate: clears / seeds, avgYears: years / seeds, endings, kinds: [...kinds].sort() as OpKind[], maxCap, broken, instant, found };
}

const planLabel = (plan: readonly Planned[]) => plan.map((p) => `${p.move.label}@${p.year}`).join(' + ');

function rank(a: ComboResult, b: ComboResult): number {
  return b.rate - a.rate || b.avgYears - a.avgYears;
}

/** 1手を全部回し、上位から2手・3手を総当たりする */
export function searchStage(stage: StageId, top1 = 30, top3 = 15, seeds = 10, log = (_s: string) => {}): ComboResult[] {
  const moves = candidates(stage);
  const results: ComboResult[] = [];
  const singles: ComboResult[] = [];
  for (const m of moves) {
    for (const y of YEARS) {
      const r = evaluate(stage, [{ move: m, year: y }], seeds);
      singles.push(r);
      results.push(r);
    }
  }
  log(`  1手 ${singles.length}通り`);
  // 同じ手（年だけ違う）は、良いほうだけを上位に残す
  const bestSingle = new Map<string, ComboResult>();
  for (const r of singles.sort(rank)) if (!bestSingle.has(r.plan[0]!.move.label)) bestSingle.set(r.plan[0]!.move.label, r);
  const top = [...bestSingle.values()].slice(0, top1).map((r) => r.plan[0]!.move);
  const clash = (ms: Move[]) => new Set(ms.filter((m) => m.law).map((m) => m.law)).size < ms.filter((m) => m.law).length;
  let n2 = 0;
  for (let i = 0; i < top.length; i++) {
    for (let j = i + 1; j < top.length; j++) {
      if (clash([top[i]!, top[j]!])) continue;
      for (const y1 of YEARS) for (const y2 of YEARS) {
        results.push(evaluate(stage, [{ move: top[i]!, year: y1 }, { move: top[j]!, year: y2 }], seeds));
        n2 += 1;
      }
    }
  }
  log(`  2手 ${n2}通り`);
  const t3 = top.slice(0, top3);
  let n3 = 0;
  for (let i = 0; i < t3.length; i++) {
    for (let j = i + 1; j < t3.length; j++) {
      for (let k = j + 1; k < t3.length; k++) {
        if (clash([t3[i]!, t3[j]!, t3[k]!])) continue;
        for (const y1 of YEARS) for (const y2 of YEARS) for (const y3 of YEARS) {
          results.push(evaluate(stage, [{ move: t3[i]!, year: y1 }, { move: t3[j]!, year: y2 }, { move: t3[k]!, year: y3 }], seeds));
          n3 += 1;
        }
      }
    }
  }
  log(`  3手 ${n3}通り`);
  return results.sort(rank);
}

function csv(results: readonly ComboResult[]): string {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = ['手,操作の種類,クリア,種,クリア率,平均年数,結末,容量の最大使用率,壊れた数値,すぐ終わる結末'];
  for (const r of results) {
    rows.push([q(planLabel(r.plan)), r.kinds.join('+') || '-', r.clears, r.seeds, r.rate.toFixed(2), r.avgYears.toFixed(1), q(JSON.stringify(r.endings)), r.maxCap.toFixed(2), q(r.broken ?? ''), q(r.instant ?? '')].join(','));
  }
  return `${rows.join('\n')}\n`;
}

/** データにあるのに、どの組み合わせでも一度も起きなかったもの */
function neverSeen(found: Set<string>): Record<string, string[]> {
  const miss = (prefix: string, ids: string[]) => ids.filter((id) => !found.has(`${prefix}${id}`));
  return {
    出来事: miss('e:', gameData.events.map((e) => e.id)),
    副作用: miss('t:', gameData.twists.map((t) => t.id)),
    特別な結末: miss('x:', gameData.endings.map((e) => e.id)),
    組み合わせ: miss('c:', gameData.combos.map((c) => c.id)),
  };
}

function main(): void {
  const [which = 'all', a1 = '30', a3 = '15', aSeeds = '10'] = process.argv.slice(2);
  const stages = (which === 'all' ? gameData.stages.filter((s) => !s.endless).map((s) => s.id) : [which]) as StageId[];
  mkdirSync('scripts/out', { recursive: true });
  const seenAll = new Set<string>();
  for (const stage of stages) {
    console.log(`== ${stage}`);
    const results = searchStage(stage, Number(a1), Number(a3), Number(aSeeds), console.log);
    writeFileSync(`scripts/out/combos-${stage}.csv`, csv(results));
    for (const r of results) for (const id of r.found) seenAll.add(id);
    const strong = results.filter((r) => r.rate > 0.55);
    console.log(`  クリア率55%を超える組み合わせ ${strong.length}（うち1種類の操作だけ ${strong.filter((r) => r.kinds.length === 1).length}、消すだけ ${strong.filter((r) => r.kinds.length === 1 && r.kinds[0] === 'delete').length}）`);
    for (const r of strong.slice(0, 8)) console.log(`    ${(r.rate * 100).toFixed(0)}%  ${r.kinds.join('+')}  ${planLabel(r.plan)}`);
    const byKind = new Map<string, ComboResult>();
    for (const r of results) {
      const k = r.kinds.join('+') || '-';
      if (!byKind.has(k)) byKind.set(k, r);
    }
    console.log('  操作の種類ごとの最善');
    for (const [k, r] of byKind) console.log(`    ${k.padEnd(20)} ${(r.rate * 100).toFixed(0)}%  ${planLabel(r.plan)}`);
    const broken = results.filter((r) => r.broken);
    console.log(`  数値が壊れる組み合わせ ${broken.length}${broken[0] ? `（例：${planLabel(broken[0].plan)} → ${broken[0].broken}）` : ''}`);
    const instant = results.filter((r) => r.instant);
    console.log(`  2年以内に特別な結末で終わる組み合わせ ${instant.length}`);
    for (const r of instant.slice(0, 6)) console.log(`    ${r.instant}  ${planLabel(r.plan)}`);
  }
  if (which === 'all') {
    console.log('\n== 一度も起きなかったもの（どのステージのどの組み合わせでも）');
    for (const [k, ids] of Object.entries(neverSeen(seenAll))) console.log(`  ${k} ${ids.length}：${ids.join(' ')}`);
    const noScene = [
      ...gameData.laws.flatMap((l) => l.options.filter((o) => o.kind !== 'original' && !o.scene).map((o) => `${l.id}=${o.id}`)),
      ...gameData.phrases.filter((p) => !p.scene).map((p) => p.id),
    ];
    console.log(`  情景の描き方がない読み取り ${noScene.length}`);
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/combos.ts')) main();

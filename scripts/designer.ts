/**
 * 作り手の解を探す（P22）：原因の型ごとの手（READERS）に、はじめて遊べる筆の位で書ける手を1手ずつ足し、
 * その型のどの世界番号でも救える手順にする（救えない世界番号をいちばん減らす手を、貪欲に選ぶ）。
 *   npx tsx scripts/designer.ts <ステージ> [型|all] [世界番号の数=30] [足す手の上限=3]
 * 見つけた手順は scripts/out/designer-<ステージ>.txt に出す。READERS に書き写すかは、人が決める
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { gameData } from '../src/data';
import type { StageId } from '../src/data/schema';
import { playReader } from './bots';
import { candidates, type Move } from './combos';
import type { Edit } from './run';
import { READERS } from './strategies';

const FIRST = 1000;
/** 足す手を書く年 */
const ADD_YEARS = [3, 10, 17];
/** 救えない世界番号で絞ったあと、全部の世界番号で確かめる候補の数 */
const SHORTLIST = 6;

function toEdit(m: Move, year: number): Edit {
  return m.law !== null ? { year, law: m.law, text: m.text } : { year, text: m.text };
}

function label(e: Edit): string {
  return `${e.law ? `${e.law}=「${e.text}」` : `+「${e.text}」`}@${e.year}`;
}

/** その手順で救えない世界番号と、救えた世界の手の数の最大 */
function failures(stage: StageId, cause: string, edits: Edit[], seeds: number[]): { failed: number[]; moves: number } {
  const st = gameData.stageById.get(stage)!;
  const failed: number[] = [];
  let moves = 0;
  for (const seed of seeds) {
    const { g } = playReader(gameData, stage, seed, { ...(st.causes.length > 0 ? { cause, plan: cause } : {}), edits });
    if (g.status === 'cleared') moves = Math.max(moves, g.moves.length);
    else failed.push(seed);
  }
  return { failed, moves };
}

export function search(stage: StageId, cause: string, n: number, maxAdd: number): { edits: Edit[]; failed: number[]; moves: number; added: Edit[] } {
  const all = Array.from({ length: n }, (_, i) => FIRST + i);
  const base = (READERS[stage].byCause[cause] ?? []).map((e) => ({ ...e }));
  let edits = base;
  let cur = failures(stage, cause, edits, all);
  const added: Edit[] = [];
  const pool = candidates(stage);
  for (let step = 0; step < maxAdd && cur.failed.length > 0; step++) {
    // 救えない世界番号だけで、足す手と入れ替える手を比べる（書換の力には限りがあるので、足すより入れ替えるほうが効くことが多い）
    const scored: { plan: Edit[]; e: Edit; replaced: Edit | null; fixed: number }[] = [];
    const tryPlan = (plan: Edit[], e: Edit, replaced: Edit | null) => {
      const r = failures(stage, cause, plan, cur.failed);
      const fixed = cur.failed.length - r.failed.length;
      if (fixed > 0) scored.push({ plan, e, replaced, fixed });
    };
    for (const m of pool) {
      for (const year of ADD_YEARS) {
        const e = toEdit(m, year);
        tryPlan([...edits, e], e, null);
      }
      for (let i = 0; i < edits.length; i++) {
        const old = edits[i]!;
        if (old.pass !== undefined || old.when) continue;
        const e = toEdit(m, old.year);
        tryPlan(edits.map((x, k) => (k === i ? e : x)), e, old);
      }
    }
    scored.sort((a, b) => b.fixed - a.fixed);
    let best: { plan: Edit[]; e: Edit; replaced: Edit | null; r: { failed: number[]; moves: number } } | null = null;
    for (const s of scored.slice(0, SHORTLIST)) {
      const r = failures(stage, cause, s.plan, all);
      if (!best || r.failed.length < best.r.failed.length) best = { ...s, r };
    }
    if (!best || best.r.failed.length >= cur.failed.length) break;
    edits = best.plan;
    added.push(best.e);
    cur = best.r;
    console.error(`  ${stage} ${cause}: ${best.replaced ? `${label(best.replaced)} → ` : '+'}${label(best.e)} → 救えない ${cur.failed.length}/${n}`);
  }
  return { edits, failed: cur.failed, moves: cur.moves, added };
}

function main(): void {
  const [stage = 'food', which = 'all', seedsArg = '30', addArg = '3'] = process.argv.slice(2) as [StageId, string, string, string];
  const st = gameData.stageById.get(stage)!;
  const causes = which === 'all' ? (st.causes.length > 0 ? st.causes.map((c) => c.id) : Object.keys(READERS[stage].byCause)) : [which];
  const lines: string[] = [];
  for (const cause of causes) {
    const r = search(stage, cause, Number(seedsArg), Number(addArg));
    const line = `${stage}\t${cause}\t救えない ${r.failed.length}/${seedsArg}\t手の数（最大） ${r.moves}\t変えた手 ${r.added.map(label).join(' / ') || 'なし'}\t手順 ${r.edits.map(label).join(' / ')}${r.failed.length ? `\t救えない世界番号 ${r.failed.join(',')}` : ''}`;
    console.log(line);
    lines.push(line);
  }
  mkdirSync('scripts/out', { recursive: true });
  writeFileSync(`scripts/out/designer-${stage}.txt`, `${lines.join('\n')}\n`);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/designer.ts')) main();

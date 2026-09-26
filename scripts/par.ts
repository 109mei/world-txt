/**
 * 作り手の解（P22・分析の17章）：原因の型ごとの手（scripts/strategies.ts の READERS）を、その型の世界番号いくつもで遊び、
 * どの世界番号でも救えるか、何手かかったかを数える。「少ない手で」の印は、この手数（stages.json の causes[].par）以内で付く。
 *   npx tsx scripts/par.ts [ステージ|all] [世界番号の数]
 */
import { gameData } from '../src/data';
import type { StageId } from '../src/data/schema';
import { playReader } from './bots';
import { READERS } from './strategies';

export interface ParRow {
  stage: StageId;
  cause: string;
  worlds: number;
  cleared: number;
  /** 救えた世界での手の数の最大（作り手の解の手数） */
  moves: number;
  /** 救えなかった世界番号 */
  failed: number[];
}

/** その型の世界だけを、型の手（見立てを当てた手）で遊ぶ */
export function parOfCause(stage: StageId, cause: string, seeds: number, first = 1000): ParRow {
  const st = gameData.stageById.get(stage)!;
  let cleared = 0;
  let moves = 0;
  const failed: number[] = [];
  for (let i = 0; i < seeds; i++) {
    const seed = first + i;
    const { g } = playReader(gameData, stage, seed, st.causes.length > 0 ? { cause, plan: cause } : {});
    if (g.status === 'cleared') {
      cleared += 1;
      moves = Math.max(moves, g.moves.length);
    } else failed.push(seed);
  }
  return { stage, cause, worlds: seeds, cleared, moves, failed };
}

function main(): void {
  const [which = 'all', seedsArg = '30'] = process.argv.slice(2);
  const seeds = Number(seedsArg);
  const stages = gameData.stages.filter((s) => s.marks && (which === 'all' || s.id === which)).map((s) => s.id);
  for (const stage of stages) {
    const st = gameData.stageById.get(stage)!;
    const causes = st.causes.length > 0 ? st.causes.map((c) => c.id) : Object.keys(READERS[stage].byCause);
    for (const cause of causes) {
      const r = parOfCause(stage, cause, seeds);
      const par = st.causes.find((c) => c.id === cause)?.par ?? st.par ?? null;
      console.log(
        `${stage.padEnd(8)} ${cause.padEnd(10)} 救えた ${String(r.cleared).padStart(2)}/${r.worlds}  手の数（最大） ${r.moves}  いまの手数 ${par ?? '-'}${r.failed.length ? `  救えなかった世界番号 ${r.failed.join(',')}` : ''}`,
      );
    }
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/par.ts')) main();

/**
 * 筆の位で遊べる範囲を確かめる：どのステージも、はじめて遊べる筆の位（救った世界の数）で、
 * 作戦が封じられた行・余白・重すぎる概念に止められずに遊べるか、そしてクリアできるかを数える。
 *   npm run ranks          （全ステージ、種10個ずつ）
 *   npm run ranks -- 30     （種30個ずつ）
 */
import { accessFor } from '../src/core';
import { gameData } from '../src/data';
import type { StageId } from '../src/data/schema';
import { playReader } from './bots';
import { HARD_BLOCKS, runEdits } from './run';
import { STRATEGIES } from './strategies';

const seeds = Number(process.argv[2] ?? 10);
let blockedAny = false;
for (const st of [...gameData.stages].sort((a, b) => a.order - b.order)) {
  if (st.endless) continue;
  const clears = st.unlock ?? 0;
  const rows: string[] = [];
  let usable = 0;
  let clearedStrats = 0;
  for (const strat of STRATEGIES[st.id as StageId] ?? []) {
    let wins = 0;
    let block: string | null = null;
    for (let i = 0; i < seeds && !block; i += 1) {
      // 考えた作戦（ある型の手）は、見立てるボットと同じく、使える文字数が足りなければ短く言い換えて場所を空ける。
      // どちらも、書換の力が足りない年の手は力が戻った年に書く（scripts/run.ts）
      const clearsNow = strat.clears ?? clears;
      const r =
        strat.role === 'plan' && strat.cause
          ? playReader(gameData, st.id as StageId, 1000 + i, { plan: strat.cause, clears: clearsNow, edits: strat.edits })
          : runEdits(gameData, st.id as StageId, strat.edits, 1000 + i, { clears: clearsNow });
      const hard = r.blocks.find((b) => HARD_BLOCKS.has(b.split(':')[0]!));
      if (hard) block = hard;
      if (r.g.status === 'cleared') wins += 1;
    }
    const later = strat.clears !== undefined && strat.clears > clears ? `（救った世界 ${strat.clears} から）` : '';
    if (block) rows.push(`   ✕ ${strat.name.padEnd(22)} 筆の位で止まる（${block}）`);
    else {
      usable += 1;
      if (wins > 0) clearedStrats += 1;
      rows.push(`   ${wins > 0 ? '○' : '・'} ${strat.name.padEnd(22)} ${wins}/${seeds}${later}`);
    }
  }
  const rank = gameData.access.ranks[accessFor(gameData, st.id as StageId, clears).rank]!.name;
  console.log(`${st.title}（救った世界 ${clears} → ${rank}）：使える作戦 ${usable}、クリアできる作戦 ${clearedStrats}`);
  for (const r of rows) console.log(r);
  if (clearedStrats === 0 && (STRATEGIES[st.id as StageId] ?? []).length > 0) blockedAny = true;
}
if (blockedAny) {
  console.log('\n！ はじめて遊べる位では、クリアできる作戦のないステージがある');
  process.exitCode = 1;
}

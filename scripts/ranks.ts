/**
 * 筆の位で遊べる範囲を確かめる：どのステージも、はじめて遊べる筆の位（救った世界の数）で、
 * 作戦が封じられた行・余白・重すぎる概念に止められずに遊べるか、そしてクリアできるかを数える。
 *   npm run ranks          （全ステージ、種10個ずつ）
 *   npm run ranks -- 30     （種30個ずつ）
 */
import { accessFor, addLine, advance, createGame, rewriteLaw } from '../src/core';
import { gameData } from '../src/data';
import type { StageId } from '../src/data/schema';
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
      const g = createGame(gameData, st.id as StageId, 1000 + i, accessFor(gameData, st.id as StageId, clears));
      let steps = 0;
      while (g.status === 'playing' && g.year < st.goalYears && steps++ < 600 && !block) {
        for (const e of strat.edits) {
          if (e.year !== g.year || (e.pass !== undefined && e.pass !== (g.loop?.count ?? 0))) continue;
          const res = e.law ? rewriteLaw(g, gameData, e.law, e.text) : addLine(g, gameData, e.text);
          if (res.block === 'sealed' || res.block === 'margin' || res.block === 'heavy') block = `${res.block}: ${e.law ?? e.text}`;
        }
        if (!block) advance(g, gameData, 1);
      }
      if (g.status === 'cleared') wins += 1;
    }
    if (block) rows.push(`   ✕ ${strat.name.padEnd(22)} 筆の位で止まる（${block}）`);
    else {
      usable += 1;
      if (wins > 0) clearedStrats += 1;
      rows.push(`   ${wins > 0 ? '○' : '・'} ${strat.name.padEnd(22)} ${wins}/${seeds}`);
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

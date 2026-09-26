import { describe, expect, it } from 'vitest';
import { accessFor, addLine, advance, createGame, rewriteLaw } from '../src/core';
import { gameData } from '../src/data';
import { sceneView } from '../src/store/scene';
import { buildView } from '../src/store/view';

/**
 * 序章の手引き：1年に1つずつ、書き換える・書き足す・消すを押す順に示す。
 * 手本どおりに書けば、はじめての筆で書けて、次の年に知らせと情景に表れ、3年で序章を終えられる
 */
const stage = gameData.stageById.get('prologue')!;
const lessons = stage.tutorial;

describe('序章の手引き', () => {
  it('年ごとに1つずつ、書き換える・書き足す・消すを教える（序章の年数と同じ数）', () => {
    expect(lessons.length).toBe(stage.goalYears);
    expect(lessons.map((l) => l.move)).toEqual(['rewrite', 'add', 'delete']);
    for (const l of lessons) {
      // どの手引きも、その年の操作をしてから時間を進めて終わる
      expect(l.steps.some((s) => s.done === 'move')).toBe(true);
      expect(l.steps[l.steps.length - 1]!.done).toBe('year');
      // 手本の行と、開く行は、序章に見せる行の中にある
      for (const s of l.steps) {
        if (s.done.startsWith('edit:') && s.done !== 'edit:new') expect(stage.lines).toContain(s.done.slice(5));
        if (s.target?.startsWith('law-')) expect(stage.lines).toContain(s.target.slice(4));
      }
      if (l.law) expect(stage.lines).toContain(l.law);
    }
  });

  it('手本どおりに書くと、はじめての筆で書けて、次の年に知らせと情景に表れ、3年で序章を終える（どの世界番号でも）', () => {
    for (const seed of [1, 7, 42, 1234, 99999]) {
      const g = createGame(gameData, 'prologue', seed, accessFor(gameData, 'prologue', 0));
      for (const l of lessons) {
        const before = sceneView(g, gameData);
        const res = l.move === 'add' ? addLine(g, gameData, l.example!) : l.move === 'delete' ? rewriteLaw(g, gameData, l.law!, '') : rewriteLaw(g, gameData, l.law!, l.example!);
        expect(res.block, `${seed} ${l.title}`).toBeFalsy();
        expect(res.understood, `${seed} ${l.title}`).toBe(true);
        const rep = advance(g, gameData, 1);
        expect(
          rep.news.some((n) => n.onset),
          `${seed} ${l.title} の知らせ`,
        ).toBe(true);
        const after = sceneView(g, gameData);
        expect(
          Object.keys(after.motifs).some((k) => !(k in before.motifs)),
          `${seed} ${l.title} の情景`,
        ).toBe(true);
      }
      expect(g.status).toBe('cleared');
    }
  });

  it('画面の写し：その年の手引きと、去年の操作を結ぶ一文（去年その操作をしたときだけ）', () => {
    const g = createGame(gameData, 'prologue', 7, accessFor(gameData, 'prologue', 0));
    let v = buildView(g, gameData).tutorial!;
    expect(v.lesson?.title).toBe('書き換える');
    expect(v.moved).toBe(false);
    expect(v.after).toBeNull();
    rewriteLaw(g, gameData, 'animal_pollen', lessons[0]!.example!);
    expect(buildView(g, gameData).tutorial!.moved).toBe(true);
    advance(g, gameData, 1);
    v = buildView(g, gameData).tutorial!;
    expect(v.lesson?.title).toBe('書き足す');
    expect(v.after).toBe(lessons[0]!.after);
    // 何もせずに進めた年は、結びを出さない
    advance(g, gameData, 1);
    v = buildView(g, gameData).tutorial!;
    expect(v.lesson?.title).toBe('消す');
    expect(v.after).toBeNull();
  });

  it('手引きから外れて、その年の手本の操作をもう前の年にしていたら、その年の手引きは済んだものとして「1年進める」へ進める', () => {
    // 1年目に書き足した（余白は1行まで）→ 2年目の「書き足す」はもうできないが、止まらない
    const g = createGame(gameData, 'prologue', 7, accessFor(gameData, 'prologue', 0));
    expect(addLine(g, gameData, lessons[1]!.example!).block).toBeFalsy();
    advance(g, gameData, 1);
    let v = buildView(g, gameData).tutorial!;
    expect(v.lesson?.title).toBe('書き足す');
    expect(v.moved).toBe(true);
    // 2年目に手本の行を消した → 3年目の「消す」も済んだものとする（消した行は、もう消せない）
    expect(rewriteLaw(g, gameData, 'food_rot', '').block).toBeFalsy();
    advance(g, gameData, 1);
    v = buildView(g, gameData).tutorial!;
    expect(v.lesson?.title).toBe('消す');
    expect(v.moved).toBe(true);
  });

  it('手引きのない世界には出さない', () => {
    const g = createGame(gameData, 'food', 7);
    expect(buildView(g, gameData).tutorial).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { createGame, phraseName, planWrite } from '../src/core';
import { gameData } from '../src/data';

/**
 * 画面の呼び名がそのまま読めること（P3）：言い回しの名前（phrases.json の name）と、読み取りの名前（laws.json の options の label）を、
 * 食料危機の世界（書ける範囲の制限なし）に書き足すと、その概念・その読み取りになる。
 * 名前が文になっていないもの・世界の外への命令・誰にも確かめられないものは、理由つきで外す
 */

/** 外す言い回し：理由つき */
export const PHRASE_EXCLUDED: Record<string, string> = {
  time_speed: '名前に「（誰も気づかない）」が付く説明で、文になっていない',
  five_minutes: '誰にも確かめられない（名前は説明）',
  simulation: '誰にも確かめられない（名前は説明）',
  brain_vat: '誰にも確かめられない（名前は説明）',
  p_zombie: '誰にも区別できない（名前は説明）',
  parallel: '誰にも確かめられない（名前は説明）',
  afterlife: '誰にも確かめられない（名前は説明）',
  no_afterlife: '誰にも確かめられない（名前は説明）',
  no_god: '誰にも確かめられない（名前は説明）',
  black_hole_far: '名前に「（遠い宇宙で）」が付く説明',
  black_hole_void: '名前に「（人の一生では何も変わらない）」が付く説明',
  dark_matter_void: '名前に「（人の一生では何も変わらない）」が付く説明',
  dark_energy_void: '名前に「（人の一生では何も変わらない）」が付く説明',
  meta_command: '世界の外への命令（名前は分類）',
  wish_no_loop: '名前が説明（「原因が残るかぎり、世界はくり返す」）',
  wish_peace: '名前が名詞句（「争いのない世界」）で、文になっていない',
  button_500m: '名前が「〜がある」の存在文で、ボタンの中身を書かないと意味が決まらない',
};

/** 外す読み取り：理由つき（元の文と「〜と同じ」は、書き換えではないので除く） */
export const LABEL_EXCLUDED: Record<string, string> = {};

function readAdd(text: string): { phrases: string[]; law: string | null; block: string | null } {
  const g = createGame(gameData, 'food', 1);
  const plan = planWrite(g, gameData, { kind: 'new' }, text);
  const c = plan.written.carried[`x${g.nextExtra}`];
  const law = plan.result.redirect ? `${plan.result.redirect}.${plan.written.laws[plan.result.redirect]}` : c?.law ? `${c.law.id}.${c.law.option}` : null;
  return { phrases: c?.phrases ?? [], law, block: plan.block ?? (plan.result.understood ? null : 'noise') };
}

describe('画面の呼び名がそのまま読める（P3）', () => {
  // 「{X:ある動物}がいなくなる」のような名前は、書いた言葉（猫）で埋まる見本なので除く（種類ごとの読み取りは data.test で例文を確かめる）
  const phrases = gameData.phrases.filter((p) => !PHRASE_EXCLUDED[p.id] && !p.name.includes('{X'));
  it.each(phrases.map((p) => [p.id, phraseName(p.name).replace(/（[^）]*）$/u, '')]))('言い回し %s：「%s」', (id, name) => {
    const r = readAdd(`${name}。`);
    const p = gameData.phraseById.get(id)!;
    // 同じ意味の法則の読み取りが世界にある言い回し（covers）は、その行の書き換えとして読んでもよい
    const covered = p.covers.some((c) => r.law && c.replace(/^law:/u, '').split('=')[0] === r.law.split('.')[0]);
    expect(r.phrases.includes(id) || covered || r.block === 'redundant', `${name} → ${JSON.stringify(r)}`).toBe(true);
  });

  const labels = gameData.laws.flatMap((law) =>
    law.options.filter((o) => o.kind !== 'original' && !LABEL_EXCLUDED[`${law.id}.${o.id}`]).map((o) => [`${law.id}.${o.id}`, o.label] as [string, string]),
  );
  it.each(labels)('読み取り %s：「%s」', (key, label) => {
    const r = readAdd(`${label}。`);
    expect(r.law === key || r.block === 'redundant', `${label} → ${JSON.stringify(r)}`).toBe(true);
  });
});

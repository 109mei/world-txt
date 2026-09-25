import { describe, expect, it } from 'vitest';
import { interpretLaw, interpretLine, originalText, textCost } from '../src/core';
import { buildGameData, gameData, RAW_DATA } from '../src/data';

describe('内容のデータ', () => {
  it('balance.json と各 JSON が Zod の検査と相互参照の検査を通る', () => {
    expect(() => buildGameData(RAW_DATA)).not.toThrow();
  });

  it('すべての法則に、元の文と「削除したときの意味」がある', () => {
    for (const law of gameData.laws) {
      expect(originalText(law), law.id).not.toBe('');
      expect(
        law.options.some((o) => o.kind === 'delete'),
        law.id,
      ).toBe(true);
    }
  });

  it('法則の読み取りの例文は、書くとその読み取りになる', () => {
    for (const law of gameData.laws) {
      for (const o of law.options) {
        if (!o.text || o.kind === 'original') continue;
        expect(interpretLaw(law, o.text), `${law.id}「${o.text}」`).toEqual({ optionId: o.id, understood: true });
      }
    }
  });

  it('元の文のまま書き直しても、元の意味のまま', () => {
    for (const law of gameData.laws) {
      expect(interpretLaw(law, originalText(law)).optionId, law.id).toBe(law.initial);
    }
  });

  it('空にすると、その法則は削除として読み取られる', () => {
    for (const law of gameData.laws) {
      const del = law.options.find((o) => o.kind === 'delete')!;
      expect(interpretLaw(law, '').optionId, law.id).toBe(del.id);
    }
  });

  it('言い回し集の例文は、書き足すとその意味になる', () => {
    for (const p of gameData.phrases) {
      expect(interpretLine(gameData.phrases, p.example)?.id, p.example).toBe(p.id);
    }
  });

  it('元の WORLD.txt の重さは、各ステージの世界容量に収まっている（極小世界だけは、はじめからはみ出している）', () => {
    const total = gameData.laws.reduce((sum, law) => sum + textCost(originalText(law)), 0);
    for (const st of gameData.stages) {
      if (st.overflow) expect(total, st.id).toBeGreaterThan(st.capacity);
      else expect(total, st.id).toBeLessThan(st.capacity);
    }
  });
});

import type { GameData } from '../core';
import type { IconKey } from '../data/schema';

/**
 * 因果の地図の写し：見つけた読み取り（法則の書き換え）と書き足した概念から、それが起こしうる想定外の変化と組み合わせへ線を引く。
 * 見つけたものは名前を、まだ見つけていないものは「？」のまま見せる（何が起きるかは見せない。起きうる数だけ）。
 * 世界の決まりのデータ（laws.json の options[].twists・phrases.json の twists・combos.json の when）と、観測記録から作る
 */
export interface CausalEffect {
  id: string;
  kind: 'twist' | 'combo';
  /** 見つけていれば名前（まだなら null で「？」） */
  name: string | null;
  icon: IconKey;
  /** 組み合わせで、世界に良いもの */
  good?: boolean;
}

export interface CausalNode {
  /** 観測記録の id（r:法則.読み取り・p:言い回し） */
  id: string;
  name: string;
  icon: IconKey;
  effects: CausalEffect[];
}

export interface CausalMapView {
  nodes: CausalNode[];
  /** 見つけた線の数と、見つけた書き方から引ける線の数 */
  found: number;
  total: number;
}

/** 組み合わせの条件の、法則の読み取りと言い回し（打ち消しの条件は数えない） */
function comboRefs(when: readonly string[]): { laws: { law: string; options: string[] }[]; phrases: string[] } {
  const laws: { law: string; options: string[] }[] = [];
  const phrases: string[] = [];
  for (const cond of when) {
    for (const part of cond.split('||').map((p) => p.trim())) {
      if (part.startsWith('phrase:')) phrases.push(part.slice(7));
      const m = /^law:(\w+)=([\w|]+)$/.exec(part);
      if (m) laws.push({ law: m[1]!, options: m[2]!.split('|') });
    }
  }
  return { laws, phrases };
}

export function buildCausalMap(data: GameData, discovered: readonly string[]): CausalMapView {
  const found = new Set(discovered);
  const twistEffect = (id: string): CausalEffect | null => {
    const t = data.twistById.get(id);
    if (!t) return null;
    return { id: `t:${id}`, kind: 'twist', name: found.has(`t:${id}`) ? t.name : null, icon: t.icon };
  };
  const combos = data.combos.map((c) => ({ c, refs: comboRefs(c.when) }));
  const comboEffects = (match: (r: ReturnType<typeof comboRefs>) => boolean): CausalEffect[] =>
    combos.filter(({ refs }) => match(refs)).map(({ c }) => ({ id: `c:${c.id}`, kind: 'combo' as const, name: found.has(`c:${c.id}`) ? c.name : null, icon: c.icon, good: !!c.good }));

  const nodes: CausalNode[] = [];
  for (const law of data.laws) {
    const icon = data.conceptById.get(law.concept)?.icon ?? 'edit';
    for (const opt of law.options) {
      const id = `r:${law.id}.${opt.id}`;
      if (!found.has(id)) continue;
      const effects = [
        ...(opt.twists ?? []).map((t) => twistEffect(t.id)).filter((e): e is CausalEffect => e !== null),
        ...comboEffects((r) => r.laws.some((l) => l.law === law.id && l.options.includes(opt.id))),
      ];
      if (effects.length > 0) nodes.push({ id, name: opt.label, icon, effects });
    }
  }
  for (const p of data.phrases) {
    const id = `p:${p.id}`;
    if (!found.has(id)) continue;
    const effects = [...(p.twists ?? []).map((t) => twistEffect(t.id)).filter((e): e is CausalEffect => e !== null), ...comboEffects((r) => r.phrases.includes(p.id))];
    if (effects.length > 0) nodes.push({ id, name: p.name, icon: p.icon, effects });
  }
  // 見つけた線の多い書き方から
  const lit = (n: CausalNode) => n.effects.filter((e) => e.name !== null).length;
  nodes.sort((a, b) => lit(b) - lit(a) || a.name.localeCompare(b.name, 'ja'));
  const all = nodes.flatMap((n) => n.effects);
  return { nodes, found: all.filter((e) => e.name !== null).length, total: all.length };
}

import { computeChannels } from './channels';
import { checkAll } from './conditions';
import { startCharge } from './hash';
import { warCascade } from './model';
import { balanceFor } from './intro';
import { hoarding, recovery } from './people';
import type { GameData, GameState, Sign } from './types';

/**
 * 起きかけていること（兆し）：今の世界で育っているものの知らせ。書き換えの結果の予測ではない。
 * 知らされた危機・戦争の前ぶれ（閾値のなだれの手前）・起きる力のたまった出来事・育ち始めた副作用を、急ぐものから並べる。
 * 地震や太陽フレアのように、現実に何年も前の前ぶれがないものは出さない（出来事の sign に書いたものだけ）
 */
export function signsOf(g: GameState, data: GameData): Sign[] {
  if (g.status !== 'playing') return [];
  const b = data.balance;
  const words = data.indicators.signs;
  const out: Sign[] = [];
  const { ch } = computeChannels(g, data);

  // 1) 知らされた危機（無限の世界）
  if (g.crisis) {
    const c = data.crisisById.get(g.crisis.id);
    const left = g.crisis.at - g.year;
    if (c && left > 0) out.push({ id: `crisis:${c.id}`, kind: 'crisis', icon: c.icon, text: c.warn.replace('{n}', String(left)), years: left, tone: 'critical' });
  }

  // 2) 戦争の前ぶれ：緊張があと少し上がると、加わる人が半分を超える
  if (g.sim.war <= 0 && g.counters.warCooldown <= 0 && warCascade(g.sim, ch, b).near) {
    out.push({ id: 'war', kind: 'war', icon: 'war', text: words.war, years: null, tone: 'bad' });
  }

  // 3) 起きる力のたまった出来事（前ぶれのあるものだけ）
  for (const ev of data.events) {
    if (!ev.sign) continue;
    if (ev.stages && !ev.stages.includes(g.stageId)) continue;
    const last = g.fired[ev.id];
    if (last !== undefined && (ev.once || g.year - last < ev.cooldown)) continue;
    if (!checkAll(g, ev.when)) continue;
    const p = Math.max(0, ev.chance * (ev.chanceChannel ? ch[ev.chanceChannel] : 1));
    if (p <= 0 || p >= 1) continue;
    const key = `e:${ev.id}`;
    const c = g.charge[key] ?? startCharge(g.seed, key);
    if (c < b.signs.eventAt) continue;
    out.push({ id: key, kind: 'event', icon: ev.icon, text: ev.sign, years: Math.max(1, Math.ceil((1 - c) / p)), tone: ev.severity === 'critical' ? 'bad' : 'warn' });
  }

  // 4) 育ち始めた副作用（まだ世界に知らせが出ていないもの）
  for (const t of data.twists) {
    const level = g.twists[t.id] ?? 0;
    const first = t.news[0]?.at ?? 1;
    if (level < b.signs.twistAt || level >= first) continue;
    out.push({ id: `t:${t.id}`, kind: 'twist', icon: t.icon, text: words.twist.replace('{name}', t.name), years: null, tone: 'warn' });
  }

  // 5) 人々と世界の揺れ：戻りの遅さ（終わりの線の近く）・限りを超えた年数・買いだめの気配
  const pw = data.indicators.people.signs;
  const bb = balanceFor(g, data);
  const pb = bb.people;
  const back = recovery(g.derived.civ, pb.slowing.line, bb);
  if (back <= pb.slowing.signAt && g.trace.civ.length >= 2 && g.trace.civ[g.trace.civ.length - 1]! <= g.trace.civ[g.trace.civ.length - 2]!) {
    const stage = data.stageById.get(g.stageId);
    const weakest = [...(stage?.focus ?? [])].sort((x, y) => (g.scores[x] ?? 50) - (g.scores[y] ?? 50))[0];
    const name = weakest ? (data.indicators.items[weakest]?.label ?? '文明') : '文明';
    out.push({ id: 'people:slowing', kind: 'people', icon: 'civilization', text: pw.slowing.replace('{name}', name), years: null, tone: 'bad' });
  }
  if (g.sim.overshoot >= pb.overshoot.signAt) {
    out.push({ id: 'people:overshoot', kind: 'people', icon: 'eco', text: pw.overshoot.replace('{n}', String(Math.round(g.sim.overshoot))), years: null, tone: 'warn' });
  }
  if (!hoarding(g.sim, bb) && g.sim.anxiety >= pb.anxiety.hoardAt - 10 && g.sim.trust < pb.anxiety.hoardTrust + 10) {
    out.push({ id: 'people:anxiety', kind: 'people', icon: 'food', text: pw.anxiety, years: null, tone: 'warn' });
  }

  // 急ぐものから：危機 → 戦争の前ぶれ → 年数の近い出来事 → 人々と世界の揺れ → 副作用
  const rank = (x: Sign) => (x.kind === 'crisis' ? 0 : x.kind === 'war' ? 1 : x.kind === 'event' ? 2 : x.kind === 'people' ? 3 : 4);
  out.sort((a, c) => rank(a) - rank(c) || (a.years ?? 99) - (c.years ?? 99) || a.id.localeCompare(c.id));
  return out.slice(0, b.signs.max);
}

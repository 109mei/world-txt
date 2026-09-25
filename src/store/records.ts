import { FAIL_TEXT, originalText, phraseName, type FailReason, type GameData } from '../core';
import type { IconKey, StageId } from '../data/schema';

/**
 * 観測記録（これまでの世界で見つけたもの）の写し。
 * 見つけたものは名前と「なぜ？」を、まだのものは「？？？」だけを見せる（中身は明かさない）。
 */

export interface RecordEntry {
  id: string;
  found: boolean;
  icon: IconKey;
  title: string;
  /** 見つけたときの様子（ニュースの文など） */
  text: string | null;
  why: string | null;
  /** まだ得ていないが、名前を見せてよいもの（実績の目標） */
  hint?: string;
}

/** 行ごとにまとめた読み取り（「定義」の見出しの下に、その行の読み取りを並べる） */
export interface RecordGroup {
  id: string;
  icon: IconKey;
  /** 行の元の文 */
  title: string;
  entries: RecordEntry[];
}

export type RecordSectionId = 'readings' | 'phrases' | 'twists' | 'events' | 'crises' | 'combos' | 'anomalies' | 'tags' | 'endings' | 'achievements';

export interface RecordSection {
  id: RecordSectionId;
  title: string;
  icon: IconKey;
  lead: string;
  groups: RecordGroup[];
  found: number;
  total: number;
}

export interface Records {
  sections: RecordSection[];
  found: number;
  total: number;
}

const ENDING_LABEL: Record<string, string> = {
  clear: 'MISSION COMPLETE',
  humanity: '人類の喪失',
  civilization: '文明の崩壊',
  coherence: '意味の崩壊',
  capacity: '容量の限界',
};

function section(id: RecordSectionId, title: string, icon: IconKey, lead: string, groups: RecordGroup[]): RecordSection {
  const all = groups.flatMap((g) => g.entries);
  return { id, title, icon, lead, groups, found: all.filter((e) => e.found).length, total: all.length };
}

export function buildRecords(data: GameData, discovered: readonly string[], achievements: readonly string[] = []): Records {
  const has = new Set(discovered);
  const got = new Set(achievements);
  const order = new Map(data.concepts.map((c, i) => [c.id, i]));
  const laws = [...data.laws].sort((a, b) => (order.get(a.concept) ?? 0) - (order.get(b.concept) ?? 0));

  const readings: RecordGroup[] = laws.map((law) => ({
    id: law.id,
    icon: data.conceptById.get(law.concept)?.icon ?? 'edit',
    title: originalText(law),
    entries: law.options
      .filter((o) => o.id !== law.initial)
      .map((o) => {
        const id = `r:${law.id}.${o.id}`;
        return { id, found: has.has(id), icon: data.conceptById.get(law.concept)?.icon ?? 'edit', title: o.label, text: null, why: null };
      }),
  }));

  const phrases: RecordGroup[] = [
    {
      id: 'phrases',
      icon: 'edit',
      title: '',
      entries: data.phrases.map((p) => {
        const id = `p:${p.id}`;
        return { id, found: has.has(id), icon: p.icon, title: phraseName(p.name), text: null, why: null };
      }),
    },
  ];

  const twists: RecordGroup[] = [
    {
      id: 'twists',
      icon: 'warning',
      title: '',
      entries: data.twists.map((t) => {
        const id = `t:${t.id}`;
        const first = t.news[0];
        return { id, found: has.has(id), icon: t.icon, title: t.name, text: first?.text ?? null, why: first?.why ?? null };
      }),
    },
  ];

  const events: RecordGroup[] = [
    {
      id: 'events',
      icon: 'news',
      title: '',
      entries: data.events.map((ev) => {
        const id = `e:${ev.id}`;
        return { id, found: has.has(id), icon: ev.icon, title: ev.text, text: null, why: ev.why ?? null };
      }),
    },
  ];

  // 危機（無限の世界）：受けた・弱めた・防いだ
  const crises: RecordGroup[] = data.crises.map((c) => ({
    id: c.id,
    icon: c.icon,
    title: c.name,
    entries: [
      { id: `k:${c.id}`, found: has.has(`k:${c.id}`), icon: c.icon, title: '受けた', text: c.strike, why: c.why },
      { id: `k:${c.id}.softened`, found: has.has(`k:${c.id}.softened`), icon: c.icon, title: '弱めた', text: c.softened, why: null },
      { id: `k:${c.id}.averted`, found: has.has(`k:${c.id}.averted`), icon: 'civilization' as IconKey, title: '防いだ', text: c.averted, why: null },
    ],
  }));

  const combos: RecordGroup[] = [
    {
      id: 'combos',
      icon: 'cycle',
      title: '',
      entries: data.combos.map((c) => {
        const id = `c:${c.id}`;
        return { id, found: has.has(id), icon: c.icon, title: c.name, text: c.text, why: c.why ?? null };
      }),
    },
  ];

  const anomalies: RecordGroup[] = [
    {
      id: 'anomalies',
      icon: 'anomaly',
      title: '',
      entries: data.anomalies.map((a) => {
        const id = `a:${a.id}`;
        return { id, found: has.has(id), icon: 'anomaly' as IconKey, title: a.text, text: null, why: a.why ?? null };
      }),
    },
  ];

  const tags: RecordGroup[] = [
    {
      id: 'tags',
      icon: 'civilization',
      title: '',
      entries: data.tags.map((t) => {
        const id = `g:${t.id}`;
        return { id, found: has.has(id), icon: t.icon, title: t.label, text: null, why: null };
      }),
    },
  ];

  const stages = [...data.stages].sort((a, b) => a.order - b.order);
  // 特別な結末（どのステージでも起こりうる）
  const special: RecordGroup = {
    id: 'special',
    icon: 'anomaly',
    title: '特別な結末',
    entries: data.endings.map((e) => {
      const id = `x:${e.id}`;
      return { id, found: has.has(id), icon: e.icon, title: `${e.kind === 'clear' ? '★ ' : ''}${e.title}`, text: e.text, why: e.why };
    }),
  };
  const endings: RecordGroup[] = stages.map((st) => ({
    id: st.id,
    icon: st.icon,
    title: st.title,
    // 無限の世界にクリアはない
    entries: ((st.endless ? ['humanity', 'civilization', 'coherence', 'capacity'] : ['clear', 'humanity', 'civilization', 'coherence', 'capacity']) as ('clear' | FailReason)[]).map((r) => {
      const id = `end:${st.id}.${r}`;
      return {
        id,
        found: has.has(id),
        icon: r === 'clear' ? ('civilization' as IconKey) : ('warning' as IconKey),
        title: ENDING_LABEL[r]!,
        text: r === 'clear' ? `${st.goalYears}年を生き延びた` : FAIL_TEXT[r],
        why: null,
      };
    }),
  }));

  const sections = [
    section('readings', '世界の読み取り', 'edit', '書き換えた文章を、世界がどう読み取ったか。行ごとに、まだ見ぬ読み取りが眠っている。', readings),
    section('phrases', '書き足した概念', 'anomaly', '書き足した一文から、世界に生まれたもの。', phrases),
    section('twists', '想定外の変化', 'warning', '書き換えのあとで、遅れてやって来たもの。', twists),
    section('events', '出来事', 'news', '世界で起きたこと。', events),
    section('crises', '危機', 'meteor', '無限の世界にやってくる危機。受けたか、弱めたか、防いだか。', crises),
    section('combos', '組み合わせ', 'cycle', '定義どうしが結びついて生まれた、新しい世界の姿。', combos),
    section('anomalies', '世界異常', 'coherence', '世界が揺らいだときに起きたこと。', anomalies),
    section('tags', '世界の姿', 'civilization', 'これまでに生まれた世界の特徴。', tags),
    section('endings', '結末', 'time', 'それぞれの世界の終わり方。特別な結末は、どの世界でも起こりうる。', [special, ...endings]),
    section('achievements', '実績', 'trophy', 'これまでの世界で成し遂げたこと。', [
      {
        id: 'achievements',
        icon: 'trophy',
        title: '',
        entries: data.achievements.map((a) => ({
          id: `ach:${a.id}`,
          found: got.has(a.id),
          icon: a.icon,
          title: a.name,
          text: a.text,
          why: null,
          hint: a.hidden ? undefined : `${a.name}：${a.text}`,
        })),
      },
    ]),
  ];
  return {
    sections,
    found: sections.reduce((n, s) => n + s.found, 0),
    total: sections.reduce((n, s) => n + s.total, 0),
  };
}

/** 観測記録の id から、短い名前とアイコン（新しい発見の知らせに使う） */
export function describeDiscovery(data: GameData, id: string): { icon: IconKey; text: string } | null {
  const [kind, rest = ''] = id.split(':');
  switch (kind) {
    case 'r': {
      const [lawId, optId] = rest.split('.');
      const law = data.lawById.get(lawId ?? '');
      const opt = data.optionOf.get(lawId ?? '')?.get(optId ?? '');
      if (!law || !opt) return null;
      return { icon: data.conceptById.get(law.concept)?.icon ?? 'edit', text: `読み取り「${opt.label}」` };
    }
    case 'p': {
      const p = data.phraseById.get(rest);
      return p ? { icon: p.icon, text: `概念「${phraseName(p.name)}」` } : null;
    }
    case 't': {
      const t = data.twistById.get(rest);
      return t ? { icon: t.icon, text: `想定外の変化「${t.name}」` } : null;
    }
    case 'e': {
      const ev = data.events.find((e) => e.id === rest);
      return ev ? { icon: ev.icon, text: `出来事「${ev.text}」` } : null;
    }
    case 'c': {
      const c = data.comboById.get(rest);
      return c ? { icon: c.icon, text: `組み合わせ「${c.name}」` } : null;
    }
    case 'a': {
      const a = data.anomalies.find((x) => x.id === rest);
      return a ? { icon: 'anomaly', text: `世界異常「${a.text.split('：')[0]}」` } : null;
    }
    case 'g': {
      const t = data.tags.find((x) => x.id === rest);
      return t ? { icon: t.icon, text: `世界の姿「${t.label}」` } : null;
    }
    case 'k': {
      const [crisisId, how] = rest.split('.');
      const c = data.crisisById.get(crisisId ?? '');
      if (!c) return null;
      return { icon: c.icon, text: `危機「${c.name}」を${how === 'averted' ? '防いだ' : how === 'softened' ? '弱めた' : '受けた'}` };
    }
    case 'x': {
      const e = data.endingById.get(rest);
      return e ? { icon: e.icon, text: `結末「${e.title}」` } : null;
    }
    case 'ach': {
      const a = data.achievements.find((x) => x.id === rest);
      return a ? { icon: 'trophy', text: `実績「${a.name}」` } : null;
    }
    case 'end': {
      const [stageId, r] = rest.split('.');
      const st = data.stageById.get(stageId as StageId);
      return st && r ? { icon: r === 'clear' ? 'civilization' : 'warning', text: `結末「${st.title}：${ENDING_LABEL[r] ?? r}」` } : null;
    }
    default:
      return null;
  }
}

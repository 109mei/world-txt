import { gameData } from '../../data';
import type { IndicatorId } from '../../data/schema';
import { closeSheet, getRuntime, openEdit, useGame } from '../../store/game';
import { explainIndicator, indicatorMeter, peopleView, relatedLaws } from '../../store/view';
import { Icon, TrendArrow } from '../icons';
import { LawText, Meter, Sheet } from '../parts';

/** 慣れ：暮らしの水準と、慣れた水準の折れ線2本（名前は線の端に直接書く。凡例と横の目盛りは使わない） */
function HabitLines({ living, ref, word, tone }: { living: number[]; ref: number[]; word: string; tone: string }) {
  const n = Math.min(living.length, ref.length, 20);
  if (n < 2) return <span className={`p-word tone-${tone}`}>{word}</span>;
  const a = living.slice(-n);
  const b = ref.slice(-n);
  const lo = Math.min(...a, ...b);
  const hi = Math.max(...a, ...b);
  const W = 240;
  const H = 56;
  const x = (i: number) => 4 + (i / (n - 1)) * (W - 90);
  const y = (v: number) => 6 + (1 - (v - lo) / Math.max(1e-6, hi - lo)) * (H - 12);
  const line = (vs: number[]) => vs.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  return (
    <svg className="habit-lines" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`慣れ：${word}`} data-testid="habit-lines">
      <path d={line(b)} className="habit-ref" fill="none" strokeWidth={1.5} />
      <path d={line(a)} className="habit-living" fill="none" strokeWidth={1.5} />
      <text x={x(n - 1) + 6} y={y(a[n - 1]!) + 4} className="habit-label habit-living-label">
        暮らし
      </text>
      <text x={x(n - 1) + 6} y={y(b[n - 1]!) + 4} className="habit-label">
        慣れた水準
      </text>
    </svg>
  );
}

/**
 * 命の柱の中身：人々の心（信頼・先行きの不安・慣れ・考え方の広がり）を、言葉と棒と線で見せる。
 * まだ紹介していない考えは出さない（known：わかった世界の決まりの id）
 */
export function PeoplePanel({ known }: { known: Set<string> }) {
  const g = getRuntime().state;
  if (!g) return null;
  if (!['trust', 'hoarding', 'habituation', 'spread'].some((id) => known.has(id))) return null;
  const v = peopleView(g, gameData);
  const w = gameData.indicators.people.view;
  const bar = (pos: number, tone: string, line?: number, label?: string) => (
    <span className="p-bar" role="presentation">
      <span className={`p-fill tone-bg-${tone}`} style={{ width: `${Math.round(pos * 100)}%` }} />
      {line !== undefined && <span className="p-line" style={{ left: `${Math.round(line * 100)}%` }} aria-label={label} />}
    </span>
  );
  return (
    <div className="people" data-testid="people">
      <div className="mini-label">{w.title}</div>
      {known.has('trust') && (
        <div className="p-row">
          <span className="p-name">{w.trust.name}</span>
          {bar(v.trust.pos, v.trust.tone)}
          <span className={`p-word tone-${v.trust.tone}`}>{v.trust.word}</span>
        </div>
      )}
      {known.has('hoarding') && (
        <div className="p-row">
          <span className="p-name">{w.anxiety.name}</span>
          {bar(v.anxiety.pos, v.anxiety.tone, v.anxiety.line, w.anxiety.line)}
          <span className={`p-word tone-${v.anxiety.tone}`}>{v.anxiety.word}</span>
        </div>
      )}
      {known.has('habituation') && (
        <>
          <div className="p-row p-row-habit">
            <span className="p-name">{w.habit.name}</span>
            <span className={`p-word tone-${v.habit.tone}`}>{v.habit.word}</span>
          </div>
          <HabitLines living={g.trace.living} ref={g.trace.ref} word={v.habit.word} tone={v.habit.tone} />
        </>
      )}
      {known.has('spread') && (
        <>
          <div className="p-sub">{w.spread.name}</div>
          {v.spread.length === 0 ? (
            <p className="dim small">{w.spread.none}</p>
          ) : (
            v.spread.map((s) => (
              <div key={s.id} className="p-row">
                <span className="p-name">{s.name}</span>
                {bar(s.pos, 'ink', v.tipping, w.spread.line)}
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}

/** つながりの名前（状態の項目か概念の名前。どちらにもないものだけ、ここで名前を持つ） */
const OTHER_NAME: Record<string, string> = { population: '人口', pathogen: '病原体', time: '時間' };
function relatedName(key: string): string {
  const items = gameData.indicators.items as Record<string, { label: string } | undefined>;
  return items[key]?.label ?? gameData.conceptById.get(key)?.name ?? OTHER_NAME[key] ?? '';
}

/** 項目を詳しく見る：メーター・主な原因・つながり・関係する法則 */
export function IndicatorSheet({ id }: { id: IndicatorId }) {
  const view = useGame((s) => s.view);
  const g = getRuntime().state;
  if (!view || !g) return null;
  const def = gameData.indicators.items[id];
  const it = view.indicators.find((x) => x.id === id)!;
  const causes = explainIndicator(g, gameData, id);
  const related = new Set(relatedLaws(g, gameData, id));
  const lines = view.laws.filter((l) => related.has(l.id));
  const ends: [string, string] = def.ends;

  return (
    <Sheet
      title={
        <>
          <Icon name={def.icon} size={17} /> {def.label}
        </>
      }
      onClose={closeSheet}
      testId="indicator-sheet"
    >
      <div className="ind-big">
        <span className={`tone-${it.tone}`}>{it.word}</span> <TrendArrow trend={it.trend} />
      </div>
      <Meter ends={ends} pos={indicatorMeter(g, id)} word={it.word} tone={it.tone} />


      <div className="mini-label">主な原因</div>
      {causes.length === 0 ? (
        <p className="dim small">大きな問題は見当たらない</p>
      ) : (
        <ul className="causes" data-testid="causes">
          {causes.map((c, i) => (
            <li key={i} className={c.good ? 'good' : 'bad'}>
              <Icon name={c.icon} size={15} /> {c.text}
            </li>
          ))}
        </ul>
      )}

      <div className="mini-label">つながり</div>
      <div className="tree">
        <div className="tree-root">
          <Icon name={def.icon} size={15} /> {def.label}
        </div>
        {/* 枝は線で描き、アイコンには名前を添える */}
        <ul className="tree-list">
          {def.related.map((r) => (
            <li key={r} className="tree-branch">
              <Icon name={r} size={14} /> <span>{relatedName(r)}</span>
            </li>
          ))}
        </ul>
      </div>

      {lines.length > 0 && (
        <>
          <div className="mini-label">この項目に関わる法則</div>
          <div className="related">
            {lines.map((l) => (
              <button key={l.id} className={`line line-${l.state}`} onClick={() => openEdit({ kind: l.kind, id: l.id })}>
                <span className="ln">{String(l.no).padStart(2, '0')}</span>
                <LawText line={l} />
              </button>
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}

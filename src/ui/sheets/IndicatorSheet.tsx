import { gameData } from '../../data';
import type { IndicatorId } from '../../data/schema';
import { closeSheet, getRuntime, openEdit, useGame } from '../../store/game';
import { explainIndicator, indicatorMeter, relatedLaws } from '../../store/view';
import { Icon, TrendArrow } from '../icons';
import { LawText, Meter, Sheet } from '../parts';

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
        <p className="dim small">大きな問題は見当たらない。</p>
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
        {def.related.map((r, i) => (
          <div key={r} className="tree-branch">
            <span className="tree-line">{i === def.related.length - 1 ? '└' : '├'}</span>
            <Icon name={r} size={14} />
          </div>
        ))}
      </div>

      {lines.length > 0 && (
        <>
          <div className="mini-label">この項目に関わる世界の定義</div>
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

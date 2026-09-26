import { useMemo } from 'react';
import { ruleKnown } from '../../core';
import { gameData } from '../../data';
import type { LimitView } from '../../store/view';
import { closeSheet, openSheet, useGame } from '../../store/game';
import { journeyOf } from '../../store/journey';
import { Icon, TrendArrow } from '../icons';
import { LimitRow, Sheet } from '../parts';
import { PeoplePanel } from './IndicatorSheet';

/** 世界の終わりまでの線を押したら、その線の説明を開く（人口は人類の詳しい原因） */
function openLimit(id: LimitView['id']): void {
  if (id === 'pop') openSheet({ kind: 'indicator', id: 'humanity' });
  else openSheet({ kind: 'meta', which: id });
}

/** 世界の寿命：4つの終わりの線（人口・文明・世界整合性・世界容量）まで、あとどれぐらいか */
export function LifeSheet() {
  const view = useGame((s) => s.view);
  if (!view) return null;
  return (
    <Sheet title="世界の寿命" onClose={closeSheet} testId="life-sheet">
      <p className="dim small">いちばん近い線までの年が世界の寿命。線を越えると数年で世界が終わる。</p>
      <section className="limits" data-testid="limits" aria-label="世界の終わりまで">
        <div className="section-title">
          <Icon name="warning" size={14} /> 世界の終わりまで
        </div>
        {view.limits.map((l) => (
          <LimitRow key={l.id} limit={l} onClick={() => openLimit(l.id)} testId={l.id === 'capacity' || l.id === 'coherence' ? l.id : `limit-${l.id}`} />
        ))}
      </section>
    </Sheet>
  );
}

/** 柱の中身：柱に入る項目の状態の言葉と棒（押すと、その項目の詳しい原因）。命の柱には、紹介したあとで人々の心も出す */
export function PillarSheet({ id }: { id: string }) {
  const view = useGame((s) => s.view);
  const progress = useGame((s) => s.progress);
  // まだ紹介していない考え（信頼など）は、画面に出さない（すべて開いた状態で遊んでいれば、すべて出す）
  const allOpen = useGame((s) => s.everything);
  const known = useMemo(() => {
    const j = journeyOf(progress);
    return new Set(gameData.unlocks.rules.filter((r) => allOpen || ruleKnown(gameData, j, r)).map((r) => r.id));
  }, [progress, allOpen]);
  const p = view?.pillars.find((x) => x.id === id);
  if (!view || !p) return null;
  return (
    <Sheet
      title={
        <>
          <Icon name={p.icon} size={17} /> {p.name}
        </>
      }
      onClose={closeSheet}
      testId="pillar-sheet"
    >
      <div className="ind-big">
        <span className="dim">{p.text}</span>
        <span className={`tone-${p.tone}`}>{p.lowest.word}</span> <TrendArrow trend={p.trend} />
      </div>
      <ul className="pillar-items">
        {p.items.map((it) => (
          <li key={it.id}>
            <button className="pillar-item" onClick={() => openSheet({ kind: 'indicator', id: it.id })} data-testid={`ind-${it.id}`} data-word={it.word}>
              <span className={`ind-icon tone-${it.tone}`}>
                <Icon name={it.icon} size={16} />
              </span>
              <span className="ind-label">{it.label}</span>
              <b className={`ind-word tone-${it.tone}`}>{it.word}</b>
              <TrendArrow trend={it.trend} />
              <span className="ind-bar" aria-hidden>
                <span className={`ind-bar-fill tone-bg-${it.tone}`} style={{ width: `${it.pos * 100}%` }} />
                <span className="ind-bar-danger" style={{ left: `${it.danger * 100}%` }} />
              </span>
            </button>
          </li>
        ))}
      </ul>
      {id === 'life' && <PeoplePanel known={known} />}
    </Sheet>
  );
}

import { closeSheet, useGame } from '../../store/game';
import { Icon } from '../icons';
import { LimitRow, Meter, Sheet } from '../parts';

/** 世界容量・世界整合性・文明の説明（世界の終わりまでの線と、今どれぐらい近いか） */
export function MetaSheet({ which }: { which: 'capacity' | 'coherence' | 'civ' }) {
  const view = useGame((s) => s.view);
  if (!view) return null;
  const limit = view.limits.find((l) => l.id === which);
  const row = limit && (
    <div className="limits limits-sheet">
      <LimitRow limit={limit} testId="meta-limit" />
    </div>
  );
  if (which === 'capacity') {
    const c = view.capacity;
    return (
      <Sheet
        title={
          <>
            <Icon name="capacity" size={16} /> 使える文字数
          </>
        }
        onClose={closeSheet}
        testId="meta-sheet"
      >
        <Meter ends={c.ends} pos={c.pos} word={c.word} tone={c.tone} trend={c.trend} />
        <p className="meta-num">
          使用 <b>{c.used}</b> / 上限 <b>{c.max}</b>字
        </p>
        {row}
        <p className="body-text">
          世界は物質・生命・時間・社会を「法則」として覚えている。何らかの異常で覚えていられる文字数に限りがある。
          文章は長いほど多くの字を使い、新しい概念を書き足すとその概念の字数の分も使う。短く書き換えたり削除したりすると空きが増える。
        </p>
        <p className="body-text">上限を超えた状態が続くと世界は維持できなくなる。</p>
      </Sheet>
    );
  }
  if (which === 'civ') {
    return (
      <Sheet
        title={
          <>
            <Icon name="civilization" size={16} /> 文明
          </>
        }
        onClose={closeSheet}
        testId="meta-sheet"
      >
        <p className={`headline tone-${view.headline.tone}`}>「{view.headline.sentence}」</p>
        {row}
        <p className="body-text">文明は産業・物流・科学・社会・人類のようすを合わせたもの。どれかが大きく崩れると文明も傾く。</p>
        <p className="body-text">文明が終わりの線を割ったまま何年も続くと人類文明は崩壊する。線の上へ戻せば数えなおしになる。</p>
      </Sheet>
    );
  }
  const c = view.coherence;
  return (
    <Sheet
      title={
        <>
          <Icon name="coherence" size={16} /> 世界整合性
        </>
      }
      onClose={closeSheet}
      testId="meta-sheet"
    >
      <Meter ends={c.ends} pos={c.pos} word={c.word} tone={c.tone} trend={c.trend} />
      {row}
      <p className="body-text">無理のある書き換えほど、ほかの法則と食い違って世界が揺らぐ。揺らぎが大きくなると因果逆転・重複人物・存在消失などの世界異常が起きる。</p>
      <p className="body-text">元の文に戻せば揺らぎはゆっくり収まっていく。崩壊すると世界は意味を失う。</p>
    </Sheet>
  );
}

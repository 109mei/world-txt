import { closeSheet, useGame } from '../../store/game';
import { Icon } from '../icons';
import { Meter, Sheet } from '../parts';

/** 世界容量・世界整合性の説明 */
export function MetaSheet({ which }: { which: 'capacity' | 'coherence' }) {
  const view = useGame((s) => s.view);
  if (!view) return null;
  if (which === 'capacity') {
    const c = view.capacity;
    return (
      <Sheet
        title={
          <>
            <Icon name="capacity" size={16} /> 世界容量
          </>
        }
        onClose={closeSheet}
        testId="meta-sheet"
      >
        <Meter ends={c.ends} pos={c.pos} word={c.word} tone={c.tone} trend={c.trend} />
        <p className="meta-num">
          使用 <b>{c.used}</b> / 上限 <b>{c.max}</b>字
        </p>
        <p className="body-text">
          世界は、物質・生命・時間・社会を「定義」として覚えている。何らかの異常で、覚えていられる文字数に限りがある。
          文章は長いほど多くの字を使い、新しい概念を書き足すと、その重さの分も使う。短く書き換えたり削除したりすると、空きが増える。
        </p>
        <p className="body-text">上限を超えた状態が続くと、世界は維持できなくなる。</p>
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
      <p className="body-text">
        無理のある書き換えほど、ほかの法則と食い違い、世界が揺らぐ。揺らぎが大きくなると、因果逆転・重複人物・存在消失などの世界異常が起きる。
      </p>
      <p className="body-text">元の文に戻せば、揺らぎはゆっくり収まっていく。崩壊すると世界は意味を失う。</p>
    </Sheet>
  );
}

import { UPDATES } from '../../data/updates';
import { closeSheet, dismissUpdates, useGame } from '../../store/game';
import { Sheet } from '../parts';

/** お知らせの日付（2026-09-27 → 2026年9月27日） */
export function updateDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${y}年${m}月${d}日`;
}

/**
 * 更新のお知らせ：プッシュのたびに足したお知らせを、新しい順に並べる。まだ見ていなかったものに印をつける。
 * 閉じたら、すべて見たことにする（タイトルのお知らせも消える）
 */
export function UpdatesSheet() {
  const unseen = useGame((s) => s.unseenUpdates);
  const fresh = new Set(unseen.map((u) => u.id));
  const close = () => {
    dismissUpdates();
    closeSheet();
  };
  return (
    <Sheet title="更新のお知らせ" onClose={close} testId="updates-sheet">
      <div className="updates">
        {UPDATES.map((u) => (
          <section key={u.id} className={fresh.has(u.id) ? 'update update-new' : 'update'} data-testid="update">
            <div className="update-head">
              <span className="update-date">{updateDate(u.date)}</span>
              {fresh.has(u.id) && <span className="update-new-tag">新しいお知らせ</span>}
            </div>
            <h3 className="update-title">{u.title}</h3>
            <ul className="update-items">
              {u.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Sheet>
  );
}

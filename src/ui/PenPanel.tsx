import { gameData } from '../data';
import { penOf } from '../store/pen';
import { Icon } from './icons';

/**
 * 筆の位：救った世界の数で上がり、書き換えられる範囲（行の分野・書き足せる行の数・書ける物の重さ）が広がる。
 * いまの位と、次の位で広がるものを見せる
 */
export function PenPanel({ clears }: { clears: number }) {
  const pen = penOf(gameData, clears);
  const ranks = gameData.access.ranks;
  return (
    <section className="pen-panel" data-testid="pen-panel" data-rank={pen.rank}>
      <div className="pen-head">
        <span className="mini-label">筆の位</span>
        <b className="pen-title">
          <Icon name="edit" size={14} /> {pen.name}
        </b>
        {/* 位の段（塗られた段が、いまの位まで） */}
        <span className="pen-steps" aria-label={`${ranks.length}段のうち${pen.rank + 1}段目`}>
          {ranks.map((r, i) => (
            <span key={r.name} className={i <= pen.rank ? 'on' : undefined} />
          ))}
        </span>
      </div>
      {pen.free ? (
        <p className="pen-now">すべての行を自由に書き換えられる。書き足せる行にも書ける物にも限りはない。</p>
      ) : (
        <ul className="pen-now">
          <li>書き換えられる行：{pen.realms.map((r) => `「${r.name}」`).join('')}の行とその世界の危機に関わる行</li>
          <li>書き足せる行：{pen.margin === null ? '限りなし' : `${pen.margin}行まで`}</li>
          <li>書ける物：{pen.reach}まで</li>
        </ul>
      )}
      {pen.next && (
        <p className="pen-next" data-testid="pen-next">
          あと<b>{pen.next.left}</b>つの世界を救うと「{pen.next.name}」：{pen.next.gains.join('、')}
        </p>
      )}
    </section>
  );
}

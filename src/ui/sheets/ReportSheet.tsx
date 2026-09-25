import { Play } from 'lucide-react';
import { useEffect, type CSSProperties } from 'react';
import { gameData } from '../../data';
import type { IconKey, IndicatorId } from '../../data/schema';
import { advanceYears, closeSheet, showResult, useGame } from '../../store/game';
import { describeDiscovery } from '../../store/records';
import { populationText } from '../../store/view';
import { Icon, TrendArrow } from '../icons';
import { CauseLine, NewsLine, Sheet } from '../parts';
import { seChime, seInk, seTurn, seWarn } from '../se';
import { WorldScene } from '../WorldScene';

const META_LABEL = { capacity: '世界容量', coherence: '世界整合性' } as const;

/** 上から順に、少しずつ遅れて現れる（n 番目） */
function rise(n: number): CSSProperties {
  return { ['--i' as string]: n } as CSSProperties;
}

/**
 * 時間を進めた結果：いまの世界の情景（この年に現れたものがにじむ）→ 世界が書き換わった（書いた一文が効き始めた姿）→
 * 状態語の変化と動き → 危機 → 想定外の変化 → ニュース → 観測記録。
 * 下の「世界を見る」「▶ 次の1年」は、読み進めても隠れない
 */
export function ReportSheet() {
  const view = useGame((s) => s.view);
  const fresh = useGame((s) => s.fresh);
  const sceneFrom = useGame((s) => s.sceneFrom);
  const rep = view?.report;
  // 開いたときに一度だけ：書いた一文が効き始めたらペンの音、重大な出来事は低い音、観測記録に加わったものがあれば鈴
  useEffect(() => {
    if (!rep) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (rep.news.some((n) => n.onset)) timers.push(setTimeout(seInk, 180));
    if (rep.news.some((n) => n.severity === 'critical')) seWarn();
    if (fresh.some((id) => !id.startsWith('g:'))) timers.push(setTimeout(seChime, 650));
    return () => timers.forEach(clearTimeout);
  }, []);
  if (!view || !rep) return null;
  const ind = gameData.indicators.items;
  // 世界の姿（タグ）は数が多いので、知らせは出来事・変化・結末などに絞る
  const found = fresh
    .filter((id) => !id.startsWith('g:'))
    .map((id) => ({ id, ...describeDiscovery(gameData, id) }))
    .filter((f): f is { id: string; icon: IconKey; text: string } => typeof f.text === 'string');
  // 書いた一文が効き始めた（世界がそのとおりに変わった）知らせは、いちばん先に見せる
  const onset = rep.news.filter((n) => n.onset);
  const rest = rep.news.filter((n) => !n.onset);
  // 危機（無限の世界）は、知らせ・襲来・防いだことをまとめて先に見せる
  const crises = rest.filter((n) => n.category === 'CRISIS');
  const surprises = rest.filter((n) => n.surprise && n.category !== 'CRISIS');
  const others = rest.filter((n) => !n.surprise && n.category !== 'CRISIS');
  const ended = view.status !== 'playing';
  const years = rep.to - rep.from;
  const moves = rep.moves ?? [];
  const popFrom = rep.pop ? populationText(rep.pop.from) : null;
  const popTo = rep.pop ? populationText(rep.pop.to) : null;
  const popMoved = popFrom !== popTo;
  const nothing = rep.changes.length === 0 && moves.length === 0 && onset.length === 0 && !popMoved;
  let n = 0;

  const footer = ended ? (
    <button className="btn btn-primary wide" onClick={showResult} data-testid="report-ok">
      世界の記録を見る
    </button>
  ) : (
    <div className="report-actions">
      <button className="btn" onClick={closeSheet} data-testid="report-ok">
        世界を見る
      </button>
      {/* 読み終えたら、そのまま次の1年へ（1回で1年） */}
      <button
        className="btn btn-primary"
        onClick={() => {
          seTurn();
          closeSheet();
          advanceYears(1);
        }}
        data-testid="report-next"
      >
        <Play size={16} strokeWidth={1.6} /> 次の1年
      </button>
    </div>
  );

  return (
    <Sheet
      title={
        <>
          ▶ {years}年経過　
          <span className="dim small">
            YEAR {rep.from} → {rep.to}
          </span>
        </>
      }
      onClose={ended ? showResult : closeSheet}
      testId="report-sheet"
      footer={footer}
    >
      <div className="report">
        {/* いまの世界の姿。去年の絵をインクが塗り替えていき、新しく描かれたものはそのものらしく現れ、なくなったものは消えていく */}
        <div className="rise" style={rise(n++)}>
          <WorldScene scene={view.scene} from={sceneFrom} compact testId="report-scene" />
        </div>

        {rep.interrupted && (
          <p className="interrupt rise" style={rise(n++)} data-testid="interrupted">
            <Icon name="warning" size={15} /> 重大な出来事が起きたため、時間を止めた
          </p>
        )}
        {ended && (
          <p className={`${view.status === 'cleared' ? 'end-banner good' : 'end-banner bad'} rise`} style={rise(n++)} data-testid="end-banner">
            {view.ending ? `「${view.ending.title}」${view.ending.text}` : view.status === 'cleared' ? `MISSION COMPLETE — 人類文明は${view.year}年を生き延びた` : view.failText}
          </p>
        )}

        {onset.length > 0 && (
          <section className="onset rise" style={rise(n++)} data-testid="onset">
            <div className="section-title">
              <Icon name="edit" size={14} /> 世界が書き換わった
            </div>
            {onset.map((item, i) => (
              <div key={i} className="onset-item" style={rise(i)}>
                <div className="onset-text">
                  <Icon name={item.icon} size={16} />
                  <span className="ink-write">{item.text}</span>
                </div>
                <CauseLine cause={item.cause} />
              </div>
            ))}
          </section>
        )}

        {rep.changes.length > 0 && (
          <ul className="changes rise" style={rise(n++)} data-testid="changes">
            {rep.changes.map((c) => {
              const isMeta = c.id === 'capacity' || c.id === 'coherence';
              const icon = isMeta ? (c.id as 'capacity' | 'coherence') : ind[c.id as IndicatorId].icon;
              const label = isMeta ? META_LABEL[c.id as 'capacity' | 'coherence'] : ind[c.id as IndicatorId].label;
              return (
                <li key={c.id} className={c.better ? 'chg good' : 'chg bad'}>
                  <Icon name={icon} size={16} />
                  <span className="chg-label">{label}</span>
                  <span className="chg-from">{c.from}</span>
                  <span className="chg-arrow">→</span>
                  <span className="chg-to">{c.to}</span>
                  <TrendArrow trend={c.trend} />
                </li>
              );
            })}
          </ul>
        )}
        {(moves.length > 0 || popMoved) && (
          <div className="moves rise" style={rise(n++)} data-testid="moves">
            {popMoved && (
              <span className={rep.pop!.to >= rep.pop!.from ? 'move good' : 'move bad'}>
                <Icon name="population" size={13} /> 人口 {popFrom} → <b>{popTo}</b>
              </span>
            )}
            {moves.map((mv) => (
              <span key={mv.id} className={mv.better ? 'move good' : 'move bad'}>
                <Icon name={ind[mv.id].icon} size={13} /> {ind[mv.id].label}
                <TrendArrow trend={mv.trend} />
              </span>
            ))}
          </div>
        )}
        {nothing && (
          <p className="dim small rise" style={rise(n++)}>
            目に見える変化はなかった。
          </p>
        )}

        {crises.length > 0 && (
          <section className="surprises crisis-news rise" style={rise(n++)} data-testid="crisis-news">
            <div className="section-title">
              <Icon name="meteor" size={14} /> 危機
            </div>
            {crises.map((item, i) => (
              <NewsLine key={i} item={item} showYear />
            ))}
          </section>
        )}

        {surprises.length > 0 && (
          <section className="surprises rise" style={rise(n++)} data-testid="surprises">
            <div className="section-title">
              <Icon name="warning" size={14} /> 想定外の変化
            </div>
            {surprises.map((item, i) => (
              <NewsLine key={i} item={item} showYear />
            ))}
          </section>
        )}

        {others.length > 0 && (
          <section className="world-news rise" style={rise(n++)}>
            <div className="section-title">
              <Icon name="news" size={14} /> WORLD NEWS
            </div>
            {others.map((item, i) => (
              <NewsLine key={i} item={item} showYear />
            ))}
          </section>
        )}

        {found.length > 0 && (
          <section className="found rise" style={rise(n++)} data-testid="fresh">
            <div className="section-title">
              <Icon name="record" size={14} /> 観測記録に加わったもの
            </div>
            <ul className="found-list">
              {found.map((f) => (
                <li key={f.id}>
                  <span className="found-star">★</span>
                  <Icon name={f.icon} size={14} /> {f.text}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Sheet>
  );
}

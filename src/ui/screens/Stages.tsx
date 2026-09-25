import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { gameData } from '../../data';
import { continueGame, goTitle, openBriefing, openRecords, playingWorld, stageLock, useGame } from '../../store/game';
import { Icon } from '../icons';
import { PenPanel } from '../PenPanel';

export function Stages() {
  const progress = useGame((s) => s.progress);
  // 世界は1つだけ。遊んでいる世界があれば、それを見せる
  useGame((s) => s.hasGame);
  const now = playingWorld();
  const stages = [...gameData.stages].sort((a, b) => a.order - b.order);
  return (
    <div className="page" data-testid="stages">
      <header className="page-head">
        <button className="icon-btn" onClick={goTitle} aria-label="タイトルへ">
          <ChevronLeft size={22} strokeWidth={1.6} />
        </button>
        <h2>世界を選ぶ</h2>
        <button className="records-link" onClick={() => openRecords('stages')} data-testid="open-records">
          <Icon name="record" size={15} /> 観測記録
        </button>
      </header>
      {now ? (
        <div className="ongoing" data-testid="ongoing">
          <div className="ongoing-head">
            <span className="mini-label">進行中の世界</span>
            <b>{now.title}</b>
            <span className="dim">YEAR {now.year}</span>
          </div>
          <p className="dim small">開ける世界は1つだけ。別の世界を開くと、この世界は放棄される。</p>
          <button className="btn btn-primary wide" onClick={continueGame} data-testid="ongoing-continue">
            この世界をつづける
          </button>
        </div>
      ) : (
        <p className="lead">どの世界を救いますか。</p>
      )}
      <PenPanel clears={progress.cleared.length} />
      <div className="stage-list">
        {stages.map((st, i) => {
          const best = progress.best[st.id];
          const cleared = progress.cleared.includes(st.id);
          const lock = stageLock(st.id);
          return (
            <button
              key={st.id}
              className={['stage-card', lock > 0 ? 'locked' : '', st.endless ? 'endless' : ''].filter(Boolean).join(' ')}
              onClick={() => openBriefing(st.id)}
              data-testid={`stage-${st.id}`}
              data-locked={lock > 0}
              data-ongoing={now?.stageId === st.id}
            >
              <div className="stage-no">
                {st.endless ? '∞' : `STAGE ${i + 1}`}
                {now?.stageId === st.id && <span className="stage-ongoing">進行中</span>}
              </div>
              <div className="stage-main">
                <span className="stage-icon">
                  <Icon name={st.icon} size={26} />
                </span>
                <div>
                  <div className="stage-title">{st.title}</div>
                  <div className="stage-mission">{lock > 0 ? '―――' : st.mission}</div>
                </div>
                {lock > 0 ? <Lock size={18} strokeWidth={1.4} className="stage-go" /> : <ChevronRight size={20} strokeWidth={1.4} className="stage-go" />}
              </div>
              <div className="stage-foot">
                <span className="stage-focus">
                  {st.focus.map((f) => (
                    <Icon key={f} name={gameData.indicators.items[f].icon} size={14} />
                  ))}
                </span>
                {lock > 0 ? (
                  <span className="stage-lock">あと{lock}つの世界を救うと開く</span>
                ) : st.endless ? (
                  <span className="stage-state">{best ? `最長 ${best.years}年` : '未挑戦'}</span>
                ) : cleared ? (
                  <span className="stage-state good">CLEAR{best?.fewest !== undefined && <span className="stage-fewest">最少 {best.fewest}手</span>}</span>
                ) : best ? (
                  <span className="stage-state">最高 {best.years}年</span>
                ) : (
                  <span className="stage-state dim">未挑戦</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

import { ChevronLeft } from 'lucide-react';
import { gameData } from '../../data';
import { useState } from 'react';
import { continueGame, getRuntime, goStages, playingWorld, startStage, useGame } from '../../store/game';
import { rankTitle } from '../../store/ranking';
import { Icon } from '../icons';

export function Briefing() {
  const id = useGame((s) => s.briefing);
  const runs = useGame((s) => s.progress.endless);
  const ranking = useGame((s) => s.progress.ranking);
  useGame((s) => s.hasGame);
  // 開ける世界は1つだけ：遊んでいる世界があれば、放棄してよいかを2度押しで確かめる
  const [sure, setSure] = useState<'open' | 'daily' | null>(null);
  const stage = id ? gameData.stageById.get(id) : null;
  if (!stage) return null;
  const now = playingWorld();
  const open = (which: 'open' | 'daily') => {
    if (now && sure !== which) {
      setSure(which);
      return;
    }
    startStage(stage.id, which === 'daily');
  };
  const b = gameData.balance;
  const today = stage.endless ? getRuntime().today() : '';
  const best = runs.reduce((m, r) => Math.max(m, r.years), 0);
  const bestToday = runs.filter((r) => r.daily === today).reduce((m, r) => Math.max(m, r.years), 0);
  const [, mm, dd] = today.split('-');
  return (
    <div className="page briefing" data-testid="briefing">
      <header className="page-head">
        <button className="icon-btn" onClick={goStages} aria-label="戻る">
          <ChevronLeft size={22} strokeWidth={1.6} />
        </button>
        <h2>
          <Icon name={stage.icon} size={20} /> {stage.title}
        </h2>
      </header>

      <section className="mission">
        <div className="mission-label">MISSION</div>
        <p className="mission-text">「{stage.mission}」</p>
      </section>

      <section className="brief-lines">
        {stage.briefing.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </section>

      {stage.endless ? (
        <section className="conditions">
          <div className="cond-block">
            <div className="cond-title">記録</div>
            <ul>
              <li>
                <Icon name="infinity" size={15} /> 文明が滅ぶまでの年数を競う
              </li>
              <li>
                <Icon name="time" size={15} /> これまでの最長 <b data-testid="endless-best">{best > 0 ? `${best}年` : '―'}</b>
              </li>
              <li>
                <Icon name="record" size={15} /> 今日の世界の最長 <b>{bestToday > 0 ? `${bestToday}年` : '―'}</b>
              </li>
            </ul>
          </div>
          <div className="cond-block fail">
            <div className="cond-title">滅び</div>
            <ul>
              <li>人口が{stage.fail.pop}億人を下回る</li>
              <li>文明の崩壊が{b.civ.graceYears}年続く</li>
              <li>世界整合性が崩壊する</li>
              <li>世界容量の限界突破が{b.capacity.graceYears}年続く</li>
            </ul>
          </div>
        </section>
      ) : (
      <section className="conditions">
        <div className="cond-block">
          <div className="cond-title">CLEAR 条件</div>
          <ul>
            <li>
              <Icon name="humanity" size={15} /> 人類が存続（人口{stage.fail.pop}億人以上）
            </li>
            <li>
              <Icon name="civilization" size={15} /> 文明が維持されている
            </li>
            <li>
              <Icon name="coherence" size={15} /> 世界が崩壊していない
            </li>
            <li>
              <Icon name="time" size={15} /> {stage.goalYears}年に到達
            </li>
            {stage.loop && (
              <li>
                <Icon name="cycle" size={15} /> くり返しを抜け出す（{stage.loop.years}年目を越える）
              </li>
            )}
          </ul>
        </div>
        <div className="cond-block fail">
          <div className="cond-title">失敗</div>
          <ul>
            <li>人口が{stage.fail.pop}億人を下回る</li>
            <li>文明の崩壊が{b.civ.graceYears}年続く</li>
            <li>世界整合性が崩壊する</li>
            <li>世界容量の限界突破が{b.capacity.graceYears}年続く</li>
          </ul>
        </div>
      </section>
      )}

      {stage.loop && (
        <section className="howto">
          <div className="cond-title">くり返し</div>
          <p className="small">
            {stage.loop.rule}
            巻き戻るのは世界の様子だけで、書いた文章は残る。同じ書き方なら、同じ出来事がくり返す。巻き戻るたびに世界容量が{stage.loop.wear}字減り、書換の力が{stage.loop.ink}つ戻る。
          </p>
        </section>
      )}

      {stage.endless && (
        <section className="ranking" data-testid="ranking">
          <div className="cond-title">
            <Icon name="trophy" size={14} /> 記録簿（この端末）
          </div>
          {ranking.length === 0 ? (
            <p className="dim small">まだ記録がない。文明が長く続くほど、上の順位に名が残る。</p>
          ) : (
            <ol className="rank-list">
              {ranking.map((r, i) => (
                <li key={r.at + ':' + i} className={i === 0 ? 'rank-row rank-top' : 'rank-row'} data-testid="rank-row">
                  <span className="rank-no">{i + 1}</span>
                  <span className="rank-years">
                    <b>{r.years}</b>年
                  </span>
                  <span className="rank-main">
                    <span className="rank-title">{rankTitle(gameData, r.years)}</span>
                    <span className="rank-world dim small">
                      「{r.title}」{r.daily ? `　${r.daily} の世界` : ''}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {stage.endless && (
        <section className="howto">
          <div className="cond-title">危機</div>
          <p className="small">
            {'隕石・疫病・噴火・戦争……。危機は知らせが届いてから、数年後に世界を襲う。知らせを読み、襲う年までに世界の定義を書き換えれば、防げることがある。危機は年とともに強くなり、間隔は短くなる。'}
          </p>
        </section>
      )}

      <section className="howto">
        <div className="cond-title">遊び方</div>
        <ol>
          <li>世界の兆候を読む（状態語と ⇈↗→↘⇊）</li>
          <li>「定義」で世界の文章を書き換える（書換の力 ✎ を使う）</li>
          <li>時間を進めて、何が起きたかを見る</li>
        </ol>
        <p className="dim small">
          書換の力は最初に{stage.edits.start}回。{stage.edits.every}年ごとに1回戻る（最大{stage.edits.max}）。
          {stage.capacityDecay > 0 && ` この世界では、世界容量が毎年少しずつ縮む。`}
        </p>
      </section>

      {now && (
        <div className="abandon-note" data-testid="abandon-note">
          <p>
            いま進んでいる世界（<b>{now.title}</b>・YEAR {now.year}）がある。開ける世界は1つだけ。
            {sure ? '本当に放棄するなら、もう一度押す。' : '新しい世界を開くと、この世界は放棄される。'}
          </p>
          {now.stageId === stage.id && (
            <button className="btn wide" onClick={continueGame} data-testid="briefing-continue">
              進行中の世界をつづける
            </button>
          )}
        </div>
      )}
      <button className={sure === 'open' ? 'btn btn-primary wide danger' : 'btn btn-primary wide'} onClick={() => open('open')} data-testid="open-world">
        {sure === 'open' ? '前の世界を放棄して開く' : '世界を開く'}
      </button>
      {stage.endless && (
        <button className={sure === 'daily' ? 'btn wide daily-btn danger' : 'btn wide daily-btn'} onClick={() => open('daily')} data-testid="open-daily">
          <Icon name="record" size={15} /> 今日の世界（{Number(mm)}月{Number(dd)}日）
          <span className="dim small">　同じ日なら、誰でも同じ世界</span>
        </button>
      )}
    </div>
  );
}

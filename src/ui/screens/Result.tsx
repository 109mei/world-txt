import { Copy, History, ImageDown, RotateCcw, Share2 } from 'lucide-react';
import { gameData } from '../../data';
import { getRuntime, goStages, openRecords, readHistory, retryStage, showToast, useGame } from '../../store/game';
import { civLevel } from '../../core';
import { chronicle, populationText } from '../../store/view';
import { rankOf, rankTitle } from '../../store/ranking';
import { Curve } from '../Curve';
import { EMOJI, Icon } from '../icons';
import { CauseLine } from '../parts';
import { renderCard } from '../shareImage';

/** 終わった世界のカード（SNSで共有できる形） */
export function Result() {
  const view = useGame((s) => s.view);
  const runs = useGame((s) => s.progress.endless);
  const ranking = useGame((s) => s.progress.ranking);
  const g = getRuntime().state;
  if (!view || !g) return null;
  const sum = view.summary;
  const stage = gameData.stageById.get(g.stageId)!;
  const cleared = view.status === 'cleared';
  const endless = stage.endless;
  // 無限の世界：これまでの最長（今回を除く）と比べる
  const others = runs.slice(1);
  const prevBest = others.reduce((m, r) => Math.max(m, r.years), 0);
  const newBest = endless && sum.years > prevBest;
  // 記録簿の順位（今回の記録は、いちばん新しい記録と同じ時刻で見分ける）と、年数に応じた称号
  const rank = endless && runs[0] ? rankOf(ranking, runs[0].at) : null;
  const title = endless ? rankTitle(gameData, sum.years) : '';
  const steps = chronicle(g);
  const editYears = [...new Set(g.history.filter((h) => h.kind === 'edit').map((h) => h.year))];

  const shareText = [
    `WORLD.txt #${sum.number}`,
    `「${sum.title}」`,
    endless
      ? `∞ ${stage.title}${g.daily ? `（${g.daily} の世界）` : ''} — 人類文明は${sum.years}年続いた`
      : `${EMOJI[stage.icon]} ${stage.title} — ${cleared ? 'CLEAR' : 'COLLAPSE'}（${sum.years}年存続）`,
    endless ? `称号「${title}」${rank ? `・記録簿 第${rank}位` : ''}` : '',
    endless ? `危機 防いだ${view.crises.averted}・弱めた${view.crises.softened}・受けた${view.crises.struck}` : '',
    view.ending ? `結末「${view.ending.title}」` : '',
    sum.tags
      .slice(0, 6)
      .map((t) => `${EMOJI[t.icon]}${t.label}`)
      .join(' '),
    sum.missing.length > 0 ? sum.missing.map((m) => `×${m}`).join(' ') : '',
    '#WORLDtxt',
  ]
    .filter(Boolean)
    .join('\n');

  const cardImage = async (): Promise<File> => {
    const firstEdit = g.history.find((h) => h.kind === 'edit');
    const blob = await renderCard({
      number: sum.number,
      stage: stage.title,
      cleared,
      endless,
      title: sum.title,
      years: sum.years,
      tags: sum.tags.map((t) => t.label),
      missing: sum.missing,
      edit: firstEdit?.text ?? null,
      failText: view.ending ? `結末「${view.ending.title}」` : cleared ? null : view.failText,
    });
    return new File([blob], `world-${sum.number}.png`, { type: 'image/png' });
  };

  /** 画像（使える端末なら）と文章で共有する。共有できない環境では文章をコピーする */
  const share = async () => {
    try {
      if (navigator.share) {
        let file: File | null = null;
        try {
          file = await cardImage();
        } catch {
          file = null;
        }
        if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: shareText });
        else await navigator.share({ text: shareText });
        return;
      }
      await navigator.clipboard.writeText(shareText);
      showToast('共有用のテキストをコピーした');
    } catch (e) {
      // 共有の画面を閉じただけのときは何も言わない
      if ((e as Error).name !== 'AbortError') showToast('共有できなかった');
    }
  };

  /** カードを画像として保存する */
  const saveImage = async () => {
    try {
      const file = await cardImage();
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      showToast('世界の画像を保存した');
    } catch {
      showToast('画像を作れなかった');
    }
  };

  return (
    <div className="page result" data-testid="result">
      <div className={cleared ? 'result-status good' : 'result-status bad'}>{cleared ? 'MISSION COMPLETE' : endless ? 'THE END OF THE WORLD' : 'WORLD COLLAPSED'}</div>
      {view.ending && (
        <section className={`ending ending-${view.ending.kind}`} data-testid="ending">
          <div className="ending-label">結末</div>
          <h3 className="ending-title">
            <Icon name={view.ending.icon} size={18} /> {view.ending.title}
          </h3>
          <p className="ending-text">{view.ending.text}</p>
          <p className="why">なぜ？ {view.ending.why}</p>
        </section>
      )}
      <article className="world-card" data-testid="world-card">
        <div className="wc-head">
          <span className="wc-no">WORLD #{sum.number}</span>
          <span className="wc-stage">
            <Icon name={stage.icon} size={13} /> {stage.title}
          </span>
        </div>
        <h2 className="wc-title">「{sum.title}」</h2>
        <div className="wc-years" data-testid="wc-years">
          {endless ? '人類文明は' : '文明存続'} <b>{sum.years}</b>年{endless && '続いた'}
        </div>
        {endless && (
          <p className="wc-record" data-testid="endless-record">
            <span className="rank-badge" data-testid="rank">
              称号「{title}」{rank ? `　記録簿 第${rank}位` : '　記録簿の外'}
            </span>
            <br />
            {newBest ? '★ これまでの最長を更新' : `これまでの最長 ${prevBest}年`}
            {g.daily && <span className="dim">　・ {g.daily} の世界</span>}
            <br />
            <span className="dim">
              危機 防いだ{view.crises.averted}・弱めた{view.crises.softened}・受けた{view.crises.struck}
            </span>
          </p>
        )}
        {!cleared && view.failText && !view.ending && <p className="wc-fail">{view.failText}</p>}
        {sum.tags.length > 0 && (
          <ul className="wc-tags">
            {sum.tags.slice(0, 8).map((t) => (
              <li key={t.id}>
                <Icon name={t.icon} size={14} /> {t.label}
              </li>
            ))}
          </ul>
        )}
        {sum.missing.length > 0 && (
          <div className="wc-missing">
            <div className="mini-label">存在しないもの</div>
            <div>
              {sum.missing.map((m) => (
                <span key={m} className="missing">
                  × {m}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="wc-foot">
          書き換えた定義 <b>{sum.edited}</b>
          <span className="dim"> ・ 人口 {view.population.text}</span>
        </div>
      </article>

      {g.trace.pop.length > 1 && (
        <section className="curves" data-testid="curves">
          <Curve
            label="人口"
            values={g.trace.pop}
            marks={editYears}
            from={populationText(g.trace.pop[0]!)}
            to={populationText(g.trace.pop[g.trace.pop.length - 1]!)}
            danger={stage.fail.pop}
          />
          <Curve
            label="文明"
            values={g.trace.civ}
            marks={editYears}
            from={civLevel(gameData.indicators, g.trace.civ[0]!).word}
            to={civLevel(gameData.indicators, g.trace.civ[g.trace.civ.length - 1]!).word}
            min={0}
            max={100}
            danger={stage.fail.civ}
          />
          <p className="curve-note">
            <span className="curve-note-mark" />
            書き換えた年　<span className="curve-note-danger" />
            ここを割ると世界が終わる
          </p>
        </section>
      )}

      {steps.length > 0 && (
        <section className="chronicle" data-testid="chronicle">
          <div className="section-title">この世界の歩み</div>
          <ol className="timeline">
            {steps.map((h, i) => (
              <li key={i} className={`tl tl-${h.kind} tl-${h.severity}`}>
                <span className="tl-year">YEAR {h.year}</span>
                <div className="tl-main">
                  <Icon name={h.kind === 'edit' ? 'edit' : h.icon} size={15} />
                  <span>{h.text}</span>
                </div>
                <CauseLine cause={h.cause} />
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="result-actions">
        <button className="btn btn-primary wide" onClick={share} data-testid="share">
          <Share2 size={16} strokeWidth={1.6} /> 世界を共有する
        </button>
        <div className="row2">
          <button className="btn" onClick={saveImage} data-testid="save-image">
            <ImageDown size={16} strokeWidth={1.6} /> 画像を保存
          </button>
          <button
            className="btn"
            onClick={() => {
              void navigator.clipboard?.writeText(shareText).then(
                () => showToast('コピーした'),
                () => showToast('コピーできなかった'),
              );
            }}
          >
            <Copy size={16} strokeWidth={1.6} /> 文章をコピー
          </button>
        </div>
        <div className="row2">
          <button className="btn" onClick={readHistory} data-testid="read-history">
            <History size={16} strokeWidth={1.6} /> 世界史
          </button>
          <button className="btn" onClick={() => openRecords('result')} data-testid="result-records">
            <Icon name="record" size={15} /> 観測記録
          </button>
        </div>
        <div className="row2">
          <button className="btn" onClick={retryStage} data-testid="retry">
            <RotateCcw size={16} strokeWidth={1.6} /> もう一度
          </button>
          <button className="btn" onClick={goStages} data-testid="to-stages">
            世界を選ぶ
          </button>
        </div>
      </div>
    </div>
  );
}

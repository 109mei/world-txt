import { ChevronLeft, ChevronRight, CircleCheck, Circle, Copy, GitBranch, History, ImageDown, Pause, Play, RotateCcw, Share2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { gameData } from '../../data';
import { branchWorld, getRuntime, goStages, openRecords, readHistory, retryStage, showToast, useGame } from '../../store/game';
import { civLevel, marksOf, parOf, reviewOf, type FailReason, type GameState, type Mark, type Review } from '../../core';
import { chronicle, populationText } from '../../store/view';
import { gainsOf } from '../../store/pen';
import { rankOf, rankTitle } from '../../store/ranking';
import { replayFrames, type ReplayFrame } from '../../store/replay';
import { shareText as makeShareText } from '../../store/share';
import { Curve } from '../Curve';
import { Icon } from '../icons';
import { CauseLine } from '../parts';
import { renderCard } from '../shareImage';
import { TERMS } from '../terms';
import { WorldScene } from '../WorldScene';
import { HomePrompt, standalone } from '../sheets/MenuSheet';
import { openSheet } from '../../store/game';

const MARK_NAME: Record<Mark, string> = { saved: '救った', few: '少ない手で', early: '早く見抜いた' };

/** 3つの印：その世界で付いた印と、付かなかった印の条件（何がうまかったかを1行で） */
function MarksPanel({ g }: { g: GameState }) {
  const got = new Set(marksOf(g, gameData));
  const par = parOf(gameData, g);
  const line: Record<Mark, string> = {
    saved: got.has('saved') ? '最後の年までどの線も割らなかった' : '最後の年までどの線も割らない',
    few: par === null ? '作り手の解の手数はまだ決まっていない' : `手の数 ${g.moves.length}（作り手の解 ${par}手以内で付く）`,
    early:
      g.countered !== null
        ? g.branch
          ? `YEAR ${g.countered}に原因に効く手を打った（分かれ道は YEAR ${g.branch.year}）`
          : `YEAR ${g.countered}に原因に効く手を打った（兆しが出る前）`
        : '分かれ道の年より前に原因に効く手を打つ',
  };
  return (
    <section className="marks-panel" data-testid="marks">
      <div className="section-title">
        印 <b>{got.size}</b> / 3{g.branched && <span className="dim small">　分かれ道からやり直した世界</span>}
      </div>
      <ul>
        {(['saved', 'few', 'early'] as Mark[]).map((m) => (
          <li key={m} className={got.has(m) ? 'mark mark-on' : 'mark'} data-testid={`mark-${m}`} data-on={got.has(m)}>
            {got.has(m) ? <CircleCheck size={18} strokeWidth={1.5} aria-hidden="true" /> : <Circle size={18} strokeWidth={1.5} aria-hidden="true" />}
            <span className="mark-name">{MARK_NAME[m]}</span>
            <span className="mark-line">{line[m]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const LINE_NAME: Record<FailReason, string> = { humanity: '人口', civilization: '文明', coherence: '世界整合性', capacity: '使える文字数' };

/** 敗因の振り返り：崩れた柱から、原因をさかのぼる（書いた一文は青いインク、出来事は珊瑚、分かれ道は金） */
function DefeatReview({ review }: { review: Review }) {
  const pillar = review.collapse.pillar ? gameData.indicators.items[review.collapse.pillar]?.label : null;
  const line = review.collapse.reason ? LINE_NAME[review.collapse.reason] : '世界';
  return (
    <section className="review" data-testid="review">
      <p className="review-head">
        <b>{review.collapse.year}</b>年目に{line}が線を割った
        {pillar && <span className="dim">（いちばん低い項目は{pillar}）</span>}
      </p>
      <div className="review-legend" aria-hidden="true">
        <span className="lg lg-ink">書いた一文</span>
        <span className="lg lg-event">出来事</span>
        <span className="lg lg-branch">分かれ道</span>
      </div>
      <div className="section-title">原因をさかのぼる</div>
      <ol className="rv-list">
        <li className="rv rv-collapse">
          <span className="rv-year">Y{review.collapse.year}</span>
          <span className="rv-kind">崩れた</span>
          <div className="rv-text">{line}が線を割って世界が崩れた</div>
        </li>
        {review.items.map((it, i) => (
          <li key={i} className={`rv rv-${it.kind}${it.world ? ' rv-world' : ''}`} data-testid={`rv-${it.kind}`}>
            <span className="rv-year">Y{it.year}</span>
            <span className="rv-kind">
              {it.kind === 'branch'
                ? '分かれ道　兆しが最初に出た年'
                : it.kind === 'wrote'
                  ? it.world
                    ? '世界が埋めた行'
                    : 'あなたが書いた一文'
                  : it.kind === 'surprise'
                    ? 'なぜ？　想定外'
                    : 'なぜ？'}
              {it.via && `　つながって：${it.via}`}
            </span>
            <div className="rv-text">{it.kind === 'branch' ? `「${it.text}」` : it.text}</div>
            {it.why && <div className="rv-why">{it.why}</div>}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** 再生：棋譜から世界を作り直し、1年ずつ見返す（自動で進めると約10秒。押すと止まる） */
function Replay({ g }: { g: GameState }) {
  const frames = useMemo<ReplayFrame[] | null>(() => replayFrames(gameData, g), [g]);
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(false);
  useEffect(() => {
    if (!auto || !frames) return;
    if (i >= frames.length - 1) {
      setAuto(false);
      return;
    }
    const t = setTimeout(() => setI((x) => x + 1), Math.max(250, 10000 / frames.length));
    return () => clearTimeout(t);
  }, [auto, i, frames]);
  if (!frames) return <p className="dim small" data-testid="replay-old">今の規則では再生できない（記録は消えていない）</p>;
  const f = frames[Math.min(i, frames.length - 1)]!;
  return (
    <section className="replay" data-testid="replay">
      <div className="replay-head">
        <b data-testid="replay-year">YEAR {f.year}</b>
        {f.pass > 0 && <span className="dim">　{f.pass + 1}周目</span>}
        <span className="dim">　人口 {f.population}</span>
      </div>
      <WorldScene scene={f.scene} compact testId="replay-scene" />
      {f.moves.length > 0 && (
        <ul className="replay-moves">
          {f.moves.map((m, k) => (
            <li key={k} className="ink">
              <Icon name="edit" size={13} /> {m.kind === 'delete' ? '行を消した' : m.text}
              {m.reading && <span className="dim">　（{m.reading}）</span>}
            </li>
          ))}
        </ul>
      )}
      {f.events.length > 0 && (
        <ul className="replay-events">
          {f.events.map((t, k) => (
            <li key={k}>{t}</li>
          ))}
        </ul>
      )}
      <div className="replay-controls">
        <button className="btn" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0} aria-label="前の年">
          <ChevronLeft size={18} strokeWidth={1.5} />
        </button>
        <button className="btn" onClick={() => setAuto((a) => !a)} data-testid="replay-auto">
          {auto ? <Pause size={16} strokeWidth={1.5} /> : <Play size={16} strokeWidth={1.5} />} {auto ? '止める' : '自動で見る'}
        </button>
        <button className="btn" onClick={() => setI((x) => Math.min(frames.length - 1, x + 1))} disabled={i >= frames.length - 1} aria-label="次の年" data-testid="replay-next">
          <ChevronRight size={18} strokeWidth={1.5} />
        </button>
      </div>
    </section>
  );
}

/** 終わった世界のカード（SNSで共有できる形） */
export function Result() {
  const view = useGame((s) => s.view);
  const runs = useGame((s) => s.progress.endless);
  const ranking = useGame((s) => s.progress.ranking);
  const rankUp = useGame((s) => s.rankUp);
  const [replay, setReplay] = useState(false);
  const rt = getRuntime();
  // 1度だけの案内：最初のクリアのあとのホーム画面の案内と、新しい筆の位になったあとの書き出しのおすすめ（出したことはセーブに残す）
  const [home, setHome] = useState(() => rt.state?.status === 'cleared' && rt.homePrompt && !standalone());
  const [suggest] = useState(() => rankUp !== null && rt.exportPrompt(rankUp));
  useEffect(() => {
    if (home) rt.dismissHome();
    if (suggest && rankUp !== null) rt.dismissExport(rankUp);
    // 出した回だけ残す（はじめの描画で1度）
  }, []);
  const g = rt.state;
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
  // 共有文：世界番号・ステージ・年数・手の数・印だけ（書いた文は入れない。友だちは番号で同じ世界に挑める）
  const shareText = makeShareText(g, gameData, TERMS.title);
  const review = reviewOf(g, gameData);

  const cardImage = async (): Promise<File> => {
    const blob = await renderCard({
      number: sum.number,
      stage: stage.title,
      cleared,
      endless,
      title: sum.title,
      years: sum.years,
      tags: sum.tags.map((t) => t.label),
      missing: sum.missing,
      // 書いた文は入れない（同じ世界番号で挑む友だちの答えにならないように）
      edit: null,
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
      {/* 世界の最後の姿（結末の情景） */}
      <WorldScene scene={view.scene} compact testId="result-scene" />
      {/* 世界を救って筆の位が上がった：書き換えられる範囲が広がる */}
      {cleared && rankUp !== null && gameData.access.ranks[rankUp] && (
        <section className="rank-up" data-testid="rank-up">
          <div className="rank-up-label">筆の位が上がった</div>
          <b className="rank-up-name">{gameData.access.ranks[rankUp]!.name}</b>
          <ul>
            {gainsOf(gameData, rankUp).map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      )}
      {home && <HomePrompt onClose={() => setHome(false)} />}
      {suggest && (
        <section className="export-suggest" data-testid="export-suggest">
          <p>新しい筆の位になった。記録を書き出しておくと、端末を移っても記録が消えても続きから遊べる。</p>
          <button className="btn wide" onClick={() => openSheet({ kind: 'menu' })}>
            メニューで記録を書き出す
          </button>
        </section>
      )}
      {/* 負けた世界：崩れた柱から原因をさかのぼる */}
      {review && <DefeatReview review={review} />}
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
            {newBest ? 'これまでの最長を更新' : `これまでの最長 ${prevBest}年`}
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
                  <X size={12} strokeWidth={1.5} aria-hidden="true" /> {m}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="wc-foot">
          書き換えた行 <b>{sum.edited}</b>
          <span className="dim"> ・ 人口 {view.population.text}</span>
        </div>
      </article>

      {stage.marks && <MarksPanel g={g} />}

      {g.trace.pop.length > 1 && (
        <section className="curves" data-testid="curves">
          <Curve label="人口" values={g.trace.pop} marks={editYears} from={populationText(g.trace.pop[0]!)} to={populationText(g.trace.pop[g.trace.pop.length - 1]!)} danger={stage.fail.pop} />
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
            書き換えた年　
            <span className="curve-note-danger" />
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

      {replay && <Replay g={g} />}

      <div className="result-actions">
        {!replay && (
          <button className="btn wide" onClick={() => setReplay(true)} data-testid="open-replay">
            <Play size={16} strokeWidth={1.5} /> 再生（1年ずつ見返す）
          </button>
        )}
        {g.branch && !endless && (
          <button className="btn wide" onClick={branchWorld} data-testid="branch">
            <GitBranch size={16} strokeWidth={1.5} /> 分かれ道（YEAR {g.branch.year}）からやり直す
          </button>
        )}
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
            <Icon name="record" size={15} /> ノート
          </button>
        </div>
        <div className="row2">
          <button className="btn" onClick={retryStage} data-testid="retry">
            <RotateCcw size={16} strokeWidth={1.6} /> 同じ世界でもう一度
          </button>
          <button className="btn" onClick={goStages} data-testid="to-stages">
            世界を選ぶ
          </button>
        </div>
      </div>
    </div>
  );
}

import { ChevronLeft } from 'lucide-react';
import { useMemo, useState } from 'react';
import { gameData } from '../../data';
import { closeRecords, useGame } from '../../store/game';
import { buildRecords, type RecordSectionId } from '../../store/records';
import { Icon } from '../icons';

/** 観測記録：これまでの世界で見つけた読み取り・想定外の変化・出来事・結末。まだ見ぬものは「？？？」 */
export function Records() {
  const discovered = useGame((s) => s.progress.discovered);
  const achievements = useGame((s) => s.progress.achievements);
  const [tab, setTab] = useState<RecordSectionId>('readings');
  const records = useMemo(() => buildRecords(gameData, discovered, achievements), [discovered, achievements]);
  const sec = records.sections.find((s) => s.id === tab) ?? records.sections[0]!;
  const ratio = records.total > 0 ? records.found / records.total : 0;

  return (
    <div className="page records" data-testid="records">
      <header className="page-head">
        <button className="icon-btn" onClick={closeRecords} aria-label="戻る" data-testid="records-back">
          <ChevronLeft size={22} strokeWidth={1.6} />
        </button>
        <h2>
          <Icon name="record" size={19} /> 観測記録
        </h2>
      </header>

      <div className="rec-total">
        <div className="rec-count" data-testid="records-count">
          <b>{records.found}</b>
          <span> / {records.total}</span>
        </div>
        <div className="rec-bar" aria-hidden="true">
          <div style={{ width: `${ratio * 100}%` }} />
        </div>
        <p className="dim small">これまでの世界で見つけたもの。まだ見ぬものは「？？？」のまま。</p>
      </div>

      <div className="chips rec-tabs" role="tablist" aria-label="記録の種類">
        {records.sections.map((s) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={tab === s.id}
            className={tab === s.id ? 'chip on' : 'chip'}
            onClick={() => setTab(s.id)}
            data-testid={`records-${s.id}`}
          >
            <Icon name={s.icon} size={12} /> {s.title}
            <span className="chip-count">
              {s.found}/{s.total}
            </span>
          </button>
        ))}
      </div>

      <p className="rec-lead">{sec.lead}</p>

      {sec.groups.map((g) => {
        const found = g.entries.filter((e) => e.found);
        // まだ得ていないが目標として見せるもの（実績）と、名前も伏せるもの
        const hints = g.entries.filter((e) => !e.found && e.hint);
        const unknown = g.entries.length - found.length - hints.length;
        return (
          <section key={g.id} className="rec-group">
            {g.title && (
              <div className="rec-group-title">
                <Icon name={g.icon} size={13} />
                <span className="rec-group-name">{g.title}</span>
                <span className="rec-group-count">
                  {found.length}/{g.entries.length}
                </span>
              </div>
            )}
            {found.length > 0 && (
              <ul className="rec-list">
                {found.map((e) => (
                  <li key={e.id} className="rec found">
                    <span className="rec-icon">
                      <Icon name={e.icon} size={15} />
                    </span>
                    <div className="rec-body">
                      <div className="rec-title">{e.title}</div>
                      {e.text && e.text !== e.title && <div className="rec-text">{e.text}</div>}
                      {e.why && <div className="why">なぜ？ {e.why}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {hints.length > 0 && (
              <ul className="rec-list rec-hints" data-testid="rec-hints">
                {hints.map((e) => (
                  <li key={e.id} className="rec locked">
                    <span className="rec-icon">
                      <Icon name={e.icon} size={15} />
                    </span>
                    <div className="rec-body">
                      <div className="rec-title">{e.title}</div>
                      <div className="rec-text">{e.text}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {unknown > 0 && (
              <div className="rec-unknown" aria-label={`まだ見ぬもの ${unknown}`}>
                {Array.from({ length: unknown }, (_, i) => (
                  <span key={i} className="rec-q" aria-hidden="true">
                    ?
                  </span>
                ))}
                <span className="rec-unknown-label">まだ見ぬもの {unknown}</span>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

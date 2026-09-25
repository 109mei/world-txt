import { useGame, passDuration, skipPassing } from '../store/game';

/**
 * 時間が流れる演出：光が紙面をなでていき、YEAR の数字が転がって次の年になり、そのあと結果が開く。
 * タップすれば、すぐに結果を開く
 */
export function Passing() {
  const passing = useGame((s) => s.passing);
  if (!passing) return null;
  const total = passDuration(passing.to - passing.from);
  return (
    <div className="passing" data-testid="passing" role="status" aria-label={`YEAR ${passing.from} から ${passing.to} へ`} onClick={skipPassing} style={{ ['--pass' as string]: `${total}ms` }}>
      <div className="passing-sweep" />
      <div className="passing-inner">
        <div className="passing-label">YEAR</div>
        <div className="passing-roll">
          <span className="roll-out">{passing.from}</span>
          <span className="roll-in">{passing.to}</span>
        </div>
        <div className="passing-bar">
          <div />
        </div>
        <div className="passing-text">時が流れていく</div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { passDuration, useGame } from '../store/game';

/** 時間が流れる演出：YEAR が from から to へ数え上がり、そのあと結果が開く */
export function Passing() {
  const passing = useGame((s) => s.passing);
  const [year, setYear] = useState(passing?.from ?? 0);

  useEffect(() => {
    if (!passing) return;
    const { from, to } = passing;
    // 最後の少しは、数え終わった年を見せて止める
    const total = Math.max(120, passDuration(to - from) - 220);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / total);
      const eased = 1 - Math.pow(1 - t, 2);
      setYear(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    setYear(from);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [passing]);

  if (!passing) return null;
  const total = Math.max(120, passDuration(passing.to - passing.from) - 220);
  return (
    <div className="passing" data-testid="passing" role="status" aria-label={`YEAR ${passing.from} から ${passing.to} へ`}>
      <div className="passing-inner">
        <div className="passing-label">YEAR</div>
        <div className="passing-year">{year}</div>
        <div className="passing-bar">
          <div style={{ animationDuration: `${total}ms` }} />
        </div>
        <div className="passing-text">時が流れていく</div>
      </div>
    </div>
  );
}

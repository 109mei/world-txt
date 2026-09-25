/**
 * 年ごとの値の折れ線（モノクロ）。書き換えた年に青いインクの印を、失敗の線に点線を引く。
 * 数字は見せず、始まりと終わりの言葉だけを添える。
 */
export function Curve({
  label,
  values,
  marks,
  from,
  to,
  min,
  max,
  danger,
  testId,
}: {
  label: string;
  values: readonly number[];
  /** 書き換えた年（0 年目からの位置） */
  marks: readonly number[];
  from: string;
  to: string;
  min?: number;
  max?: number;
  /** これを下回ると失敗する線 */
  danger?: number;
  testId?: string;
}) {
  const n = values.length;
  if (n < 2) return null;
  const w = 300;
  const h = 58;
  const pad = 5;
  const lo = Math.min(min ?? Infinity, danger ?? Infinity, ...values);
  const hi = Math.max(max ?? -Infinity, ...values);
  const span = hi - lo || 1;
  const x = (i: number) => pad + (i / (n - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - ((v - lo) / span) * (h - pad * 2);
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${d} L${x(n - 1).toFixed(1)},${h} L${x(0).toFixed(1)},${h} Z`;
  return (
    <div className="curve" data-testid={testId}>
      <div className="curve-head">
        <span className="curve-label">{label}</span>
        <span className="curve-range">
          {from} → <b>{to}</b>
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="curve-svg" aria-hidden="true">
        {danger !== undefined && <line x1={0} x2={w} y1={y(danger)} y2={y(danger)} className="curve-danger" />}
        {marks
          .filter((m) => m >= 0 && m < n)
          .map((m) => (
            <line key={m} x1={x(m)} x2={x(m)} y1={0} y2={h} className="curve-mark" />
          ))}
        <path d={area} className="curve-area" />
        <path d={d} className="curve-line" />
      </svg>
    </div>
  );
}

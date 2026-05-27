import { useEffect, useState } from 'react';
import { fmtCountdown } from '../lib/dates.js';

export default function Countdown({ target, label }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const left = fmtCountdown(target);
  const locked = left === 'Locked';
  return (
    <div className={`card flex items-center justify-between ${locked ? 'border-red-700/40' : ''}`}>
      <div className="min-w-0">
        <div className="label">{label}</div>
        <div className="display text-xl sm:text-2xl tabular-nums">{left}</div>
      </div>
      <div className="text-xs text-muted text-right ml-3 whitespace-nowrap">
        {target.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
      </div>
    </div>
  );
}

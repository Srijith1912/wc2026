import { TEAMS, flagUrl } from '../lib/teams.js';

export default function Flag({ code, size = 'sm', className = '' }) {
  if (!code) return null;
  const t = TEAMS[code];
  if (!t) return null;
  const px = size === 'lg' ? 32 : size === 'md' ? 24 : 18;
  const w = size === 'lg' ? 80 : size === 'md' ? 40 : 40;
  return (
    <img
      src={flagUrl(t.iso, w)}
      alt={`${t.name} flag`}
      width={px}
      height={Math.round(px * 0.66)}
      loading="lazy"
      className={`inline-block rounded-sm shadow-[0_0_0_1px_rgba(255,255,255,0.06)] object-cover ${className}`}
      style={{ width: px, height: Math.round(px * 0.66) }}
    />
  );
}

export function TeamWithFlag({ code, className = '', flagSize = 'sm', highlighted = false }) {
  const t = TEAMS[code];
  if (!t) return <span className={className}>—</span>;
  return (
    <span className={`inline-flex items-center gap-2 ${highlighted ? 'text-gold font-semibold' : ''} ${className}`}>
      <Flag code={code} size={flagSize} />
      <span className="truncate">{t.name}</span>
    </span>
  );
}

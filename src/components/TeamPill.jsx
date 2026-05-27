import Flag from './Flag.jsx';
import { TEAMS } from '../lib/teams.js';

export default function TeamPill({ code, placeholder = 'TBD', locked = false, dim = false }) {
  if (!code) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${dim ? 'text-muted' : ''}`}>
        {locked && <span aria-hidden>🔒</span>}<span>{placeholder}</span>
      </span>
    );
  }
  const t = TEAMS[code];
  return (
    <span className="inline-flex items-center gap-2">
      <Flag code={code} size="sm" />
      <span>{t?.name || code}</span>
    </span>
  );
}

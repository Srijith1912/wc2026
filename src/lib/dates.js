// Deadlines. Arizona observes MST (UTC-7) year-round, so 12:00 PM MST = 19:00 UTC.
export const GROUP_LOCK_UTC = new Date('2026-06-11T19:00:00Z');
export const KO_LOCK_UTC    = new Date('2026-06-28T19:00:00Z');

// The leaderboard stays hidden until every bracket is frozen — otherwise people
// could copy the leaders' knockout picks. That's the moment the knockout
// bracket locks (right before R32 kicks off). Mirrors the RLS clause in
// supabase/schema.sql (2026-06-28 19:00 UTC).
export const LEADERBOARD_UNLOCK_UTC = KO_LOCK_UTC;

export function now() { return new Date(); }
export function groupLocked(at = now()) { return at >= GROUP_LOCK_UTC; }
export function knockoutLocked(at = now()) { return at >= KO_LOCK_UTC; }
export function leaderboardUnlocked(at = now()) { return at >= LEADERBOARD_UNLOCK_UTC; }

// Always renders dd hh mm ss so the seconds tick every render.
export function fmtCountdown(target, from = now()) {
  let ms = target - from;
  if (ms <= 0) return 'Locked';
  const d = Math.floor(ms / 86400000); ms -= d * 86400000;
  const h = Math.floor(ms / 3600000);  ms -= h * 3600000;
  const m = Math.floor(ms / 60000);    ms -= m * 60000;
  const s = Math.floor(ms / 1000);
  const pad = (n) => n.toString().padStart(2, '0');
  return `${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}

export function fmtDate(date) {
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZoneName: 'short',
  });
}

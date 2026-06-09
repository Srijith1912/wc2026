import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { teamLabel } from '../lib/teams.js';
import { scoreMatches } from '../lib/scoring.js';
import Flag from './Flag.jsx';

const DRAW = 'DRAW';
const DAY_MS = 24 * 60 * 60 * 1000;
const LIVE_MS = 3 * 60 * 60 * 1000;   // a match stays visible (greyed) for 3h after kickoff

// Group-stage match prediction game. Only matches inside their live window are
// shown — they appear 24h before kickoff (open to predict), grey out at kickoff,
// and disappear ~3h after kickoff. Keeps the home page focused on what's
// actually actionable. 0.5 points per correct call (folded into the leaderboard).
export default function MatchPredictions({ currentUserId }) {
  const [matches, setMatches] = useState([]);
  const [preds, setPreds] = useState({});       // { matchId: pick }
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [err, setErr] = useState(null);
  const [, setTick] = useState(0);               // re-render so open/live/gone flips live

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: ms, error: mErr }, predsRes] = await Promise.all([
        supabase.from('group_matches').select('*').order('kickoff', { ascending: true }),
        currentUserId
          ? supabase.from('match_predictions').select('match_id, pick').eq('user_id', currentUserId)
          : Promise.resolve({ data: [] }),
      ]);
      if (cancelled) return;
      if (mErr) setErr(mErr.message);
      setMatches(ms || []);
      const map = {};
      for (const r of (predsRes.data || [])) map[r.match_id] = r.pick;
      setPreds(map);
      setLoading(false);
    })();

    // Live-update when the admin enters/changes a result: re-pull the fixtures
    // so the counter and result badges reflect it without a refresh.
    const channel = supabase
      .channel('group-matches-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_matches' }, async () => {
        const { data } = await supabase.from('group_matches').select('*').order('kickoff', { ascending: true });
        if (!cancelled && data) setMatches(data);
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [currentUserId]);

  // Running total is computed over ALL matches (not just the visible window).
  const summary = useMemo(() => scoreMatches(preds, matches), [preds, matches]);

  async function pick(match, value) {
    if (!currentUserId) return;
    if (Date.now() >= new Date(match.kickoff).getTime()) return; // locked
    const prev = preds[match.id];
    setSavingId(match.id);
    setErr(null);
    setPreds((p) => ({ ...p, [match.id]: value }));            // optimistic
    const { error } = await supabase.from('match_predictions')
      .upsert({ user_id: currentUserId, match_id: match.id, pick: value }, { onConflict: 'user_id,match_id' });
    setSavingId(null);
    if (error) {
      setPreds((p) => ({ ...p, [match.id]: prev }));            // roll back
      setErr(error.message);
    }
  }

  if (loading) return <div className="card animate-pulse h-32" />;

  const now = Date.now();
  const visible = matches.filter((m) => {
    const k = new Date(m.kickoff).getTime();
    return now >= k - DAY_MS && now < k + LIVE_MS;
  });

  // Group by local calendar day (already sorted by kickoff).
  const byDay = [];
  for (const m of visible) {
    const key = new Date(m.kickoff).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    const last = byDay[byDay.length - 1];
    if (last && last.key === key) last.items.push(m);
    else byDay.push({ key, items: [m] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="display text-2xl text-gold">Group Stage Match Predictions</div>
          <p className="text-muted text-sm">
            Call the winner — or a draw — for every group game. 0.5 points each. Picks open 24 hours
            before kickoff and lock when the match starts.
          </p>
        </div>
        {currentUserId && (
          <div className="text-right shrink-0">
            <div className="label">Your record</div>
            <div className="display text-2xl text-gold tabular-nums">
              {summary.correct}<span className="text-muted text-base"> / {summary.decided}</span>
            </div>
            <div className="text-xs text-muted">
              {summary.points} pts{summary.decided === 0 ? ' · no results yet' : ' so far'}
            </div>
          </div>
        )}
      </div>

      {!currentUserId && (
        <div className="card border-gold/40 bg-gold/5 text-sm flex items-center justify-between gap-3 flex-wrap">
          <span>Create a free account to lock in your predictions and earn points.</span>
          <Link to="/signup" className="btn-primary text-sm">Sign up to play</Link>
        </div>
      )}

      {err && <div className="card border-red-700/40 text-red-300 text-sm">{err}</div>}

      {visible.length === 0 ? (
        <div className="card text-muted text-sm">
          No matches open right now — games appear here 24 hours before kickoff. Check back soon!
        </div>
      ) : (
        byDay.map((day) => (
          <div key={day.key}>
            <div className="label mb-2">{day.key}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {day.items.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  pickValue={preds[m.id]}
                  saving={savingId === m.id}
                  canPick={!!currentUserId}
                  onPick={(v) => pick(m, v)}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function MatchCard({ match, pickValue, saving, canPick, onPick }) {
  const kickoff = new Date(match.kickoff);
  const isLive = Date.now() >= kickoff.getTime();   // kicked off → locked + greyed
  const isOpen = !isLive;
  const result = match.result || null;

  const timeLabel = kickoff.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });

  const options = [
    { value: match.team_a, label: teamLabel(match.team_a), code: match.team_a },
    { value: DRAW, label: 'Draw', code: null },
    { value: match.team_b, label: teamLabel(match.team_b), code: match.team_b },
  ];

  return (
    <div className={`card ${isLive ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="chip bg-panel2 text-gold border border-gold/30">Group {match.group_letter}</span>
        <span className="text-xs text-muted">{match.venue ? `${match.venue} · ` : ''}{timeLabel}</span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {options.map((o) => {
          const selected = pickValue === o.value;
          const isResult = result && result === o.value;
          const disabled = !canPick || !isOpen || saving;
          return (
            <button
              key={o.value}
              type="button"
              disabled={disabled}
              onClick={() => onPick(o.value)}
              className={`flex flex-col items-center gap-1 px-1.5 py-2 rounded-md border text-xs transition
                ${selected ? 'border-gold bg-gold/10 text-white' : 'border-border text-muted'}
                ${isResult ? 'ring-1 ring-emerald-500/70' : ''}
                ${disabled ? 'cursor-not-allowed' : 'hover:border-gold/60 hover:text-white'}`}
            >
              {o.code ? <Flag code={o.code} size="sm" /> : <span aria-hidden className="text-base leading-none">🤝</span>}
              <span className="truncate max-w-full">{o.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 text-[11px] min-h-[1.1rem]">
        {isOpen && (
          <span className={pickValue ? 'text-emerald-400' : 'text-muted'}>
            {pickValue ? '✓ Pick saved — change it any time before kickoff' : 'Open — make your pick'}
          </span>
        )}
        {isLive && (
          result ? (
            <span className={pickValue ? (pickValue === result ? 'text-emerald-400' : 'text-red-400') : 'text-muted'}>
              {pickValue ? (pickValue === result ? '✓ Correct (+0.5)' : '✗ Missed') : 'No pick'}
              {' · '}Result: {result === DRAW ? 'Draw' : teamLabel(result)}
            </span>
          ) : (
            <span className="text-muted">
              🔴 Kicked off — locked{pickValue ? ` · your pick: ${pickValue === DRAW ? 'Draw' : teamLabel(pickValue)}` : ' · no pick'}
            </span>
          )
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { isAdmin } from '../lib/admin.js';
import { MAX_TOTAL } from '../lib/scoring.js';
import { LEADERBOARD_UNLOCK_UTC, leaderboardUnlocked } from '../lib/dates.js';
import Countdown from '../components/Countdown.jsx';

export default function Leaderboard() {
  const { user } = useAuth();
  const admin = isAdmin(user);
  const unlocked = leaderboardUnlocked();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    // Hidden until the knockout stage begins (admins get a preview). Scoring is
    // done server-side: the leaderboard() RPC returns only the top 10 (+ your
    // own row) as names + points — never anyone's picks. To see a full bracket
    // you visit a group-mate from the Group page; brackets aren't exposed here.
    if (!unlocked && !admin) { setLoading(false); return; }

    (async () => {
      setLoading(true);
      setErr(null);
      const { data, error } = await supabase.rpc('leaderboard');
      if (error) { setErr(error.message); setLoading(false); return; }
      setRows(data || []);
      setLoading(false);
    })();
  }, [unlocked, admin]);

  if (!unlocked && !admin) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <div>
          <div className="display text-3xl text-gold">🏆 Leaderboard</div>
          <p className="text-muted text-sm mt-1">
            The leaderboard opens when the knockout stage begins. Until then, track your own
            running total on the Bracket page.
          </p>
        </div>
        <Countdown target={LEADERBOARD_UNLOCK_UTC} label="Leaderboard unlocks in" />
      </div>
    );
  }

  if (loading) return <div className="text-muted">Loading…</div>;
  if (err) return <div className="card border-red-700/40 text-red-300 text-sm">{err}</div>;

  // The RPC already returns at most the top 10 rows (by row number) plus the
  // caller's own row if they rank lower, so we just split on rank.
  const displayTop = rows.filter((r) => r.rank <= 10);
  const me = rows.find((r) => r.is_self);
  const meInTop = me && me.rank <= 10;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <div className="display text-3xl text-gold">🏆 Leaderboard</div>
        <p className="text-muted text-sm mt-1">
          Top 10 across everyone, scored automatically out of {MAX_TOTAL} points.
          {admin && !unlocked && <span className="text-gold"> (Admin preview — hidden from players until unlock.)</span>}
        </p>
      </div>

      <div className="card divide-y divide-border/60 p-0 overflow-hidden">
        {displayTop.length === 0 && <div className="p-4 text-muted text-sm">No scores yet.</div>}
        {displayTop.map((r) => (
          <Row key={r.user_id} row={r} />
        ))}
      </div>

      {me && !meInTop && (
        <div>
          <div className="text-xs text-muted mb-1 pl-1">Your position</div>
          <div className="card p-0 overflow-hidden">
            <Row row={me} />
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ row }) {
  const medal = row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : null;
  return (
    <div className={`w-full flex items-center gap-3 px-4 py-3 ${row.is_self ? 'bg-gold/10' : ''}`}>
      <span className="w-8 text-center tabular-nums text-muted shrink-0">
        {medal || `#${row.rank}`}
      </span>
      <span className="flex-1 min-w-0 truncate text-white">
        {row.display_name}{row.is_self && <span className="text-xs text-muted"> (you)</span>}
      </span>
      <span className="display text-xl text-gold tabular-nums shrink-0">{row.points}</span>
    </div>
  );
}

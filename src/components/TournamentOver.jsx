import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import Flag from './Flag.jsx';

// Spain lifted the 2026 World Cup — hard-coded per the final result.
const CHAMPION_CODE = 'ESP';
const CHAMPION_NAME = 'Spain';

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Shown on the Bracket page once the tournament is over (replaces the group-stage
// match game). Celebrates the champion, tells the viewer where they finished in
// each group they joined + overall, and thanks them for playing. Read-only — it
// only reads the leaderboard RPCs, never touches picks or points.
export default function TournamentOver({ userId }) {
  const signedIn = !!userId;
  const [standings, setStandings] = useState(null); // { overall, groups: [] }
  const [loading, setLoading] = useState(signedIn);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [overallRes, groupsRes] = await Promise.all([
        supabase.rpc('leaderboard'),
        supabase.from('group_members').select('group_id, groups(name)').eq('user_id', userId),
      ]);

      const overallRows = overallRes.data || [];
      const selfOverall = overallRows.find((r) => r.is_self);
      const overall = selfOverall
        ? { rank: selfOverall.rank, total: overallRows.length }
        : null;

      const groups = [];
      for (const g of (groupsRes.data || [])) {
        const { data } = await supabase.rpc('group_leaderboard', { p_group_id: g.group_id });
        const rows = data || [];
        const self = rows.find((r) => r.is_self);
        if (self) groups.push({ name: g.groups?.name || 'your group', rank: self.rank, size: rows.length });
      }

      if (!cancelled) { setStandings({ overall, groups }); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const hasStandings = standings && (standings.overall || standings.groups.length > 0);

  return (
    <div className="card border-gold/40 bg-gradient-to-b from-gold/10 to-transparent text-center space-y-4 py-8">
      <div className="text-5xl" aria-hidden>🏆</div>
      <div className="display text-2xl sm:text-3xl text-gold">The World Cup has come to an end!</div>
      <div className="flex items-center justify-center gap-2 text-lg text-white flex-wrap">
        <Flag code={CHAMPION_CODE} size="md" />
        <span><b className="text-gold">{CHAMPION_NAME}</b> are your 2026 World Champions.</span>
      </div>

      {signedIn ? (
        loading ? (
          <div className="text-muted text-sm">Tallying the final standings…</div>
        ) : hasStandings ? (
          <div className="max-w-md mx-auto space-y-1.5">
            <div className="text-sm text-muted">Here's how you finished:</div>
            {standings.groups.map((g) => (
              <div key={g.name} className="text-white/90">
                <b className="text-gold">{ordinal(g.rank)}</b>
                <span className="text-muted"> of {g.size}</span> in {g.name}
              </div>
            ))}
            {standings.overall && (
              <div className="text-white/90">
                <b className="text-gold">{ordinal(standings.overall.rank)}</b>
                <span className="text-muted"> of {standings.overall.total}</span> on the overall leaderboard
              </div>
            )}
          </div>
        ) : (
          <div className="text-white/90 text-sm max-w-md mx-auto">
            Thanks for being part of it — every pick you made helped bring this tournament to life.
          </div>
        )
      ) : (
        <div className="text-white/90 text-sm max-w-md mx-auto">
          Thanks to everyone who played along and made this a tournament to remember.
        </div>
      )}

      <p className="text-muted text-sm max-w-lg mx-auto">
        From the first group kickoff to the final whistle, thank you for playing, predicting, and
        cheering along. You made this event a genuine success — we couldn't have done it without you.
        Until the next one! 🎉
      </p>

      <div className="pt-1">
        <Link to="/leaderboard" className="btn-secondary text-sm inline-block">🏆 View the final leaderboard</Link>
      </div>
    </div>
  );
}

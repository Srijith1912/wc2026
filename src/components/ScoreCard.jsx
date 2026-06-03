import { useState } from 'react';
import { Link } from 'react-router-dom';
import { scoreBracket, MAX_TOTAL } from '../lib/scoring.js';

// Shows a bracket's running score + an expandable per-category breakdown.
// Works for the signed-in user's own bracket (Bracket page) and for any
// member's bracket (MemberBracket). Pass `title` to relabel.
//
// `scoringLive` is true once the admin has entered ANY result. Before that the
// card just explains scoring hasn't started yet (avoids a lonely "0 pts").
export default function ScoreCard({ bracket, fixture, title = 'Your score', showLeaderboardLink = true }) {
  const [open, setOpen] = useState(false);
  const { total, lines } = scoreBracket(bracket, fixture);

  const scoringLive =
    Object.keys(fixture?.group_results || {}).length > 0 ||
    Object.keys(fixture?.knockout_results || {}).length > 0 ||
    Object.values(fixture?.third_place_assignments || {}).some(Boolean) ||
    Object.values(fixture?.awards_results || {}).some(Boolean);

  return (
    <div className="card mb-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="label">{title}</div>
          {scoringLive ? (
            <div className="display text-3xl text-gold tabular-nums">
              {total}<span className="text-muted text-lg"> / {MAX_TOTAL} pts</span>
            </div>
          ) : (
            <div className="text-sm text-muted mt-1">
              Scoring starts once the group stage ends and the admin enters results.
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {showLeaderboardLink && (
            <Link to="/leaderboard" className="btn-secondary text-sm">🏆 Leaderboard</Link>
          )}
          {scoringLive && (
            <button onClick={() => setOpen((o) => !o)} className="btn-secondary text-sm">
              {open ? 'Hide' : 'Breakdown'}
            </button>
          )}
        </div>
      </div>

      {open && scoringLive && (
        <table className="w-full text-sm mt-3">
          <tbody className="[&_td]:py-1">
            {lines.map((l) => (
              <tr key={l.key} className="border-t border-border/60">
                <td className="text-muted">{l.label}</td>
                <td className="text-right tabular-nums text-muted">{l.correct}/{l.of}</td>
                <td className="text-right tabular-nums w-16">
                  <span className={l.points > 0 ? 'text-gold' : 'text-muted'}>{l.points}</span>
                  <span className="text-muted/60"> / {l.max}</span>
                </td>
              </tr>
            ))}
            <tr className="border-t border-border font-semibold">
              <td className="text-white">Total</td>
              <td></td>
              <td className="text-right tabular-nums text-gold">{total} / {MAX_TOTAL}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

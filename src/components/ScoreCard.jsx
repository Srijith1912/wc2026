import { useState } from 'react';
import { Link } from 'react-router-dom';
import { scoreBracket, MAX_TOTAL, MATCH_GAME_MAX, MATCH_GAME_COUNT, COMBINED_MAX } from '../lib/scoring.js';

// Shows a player's running TOTAL score + an expandable per-category breakdown.
// Total = bracket score (out of 172) + group-stage match predictions (out of 36),
// for a combined 208. Pass `matchStats` ({ points, correct, decided }) to include
// the match game; omit it to show bracket-only.
//
// `scoringLive` is true once any result has been entered (bracket or matches).
export default function ScoreCard({ bracket, fixture, matchStats = null, title = 'Your score', showLeaderboardLink = true }) {
  const [open, setOpen] = useState(false);
  const { total: bracketTotal, lines } = scoreBracket(bracket, fixture);

  const hasMatches = !!matchStats;
  const matchPoints = matchStats?.points || 0;
  const total = bracketTotal + matchPoints;
  const maxTotal = hasMatches ? COMBINED_MAX : MAX_TOTAL;

  const scoringLive =
    Object.keys(fixture?.group_results || {}).length > 0 ||
    Object.keys(fixture?.knockout_results || {}).length > 0 ||
    Object.values(fixture?.third_place_assignments || {}).some(Boolean) ||
    Object.values(fixture?.awards_results || {}).some(Boolean) ||
    (matchStats?.decided || 0) > 0;

  const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

  return (
    <div className="card mb-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="label">{title}</div>
          {scoringLive ? (
            <div className="display text-3xl text-gold tabular-nums">
              {fmt(total)}<span className="text-muted text-lg"> / {maxTotal} pts</span>
            </div>
          ) : (
            <div className="text-sm text-muted mt-1">
              Scoring starts once games are played and results are entered.
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
            {hasMatches && (
              <tr className="border-t border-border/60">
                <td className="text-muted">Group-stage matches</td>
                <td className="text-right tabular-nums text-muted">{matchStats.correct}/{MATCH_GAME_COUNT}</td>
                <td className="text-right tabular-nums w-16">
                  <span className={matchPoints > 0 ? 'text-gold' : 'text-muted'}>{fmt(matchPoints)}</span>
                  <span className="text-muted/60"> / {MATCH_GAME_MAX}</span>
                </td>
              </tr>
            )}
            <tr className="border-t border-border font-semibold">
              <td className="text-white">Total</td>
              <td></td>
              <td className="text-right tabular-nums text-gold">{fmt(total)} / {maxTotal}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

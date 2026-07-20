import { POINTS, isAwardCorrect, awardResultLabel } from '../lib/scoring.js';

const AWARDS = [
  { key: 'golden_ball',  label: 'Golden Ball',  hint: 'Best player of the tournament' },
  { key: 'golden_boot',  label: 'Golden Boot',  hint: 'Top scorer of the tournament' },
  { key: 'golden_glove', label: 'Golden Glove', hint: 'Best goalkeeper of the tournament' },
];

export default function AwardsCard({ bracket, setBracket, locked, readOnly, fixture }) {
  const disabled = locked || readOnly;
  const picks = bracket?.awards_picks || {};
  const results = fixture?.awards_results || {};

  function set(key, value) {
    setBracket((b) => ({
      ...b,
      awards_picks: { ...(b.awards_picks || {}), [key]: value },
    }));
  }

  return (
    <div className="card mb-4">
      <div className="flex items-baseline justify-between mb-2 gap-3">
        <div className="display text-lg text-gold">Individual Awards</div>
        <div className="text-xs text-muted">5 pts each · locks with group stage</div>
      </div>
      <p className="text-xs text-muted mb-3">
        Enter each player's full name, including surname (for example, "Harry Kane"). Scoring ignores case and accents, so the common spelling is fine.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {AWARDS.map(({ key, label, hint }) => (
          <label key={key} className="block">
            <div className="text-sm text-white mb-1">{label}</div>
            <div className="text-[11px] text-muted mb-1">{hint}</div>
            <input
              type="text"
              value={picks[key] || ''}
              onChange={(e) => set(key, e.target.value)}
              disabled={disabled}
              placeholder="Player full name"
              maxLength={80}
              className="w-full px-2 py-1.5 rounded-md bg-black/30 border border-border text-sm text-white placeholder:text-muted/60 focus:outline-none focus:border-gold disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <AwardResult pick={picks[key]} result={results[key]} />
          </label>
        ))}
      </div>
    </div>
  );
}

// Once the admin enters the winner, show whether the player's pick landed (and
// the points it earned). Renders nothing until then. Display only — the stored
// pick is never touched.
function AwardResult({ pick, result }) {
  const hasResult = !!awardResultLabel(result);
  if (!hasResult) return null;
  const correct = isAwardCorrect(pick, result);
  return (
    <div className={`mt-1.5 text-[11px] ${correct ? 'text-emerald-400' : 'text-red-400'}`}>
      {correct
        ? `✓ Correct +${POINTS.award} pts`
        : `✗ ${pick ? 'Missed' : 'No pick'} · Winner: ${awardResultLabel(result)}`}
    </div>
  );
}

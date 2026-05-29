const AWARDS = [
  { key: 'golden_ball',  label: 'Golden Ball',  hint: 'Best player of the tournament' },
  { key: 'golden_boot',  label: 'Golden Boot',  hint: 'Top scorer of the tournament' },
  { key: 'golden_glove', label: 'Golden Glove', hint: 'Best goalkeeper of the tournament' },
];

export default function AwardsCard({ bracket, setBracket, locked, readOnly }) {
  const disabled = locked || readOnly;
  const picks = bracket?.awards_picks || {};

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
        Type the player's name (any format — e.g. "Mbappé" or "Kylian Mbappe"). The group leader resolves ties at scoring time.
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
              placeholder="Player name"
              maxLength={80}
              className="w-full px-2 py-1.5 rounded-md bg-black/30 border border-border text-sm text-white placeholder:text-muted/60 focus:outline-none focus:border-gold disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

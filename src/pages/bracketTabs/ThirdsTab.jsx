import { GROUPS, teamsInGroup, TEAMS } from '../../lib/teams.js';
import Flag from '../../components/Flag.jsx';

// Rule: pick at most ONE team per group, exactly 8 teams total.
// (FIFA advances 8 of 12 third-place teams, so picking the third-place team
// from 8 different groups maps to the real-world structure.)
export default function ThirdsTab({ bracket, setBracket, locked, readOnly }) {
  const disabled = locked || readOnly;
  const picks = bracket?.third_place_bets || [];
  const groupPicks = bracket?.group_picks || {};
  const setPicks = (next) => setBracket((b) => ({ ...b, third_place_bets: next }));

  // A team is "blocked" from the side bet if the user already picked it as the
  // group winner or runner-up — those teams can't also finish 3rd.
  const isBlocked = (code) => {
    const gp = groupPicks[TEAMS[code].group];
    return !!gp && (gp.winner === code || gp.runnerUp === code);
  };

  function toggle(code) {
    if (disabled) return;
    if (picks.includes(code)) {
      setPicks(picks.filter((c) => c !== code));
      return;
    }
    if (isBlocked(code)) return;
    // enforce: 1 per group
    const otherInSameGroup = picks.find((c) => TEAMS[c].group === TEAMS[code].group);
    let next = picks;
    if (otherInSameGroup) next = next.filter((c) => c !== otherInSameGroup);
    if (next.length >= 8) return;
    setPicks([...next, code]);
  }

  return (
    <div>
      <div className="card mb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="label">Best Thirds Side Bet</div>
            <div className="text-sm text-muted mt-1">
              Pick the third-place team from <b>8 different groups</b> that you think will advance. Max 1 per group, 8 total.
            </div>
          </div>
          <div className="display text-3xl text-gold tabular-nums whitespace-nowrap">
            {picks.length}<span className="text-muted text-lg">/8</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {GROUPS.map((g) => {
          const groupPick = picks.find((c) => TEAMS[c].group === g);
          return (
            <div key={g} className="card">
              <div className="flex items-center justify-between mb-2">
                <div className="display text-lg text-gold">Group {g}</div>
                {groupPick ? (
                  <span className="chip bg-gold/10 text-gold border border-gold/40">
                    <Flag code={groupPick} size="sm" /> selected
                  </span>
                ) : (
                  <span className="text-xs text-muted">none picked</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {teamsInGroup(g).map((c) => {
                  const on = picks.includes(c);
                  const blocked = isBlocked(c);              // user picked them as W or RU
                  const groupFull = !on && groupPick;        // another team in this group chosen as 3rd
                  const eightFull = !on && !groupPick && picks.length >= 8;
                  const cantClick = disabled || blocked || eightFull;
                  const title = blocked ? 'Already picked as group winner or runner-up' :
                                groupFull ? 'Picking this will replace your current pick from this group' : '';
                  return (
                    <button
                      key={c}
                      type="button"
                      disabled={cantClick}
                      onClick={() => toggle(c)}
                      title={title}
                      className={`flex items-center gap-2 px-2 py-2 rounded-md text-sm border transition
                        ${on ? 'border-gold bg-gold/10 text-white'
                             : blocked ? 'border-border text-muted line-through'
                                       : groupFull ? 'border-border text-muted hover:border-gold/60'
                                                   : 'border-border text-muted hover:border-gold hover:text-white'}
                        ${cantClick && !on ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <Flag code={c} size="sm" />
                      <span className="truncate">{TEAMS[c].name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

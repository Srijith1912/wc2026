import { GROUPS, teamsInGroup, teamLabel } from '../../lib/teams.js';
import Flag from '../../components/Flag.jsx';

export default function GroupStageTab({ bracket, setBracket, locked, readOnly }) {
  const disabled = locked || readOnly;
  const picks = bracket?.group_picks || {};

  function set(group, key, code) {
    setBracket((b) => {
      const gp = { ...(b.group_picks || {}) };
      const cur = { ...(gp[group] || {}) };
      cur[key] = code || null;
      if (key === 'winner' && cur.winner === cur.runnerUp) cur.runnerUp = null;
      if (key === 'runnerUp' && cur.winner === cur.runnerUp) cur.winner = null;
      gp[group] = cur;
      // If this team was selected as a best-third, drop it — a team can't
      // be the group winner/runner-up AND the 3rd-place team.
      const tpb = code ? (b.third_place_bets || []).filter((c) => c !== code) : (b.third_place_bets || []);
      return { ...b, group_picks: gp, third_place_bets: tpb };
    });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {GROUPS.map((g) => {
        const teams = teamsInGroup(g);
        const cur = picks[g] || {};
        return (
          <div key={g} className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="display text-xl text-gold">Group {g}</div>
              <div className="flex items-center gap-1">
                {teams.map((c) => <Flag key={c} code={c} size="sm" />)}
              </div>
            </div>
            <div className="space-y-3">
              <Field label="Winner" code={cur.winner}>
                <select className="select" disabled={disabled} value={cur.winner || ''} onChange={(e) => set(g, 'winner', e.target.value)}>
                  <option value="">— pick —</option>
                  {teams.map((c) => <option key={c} value={c}>{teamLabel(c)}</option>)}
                </select>
              </Field>
              <Field label="Runner-up" code={cur.runnerUp}>
                <select className="select" disabled={disabled} value={cur.runnerUp || ''} onChange={(e) => set(g, 'runnerUp', e.target.value)}>
                  <option value="">— pick —</option>
                  {teams.filter((c) => c !== cur.winner).map((c) => <option key={c} value={c}>{teamLabel(c)}</option>)}
                </select>
              </Field>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, code, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="label">{label}</span>
        {code && <Flag code={code} size="sm" />}
      </div>
      {children}
    </div>
  );
}

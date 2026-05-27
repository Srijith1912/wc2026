import { GROUPS, teamsInGroup, teamLabel } from '../../lib/teams.js';
import Flag from '../../components/Flag.jsx';
import { r32MatchesUsingGroupSlot, descendantsOf } from '../../lib/bracket.js';

export default function GroupStageTab({ bracket, setBracket, locked, readOnly }) {
  const disabled = locked || readOnly;
  const picks = bracket?.group_picks || {};

  function set(group, key, code) {
    setBracket((b) => {
      const prev = (b.group_picks || {})[group] || {};
      const prevVal = prev[key] || null;
      const newVal = code || null;
      if (prevVal === newVal) return b;

      const gp = { ...(b.group_picks || {}) };
      const cur = { ...prev };
      cur[key] = newVal;
      if (key === 'winner' && cur.winner === cur.runnerUp) cur.runnerUp = null;
      if (key === 'runnerUp' && cur.winner === cur.runnerUp) cur.winner = null;
      gp[group] = cur;

      // A team can't be group W/RU and a best-third — drop them.
      const tpb = newVal ? (b.third_place_bets || []).filter((c) => c !== newVal) : (b.third_place_bets || []);

      // Cascade clear: changing this group's W or RU invalidates any R32
      // pick that referenced that slot, and everything downstream of it.
      const knockout = { ...(b.knockout_picks || {}) };
      const r32Affected = r32MatchesUsingGroupSlot(group, key);
      for (const r32 of r32Affected) {
        if (knockout[r32]) delete knockout[r32];
        for (const d of descendantsOf(r32)) {
          if (knockout[d]) delete knockout[d];
        }
      }

      return { ...b, group_picks: gp, third_place_bets: tpb, knockout_picks: knockout };
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

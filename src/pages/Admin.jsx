import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { GROUPS, teamsInGroup, teamLabel, TEAMS } from '../lib/teams.js';
import { R32, matchLabel } from '../lib/bracket.js';
import Flag from '../components/Flag.jsx';

// Admin enters:
//   1) actual group winners/runners-up for each of the 12 groups
//   2) actual 3rd-place team for each R32 "third" slot, chosen from FIFA's
//      pre-defined option set for that slot
export default function Admin() {
  const [loading, setLoading] = useState(true);
  const [fx, setFx] = useState({ group_results: {}, third_place_assignments: {} });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    supabase.from('fixture_state').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) setFx({
        group_results: data.group_results || {},
        third_place_assignments: data.third_place_assignments || {},
      });
      setLoading(false);
    });
  }, []);

  function setGroup(g, key, code) {
    setFx((s) => {
      const gr = { ...s.group_results };
      const cur = { ...(gr[g] || {}) };
      cur[key] = code || null;
      if (key === 'winner' && cur.winner === cur.runnerUp) cur.runnerUp = null;
      if (key === 'runnerUp' && cur.winner === cur.runnerUp) cur.winner = null;
      gr[g] = cur;
      return { ...s, group_results: gr };
    });
  }

  function setThird(slotKey, code) {
    setFx((s) => ({
      ...s,
      third_place_assignments: { ...s.third_place_assignments, [slotKey]: code || null },
    }));
  }

  async function save() {
    setBusy(true); setMsg(null); setErr(null);
    const { error } = await supabase.from('fixture_state').upsert({
      id: 1,
      group_results: fx.group_results,
      third_place_assignments: fx.third_place_assignments,
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) setErr(error.message); else setMsg('Fixture saved. Knockout slots updated for all users.');
  }

  async function clearAll() {
    if (!confirm('Clear all admin selections (group results + 3rd-place assignments) and save? Every user\'s knockout slots will revert to placeholders (A1, A2, TBD) / their own group picks. This does NOT touch any user\'s personal bracket picks.')) return;
    setBusy(true); setMsg(null); setErr(null);
    const empty = { group_results: {}, third_place_assignments: {} };
    const { error } = await supabase.from('fixture_state').upsert({
      id: 1,
      ...empty,
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) setErr(error.message);
    else { setFx(empty); setMsg('Fixture cleared and saved.'); }
  }

  if (loading) return <div className="text-muted">Loading…</div>;

  const thirdSlots = R32.flatMap((m) => {
    const out = [];
    if (m.a.kind === 'third') out.push({ key: `${m.id}_a`, match: m, options: m.a.options });
    if (m.b.kind === 'third') out.push({ key: `${m.id}_b`, match: m, options: m.b.options });
    return out;
  });

  return (
    <div className="space-y-6">
      <header>
        <div className="display text-3xl text-gold">Admin — Fixture State</div>
        <p className="text-muted text-sm mt-1">
          After the group stage ends (June 27, 2026), enter the actual 1st/2nd-place finishers and
          assign each "3rd from X/Y/Z" slot to a specific team per FIFA's allocation. This unlocks
          users' knockout brackets with real teams.
        </p>
      </header>

      <section>
        <div className="display text-xl text-gold mb-3">Group results</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {GROUPS.map((g) => {
            const teams = teamsInGroup(g);
            const cur = fx.group_results[g] || {};
            return (
              <div key={g} className="card">
                <div className="display text-lg text-gold mb-2">Group {g}</div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label">Winner</label>
                  {cur.winner && <Flag code={cur.winner} size="sm" />}
                </div>
                <select className="select mb-3" value={cur.winner || ''} onChange={(e) => setGroup(g, 'winner', e.target.value)}>
                  <option value="">—</option>
                  {teams.map((c) => <option key={c} value={c}>{teamLabel(c)}</option>)}
                </select>
                <div className="flex items-center justify-between mb-1">
                  <label className="label">Runner-up</label>
                  {cur.runnerUp && <Flag code={cur.runnerUp} size="sm" />}
                </div>
                <select className="select" value={cur.runnerUp || ''} onChange={(e) => setGroup(g, 'runnerUp', e.target.value)}>
                  <option value="">—</option>
                  {teams.filter((c) => c !== cur.winner).map((c) => <option key={c} value={c}>{teamLabel(c)}</option>)}
                </select>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="display text-xl text-gold mb-3">Third-place R32 assignments</div>
        <p className="text-muted text-sm mb-3">For each "3rd from X/Y/Z" R32 slot, pick the actual team FIFA assigned.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {thirdSlots.map((s) => {
            const cur = fx.third_place_assignments[s.key];
            return (
            <div key={s.key} className="card">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted">{matchLabel(s.match.id)} · {s.match.date}</div>
                {cur && <Flag code={cur} size="sm" />}
              </div>
              <div className="display text-base text-gold mb-2">3rd from {s.options.join(' / ')}</div>
              <select className="select" value={cur || ''} onChange={(e) => setThird(s.key, e.target.value)}>
                <option value="">—</option>
                {/* Default options: any third-place team from the listed groups.
                    Admin can also pick any team if FIFA reassigns, but normally
                    this should be a non-winner non-runner-up from one of the
                    listed groups. */}
                {s.options.flatMap((g) => teamsInGroup(g))
                  .filter((c) => {
                    const r = fx.group_results[TEAMS[c].group];
                    if (!r) return true;
                    return r.winner !== c && r.runnerUp !== c;
                  })
                  .map((c) => <option key={c} value={c}>{teamLabel(c)}</option>)}
              </select>
            </div>
          );})}
        </div>
      </section>

      <div className="sticky bottom-3 z-10 flex flex-wrap justify-end items-center gap-2">
        {msg && <span className="text-sm text-emerald-400">{msg}</span>}
        {err && <span className="text-sm text-red-400">{err}</span>}
        <button onClick={clearAll} disabled={busy} className="btn-secondary text-sm border-red-700/40 text-red-300 hover:border-red-500">Clear all</button>
        <button onClick={save} disabled={busy} className="btn-primary">{busy ? 'Saving…' : 'Save fixture'}</button>
      </div>
    </div>
  );
}

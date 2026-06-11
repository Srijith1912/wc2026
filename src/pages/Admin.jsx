import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { GROUPS, teamsInGroup, teamLabel, TEAMS } from '../lib/teams.js';
import { R32, R16, QF, SF, FINAL, THIRD_PLACE, matchLabel, descendantsOf, r32MatchesUsingGroupSlot } from '../lib/bracket.js';
import { AWARD_KEYS } from '../lib/scoring.js';
import Flag from '../components/Flag.jsx';
import KnockoutTab from './bracketTabs/KnockoutTab.jsx';

// Admin enters the ACTUAL tournament results, which scoring.js compares every
// user's bracket against:
//   1) group winners / runners-up for each of the 12 groups
//   2) the real 3rd-place team for each R32 "third" slot
//   3) the winner of every knockout match (R32 -> Final + 3rd-place playoff)
//   4) the three individual award winners
// It also moderates the reviews shown on the public landing page.

const VIEWS = [
  { id: 'GROUPS',  label: 'Group & Thirds' },
  { id: 'KO',      label: 'Knockout Results' },
  { id: 'AWARDS',  label: 'Award Winners' },
  { id: 'MATCHES', label: 'Match Results' },
  { id: 'REVIEWS', label: 'Reviews' },
];

const KO_ROUNDS = [
  { id: 'R32',   label: 'R32',      matches: R32 },
  { id: 'R16',   label: 'R16',      matches: R16 },
  { id: 'QF',    label: 'Quarters', matches: QF },
  { id: 'SF',    label: 'Semis',    matches: SF },
  { id: 'FINAL', label: 'Final + 3rd', matches: [FINAL, THIRD_PLACE] },
];

const AWARD_META = {
  golden_ball:  { label: 'Golden Ball',  hint: 'Best player' },
  golden_boot:  { label: 'Golden Boot',  hint: 'Top scorer' },
  golden_glove: { label: 'Golden Glove', hint: 'Best goalkeeper' },
};

const EMPTY = {
  group_results: {},
  third_place_assignments: {},
  knockout_results: {},
  awards_results: {},
};

export default function Admin() {
  const [loading, setLoading] = useState(true);
  const [fx, setFx] = useState(EMPTY);
  const [view, setView] = useState('GROUPS');
  const [koRound, setKoRound] = useState('R32');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    supabase.from('fixture_state').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) setFx({
        group_results: data.group_results || {},
        third_place_assignments: data.third_place_assignments || {},
        knockout_results: data.knockout_results || {},
        awards_results: data.awards_results || {},
      });
      setLoading(false);
    });
  }, []);

  // Removes a knockout match's result AND every result downstream of it, so we
  // never leave an orphaned winner whose teams no longer exist (which would show
  // phantom teams in later rounds and wrongly score players).
  function clearKoFrom(kr, matchIds) {
    const next = { ...kr };
    for (const id of matchIds) {
      delete next[id];
      for (const d of descendantsOf(id)) delete next[d];
    }
    return next;
  }

  function setGroup(g, key, code) {
    setFx((s) => {
      const gr = { ...s.group_results };
      const cur = { ...(gr[g] || {}) };
      cur[key] = code || null;
      if (key === 'winner' && cur.winner === cur.runnerUp) cur.runnerUp = null;
      if (key === 'runnerUp' && cur.winner === cur.runnerUp) cur.winner = null;
      gr[g] = cur;
      // Changing a group W/RU changes which team fills the R32 slots that used
      // it — wipe any now-stale knockout results from those R32 matches down.
      const kr = clearKoFrom(s.knockout_results || {}, r32MatchesUsingGroupSlot(g, key));
      return { ...s, group_results: gr, knockout_results: kr };
    });
  }

  function setThird(slotKey, code) {
    setFx((s) => {
      // slotKey looks like 'R32_L1_a' — strip the side suffix to get the match.
      const matchId = slotKey.replace(/_(a|b)$/, '');
      const kr = clearKoFrom(s.knockout_results || {}, [matchId]);
      return {
        ...s,
        third_place_assignments: { ...s.third_place_assignments, [slotKey]: code || null },
        knockout_results: kr,
      };
    });
  }

  function setAward(key, value) {
    setFx((s) => ({ ...s, awards_results: { ...s.awards_results, [key]: value } }));
  }

  // Adapter so the regular KnockoutTab can drive fixture.knockout_results: it
  // reads/writes a synthetic bracket whose knockout_picks IS knockout_results.
  // Group/third teams resolve straight from the fixture, so group_picks is empty.
  const koBracket = { group_picks: {}, knockout_picks: fx.knockout_results };
  function setKoBracket(updater) {
    setFx((s) => {
      const cur = { group_picks: {}, knockout_picks: s.knockout_results || {} };
      const next = typeof updater === 'function' ? updater(cur) : updater;
      return { ...s, knockout_results: next.knockout_picks || {} };
    });
  }

  async function save() {
    setBusy(true); setMsg(null); setErr(null);
    const { error } = await supabase.from('fixture_state').upsert({
      id: 1,
      group_results: fx.group_results,
      third_place_assignments: fx.third_place_assignments,
      knockout_results: fx.knockout_results,
      awards_results: fx.awards_results,
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setMsg('Results saved. Leaderboard and every score updated.');
  }

  // Clears only the section currently on screen (group stage / a single
  // knockout round / awards). Local only — press Save to write it.
  function clearSection() {
    setMsg(null); setErr(null);
    if (view === 'GROUPS') {
      if (!confirm('Clear all group results and 3rd-place assignments on this tab? Press Save afterwards to apply.')) return;
      setFx((s) => ({ ...s, group_results: {}, third_place_assignments: {} }));
      setMsg('Group stage cleared locally — press Save to apply.');
    } else if (view === 'AWARDS') {
      if (!confirm('Clear all three award winners? Press Save afterwards to apply.')) return;
      setFx((s) => ({ ...s, awards_results: {} }));
      setMsg('Awards cleared locally — press Save to apply.');
    } else if (view === 'KO') {
      const round = KO_ROUNDS.find((r) => r.id === koRound);
      if (!confirm(`Clear the ${round.label} results? Later rounds that depend on them will also reset. Press Save afterwards to apply.`)) return;
      setFx((s) => ({ ...s, knockout_results: clearKoFrom(s.knockout_results || {}, round.matches.map((m) => m.id)) }));
      setMsg(`${round.label} cleared locally — press Save to apply.`);
    }
  }

  // Wipes every knockout result (all rounds). Useful to clear out any stale /
  // orphaned winners before the real knockouts begin.
  function clearAllKnockout() {
    setMsg(null); setErr(null);
    if (!confirm('Clear ALL knockout results across every round? Press Save afterwards to apply. (Group results, thirds and awards are untouched.)')) return;
    setFx((s) => ({ ...s, knockout_results: {} }));
    setMsg('All knockout results cleared locally — press Save to apply.');
  }

  if (loading) return <div className="text-muted">Loading…</div>;

  const thirdSlots = R32.flatMap((m) => {
    const out = [];
    if (m.a.kind === 'third') out.push({ key: `${m.id}_a`, match: m, options: m.a.options });
    if (m.b.kind === 'third') out.push({ key: `${m.id}_b`, match: m, options: m.b.options });
    return out;
  });

  const showSaveBar = view !== 'REVIEWS' && view !== 'MATCHES';

  return (
    <div className="space-y-6">
      <header>
        <div className="display text-3xl text-gold">Admin — Tournament Results</div>
        <p className="text-muted text-sm mt-1">
          Enter the real results as the tournament unfolds. Start with the group stage (this fills in
          real teams across everyone's knockout bracket), then record the winner of each knockout
          match on each match day, plus the three award winners. Every player's score and the
          leaderboard update from what you enter here.
        </p>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {VIEWS.map((v) => (
          <button key={v.id} onClick={() => setView(v.id)}
            className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap border
              ${view === v.id ? 'border-gold text-gold bg-gold/10' : 'border-border text-muted hover:text-white'}`}>
            {v.label}
          </button>
        ))}
      </div>

      {view === 'GROUPS' && (
        <>
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
            <p className="text-muted text-sm mb-3">For each "3rd from X/Y/Z" Round-of-32 slot, choose the team FIFA assigned. The eight teams you pick here are the advancing best-third teams used to score that side bet.</p>
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
        </>
      )}

      {view === 'KO' && (
        <section>
          <div className="display text-xl text-gold mb-2">Knockout results</div>
          <p className="text-muted text-sm mb-3">
            Record the actual winner of each match. Teams appear once the group results above are
            filled in, and each round unlocks as you set the previous one. This is the same bracket
            interface the players use.
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {KO_ROUNDS.map((r) => (
              <button key={r.id} onClick={() => setKoRound(r.id)}
                className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap border
                  ${koRound === r.id ? 'border-gold text-gold bg-gold/10' : 'border-border text-muted hover:text-white'}`}>
                {r.label}
              </button>
            ))}
            <button onClick={clearAllKnockout}
              className="ml-auto px-3 py-1.5 rounded-md text-sm whitespace-nowrap border border-red-700/40 text-red-300 hover:border-red-500">
              Clear all knockout results
            </button>
          </div>
          <KnockoutTab
            round={koRound}
            bracket={koBracket}
            fixture={fx}
            setBracket={setKoBracket}
            locked={false}
          />
        </section>
      )}

      {view === 'AWARDS' && (
        <section>
          <div className="display text-xl text-gold mb-2">Award winners</div>
          <p className="text-muted text-sm mb-3">
            Enter the winner's name. You can list several accepted spellings separated by
            commas — for example <span className="text-white">Messi, Lionel Messi, Leo Messi</span> — and a
            player scores if their pick matches <span className="text-white">any</span> of them. Case, accents,
            and punctuation are ignored, so don't bother with those variations.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {AWARD_KEYS.map((key) => (
              <label key={key} className="card block">
                <div className="text-sm text-white mb-1">{AWARD_META[key].label}</div>
                <div className="text-[11px] text-muted mb-2">{AWARD_META[key].hint}</div>
                <input
                  type="text"
                  value={fx.awards_results[key] || ''}
                  onChange={(e) => setAward(key, e.target.value)}
                  placeholder="e.g. Messi, Lionel Messi"
                  maxLength={200}
                  className="w-full px-2 py-1.5 rounded-md bg-black/30 border border-border text-sm text-white placeholder:text-muted/60 focus:outline-none focus:border-gold"
                />
              </label>
            ))}
          </div>
        </section>
      )}

      {view === 'MATCHES' && <MatchResults />}

      {view === 'REVIEWS' && <ReviewsModeration />}

      {showSaveBar && (
        <div className="sticky bottom-3 z-10 flex flex-wrap justify-end items-center gap-2">
          {msg && <span className="text-sm text-emerald-400">{msg}</span>}
          {err && <span className="text-sm text-red-400">{err}</span>}
          <button onClick={clearSection} disabled={busy} className="btn-secondary text-sm border-red-700/40 text-red-300 hover:border-red-500">
            Clear this section
          </button>
          <button onClick={save} disabled={busy} className="btn-primary">{busy ? 'Saving…' : 'Save results'}</button>
        </div>
      )}
    </div>
  );
}

// ─── Group-stage match results (each change saves immediately) ──────────────
function MatchResults() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [err, setErr] = useState(null);

  async function load() {
    setLoading(true); setErr(null);
    const { data, error } = await supabase.from('group_matches').select('*').order('kickoff', { ascending: true });
    if (error) setErr(error.message);
    setMatches(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function setResult(m, value) {
    setSavingId(m.id); setErr(null);
    const result = value || null;
    const { error } = await supabase.from('group_matches').update({ result }).eq('id', m.id);
    setSavingId(null);
    if (error) setErr(error.message);
    else setMatches((ms) => ms.map((x) => (x.id === m.id ? { ...x, result } : x)));
  }

  if (loading) return <div className="text-muted">Loading fixtures…</div>;

  const entered = matches.filter((m) => m.result).length;

  // Group by local calendar day (already sorted by kickoff).
  const byDay = [];
  for (const m of matches) {
    const key = new Date(m.kickoff).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const last = byDay[byDay.length - 1];
    if (last && last.key === key) last.items.push(m);
    else byDay.push({ key, items: [m] });
  }

  return (
    <section className="space-y-4">
      <div>
        <div className="display text-xl text-gold mb-1">Group-stage match results</div>
        <p className="text-muted text-sm">
          Set the actual outcome of each group game — each correct prediction scores players 0.5
          points. Changes save automatically. ({entered} / {matches.length} entered)
        </p>
      </div>
      {err && <div className="card border-red-700/40 text-red-300 text-sm">{err}</div>}

      {byDay.map((day) => (
        <div key={day.key}>
          <div className="label mb-2">{day.key}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {day.items.map((m) => (
              <div key={m.id} className="card flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-muted">Group {m.group_letter} · {new Date(m.kickoff).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' })}</div>
                  <div className="text-sm text-white truncate">{teamLabel(m.team_a)} v {teamLabel(m.team_b)}</div>
                </div>
                <select
                  className="select w-40 shrink-0"
                  value={m.result || ''}
                  disabled={savingId === m.id}
                  onChange={(e) => setResult(m, e.target.value)}
                >
                  <option value="">— not played —</option>
                  <option value={m.team_a}>{teamLabel(m.team_a)} win</option>
                  <option value="DRAW">Draw</option>
                  <option value={m.team_b}>{teamLabel(m.team_b)} win</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

// ─── Reviews moderation (actions write immediately, no global Save) ─────────
function ReviewsModeration() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [err, setErr] = useState(null);

  async function load() {
    setLoading(true); setErr(null);
    const { data, error } = await supabase
      .from('reviews')
      .select('user_id, rating, body, approved, created_at, profiles(display_name)')
      .order('created_at', { ascending: false });
    if (error) setErr(error.message);
    setReviews(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function setApproved(userId, approved) {
    const { error } = await supabase.from('reviews').update({ approved }).eq('user_id', userId);
    if (error) setErr(error.message); else load();
  }

  async function remove(userId) {
    if (!confirm('Delete this review permanently?')) return;
    const { error } = await supabase.from('reviews').delete().eq('user_id', userId);
    if (error) setErr(error.message); else load();
  }

  if (loading) return <div className="text-muted">Loading reviews…</div>;

  const pending = reviews.filter((r) => !r.approved);
  const approved = reviews.filter((r) => r.approved);

  return (
    <section className="space-y-4">
      <div>
        <div className="display text-xl text-gold mb-1">Reviews</div>
        <p className="text-muted text-sm">
          Approve a review to show it on the landing page. Nothing appears publicly until you
          approve it.
        </p>
      </div>
      {err && <div className="card border-red-700/40 text-red-300 text-sm">{err}</div>}

      <div>
        <div className="label mb-2">Pending ({pending.length})</div>
        {pending.length === 0 && <div className="text-muted text-sm">Nothing waiting.</div>}
        <div className="space-y-2">
          {pending.map((r) => (
            <ReviewCard key={r.user_id} r={r}
              actions={
                <>
                  <button onClick={() => setApproved(r.user_id, true)} className="btn-secondary text-xs border-emerald-700/40 text-emerald-300 hover:border-emerald-500">Approve</button>
                  <button onClick={() => remove(r.user_id)} className="btn-secondary text-xs border-red-700/40 text-red-300 hover:border-red-500">Delete</button>
                </>
              } />
          ))}
        </div>
      </div>

      <div>
        <div className="label mb-2">Live on landing page ({approved.length})</div>
        {approved.length === 0 && <div className="text-muted text-sm">None yet.</div>}
        <div className="space-y-2">
          {approved.map((r) => (
            <ReviewCard key={r.user_id} r={r}
              actions={
                <>
                  <button onClick={() => setApproved(r.user_id, false)} className="btn-secondary text-xs">Unpublish</button>
                  <button onClick={() => remove(r.user_id)} className="btn-secondary text-xs border-red-700/40 text-red-300 hover:border-red-500">Delete</button>
                </>
              } />
          ))}
        </div>
      </div>
    </section>
  );
}

function ReviewCard({ r, actions }) {
  return (
    <div className="card flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-gold">{'★'.repeat(r.rating)}<span className="text-muted">{'★'.repeat(5 - r.rating)}</span></span>
          <span className="text-sm text-white truncate">{r.profiles?.display_name || 'Player'}</span>
        </div>
        <p className="text-sm text-muted mt-1 break-words">{r.body}</p>
      </div>
      <div className="flex flex-col gap-1.5 shrink-0">{actions}</div>
    </div>
  );
}

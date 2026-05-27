import { R32, R16, QF, SF, FINAL, THIRD_PLACE, resolveSlot, resolveParent, resolveThirdPlaceSide, matchLabel, descendantsOf } from '../../lib/bracket.js';
import { TEAMS, teamLabel } from '../../lib/teams.js';
import Flag from '../../components/Flag.jsx';

// `round` is 'R32' | 'R16' | 'QF' | 'SF' | 'FINAL'
export default function KnockoutTab({ round, bracket, fixture, setBracket, locked, readOnly }) {
  const disabled = locked || readOnly;
  const ctx = {
    groupPicks: bracket?.group_picks || {},
    knockoutPicks: bracket?.knockout_picks || {},
    fixture: fixture || { group_results: {}, third_place_assignments: {} },
  };

  function pick(matchId, code) {
    setBracket((b) => {
      const oldCode = b.knockout_picks?.[matchId] || null;
      const newCode = code || null;
      if (oldCode === newCode) return b;
      const knockout = { ...(b.knockout_picks || {}), [matchId]: newCode };
      // Cascade clear: any downstream pick referenced this match's winner;
      // those picks are now potentially invalid. Force re-confirmation.
      for (const d of descendantsOf(matchId)) {
        if (knockout[d]) delete knockout[d];
      }
      return { ...b, knockout_picks: knockout };
    });
  }

  function rowFor(matchId, date, sides) {
    const [aSide, bSide] = sides;
    const matchLocked = disabled || aSide.locked || bSide.locked || !aSide.code || !bSide.code;
    return (
      <MatchRow
        key={matchId}
        matchId={matchId}
        date={date}
        sides={sides}
        pickedCode={ctx.knockoutPicks[matchId] || ''}
        matchLocked={matchLocked}
        onPick={(code) => pick(matchId, code)}
      />
    );
  }

  if (round === 'R32') {
    return (
      <div>
        <Helper text="Each card is labeled L1–L8 (left half) or R1–R8 (right half). Later rounds reference these labels — e.g. R16 LA = winner of L1 vs winner of L2." />
        {R32.map((m) => {
          const aSide = resolveSlot(m.a, { ...ctx, matchId: m.id, which: 'a' });
          const bSide = resolveSlot(m.b, { ...ctx, matchId: m.id, which: 'b' });
          return rowFor(m.id, m.date, [aSide, bSide]);
        })}
      </div>
    );
  }

  if (round === 'R16') {
    return (
      <div>
        <Helper text="LA = winner of L1 vs winner of L2. Open the Full Bracket tab to see the whole tree." />
        {R16.map((m) => rowFor(m.id, m.date, [resolveParent(m.parents[0], ctx), resolveParent(m.parents[1], ctx)]))}
      </div>
    );
  }

  if (round === 'QF') {
    return (
      <div>
        {QF.map((m) => rowFor(m.id, m.date, [resolveParent(m.parents[0], ctx), resolveParent(m.parents[1], ctx)]))}
      </div>
    );
  }

  if (round === 'SF') {
    return (
      <div>
        {SF.map((m) => rowFor(m.id, m.date, [resolveParent(m.parents[0], ctx), resolveParent(m.parents[1], ctx)]))}
      </div>
    );
  }

  if (round === 'FINAL') {
    const fA = resolveParent(FINAL.parents[0], ctx);
    const fB = resolveParent(FINAL.parents[1], ctx);
    const tA = resolveThirdPlaceSide(THIRD_PLACE.parents[0], ctx);
    const tB = resolveThirdPlaceSide(THIRD_PLACE.parents[1], ctx);
    return (
      <div className="space-y-4">
        <div>
          <div className="display text-xl text-gold mb-1">🏆 Final</div>
          <div className="text-xs text-muted mb-2">July 19, 2026 — MetLife Stadium</div>
          {rowFor('FINAL', FINAL.date, [fA, fB])}
        </div>
        <div>
          <div className="display text-xl text-gold mb-1">🥉 Third-Place Playoff</div>
          <div className="text-xs text-muted mb-2">July 18, 2026</div>
          {rowFor('THIRD_PLACE', THIRD_PLACE.date, [tA, tB])}
        </div>
      </div>
    );
  }

  return null;
}

// ─── stable child components (defined at module scope so React doesn't ───
// ─── unmount/remount on every parent render — that was causing scroll  ───
// ─── position to reset to top whenever a pick was made.                ───

function MatchRow({ matchId, date, sides, pickedCode, matchLocked, onPick }) {
  const [aSide, bSide] = sides;
  return (
    <div className="card mb-2">
      <div className="flex items-center justify-between mb-2">
        <span className="chip bg-panel2 text-gold border border-gold/30">{matchLabel(matchId)}</span>
        {date && <div className="text-xs text-muted">{date}</div>}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <SideLabel side={aSide} highlighted={pickedCode === aSide.code} align="left" />
        <span className="text-muted text-xs">vs</span>
        <SideLabel side={bSide} highlighted={pickedCode === bSide.code} align="right" />
      </div>
      <div className="mt-2">
        <select
          className="select"
          disabled={matchLocked}
          value={pickedCode || ''}
          onChange={(e) => onPick(e.target.value)}
        >
          <option value="">
            {matchLocked ? 'Locked — both teams not yet determined' : '— pick winner —'}
          </option>
          {[aSide.code, bSide.code].filter(Boolean).map((c) => (
            <option key={c} value={c}>{teamLabel(c)}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function Helper({ text }) {
  return <div className="text-xs text-muted mb-3">{text}</div>;
}

function SideLabel({ side, highlighted, align = 'left' }) {
  const rowDir = align === 'right' ? 'flex-row-reverse' : 'flex-row';
  const text = side.locked ? (side.reason || side.placeholder || 'TBD') : null;
  const isStructured = side.locked && side.placeholder && side.placeholder !== 'TBD' && !side.reason;

  if (side.locked) {
    return (
      <div className={`flex items-center gap-1.5 text-sm ${rowDir} ${highlighted ? 'text-gold' : 'text-muted'}`}>
        {isStructured
          ? <span className="font-mono text-xs px-1.5 py-0.5 rounded border border-border bg-panel2">{text}</span>
          : <><span aria-hidden>🔒</span><span className="truncate">{text}</span></>
        }
      </div>
    );
  }
  if (!side.code) return <div className={`text-muted text-sm ${align === 'right' ? 'text-right' : ''}`}>TBD</div>;
  const t = TEAMS[side.code];
  return (
    <div className={`flex items-center gap-2 text-sm font-semibold ${rowDir} ${highlighted ? 'text-gold' : ''}`}>
      <Flag code={side.code} size="sm" />
      <span className="truncate">{t?.name || side.code}</span>
    </div>
  );
}

import { R32, R16, QF, SF, FINAL, THIRD_PLACE, resolveSlot, resolveParent, resolveThirdPlaceSide, matchLabel } from '../../lib/bracket.js';
import { TEAMS } from '../../lib/teams.js';
import Flag from '../../components/Flag.jsx';

// Read-only convergence view. Shows the whole bracket: R32 → R16 → QF → SF
// → Final in the middle, third-place playoff below. Left half on the left,
// right half on the right (mirroring the FIFA reference graphic).
//
// Layout: a horizontal CSS grid with 9 columns:
//   L-R32 | L-R16 | L-QF | L-SF | FINAL | R-SF | R-QF | R-R16 | R-R32
// Each match cell uses flexbox to vertically center within its row band.
export default function FullBracketTab({ bracket, fixture }) {
  const ctx = {
    groupPicks: bracket?.group_picks || {},
    knockoutPicks: bracket?.knockout_picks || {},
    fixture: fixture || { group_results: {}, third_place_assignments: {} },
  };

  // Pre-resolve each match's two sides for display.
  const r32Sides = Object.fromEntries(R32.map((m) => [m.id, [
    resolveSlot(m.a, { ...ctx, matchId: m.id, which: 'a' }),
    resolveSlot(m.b, { ...ctx, matchId: m.id, which: 'b' }),
  ]]));
  const parentSides = (m) => [resolveParent(m.parents[0], ctx), resolveParent(m.parents[1], ctx)];

  const r16Sides = Object.fromEntries(R16.map((m) => [m.id, parentSides(m)]));
  const qfSides  = Object.fromEntries(QF.map((m)  => [m.id, parentSides(m)]));
  const sfSides  = Object.fromEntries(SF.map((m)  => [m.id, parentSides(m)]));
  const finalSides = parentSides(FINAL);
  const thirdSides = [
    resolveThirdPlaceSide(THIRD_PLACE.parents[0], ctx),
    resolveThirdPlaceSide(THIRD_PLACE.parents[1], ctx),
  ];

  const leftR32  = R32.filter((m) => m.id.startsWith('R32_L'));
  const rightR32 = R32.filter((m) => m.id.startsWith('R32_R'));
  const leftR16  = R16.filter((m) => m.id.startsWith('R16_L'));
  const rightR16 = R16.filter((m) => m.id.startsWith('R16_R'));
  const leftQF   = QF.filter((m)  => m.id.startsWith('QF_L'));
  const rightQF  = QF.filter((m)  => m.id.startsWith('QF_R'));
  const leftSF   = SF.filter((m)  => m.id === 'SF_L');
  const rightSF  = SF.filter((m)  => m.id === 'SF_R');

  return (
    <div>
      <div className="text-xs text-muted mb-3">
        Read-only view of your bracket. Picks are highlighted in gold. To change picks, use the round-specific tabs.
      </div>

      {/* The bracket needs to scroll horizontally on mobile. */}
      <div className="overflow-x-auto pb-3 -mx-3 px-3">
        <div className="min-w-[1100px]">
          <div className="grid grid-cols-9 gap-2 items-stretch">
            {/* ─── LEFT HALF ─── */}
            <Col matches={leftR32}  sides={r32Sides} header="R32"  rows={8}  ctx={ctx} />
            <Col matches={leftR16}  sides={r16Sides} header="R16"  rows={8}  ctx={ctx} spacing={1} />
            <Col matches={leftQF}   sides={qfSides}  header="QF"   rows={8}  ctx={ctx} spacing={3} />
            <Col matches={leftSF}   sides={sfSides}  header="SF"   rows={8}  ctx={ctx} spacing={7} />

            {/* ─── FINAL (centered) ─── */}
            <div className="flex flex-col items-stretch justify-center">
              <div className="text-xs text-muted text-center mb-2">FINAL</div>
              <MatchCell matchId="FINAL" date={FINAL.date} sides={finalSides} pickedCode={ctx.knockoutPicks.FINAL} highlight />
              <div className="text-xs text-muted text-center mt-4 mb-2">3rd-PLACE</div>
              <MatchCell matchId="THIRD_PLACE" date={THIRD_PLACE.date} sides={thirdSides} pickedCode={ctx.knockoutPicks.THIRD_PLACE} />
            </div>

            {/* ─── RIGHT HALF (mirrored: SF → R32) ─── */}
            <Col matches={rightSF}  sides={sfSides}  header="SF"   rows={8}  ctx={ctx} spacing={7} />
            <Col matches={rightQF}  sides={qfSides}  header="QF"   rows={8}  ctx={ctx} spacing={3} />
            <Col matches={rightR16} sides={r16Sides} header="R16"  rows={8}  ctx={ctx} spacing={1} />
            <Col matches={rightR32} sides={r32Sides} header="R32"  rows={8}  ctx={ctx} />
          </div>
        </div>
      </div>
    </div>
  );
}

// A column of N matches, vertically distributed. `spacing` adds vertical gap
// units between matches to keep them visually aligned with their parents.
function Col({ matches, sides, header, ctx, spacing = 0 }) {
  return (
    <div className="flex flex-col">
      <div className="text-xs text-muted text-center mb-2">{header}</div>
      <div className={`flex flex-col h-full justify-around`} style={{ gap: `${spacing * 0.75}rem` }}>
        {matches.map((m) => (
          <MatchCell
            key={m.id}
            matchId={m.id}
            date={m.date}
            sides={sides[m.id]}
            pickedCode={ctx.knockoutPicks[m.id]}
          />
        ))}
      </div>
    </div>
  );
}

function MatchCell({ matchId, sides, date, pickedCode, highlight = false }) {
  const [a, b] = sides;
  return (
    <div className={`rounded-md border ${highlight ? 'border-gold/50 bg-gold/5' : 'border-border bg-panel'} p-2 text-xs`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-gold font-bold">{matchLabel(matchId)}</span>
        {date && <span className="text-muted text-[10px]">{date}</span>}
      </div>
      <CellSide side={a} highlighted={pickedCode === a?.code} />
      <CellSide side={b} highlighted={pickedCode === b?.code} />
    </div>
  );
}

function CellSide({ side, highlighted }) {
  if (!side) return <div className="text-muted text-[11px] py-0.5">—</div>;
  if (side.locked) {
    const text = side.placeholder || side.reason || 'TBD';
    const isStructured = side.placeholder && side.placeholder !== 'TBD';
    return (
      <div className={`flex items-center gap-1.5 py-0.5 ${highlighted ? 'text-gold' : 'text-muted'}`}>
        {isStructured
          ? <span className="font-mono text-[10px] px-1 py-0.5 rounded border border-border bg-panel2">{text}</span>
          : <><span aria-hidden>🔒</span><span className="truncate text-[11px]">{text}</span></>
        }
      </div>
    );
  }
  if (!side.code) return <div className="text-muted text-[11px] py-0.5">TBD</div>;
  const t = TEAMS[side.code];
  return (
    <div className={`flex items-center gap-1.5 py-0.5 ${highlighted ? 'text-gold font-semibold' : ''}`}>
      <Flag code={side.code} size="sm" />
      <span className="truncate">{t?.name || side.code}</span>
    </div>
  );
}

// R32 match definitions per the blueprint (§10).
// Each match has two "slot" descriptors. A slot is one of:
//   { kind:'winner',   group:'A' }     -> the team that won group A
//   { kind:'runnerUp', group:'A' }     -> the team that finished 2nd in group A
//   { kind:'third',    options:['A','B','C','D','F'] } -> one of 3rd-place teams
//                                                         from those groups
//                                                         (admin assigns)

// Match IDs use FIFA-style numbering (R32 = 73..88; not authoritative but
// stable within this app — refer to bracketRounds for the actual match order).

export const R32 = [
  // Left half (top -> bottom)
  { id: 'R32_L1', date: 'Jun 29', a: { kind: 'winner',   group: 'E' }, b: { kind: 'third', options: ['A','B','C','D','F'] } },
  { id: 'R32_L2', date: 'Jun 30', a: { kind: 'winner',   group: 'I' }, b: { kind: 'third', options: ['C','D','F','G','H'] } },
  { id: 'R32_L3', date: 'Jun 28', a: { kind: 'runnerUp', group: 'A' }, b: { kind: 'runnerUp', group: 'B' } },
  { id: 'R32_L4', date: 'Jun 29', a: { kind: 'winner',   group: 'F' }, b: { kind: 'runnerUp', group: 'C' } },
  { id: 'R32_L5', date: 'Jul 2',  a: { kind: 'runnerUp', group: 'K' }, b: { kind: 'runnerUp', group: 'L' } },
  { id: 'R32_L6', date: 'Jul 2',  a: { kind: 'winner',   group: 'H' }, b: { kind: 'runnerUp', group: 'J' } },
  { id: 'R32_L7', date: 'Jul 1',  a: { kind: 'winner',   group: 'D' }, b: { kind: 'third', options: ['B','E','F','I','J'] } },
  { id: 'R32_L8', date: 'Jul 1',  a: { kind: 'winner',   group: 'G' }, b: { kind: 'third', options: ['A','E','H','I','J'] } },
  // Right half (top -> bottom)
  { id: 'R32_R1', date: 'Jun 29', a: { kind: 'winner',   group: 'C' }, b: { kind: 'runnerUp', group: 'F' } },
  { id: 'R32_R2', date: 'Jun 30', a: { kind: 'runnerUp', group: 'E' }, b: { kind: 'runnerUp', group: 'I' } },
  { id: 'R32_R3', date: 'Jun 30', a: { kind: 'winner',   group: 'A' }, b: { kind: 'third', options: ['C','E','F','H','I'] } },
  { id: 'R32_R4', date: 'Jul 1',  a: { kind: 'winner',   group: 'L' }, b: { kind: 'third', options: ['E','H','I','J','K'] } },
  { id: 'R32_R5', date: 'Jul 3',  a: { kind: 'winner',   group: 'J' }, b: { kind: 'runnerUp', group: 'H' } },
  { id: 'R32_R6', date: 'Jul 3',  a: { kind: 'runnerUp', group: 'D' }, b: { kind: 'runnerUp', group: 'G' } },
  { id: 'R32_R7', date: 'Jul 2',  a: { kind: 'winner',   group: 'B' }, b: { kind: 'third', options: ['E','F','G','I','J'] } },
  { id: 'R32_R8', date: 'Jul 3',  a: { kind: 'winner',   group: 'K' }, b: { kind: 'third', options: ['D','E','I','J','L'] } },
];

// Knockout rounds beyond R32 are derived: parents combine, sequentially.
// Dates are approximate per the published FIFA WC 2026 schedule
// (R16 Jul 4–7, QF Jul 9–11, SF Jul 14–15, 3rd-place Jul 18, Final Jul 19).
// Verify against the official fixtures before launch.
export const R16 = [
  { id: 'R16_L1', date: 'Jul 4', parents: ['R32_L1', 'R32_L2'] },
  { id: 'R16_L2', date: 'Jul 4', parents: ['R32_L3', 'R32_L4'] },
  { id: 'R16_L3', date: 'Jul 5', parents: ['R32_L5', 'R32_L6'] },
  { id: 'R16_L4', date: 'Jul 5', parents: ['R32_L7', 'R32_L8'] },
  { id: 'R16_R1', date: 'Jul 6', parents: ['R32_R1', 'R32_R2'] },
  { id: 'R16_R2', date: 'Jul 6', parents: ['R32_R3', 'R32_R4'] },
  { id: 'R16_R3', date: 'Jul 7', parents: ['R32_R5', 'R32_R6'] },
  { id: 'R16_R4', date: 'Jul 7', parents: ['R32_R7', 'R32_R8'] },
];

export const QF = [
  { id: 'QF_L1', date: 'Jul 9',  parents: ['R16_L1', 'R16_L2'] },
  { id: 'QF_L2', date: 'Jul 10', parents: ['R16_L3', 'R16_L4'] },
  { id: 'QF_R1', date: 'Jul 10', parents: ['R16_R1', 'R16_R2'] },
  { id: 'QF_R2', date: 'Jul 11', parents: ['R16_R3', 'R16_R4'] },
];

export const SF = [
  { id: 'SF_L', date: 'Jul 14', parents: ['QF_L1', 'QF_L2'] },
  { id: 'SF_R', date: 'Jul 15', parents: ['QF_R1', 'QF_R2'] },
];

export const FINAL = { id: 'FINAL', date: 'Jul 19', parents: ['SF_L', 'SF_R'] };
export const THIRD_PLACE = { id: 'THIRD_PLACE', date: 'Jul 18', parents: ['SF_L', 'SF_R'], isLoserBracket: true };

export const ALL_KO_MATCHES = [
  ...R32.map((m) => ({ ...m, round: 'R32' })),
  ...R16.map((m) => ({ ...m, round: 'R16' })),
  ...QF.map((m)  => ({ ...m, round: 'QF'  })),
  ...SF.map((m)  => ({ ...m, round: 'SF'  })),
  { ...FINAL, round: 'FINAL' },
  { ...THIRD_PLACE, round: 'THIRD_PLACE' },
];

// Short human label per match (shown as a badge on each card, and as the
// "Winner of L1" reference in later rounds). Stable across rounds: L1..L8 /
// R1..R8 in R32; LA..LD / RA..RD in R16; LQ1/LQ2/RQ1/RQ2 in QF; SF L / SF R;
// Final / 3PO.
const MATCH_LABELS = {
  // R32 left
  R32_L1: 'L1', R32_L2: 'L2', R32_L3: 'L3', R32_L4: 'L4',
  R32_L5: 'L5', R32_L6: 'L6', R32_L7: 'L7', R32_L8: 'L8',
  // R32 right
  R32_R1: 'R1', R32_R2: 'R2', R32_R3: 'R3', R32_R4: 'R4',
  R32_R5: 'R5', R32_R6: 'R6', R32_R7: 'R7', R32_R8: 'R8',
  // R16
  R16_L1: 'LA', R16_L2: 'LB', R16_L3: 'LC', R16_L4: 'LD',
  R16_R1: 'RA', R16_R2: 'RB', R16_R3: 'RC', R16_R4: 'RD',
  // QF
  QF_L1: 'LQ1', QF_L2: 'LQ2', QF_R1: 'RQ1', QF_R2: 'RQ2',
  // SF
  SF_L: 'SF L', SF_R: 'SF R',
  // FINAL / 3rd
  FINAL: 'Final', THIRD_PLACE: '3rd-place',
};

export function matchLabel(id) { return MATCH_LABELS[id] || id; }

// Resolve the team code that occupies a given slot in a given match,
// given user's group_picks + admin fixture_state + user's knockout_picks.
// Returns { code, label, locked: true|false, reason: '...' }
//   - code: country code (or null if unknown)
//   - locked: whether the slot is "TBD — locked until admin sets it"
//   - reason: short status string for display
export function resolveSlot(slot, ctx) {
  const { groupPicks, fixture } = ctx;
  // Group winner / runner-up: use admin's fixture if set, else user's group pick.
  // If neither yet, show a structured placeholder ("A1" for winner of A,
  // "A2" for runner-up of A) rather than just "TBD".
  if (slot.kind === 'winner' || slot.kind === 'runnerUp') {
    const g = slot.group;
    const fx = fixture?.group_results?.[g];
    const fromFixture = fx ? (slot.kind === 'winner' ? fx.winner : fx.runnerUp) : null;
    if (fromFixture) return { code: fromFixture, locked: false };
    const gp = groupPicks?.[g];
    const fromPick = gp ? (slot.kind === 'winner' ? gp.winner : gp.runnerUp) : null;
    if (fromPick) return { code: fromPick, locked: false };
    return {
      code: null,
      locked: true,
      placeholder: `${g}${slot.kind === 'winner' ? '1' : '2'}`,
    };
  }
  // Third-place slot: only known after admin assigns. Until then show "TBD".
  if (slot.kind === 'third') {
    const matchId = ctx.matchId;
    const which = ctx.which; // 'a' or 'b'
    const assigned = fixture?.third_place_assignments?.[`${matchId}_${which}`];
    if (assigned) return { code: assigned, locked: false };
    return { code: null, locked: true, placeholder: 'TBD' };
  }
  return { code: null, locked: true, placeholder: 'TBD' };
}

// Compute team code occupying a side of any match (R16+) by walking the tree.
// Returns { code, locked, label } for the team the user picked in the parent match.
export function resolveParent(parentMatchId, ctx) {
  const pick = ctx.knockoutPicks?.[parentMatchId];
  if (pick) return { code: pick, locked: false };
  return {
    code: null,
    locked: true,
    placeholder: matchLabel(parentMatchId),                  // short, e.g. "L1" / "SF L" — for tight FullBracket cells
    reason: `Winner of ${matchLabel(parentMatchId)}`,        // prose, for KnockoutTab cards (plenty of width)
  };
}

// For Third-place playoff: the LOSER of each SF.
// We can't infer a loser without knowing the SF result, so until SF pick is
// made the slot is locked. Once user picks SF winner, "loser" = the other team.
export function resolveThirdPlaceSide(sfMatchId, ctx) {
  const placeholder = matchLabel(sfMatchId);
  const reason = `Loser of ${matchLabel(sfMatchId)}`;
  const sfWinner = ctx.knockoutPicks?.[sfMatchId];
  if (!sfWinner) return { code: null, locked: true, placeholder, reason };
  const sf = SF.find((m) => m.id === sfMatchId);
  if (!sf) return { code: null, locked: true, placeholder, reason };
  const [pA, pB] = sf.parents.map((p) => ctx.knockoutPicks?.[p]);
  if (!pA || !pB) return { code: null, locked: true, placeholder, reason };
  const loser = sfWinner === pA ? pB : pA;
  return { code: loser, locked: false };
}

// Bracket scoring — pure functions, no I/O.
//
// Compares a user's bracket (group_picks / third_place_bets / knockout_picks /
// awards_picks) against the admin-entered fixture_state (group_results /
// third_place_assignments / knockout_results / awards_results) and returns the
// total points + a per-category breakdown.
//
// The points table mirrors the one shown on the How To Play page (172 max):
//   Group winner correct   (×12)  1 pt   → 12
//   Group runner-up correct(×12)  1 pt   → 12
//   Best-8 thirds correct  (×8)   2 pts  → 16
//   R32 winner correct     (×16)  2 pts  → 32
//   R16 winner correct     (×8)   3 pts  → 24
//   QF winner correct      (×4)   5 pts  → 20
//   SF winner correct      (×2)   8 pts  → 16
//   3rd-place playoff winner       10 pts → 10
//   Champion correct               15 pts → 15
//   Golden Ball/Boot/Glove (×3)   5 pts  → 15
//                                          ─────
//                                           172

import { GROUPS } from './teams.js';
import { R32, R16, QF, SF } from './bracket.js';

export const POINTS = {
  groupWinner: 1,
  groupRunnerUp: 1,
  third: 2,
  r32: 2,
  r16: 3,
  qf: 5,
  sf: 8,
  thirdPlacePlayoff: 10,
  champion: 15,
  award: 5,
};

export const MAX_TOTAL = 172;          // bracket only

// Group-stage match prediction mini-game: 72 matches, 0.5 pts each.
export const MATCH_POINT = 0.5;
export const MATCH_GAME_COUNT = 72;
export const MATCH_GAME_MAX = MATCH_GAME_COUNT * MATCH_POINT;   // 36
export const COMBINED_MAX = MAX_TOTAL + MATCH_GAME_MAX;         // 208

export const AWARD_KEYS = ['golden_ball', 'golden_boot', 'golden_glove'];

// Score the match-prediction game. `predictions` is { matchId: pick } where a
// pick is a team code or 'DRAW'; `matches` is the group_matches rows (each with
// id + result). Returns { points, correct, decided } — `decided` is how many
// matches have a result entered (for "X / Y correct" displays).
export function scoreMatches(predictions, matches) {
  const preds = predictions || {};
  let correct = 0;
  let decided = 0;
  for (const m of (matches || [])) {
    if (!m.result) continue;
    decided++;
    if (preds[m.id] && preds[m.id] === m.result) correct++;
  }
  return { points: correct * MATCH_POINT, correct, decided };
}

// Awards are free-text; match case-insensitively and ignore surrounding
// whitespace + internal accents/punctuation differences ("Mbappé" === "mbappe").
function normName(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function countKoHits(matches, picks, results) {
  let n = 0;
  for (const m of matches) {
    const actual = results[m.id];
    if (actual && picks[m.id] === actual) n++;
  }
  return n;
}

// Returns { total, lines: [{ key, label, correct, of, each, points, max }] }.
// `total` is always 0..172. Categories with no actual results yet simply
// contribute 0 (a player's score climbs as the admin enters more results).
export function scoreBracket(bracket, fixture) {
  const gp  = bracket?.group_picks       || {};
  const tpb = bracket?.third_place_bets  || [];
  const kp  = bracket?.knockout_picks    || {};
  const ap  = bracket?.awards_picks      || {};

  const gr  = fixture?.group_results          || {};
  const tpa = fixture?.third_place_assignments || {};
  const kr  = fixture?.knockout_results        || {};
  const ar  = fixture?.awards_results          || {};

  // Group winners / runners-up
  let groupWinners = 0;
  let groupRunnersUp = 0;
  for (const g of GROUPS) {
    const actual = gr[g];
    if (!actual) continue;
    if (actual.winner   && gp[g]?.winner   === actual.winner)   groupWinners++;
    if (actual.runnerUp && gp[g]?.runnerUp === actual.runnerUp) groupRunnersUp++;
  }

  // Best-8 thirds: the teams the admin assigned to R32 "third" slots ARE the 8
  // thirds that actually advanced. Credit each picked team that's in that set.
  const actualThirds = new Set(Object.values(tpa).filter(Boolean));
  let thirds = 0;
  for (const code of tpb) if (actualThirds.has(code)) thirds++;

  // Knockout rounds
  const r32        = countKoHits(R32, kp, kr);
  const r16        = countKoHits(R16, kp, kr);
  const qf         = countKoHits(QF,  kp, kr);
  const sf         = countKoHits(SF,  kp, kr);
  const thirdPlace = kr.THIRD_PLACE && kp.THIRD_PLACE === kr.THIRD_PLACE ? 1 : 0;
  const champion   = kr.FINAL       && kp.FINAL       === kr.FINAL       ? 1 : 0;

  // Awards (case/accent-insensitive exact match)
  let awards = 0;
  for (const key of AWARD_KEYS) {
    const actual = normName(ar[key]);
    if (actual && normName(ap[key]) === actual) awards++;
  }

  const lines = [
    { key: 'groupWinner',   label: 'Group winners',     correct: groupWinners,   of: 12, each: POINTS.groupWinner },
    { key: 'groupRunnerUp', label: 'Group runners-up',  correct: groupRunnersUp, of: 12, each: POINTS.groupRunnerUp },
    { key: 'third',         label: 'Best-8 thirds',     correct: thirds,         of: 8,  each: POINTS.third },
    { key: 'r32',           label: 'Round of 32',       correct: r32,            of: 16, each: POINTS.r32 },
    { key: 'r16',           label: 'Round of 16',       correct: r16,            of: 8,  each: POINTS.r16 },
    { key: 'qf',            label: 'Quarter-finals',    correct: qf,             of: 4,  each: POINTS.qf },
    { key: 'sf',            label: 'Semi-finals',       correct: sf,             of: 2,  each: POINTS.sf },
    { key: 'thirdPlace',    label: '3rd-place playoff', correct: thirdPlace,     of: 1,  each: POINTS.thirdPlacePlayoff },
    { key: 'champion',      label: 'Champion',          correct: champion,       of: 1,  each: POINTS.champion },
    { key: 'awards',        label: 'Individual awards', correct: awards,         of: 3,  each: POINTS.award },
  ].map((l) => ({ ...l, points: l.correct * l.each, max: l.of * l.each }));

  const total = lines.reduce((s, l) => s + l.points, 0);
  return { total, lines };
}

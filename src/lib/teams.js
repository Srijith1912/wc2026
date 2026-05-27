// Final 48-team World Cup 2026 group assignments, verified against
// Wikipedia and FIFA sources (final draw + March 2026 playoff results).
//
// `iso` = code used by flagcdn.com (ISO 3166-1 alpha-2; gb-eng / gb-sct for
// England / Scotland).

export const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

export const TEAMS = {
  // Group A
  MEX: { name: 'Mexico',               iso: 'mx',     group: 'A' },
  RSA: { name: 'South Africa',         iso: 'za',     group: 'A' },
  KOR: { name: 'South Korea',          iso: 'kr',     group: 'A' },
  CZE: { name: 'Czech Republic',       iso: 'cz',     group: 'A' },
  // Group B
  CAN: { name: 'Canada',               iso: 'ca',     group: 'B' },
  BIH: { name: 'Bosnia & Herzegovina', iso: 'ba',     group: 'B' },
  QAT: { name: 'Qatar',                iso: 'qa',     group: 'B' },
  SUI: { name: 'Switzerland',          iso: 'ch',     group: 'B' },
  // Group C
  BRA: { name: 'Brazil',               iso: 'br',     group: 'C' },
  MAR: { name: 'Morocco',              iso: 'ma',     group: 'C' },
  HAI: { name: 'Haiti',                iso: 'ht',     group: 'C' },
  SCO: { name: 'Scotland',             iso: 'gb-sct', group: 'C' },
  // Group D
  USA: { name: 'USA',                  iso: 'us',     group: 'D' },
  PAR: { name: 'Paraguay',             iso: 'py',     group: 'D' },
  AUS: { name: 'Australia',            iso: 'au',     group: 'D' },
  TUR: { name: 'Türkiye',              iso: 'tr',     group: 'D' },
  // Group E
  GER: { name: 'Germany',              iso: 'de',     group: 'E' },
  CUW: { name: 'Curaçao',              iso: 'cw',     group: 'E' },
  CIV: { name: 'Ivory Coast',          iso: 'ci',     group: 'E' },
  ECU: { name: 'Ecuador',              iso: 'ec',     group: 'E' },
  // Group F
  NED: { name: 'Netherlands',          iso: 'nl',     group: 'F' },
  JPN: { name: 'Japan',                iso: 'jp',     group: 'F' },
  SWE: { name: 'Sweden',               iso: 'se',     group: 'F' },
  TUN: { name: 'Tunisia',              iso: 'tn',     group: 'F' },
  // Group G
  BEL: { name: 'Belgium',              iso: 'be',     group: 'G' },
  EGY: { name: 'Egypt',                iso: 'eg',     group: 'G' },
  IRN: { name: 'Iran',                 iso: 'ir',     group: 'G' },
  NZL: { name: 'New Zealand',          iso: 'nz',     group: 'G' },
  // Group H
  ESP: { name: 'Spain',                iso: 'es',     group: 'H' },
  CPV: { name: 'Cape Verde',           iso: 'cv',     group: 'H' },
  KSA: { name: 'Saudi Arabia',         iso: 'sa',     group: 'H' },
  URU: { name: 'Uruguay',              iso: 'uy',     group: 'H' },
  // Group I
  FRA: { name: 'France',               iso: 'fr',     group: 'I' },
  SEN: { name: 'Senegal',              iso: 'sn',     group: 'I' },
  IRQ: { name: 'Iraq',                 iso: 'iq',     group: 'I' },
  NOR: { name: 'Norway',               iso: 'no',     group: 'I' },
  // Group J
  ARG: { name: 'Argentina',            iso: 'ar',     group: 'J' },
  ALG: { name: 'Algeria',              iso: 'dz',     group: 'J' },
  AUT: { name: 'Austria',              iso: 'at',     group: 'J' },
  JOR: { name: 'Jordan',               iso: 'jo',     group: 'J' },
  // Group K
  POR: { name: 'Portugal',             iso: 'pt',     group: 'K' },
  COD: { name: 'DR Congo',             iso: 'cd',     group: 'K' },
  UZB: { name: 'Uzbekistan',           iso: 'uz',     group: 'K' },
  COL: { name: 'Colombia',             iso: 'co',     group: 'K' },
  // Group L
  ENG: { name: 'England',              iso: 'gb-eng', group: 'L' },
  CRO: { name: 'Croatia',              iso: 'hr',     group: 'L' },
  GHA: { name: 'Ghana',                iso: 'gh',     group: 'L' },
  PAN: { name: 'Panama',               iso: 'pa',     group: 'L' },
};

export const ALL_CODES = Object.keys(TEAMS);

export function teamsInGroup(g) {
  return ALL_CODES.filter((c) => TEAMS[c].group === g);
}

// Plain text label (no flag) — for use inside <select> options, which can't
// render images. We rely on the flag being shown elsewhere in the UI.
export function teamLabel(code) {
  if (!code) return '';
  const t = TEAMS[code];
  return t ? t.name : code;
}

export function flagUrl(iso, w = 40) {
  if (!iso) return '';
  return `https://flagcdn.com/w${w}/${iso}.png`;
}

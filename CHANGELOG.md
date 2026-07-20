# Changelog

A running log of the WC 2026 Predictions app, from first build through the end
of the tournament. Dates are the date the work landed.

## 2026-07-20 — Tournament complete 🏆

The 2026 FIFA World Cup is over — **Spain are champions** — and the app is wrapped.

- **End-of-tournament summary.** The Bracket page now closes with a celebration
  card: the champion, where you finished in each group you joined *and* on the
  overall leaderboard, and a thank-you for playing. Replaces the group-stage
  "that's a wrap" message.
- **Award ✓/✗ signifiers.** Each individual award (Golden Ball / Boot / Glove)
  shows a tick or cross with the points earned once the winner is entered —
  matching the match-prediction and knockout signifiers.
- **Full lockdown.** Every prediction is now frozen for everyone. The Admin
  results-entry forms (group / thirds / knockout / awards) freeze once the Final
  is played, so final results can't change after the fact.
- **Clearer locked look.** Disabled inputs and selects grey out consistently
  across the whole app.

## 2026-06-27 — In-tournament signifiers

- **Group-stage match game closes** at the end of the group stage, swapping the
  pick grid for a thank-you + points summary; earned points still count.
- **Knockout signifiers.** Group winners/runners-up, best-8 thirds, and every
  knockout pick show ✓/✗ with points once the admin enters the real result,
  including green/red highlighting on the Full Bracket tree.
- Admin **Match Results** tab freezes after a verification buffer.

## 2026-06-10 — Awarding & analytics

- Reworked how player points are awarded across the bracket.
- Enabled Vercel Analytics.

## 2026-06-08 — Full MVP

- Complete bracket game: group stage, best-8 thirds, knockout rounds, awards.
- Group-stage match-prediction mini-game (72 fixtures, 0.5 pts each).
- Server-side scoring + live Overall/Group leaderboards.
- Groups with passkeys, leaders, public/private visibility, and real-time chat.

## 2026-05-27 — First working build

- Initial React + Vite + Supabase app, deploy-ready.
- Auth, brackets, the core schema, and the How-To-Play / scoring rules.

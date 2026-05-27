# FIFA World Cup 2026 — Friend Group Prediction Website
## Project Plan / Build Prompt

> A small bracket-prediction web app for a private group of friends to fill out 2026 World Cup brackets and view each other's picks. One-off project, ~10 users max. Built for fun, not production.

---

## 1. Summary

A mobile-first, dark-themed web app where friends:
1. Create an account and log in
2. Join a private group via a secret passkey
3. Fill out a full 2026 World Cup bracket (group winners/runners-up, an 8-of-48 third-place side bet, and the full knockout bracket through to the champion)
4. View other group members' brackets in real time

**Scoring/leaderboard is intentionally out of scope for the MVP** — the host (Max) will compute scores manually after the tournament. The app's job is to capture and display picks, not score them.

---

## 2. Tournament Context

- 48 teams, 12 groups (A–L) of 4
- Top 2 per group → automatic R32 qualification (24 teams)
- Best 8 of 12 third-placed teams also qualify → 32 R32 teams
- Knockout rounds: R32 → R16 → QF → SF → Final (+ 3rd-place playoff)
- All 48 teams are now confirmed (final playoff winners: DR Congo, Iraq, Bosnia & Herzegovina, Sweden, Türkiye, Czech Republic)
- Tournament: June 11 – July 19, 2026

The third-place slot allocation follows FIFA's pre-defined 495-scenario matrix (Annex C of the official Competition Regulations: `https://digitalhub.fifa.com/m/636f5c9c6f29771f/original/FWC2026_regulations_EN.pdf`). The MVP does **not** need to implement this matrix — by the time users fill in the knockout bracket (after June 27), FIFA has already assigned the third-place teams to specific R32 slots, and the admin manually enters those slot assignments so users can pick from real teams.

---

## 3. Tech Stack

| Layer | Tool |
|---|---|
| Frontend framework | React (Vite) |
| Styling | Tailwind CSS, dark theme |
| Backend / DB / Auth | Supabase (free tier) |
| Hosting | Vercel or Netlify (static frontend; Supabase handles the rest) |
| Auth method | Email + password (Supabase built-in Auth) |

No MongoDB, no Express, no custom backend. Supabase's Postgres + Row Level Security handles all data access directly from the frontend.

---

## 4. User Flows

### 4.1 Auth & onboarding
1. **Landing page**: Two buttons — "Log In" / "Create Account"
2. **Create account**: Display name, email, password → creates Supabase Auth user + profile row
3. **Log in**: Email + password
4. **After login**: User lands on bracket page; if not in a group yet, prompted to join one via passkey

### 4.2 Joining a group
- User clicks "Join Group" → enters a secret passkey (group code)
- If valid, they're added to that group
- One user per group is fine for MVP (a user can be in multiple groups as a stretch goal)
- Groups are created manually by the admin (Max) directly in Supabase — no group-creation UI needed in MVP

### 4.3 Filling the bracket — two phases

**Phase 1 — Group stage (deadline: June 11, 2026, 12:00 PM MST)**
- For each of 12 groups, user picks a Winner and a Runner-up via dropdown (dropdown lists the 4 teams in that group; selecting a team as Winner removes it from the Runner-up dropdown for the same group)
- User must also pick **8 teams out of all 48** as their "best third-place teams" side bet (multi-select)
- After the June 11 deadline, group winner/runner-up picks and the 8-of-48 side bet are **locked** and cannot be edited

**Phase 2 — Knockout bracket (deadline: June 28, 2026, 12:00 PM MST)**
- Between June 11 and June 27, the actual group results play out. Bracket slots that depend on third-place teams (the "3RD GROUP A/B/C/D/F" type slots) remain **locked** for editing because the actual team is not yet known.
- After group stage ends (June 27), the admin updates the bracket with the actual teams in those slots (group winners, runners-up, and the specific thirds per FIFA's allocation). Slots become unlocked.
- User then picks the winner of each R32 match → R16 → QF → SF → 3rd-place playoff → Final/Champion via dropdown (each dropdown shows the two teams in that matchup)
- Users can edit knockout picks at any time before June 28, 12:00 PM MST
- After June 28 deadline, everything locks

### 4.4 Viewing others' brackets
- "Group" menu shows: group name, member list. Click any member to view their (read-only) bracket
- Brackets are visible to group members in real time (no waiting for deadlines)

### 4.5 Late entry
- A user who joins late (or doesn't submit by deadline X) can still submit picks for any *not-yet-locked* slot
- Anything past its deadline is permanently locked at 0 picks (counted as 0 points when Max scores manually later)

---

## 5. Bracket UI Design

- **Do not** use the FIFA bracket image as the UI. Rebuild the bracket as a native React component with dropdowns for each slot.
- **Desktop**: Full bracket in the classic left-and-right layout meeting at the Final in the middle, mirroring the reference image structure. Date labels (June 28, June 29…) above each R32 match.
- **Mobile** (primary use case): A stepped/sectioned UI is far more usable than the full bracket. Use tabs or accordions:
  - Tab 1: Group Stage (12 group cards, each with Winner + Runner-up dropdowns)
  - Tab 2: Best 8 Thirds (multi-select of 8 from all 48 teams, grouped by group letter)
  - Tab 3: Round of 32 (16 matches; locked slots show "TBD — locked until June 28")
  - Tab 4: Round of 16
  - Tab 5: Quarterfinals
  - Tab 6: Semifinals
  - Tab 7: Final + 3rd-place playoff
- Use dropdowns (not free text) everywhere — each dropdown is scoped to the legal teams for that slot.
- Show clear visual state for locked slots (greyed out, lock icon, "Available June 28").
- Countdown timers above each phase ("Group stage picks lock in 4d 12h").
- Auto-save on every change (debounced); no separate Save button required.

---

## 6. Scoring System (documented for later, NOT implemented in MVP)

Recorded here so Max can compute scores manually after the tournament. The frontend does not display points or a leaderboard.

| Pick | Points each | Max total |
|---|---|---|
| Group winner correct (×12) | 1 | 12 |
| Group runner-up correct (×12) | 1 | 12 |
| Best-8 thirds side bet — correct team (×8) | 2 | 16 |
| R32 winner correct (×16) | 2 | 32 |
| R16 winner correct (×8) | 3 | 24 |
| QF winner correct (×4) | 5 | 20 |
| SF winner correct (×2) | 8 | 16 |
| 3rd-place playoff winner | 10 | 10 |
| Champion correct | 15 | 15 |
| **Total possible** | | **157** |

Champion ≈ 10% of total. Group stage ≈ 18%. Balanced so the group stage genuinely matters and one lucky champion pick can't carry a player.

---

## 7. UI / Visual Direction

- **Theme**: Dark mode only. Background near-black (`#0a0a0a`). Accent: gold/amber (`#d4af37` or similar — matches WC 2026 branding).
- **Typography**: A bold display font for headers (Bebas Neue, Anton, or Oswald). A clean sans-serif for body (Inter or DM Sans).
- **Country display**: Flag emoji + country name in every dropdown and bracket cell for fast visual recognition.
- **Mobile-first**: Build for ~380px width first, scale up. Generous tap targets, sticky save indicator, no horizontal scroll.
- **Loading states**: Skeleton loaders on bracket fetch.

---

## 8. Pages / Routes

| Route | Purpose |
|---|---|
| `/` | Landing page (Login / Create Account) |
| `/login` | Login form |
| `/signup` | Signup form (display name, email, password) |
| `/join` | Join group via passkey |
| `/bracket` | User's own bracket — editable (respecting locks) |
| `/group` | Group members list; click member → view their bracket |
| `/group/:userId` | Read-only view of another member's bracket |
| `/how-to-play` | Static rules page (deadlines, scoring summary, third-place explanation) |
| `/settings` | Change display name / password |
| `/admin` (hidden, admin-only) | Manually update bracket slots after group stage |

---

## 9. Data Model (Supabase / Postgres)

```sql
-- Users handled by Supabase Auth (auth.users)

profiles (
  id uuid primary key references auth.users(id),
  display_name text,
  created_at timestamp
)

groups (
  id uuid primary key,
  name text,
  passkey text unique,           -- the secret used to join
  created_at timestamp
)

group_members (
  group_id uuid references groups(id),
  user_id uuid references profiles(id),
  joined_at timestamp,
  primary key (group_id, user_id)
)

-- One row per user containing their entire bracket as JSON
brackets (
  user_id uuid primary key references profiles(id),
  group_picks jsonb,             -- { "A": { winner: "MEX", runnerUp: "KOR" }, ... }
  third_place_bets text[],       -- array of 8 country codes
  knockout_picks jsonb,          -- { "R32_M74": "MEX", "R16_...": "...", "Final": "ARG", "ThirdPlacePlayoff": "..." }
  updated_at timestamp
)

-- Admin-controlled: the actual fixture (set after group stage ends)
fixture_state (
  id int primary key default 1,  -- single row
  group_results jsonb,           -- which teams actually finished 1st/2nd in each group
  third_place_assignments jsonb, -- which third-place team is actually in which R32 slot
  updated_at timestamp
)
```

**Row Level Security (Supabase):**
- Users can read/write their own `brackets` row
- Users can read other users' brackets *only if* they share a group
- `fixture_state` is read-only for users, write-only for admin
- `groups.passkey` is never selectable directly; joining a group goes through a Postgres function that takes the passkey and adds the caller

---

## 10. Bracket Structure (R32 slots reference)

Each R32 match has two slots. Based on the official bracket:

**Left half (top → bottom):**
- Winner E vs 3rd A/B/C/D/F (June 29)
- Winner I vs 3rd C/D/F/G/H (June 30)
- Runner-up A vs Runner-up B (June 28)
- Winner F vs Runner-up C (June 29)
- Runner-up K vs Runner-up L (July 2)
- Winner H vs Runner-up J (July 2)
- Winner D vs 3rd B/E/F/I/J (July 1)
- Winner G vs 3rd A/E/H/I/J (July 1)

**Right half (top → bottom):**
- Winner C vs Runner-up F (June 29)
- Runner-up E vs Runner-up I (June 30)
- Winner A vs 3rd C/E/F/H/I (June 30)
- Winner L vs 3rd E/H/I/J/K (July 1)
- Winner J vs Runner-up H (July 3)
- Runner-up D vs Runner-up G (July 3)
- Winner B vs 3rd E/F/G/I/J (July 2)
- Winner K vs 3rd D/E/I/J/L (July 3)

*Cross-reference exact match numbers and venue assignments against the FIFA official schedule before launch.*

---

## 11. MVP Scope (What to build)

✅ Auth (signup, login, password reset)
✅ Join group via passkey
✅ Full bracket UI with dropdowns and two-phase locking
✅ 8-of-48 thirds side bet UI
✅ View own bracket (editable per lock rules)
✅ View other group members' brackets (read-only)
✅ Admin page to set group results + third-place R32 assignments
✅ Mobile-first dark theme
✅ How To Play static page

## 12. Out of Scope (Don't build)

❌ Scoring engine / leaderboard
❌ Real-time score updates / sports API integration
❌ Match-by-match result entry (admin only updates group results once and third-place assignments once)
❌ Multiple groups per user
❌ Group-creation UI (admin creates groups in Supabase directly)
❌ Social features (chat, comments, reactions)
❌ Push notifications / email reminders

---

## 13. Appendix — All 48 Teams by Group

| Group | Teams |
|---|---|
| A | Mexico, South Africa, South Korea, Czech Republic |
| B | Canada, Bosnia & Herzegovina, Qatar, Switzerland |
| C | Brazil, Morocco, Haiti, Scotland |
| D | USA, Paraguay, Australia, Türkiye |
| E | Germany, Curaçao, Ivory Coast, Ecuador |
| F | Netherlands, Japan, Sweden, Tunisia |
| G | Belgium, Egypt, Iran, New Zealand |
| H | Spain, Cape Verde, Saudi Arabia, Uruguay |
| I | France, Senegal, Iraq, Norway |
| J | Argentina, Algeria, Austria, Jordan |
| K | Portugal, DR Congo, Uzbekistan, Colombia |
| L | England, Croatia, Ghana, Panama |

*(Verify final playoff assignments against the official FIFA bracket before launch — UEFA Playoff A/B/C/D and FIFA Playoff 1/2 mappings are based on March 2026 playoff results.)*

---

## 14. Key Dates

| Date | Event |
|---|---|
| June 11, 2026, 12:00 PM MST | Tournament starts — Group stage picks + 8-of-48 lock |
| June 27, 2026 | Last group stage match |
| June 28, 2026, 12:00 PM MST | R32 begins — entire knockout bracket locks |
| July 19, 2026 | Final at MetLife Stadium, NJ |
| Post-final | Max computes scores manually, declares winner |

---

## 15. Recommended Build Order

1. Supabase project setup + schema + RLS policies
2. Auth pages (signup, login)
3. Join group flow
4. Group stage prediction UI + persistence
5. 8-of-48 thirds side bet UI
6. Date-based lock mechanism (read/write rules)
7. Knockout bracket UI (initially all "locked")
8. Admin page to populate `fixture_state` after group stage
9. View-others' brackets read-only view
10. How To Play page + settings + polish

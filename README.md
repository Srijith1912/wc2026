# WC 2026 Predictions

Friend-group bracket app for the 2026 FIFA World Cup. React + Vite + Tailwind on the frontend, Supabase for auth/DB/RLS. Built per [`WC2026_PredictionGame_Blueprint.md`](./WC2026_PredictionGame_Blueprint.md).

## What's here

```
wc2026/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.example                 # copy to .env and fill in
├── supabase/
│   └── schema.sql               # paste into Supabase SQL editor
└── src/
    ├── main.jsx, App.jsx
    ├── context/AuthContext.jsx
    ├── lib/
    │   ├── supabase.js          # Supabase client
    │   ├── admin.js             # ADMIN_EMAILS — edit to add admins
    │   ├── teams.js             # all 48 teams, verified from FIFA draw
    │   ├── dates.js             # June 11 and June 28 12:00 MST deadlines
    │   └── bracket.js           # R32/R16/QF/SF/Final structure + slot resolver
    ├── hooks/useBracket.js
    ├── components/
    │   ├── Layout.jsx
    │   ├── Countdown.jsx
    │   ├── SaveIndicator.jsx
    │   └── TeamPill.jsx
    └── pages/
        ├── Landing.jsx, Login.jsx, Signup.jsx, Join.jsx
        ├── Bracket.jsx           # main bracket UI (tabbed)
        ├── bracketTabs/
        │   ├── GroupStageTab.jsx
        │   ├── ThirdsTab.jsx
        │   └── KnockoutTab.jsx
        ├── Group.jsx, MemberBracket.jsx
        ├── HowToPlay.jsx, Settings.jsx
        └── Admin.jsx
```

## One-time setup

### 1. Create a Supabase project
- Go to https://supabase.com, sign up (free), create a new project.
- In **Project Settings → API**, copy:
  - **Project URL** → `VITE_SUPABASE_URL`
  - **anon public** key → `VITE_SUPABASE_ANON_KEY`

### 2. Apply the schema
- Open the Supabase **SQL editor**, paste the entire contents of [`supabase/schema.sql`](./supabase/schema.sql), and run it.
- This creates `profiles`, `groups`, `group_members`, `brackets`, `fixture_state`, all RLS policies, and the `join_group()` / `handle_new_user()` functions/triggers.

### 3. Configure admin email(s)
The admin is whoever can write to `fixture_state` and (optionally) seed groups directly. Admins are identified by email and **must be set in two places**:
- **`src/lib/admin.js`** — the `ADMIN_EMAILS` array (controls UI access to `/admin`).
- **`supabase/schema.sql`** — the `is_admin()` function near the top (enforced by RLS).

To add an admin, paste the email into both spots.

### 4. Create your friend group
- In Supabase **Table editor → groups**, click **Insert row**:
  - `name`: e.g. `The Boys`
  - `passkey`: a secret string — share this with your friends
- Friends sign up in the app, then enter the passkey on `/join` to be added.

### 5. (Optional) Turn off email confirmation
For a tiny private game with ~10 users, you can disable email confirmation so friends are signed in immediately after signup:
- **Authentication → Providers → Email** → toggle off "Confirm email."

### 6. Local dev
```bash
npm install
cp .env.example .env       # edit .env with your Supabase URL + anon key
npm run dev
```
Open http://localhost:5173.

### 7. Deploy
- **Vercel**: import the repo → Framework: Vite → Build cmd `npm run build` → Output dir `dist`. Add the two `VITE_*` env vars.
- **Netlify**: equivalent — build `npm run build`, publish dir `dist`, same env vars.

## During the tournament

- **Before June 11, 12:00 PM MST** — friends sign up, join group, fill out group-stage picks + 8-of-48 thirds side bet. Editable until deadline.
- **June 11 – June 27** — actual group games play out. Group-stage picks are locked. Knockout slots are still "TBD — locked" because the actual third-place teams aren't yet assigned.
- **June 27 (or after group stage ends)** — go to `/admin`:
  - Enter the actual winner/runner-up for each of the 12 groups.
  - For each "3rd from X/Y/Z" R32 slot, pick the team FIFA assigned to that slot (per the FIFA pre-defined matrix in Annex C of the [Competition Regulations](https://digitalhub.fifa.com/m/636f5c9c6f29771f/original/FWC2026_regulations_EN.pdf)).
  - Hit **Save fixture**. R32 slots immediately unlock with real teams for every user.
- **Before June 28, 12:00 PM MST** — users fill out knockout bracket through Champion + 3rd-place playoff.
- **July 19** — Final. After: the admin computes scores manually per the table on `/how-to-play`.

## Data model

See [`supabase/schema.sql`](./supabase/schema.sql). The user's entire bracket lives in one `brackets` row:
- `group_picks: { "A": { winner: "MEX", runnerUp: "KOR" }, … }`
- `third_place_bets: ["BRA", "GER", …]`  *(array of 8 team codes)*
- `knockout_picks: { "R32_L1": "GER", "R16_L1": "GER", …, "FINAL": "BRA", "THIRD_PLACE": "FRA" }`

Match IDs follow `bracket.js` (`R32_L1..L8`, `R32_R1..R8`, `R16_L1..R4`, `QF_L1..R2`, `SF_L`, `SF_R`, `FINAL`, `THIRD_PLACE`).

## Adding more admins
1. Add the email to `ADMIN_EMAILS` in `src/lib/admin.js`.
2. Add the same email to the `is_admin()` function in `supabase/schema.sql` and re-run that function definition in the SQL editor.

## Out of scope (per blueprint §12)
No scoring engine, no leaderboard, no live score updates, no match-by-match result entry, no group-creation UI, no chat/comments, no notifications.

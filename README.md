# WC 2026 Predictions

A bracket app for the 2026 FIFA World Cup. Make your picks, see everyone's picks, talk trash. No money. Scores are computed automatically as results come in, and a live top-10 leaderboard ranks everyone.

🗓 **Tournament**: June 11 – July 19, 2026
🇲🇽🇨🇦🇺🇸 **Hosts**: Canada, Mexico, USA
👥 **Built for**: ~10 friends per group

---

## How to play

### 1. Sign up & join a group
- Create an account (display name, email, password).
- Either **join an existing group** with a passkey your friend shares with you, or **create your own group** and share its passkey.

### 2. Fill out the group stage *(lock: end of June 17, once every team has played once)*
- For each of the 12 groups (A–L), pick the **winner** and the **runner-up**.
- Pick **8 third-place teams** — one per group, from any 8 of the 12 groups. These are your bets for which third-place teams advance to the Round of 32.
- Predict the three **individual awards** — Golden Ball (best player), Golden Boot (top scorer), Golden Glove (best goalkeeper). Free-text player names, **5 points each**.

After the group-stage deadline (end of June 17), group-stage picks, the 8-thirds bet, and the awards picks are locked. All deadlines are shown in your device's local time.

### 3. Fill out the knockout bracket *(lock: June 28, 12:00 PM MST, at the first Round-of-32 kickoff)*
- Between June 11 and June 27, the real group stage plays out.
- After the group stage ends, the group leader plugs in the actual results — winners, runners-up, and which 3rd-place team filled which Round-of-32 slot.
- You then pick winners through R32 → R16 → Quarters → Semis → 3rd-place playoff → Final.
- Use the **Full Bracket** tab to see the whole tree converge.

After the knockout deadline (June 28, 12:00 PM MST), the bracket is locked. No more changes anywhere.

### 4. See everyone's picks
- The **Group** menu lists every member of every group you're in. Click a name → see their bracket (read-only).
- Everyone's picks are visible immediately, even before the deadlines.

### 5. Scoring & leaderboard
- As the tournament plays out, the admin enters the real results on the **Admin** page — group finishers, the 8 advancing thirds, every knockout winner, and the award winners.
- Your score updates automatically against the points table on the **How To Play** page (172 points possible, with the champion worth just 15 — group-stage picks genuinely matter). Watch your running total on the **Bracket** page.
- The **Leaderboard** has two views: **Overall** (everyone with at least 1 point, ranked) and **Group** (just the members of a group you pick). It opens when the knockout stage begins. It shows names and scores only — to view someone's actual picks they must be in one of your groups (Group page → tap their name). Scoring runs server-side, so the leaderboard stays fast no matter how many people play.
- Each group has its own **persistent chat** — open the Group page, tap a group, and chat with members in real time (history is never deleted).

---

## Group leader tools
Whoever creates a group starts as a **group leader**, marked with 👑. A group can have **multiple leaders**. Any leader can:
- **Set visibility** — toggle the group **private** (passkey to join) or **public** (listed on the Groups page for anyone to join with one click)
- **Toggle bracket sharing** — independently turn on/off whether members can see each other's brackets and match picks
- **Edit the group** — change its name and passkey (Group settings ⚙️)
- **Add leaders** — promote another member to leader (👑 next to their name); both are then leaders
- **Remove leaders** — demote a leader (a group always keeps at least one)
- **Kick** members
- **Delete** the group

If the last leader leaves, leadership automatically passes to the next-earliest joiner so the group always has one.

---

## Quick notes
- You can join more than one group; your bracket is the same across all of them.
- If you joined late or missed a deadline, anything past the lock counts as 0 points when scored.
- Forgot password? Use the link on the login page — it sends a reset email.
- Want to start over while testing? Settings → Reset my bracket.

That's it. Have fun.

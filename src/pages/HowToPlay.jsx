import { GROUP_LOCK_UTC, KO_LOCK_UTC, fmtDeadline } from '../lib/dates.js';

export default function HowToPlay() {
  const groupLock = fmtDeadline(GROUP_LOCK_UTC);
  const koLock = fmtDeadline(KO_LOCK_UTC);
  return (
    <article className="max-w-2xl mx-auto space-y-6 leading-relaxed">
      <header>
        <div className="display text-3xl text-gold">How To Play</div>
        <p className="text-muted text-sm mt-1">Bracket game for the 2026 FIFA World Cup. No real money. Your score is calculated automatically as results come in, and a live leaderboard ranks everyone.</p>
      </header>

      <section className="card space-y-2">
        <div className="display text-xl text-gold">Two deadlines</div>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li><b>Group stage + 8-of-48 thirds + awards:</b> picks lock <b>{groupLock}</b> — the end of June 17, once every team has played its first game.</li>
          <li><b>Knockout bracket (R32 → Final):</b> picks lock <b>{koLock}</b>, right before the Round of 32 begins.</li>
        </ul>
        <p className="text-xs text-muted">All times are shown in your device's local time zone.</p>
      </section>

      <section className="card border-red-700/50 bg-red-900/15 text-red-300 space-y-1">
        <div className="display text-lg text-red-300">⚠️ Important: complete your knockout bracket before it locks</div>
        <p className="text-sm">
          The final group-stage matches are played on <b>June 27</b>, so the teams that fill the
          Round-of-32 third-place slots aren't confirmed until late that day. Please finish and
          double-check your full knockout bracket and submit it before it locks on
          <b> {koLock}</b>. Once the deadline passes, no further changes are possible and any empty
          picks score zero.
        </p>
      </section>

      <section className="card space-y-2">
        <div className="display text-xl text-gold">The bracket</div>
        <ol className="list-decimal pl-5 space-y-1 text-sm">
          <li>For each of 12 groups (A–L), pick the <b>winner</b> and the <b>runner-up</b>.</li>
          <li>Pick the <b>8 teams (of 48) you think will advance as best 3rd-place teams</b>. (FIFA uses a pre-defined matrix to assign which thirds go to which R32 slot — we don't make you predict the slot, just which 8 teams advance.)</li>
          <li>After the group stage ends (June 27), the admin enters the actual 1st/2nd/3rd-place assignments into the bracket. R32 slots that were "TBD — locked" become real teams.</li>
          <li>Fill in winners from R32 → R16 → QF → SF → 3rd-place playoff → Final. You can edit until the knockout deadline above.</li>
        </ol>
      </section>

      <section className="card space-y-2">
        <div className="display text-xl text-gold">Individual awards</div>
        <p className="text-sm">Above the bracket tabs you'll find three text fields for tournament-long awards:</p>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li><b>Golden Ball</b> — best player of the tournament</li>
          <li><b>Golden Boot</b> — top scorer of the tournament</li>
          <li><b>Golden Glove</b> — best goalkeeper of the tournament</li>
        </ul>
        <p className="text-sm">Enter each player's full name, including surname (for example, "Harry Kane"). Scoring ignores case and accents, so the common spelling is fine. These lock with the group stage on <b>{groupLock}</b>.</p>
      </section>

      <section className="card space-y-2">
        <div className="display text-xl text-gold">Scoring &amp; leaderboard</div>
        <p className="text-sm">As the tournament plays out, the admin enters the real results — group game outcomes, group finishers, the 8 advancing thirds, every knockout winner, and the award winners. Your score updates automatically against the table below, and you can watch your running total grow on the Bracket page.</p>
        <p className="text-sm">Your <b>total</b> combines two games: your <b>bracket</b> (172 points) and your <b>group-stage match predictions</b> (72 games × 0.5 = 36 points) — <b>208 points</b> in all.</p>
        <p className="text-sm">The <b>Leaderboard</b> has two views: <b>Overall</b> (everyone who's scored, ranked) and <b>Group</b> (just the members of a group you pick). It shows names and scores only — to see someone's actual picks, they need to be in one of your groups (open the Group page and tap their name).</p>
        <div className="display text-base text-gold pt-1">Points table</div>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-muted"><th>Pick</th><th>Pts each</th><th>Max</th></tr></thead>
          <tbody className="[&_td]:py-1 [&_td]:pr-3">
            <tr><td>Group winner correct (×12)</td><td>1</td><td>12</td></tr>
            <tr><td>Group runner-up correct (×12)</td><td>1</td><td>12</td></tr>
            <tr><td>Best-8 thirds correct (×8)</td><td>2</td><td>16</td></tr>
            <tr><td>R32 winner correct (×16)</td><td>2</td><td>32</td></tr>
            <tr><td>R16 winner correct (×8)</td><td>3</td><td>24</td></tr>
            <tr><td>QF winner correct (×4)</td><td>5</td><td>20</td></tr>
            <tr><td>SF winner correct (×2)</td><td>8</td><td>16</td></tr>
            <tr><td>3rd-place playoff winner</td><td>10</td><td>10</td></tr>
            <tr><td>Champion correct</td><td>15</td><td>15</td></tr>
            <tr><td>Golden Ball / Boot / Glove (×3)</td><td>5</td><td>15</td></tr>
            <tr className="border-t border-border/60"><td>Bracket subtotal</td><td></td><td>172</td></tr>
            <tr><td>Group-stage match predictions (×72)</td><td>0.5</td><td>36</td></tr>
            <tr className="border-t border-border font-semibold"><td>Total possible</td><td></td><td>208</td></tr>
          </tbody>
        </table>
      </section>

      <section className="card space-y-2">
        <div className="display text-xl text-gold">Late entries</div>
        <p className="text-sm">Joined late? You can still pick anything that isn't locked yet. Anything past its deadline stays at 0 picks (counts as 0 when scored).</p>
      </section>
    </article>
  );
}

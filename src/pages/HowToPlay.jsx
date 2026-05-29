export default function HowToPlay() {
  return (
    <article className="max-w-2xl mx-auto space-y-6 leading-relaxed">
      <header>
        <div className="display text-3xl text-gold">How To Play</div>
        <p className="text-muted text-sm mt-1">Friend-group bracket for the 2026 FIFA World Cup. No real money, no leaderboard in-app — the admin scores it manually at the end.</p>
      </header>

      <section className="card space-y-2">
        <div className="display text-xl text-gold">Two deadlines</div>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li><b>Group stage + 8-of-48 thirds:</b> picks lock <b>June 11, 2026, 12:00 PM MST</b> (right before kickoff).</li>
          <li><b>Knockout bracket (R32 → Final):</b> picks lock <b>June 28, 2026, 12:00 PM MST</b>, right before R32 begins.</li>
        </ul>
      </section>

      <section className="card space-y-2">
        <div className="display text-xl text-gold">The bracket</div>
        <ol className="list-decimal pl-5 space-y-1 text-sm">
          <li>For each of 12 groups (A–L), pick the <b>winner</b> and the <b>runner-up</b>.</li>
          <li>Pick the <b>8 teams (of 48) you think will advance as best 3rd-place teams</b>. (FIFA uses a pre-defined matrix to assign which thirds go to which R32 slot — we don't make you predict the slot, just which 8 teams advance.)</li>
          <li>After the group stage ends (June 27), the admin enters the actual 1st/2nd/3rd-place assignments into the bracket. R32 slots that were "TBD — locked" become real teams.</li>
          <li>Fill in winners from R32 → R16 → QF → SF → 3rd-place playoff → Final. You can edit until June 28, 12:00 PM MST.</li>
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
        <p className="text-sm">Type the player's name — any reasonable spelling works, the group leader resolves ties at scoring. These lock with the group stage on June 11, 12:00 PM MST.</p>
      </section>

      <section className="card space-y-2">
        <div className="display text-xl text-gold">Scoring (computed manually after the tournament)</div>
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
            <tr className="border-t border-border font-semibold"><td>Total possible</td><td></td><td>172</td></tr>
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

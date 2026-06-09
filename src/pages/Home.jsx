import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ALL_CODES, TEAMS, flagUrl } from '../lib/teams.js';

const TAGLINES = [
  "Who lifts the trophy at MetLife Stadium on July 19th?",
  "Will Ronaldo's Portugal send him off as a champion?",
  "Can Messi lead Argentina to back-to-back glory?",
  "Can the Netherlands finally break their curse?",
  "Can Kane end England's 60-year wait?",
  "Can anyone actually stop France's relentless attack?",
  "Can Brazil rediscover its lost magic?",
  "Is Germany ready to rise again under a new generation?",
  "Can Pulisic make history for the USA on home soil?",
  "Could Haaland's Norway be the shock of the tournament?",
  "Can Morocco go one step further than their historic 2022 run?",
  "Will Turkey's fearless young squad shock the world?",
  "Could Croatia defy the odds one more time?",
  "Does a true underdog stun everyone this summer?",
];

const STEPS = [
  { n: '1', title: 'Build your bracket', body: 'Call every group, the knockouts, and the golden boot — all the way to the champion.' },
  { n: '2', title: 'Predict every match', body: 'Pick the winner of each group game as it comes up. Quick, fun, and worth points.' },
  { n: '3', title: 'Climb the leaderboard', body: 'Everything is scored automatically. See how you stack up against everyone — and your friends.' },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Home() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [tagline, setTagline] = useState(0);

  const taglines = useMemo(() => shuffle(TAGLINES), []);
  const flags = useMemo(() => Array.from(new Set(ALL_CODES.map((c) => TEAMS[c].iso))), []);

  useEffect(() => {
    const id = setInterval(() => setTagline((t) => (t + 1) % taglines.length), 3500);
    return () => clearInterval(id);
  }, [taglines.length]);

  useEffect(() => {
    supabase.from('reviews')
      .select('rating, body, profiles(display_name)')
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .limit(9)
      .then(({ data }) => setReviews(data || []));
  }, []);

  return (
    <div>
      {/* ─── First screen: the hero fills it and the flag ribbon is pinned to
            the bottom, so nothing else shows until you scroll. ─── */}
      <div className="flex flex-col min-h-[calc(100vh_-_6rem)]">
        <section className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <div className="text-xs tracking-[0.3em] text-muted uppercase mb-5">FIFA World Cup 2026 · USA · Canada · Mexico</div>
          <div className="text-7xl sm:text-8xl mb-5 trophy-glow select-none" aria-hidden>🏆</div>
          <h1 className="display text-6xl sm:text-8xl text-gold tracking-wide leading-[1.02]">
            Who'll lift<br />the trophy?
          </h1>
          <p key={tagline} className="display text-xl sm:text-3xl mt-6 text-white/90 max-w-2xl mx-auto min-h-[2em] animate-fade-in">
            {taglines[tagline]}
          </p>
          <p className="text-muted mt-4 max-w-xl mx-auto text-base sm:text-lg">
            Build your bracket, predict every match, and compete with players around the world.
            Free to play. Bragging rights guaranteed.
          </p>
          {!user && (
            <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto">
              <Link to="/signup" className="btn-primary flex-1 text-base py-3">Build your bracket</Link>
              <Link to="/login" className="btn-secondary flex-1 text-base py-3">Log in</Link>
            </div>
          )}
        </section>

        {/* Flag ribbon — last thing in the first screen */}
        <div className="overflow-hidden border-y border-border bg-panel/30 py-3 -mx-3 sm:-mx-4">
          <div className="flex w-max animate-marquee gap-6 px-3">
            {[...flags, ...flags].map((iso, i) => (
              <img key={i} src={flagUrl(iso, 80)} alt="" aria-hidden loading="lazy"
                className="h-7 w-auto rounded-sm shadow opacity-80 shrink-0" />
            ))}
          </div>
        </div>
      </div>

      {/* ─── Below the fold ─── */}
      <div className="space-y-12 pt-14">
        <section>
          <h2 className="display text-2xl sm:text-3xl text-gold text-center mb-8">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center sm:text-left">
                <div className="display text-3xl text-gold mb-2">{s.n}</div>
                <div className="display text-lg text-white mb-1">{s.title}</div>
                <p className="text-muted text-sm">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {reviews.length > 0 && (
          <section className="border-t border-border pt-10">
            <h2 className="display text-2xl sm:text-3xl text-gold text-center mb-6">What players are saying</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {reviews.map((r, i) => (
                <div key={i} className="card">
                  <div className="text-gold mb-2">
                    {'★'.repeat(r.rating)}<span className="text-muted">{'★'.repeat(5 - r.rating)}</span>
                  </div>
                  <p className="text-sm text-white/90">"{r.body}"</p>
                  <div className="text-xs text-muted mt-3">— {r.profiles?.display_name || 'Player'}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!user && (
          <section className="border-t border-border pt-10 text-center pb-4">
            <h2 className="display text-2xl sm:text-3xl text-white mb-2">Ready to make your call?</h2>
            <p className="text-muted mb-5">The tournament kicks off June 11, 2026.</p>
            <Link to="/signup" className="btn-primary inline-block text-base py-3 px-8">Create your free account</Link>
          </section>
        )}
      </div>
    </div>
  );
}

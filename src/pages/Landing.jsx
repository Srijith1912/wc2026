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
  "Can Japan pull off another Germany-style shock and go all the way?",
  "Can Belgium's ageing stars spark one final miracle?",
  "Could Croatia defy the odds one more time?",
  "Does a true underdog stun everyone this summer?",
  
];

const STEPS = [
  { n: '1', title: 'Build your bracket', body: 'Call every group, the knockouts, and the golden boot — all the way to the champion.' },
  { n: '2', title: 'Lock it in', body: 'Picks freeze before kickoff. After that, the tournament does the talking.' },
  { n: '3', title: 'Climb the leaderboard', body: 'Points are scored automatically as results come in. See how you rank against everyone.' },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Landing() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [tagline, setTagline] = useState(0);

  // Shuffle taglines once per visit so the hero feels fresh.
  const taglines = useMemo(() => shuffle(TAGLINES), []);
  // A representative ribbon of flags (deduped iso list), duplicated in markup.
  const flags = useMemo(
    () => Array.from(new Set(ALL_CODES.map((c) => TEAMS[c].iso))),
    []
  );

  useEffect(() => {
    const id = setInterval(() => setTagline((t) => (t + 1) % taglines.length), 3500);
    return () => clearInterval(id);
  }, [taglines.length]);

  useEffect(() => {
    supabase.from('reviews')
      .select('rating, body, profiles(display_name)')
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .limit(12)
      .then(({ data }) => setReviews(data || []));
  }, []);

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Hero ─── */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 text-center pt-20 pb-10">
        <div className="text-xs tracking-[0.3em] text-muted uppercase mb-5">FIFA World Cup 2026 · USA · Canada · Mexico</div>
        <div className="text-7xl sm:text-8xl mb-3 trophy-glow select-none" aria-hidden>🏆</div>
        <h1 className="display text-5xl sm:text-7xl lg:text-8xl text-gold tracking-wide leading-[1.05]">
          Who'll lift<br />the trophy?
        </h1>
        <p key={tagline} className="display text-lg sm:text-2xl mt-6 text-white/90 max-w-2xl min-h-[2em] animate-fade-in">
          {taglines[tagline]}
        </p>
        <p className="text-muted mt-4 max-w-xl text-base sm:text-lg">
          Build your bracket, predict every match, and compete with players around the world.
          Free to play. Bragging rights guaranteed.
        </p>

        <div className="mt-9 flex flex-col sm:flex-row gap-3 w-full max-w-md">
          {user ? (
            <>
              <Link to="/bracket" className="btn-primary flex-1 text-base py-3">Go to my bracket</Link>
              <Link to="/leaderboard" className="btn-secondary flex-1 text-base py-3">Leaderboard</Link>
            </>
          ) : (
            <>
              <Link to="/signup" className="btn-primary flex-1 text-base py-3">Build your bracket</Link>
              <Link to="/login"  className="btn-secondary flex-1 text-base py-3">Log in</Link>
            </>
          )}
        </div>

        {avg && (
          <div className="mt-6 text-sm text-muted">
            <span className="text-gold">{'★'.repeat(Math.round(avg))}</span>{' '}
            Rated {avg}/5 by {reviews.length} player{reviews.length === 1 ? '' : 's'}
          </div>
        )}
      </section>

      {/* ─── Flag ribbon ─── */}
      <div className="overflow-hidden border-y border-border bg-panel/30 py-3">
        <div className="flex w-max animate-marquee gap-6 px-3">
          {[...flags, ...flags].map((iso, i) => (
            <img
              key={i}
              src={flagUrl(iso, 80)}
              alt=""
              aria-hidden
              loading="lazy"
              className="h-7 w-auto rounded-sm shadow opacity-80 shrink-0"
            />
          ))}
        </div>
      </div>

      {/* ─── How it works ─── */}
      <section className="px-6 py-12 border-b border-border">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-5">
          {STEPS.map((s) => (
            <div key={s.n} className="text-center sm:text-left">
              <div className="display text-3xl text-gold mb-2">{s.n}</div>
              <div className="display text-lg text-white mb-1">{s.title}</div>
              <p className="text-muted text-sm">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Reviews ─── */}
      {reviews.length > 0 && (
        <section className="px-6 py-14 border-b border-border">
          <div className="max-w-5xl mx-auto">
            <h2 className="display text-2xl sm:text-3xl text-gold text-center mb-8">What players are saying</h2>
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
          </div>
        </section>
      )}

      {/* ─── CTA + footer ─── */}
      <section className="px-6 py-14 bg-panel/30 text-center">
        <h2 className="display text-2xl sm:text-3xl text-white mb-2">Ready to make your call?</h2>
        <p className="text-muted mb-6">The tournament kicks off June 11, 2026.</p>
        {user ? (
          <Link to="/bracket" className="btn-primary inline-block text-base py-3 px-8">Go to my bracket</Link>
        ) : (
          <Link to="/signup" className="btn-primary inline-block text-base py-3 px-8">Create your free account</Link>
        )}
      </section>

      <footer className="border-t border-border py-6 text-center text-muted text-xs space-x-3">
        <span>June 11 – July 19, 2026</span>
        <span>·</span>
        <Link to="/contact" className="hover:text-gold">Contact</Link>
        <span>·</span>
        <span>Not affiliated with FIFA.</span>
      </footer>
    </div>
  );
}

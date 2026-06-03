import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';

const ADMIN_EMAIL = 'mulupurisrijith@gmail.com';

// ⬇️  PASTE YOUR FORMSPREE FORM ID HERE  ⬇️
// From your form's page on formspree.io the endpoint looks like
// https://formspree.io/f/abcdwxyz — you can paste either the full URL or just
// the "abcdwxyz" part; both work.
const FORMSPREE_ID = 'meewjzye';
// Tolerate a full URL being pasted above instead of just the id.
const FORMSPREE_ENDPOINT = FORMSPREE_ID.startsWith('http')
  ? FORMSPREE_ID
  : `https://formspree.io/f/${FORMSPREE_ID}`;

export default function Contact() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="display text-2xl text-gold tracking-wider">WC&nbsp;2026</Link>
          <Link to={user ? '/bracket' : '/'} className="ml-auto btn-secondary text-sm">
            ← Back{user ? ' to bracket' : ''}
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-8">
        <section>
          <div className="display text-3xl text-gold">Get in touch</div>
          <p className="text-muted text-sm mt-2">
            Found a bug, have a question, or want to share feedback? Send us a message and we'll get
            back to you.
          </p>
          <ContactForm defaultEmail={user?.email || ''} />
          <div className="text-sm text-muted mt-3">
            Prefer email? Write to{' '}
            <a href={`mailto:${ADMIN_EMAIL}`} className="text-white hover:text-gold">{ADMIN_EMAIL}</a>.
          </div>
        </section>

        <section className="border-t border-border pt-8">
          <div className="display text-2xl text-gold mb-1">Leave a review</div>
          <p className="text-muted text-sm mb-4">
            Enjoying the game? Rate it and your review may appear on our home page.
          </p>
          {user ? <ReviewForm userId={user.id} /> : (
            <div className="card text-sm text-muted">
              <Link to="/login" className="text-gold hover:underline">Log in</Link> or{' '}
              <Link to="/signup" className="text-gold hover:underline">create an account</Link> to leave a review.
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-muted text-xs">
        Not affiliated with FIFA.
      </footer>
    </div>
  );
}

function ContactForm({ defaultEmail }) {
  const [email, setEmail] = useState(defaultEmail);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => { setEmail(defaultEmail); }, [defaultEmail]);

  const configured = FORMSPREE_ID && FORMSPREE_ID !== 'YOUR_FORM_ID';

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    if (!configured) { setErr('The contact form isn\'t set up yet — please email us directly for now.'); return; }
    setBusy(true);
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, message }),
      });
      if (res.ok) {
        setSent(true);
        setMessage('');
      } else {
        const data = await res.json().catch(() => ({}));
        setErr(data?.errors?.[0]?.message || 'Something went wrong. Please try again or email us directly.');
      }
    } catch {
      setErr('Network error. Please try again or email us directly.');
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="card mt-4 text-sm text-emerald-400">
        Thanks for reaching out! We've got your message and will reply soon.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card mt-4 space-y-3">
      <div>
        <div className="label mb-1">Your email</div>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="input"
        />
      </div>
      <div>
        <div className="label mb-1">Message</div>
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          maxLength={2000}
          placeholder="How can we help?"
          className="w-full px-3 py-2 rounded-md bg-black/30 border border-border text-sm text-white placeholder:text-muted/60 focus:outline-none focus:border-gold"
        />
      </div>
      {err && <div className="text-sm text-red-400">{err}</div>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? 'Sending…' : 'Send message'}</button>
    </form>
  );
}

function ReviewForm({ userId }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState('');
  const [approved, setApproved] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    supabase.from('reviews').select('rating, body, approved').eq('user_id', userId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setRating(data.rating);
          setBody(data.body);
          setApproved(data.approved);
          setHasExisting(true);
        }
      });
  }, [userId]);

  async function submit(e) {
    e.preventDefault();
    setMsg(null); setErr(null);
    if (rating < 1) { setErr('Please choose a star rating.'); return; }
    if (body.trim().length < 1) { setErr('Please write a short review.'); return; }
    setBusy(true);
    const { error } = await supabase.from('reviews').upsert({
      user_id: userId,
      rating,
      body: body.trim(),
    }, { onConflict: 'user_id' });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setApproved(false);
    setHasExisting(true);
    setMsg('Thanks! Your review was submitted and will appear once it\'s approved.');
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      {hasExisting && (
        <div className={`text-xs ${approved ? 'text-emerald-400' : 'text-muted'}`}>
          {approved
            ? 'Your review is live on the home page.'
            : 'Your review is awaiting approval. Editing it resubmits for review.'}
        </div>
      )}
      <div>
        <div className="label mb-1">Your rating</div>
        <div className="flex gap-1 text-3xl">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className={`leading-none transition ${(hover || rating) >= n ? 'text-gold' : 'text-muted/40'}`}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="label mb-1">Your review</div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={500}
          rows={4}
          placeholder="Tell others what you think…"
          className="w-full px-3 py-2 rounded-md bg-black/30 border border-border text-sm text-white placeholder:text-muted/60 focus:outline-none focus:border-gold"
        />
        <div className="text-xs text-muted mt-1">{body.length}/500</div>
      </div>
      {msg && <div className="text-sm text-emerald-400">{msg}</div>}
      {err && <div className="text-sm text-red-400">{err}</div>}
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? 'Submitting…' : hasExisting ? 'Update review' : 'Submit review'}
      </button>
    </form>
  );
}

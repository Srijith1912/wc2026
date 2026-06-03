import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

export default function Signup() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError(null); setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    setBusy(false);
    if (error) {
      // Surface a friendly message for the common "email already exists" case.
      if (/already (registered|exists)|already in use/i.test(error.message)) {
        setError('That email is already registered. Try logging in instead.');
      } else {
        setError(error.message);
      }
      return;
    }
    // Supabase's enumeration protection: signing up with an email that already
    // exists returns no error but an empty `identities` array. Treat that as
    // "already taken" so two accounts can never share an email.
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setError('That email is already registered. Try logging in instead.');
      return;
    }
    // Land on the home page; from there the player chooses where to go.
    nav('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <div className="display text-3xl text-gold">Create Account</div>
        </div>
        <input className="input" placeholder="Display name (shown on the leaderboard)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        <p className="text-xs text-muted -mt-1">Your display name is public on the leaderboard, so pick something you're happy for others to see.</p>
        <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
        {error && <div className="text-sm text-red-400">{error}</div>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Create Account'}</button>
        <div className="text-center text-sm">
          <Link to="/login" className="text-muted hover:text-gold">Already have an account? Log in</Link>
        </div>
      </form>
    </div>
  );
}

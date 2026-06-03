import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError(null); setInfo(null); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setError(error.message); return; }
    nav('/');
  }

  async function reset() {
    setError(null); setInfo(null);
    if (!email) { setError('Enter your email first, then click Forgot password.'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) setError(error.message); else setInfo('Reset email sent. Check your inbox.');
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <div className="display text-3xl text-gold">Log In</div>
        </div>
        <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <div className="text-sm text-red-400">{error}</div>}
        {info  && <div className="text-sm text-emerald-400">{info}</div>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Log In'}</button>
        <div className="flex justify-between text-sm">
          <button type="button" onClick={reset} className="text-muted hover:text-gold">Forgot password</button>
          <Link to="/signup" className="text-muted hover:text-gold">Create account</Link>
        </div>
      </form>
    </div>
  );
}

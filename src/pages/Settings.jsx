import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setDisplayName(profile?.display_name || ''); }, [profile?.display_name]);

  async function saveName(e) {
    e.preventDefault();
    setMsg(null); setErr(null);
    const { error } = await supabase.from('profiles').update({ display_name: displayName }).eq('id', user.id);
    if (error) setErr(error.message); else { setMsg('Display name updated.'); refreshProfile(); }
  }

  async function changePw(e) {
    e.preventDefault();
    setMsg(null); setErr(null);
    if (password.length < 6) { setErr('Password must be at least 6 characters.'); return; }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setErr(error.message); else { setMsg('Password updated.'); setPassword(''); }
  }

  async function resetBracket() {
    if (!confirm('Reset your entire bracket? This wipes ALL of your picks (group stage, best-thirds, every knockout round, and your award picks). This cannot be undone.')) return;
    setBusy(true); setMsg(null); setErr(null);
    const { error } = await supabase.from('brackets').update({
      group_picks: {},
      third_place_bets: [],
      knockout_picks: {},
      awards_picks: {},
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id);
    setBusy(false);
    if (error) setErr(error.message); else setMsg('Bracket reset. Reload the Bracket page to see it cleared.');
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <div className="display text-2xl text-gold mb-3">Settings</div>
        <div className="text-sm text-muted">Signed in as {user?.email}</div>
      </div>

      <form onSubmit={saveName} className="card space-y-3">
        <div className="label">Display name</div>
        <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        <button className="btn-primary w-full">Save name</button>
      </form>

      <form onSubmit={changePw} className="card space-y-3">
        <div className="label">Change password</div>
        <input className="input" type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="btn-primary w-full">Update password</button>
      </form>

      <div className="card space-y-3 border-red-700/40">
        <div className="label text-red-300">Danger zone</div>
        <p className="text-sm text-muted">Reset every pick you've made — group winners, runners-up, best-thirds, all knockout rounds, and award picks. Cannot be undone.</p>
        <button onClick={resetBracket} disabled={busy} className="btn-secondary w-full border-red-700/40 text-red-300 hover:border-red-500">
          {busy ? 'Resetting…' : 'Reset my bracket'}
        </button>
      </div>

      {msg && <div className="text-sm text-emerald-400">{msg}</div>}
      {err && <div className="text-sm text-red-400">{err}</div>}
    </div>
  );
}

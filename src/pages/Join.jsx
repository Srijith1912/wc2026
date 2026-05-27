import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Join() {
  const { user } = useAuth();
  const [mode, setMode] = useState('JOIN');
  const [existingGroups, setExistingGroups] = useState([]);
  const nav = useNavigate();

  useEffect(() => {
    if (!user) return;
    supabase.from('group_members').select('group_id, groups(name)').eq('user_id', user.id)
      .then(({ data }) => setExistingGroups(data || []));
  }, [user?.id]);

  return (
    <div className="max-w-md mx-auto py-6">
      <div className="display text-3xl text-gold mb-4">Groups</div>

      {existingGroups.length > 0 && (
        <div className="card mb-6">
          <div className="label mb-2">You're already in</div>
          <ul className="space-y-1 mb-3">
            {existingGroups.map((g) => (
              <li key={g.group_id} className="text-sm">· {g.groups?.name || g.group_id}</li>
            ))}
          </ul>
          <button onClick={() => nav('/bracket')} className="btn-secondary w-full">Go to my bracket</button>
        </div>
      )}

      <div className="flex gap-1.5 mb-4">
        <button
          onClick={() => setMode('JOIN')}
          className={`px-3 py-1.5 rounded-md text-sm border flex-1
            ${mode === 'JOIN' ? 'border-gold text-gold bg-gold/10' : 'border-border text-muted hover:text-white'}`}>
          Join existing
        </button>
        <button
          onClick={() => setMode('CREATE')}
          className={`px-3 py-1.5 rounded-md text-sm border flex-1
            ${mode === 'CREATE' ? 'border-gold text-gold bg-gold/10' : 'border-border text-muted hover:text-white'}`}>
          Create new
        </button>
      </div>

      {mode === 'JOIN' ? <JoinForm onSuccess={() => nav('/bracket')} /> : <CreateForm onSuccess={() => nav('/bracket')} />}

      <p className="text-xs text-muted mt-6 text-center">
        You can be in multiple groups. Your bracket is the same across all of them.
      </p>
    </div>
  );
}

function JoinForm({ onSuccess }) {
  const [passkey, setPasskey] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setErr(null); setBusy(true);
    const { error } = await supabase.rpc('join_group', { p_passkey: passkey.trim() });
    setBusy(false);
    if (error) setErr(error.message);
    else onSuccess();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-muted text-sm">Enter the secret passkey your friend gave you.</p>
      <input className="input" placeholder="Group passkey" value={passkey} onChange={(e) => setPasskey(e.target.value)} required autoFocus />
      {err && <div className="text-sm text-red-400">{err}</div>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? 'Joining…' : 'Join'}</button>
    </form>
  );
}

function CreateForm({ onSuccess }) {
  const [name, setName] = useState('');
  const [passkey, setPasskey] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setErr(null); setBusy(true);
    const { error } = await supabase.rpc('create_group', {
      p_name: name.trim(),
      p_passkey: passkey.trim(),
    });
    setBusy(false);
    if (error) setErr(error.message);
    else onSuccess();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-muted text-sm">Pick a name and a passkey. Share the passkey with friends so they can join.</p>
      <div>
        <span className="label block mb-1">Group name</span>
        <input className="input" placeholder="e.g. The Boys" value={name} onChange={(e) => setName(e.target.value)} minLength={2} required />
      </div>
      <div>
        <span className="label block mb-1">Passkey (your friends will use this to join)</span>
        <input className="input" placeholder="At least 4 characters" value={passkey} onChange={(e) => setPasskey(e.target.value)} minLength={4} required />
        <div className="text-xs text-muted mt-1">Passkey must be unique across all groups. Make it something memorable but not guessable.</div>
      </div>
      {err && <div className="text-sm text-red-400">{err}</div>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Create group'}</button>
    </form>
  );
}

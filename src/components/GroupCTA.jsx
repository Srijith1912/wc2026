import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

// Shown on the Bracket page only when the player isn't in any group yet —
// gently nudges them to create or join one so they can compare with friends.
// Groups are optional: the global leaderboard works without one.
export default function GroupCTA({ userId }) {
  const [state, setState] = useState('loading'); // 'loading' | 'none' | 'has'

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase.from('group_members').select('group_id').eq('user_id', userId).limit(1)
      .then(({ data }) => {
        if (cancelled) return;
        setState(data && data.length ? 'has' : 'none');
      });
    return () => { cancelled = true; };
  }, [userId]);

  if (state !== 'none') return null;

  return (
    <div className="card mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-gold/30">
      <div>
        <div className="label">Playing with friends?</div>
        <p className="text-sm text-muted mt-1">
          Create a private group or join one with a passkey to compare brackets head-to-head.
          It's optional — you're already on the global leaderboard.
        </p>
      </div>
      <Link to="/join" className="btn-secondary text-sm whitespace-nowrap shrink-0">Create or join a group</Link>
    </div>
  );
}

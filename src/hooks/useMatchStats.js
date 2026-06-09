import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { scoreMatches } from '../lib/scoring.js';

// Fetches a user's group-stage match-prediction stats: { points, correct, decided }.
// Used to fold match points into the "total score" shown on bracket pages.
// Subscribes to group_matches via Realtime so the total updates the moment the
// admin enters a result — no page refresh needed.
export default function useMatchStats(userId) {
  const [stats, setStats] = useState({ points: 0, correct: 0, decided: 0 });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function load() {
      const [{ data: matches }, { data: preds }] = await Promise.all([
        supabase.from('group_matches').select('id, result'),
        supabase.from('match_predictions').select('match_id, pick').eq('user_id', userId),
      ]);
      if (cancelled) return;
      const map = {};
      for (const p of (preds || [])) map[p.match_id] = p.pick;
      setStats(scoreMatches(map, matches || []));
    }

    load();

    const channel = supabase
      .channel(`match-stats-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_matches' }, load)
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [userId]);

  return stats;
}

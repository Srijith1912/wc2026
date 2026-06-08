import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { scoreMatches } from '../lib/scoring.js';

// Fetches a user's group-stage match-prediction stats: { points, correct, decided }.
// Used to fold match points into the "total score" shown on bracket pages.
export default function useMatchStats(userId) {
  const [stats, setStats] = useState({ points: 0, correct: 0, decided: 0 });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const [{ data: matches }, { data: preds }] = await Promise.all([
        supabase.from('group_matches').select('id, result'),
        supabase.from('match_predictions').select('match_id, pick').eq('user_id', userId),
      ]);
      if (cancelled) return;
      const map = {};
      for (const p of (preds || [])) map[p.match_id] = p.pick;
      setStats(scoreMatches(map, matches || []));
    })();
    return () => { cancelled = true; };
  }, [userId]);

  return stats;
}

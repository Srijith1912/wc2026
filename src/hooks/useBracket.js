import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';

// Loads the current user's bracket + the shared fixture_state.
// Returns { loading, bracket, fixture, setBracket, saving, save, savedAt }.
// `setBracket` updates local state and schedules a debounced save (700ms).
export default function useBracket(userId, { readOnly = false } = {}) {
  const [loading, setLoading]   = useState(true);
  const [bracket, setBracketSt] = useState(null);
  const [fixture, setFixture]   = useState(null);
  const [saving, setSaving]     = useState(false);
  const [savedAt, setSavedAt]   = useState(null);
  const [error, setError]       = useState(null);
  const timer = useRef(null);
  const pending = useRef(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: b }, { data: f }] = await Promise.all([
        supabase.from('brackets').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('fixture_state').select('*').eq('id', 1).maybeSingle(),
      ]);
      if (cancelled) return;
      setBracketSt(b || { user_id: userId, group_picks: {}, third_place_bets: [], knockout_picks: {} });
      setFixture(f  || { group_results: {}, third_place_assignments: {} });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const flush = useCallback(async () => {
    if (!pending.current || readOnly) return;
    const payload = pending.current;
    pending.current = null;
    setSaving(true);
    setError(null);
    const row = {
      user_id: userId,
      group_picks:      payload.group_picks      ?? {},
      third_place_bets: payload.third_place_bets ?? [],
      knockout_picks:   payload.knockout_picks   ?? {},
      updated_at: new Date().toISOString(),
    };
    // Default Supabase upsert returns the row, which re-evaluates SELECT RLS.
    // Use `Prefer: return=minimal` to skip that round-trip and avoid edge cases.
    const { error } = await supabase
      .from('brackets')
      .upsert(row, { onConflict: 'user_id' })
      .select('user_id')   // minimal column to keep payload tiny
      .maybeSingle();
    setSaving(false);
    if (error) {
      // eslint-disable-next-line no-console
      console.error('[useBracket] save failed:', error);
      setError(error.message || 'Save failed');
    } else {
      setSavedAt(new Date());
    }
  }, [userId, readOnly]);

  const setBracket = useCallback((updater) => {
    setBracketSt((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      pending.current = next;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 700);
      return next;
    });
  }, [flush]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { loading, bracket, fixture, setBracket, saving, savedAt, error, save: flush };
}

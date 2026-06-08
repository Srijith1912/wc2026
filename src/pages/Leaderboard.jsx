import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';

function fmtPoints(p) {
  const n = Number(p) || 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export default function Leaderboard() {
  const { user } = useAuth();

  const [tab, setTab] = useState('OVERALL');          // 'OVERALL' | 'GROUP'
  const [groups, setGroups] = useState([]);           // [{ id, name }]
  const [groupId, setGroupId] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // Load the groups this user belongs to (for the Group tab's switcher).
  useEffect(() => {
    if (!user) return;
    supabase.from('group_members').select('group_id, groups(name)').eq('user_id', user.id)
      .then(({ data }) => {
        const gs = (data || []).map((r) => ({ id: r.group_id, name: r.groups?.name || 'Group' }));
        setGroups(gs);
        setGroupId((cur) => cur || gs[0]?.id || '');
      });
  }, [user?.id]);

  // Fetch the active board (overall, or the selected group).
  useEffect(() => {
    if (tab === 'GROUP' && !groupId) { setRows([]); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true); setErr(null);
      const { data, error } = tab === 'GROUP'
        ? await supabase.rpc('group_leaderboard', { p_group_id: groupId })
        : await supabase.rpc('leaderboard');
      if (cancelled) return;
      if (error) setErr(error.message); else setRows(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [tab, groupId]);

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <div className="display text-3xl text-gold">🏆 Leaderboard</div>
        <p className="text-muted text-sm mt-1">
          Ranked by total points — your full bracket plus your group-match predictions.
        </p>
      </div>

      <div className="flex gap-1.5">
        <TabBtn active={tab === 'OVERALL'} onClick={() => setTab('OVERALL')}>Overall</TabBtn>
        <TabBtn active={tab === 'GROUP'} onClick={() => setTab('GROUP')}>My Group</TabBtn>
      </div>

      {tab === 'GROUP' && (
        groups.length === 0 ? (
          <div className="card text-sm text-muted">
            You're not in a group yet.{' '}
            <Link to="/join" className="text-gold hover:underline">Join or create one</Link> to see its leaderboard.
          </div>
        ) : groups.length > 1 ? (
          <select className="select" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        ) : (
          <div className="label">{groups[0].name}</div>
        )
      )}

      {err && <div className="card border-red-700/40 text-red-300 text-sm">{err}</div>}

      {loading ? (
        <div className="text-muted">Loading…</div>
      ) : (
        <Board rows={rows} emptyText={tab === 'GROUP' ? 'No scores in this group yet.' : 'No one has scored yet. Be the first!'} />
      )}
    </div>
  );
}

function Board({ rows, emptyText }) {
  return (
    <div className="card divide-y divide-border/60 p-0 overflow-hidden">
      {rows.length === 0 && <div className="p-4 text-muted text-sm">{emptyText}</div>}
      {rows.map((r) => <Row key={r.user_id} row={r} />)}
    </div>
  );
}

function Row({ row }) {
  const medal = row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : null;
  return (
    <div className={`w-full flex items-center gap-3 px-4 py-3 ${row.is_self ? 'bg-gold/10' : ''}`}>
      <span className="w-8 text-center tabular-nums text-muted shrink-0">
        {medal || `#${row.rank}`}
      </span>
      <span className="flex-1 min-w-0 truncate text-white">
        {row.display_name}{row.is_self && <span className="text-xs text-muted"> (you)</span>}
      </span>
      <span className="display text-xl text-gold tabular-nums shrink-0">{fmtPoints(row.points)}</span>
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap border
        ${active ? 'border-gold text-gold bg-gold/10' : 'border-border text-muted hover:text-white'}`}>
      {children}
    </button>
  );
}

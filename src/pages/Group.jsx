import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function GroupPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: memberRows } = await supabase
        .from('group_members')
        .select('group_id, groups(id, name)')
        .eq('user_id', user.id);
      if (!memberRows?.length) { setGroups([]); setLoading(false); return; }
      const groupIds = memberRows.map((r) => r.group_id);
      const { data: allMembers } = await supabase
        .from('group_members')
        .select('group_id, user_id, profiles(id, display_name)')
        .in('group_id', groupIds);
      if (cancelled) return;
      const byGroup = {};
      for (const row of (allMembers || [])) {
        if (!byGroup[row.group_id]) byGroup[row.group_id] = [];
        byGroup[row.group_id].push(row.profiles);
      }
      setGroups(memberRows.map((r) => ({
        id: r.group_id,
        name: r.groups?.name || r.group_id,
        members: byGroup[r.group_id] || [],
      })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (loading) return <div className="text-muted">Loading…</div>;

  if (groups.length === 0) {
    return (
      <div className="card max-w-md mx-auto text-center">
        <div className="display text-2xl text-gold mb-2">No group yet</div>
        <p className="text-muted mb-4">Join an existing group with a passkey, or start your own.</p>
        <Link to="/join" className="btn-primary inline-block">Join or create a group</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link to="/join" className="btn-secondary text-sm">+ Join or create another group</Link>
      </div>
      {groups.map((g) => (
        <div key={g.id} className="card">
          <div className="display text-2xl text-gold mb-3">{g.name}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {g.members.map((m) => (
              <Link key={m.id} to={m.id === user.id ? '/bracket' : `/group/${m.id}`}
                className="flex items-center justify-between px-3 py-2 rounded-md border border-border hover:border-gold">
                <span className="truncate">{m.display_name}</span>
                <span className="text-xs text-muted">
                  {m.id === user.id ? 'You' : 'View →'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

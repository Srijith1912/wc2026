import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function GroupPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setErr(null);
    const { data: memberRows, error: e1 } = await supabase
      .from('group_members')
      .select('group_id, groups(id, name, created_by)')
      .eq('user_id', user.id);
    if (e1) { setErr(e1.message); setLoading(false); return; }
    if (!memberRows?.length) { setGroups([]); setLoading(false); return; }
    const groupIds = memberRows.map((r) => r.group_id);
    const { data: allMembers, error: e2 } = await supabase
      .from('group_members')
      .select('group_id, user_id, joined_at, profiles(id, display_name)')
      .in('group_id', groupIds)
      .order('joined_at', { ascending: true });
    if (e2) { setErr(e2.message); setLoading(false); return; }
    const byGroup = {};
    for (const row of (allMembers || [])) {
      if (!byGroup[row.group_id]) byGroup[row.group_id] = [];
      byGroup[row.group_id].push(row.profiles);
    }
    setGroups(memberRows.map((r) => ({
      id: r.group_id,
      name: r.groups?.name || r.group_id,
      createdBy: r.groups?.created_by || null,
      members: byGroup[r.group_id] || [],
    })));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  async function leaveGroup(groupId, groupName, isCreator) {
    const extra = isCreator ? ' Since you\'re the leader, leadership transfers to the next member who joined.' : '';
    if (!confirm(`Leave "${groupName}"?${extra} Your own bracket is not affected.`)) return;
    setBusy(true); setErr(null);
    const { error } = await supabase.from('group_members').delete()
      .eq('group_id', groupId).eq('user_id', user.id);
    setBusy(false);
    if (error) setErr(error.message); else load();
  }

  async function kickMember(groupId, memberId, memberName) {
    if (!confirm(`Kick ${memberName || 'this member'} out of the group?`)) return;
    setBusy(true); setErr(null);
    const { error } = await supabase.from('group_members').delete()
      .eq('group_id', groupId).eq('user_id', memberId);
    setBusy(false);
    if (error) setErr(error.message); else load();
  }

  async function deleteGroup(groupId, groupName) {
    if (!confirm(`Delete "${groupName}"? This removes the group and kicks all members. Cannot be undone. Members' personal brackets remain.`)) return;
    setBusy(true); setErr(null);
    const { error } = await supabase.from('groups').delete().eq('id', groupId);
    setBusy(false);
    if (error) setErr(error.message); else load();
  }

  async function makeLeader(groupId, newLeaderId, newLeaderName) {
    if (!confirm(`Make ${newLeaderName} the new group leader? You'll lose the ability to delete the group or kick members.`)) return;
    setBusy(true); setErr(null);
    const { error } = await supabase.rpc('transfer_group_leader', {
      p_group_id: groupId,
      p_new_leader: newLeaderId,
    });
    setBusy(false);
    if (error) setErr(error.message); else load();
  }

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
      {err && <div className="card border-red-700/40 text-red-300 text-sm">{err}</div>}
      {groups.map((g) => {
        const isCreator = g.createdBy === user.id;
        return (
          <div key={g.id} className="card">
            <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
              <div>
                <div className="display text-2xl text-gold">{g.name}</div>
                {isCreator && <div className="text-xs text-muted mt-0.5">👑 You're the group leader</div>}
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => leaveGroup(g.id, g.name, isCreator)} disabled={busy}
                  className="btn-secondary text-xs">Leave group</button>
                {isCreator && (
                  <button onClick={() => deleteGroup(g.id, g.name)} disabled={busy}
                    className="btn-secondary text-xs border-red-700/40 text-red-300 hover:border-red-500">
                    Delete group
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {g.members.map((m) => {
                const isSelf = m.id === user.id;
                const isLeader = g.createdBy === m.id;
                const target = isSelf ? '/bracket' : `/group/${m.id}`;
                return (
                  <div
                    key={m.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => nav(target)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nav(target); } }}
                    className="flex items-center justify-between px-3 py-2 rounded-md border border-border hover:border-gold cursor-pointer transition group/row"
                  >
                    <span className="truncate flex items-center gap-2 min-w-0">
                      {isLeader && <span title="Group leader" aria-label="Group leader">👑</span>}
                      <span className="truncate">{m.display_name}</span>
                      {isSelf && <span className="text-xs text-muted">(you)</span>}
                    </span>
                    {isCreator && !isSelf && (
                      <div
                        className="flex gap-2 items-center"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => makeLeader(g.id, m.id, m.display_name)}
                          disabled={busy}
                          className="text-gold/70 hover:text-gold text-sm px-1"
                          title="Make this member the group leader"
                        >
                          👑
                        </button>
                        <button
                          onClick={() => kickMember(g.id, m.id, m.display_name)}
                          disabled={busy}
                          className="text-red-300 hover:text-red-500 text-sm px-1"
                          title="Kick member"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

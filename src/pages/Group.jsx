import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import GroupChat from '../components/GroupChat.jsx';

export default function GroupPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [groups, setGroups] = useState([]);
  const [publicGroups, setPublicGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setErr(null);
    const { data: memberRows, error: e1 } = await supabase
      .from('group_members')
      .select('group_id, groups(id, name, passkey, created_by, is_public, brackets_visible)')
      .eq('user_id', user.id);
    if (e1) { setErr(e1.message); setLoading(false); return; }
    if (!memberRows?.length) { setGroups([]); setLoading(false); return; }
    const groupIds = memberRows.map((r) => r.group_id);
    const { data: allMembers, error: e2 } = await supabase
      .from('group_members')
      .select('group_id, user_id, joined_at, is_leader, profiles(id, display_name)')
      .in('group_id', groupIds)
      .order('joined_at', { ascending: true });
    if (e2) { setErr(e2.message); setLoading(false); return; }
    const byGroup = {};
    for (const row of (allMembers || [])) {
      if (!byGroup[row.group_id]) byGroup[row.group_id] = [];
      byGroup[row.group_id].push({ ...row.profiles, is_leader: row.is_leader });
    }
    setGroups(memberRows.map((r) => ({
      id: r.group_id,
      name: r.groups?.name || r.group_id,
      passkey: r.groups?.passkey || '',
      isPublic: !!r.groups?.is_public,
      bracketsVisible: r.groups?.brackets_visible !== false,
      members: byGroup[r.group_id] || [],
    })));
    setLoading(false);
  }, [user?.id]);

  const loadPublic = useCallback(async () => {
    const { data } = await supabase.rpc('list_public_groups');
    setPublicGroups(data || []);
  }, []);

  useEffect(() => { load(); loadPublic(); }, [load, loadPublic]);

  async function leaveGroup(group, amLastLeader) {
    const extra = amLastLeader ? ' You\'re the only leader, so leadership passes to the next member who joined.' : '';
    if (!confirm(`Leave "${group.name}"?${extra} Your own bracket is not affected.`)) return;
    setBusy(true); setErr(null);
    const { error } = await supabase.from('group_members').delete()
      .eq('group_id', group.id).eq('user_id', user.id);
    setBusy(false);
    if (error) setErr(error.message); else { setSelectedId(null); load(); loadPublic(); }
  }

  async function kickMember(groupId, memberId, memberName) {
    if (!confirm(`Kick ${memberName || 'this member'} out of the group?`)) return;
    setBusy(true); setErr(null);
    const { error } = await supabase.from('group_members').delete()
      .eq('group_id', groupId).eq('user_id', memberId);
    setBusy(false);
    if (error) setErr(error.message); else { load(); loadPublic(); }
  }

  async function deleteGroup(groupId, groupName) {
    if (!confirm(`Delete "${groupName}"? This removes the group and kicks all members. Cannot be undone. Members' personal brackets remain.`)) return;
    setBusy(true); setErr(null);
    const { error } = await supabase.from('groups').delete().eq('id', groupId);
    setBusy(false);
    if (error) setErr(error.message); else { setSelectedId(null); load(); loadPublic(); }
  }

  async function addLeader(groupId, memberId, name) {
    if (!confirm(`Make ${name} a group leader? They'll be able to manage the group, including editing its name, passkey, and visibility.`)) return;
    setBusy(true); setErr(null);
    const { error } = await supabase.rpc('add_group_leader', { p_group_id: groupId, p_user: memberId });
    setBusy(false);
    if (error) setErr(error.message); else load();
  }

  async function removeLeader(groupId, memberId, name) {
    if (!confirm(`Remove ${name} as a group leader?`)) return;
    setBusy(true); setErr(null);
    const { error } = await supabase.rpc('remove_group_leader', { p_group_id: groupId, p_user: memberId });
    setBusy(false);
    if (error) setErr(error.message); else load();
  }

  async function joinPublic(groupId) {
    setBusy(true); setErr(null);
    const { error } = await supabase.rpc('join_public_group', { p_group_id: groupId });
    setBusy(false);
    if (error) setErr(error.message); else { load(); loadPublic(); }
  }

  if (loading) return <div className="text-muted">Loading…</div>;

  const selected = groups.find((g) => g.id === selectedId);

  // ─── Detail view ───
  if (selected) {
    const me = selected.members.find((m) => m.id === user.id);
    const isLeader = !!me?.is_leader;
    const leaderCount = selected.members.filter((m) => m.is_leader).length;
    const names = Object.fromEntries(selected.members.map((m) => [m.id, m.display_name]));

    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <button onClick={() => setSelectedId(null)} className="btn-secondary text-xs mb-2">← All groups</button>
            <div className="display text-2xl text-gold">{selected.name}</div>
            <div className="text-xs text-muted mt-0.5">
              {selected.isPublic ? '🌐 Public group' : '🔒 Private group'}
              {isLeader && ` · 👑 You're a leader${leaderCount > 1 ? ` (${leaderCount} total)` : ''}`}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => leaveGroup(selected, isLeader && leaderCount === 1)} disabled={busy}
              className="btn-secondary text-xs">Leave group</button>
            {isLeader && (
              <button onClick={() => deleteGroup(selected.id, selected.name)} disabled={busy}
                className="btn-secondary text-xs border-red-700/40 text-red-300 hover:border-red-500">
                Delete group
              </button>
            )}
          </div>
        </div>

        {err && <div className="card border-red-700/40 text-red-300 text-sm">{err}</div>}

        {isLeader && <GroupSettings group={selected} onSaved={() => { load(); loadPublic(); }} />}

        <div className="grid grid-cols-1 md:grid-cols-[230px_1fr] gap-4">
          <div>
            <div className="label mb-2">Members ({selected.members.length})</div>
            {!selected.bracketsVisible && (
              <p className="text-xs text-muted mb-2">Bracket viewing is turned off for this group.</p>
            )}
            <div className="space-y-1.5">
              {selected.members.map((m) => {
                const isSelf = m.id === user.id;
                const canOpen = isSelf || selected.bracketsVisible;   // gated by the group's bracket-sharing toggle
                return (
                  <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-md border border-border">
                    {canOpen ? (
                      <button
                        onClick={() => nav(isSelf ? '/bracket' : `/group/${m.id}`)}
                        className="truncate flex items-center gap-2 min-w-0 text-left hover:text-gold"
                        title="View bracket"
                      >
                        {m.is_leader && <span title="Group leader" aria-label="Group leader">👑</span>}
                        <span className="truncate">{m.display_name}</span>
                        {isSelf && <span className="text-xs text-muted">(you)</span>}
                      </button>
                    ) : (
                      <span className="truncate flex items-center gap-2 min-w-0">
                        {m.is_leader && <span title="Group leader" aria-label="Group leader">👑</span>}
                        <span className="truncate">{m.display_name}</span>
                      </span>
                    )}
                    {isLeader && (
                      <div className="flex gap-2 items-center shrink-0">
                        {!m.is_leader && (
                          <button onClick={() => addLeader(selected.id, m.id, m.display_name)} disabled={busy}
                            className="text-gold/70 hover:text-gold text-sm px-1" title="Make leader">👑</button>
                        )}
                        {m.is_leader && leaderCount > 1 && (
                          <button onClick={() => removeLeader(selected.id, m.id, m.display_name)} disabled={busy}
                            className="text-muted hover:text-white text-xs px-1" title="Remove leader">⬇︎</button>
                        )}
                        {!isSelf && (
                          <button onClick={() => kickMember(selected.id, m.id, m.display_name)} disabled={busy}
                            className="text-red-300 hover:text-red-500 text-sm px-1" title="Kick member">✕</button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <GroupChat groupId={selected.id} currentUserId={user.id} names={names} />
        </div>
      </div>
    );
  }

  // ─── List view ───
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between">
          <div className="display text-2xl text-gold">Your groups</div>
          <Link to="/join" className="btn-secondary text-sm">+ Join or create</Link>
        </div>
        {err && <div className="card border-red-700/40 text-red-300 text-sm mt-3">{err}</div>}

        {groups.length === 0 ? (
          <div className="card text-center mt-3">
            <p className="text-muted mb-3">You're not in a group yet. Join one with a passkey, create your own, or join a public group below.</p>
            <Link to="/join" className="btn-primary inline-block">Join or create a group</Link>
          </div>
        ) : (
          <>
            <p className="text-muted text-sm mt-2 mb-3">Tap a group to see its members and chat.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {groups.map((g) => {
                const iLead = g.members.find((m) => m.id === user.id)?.is_leader;
                return (
                  <button key={g.id} onClick={() => setSelectedId(g.id)}
                    className="card text-left hover:border-gold transition flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="display text-xl text-gold truncate">{g.name}</div>
                      <div className="text-xs text-muted mt-0.5">
                        {g.isPublic ? '🌐 Public' : '🔒 Private'} · {g.members.length} member{g.members.length === 1 ? '' : 's'}
                        {iLead && ' · 👑 you lead'}
                      </div>
                    </div>
                    <span className="text-muted text-lg shrink-0">›</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {publicGroups.length > 0 && (
        <div>
          <div className="display text-xl text-gold">Public groups</div>
          <p className="text-muted text-sm mt-1 mb-3">Open groups anyone can join with one click.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {publicGroups.map((g) => {
              const count = Number(g.member_count) || 0;
              return (
                <div key={g.id} className="card flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="display text-lg text-gold truncate">{g.name}</div>
                    <div className="text-xs text-muted">{count} member{count === 1 ? '' : 's'}</div>
                  </div>
                  {g.is_member ? (
                    <span className="text-xs text-muted shrink-0">Joined ✓</span>
                  ) : (
                    <button onClick={() => joinPublic(g.id)} disabled={busy} className="btn-secondary text-sm shrink-0">Join</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Leader-only panel: privacy toggle + rename + change passkey.
function GroupSettings({ group, onSaved }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(group.name);
  const [passkey, setPasskey] = useState(group.passkey || '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    setName(group.name);
    setPasskey(group.passkey || '');
    setMsg(null); setErr(null);
  }, [group.id, group.name, group.passkey]);

  async function togglePrivacy() {
    setBusy(true); setMsg(null); setErr(null);
    const { error } = await supabase.rpc('set_group_public', { p_group_id: group.id, p_is_public: !group.isPublic });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSaved?.();
  }

  async function toggleBrackets() {
    setBusy(true); setMsg(null); setErr(null);
    const { error } = await supabase.rpc('set_group_brackets_visible', { p_group_id: group.id, p_visible: !group.bracketsVisible });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSaved?.();
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true); setMsg(null); setErr(null);
    const { error } = await supabase.rpc('update_group', {
      p_group_id: group.id,
      p_name: name.trim(),
      p_passkey: passkey.trim(),
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setMsg('Saved.');
    onSaved?.();
  }

  return (
    <div className="card">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between text-left">
        <span className="label">⚙️ Group settings</span>
        <span className="text-muted text-sm">{open ? 'Hide' : 'Edit'}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm text-white">Visibility</div>
              <div className="text-xs text-muted">
                {group.isPublic
                  ? 'Public — anyone can find & join; members can’t see each other’s brackets.'
                  : 'Private — passkey needed to join; members can see each other’s brackets.'}
              </div>
            </div>
            <button onClick={togglePrivacy} disabled={busy}
              className={`px-3 py-1.5 rounded-md text-sm border shrink-0
                ${group.isPublic ? 'border-gold text-gold bg-gold/10' : 'border-border text-muted hover:text-white'}`}>
              {group.isPublic ? '🌐 Public' : '🔒 Private'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <div className="min-w-0">
              <div className="text-sm text-white">Bracket sharing</div>
              <div className="text-xs text-muted">
                {group.bracketsVisible
                  ? 'On — members can view each other’s brackets and match picks.'
                  : 'Off — members can’t see each other’s brackets or picks.'}
              </div>
            </div>
            <button onClick={toggleBrackets} disabled={busy}
              className={`px-3 py-1.5 rounded-md text-sm border shrink-0
                ${group.bracketsVisible ? 'border-gold text-gold bg-gold/10' : 'border-border text-muted hover:text-white'}`}>
              {group.bracketsVisible ? 'Shared' : 'Hidden'}
            </button>
          </div>

          <form onSubmit={save} className="space-y-3 border-t border-border pt-3">
            <div>
              <span className="label block mb-1">Group name</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} minLength={2} required />
            </div>
            <div>
              <span className="label block mb-1">Passkey {group.isPublic && <span className="text-muted normal-case">(only used if you switch back to private)</span>}</span>
              <input className="input" value={passkey} onChange={(e) => setPasskey(e.target.value)} minLength={4} required />
              <div className="text-xs text-muted mt-1">Must be unique across all groups.</div>
            </div>
            {msg && <div className="text-sm text-emerald-400">{msg}</div>}
            {err && <div className="text-sm text-red-400">{err}</div>}
            <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
          </form>
        </div>
      )}
    </div>
  );
}

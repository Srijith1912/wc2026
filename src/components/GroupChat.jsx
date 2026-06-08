import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';

// Persistent, real-time group chat. Loads the group's history, subscribes to
// new messages via Supabase Realtime, and lets members post. `names` maps a
// user id -> display name (passed from the parent, which already has members).
export default function GroupChat({ groupId, currentUserId, names = {} }) {
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState(null);
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);

  const nameFor = (uid) => names[uid] || 'Member';

  // Load history + subscribe to realtime inserts for this group.
  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;
    setLoading(true);

    supabase.from('messages')
      .select('id, user_id, body, created_at')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(500)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setErr(error.message); else setMessages(data || []);
        setLoading(false);
      });

    const channel = supabase
      .channel(`group-chat-${groupId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
        (payload) => {
          setMessages((prev) =>
            prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]
          );
        })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [groupId]);

  // Keep the view pinned to the newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  async function send(e) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true); setErr(null);
    const { data, error } = await supabase.from('messages')
      .insert({ group_id: groupId, user_id: currentUserId, body: text })
      .select('id, user_id, body, created_at')
      .single();
    setSending(false);
    if (error) { setErr(error.message); return; }
    setBody('');
    // Optimistic add (realtime echo is de-duped by id in the subscription).
    setMessages((prev) => prev.some((m) => m.id === data.id) ? prev : [...prev, data]);
  }

  return (
    <div className="flex flex-col h-[28rem] card p-0 overflow-hidden">
      <div className="px-3 py-2 border-b border-border text-sm text-muted shrink-0">Group chat</div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {loading ? (
          <div className="text-muted text-sm">Loading messages…</div>
        ) : messages.length === 0 ? (
          <div className="text-muted text-sm">No messages yet. Say hello 👋</div>
        ) : (
          messages.map((m) => {
            const mine = m.user_id === currentUserId;
            return (
              <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-1.5 text-sm break-words
                  ${mine ? 'bg-gold/15 border border-gold/30' : 'bg-panel2 border border-border'}`}>
                  {!mine && <div className="text-[11px] text-gold mb-0.5">{nameFor(m.user_id)}</div>}
                  <div className="text-white whitespace-pre-wrap">{m.body}</div>
                </div>
                <div className="text-[10px] text-muted mt-0.5">{fmtTime(m.created_at)}</div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {err && <div className="px-3 py-1 text-xs text-red-400 shrink-0">{err}</div>}

      <form onSubmit={send} className="flex gap-2 p-2 border-t border-border shrink-0">
        <input
          className="input flex-1"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Message your group…"
          maxLength={1000}
        />
        <button className="btn-primary px-4" disabled={sending || !body.trim()}>
          {sending ? '…' : 'Send'}
        </button>
      </form>
    </div>
  );
}

function fmtTime(ts) {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

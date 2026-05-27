export default function SaveIndicator({ saving, savedAt, error }) {
  if (error) return <span className="text-xs text-red-400">⚠ {error}</span>;
  if (saving) return <span className="text-xs text-muted">Saving…</span>;
  if (savedAt) return <span className="text-xs text-muted">Saved {savedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>;
  return null;
}

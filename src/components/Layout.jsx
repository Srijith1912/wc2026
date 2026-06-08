import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { isAdmin } from '../lib/admin.js';

export default function Layout() {
  const { user, profile, signOut } = useAuth();
  const nav = useNavigate();
  const admin = isAdmin(user);

  const items = user
    ? [
        { to: '/', label: 'Home', end: true },
        { to: '/bracket', label: 'Bracket' },
        { to: '/leaderboard', label: 'Leaderboard' },
        { to: '/group', label: 'Group' },
        { to: '/how-to-play', label: 'How To Play' },
        { to: '/contact', label: 'Contact' },
        { to: '/settings', label: 'Settings' },
        ...(admin ? [{ to: '/admin', label: 'Admin' }] : []),
      ]
    : [
        { to: '/', label: 'Home', end: true },
        { to: '/how-to-play', label: 'How To Play' },
        { to: '/contact', label: 'Contact' },
      ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="display text-2xl text-gold tracking-wider">WC&nbsp;2026</Link>
          {user && profile?.display_name && (
            <span className="text-white text-sm hidden sm:inline">· {profile.display_name}</span>
          )}
          <div className="ml-auto flex items-center gap-1 overflow-x-auto">
            {items.map((i) => (
              <NavLink key={i.to} to={i.to} end={i.end}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm whitespace-nowrap ${isActive ? 'bg-panel text-gold' : 'text-muted hover:text-white'}`
                }>
                {i.label}
              </NavLink>
            ))}
            {user ? (
              <button onClick={async () => { await signOut(); nav('/'); }}
                className="px-3 py-1.5 rounded-md text-sm text-muted hover:text-white">
                Sign out
              </button>
            ) : (
              <>
                <NavLink to="/login" className="px-3 py-1.5 rounded-md text-sm text-muted hover:text-white">Log in</NavLink>
                <Link to="/signup" className="btn-primary text-sm px-3 py-1.5">Sign up</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6">
        <Outlet />
      </main>
      <footer className="border-t border-border py-4 text-center text-muted text-xs">
        Not affiliated with FIFA. · <Link to="/contact" className="hover:text-gold">Contact</Link>
      </footer>
    </div>
  );
}

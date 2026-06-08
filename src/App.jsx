import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Contact from './pages/Contact.jsx';
import Join from './pages/Join.jsx';
import Bracket from './pages/Bracket.jsx';
import GroupPage from './pages/Group.jsx';
import MemberBracket from './pages/MemberBracket.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import HowToPlay from './pages/HowToPlay.jsx';
import Settings from './pages/Settings.jsx';
import Admin from './pages/Admin.jsx';
import { isAdmin } from './lib/admin.js';

// Gate for routes that require a signed-in user.
function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6 text-muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function AdminOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6 text-muted">Loading…</div>;
  if (!user || !isAdmin(user)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"  element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Everything else lives inside the shared layout (navbar + footer),
          available to guests and members alike. */}
      <Route element={<Layout />}>
        <Route path="/"            element={<Home />} />
        <Route path="/how-to-play" element={<HowToPlay />} />
        <Route path="/contact"     element={<Contact />} />

        <Route element={<RequireAuth />}>
          <Route path="/join"          element={<Join />} />
          <Route path="/bracket"       element={<Bracket />} />
          <Route path="/group"         element={<GroupPage />} />
          <Route path="/group/:userId" element={<MemberBracket />} />
          <Route path="/leaderboard"   element={<Leaderboard />} />
          <Route path="/settings"      element={<Settings />} />
          <Route path="/admin"         element={<AdminOnly><Admin /></AdminOnly>} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

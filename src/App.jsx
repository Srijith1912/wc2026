import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Join from './pages/Join.jsx';
import Bracket from './pages/Bracket.jsx';
import GroupPage from './pages/Group.jsx';
import MemberBracket from './pages/MemberBracket.jsx';
import HowToPlay from './pages/HowToPlay.jsx';
import Settings from './pages/Settings.jsx';
import Admin from './pages/Admin.jsx';
import { isAdmin } from './lib/admin.js';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6 text-muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6 text-muted">Loading…</div>;
  if (!user || !isAdmin(user)) return <Navigate to="/bracket" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/bracket" replace /> : <Landing />} />
      <Route path="/login"  element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/join"            element={<Join />} />
        <Route path="/bracket"         element={<Bracket />} />
        <Route path="/group"           element={<GroupPage />} />
        <Route path="/group/:userId"   element={<MemberBracket />} />
        <Route path="/how-to-play"     element={<HowToPlay />} />
        <Route path="/settings"        element={<Settings />} />
        <Route path="/admin"           element={<AdminOnly><Admin /></AdminOnly>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

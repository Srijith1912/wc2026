import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="display text-5xl sm:text-7xl text-gold tracking-wider">WC 2026</div>
      <div className="display text-xl sm:text-2xl mt-2">Friend-Group Predictions</div>
      <p className="text-muted mt-6 max-w-md">
        Pick your bracket. See your friends' picks. Bragging rights only.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <Link to="/login"  className="btn-primary flex-1">Log In</Link>
        <Link to="/signup" className="btn-secondary flex-1">Create Account</Link>
      </div>
      <div className="mt-10 text-xs text-muted">June 11 – July 19, 2026</div>
    </div>
  );
}

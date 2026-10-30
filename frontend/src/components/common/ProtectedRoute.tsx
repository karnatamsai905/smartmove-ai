import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface Props {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'driver';
}

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-3 text-sm text-slate-500 font-medium">Loading SmartMove AI…</p>
        </div>
      </div>
    );
  }

  // Not logged in -> go to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check
  if (requiredRole) {
    const userRole = profile?.role || (user.user_metadata?.role as 'admin' | 'driver') || 'admin';
    if (userRole !== requiredRole) {
      const destination = userRole === 'admin' ? '/admin/dashboard' : '/driver/dashboard';
      // Prevent infinite redirect loop if destination is the same as current page
      if (location.pathname === destination) {
        return <>{children}</>;
      }
      return <Navigate to={destination} replace />;
    }
  }

  return <>{children}</>;
}

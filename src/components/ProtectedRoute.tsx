import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import type { AppRole } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, userContext, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!userContext) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading user context...</p>
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(userContext.role)) {
    // Redirect to appropriate dashboard based on role
    const dashboardPath = getDashboardPath(userContext.role);
    return <Navigate to={dashboardPath} replace />;
  }

  return <>{children}</>;
}

export function getDashboardPath(role: AppRole): string {
  switch (role) {
    case 'WORKER':
      return '/worker/dashboard';
    case 'ESTABLISHMENT_ADMIN':
      return '/establishment/dashboard';
    case 'DEPARTMENT_ADMIN':
      return '/department/dashboard';
    case 'EMPLOYEE':
    case 'employee':
      return '/conductor/dashboard';
    default:
      return '/';
  }
}

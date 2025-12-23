import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { getDashboardPath } from './ProtectedRoute';
import { Shield, Loader2, CheckCircle } from 'lucide-react';

export function MockThalesAuth() {
  const navigate = useNavigate();
  const { userContext } = useAuth();
  const [stage, setStage] = useState<'authenticating' | 'verified'>('authenticating');

  useEffect(() => {
    // Stage 1: Show authenticating for 1500ms
    const timer1 = setTimeout(() => {
      setStage('verified');
    }, 1500);

    // Stage 2: Navigate after total 2000ms
    const timer2 = setTimeout(() => {
      if (userContext) {
        const dashboardPath = getDashboardPath(userContext.role);
        navigate(dashboardPath, { replace: true });
      }
    }, 2000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [userContext, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar to-sidebar-accent">
      <div className="bg-card p-12 rounded-xl shadow-2xl max-w-md w-full mx-4 animate-fade-in">
        <div className="flex flex-col items-center gap-6">
          {/* THALES Logo placeholder */}
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          
          <div className="text-center">
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">
              THALES Authentication
            </h1>
            <p className="text-muted-foreground text-sm">
              Secure Identity Verification
            </p>
          </div>

          {/* Status */}
          <div className="flex flex-col items-center gap-4 py-6">
            {stage === 'authenticating' ? (
              <>
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <div className="text-center">
                  <p className="font-medium text-foreground">Verifying Identity...</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please wait while we authenticate your credentials
                  </p>
                </div>
              </>
            ) : (
              <>
                <CheckCircle className="w-12 h-12 text-success animate-fade-in" />
                <div className="text-center">
                  <p className="font-medium text-success">Authentication Successful</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Redirecting to your dashboard...
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full bg-primary transition-all duration-2000 ease-out ${
                stage === 'authenticating' ? 'w-1/2' : 'w-full'
              }`}
            />
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Mock authentication for POC demonstration
          </p>
        </div>
      </div>
    </div>
  );
}

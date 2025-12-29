import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Clock, 
  Loader2, 
  ArrowLeft, 
  AlertCircle, 
  Building2, 
  LogOut,
  User,
  LogIn,
  LogOut as LogOutIcon,
  Ban,
  Landmark,
  Shield,
  CheckCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface AttendanceResult {
  success: boolean;
  message: string;
  code?: string;
  data?: {
    eventType: 'CHECK_IN' | 'CHECK_OUT';
    workerName: string;
    workerId: string;
    establishmentName?: string;
    occurredAt: string;
  };
}

// Error code to user-friendly message mapping
const getErrorMessage = (code: string | undefined, defaultMessage?: string): string => {
  const messages: Record<string, string> = {
    NO_ACTIVE_MAPPING: 'Worker is not mapped to this establishment.',
    ESTABLISHMENT_NOT_APPROVED: 'This establishment is inactive. Please activate it from Department.',
    WORKER_DEPT_MISMATCH: 'Worker belongs to a different department.',
    WORKER_INACTIVE: 'Worker is inactive.',
    WORKER_NOT_FOUND: 'Worker ID not found. Please check and try again.',
    INVALID_WORKER_ID: 'Worker ID not found. Please check and try again.',
    INVALID_INPUT: 'Please provide a valid Worker ID or Employee ID.',
    MAPPED_TO_DIFFERENT_ESTABLISHMENT: 'This worker is mapped to a different establishment.',
    ESTABLISHMENT_NOT_FOUND: 'Establishment not found.',
    LOOKUP_ERROR: 'Unable to verify worker details. Please try again.',
    INSERT_ERROR: 'Failed to record attendance. Please try again.',
    INTERNAL_ERROR: 'Attendance failed. Please try again.',
    NETWORK_ERROR: 'Unable to reach attendance service.',
  };
  if (code && messages[code]) {
    return messages[code];
  }
  return defaultMessage || 'Attendance failed. Please try again.';
};

// THALES authentication modal component (inline for attendance)
function ThalesAuthOverlay({ stage }: { stage: 'authenticating' | 'verified' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-sidebar to-sidebar-accent">
      <div className="bg-card p-12 rounded-xl shadow-2xl max-w-md w-full mx-4 animate-fade-in">
        <div className="flex flex-col items-center gap-6">
          {/* THALES Logo placeholder */}
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-10 h-10 text-primary" />
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">THALES Authentication</h1>
            <p className="text-muted-foreground text-sm">Secure Identity Verification</p>
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
                  <p className="text-sm text-muted-foreground mt-1">Processing attendance...</p>
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
        </div>
      </div>
    </div>
  );
}

export default function EstablishmentAttendance() {
  const { userContext, signOut } = useAuth();
  const navigate = useNavigate();
  const [workerIdentifier, setWorkerIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [showThales, setShowThales] = useState(false);
  const [thalesStage, setThalesStage] = useState<'authenticating' | 'verified'>('authenticating');
  const { toast } = useToast();

  // Fetch establishment details to check approval status (for UI display only)
  const { data: establishment } = useQuery({
    queryKey: ['establishment', userContext?.establishmentId],
    queryFn: async () => {
      if (!userContext?.establishmentId) return null;
      const { data, error } = await supabase
        .from('establishments')
        .select('id, name, is_approved, department_id, departments(name)')
        .eq('id', userContext.establishmentId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userContext?.establishmentId,
  });

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  // Helper to call edge function and handle response
  const callAttendanceEdgeFunction = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('submit-attendance', {
        body: {
          workerIdentifier: workerIdentifier.trim().toUpperCase(),
          establishmentId: userContext?.establishmentId,
        },
      });

      // Handle network/fetch errors (no response at all)
      if (error) {
        console.error('Edge function error:', error);
        const errorMessage = getErrorMessage('NETWORK_ERROR');
        const errorResult: AttendanceResult = { 
          success: false, 
          message: errorMessage,
          code: 'NETWORK_ERROR'
        };
        setResult(errorResult);
        toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
        return;
      }

      // Handle error response from Edge Function (non-2xx with JSON body)
      if (data && !data.success) {
        const errorMessage = getErrorMessage(data.code, data.message);
        const errorResult: AttendanceResult = { 
          success: false, 
          message: errorMessage,
          code: data.code
        };
        setResult(errorResult);
        toast({ title: 'Attendance Failed', description: errorMessage, variant: 'destructive' });
        return;
      }

      // Success
      const attendanceResult: AttendanceResult = {
        success: true,
        message: data.message,
        data: {
          eventType: data.data.eventType,
          workerName: data.data.workerName,
          workerId: data.data.workerId,
          establishmentName: data.data.establishmentName,
          occurredAt: data.data.occurredAt,
        }
      };

      setResult(attendanceResult);
      toast({ title: 'Success', description: attendanceResult.message });
      setWorkerIdentifier('');
    } catch (err) {
      console.error('Attendance submission error:', err);
      const errorMessage = getErrorMessage('NETWORK_ERROR');
      const errorResult: AttendanceResult = { 
        success: false, 
        message: errorMessage,
        code: 'NETWORK_ERROR'
      };
      setResult(errorResult);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation - do NOT show THALES if validation fails
    if (!workerIdentifier.trim()) {
      toast({ title: 'Error', description: 'Please enter Worker ID or Employee ID', variant: 'destructive' });
      return;
    }

    if (!userContext?.establishmentId) {
      toast({ title: 'Error', description: 'Establishment context not available', variant: 'destructive' });
      return;
    }

    // Start loading and show THALES
    setLoading(true);
    setResult(null);
    setShowThales(true);
    setThalesStage('authenticating');

    // THALES mock: show authenticating for 1500ms, then verified for 500ms, then call edge function
    setTimeout(() => {
      setThalesStage('verified');
    }, 1500);

    // After 2000ms total, hide THALES and call the edge function
    setTimeout(() => {
      setShowThales(false);
      setThalesStage('authenticating'); // reset for next time
      callAttendanceEdgeFunction();
    }, 2000);
  };

  // Check if establishment is active
  const isApproved = establishment?.is_approved ?? false;
  const isLoadingEstablishment = !establishment;
  const departmentName = (establishment?.departments as any)?.name || 'Unknown Department';

  return (
    <>
      {/* THALES Authentication Overlay - shown only during attendance submission */}
      {showThales && <ThalesAuthOverlay stage={thalesStage} />}
      
      <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <Building2 className="w-6 h-6 text-accent-foreground" />
            </div>
            <span className="text-xl font-display font-bold">Worker Connect</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{userContext?.fullName}</span>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/establishment/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>

        {/* Inactive Establishment Warning */}
        {!isLoadingEstablishment && !isApproved && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <div className="flex items-center gap-2 text-destructive">
              <Ban className="w-5 h-5" />
              <span className="font-medium">Establishment Inactive</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <Landmark className="w-3 h-3" />
              This establishment must be activated by <strong className="mx-1">{departmentName}</strong> before attendance can be recorded.
            </p>
          </div>
        )}

        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${isApproved ? 'bg-accent' : 'bg-muted'}`}>
                {isApproved ? (
                  <Clock className="w-8 h-8 text-accent-foreground" />
                ) : (
                  <Ban className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
            </div>
            <h1 className="text-2xl font-display font-bold">Worker Check-in / Check-out</h1>
            <p className="text-muted-foreground">Record attendance for workers at {establishment?.name || 'this establishment'}</p>
          </div>

          <Card className={!isApproved ? 'opacity-60' : ''}>
            <CardHeader>
              <CardTitle>Submit Attendance</CardTitle>
              <CardDescription>
                {isApproved 
                  ? 'Enter Worker ID or Employee ID' 
                  : 'Attendance disabled — establishment is inactive'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workerIdentifier">Worker ID / Employee ID</Label>
                  <Input
                    id="workerIdentifier"
                    placeholder="e.g., WKR00000001"
                    value={workerIdentifier}
                    onChange={(e) => setWorkerIdentifier(e.target.value.toUpperCase())}
                    disabled={loading || !isApproved}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || !isApproved}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {!isApproved ? (
                    <>
                      <Ban className="w-4 h-4 mr-2" />
                      Attendance Disabled
                    </>
                  ) : (
                    'Submit Attendance'
                  )}
                </Button>
              </form>

              {result && !result.success && (
                <div className="mt-6 p-4 bg-destructive/10 rounded-lg animate-fade-in">
                  <div className="flex items-center gap-2 text-destructive mb-2">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Attendance Failed</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                </div>
              )}

              {result?.success && result.data && (
                <div className="mt-6 p-4 bg-success/10 rounded-lg animate-fade-in">
                  <div className="flex items-center gap-2 text-success mb-3">
                    {result.data.eventType === 'CHECK_IN' ? (
                      <LogIn className="w-5 h-5" />
                    ) : (
                      <LogOutIcon className="w-5 h-5" />
                    )}
                    <span className="font-medium">
                      {result.data.eventType === 'CHECK_IN' ? 'Checked In' : 'Checked Out'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span><strong>Worker:</strong> {result.data.workerName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="font-mono text-xs">
                        {result.data.workerId}
                      </Badge>
                    </div>
                    {result.data.establishmentName && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span><strong>Establishment:</strong> {result.data.establishmentName}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>
                        <strong>Time:</strong>{' '}
                        {new Date(result.data.occurredAt).toLocaleString('en-IN', { 
                          timeZone: 'Asia/Kolkata' 
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
    </>
  );
}

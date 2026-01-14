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
  CheckCircle,
  Settings,
  Scan,
  Fingerprint,
  MapPin
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
              className={`h-full bg-primary transition-all duration-2000 ease-out ${stage === 'authenticating' ? 'w-1/2' : 'w-full'
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
        .select('id, name, is_active, department_id, departments(name)')
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

    if (!workerIdentifier.trim()) {
      toast({ title: 'Error', description: 'Please enter Worker ID', variant: 'destructive' });
      return;
    }

    if (!userContext?.establishmentId) {
      toast({ title: 'Error', description: 'Establishment context not available', variant: 'destructive' });
      return;
    }

    // Start loading
    setLoading(true);
    setResult(null);
    setShowThales(true);
    setThalesStage('authenticating');

    try {
      // Dynamic import to avoid SSR issues if any (though client side usually fine)
      const { authenticateUser } = await import("@/lib/api");

      // Pass establishment name or ID to the backend for location context
      const establishmentName = establishment?.name || "Establishment Kiosk";

      // --- KEY CHANGE: ACTUAL FIDO CALL ---
      // @ts-ignore
      const fidoResult = await authenticateUser(workerIdentifier, 'toggle', establishmentName);

      if (fidoResult && fidoResult.verified) {
        setThalesStage('verified');

        // Construct success result matching interface
        const successResult: AttendanceResult = {
          success: true,
          message: fidoResult.message || 'Verification Successful',
          data: {
            eventType: fidoResult.status === 'in' ? 'CHECK_IN' : 'CHECK_OUT',
            workerName: fidoResult.username || workerIdentifier, // Backend should return name
            workerId: workerIdentifier,
            establishmentName: establishmentName,
            occurredAt: new Date().toISOString()
          }
        };

        setTimeout(() => {
          setResult(successResult);
          setShowThales(false);
          setWorkerIdentifier('');
          toast({ title: 'Success', description: successResult.message });
        }, 1000); // 1s delay to show verify checkmark

      } else {
        throw new Error('Verification failed or declined.');
      }

    } catch (err: any) {
      console.error("FIDO Check-in Failed", err);
      setShowThales(false); // Hide overlay immediately on error
      setResult({
        success: false,
        message: err.message || "Authentication failed",
        code: 'AUTH_FAILED'
      });
      toast({ title: 'Error', description: err.message || "Authentication failed", variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Check if establishment is active
  const isActive = establishment?.is_active ?? false;
  const isLoadingEstablishment = !establishment;
  const departmentName = (establishment?.departments as any)?.name || 'Unknown Department';
  const establishmentName = establishment?.name || 'Unknown Station';

  const [scanOpen, setScanOpen] = useState(false);

  const handleTap = () => {
    setScanOpen(true);
    // Auto focus the input when dialog opens (handled by autoFocus prop)
  };

  const onScanSubmit = async () => {
    setScanOpen(false);
    // Trigger the actual submission logic
    // reusing handleSubmit logic but adapting for direct call
    if (!workerIdentifier.trim()) {
      toast({ title: 'Error', description: 'Please enter Worker ID', variant: 'destructive' });
      return;
    }

    if (!userContext?.establishmentId) {
      toast({ title: 'Error', description: 'Establishment context not available', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setResult(null);
    setShowThales(true);
    setThalesStage('authenticating');

    try {
      const { authenticateUser } = await import("@/lib/api");
      const fidoResult = await authenticateUser(workerIdentifier, 'toggle', establishmentName);

      if (fidoResult && fidoResult.verified) {
        setThalesStage('verified');
        const successResult: AttendanceResult = {
          success: true,
          message: fidoResult.message || 'Verification Successful',
          data: {
            eventType: fidoResult.status === 'in' ? 'CHECK_IN' : 'CHECK_OUT',
            workerName: fidoResult.username || workerIdentifier,
            workerId: workerIdentifier,
            establishmentName: establishmentName,
            occurredAt: new Date().toISOString()
          }
        };

        setTimeout(() => {
          setResult(successResult);
          setShowThales(false);
          setWorkerIdentifier('');
          toast({ title: 'Success', description: successResult.message });
        }, 1000);

      } else {
        throw new Error('Verification failed or declined.');
      }
    } catch (err: any) {
      console.error("FIDO Check-in Failed", err);
      setShowThales(false);
      setResult({
        success: false,
        message: err.message || "Authentication failed",
        code: 'AUTH_FAILED'
      });
      toast({ title: 'Error', description: err.message || "Authentication failed", variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showThales && <ThalesAuthOverlay stage={thalesStage} />}

      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">

        {/* Settings / Back */}
        <div className="absolute top-6 right-6 flex gap-4">
          <Link to="/establishment/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-200">
              <ArrowLeft className="w-6 h-6 text-slate-600" />
            </Button>
          </Link>
          {/* Settings Icon */}
          <Button variant="ghost" size="icon" className="rounded-full shadow-sm bg-white hover:bg-slate-100 border">
            <Settings className="w-5 h-5 text-slate-600" />
          </Button>
        </div>

        {/* KIOSK CARD */}
        <Card className="w-full max-w-md shadow-xl border-0 rounded-3xl overflow-hidden bg-white/90 backdrop-blur-sm ring-1 ring-slate-100">
          <CardContent className="flex flex-col items-center p-12 text-center space-y-8">

            {/* Logo/Icon Area */}
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-3xl flex items-center justify-center shadow-lg transform rotate-3">
                <Shield className="w-12 h-12 text-white" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-full shadow-md">
                <Fingerprint className="w-6 h-6 text-cyan-600" />
              </div>
            </div>

            {/* Header */}
            <div className="space-y-2">
              <h1 className="text-3xl font-display font-bold text-slate-800 tracking-tight">Worker Connect</h1>
              <h2 className="text-lg font-medium text-slate-500 uppercase tracking-widest">Access System</h2>
            </div>

            {/* Status Display */}
            <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-6 space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Current Status</span>
              <div className="text-3xl font-bold text-slate-700 animate-pulse">READY</div>
            </div>

            {/* Tap Action Button */}
            <Button
              size="lg"
              className="w-full h-20 text-xl font-bold rounded-2xl shadow-lg bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              onClick={handleTap}
              disabled={!isActive || loading}
            >
              {loading ? (
                <Loader2 className="w-8 h-8 animate-spin mr-3" />
              ) : (
                <Scan className="w-8 h-8 mr-3" />
              )}
              {loading ? "Processing..." : "Tap to Check In / Out"}
            </Button>

            {!isActive && (
              <p className="text-red-500 text-sm font-medium">Establishment is Inactive</p>
            )}

            {/* Footer Location */}
            <div className="pt-8 border-t border-slate-100 w-full">
              <div className="flex items-center justify-center gap-2 text-slate-400 text-sm font-mono uppercase">
                <MapPin className="w-4 h-4" />
                <span>Location: <span className="text-slate-600 font-bold">{establishmentName}</span></span>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Brand Faded Background */}
        <div className="absolute bottom-4 text-slate-300 text-xs font-mono">
          SECURE ACCESS V1.0
        </div>
      </div>

      {/* Input Dialog for "Scanning" */}
      {scanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl scale-100 animate-in zoom-in-95">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <Scan className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Scan Worker ID</h3>
                <p className="text-slate-500 text-sm">Use the reader or enter ID manually</p>
              </div>

              <Input
                autoFocus
                placeholder="WKR..."
                value={workerIdentifier}
                onChange={(e) => setWorkerIdentifier(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onScanSubmit();
                }}
                className="text-center text-2xl font-mono tracking-wider h-14 border-2 border-slate-200 focus:border-blue-500 rounded-xl"
              />

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-12" onClick={() => setScanOpen(false)}>Cancel</Button>
                <Button className="flex-1 h-12 bg-blue-600 hover:bg-blue-700" onClick={onScanSubmit}>
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

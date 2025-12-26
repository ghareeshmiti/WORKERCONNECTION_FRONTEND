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
  CheckCircle, 
  ArrowLeft, 
  AlertCircle, 
  Building2, 
  LogOut,
  User,
  Phone,
  MapPin,
  LogIn,
  LogOut as LogOutIcon
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

export default function EstablishmentAttendance() {
  const { userContext, signOut } = useAuth();
  const navigate = useNavigate();
  const [workerIdentifier, setWorkerIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const { toast } = useToast();

  // Fetch establishment details to check approval status
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workerIdentifier.trim()) {
      toast({ title: 'Error', description: 'Please enter Worker ID or Employee ID', variant: 'destructive' });
      return;
    }

    if (!establishment?.is_approved) {
      toast({ 
        title: 'Not Approved', 
        description: 'This establishment is pending department approval. Attendance cannot be recorded.', 
        variant: 'destructive' 
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const identifier = workerIdentifier.trim().toUpperCase();

      // Find worker by worker_id or employee_id
      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .select('id, worker_id, employee_id, first_name, last_name, phone, district, state, is_active, department_id')
        .or(`worker_id.eq.${identifier},employee_id.eq.${identifier}`)
        .maybeSingle();

      if (workerError) {
        setResult({ success: false, message: 'Error looking up worker', code: 'LOOKUP_ERROR' });
        toast({ title: 'Error', description: 'Error looking up worker', variant: 'destructive' });
        return;
      }

      if (!workerData) {
        setResult({ success: false, message: 'Worker not found with the provided ID.', code: 'WORKER_NOT_FOUND' });
        toast({ title: 'Not Found', description: 'Worker not found with the provided ID', variant: 'destructive' });
        return;
      }

      // Check if worker is from the same department
      if (workerData.department_id !== establishment.department_id) {
        setResult({ 
          success: false, 
          message: 'This worker belongs to a different department.', 
          code: 'DIFFERENT_DEPARTMENT' 
        });
        toast({ title: 'Access Denied', description: 'This worker belongs to a different department', variant: 'destructive' });
        return;
      }

      if (!workerData.is_active) {
        setResult({ success: false, message: 'Worker is not active', code: 'WORKER_INACTIVE' });
        toast({ title: 'Inactive', description: 'Worker is not active', variant: 'destructive' });
        return;
      }

      // Check if worker is mapped to THIS establishment
      const { data: mappingData, error: mappingError } = await supabase
        .from('worker_mappings')
        .select('id, establishment_id')
        .eq('worker_id', workerData.id)
        .eq('is_active', true)
        .maybeSingle();

      if (mappingError) {
        setResult({ success: false, message: 'Error checking worker mapping', code: 'MAPPING_ERROR' });
        toast({ title: 'Error', description: 'Error checking worker mapping', variant: 'destructive' });
        return;
      }

      if (!mappingData) {
        setResult({ 
          success: false, 
          message: 'Worker is not mapped to any establishment.', 
          code: 'NO_MAPPING' 
        });
        toast({ title: 'Not Mapped', description: 'Worker is not mapped to any establishment', variant: 'destructive' });
        return;
      }

      if (mappingData.establishment_id !== userContext?.establishmentId) {
        setResult({ 
          success: false, 
          message: 'Worker is mapped to a different establishment.', 
          code: 'DIFFERENT_ESTABLISHMENT' 
        });
        toast({ title: 'Access Denied', description: 'Worker is mapped to a different establishment', variant: 'destructive' });
        return;
      }

      // All validations passed - record attendance
      const now = new Date();
      const kolkataTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const todayStart = new Date(kolkataTime);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(kolkataTime);
      todayEnd.setHours(23, 59, 59, 999);

      // Check today's events for this worker
      const { data: todayEvents, error: eventsError } = await supabase
        .from('attendance_events')
        .select('event_type, occurred_at')
        .eq('worker_id', workerData.id)
        .gte('occurred_at', todayStart.toISOString())
        .lte('occurred_at', todayEnd.toISOString())
        .order('occurred_at', { ascending: true });

      if (eventsError) {
        setResult({ success: false, message: 'Error checking attendance', code: 'EVENTS_ERROR' });
        toast({ title: 'Error', description: 'Error checking attendance', variant: 'destructive' });
        return;
      }

      // Determine event type based on existing events
      const checkIns = todayEvents?.filter(e => e.event_type === 'CHECK_IN') || [];
      const checkOuts = todayEvents?.filter(e => e.event_type === 'CHECK_OUT') || [];
      
      let eventType: 'CHECK_IN' | 'CHECK_OUT';
      
      if (checkIns.length === 0) {
        eventType = 'CHECK_IN';
      } else if (checkOuts.length < checkIns.length) {
        eventType = 'CHECK_OUT';
      } else {
        eventType = 'CHECK_IN';
      }

      // Insert attendance event
      const { data: eventData, error: insertError } = await supabase
        .from('attendance_events')
        .insert({
          worker_id: workerData.id,
          event_type: eventType,
          occurred_at: now.toISOString(),
          region: establishment.name || 'Unknown',
          establishment_id: userContext?.establishmentId,
          meta: { timezone: 'Asia/Kolkata' }
        })
        .select('id, event_type, occurred_at')
        .single();

      if (insertError) {
        setResult({ success: false, message: 'Failed to record attendance', code: 'INSERT_ERROR' });
        toast({ title: 'Error', description: 'Failed to record attendance', variant: 'destructive' });
        return;
      }

      const attendanceResult: AttendanceResult = {
        success: true,
        message: `${eventType === 'CHECK_IN' ? 'Check-in' : 'Check-out'} recorded successfully`,
        data: {
          eventType: eventData.event_type as 'CHECK_IN' | 'CHECK_OUT',
          workerName: `${workerData.first_name} ${workerData.last_name}`,
          workerId: workerData.worker_id,
          establishmentName: establishment.name,
          occurredAt: eventData.occurred_at,
        }
      };

      setResult(attendanceResult);
      toast({ title: 'Success', description: attendanceResult.message });
      setWorkerIdentifier('');
    } catch (err) {
      console.error('Attendance submission error:', err);
      const errorResult: AttendanceResult = { 
        success: false, 
        message: 'Failed to submit attendance. Please try again.',
        code: 'NETWORK_ERROR'
      };
      setResult(errorResult);
      toast({ title: 'Error', description: errorResult.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Show pending approval banner if not approved
  const isApproved = establishment?.is_approved ?? false;
  const departmentName = (establishment?.departments as any)?.name || 'Unknown Department';

  return (
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

        {/* Pending Approval Banner */}
        {!isApproved && (
          <div className="mb-6 p-4 bg-warning/10 border border-warning/30 rounded-lg">
            <div className="flex items-center gap-2 text-warning">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Awaiting Department Approval</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              This establishment is pending approval from <strong>{departmentName}</strong>. 
              Attendance cannot be recorded until approved.
            </p>
          </div>
        )}

        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-xl bg-accent flex items-center justify-center">
                <Clock className="w-8 h-8 text-accent-foreground" />
              </div>
            </div>
            <h1 className="text-2xl font-display font-bold">Worker Check-in / Check-out</h1>
            <p className="text-muted-foreground">Record attendance for workers at {establishment?.name || 'this establishment'}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Submit Attendance</CardTitle>
              <CardDescription>Enter Worker ID or Employee ID</CardDescription>
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
                  {!isApproved ? 'Pending Approval' : 'Submit Attendance'}
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
  );
}
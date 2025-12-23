import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Clock, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { INDIA_STATES } from '@/lib/types';

export default function RemoteAttendance() {
  const [workerId, setWorkerId] = useState('');
  const [region, setRegion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workerId || !region) {
      toast({ title: 'Error', description: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(
        `https://aldtcudqvbhmngkstbrr.supabase.co/functions/v1/submit-attendance`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workerId, region }),
        }
      );

      const data = await response.json();
      setResult(data);
      
      if (data.success) {
        toast({ title: 'Success', description: data.message });
        setWorkerId('');
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to submit attendance', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-xl bg-accent flex items-center justify-center">
              <Clock className="w-8 h-8 text-accent-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-display font-bold">Remote Attendance</h1>
          <p className="text-muted-foreground">Check-in or check-out without logging in</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Submit Attendance</CardTitle>
            <CardDescription>Enter your Worker ID or Employee ID</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workerId">Worker ID / Employee ID</Label>
                <Input
                  id="workerId"
                  placeholder="e.g., WKR00000001"
                  value={workerId}
                  onChange={(e) => setWorkerId(e.target.value.toUpperCase())}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">Region (State)</Label>
                <Select value={region} onValueChange={setRegion} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your state" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIA_STATES.map((state) => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Submit Attendance
              </Button>
            </form>

            {result?.success && result.data && (
              <div className="mt-6 p-4 bg-success/10 rounded-lg animate-fade-in">
                <div className="flex items-center gap-2 text-success mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">{result.data.eventType === 'CHECK_IN' ? 'Checked In' : 'Checked Out'}</span>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>Worker:</strong> {result.data.workerName}</p>
                  <p><strong>ID:</strong> {result.data.workerId}</p>
                  <p><strong>Time:</strong> {new Date(result.data.occurredAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

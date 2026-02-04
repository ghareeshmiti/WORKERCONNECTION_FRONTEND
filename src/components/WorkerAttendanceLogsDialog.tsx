import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Clock, LogIn, LogOut, Calendar, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';

interface WorkerInfo {
  id: string;
  worker_id: string;
  first_name: string;
  last_name: string;
}

interface WorkerAttendanceLogsDialogProps {
  worker: WorkerInfo | null;
  onClose: () => void;
}

type DateRangeOption = '7' | '14' | '30';

export function WorkerAttendanceLogsDialog({ worker, onClose }: WorkerAttendanceLogsDialogProps) {
  const [dateRange, setDateRange] = useState<DateRangeOption>('7');

  const startDate = format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd');
  const endDate = format(new Date(), 'yyyy-MM-dd');

  const { data: events, isLoading } = useQuery({
    queryKey: ['worker-attendance-events', worker?.id, dateRange],
    queryFn: async () => {
      if (!worker?.id) return [];
      
      const { data, error } = await supabase
        .from('attendance_events')
        .select(`
          id,
          event_type,
          occurred_at,
          region,
          establishment_id,
          establishments(name)
        `)
        .eq('worker_id', worker.id)
        .gte('occurred_at', `${startDate}T00:00:00`)
        .lte('occurred_at', `${endDate}T23:59:59`)
        .order('occurred_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!worker?.id,
  });

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
    });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      timeStyle: 'short',
    });
  };

  // Group events by date
  const groupedEvents = events?.reduce((acc, event) => {
    const date = formatDate(event.occurred_at);
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {} as Record<string, typeof events>) || {};

  return (
    <Dialog open={!!worker} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Attendance Logs
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <User className="w-4 h-4" />
            {worker?.first_name} {worker?.last_name}
            <Badge variant="outline" className="font-mono text-xs ml-2">
              {worker?.worker_id}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Date Range:</span>
          </div>
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeOption)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : events && events.length > 0 ? (
            <div className="space-y-4">
              {Object.entries(groupedEvents).map(([date, dayEvents]) => (
                <div key={date} className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground sticky top-0 bg-background py-1">
                    {date}
                  </h4>
                  <div className="space-y-1">
                    {dayEvents.map((event: any) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            event.event_type === 'CHECK_IN' 
                              ? 'bg-success/10 text-success' 
                              : 'bg-warning/10 text-warning'
                          }`}>
                            {event.event_type === 'CHECK_IN' ? (
                              <LogIn className="w-4 h-4" />
                            ) : (
                              <LogOut className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-sm">
                              {event.event_type === 'CHECK_IN' ? 'Check-in' : 'Check-out'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {(event.establishments as any)?.name || 'Unknown Establishment'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-sm">
                            {formatTime(event.occurred_at)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {event.region || 'IST'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No attendance events found for the selected period</p>
            </div>
          )}
        </div>

        <div className="pt-4 border-t flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {events?.length || 0} events found
          </p>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
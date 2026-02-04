import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, Users, UserCheck, AlertCircle, UserX, MapPin, Phone, Mail, 
  Loader2, Search, X, Download, Calendar
} from 'lucide-react';
import { generateCSV } from '@/lib/csv-export';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface EstablishmentDetailsDialogProps {
  establishment: any | null;
  onClose: () => void;
}

// Get today's date in YYYY-MM-DD format for Asia/Kolkata
const getTodayDate = () => {
  const now = new Date();
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

export function EstablishmentDetailsDialog({ establishment, onClose }: EstablishmentDetailsDialogProps) {
  const [workerSearch, setWorkerSearch] = useState('');
  const today = getTodayDate();

  // Fetch workers for this establishment
  const { data: workers, isLoading: workersLoading } = useQuery({
    queryKey: ['establishment-detail-workers', establishment?.id],
    queryFn: async () => {
      if (!establishment?.id) return [];
      
      const { data, error } = await supabase
        .from('worker_mappings')
        .select(`
          id,
          mapped_at,
          workers (
            id,
            worker_id,
            first_name,
            last_name,
            phone,
            state,
            district,
            is_active
          )
        `)
        .eq('establishment_id', establishment.id)
        .eq('is_active', true);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!establishment?.id,
  });

  // Fetch today's attendance for workers in this establishment
  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ['establishment-detail-attendance', establishment?.id, today],
    queryFn: async () => {
      if (!establishment?.id) return {};
      
      const { data, error } = await supabase
        .from('attendance_daily_rollups')
        .select('worker_id, status, first_checkin_at, last_checkout_at, total_hours')
        .eq('establishment_id', establishment.id)
        .eq('attendance_date', today);
      
      if (error) throw error;
      
      // Create a map of worker_id to attendance
      const attendanceMap: Record<string, any> = {};
      data?.forEach(record => {
        attendanceMap[record.worker_id] = record;
      });
      return attendanceMap;
    },
    enabled: !!establishment?.id,
  });

  // Combine workers with their attendance
  const workersWithAttendance = useMemo(() => {
    if (!workers) return [];
    return workers.map((mapping: any) => ({
      ...mapping,
      attendance: attendanceData?.[mapping.workers?.id] || null,
    }));
  }, [workers, attendanceData]);

  // Filter workers based on search
  const filteredWorkers = useMemo(() => {
    if (!workersWithAttendance) return [];
    if (!workerSearch.trim()) return workersWithAttendance;
    
    const searchLower = workerSearch.toLowerCase();
    return workersWithAttendance.filter((mapping: any) => {
      const w = mapping.workers;
      return (
        w?.worker_id?.toLowerCase().includes(searchLower) ||
        w?.first_name?.toLowerCase().includes(searchLower) ||
        w?.last_name?.toLowerCase().includes(searchLower) ||
        `${w?.first_name} ${w?.last_name}`.toLowerCase().includes(searchLower) ||
        (w?.phone && w.phone.includes(workerSearch))
      );
    });
  }, [workersWithAttendance, workerSearch]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = workersWithAttendance.length;
    const present = workersWithAttendance.filter((w: any) => w.attendance?.status === 'PRESENT').length;
    const partial = workersWithAttendance.filter((w: any) => w.attendance?.status === 'PARTIAL').length;
    const absent = total - present - partial;
    return { total, present, partial, absent };
  }, [workersWithAttendance]);

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '--:--';
    return new Date(timestamp).toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    });
  };

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'PRESENT':
        return <Badge className="bg-success text-success-foreground">Present</Badge>;
      case 'PARTIAL':
        return <Badge className="bg-warning text-warning-foreground">Partial</Badge>;
      default:
        return <Badge variant="secondary">Absent</Badge>;
    }
  };

  const handleExport = () => {
    if (!filteredWorkers.length) return;
    
    const exportData = filteredWorkers.map((mapping: any) => ({
      worker_id: mapping.workers?.worker_id,
      name: `${mapping.workers?.first_name} ${mapping.workers?.last_name}`,
      phone: mapping.workers?.phone || '',
      status: mapping.attendance?.status || 'ABSENT',
      check_in: mapping.attendance?.first_checkin_at ? formatTime(mapping.attendance.first_checkin_at) : '',
      check_out: mapping.attendance?.last_checkout_at ? formatTime(mapping.attendance.last_checkout_at) : '',
      hours: mapping.attendance?.total_hours?.toFixed(1) || '',
    }));
    
    const columns = [
      { key: 'worker_id', header: 'Worker ID' },
      { key: 'name', header: 'Name' },
      { key: 'phone', header: 'Phone' },
      { key: 'status', header: 'Status' },
      { key: 'check_in', header: 'Check In' },
      { key: 'check_out', header: 'Check Out' },
      { key: 'hours', header: 'Hours' },
    ];
    
    generateCSV(exportData, columns, `${establishment?.code}-attendance-${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success('Export Complete', { description: 'Attendance data exported to CSV' });
  };

  return (
    <Dialog open={!!establishment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {establishment?.name}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-mono">{establishment?.code}</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {establishment?.district}, {establishment?.state}
            </span>
            {establishment?.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {establishment.phone}
              </span>
            )}
            {establishment?.email && (
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {establishment.email}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-3 py-4">
          <Card className="bg-muted/50">
            <CardContent className="p-3 text-center">
              <Users className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <div className="text-xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="bg-success/10 border-success/20">
            <CardContent className="p-3 text-center">
              <UserCheck className="w-4 h-4 mx-auto mb-1 text-success" />
              <div className="text-xl font-bold text-success">{stats.present}</div>
              <p className="text-xs text-muted-foreground">Present</p>
            </CardContent>
          </Card>
          <Card className="bg-warning/10 border-warning/20">
            <CardContent className="p-3 text-center">
              <AlertCircle className="w-4 h-4 mx-auto mb-1 text-warning" />
              <div className="text-xl font-bold text-warning">{stats.partial}</div>
              <p className="text-xs text-muted-foreground">Partial</p>
            </CardContent>
          </Card>
          <Card className="bg-destructive/10 border-destructive/20">
            <CardContent className="p-3 text-center">
              <UserX className="w-4 h-4 mx-auto mb-1 text-destructive" />
              <div className="text-xl font-bold text-destructive">{stats.absent}</div>
              <p className="text-xs text-muted-foreground">Absent</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Export */}
        <div className="flex items-center gap-2 pb-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search workers..."
              value={workerSearch}
              onChange={(e) => setWorkerSearch(e.target.value)}
              className="pl-10 pr-10"
            />
            {workerSearch && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setWorkerSearch('')}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!filteredWorkers.length}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>

        <div className="text-xs text-muted-foreground flex items-center gap-1 pb-2">
          <Calendar className="w-3 h-3" />
          Today's attendance: {new Date().toLocaleDateString('en-IN', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
          })}
        </div>

        {/* Workers Table */}
        <div className="flex-1 overflow-y-auto min-h-[200px]">
          {workersLoading || attendanceLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredWorkers.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Worker ID</th>
                  <th className="text-left py-2 font-medium">Name</th>
                  <th className="text-left py-2 font-medium">Phone</th>
                  <th className="text-center py-2 font-medium">Status</th>
                  <th className="text-center py-2 font-medium">Check In</th>
                  <th className="text-center py-2 font-medium">Check Out</th>
                  <th className="text-center py-2 font-medium">Hours</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.map((mapping: any) => (
                  <tr key={mapping.id} className="border-b border-muted hover:bg-muted/30 transition-colors">
                    <td className="py-2 font-mono text-xs">{mapping.workers?.worker_id}</td>
                    <td className="py-2">
                      {mapping.workers?.first_name} {mapping.workers?.last_name}
                    </td>
                    <td className="py-2">{mapping.workers?.phone || '--'}</td>
                    <td className="py-2 text-center">
                      {getStatusBadge(mapping.attendance?.status)}
                    </td>
                    <td className="py-2 text-center font-mono text-xs">
                      {formatTime(mapping.attendance?.first_checkin_at)}
                    </td>
                    <td className="py-2 text-center font-mono text-xs">
                      {formatTime(mapping.attendance?.last_checkout_at)}
                    </td>
                    <td className="py-2 text-center">
                      {mapping.attendance?.total_hours 
                        ? `${mapping.attendance.total_hours.toFixed(1)}h` 
                        : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : workers && workers.length > 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">No workers found matching "{workerSearch}"</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">No workers mapped to this establishment</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

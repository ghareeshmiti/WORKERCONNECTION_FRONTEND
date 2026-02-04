import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, X, MapPin, Phone, Mail, Calendar, Briefcase, CreditCard, Shield, Building2, User, FileText, CheckCircle, AlertCircle, XCircle, Clock } from 'lucide-react';
import { formatWorkerId } from '@/lib/format';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRangePicker, DateRangePresets } from '@/components/DateRangePicker';
import { DateRange } from 'react-day-picker';
import { format, subDays } from 'date-fns';

interface WorkerDetailsDialogProps {
  workerId: string | null;
  onClose: () => void;
  establishmentName?: string;
}

export function WorkerDetailsDialog({ workerId, onClose, establishmentName }: WorkerDetailsDialogProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const startDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
  const endDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;

  const { data: worker, isLoading: workerLoading } = useQuery({
    queryKey: ['worker-details', workerId],
    queryFn: async () => {
      if (!workerId) return null;
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('id', workerId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!workerId,
  });

  const { data: attendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ['worker-attendance-details', workerId, startDate, endDate],
    queryFn: async () => {
      if (!workerId || !startDate || !endDate) return [];
      const { data, error } = await supabase
        .from('attendance_daily_rollups')
        .select('*')
        .eq('worker_id', workerId)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
        .order('attendance_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workerId && !!startDate && !!endDate,
  });

  const { data: stats } = useQuery({
    queryKey: ['worker-stats-details', workerId, startDate, endDate],
    queryFn: async () => {
      if (!attendance) return { present: 0, partial: 0, absent: 0, totalHours: 0 };

      let present = 0, partial = 0, absent = 0, totalHours = 0;
      attendance.forEach(a => {
        if (a.status === 'PRESENT') present++;
        else if (a.status === 'PARTIAL') partial++;
        else absent++;
        if (a.total_hours) totalHours += a.total_hours;
      });

      return { present, partial, absent, totalHours };
    },
    enabled: !!attendance,
  });

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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Dialog open={!!workerId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Worker Profile: {(worker?.first_name || '')} {worker?.last_name || ''}
          </DialogTitle>
        </DialogHeader>

        {workerLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : worker ? (
          <Tabs defaultValue="profile" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Full Profile</TabsTrigger>
              <TabsTrigger value="attendance">Attendance & Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="flex-1 overflow-y-auto mt-4 space-y-4 pr-2">

              {/* Header Card with Photo */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="md:w-1/4">
                  <div className="aspect-[3/4] rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
                    {worker.photo_url ? (
                      <img src={worker.photo_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-20 h-20 text-muted-foreground/50" />
                    )}
                  </div>
                </div>
                <div className="md:w-3/4 space-y-4">
                  {/* Identity & Status */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Identity & Status</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div><p className="text-xs text-muted-foreground">Worker ID</p><p className="font-mono font-medium">{formatWorkerId(worker.worker_id)}</p></div>
                      <div><p className="text-xs text-muted-foreground">Aadhaar</p><p className="font-mono font-medium">{worker.aadhaar_number || '-'}</p></div>
                      <div><p className="text-xs text-muted-foreground">eShram ID</p><p className="font-mono font-medium">{worker.eshram_id || '-'}</p></div>
                      <div><p className="text-xs text-muted-foreground">BOCW ID</p><p className="font-mono font-medium">{worker.bocw_id || '-'}</p></div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Bank Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div><p className="text-xs text-muted-foreground">Account Number</p><p className="font-mono font-medium">{worker.bank_account_number || '-'}</p></div>
                      <div><p className="text-xs text-muted-foreground">IFSC Code</p><p className="font-mono font-medium uppercase">{worker.ifsc_code || '-'}</p></div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Personal Information */}
                <Card>
                  <CardHeader className="pb-2 flex flex-row items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    <CardTitle className="text-base">Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-muted-foreground">First Name:</span><span className="font-medium">{worker.first_name}</span>
                      <span className="text-muted-foreground">Last Name:</span><span className="font-medium">{worker.last_name}</span>
                      <span className="text-muted-foreground">Gender:</span><span className="font-medium">{worker.gender}</span>
                      <span className="text-muted-foreground">DOB:</span><span className="font-medium">{worker.date_of_birth}</span>
                      <span className="text-muted-foreground">Father:</span><span className="font-medium">{worker.father_name || '-'}</span>
                      <span className="text-muted-foreground">Mother:</span><span className="font-medium">{worker.mother_name || '-'}</span>
                      <span className="text-muted-foreground">Marital Status:</span><span className="font-medium">{worker.marital_status || '-'}</span>
                      <span className="text-muted-foreground">Caste:</span><span className="font-medium">{worker.caste || '-'}</span>
                      <span className="text-muted-foreground">Disability:</span><span className="font-medium">{worker.disability_status || 'None'}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Professional Information */}
                <Card>
                  <CardHeader className="pb-2 flex flex-row items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" />
                    <CardTitle className="text-base">Professional Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-muted-foreground">Education:</span><span className="font-medium">{worker.education_level || '-'}</span>
                      <span className="text-muted-foreground">Skill Category:</span><span className="font-medium">{worker.skill_category || '-'}</span>
                      <span className="text-muted-foreground">Overall Exp:</span><span className="font-medium">{worker.experience_years ? `${worker.experience_years} years` : '-'}</span>
                      <span className="text-muted-foreground">NRES Member:</span><span className="font-medium">{worker.nres_member || 'No'}</span>
                      <span className="text-muted-foreground">Union Member:</span><span className="font-medium">{worker.trade_union_member || 'No'}</span>
                    </div>
                    {worker.skills && worker.skills.length > 0 && (
                      <div className="pt-2">
                        <p className="text-xs text-muted-foreground mb-1">Skills:</p>
                        <div className="flex flex-wrap gap-1">
                          {worker.skills.map((s: string, i: number) => <Badge key={i} variant="outline" className="text-xs">{s}</Badge>)}
                        </div>
                      </div>
                    )}
                    {worker.work_history && (
                      <div className="pt-2">
                        <p className="text-xs text-muted-foreground mb-1">Work History:</p>
                        <p className="text-sm border p-2 rounded bg-muted/20 whitespace-pre-wrap">{worker.work_history}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Contact & Address */}
                <Card>
                  <CardHeader className="pb-2 flex flex-row items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <CardTitle className="text-base">Address & Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{worker.phone || '-'}</span>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground text-xs mb-1">Current Address</p>
                      <p>{worker.address_line}</p>
                      <p>{worker.village}, {worker.mandal}</p>
                      <p>{worker.district}, {worker.state} - {worker.pincode}</p>
                    </div>
                    {worker.emergency_contact_name && (
                      <div className="pt-2 border-t mt-2">
                        <p className="text-xs text-muted-foreground mb-1">Emergency Contact</p>
                        <p className="text-sm font-medium">{worker.emergency_contact_name}</p>
                        <p className="text-sm">{worker.emergency_contact_phone}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

            </TabsContent>

            <TabsContent value="attendance" className="flex-1 overflow-hidden flex flex-col mt-4">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <div>
                      <p className="text-xs text-muted-foreground">Present</p>
                      <p className="text-lg font-bold text-success">{stats?.present || 0}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-warning" />
                    <div>
                      <p className="text-xs text-muted-foreground">Partial</p>
                      <p className="text-lg font-bold text-warning">{stats?.partial || 0}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-destructive" />
                    <div>
                      <p className="text-xs text-muted-foreground">Absent</p>
                      <p className="text-lg font-bold text-destructive">{stats?.absent || 0}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Hours</p>
                      <p className="text-lg font-bold">{stats?.totalHours.toFixed(1) || 0}</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Date Filter */}
              <div className="flex flex-col gap-2 mb-4">
                <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
                <DateRangePresets onSelect={setDateRange} />
              </div>

              {/* Attendance Table */}
              <div className="flex-1 overflow-y-auto">
                {attendanceLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : attendance && attendance.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium">Date</th>
                        <th className="text-left py-2 font-medium">Check-in</th>
                        <th className="text-left py-2 font-medium">Check-out</th>
                        <th className="text-left py-2 font-medium">Hours</th>
                        <th className="text-left py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map((record) => (
                        <tr key={record.id} className="border-b border-muted">
                          <td className="py-2">{formatDate(record.attendance_date)}</td>
                          <td className="py-2">{formatTime(record.first_checkin_at)}</td>
                          <td className="py-2">{formatTime(record.last_checkout_at)}</td>
                          <td className="py-2">
                            {record.total_hours ? `${record.total_hours.toFixed(1)}h` : '--'}
                          </td>
                          <td className="py-2">{getStatusBadge(record.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No attendance records found for selected date range.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Worker not found.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

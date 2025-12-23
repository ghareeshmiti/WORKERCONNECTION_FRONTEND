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
import { 
  User, Phone, Mail, MapPin, Calendar, Clock, 
  AlertCircle, CheckCircle, XCircle, Loader2, Building2 
} from 'lucide-react';
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Worker Details
          </DialogTitle>
        </DialogHeader>

        {workerLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : worker ? (
          <Tabs defaultValue="profile" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="attendance">Attendance History</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="flex-1 overflow-y-auto mt-4 space-y-4">
              {/* Basic Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="font-medium">{worker.first_name} {worker.last_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">{worker.worker_id}</Badge>
                    {worker.employee_id && (
                      <Badge variant="secondary">Emp: {worker.employee_id}</Badge>
                    )}
                  </div>
                  {worker.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{worker.phone}</p>
                      </div>
                    </div>
                  )}
                  {worker.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{worker.email}</p>
                      </div>
                    </div>
                  )}
                  {worker.date_of_birth && (
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Date of Birth</p>
                        <p className="font-medium">{formatDate(worker.date_of_birth)}</p>
                      </div>
                    </div>
                  )}
                  {worker.gender && (
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Gender</p>
                        <p className="font-medium capitalize">{worker.gender}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Location */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                    <div>
                      {worker.address_line && <p>{worker.address_line}</p>}
                      <p>
                        {[worker.mandal, worker.district, worker.state, worker.pincode]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Work Info */}
              {(worker.skills?.length || worker.experience_years || establishmentName) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Work Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {establishmentName && (
                      <div className="flex items-center gap-3">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Current Establishment</p>
                          <p className="font-medium">{establishmentName}</p>
                        </div>
                      </div>
                    )}
                    {worker.experience_years !== null && (
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Experience</p>
                          <p className="font-medium">{worker.experience_years} years</p>
                        </div>
                      </div>
                    )}
                    {worker.skills && worker.skills.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Skills</p>
                        <div className="flex flex-wrap gap-2">
                          {worker.skills.map((skill: string, idx: number) => (
                            <Badge key={idx} variant="secondary">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Emergency Contact */}
              {(worker.emergency_contact_name || worker.emergency_contact_phone) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Emergency Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-4">
                    {worker.emergency_contact_name && (
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">{worker.emergency_contact_name}</p>
                      </div>
                    )}
                    {worker.emergency_contact_phone && (
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{worker.emergency_contact_phone}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
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

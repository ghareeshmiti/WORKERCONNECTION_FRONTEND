import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, LogOut, User, Calendar, CheckCircle, AlertCircle, XCircle, Loader2, Download, Building2 } from 'lucide-react';
import { generateCSV, attendanceColumns } from '@/lib/csv-export';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useWorkerProfile, useWorkerTodayAttendance, useWorkerAttendanceHistory, useWorkerMonthlyStats, useWorkerAttendanceTrend, useWorkerEstablishment } from '@/hooks/use-dashboard-data';
import { useWorkerDashboardRealtime } from '@/hooks/use-realtime-subscriptions';
import { DateRangePicker, DateRangePresets } from '@/components/DateRangePicker';
import { DateRange } from 'react-day-picker';
import { EditWorkerProfileDialog } from '@/components/EditWorkerProfileDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import QRCode from "react-qr-code";
import { format, subDays } from 'date-fns';
import { WorkerSchemes } from '@/components/WorkerSchemes';

export default function WorkerDashboard() {
  // Enable real-time updates
  useWorkerDashboardRealtime();
  const { userContext, signOut } = useAuth();
  const navigate = useNavigate();

  // Default to last 30 days
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const startDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
  const endDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;

  const { data: profile, isLoading: profileLoading } = useWorkerProfile(userContext?.workerId);
  const { data: establishment, isLoading: establishmentLoading } = useWorkerEstablishment(userContext?.workerId);
  const { data: todayAttendance, isLoading: todayLoading } = useWorkerTodayAttendance(userContext?.workerId);
  const { data: history, isLoading: historyLoading } = useWorkerAttendanceHistory(userContext?.workerId, startDate, endDate);
  const { data: monthlyStats } = useWorkerMonthlyStats(userContext?.workerId);
  const { data: trendData, isLoading: trendLoading } = useWorkerAttendanceTrend(userContext?.workerId, 14);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
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

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '--:--';
    return new Date(timestamp).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold">Worker Connect</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {profile ? `${profile.first_name} ${profile.last_name}` : userContext?.fullName}
            </span>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-display font-bold">Worker Dashboard</h1>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <div className="mr-2 h-4 w-4 i-lucide-qr-code" /> Show QR Code
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Worker Profile QR Code</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-6 space-y-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <QRCode
                      value={`https://workerconnect.miti.us/public/worker?workerid=${profile?.aadhaar_number || ''}`}
                      size={200}
                    />
                  </div>
                  <p className="text-sm text-center text-muted-foreground break-all">
                    https://workerconnect.miti.us/public/worker?workerid={profile?.aadhaar_number}
                  </p>
                </div>
              </DialogContent>
            </Dialog>
            <EditWorkerProfileDialog worker={profile} />
          </div>
        </div>

        {/* Establishment Info Banner */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              {establishmentLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : establishment?.establishments ? (
                <div>
                  <p className="text-sm text-muted-foreground">Currently mapped to</p>
                  <p className="font-semibold">{(establishment.establishments as any).name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(establishment.establishments as any).district}, {(establishment.establishments as any).state}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">Establishment Status</p>
                  <p className="font-medium text-warning">Not mapped to any establishment</p>
                  <p className="text-xs text-muted-foreground">Contact an administrator to be added</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Today's Status</CardTitle>
              {todayAttendance?.status === 'PRESENT' ? (
                <CheckCircle className="w-4 h-4 text-success" />
              ) : todayAttendance?.status === 'PARTIAL' ? (
                <AlertCircle className="w-4 h-4 text-warning" />
              ) : (
                <XCircle className="w-4 h-4 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent>
              {todayLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {getStatusBadge(todayAttendance?.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    In: {formatTime(todayAttendance?.first_checkin_at ?? null)} | Out: {formatTime(todayAttendance?.last_checkout_at ?? null)}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{monthlyStats?.present || 0} / {monthlyStats?.total || 0}</div>
              <p className="text-xs text-muted-foreground">Days present</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Partial Days</CardTitle>
              <AlertCircle className="w-4 h-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{monthlyStats?.partial || 0}</div>
              <p className="text-xs text-muted-foreground">Incomplete attendance</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Worker ID</CardTitle>
              <User className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {profileLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <div className="text-lg font-bold font-mono">{profile?.worker_id || 'N/A'}</div>
                  <p className="text-xs text-muted-foreground">Use for remote check-in</p>
                </>
              )}

            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Schemes Taken</CardTitle>
              <CheckCircle className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2</div>
              <p className="text-xs text-muted-foreground">Benefits received this month</p>
            </CardContent>
          </Card>
        </div>



        {/* Attendance History with Date Filter */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center gap-4 w-full">
              <CardTitle className="whitespace-nowrap shrink-0">Attendance History</CardTitle>
              <div className="flex flex-col md:flex-row md:items-center gap-2 flex-1 w-full overflow-x-auto">
                <div className="flex items-center gap-2 flex-nowrap">
                  <DateRangePicker
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                  />
                  <DateRangePresets onSelect={setDateRange} />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (history && history.length > 0) {
                      generateCSV(history, attendanceColumns, `attendance-history-${format(new Date(), 'yyyy-MM-dd')}`);
                      toast.success('Export Complete', { description: 'Attendance history exported to CSV' });
                    }
                  }}
                  disabled={!history || history.length === 0}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : history && history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Date</th>
                      <th className="text-left py-2 font-medium">Check-in</th>
                      <th className="text-left py-2 font-medium">Check-out</th>
                      <th className="text-left py-2 font-medium">Hours</th>
                      <th className="text-left py-2 font-medium">Status</th>
                      <th className="text-left py-2 font-medium">Establishment</th>
                      <th className="text-left py-2 font-medium">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((record) => {
                      const est = record.establishments;
                      const locationParts = est ? [est.district, est.mandal].filter(Boolean) : [];
                      const locationStr = locationParts.length > 0 ? locationParts.join(', ') : '—';

                      return (
                        <tr key={record.id} className="border-b border-muted">
                          <td className="py-2">
                            {new Date(record.attendance_date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-2">{formatTime(record.first_checkin_at)}</td>
                          <td className="py-2">{formatTime(record.last_checkout_at)}</td>
                          <td className="py-2">
                            {record.total_hours ? `${record.total_hours.toFixed(1)}h` : '--'}
                          </td>
                          <td className="py-2">{getStatusBadge(record.status)}</td>
                          <td className="py-2">{est?.name || '—'}</td>
                          <td className="py-2 text-muted-foreground">{locationStr}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No attendance records found for selected date range.</p>
            )}
          </CardContent>
        </Card>

        {/* Schemes Section */}
        <div className="mt-8">
          <h2 className="text-xl font-display font-bold mb-4">Schemes & Benefits</h2>
          <WorkerSchemes />
        </div>
      </main>
    </div >
  );
}

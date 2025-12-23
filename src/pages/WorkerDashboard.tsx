import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, LogOut, User, Calendar, CheckCircle, AlertCircle, XCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkerProfile, useWorkerTodayAttendance, useWorkerAttendanceHistory, useWorkerMonthlyStats, useWorkerAttendanceTrend } from '@/hooks/use-dashboard-data';
import { AttendanceChart } from '@/components/AttendanceChart';
import { DateRangePicker, DateRangePresets } from '@/components/DateRangePicker';
import { DateRange } from 'react-day-picker';
import { EditWorkerProfileDialog } from '@/components/EditWorkerProfileDialog';
import { format, subDays } from 'date-fns';

export default function WorkerDashboard() {
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
          <EditWorkerProfileDialog worker={profile} />
        </div>
        
        {/* KPI Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
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
        </div>

        {/* Attendance Trend Chart */}
        <div className="mb-8">
          <AttendanceChart 
            data={trendData || []} 
            isLoading={trendLoading} 
            title="Attendance Trend (Last 14 Days)" 
            type="area"
          />
        </div>

        {/* Attendance History with Date Filter */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle>Attendance History</CardTitle>
              <div className="flex flex-col gap-2">
                <DateRangePicker 
                  dateRange={dateRange} 
                  onDateRangeChange={setDateRange} 
                />
                <DateRangePresets onSelect={setDateRange} />
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
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((record) => (
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No attendance records found for selected date range.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

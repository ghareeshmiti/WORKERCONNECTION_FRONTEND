import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock, LogOut, Users, UserCheck, UserX, AlertCircle, Loader2, Building2, UserMinus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEstablishmentWorkers, useEstablishmentTodayAttendance, useEstablishmentAttendanceTrend } from '@/hooks/use-dashboard-data';
import { useUnmapWorker } from '@/hooks/use-worker-mapping';
import { MapWorkerDialog } from '@/components/MapWorkerDialog';
import { AttendanceChart, AttendanceRateChart } from '@/components/AttendanceChart';

export default function EstablishmentDashboard() {
  const { userContext, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [unmapDialog, setUnmapDialog] = useState<{ open: boolean; mappingId: string; workerName: string }>({
    open: false,
    mappingId: '',
    workerName: '',
  });

  const { data: workers, isLoading: workersLoading } = useEstablishmentWorkers(userContext?.establishmentId);
  const { data: todayStats, isLoading: statsLoading } = useEstablishmentTodayAttendance(userContext?.establishmentId);
  const { data: trendData, isLoading: trendLoading } = useEstablishmentAttendanceTrend(userContext?.establishmentId, 7);
  const unmapWorker = useUnmapWorker();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleUnmap = async () => {
    if (unmapDialog.mappingId && user) {
      await unmapWorker.mutateAsync({
        mappingId: unmapDialog.mappingId,
        unmappedBy: user.id,
      });
      setUnmapDialog({ open: false, mappingId: '', workerName: '' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-display font-bold">Establishment Dashboard</h1>
          {userContext?.establishmentId && user && (
            <MapWorkerDialog 
              establishmentId={userContext.establishmentId} 
              mappedBy={user.id} 
            />
          )}
        </div>
        
        {/* KPI Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Workers</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{todayStats?.total || 0}</div>
                  <p className="text-xs text-muted-foreground">Mapped workers</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Present Today</CardTitle>
              <UserCheck className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-success">{todayStats?.present || 0}</div>
                  <p className="text-xs text-muted-foreground">Checked in & out</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Partial</CardTitle>
              <AlertCircle className="w-4 h-4 text-warning" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-warning">{todayStats?.partial || 0}</div>
                  <p className="text-xs text-muted-foreground">Only check-in or out</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Absent</CardTitle>
              <UserX className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-destructive">{todayStats?.absent || 0}</div>
                  <p className="text-xs text-muted-foreground">No attendance</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <AttendanceChart 
            data={trendData || []} 
            isLoading={trendLoading} 
            title="Daily Attendance (Last 7 Days)" 
            type="bar"
          />
          <AttendanceRateChart 
            data={trendData || []} 
            isLoading={trendLoading} 
            title="Attendance Rate Trend" 
          />
        </div>

        {/* Worker List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Mapped Workers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {workersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : workers && workers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 font-medium">Worker ID</th>
                      <th className="text-left py-3 font-medium">Name</th>
                      <th className="text-left py-3 font-medium">Phone</th>
                      <th className="text-left py-3 font-medium">Location</th>
                      <th className="text-left py-3 font-medium">Status</th>
                      <th className="text-right py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workers.map((mapping: any) => (
                      <tr key={mapping.id} className="border-b border-muted hover:bg-muted/30 transition-colors">
                        <td className="py-3 font-mono text-xs">{mapping.workers?.worker_id}</td>
                        <td className="py-3">
                          {mapping.workers?.first_name} {mapping.workers?.last_name}
                        </td>
                        <td className="py-3">{mapping.workers?.phone || '--'}</td>
                        <td className="py-3">
                          {mapping.workers?.district}, {mapping.workers?.state}
                        </td>
                        <td className="py-3">
                          <Badge variant={mapping.workers?.is_active ? 'default' : 'secondary'}>
                            {mapping.workers?.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setUnmapDialog({
                              open: true,
                              mappingId: mapping.id,
                              workerName: `${mapping.workers?.first_name} ${mapping.workers?.last_name}`,
                            })}
                          >
                            <UserMinus className="w-4 h-4 mr-1" />
                            Unmap
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">No workers mapped to this establishment yet.</p>
                <p className="text-sm text-muted-foreground">
                  Click "Map Worker" above to add workers to your establishment.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Unmap Confirmation Dialog */}
      <AlertDialog open={unmapDialog.open} onOpenChange={(open) => setUnmapDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unmap Worker</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unmap <strong>{unmapDialog.workerName}</strong> from this establishment? 
              They will no longer appear in your worker list and their attendance will not be tracked under this establishment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnmap}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={unmapWorker.isPending}
            >
              {unmapWorker.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Unmap Worker
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

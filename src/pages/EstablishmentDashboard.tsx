import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, LogOut, Users, UserCheck, UserX, AlertCircle, Loader2, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEstablishmentWorkers, useEstablishmentTodayAttendance } from '@/hooks/use-dashboard-data';

export default function EstablishmentDashboard() {
  const { userContext, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: workers, isLoading: workersLoading } = useEstablishmentWorkers(userContext?.establishmentId);
  const { data: todayStats, isLoading: statsLoading } = useEstablishmentTodayAttendance(userContext?.establishmentId);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
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
        <h1 className="text-2xl font-display font-bold mb-6">Establishment Dashboard</h1>
        
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

        {/* Worker List */}
        <Card>
          <CardHeader>
            <CardTitle>Mapped Workers</CardTitle>
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
                      <th className="text-left py-2 font-medium">Worker ID</th>
                      <th className="text-left py-2 font-medium">Name</th>
                      <th className="text-left py-2 font-medium">Phone</th>
                      <th className="text-left py-2 font-medium">Location</th>
                      <th className="text-left py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workers.map((mapping: any) => (
                      <tr key={mapping.id} className="border-b border-muted">
                        <td className="py-2 font-mono text-xs">{mapping.workers?.worker_id}</td>
                        <td className="py-2">
                          {mapping.workers?.first_name} {mapping.workers?.last_name}
                        </td>
                        <td className="py-2">{mapping.workers?.phone || '--'}</td>
                        <td className="py-2">
                          {mapping.workers?.district}, {mapping.workers?.state}
                        </td>
                        <td className="py-2">
                          <Badge variant={mapping.workers?.is_active ? 'default' : 'secondary'}>
                            {mapping.workers?.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No workers mapped to this establishment yet.</p>
                <p className="text-sm text-muted-foreground">
                  Workers can be mapped after registration through the worker management feature.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

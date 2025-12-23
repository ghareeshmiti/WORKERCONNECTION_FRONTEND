import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, LogOut, Building2, Users, UserCheck, TrendingUp, Loader2, Landmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDepartmentEstablishments, useDepartmentStats } from '@/hooks/use-dashboard-data';

export default function DepartmentDashboard() {
  const { userContext, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: establishments, isLoading: estLoading } = useDepartmentEstablishments(userContext?.departmentId);
  const { data: stats, isLoading: statsLoading } = useDepartmentStats(userContext?.departmentId);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-success flex items-center justify-center">
              <Landmark className="w-6 h-6 text-success-foreground" />
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
        <h1 className="text-2xl font-display font-bold mb-6">Department Dashboard</h1>
        
        {/* KPI Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Establishments</CardTitle>
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.establishments || 0}</div>
                  <p className="text-xs text-muted-foreground">Active establishments</p>
                </>
              )}
            </CardContent>
          </Card>

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
                  <div className="text-2xl font-bold">{stats?.totalWorkers || 0}</div>
                  <p className="text-xs text-muted-foreground">Across all establishments</p>
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
                  <div className="text-2xl font-bold text-success">{stats?.presentToday || 0}</div>
                  <p className="text-xs text-muted-foreground">Workers checked in</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
              <TrendingUp className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.attendanceRate || 0}%</div>
                  <p className="text-xs text-muted-foreground">Today's rate</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Establishments List */}
        <Card>
          <CardHeader>
            <CardTitle>Establishments Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {estLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : establishments && establishments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Code</th>
                      <th className="text-left py-2 font-medium">Name</th>
                      <th className="text-left py-2 font-medium">Type</th>
                      <th className="text-left py-2 font-medium">Location</th>
                      <th className="text-left py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {establishments.map((est: any) => (
                      <tr key={est.id} className="border-b border-muted">
                        <td className="py-2 font-mono text-xs">{est.code}</td>
                        <td className="py-2 font-medium">{est.name}</td>
                        <td className="py-2 capitalize">{est.establishment_type || 'N/A'}</td>
                        <td className="py-2">
                          {est.district}, {est.state}
                        </td>
                        <td className="py-2">
                          <Badge variant={est.is_active ? 'default' : 'secondary'}>
                            {est.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No establishments registered yet.</p>
                <p className="text-sm text-muted-foreground">
                  Establishments can register and link to this department.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

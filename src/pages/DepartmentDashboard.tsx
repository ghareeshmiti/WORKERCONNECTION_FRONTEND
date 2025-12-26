import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  LogOut,
  Building2,
  Users,
  UserCheck,
  TrendingUp,
  Loader2,
  Landmark,
  Search,
  X,
  MapPin,
  Activity,
  Download,
  UserX,
  AlertCircle,
  FileText,
} from "lucide-react";
import {
  generateCSV,
  workerWithEstablishmentColumns,
  establishmentColumns,
  attendanceTrendColumns,
} from "@/lib/csv-export";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import {
  useDepartmentEstablishments,
  useDepartmentStats,
  useDepartmentAttendanceTrendByRange,
  useDepartmentWorkers,
} from "@/hooks/use-dashboard-data";
import { useDepartmentDashboardRealtime } from "@/hooks/use-realtime-subscriptions";
import { AttendanceChart, AttendanceRateChart } from "@/components/AttendanceChart";
import { DateRangePicker, DateRangePresets } from "@/components/DateRangePicker";
import { DateRange } from "react-day-picker";
import { format, subDays } from "date-fns";
import { EditDepartmentProfileDialog } from "@/components/EditDepartmentProfileDialog";
import { WorkerDetailsDialog } from "@/components/WorkerDetailsDialog";
import { EstablishmentDetailsDialog } from "@/components/EstablishmentDetailsDialog";
import { EnrollWorkerDialog } from "@/components/EnrollWorkerDialog";
import { ApproveEstablishmentDialog } from "@/components/ApproveEstablishmentDialog";
import { SortableTableHeader, SortConfig, sortData } from "@/components/SortableTableHeader";
import { AttendanceReportTable } from "@/components/AttendanceReportTable";
import { AttendanceReportFilters } from "@/components/AttendanceReportFilters";
import {
  useDepartmentAttendanceReport,
  useDepartmentWorkersList,
  useDepartmentEstablishmentsList,
} from "@/hooks/use-attendance-reports";

export default function DepartmentDashboard() {
  // Enable real-time updates
  useDepartmentDashboardRealtime();
  const { userContext, signOut } = useAuth();
  const navigate = useNavigate();

  // Default to last 7 days for charts
  // Chart date range
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  // Report date range (separate from chart)
  const [reportDateRange, setReportDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const [workerSearch, setWorkerSearch] = useState("");
  const [selectedWorker, setSelectedWorker] = useState<{ id: string; establishment: string } | null>(null);
  const [selectedEstablishment, setSelectedEstablishment] = useState<any | null>(null);
  const [establishmentToApprove, setEstablishmentToApprove] = useState<any | null>(null);

  // Report filters
  const [reportEstablishmentFilter, setReportEstablishmentFilter] = useState<string | undefined>(undefined);
  const [reportWorkerFilter, setReportWorkerFilter] = useState<string | undefined>(undefined);

  // Sorting state
  const [estSort, setEstSort] = useState<SortConfig>({ key: "", direction: null });
  const [workerSort, setWorkerSort] = useState<SortConfig>({ key: "", direction: null });

  const startDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined;
  const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;
  const reportStartDate = reportDateRange?.from ? format(reportDateRange.from, "yyyy-MM-dd") : undefined;
  const reportEndDate = reportDateRange?.to ? format(reportDateRange.to, "yyyy-MM-dd") : undefined;

  const { data: establishments, isLoading: estLoading } = useDepartmentEstablishments(userContext?.departmentId);
  const { data: stats, isLoading: statsLoading } = useDepartmentStats(userContext?.departmentId);
  const { data: trendData, isLoading: trendLoading } = useDepartmentAttendanceTrendByRange(
    userContext?.departmentId,
    startDate,
    endDate,
  );
  const { data: workers, isLoading: workersLoading } = useDepartmentWorkers(userContext?.departmentId);

  // Report data
  const { data: reportData, isLoading: reportLoading } = useDepartmentAttendanceReport(userContext?.departmentId, {
    startDate: reportStartDate || "",
    endDate: reportEndDate || "",
    establishmentId: reportEstablishmentFilter,
    workerId: reportWorkerFilter,
  });
  const { data: establishmentsList } = useDepartmentEstablishmentsList(userContext?.departmentId);
  const { data: workersList } = useDepartmentWorkersList(userContext?.departmentId);

  const handleEstSort = (key: string) => {
    setEstSort((current) => {
      if (current.key !== key) return { key, direction: "asc" };
      if (current.direction === "asc") return { key, direction: "desc" };
      if (current.direction === "desc") return { key: "", direction: null };
      return { key, direction: "asc" };
    });
  };

  const handleWorkerSort = (key: string) => {
    setWorkerSort((current) => {
      if (current.key !== key) return { key, direction: "asc" };
      if (current.direction === "asc") return { key, direction: "desc" };
      if (current.direction === "desc") return { key: "", direction: null };
      return { key, direction: "asc" };
    });
  };

  // Get establishment value for sorting
  const getEstValue = (est: any, key: string) => {
    switch (key) {
      case "code":
        return est.code;
      case "name":
        return est.name;
      case "location":
        return `${est.district}, ${est.state}`;
      case "workerCount":
        return est.workerCount || 0;
      case "present":
        return est.todayStats?.present || 0;
      case "partial":
        return est.todayStats?.partial || 0;
      case "absent":
        return est.todayStats?.absent || 0;
      case "rate":
        return est.todayStats?.rate || 0;
      case "status":
        return est.is_active;
      default:
        return null;
    }
  };

  // Get worker value for sorting
  const getWorkerValue = (mapping: any, key: string) => {
    switch (key) {
      case "worker_id":
        return mapping.workers?.worker_id;
      case "name":
        return `${mapping.workers?.first_name} ${mapping.workers?.last_name}`;
      case "phone":
        return mapping.workers?.phone;
      case "location":
        return `${mapping.workers?.district}, ${mapping.workers?.state}`;
      case "establishment":
        return mapping.establishments?.name;
      case "status":
        return mapping.workers?.is_active;
      default:
        return null;
    }
  };

  // Sorted establishments
  const sortedEstablishments = useMemo(() => {
    if (!establishments) return [];
    return sortData(establishments, estSort, getEstValue);
  }, [establishments, estSort]);

  // Filter and sort workers
  const filteredWorkers = useMemo(() => {
    if (!workers) return [];
    let result = workers;

    if (workerSearch.trim()) {
      const searchLower = workerSearch.toLowerCase();
      result = workers.filter((mapping: any) => {
        const w = mapping.workers;
        const est = mapping.establishments;
        return (
          w?.worker_id?.toLowerCase().includes(searchLower) ||
          w?.first_name?.toLowerCase().includes(searchLower) ||
          w?.last_name?.toLowerCase().includes(searchLower) ||
          `${w?.first_name} ${w?.last_name}`.toLowerCase().includes(searchLower) ||
          est?.name?.toLowerCase().includes(searchLower) ||
          (w?.phone && w.phone.includes(workerSearch))
        );
      });
    }

    return sortData(result, workerSort, getWorkerValue);
  }, [workers, workerSearch, workerSort]);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-display font-bold">Department Dashboard</h1>
          <div className="flex items-center gap-2">
            {userContext?.departmentId && <EnrollWorkerDialog departmentId={userContext.departmentId} />}
            <EditDepartmentProfileDialog departmentId={userContext?.departmentId} />
          </div>
        </div>

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

        {/* Date Range Filter for Charts */}
        {/* <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Attendance Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
              <DateRangePresets onSelect={setDateRange} />
            </div>
          </CardContent>
        </Card> */}

        {/* Charts Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <AttendanceChart data={trendData || []} isLoading={trendLoading} title="Department Attendance" type="bar" />
          <AttendanceRateChart data={trendData || []} isLoading={trendLoading} title="Attendance Rate Trend" />
        </div>

        {/* Detailed Attendance Report */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Detailed Attendance Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <AttendanceReportFilters
                dateRange={reportDateRange}
                onDateRangeChange={setReportDateRange}
                establishments={establishmentsList || []}
                selectedEstablishment={reportEstablishmentFilter}
                onEstablishmentChange={setReportEstablishmentFilter}
                workers={workersList || []}
                selectedWorker={reportWorkerFilter}
                onWorkerChange={setReportWorkerFilter}
                onExport={() => {
                  if (reportData && reportData.length > 0) {
                    const csvContent = [
                      [
                        "Date",
                        "Worker ID",
                        "Worker Name",
                        "Establishment",
                        "Department",
                        "Check-in",
                        "Check-out",
                        "Hours",
                        "Status",
                      ].join(","),
                      ...reportData.map((row) =>
                        [
                          row.date,
                          row.workerId,
                          `"${row.workerName}"`,
                          `"${row.establishmentName}"`,
                          `"${row.departmentName}"`,
                          row.checkIn ? format(new Date(row.checkIn), "HH:mm") : "",
                          row.checkOut ? format(new Date(row.checkOut), "HH:mm") : "",
                          row.hoursWorked?.toFixed(1) || "",
                          row.status,
                        ].join(","),
                      ),
                    ].join("\n");

                    const blob = new Blob([csvContent], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `attendance-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success("Export Complete", { description: "Attendance report exported to CSV" });
                  }
                }}
              />
              {reportLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <AttendanceReportTable data={reportData || []} showEstablishment showDepartment={false} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Establishments List */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Establishments Overview</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (establishments && establishments.length > 0) {
                  generateCSV(
                    establishments,
                    establishmentColumns,
                    `establishments-${format(new Date(), "yyyy-MM-dd")}`,
                  );
                  toast.success("Export Complete", { description: "Establishments exported to CSV" });
                }
              }}
              disabled={!establishments || establishments.length === 0}
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            {estLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : sortedEstablishments && sortedEstablishments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <SortableTableHeader label="Code" sortKey="code" currentSort={estSort} onSort={handleEstSort} />
                      <SortableTableHeader label="Name" sortKey="name" currentSort={estSort} onSort={handleEstSort} />
                      <SortableTableHeader
                        label="Location"
                        sortKey="location"
                        currentSort={estSort}
                        onSort={handleEstSort}
                      />
                      <SortableTableHeader
                        label="Workers"
                        sortKey="workerCount"
                        currentSort={estSort}
                        onSort={handleEstSort}
                        align="center"
                      />
                      <SortableTableHeader
                        label="Present"
                        sortKey="present"
                        currentSort={estSort}
                        onSort={handleEstSort}
                        align="center"
                        icon={<UserCheck className="w-3 h-3 text-success" />}
                      />
                      <SortableTableHeader
                        label="Partial"
                        sortKey="partial"
                        currentSort={estSort}
                        onSort={handleEstSort}
                        align="center"
                        icon={<AlertCircle className="w-3 h-3 text-warning" />}
                      />
                      <SortableTableHeader
                        label="Absent"
                        sortKey="absent"
                        currentSort={estSort}
                        onSort={handleEstSort}
                        align="center"
                        icon={<UserX className="w-3 h-3 text-destructive" />}
                      />
                      <SortableTableHeader
                        label="Rate"
                        sortKey="rate"
                        currentSort={estSort}
                        onSort={handleEstSort}
                        align="center"
                      />
                      <th className="text-left py-3 font-medium">Approval</th>
                      <th className="text-right py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedEstablishments.map((est: any) => (
                      <tr
                        key={est.id}
                        className="border-b border-muted hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => setSelectedEstablishment(est)}
                      >
                        <td className="py-2 font-mono text-xs">{est.code}</td>
                        <td className="py-2 font-medium">{est.name}</td>
                        <td className="py-2">
                          {est.district}, {est.state}
                        </td>
                        <td className="py-2 text-center">
                          <Badge variant="outline">{est.workerCount || 0}</Badge>
                        </td>
                        <td className="py-2 text-center">
                          <span className="text-success font-medium">{est.todayStats?.present || 0}</span>
                        </td>
                        <td className="py-2 text-center">
                          <span className="text-warning font-medium">{est.todayStats?.partial || 0}</span>
                        </td>
                        <td className="py-2 text-center">
                          <span className="text-destructive font-medium">{est.todayStats?.absent || 0}</span>
                        </td>
                        <td className="py-2 text-center">
                          <Badge
                            variant={
                              est.todayStats?.rate >= 80
                                ? "default"
                                : est.todayStats?.rate >= 50
                                  ? "secondary"
                                  : "outline"
                            }
                            className={est.todayStats?.rate >= 80 ? "bg-success" : ""}
                          >
                            {est.todayStats?.rate || 0}%
                          </Badge>
                        </td>
                        <td className="py-2">
                          <Badge
                            variant={est.is_approved ? "default" : "secondary"}
                            className={est.is_approved ? "bg-success" : ""}
                          >
                            {est.is_approved ? "Approved" : "Pending"}
                          </Badge>
                        </td>
                        <td className="py-2 text-right">
                          {!est.is_approved && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-success hover:text-success hover:bg-success/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEstablishmentToApprove(est);
                              }}
                            >
                              Approve
                            </Button>
                          )}
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

        {/* Workers Search */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                All Workers
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (filteredWorkers && filteredWorkers.length > 0) {
                      generateCSV(
                        filteredWorkers,
                        workerWithEstablishmentColumns,
                        `workers-${format(new Date(), "yyyy-MM-dd")}`,
                      );
                      toast.success("Export Complete", { description: "Worker list exported to CSV" });
                    }
                  }}
                  disabled={!filteredWorkers || filteredWorkers.length === 0}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by ID, name, phone, or establishment..."
                    value={workerSearch}
                    onChange={(e) => setWorkerSearch(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  {workerSearch && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setWorkerSearch("")}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {workersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredWorkers && filteredWorkers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <SortableTableHeader
                        label="Worker ID"
                        sortKey="worker_id"
                        currentSort={workerSort}
                        onSort={handleWorkerSort}
                        className="py-3"
                      />
                      <SortableTableHeader
                        label="Name"
                        sortKey="name"
                        currentSort={workerSort}
                        onSort={handleWorkerSort}
                        className="py-3"
                      />
                      <SortableTableHeader
                        label="Phone"
                        sortKey="phone"
                        currentSort={workerSort}
                        onSort={handleWorkerSort}
                        className="py-3"
                      />
                      <SortableTableHeader
                        label="Location"
                        sortKey="location"
                        currentSort={workerSort}
                        onSort={handleWorkerSort}
                        className="py-3"
                      />
                      <SortableTableHeader
                        label="Establishment"
                        sortKey="establishment"
                        currentSort={workerSort}
                        onSort={handleWorkerSort}
                        className="py-3"
                      />
                      <SortableTableHeader
                        label="Status"
                        sortKey="status"
                        currentSort={workerSort}
                        onSort={handleWorkerSort}
                        className="py-3"
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWorkers.map((mapping: any) => (
                      <tr
                        key={mapping.id}
                        className="border-b border-muted hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() =>
                          setSelectedWorker({
                            id: mapping.workers?.id,
                            establishment: mapping.establishments?.name,
                          })
                        }
                      >
                        <td className="py-3 font-mono text-xs">{mapping.workers?.worker_id}</td>
                        <td className="py-3">
                          {mapping.workers?.first_name} {mapping.workers?.last_name}
                        </td>
                        <td className="py-3">{mapping.workers?.phone || "--"}</td>
                        <td className="py-3">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {mapping.workers?.district}, {mapping.workers?.state}
                          </span>
                        </td>
                        <td className="py-3">
                          <Badge variant="outline">{mapping.establishments?.name}</Badge>
                        </td>
                        <td className="py-3">
                          <Badge variant={mapping.workers?.is_active ? "default" : "secondary"}>
                            {mapping.workers?.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : workers && workers.length > 0 && filteredWorkers.length === 0 ? (
              <div className="text-center py-8">
                <Search className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No workers found matching "{workerSearch}"</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No workers mapped to any establishment yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Worker Details Dialog */}
      <WorkerDetailsDialog
        workerId={selectedWorker?.id || null}
        onClose={() => setSelectedWorker(null)}
        establishmentName={selectedWorker?.establishment}
      />

      {/* Establishment Details Dialog */}
      <EstablishmentDetailsDialog
        establishment={selectedEstablishment}
        onClose={() => setSelectedEstablishment(null)}
      />

      {/* Approve Establishment Dialog */}
      <ApproveEstablishmentDialog
        establishment={establishmentToApprove}
        onClose={() => setEstablishmentToApprove(null)}
      />
    </div>
  );
}

import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  LogOut,
  Building2,
  Users,
  UserCheck,
  TrendingUp,
  Loader2,
  Landmark,
  X,
  MapPin,
  Activity,
  Download,
  UserX,
  AlertCircle,
  FileText,
  Clock, // Added
  Eye, // Added
  Check, // Added
  CreditCard,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useDepartmentEstablishments,
  useDepartmentStats,
  useDepartmentAttendanceTrendByRange,
  useDepartmentWorkers,
  useUnmappedWorkers,
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
import { ActivateEstablishmentDialog } from "@/components/ActivateEstablishmentDialog";
import { DeactivateEstablishmentDialog } from "@/components/DeactivateEstablishmentDialog";
import { SortableTableHeader, SortConfig, sortData } from "@/components/SortableTableHeader";
import { AttendanceReportTable } from "@/components/AttendanceReportTable";
import { AttendanceReportFilters } from "@/components/AttendanceReportFilters";
import {
  useDepartmentAttendanceReport,
  useDepartmentWorkersList,
  useDepartmentEstablishmentsList,
} from "@/hooks/use-attendance-reports";

export default function DepartmentDashboard() {
  const queryClient = useQueryClient();
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
  const [establishmentToActivate, setEstablishmentToActivate] = useState<any | null>(null);
  const [establishmentToDeactivate, setEstablishmentToDeactivate] = useState<any | null>(null);

  // --- Worker Rejection Logic ---
  const [workerToApprove, setWorkerToApprove] = useState<any | null>(null);
  const [workerToReject, setWorkerToReject] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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

  // Worker Data for Admin Panel
  const { data: mappedWorkersData, isLoading: mappedLoading } = useDepartmentWorkers(userContext?.departmentId);
  const { data: unmappedWorkersData, isLoading: unmappedLoading } = useUnmappedWorkers(userContext?.district);

  const mappedWorkers = useMemo(() => {
    return mappedWorkersData?.map((m: any) => ({
      ...m.workers,
      establishment_name: m.establishments?.name,
      establishment_id: m.establishment_id,
      status: 'active'
    })) || [];
  }, [mappedWorkersData]);

  const activeUnmappedWorkers = useMemo(() => unmappedWorkersData?.filter((w: any) => w.status === 'active') || [], [unmappedWorkersData]);
  const pendingWorkers = useMemo(() => unmappedWorkersData?.filter((w: any) => w.status === 'new') || [], [unmappedWorkersData]);

  const workers = useMemo(() => {
    return [...pendingWorkers, ...activeUnmappedWorkers, ...mappedWorkers];
  }, [pendingWorkers, activeUnmappedWorkers, mappedWorkers]);

  const workersLoading = mappedLoading || unmappedLoading;

  const handleRejectWorker = async () => {
    if (!workerToReject || !rejectReason) return;
    try {
      await import("@/lib/api").then(mod => mod.rejectWorker(workerToReject.worker_id, rejectReason));
      toast.success("Worker rejected successfully");
      setWorkerToReject(null);
      setRejectReason("");
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const WorkerTable = ({ workers, showActions = false, viewOnly = false }: { workers: any[], showActions?: boolean, viewOnly?: boolean }) => (
    <div className="rounded-md border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/20">
              <SortableTableHeader label="Worker ID" sortKey="worker_id" currentSort={workerSort} onSort={handleWorkerSort} />
              <SortableTableHeader label="Name" sortKey="first_name" currentSort={workerSort} onSort={handleWorkerSort} />
              <SortableTableHeader label="Phone" sortKey="phone" currentSort={workerSort} onSort={handleWorkerSort} />
              <SortableTableHeader label="Location" sortKey="address_line" currentSort={workerSort} onSort={handleWorkerSort} />
              {viewOnly && (
                <SortableTableHeader label="Establishment" sortKey="establishment" currentSort={workerSort} onSort={handleWorkerSort} />
              )}
              {showActions && <th className="py-2 px-4 text-right font-medium text-muted-foreground">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {workers.map((worker) => (
              <tr key={worker.id || worker.worker_id} className="border-b transition-colors hover:bg-muted/50">
                <td className="p-4 align-middle font-medium text-sm">{worker.worker_id}</td>
                <td className="p-4 align-middle font-medium text-gray-900">{worker.first_name} {worker.last_name}</td>
                <td className="p-4 align-middle text-sm text-gray-500">{worker.phone}</td>
                <td className="p-4 align-middle text-sm text-gray-500">
                  {worker.district || worker.mandal || worker.village ? (
                    <span className="flex flex-col">
                      <span className="font-medium text-gray-700">{worker.district}</span>
                      <span className="text-xs">{worker.mandal || worker.village}</span>
                    </span>
                  ) : <span className="text-muted-foreground italic">--</span>}
                </td>
                {viewOnly && (
                  <td className="p-4 align-middle">
                    {worker.establishment_name ? (
                      <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                        <Building2 className="mr-1 h-3 w-3" /> {worker.establishment_name}
                      </div>
                    ) : <span className="text-muted-foreground">-</span>}
                  </td>
                )}
                {showActions && (
                  <td className="p-4 align-middle text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 lg:px-3 text-gray-700 hover:bg-gray-50"
                        onClick={() => setSelectedWorker({ id: worker.id, establishment: worker.establishment_name })}
                      >
                        <Eye className="mr-2 h-3.5 w-3.5 text-gray-500" /> View
                      </Button>
                      {!viewOnly && worker.status === 'new' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 lg:px-3 border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                            onClick={() => setWorkerToApprove(worker)}
                          >
                            <Check className="mr-2 h-3.5 w-3.5" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 lg:px-3 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
                            onClick={() => setWorkerToReject(worker)}
                          >
                            <X className="mr-2 h-3.5 w-3.5" /> Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {workers.length === 0 && (
        <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
          <Search className="h-10 w-10 text-muted-foreground/20 mb-3" />
          <p>No workers found in this category.</p>
        </div>
      )}
    </div>
  );


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
  const getWorkerValue = (worker: any, key: string) => {
    // Handle both flat and nested (legacy?) just in case, but prefer flat
    const w = worker.workers ? worker.workers : worker;
    const estName = worker.establishments ? worker.establishments.name : worker.establishment_name;

    switch (key) {
      case "worker_id":
        return w.worker_id;
      case "name":
        return `${w.first_name} ${w.last_name}`;
      case "phone":
        return w.phone;
      case "location":
        return `${w.district}, ${w.state}`;
      case "establishment":
        return estName;
      case "status":
        return w.is_active;
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
  const filterAndSort = (data: any[]) => {
    if (!data) return [];
    let result = data;

    if (workerSearch.trim()) {
      const searchLower = workerSearch.toLowerCase();
      result = data.filter((item: any) => {
        const w = item.workers ? item.workers : item;
        const estName = item.establishments ? item.establishments.name : item.establishment_name;

        return (
          w.worker_id?.toLowerCase().includes(searchLower) ||
          w.first_name?.toLowerCase().includes(searchLower) ||
          w.last_name?.toLowerCase().includes(searchLower) ||
          `${w.first_name} ${w.last_name}`.toLowerCase().includes(searchLower) ||
          estName?.toLowerCase().includes(searchLower) ||
          (w.phone && w.phone.includes(workerSearch))
        );
      });
    }
    return sortData(result, workerSort, getWorkerValue);
  };

  const mappedWorkersFiltered = useMemo(() => filterAndSort(mappedWorkers), [mappedWorkers, workerSearch, workerSort]);
  const activeUnmappedWorkersFiltered = useMemo(() => filterAndSort(activeUnmappedWorkers), [activeUnmappedWorkers, workerSearch, workerSort]);
  const pendingWorkersFiltered = useMemo(() => filterAndSort(pendingWorkers), [pendingWorkers, workerSearch, workerSort]);

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



        {/* Tabbed Sections */}
        <Tabs defaultValue="workers" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="workers" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Worker Admin
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Detailed Attendance
            </TabsTrigger>
            <TabsTrigger value="establishments" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Establishments Overview
            </TabsTrigger>
          </TabsList>

          {/* Detailed Attendance Tab */}
          <TabsContent value="attendance">
            <Card>
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
          </TabsContent>

          {/* Establishments Tab */}
          <TabsContent value="establishments">
            <Card>
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
                          <th className="text-left py-3 font-medium">Status</th>
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
                                {est.is_approved ? "Active" : "Inactive"}
                              </Badge>
                            </td>
                            <td className="py-2 text-right">
                              {!est.is_approved ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-success hover:text-success hover:bg-success/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEstablishmentToActivate(est);
                                  }}
                                >
                                  Activate
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEstablishmentToDeactivate(est);
                                  }}
                                >
                                  Deactivate
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
          </TabsContent>

          {/* Worker Admin Tab */}
          <TabsContent value="workers">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Users className="h-5 w-5" /> Worker Admin
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Manage approvals, mapping, and worker status</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <Dialog>
                    <DialogTrigger asChild><Button><UserCheck className="mr-2 h-4 w-4" /> Enroll Worker</Button></DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                      {userContext?.departmentId && <EnrollWorkerDialog departmentId={userContext.departmentId} />}
                    </DialogContent>
                  </Dialog>
                  {/* Export Button if needed */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (workers && workers.length > 0) {
                        generateCSV(workers, workerWithEstablishmentColumns, `workers-${format(new Date(), 'yyyy-MM-dd')}`);
                        toast.success("Export Complete");
                      }
                    }}
                    className="hidden sm:flex"
                  >
                    <Download className="w-4 h-4 mr-2" /> Export
                  </Button>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search workers..." className="pl-8" value={workerSearch} onChange={(e) => setWorkerSearch(e.target.value)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="mapped" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="mapped">
                      <Building2 className="w-4 h-4 mr-2" />
                      Mapped
                      {mappedWorkers && mappedWorkers.length > 0 && <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">{mappedWorkers.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="unmapped">
                      <MapPin className="w-4 h-4 mr-2" />
                      Unmapped
                      {activeUnmappedWorkers && activeUnmappedWorkers.length > 0 && <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-700">{activeUnmappedWorkers.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="pending">
                      <Clock className="w-4 h-4 mr-2" />
                      Pending
                      {pendingWorkers && pendingWorkers.length > 0 && <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-700">{pendingWorkers.length}</Badge>}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="mapped" className="space-y-4">
                    <WorkerTable workers={mappedWorkersFiltered} viewOnly={true} showActions={true} />
                  </TabsContent>
                  <TabsContent value="unmapped" className="space-y-4">
                    <WorkerTable workers={activeUnmappedWorkersFiltered} viewOnly={false} showActions={true} />
                  </TabsContent>
                  <TabsContent value="pending" className="space-y-4">
                    <WorkerTable workers={pendingWorkersFiltered} showActions={true} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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

      {/* Activate Establishment Dialog */}
      <ActivateEstablishmentDialog
        establishment={establishmentToActivate}
        onClose={() => setEstablishmentToActivate(null)}
      />

      {/* Deactivate Establishment Dialog */}
      <DeactivateEstablishmentDialog
        establishment={establishmentToDeactivate}
        onClose={() => setEstablishmentToDeactivate(null)}
      />

      {/* Approve Worker Dialog */}
      <Dialog open={!!workerToApprove} onOpenChange={(o) => { if (!o) setWorkerToApprove(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve & Activate Worker</DialogTitle>
            <DialogDescription>
              Assign a Smart Card to activate <b>{workerToApprove?.first_name} {workerToApprove?.last_name}</b>.
              This will enable them to check in.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 flex flex-col items-center justify-center gap-6">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center animate-pulse">
              <CreditCard className="w-10 h-10 text-blue-600" />
            </div>

            <div className="text-center space-y-2">
              <p className="font-medium">Ready to Assign Card</p>
              <p className="text-sm text-muted-foreground">Place the Smart Card on the reader and click below.</p>
            </div>

            <div className="flex w-full gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setWorkerToApprove(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={async () => {
                  if (!workerToApprove) return;
                  try {
                    const { registerUser, approveWorker } = await import("@/lib/api");

                    // 1. Register Card (WebAuthn)
                    // Use worker_id string (e.g., WKR00000001) as username
                    toast.message("Setup", { description: "Follow browser prompts to register Smart Card..." });
                    const success = await registerUser(workerToApprove.worker_id);

                    if (success) {
                      // 2. Approve Worker (Set status to active)
                      await approveWorker(workerToApprove.id, userContext?.departmentId);
                      toast.success("Success", { description: "Card assigned and worker approved!" });
                      setWorkerToApprove(null);

                      // Refresh lists immediately
                      queryClient.invalidateQueries({ queryKey: ['unmapped-workers'] });
                      queryClient.invalidateQueries({ queryKey: ['department-workers'] });
                      queryClient.invalidateQueries({ queryKey: ['department-stats'] });
                    } else {
                      toast.error("Card registration failed.");
                    }
                  } catch (e: any) {
                    console.error(e);
                    toast.error("Error", { description: e.message || "Operation failed" });
                  }
                }}
              >
                <CreditCard className="w-4 h-4" />
                Assign & Approve
              </Button>
            </div>

            <div className="pt-4 border-t w-full text-center">
              <button
                className="text-xs text-muted-foreground hover:underline"
                onClick={async () => {
                  // Bypass card assignment
                  if (!confirm("Are you sure you want to approve without assigning a card? They won't be able to check in.")) return;
                  try {
                    const { approveWorker } = await import("@/lib/api");
                    await approveWorker(workerToApprove.id, userContext?.departmentId);
                    toast.success("Worker Approved (No Card Assigned)");
                    setWorkerToApprove(null);

                    // Refresh lists
                    queryClient.invalidateQueries({ queryKey: ['unmapped-workers'] });
                    queryClient.invalidateQueries({ queryKey: ['department-workers'] });
                    queryClient.invalidateQueries({ queryKey: ['department-stats'] });
                  } catch (e: any) { toast.error(e.message); }
                }}
              >
                Approve without card (Not Recommended)
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

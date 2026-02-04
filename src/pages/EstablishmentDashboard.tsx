import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Clock,
  LogOut,
  Users,
  UserCheck,
  UserX,
  AlertCircle,
  Loader2,
  Building2,
  UserMinus,
  Search,
  X,
  Download,
  UserX2,
  Landmark,
  FileText,
  Ban,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { generateCSV, workerColumns, attendanceTrendColumns } from "@/lib/csv-export";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import {
  useEstablishmentWorkers,
  useEstablishmentTodayAttendance,
  useEstablishmentAttendanceTrendByRange,
} from "@/hooks/use-dashboard-data";
import { useEstablishmentDashboardRealtime } from "@/hooks/use-realtime-subscriptions";
import { useUnmapWorker } from "@/hooks/use-worker-mapping";

// Helper function to format Worker ID
const formatWorkerId = (rawId: string | null | undefined): string => {
  if (!rawId) return 'N/A';
  const year = new Date().getFullYear();

  // If already formatted (contains dashes), return as-is
  if (rawId.includes('-')) return rawId;

  // If numeric only (e.g. "00145"), format as WKR-AP-YYYY-XXXXX
  if (/^\d+$/.test(rawId)) {
    return `WKR-AP-${year}-${rawId.padStart(5, '0')}`;
  }

  // If ID starts with WKR but no dashes (e.g. WKR7107...), format it
  if (rawId.startsWith('WKR') && !rawId.includes('-')) {
    const suffix = rawId.replace('WKR', '');
    return `WKR-AP-${year}-${suffix}`;
  }

  // Default: return as-is
  return rawId;
};

import { AttendanceChart, AttendanceRateChart } from "@/components/AttendanceChart";
import { DateRangePicker, DateRangePresets } from "@/components/DateRangePicker";
import { DateRange } from "react-day-picker";
import { format, subDays } from "date-fns";
import { EditEstablishmentProfileDialog } from "@/components/EditEstablishmentProfileDialog";
import { WorkerDetailsDialog } from "@/components/WorkerDetailsDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AttendanceReportTable } from "@/components/AttendanceReportTable";
import { AttendanceReportFilters } from "@/components/AttendanceReportFilters";
import { useEstablishmentAttendanceReport, useEstablishmentWorkersList } from "@/hooks/use-attendance-reports";

export default function EstablishmentDashboard() {
  // Enable real-time updates
  useEstablishmentDashboardRealtime();
  const { userContext, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [unmapDialog, setUnmapDialog] = useState<{ open: boolean; mappingId: string; workerName: string }>({
    open: false,
    mappingId: "",
    workerName: "",
  });
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

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
  const [reportWorkerFilter, setReportWorkerFilter] = useState<string | undefined>(undefined);

  const startDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined;
  const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;
  const reportStartDate = reportDateRange?.from ? format(reportDateRange.from, "yyyy-MM-dd") : undefined;
  const reportEndDate = reportDateRange?.to ? format(reportDateRange.to, "yyyy-MM-dd") : undefined;

  const { data: workers, isLoading: workersLoading } = useEstablishmentWorkers(userContext?.establishmentId);

  // Fetch establishment details to check approval status
  const { data: establishment } = useQuery({
    queryKey: ["establishment", userContext?.establishmentId],
    queryFn: async () => {
      if (!userContext?.establishmentId) return null;
      const { data, error } = await supabase
        .from("establishments")
        .select("id, name, is_approved, department_id, departments(name)")
        .eq("id", userContext.establishmentId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userContext?.establishmentId,
  });

  const isApproved = establishment?.is_approved ?? true;
  const departmentName = (establishment?.departments as any)?.name || "Unknown Department";

  // Filter workers based on search
  const filteredWorkers = useMemo(() => {
    if (!workers) return [];
    if (!workerSearch.trim()) return workers;

    const searchLower = workerSearch.toLowerCase();
    return workers.filter((mapping: any) => {
      const w = mapping.workers;
      return (
        w?.worker_id?.toLowerCase().includes(searchLower) ||
        w?.first_name?.toLowerCase().includes(searchLower) ||
        w?.last_name?.toLowerCase().includes(searchLower) ||
        `${w?.first_name} ${w?.last_name}`.toLowerCase().includes(searchLower) ||
        (w?.phone && w.phone.includes(workerSearch))
      );
    });
  }, [workers, workerSearch]);
  const { data: todayStats, isLoading: statsLoading } = useEstablishmentTodayAttendance(userContext?.establishmentId);
  const { data: trendData, isLoading: trendLoading } = useEstablishmentAttendanceTrendByRange(
    userContext?.establishmentId,
    startDate,
    endDate,
  );
  const unmapWorker = useUnmapWorker();

  // Report data
  const { data: reportData, isLoading: reportLoading } = useEstablishmentAttendanceReport(
    userContext?.establishmentId,
    { startDate: reportStartDate || "", endDate: reportEndDate || "", workerId: reportWorkerFilter },
  );
  const { data: workersList } = useEstablishmentWorkersList(userContext?.establishmentId);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleUnmap = async () => {
    if (unmapDialog.mappingId && user) {
      await unmapWorker.mutateAsync({
        mappingId: unmapDialog.mappingId,
        unmappedBy: user.id,
      });
      setUnmapDialog({ open: false, mappingId: "", workerName: "" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/opoc/ap-logo.png" alt="Seal" className="w-10 h-10 object-contain" />
            <div className="flex flex-col">
              <span className="text-lg md:text-xl font-display font-bold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent leading-none">
                One State - One Card
              </span>
              <span className="text-xs text-slate-500 font-medium tracking-wide">Government of Andhra Pradesh</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-sm font-medium text-slate-700">{userContext?.fullName}</span>
              <span className="text-xs text-slate-500">Establishment Dashboard</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-500 hover:text-red-500 hover:bg-red-50">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Pending Approval Banner */}
        {!isApproved && (
          <div className="mb-6 p-4 bg-warning/10 border border-warning/30 rounded-lg">
            <div className="flex items-center gap-2 text-warning">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Awaiting Department Approval</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <Landmark className="w-3 h-3" />
              This establishment is pending approval from <strong className="mx-1">{departmentName}</strong>. Worker
              mapping and attendance tracking are disabled until approved.
            </p>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-display font-bold">Establishment Dashboard</h1>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  {isApproved ? (
                    <Button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white" asChild>
                      <Link to="/establishment/attendance">
                        <Clock className="w-4 h-4 mr-2" />
                        Check-in / Check-out
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="default" disabled className="cursor-not-allowed">
                      <Ban className="w-4 h-4 mr-2" />
                      Check-in / Check-out
                    </Button>
                  )}
                </TooltipTrigger>
                {!isApproved && (
                  <TooltipContent>
                    <p>Inactive — activate from department</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <Button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white" asChild>
              <Link to="/establishment/workers">
                <Users className="w-4 h-4 mr-2" />
                Manage Workers
              </Link>
            </Button>
            <EditEstablishmentProfileDialog establishmentId={userContext?.establishmentId} />
          </div>
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



        {/* Detailed Attendance Report */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Attendance Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <AttendanceReportFilters
                dateRange={reportDateRange}
                onDateRangeChange={setReportDateRange}
                workers={workersList || []}
                selectedWorker={reportWorkerFilter}
                onWorkerChange={setReportWorkerFilter}
                showEstablishmentFilter={false}
                onExport={() => {
                  if (reportData && reportData.length > 0) {
                    const csvContent = [
                      [
                        "Date",
                        "Worker ID",
                        "Worker Name",
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
                    a.download = `establishment-attendance-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
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
                <AttendanceReportTable data={reportData || []} showEstablishment={false} showDepartment />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Worker List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Mapped Workers
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (filteredWorkers && filteredWorkers.length > 0) {
                      generateCSV(filteredWorkers, workerColumns, `workers-${format(new Date(), "yyyy-MM-dd")}`);
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
                    placeholder="Search by ID, name, or phone..."
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
                      <th className="text-left py-3 font-medium">Worker ID</th>
                      <th className="text-left py-3 font-medium">Name</th>
                      <th className="text-left py-3 font-medium">Phone</th>
                      <th className="text-left py-3 font-medium">Location</th>
                      <th className="text-left py-3 font-medium">Status</th>
                      <th className="text-right py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWorkers.map((mapping: any) => (
                      <tr
                        key={mapping.id}
                        className="border-b border-muted hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => setSelectedWorkerId(mapping.workers?.id)}
                      >
                        <td className="py-3 font-mono text-xs">{formatWorkerId(mapping.workers?.worker_id)}</td>
                        <td className="py-3">
                          {mapping.workers?.first_name} {mapping.workers?.last_name}
                        </td>
                        <td className="py-3">{mapping.workers?.phone || "--"}</td>
                        <td className="py-3">
                          {mapping.workers?.district}, {mapping.workers?.state}
                        </td>
                        <td className="py-3">
                          <Badge
                            className={mapping.workers?.is_active ? "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white" : ""}
                            variant={mapping.workers?.is_active ? "default" : "secondary"}
                          >
                            {mapping.workers?.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUnmapDialog({
                                open: true,
                                mappingId: mapping.id,
                                workerName: `${mapping.workers?.first_name} ${mapping.workers?.last_name}`,
                              });
                            }}
                          >
                            <UserX2 className="w-4 h-4 mr-1" />
                            Relieve
                          </Button>
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
      <AlertDialog open={unmapDialog.open} onOpenChange={(open) => setUnmapDialog((prev) => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Relieve Worker</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to relieve <strong>{unmapDialog.workerName}</strong> from this establishment? They
              will no longer appear in your worker list and their attendance will not be tracked under this
              establishment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnmap}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={unmapWorker.isPending}
            >
              {unmapWorker.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Relieve Worker
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Worker Details Dialog */}
      <WorkerDetailsDialog workerId={selectedWorkerId} onClose={() => setSelectedWorkerId(null)} />
    </div>
  );
}

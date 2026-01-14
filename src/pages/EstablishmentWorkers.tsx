import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  LogOut,
  Users,
  Loader2,
  Building2,
  UserMinus,
  Search,
  X,
  Download,
  UserX2,
  ArrowLeft,
  Clock,
  AlertCircle,
  Landmark,
} from "lucide-react";
import { generateCSV, workerColumns } from "@/lib/csv-export";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import { useEstablishmentWorkers } from "@/hooks/use-dashboard-data";
import { useUnmapWorker } from "@/hooks/use-worker-mapping";
import { MapWorkerDialog } from "@/components/MapWorkerDialog";
import { AddWorkerDialog } from "@/components/AddWorkerDialog";
import { WorkerDetailsDialog } from "@/components/WorkerDetailsDialog";
import { WorkerAttendanceLogsDialog } from "@/components/WorkerAttendanceLogsDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

export default function EstablishmentWorkers() {
  const { userContext, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [unmapDialog, setUnmapDialog] = useState<{ open: boolean; mappingId: string; workerName: string }>({
    open: false,
    mappingId: "",
    workerName: "",
  });
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [workerForLogs, setWorkerForLogs] = useState<{
    id: string;
    worker_id: string;
    first_name: string;
    last_name: string;
  } | null>(null);
  const [workerSearch, setWorkerSearch] = useState("");

  const { data: workers, isLoading: workersLoading } = useEstablishmentWorkers(userContext?.establishmentId);

  // Fetch establishment details to check approval status
  const { data: establishment } = useQuery({
    queryKey: ["establishment", userContext?.establishmentId],
    queryFn: async () => {
      if (!userContext?.establishmentId) return null;
      const { data, error } = await supabase
        .from("establishments")
        .select("id, name, is_active, department_id, departments(name)")
        .eq("id", userContext.establishmentId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userContext?.establishmentId,
  });

  const isActive = establishment?.is_active ?? true;
  const departmentName = (establishment?.departments as any)?.name || "Unknown Department";

  const unmapWorker = useUnmapWorker();

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
        <div className="mb-6">
          <Link to="/establishment/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>

        {/* Inactive Banner */}
        {!isActive && (
          <div className="mb-6 p-4 bg-warning/10 border border-warning/30 rounded-lg">
            <div className="flex items-center gap-2 text-warning">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Establishment Inactive</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <Landmark className="w-3 h-3" />
              This establishment is inactive. Contact <strong className="mx-1">{departmentName}</strong> to activate.
              Worker mapping is disabled until activated.
            </p>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-display font-bold">Manage Workers</h1>
          <div className="flex items-center gap-2">
            {userContext?.establishmentId && user && isActive && (
              <>
                <AddWorkerDialog establishmentId={userContext.establishmentId} mappedBy={user.id} />
                <MapWorkerDialog establishmentId={userContext.establishmentId} mappedBy={user.id} />
              </>
            )}
          </div>
        </div>

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
                        <td className="py-3 font-mono text-xs">{mapping.workers?.worker_id}</td>
                        <td className="py-3">
                          {mapping.workers?.first_name} {mapping.workers?.last_name}
                        </td>
                        <td className="py-3">{mapping.workers?.phone || "--"}</td>
                        <td className="py-3">
                          {mapping.workers?.district}, {mapping.workers?.state}
                        </td>
                        <td className="py-3">
                          <Badge variant={mapping.workers?.is_active ? "default" : "secondary"}>
                            {mapping.workers?.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setWorkerForLogs({
                                  id: mapping.workers?.id,
                                  worker_id: mapping.workers?.worker_id,
                                  first_name: mapping.workers?.first_name,
                                  last_name: mapping.workers?.last_name,
                                });
                              }}
                            >
                              <Clock className="w-4 h-4 mr-1" />
                              Logs
                            </Button>
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
                          </div>
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
                {isActive && (
                  <p className="text-sm text-muted-foreground">
                    Click "Map Worker" above to add workers to your establishment.
                  </p>
                )}
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

      {/* Worker Attendance Logs Dialog */}
      <WorkerAttendanceLogsDialog worker={workerForLogs} onClose={() => setWorkerForLogs(null)} />
    </div>
  );
}
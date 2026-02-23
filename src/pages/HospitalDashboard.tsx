import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, LogOut, Filter } from "lucide-react";

const API = "https://workerconnection-backend.vercel.app/api";

const SCHEME_COLORS: Record<string, string> = {
    "NTR Vaidya Seva": "#16a34a",
    "EHS": "#2563eb",
    "PMJAY": "#9333ea",
    "Paid": "#64748b",
};

function money(n: number | string) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n));
}

async function fetchRecords(establishmentId: string, filters: Record<string, string>) {
    const params = new URLSearchParams({
        establishment_id: establishmentId,
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v && v !== "all"))
    });
    const res = await fetch(`${API}/health/records?${params}&limit=200`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export default function HospitalDashboard() {
    const { userContext, signOut } = useAuth();
    const navigate = useNavigate();

    const [serviceFilter, setServiceFilter] = useState("all");
    const [schemeFilter, setSchemeFilter] = useState("all");
    const [diagnosisFilter, setDiagnosisFilter] = useState("");
    const [workerSearch, setWorkerSearch] = useState("");
    const [dateFilter, setDateFilter] = useState("");

    const establishmentId = userContext?.establishmentId || "";
    const establishmentName = userContext?.fullName || userContext?.email?.split("@")[0] || "Hospital";

    const { data: recordsData, isLoading, isFetching } = useQuery({
        queryKey: ["hospital-records", establishmentId, serviceFilter, schemeFilter, diagnosisFilter],
        queryFn: () => fetchRecords(establishmentId, {
            service_type: serviceFilter !== "all" ? serviceFilter : "",
            scheme_name: schemeFilter !== "all" ? schemeFilter : "",
            diagnosis: diagnosisFilter,
        }),
        enabled: !!establishmentId,
        retry: 2,
        placeholderData: (prev: any) => prev,
    });

    const allRecords = recordsData?.records || [];

    const filtered = useMemo(() => {
        let r = allRecords;
        if (workerSearch) r = r.filter((x: any) => `${x.first_name} ${x.last_name} ${x.worker_code}`.toLowerCase().includes(workerSearch.toLowerCase()));
        if (dateFilter) r = r.filter((x: any) => x.created_at?.startsWith(dateFilter));
        return r;
    }, [allRecords, workerSearch, dateFilter]);

    const stats = useMemo(() => {
        const total = allRecords.length;
        const free = allRecords.filter((r: any) => r.govt_paid > 0).length;
        const consultations = allRecords.filter((r: any) => r.service_type === "Consultation").length;
        const govtSpend = allRecords.reduce((s: number, r: any) => s + Number(r.govt_paid || 0), 0);
        const totalCost = allRecords.reduce((s: number, r: any) => s + Number(r.cost || 0), 0);
        return { total, free, consultations, govtSpend, totalCost };
    }, [allRecords]);

    return (
        <div className="min-h-screen bg-slate-50 pb-8">

            {/* Header — same as APSRTC */}
            <header className="bg-white border-b sticky top-0 z-20 shadow-sm border-t-4 border-t-orange-600">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/opoc/ap-logo.png" alt="AP Govt" className="w-12 h-12 object-contain" />
                        <div className="flex flex-col">
                            <span className="text-xl font-black text-orange-700 leading-none tracking-tight">
                                {establishmentName}
                            </span>
                            <span className="text-xs text-slate-500 font-bold tracking-widest mt-1">
                                AP HEALTH DEPARTMENT — HOSPITAL DASHBOARD
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <div className="text-sm font-bold text-slate-700">Hospital Admin</div>
                            <div className="text-xs text-slate-500">{userContext?.email}</div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => { await signOut(); navigate("/"); }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                            <LogOut className="w-4 h-4 mr-2" /> Log Out
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6 space-y-6">

                        {/* Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            {[
                                { label: "Total Records", value: stats.total, cls: "border-l-orange-500" },
                                { label: "Free (Govt)", value: stats.free, cls: "border-l-green-500" },
                                { label: "Consultations", value: stats.consultations, cls: "border-l-blue-500" },
                                { label: "Govt Spend", value: money(stats.govtSpend), cls: "border-l-green-500" },
                                { label: "Total Cost", value: money(stats.totalCost), cls: "border-l-slate-500" },
                            ].map((s, i) => (
                                <Card key={i} className={`border-l-4 ${s.cls} shadow-sm`}>
                                    <CardContent className="p-4 flex flex-col gap-1">
                                        <span className="text-sm font-medium text-slate-500">{s.label}</span>
                                        <span className="text-2xl font-bold text-slate-800">{s.value}</span>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Filters */}
                        <Card className="p-4 shadow-sm">
                            <div className="flex flex-wrap gap-3 items-center">
                                <Filter className="w-4 h-4 text-slate-400" />
                                <Select value={serviceFilter} onValueChange={setServiceFilter}>
                                    <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="All Services" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Services</SelectItem>
                                        {["Consultation", "Pharmacy", "Laboratory", "Surgery"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select value={schemeFilter} onValueChange={setSchemeFilter}>
                                    <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="All Schemes" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Schemes</SelectItem>
                                        {["NTR Vaidya Seva", "EHS", "PMJAY", "Paid"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Input placeholder="Disease..." value={diagnosisFilter} onChange={e => setDiagnosisFilter(e.target.value)} className="w-36 h-9 text-sm" />
                                <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-40 h-9 text-sm" />
                                <Input placeholder="Worker name/ID..." value={workerSearch} onChange={e => setWorkerSearch(e.target.value)} className="w-44 h-9 text-sm" />
                            </div>
                        </Card>

                        {/* Records Table */}
                        <Card className="shadow-sm relative">
                            {isFetching && (
                                <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-lg">
                                    <Loader2 className="animate-spin w-6 h-6 text-orange-600" />
                                </div>
                            )}
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 border-b">
                                            <tr>
                                                {["Date", "Service", "Worker", "Disease", "Description", "Total Cost", "Patient Paid", "Govt Paid", "Scheme"].map(h => (
                                                    <th key={h} className="h-10 px-4 text-left font-medium text-slate-500 whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filtered.slice(0, 100).map((r: any) => {
                                                const patientPaid = Number(r.cost) - Number(r.govt_paid);
                                                return (
                                                    <tr key={r.id} className="border-b hover:bg-slate-50/50">
                                                        <td className="p-3 text-xs whitespace-nowrap">
                                                            {new Date(r.created_at).toLocaleDateString("en-IN")}<br />
                                                            <span className="text-slate-400 text-[10px]">{new Date(r.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                                                        </td>
                                                        <td className="p-3 text-xs">
                                                            {r.service_type === "Consultation" ? "🩺" : r.service_type === "Pharmacy" ? "💊" : r.service_type === "Laboratory" ? "🔬" : "🏥"} {r.service_type}
                                                        </td>
                                                        <td className="p-3 text-xs whitespace-nowrap">
                                                            {r.first_name} {r.last_name}<br />
                                                            <span className="text-slate-400 text-[10px]">{r.worker_code}</span>
                                                        </td>
                                                        <td className="p-3 text-xs">{r.diagnosis}</td>
                                                        <td className="p-3 text-xs max-w-[180px] truncate">{r.description}</td>
                                                        <td className="p-3 text-xs">{money(r.cost)}</td>
                                                        <td className="p-3 text-xs">{money(patientPaid)}</td>
                                                        <td className="p-3 text-xs text-green-600 font-medium">{money(r.govt_paid)}</td>
                                                        <td className="p-3">
                                                            <Badge style={{ background: SCHEME_COLORS[r.scheme_name] || "#64748b", color: "white", fontSize: 10 }}>
                                                                {r.scheme_name}
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {filtered.length === 0 && !isFetching && (
                                                <tr><td colSpan={9} className="p-10 text-center text-slate-400">No records found</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
            </main>
        </div>
    );
}

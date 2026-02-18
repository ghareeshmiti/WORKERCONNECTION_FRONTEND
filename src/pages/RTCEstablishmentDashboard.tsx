import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Ticket, Gift, Wallet, Filter, Calendar as CalendarIcon, LogOut, Bus } from "lucide-react";
import { format } from "date-fns";
import { useRTCEstablishment, useRTCTapEvents } from "@/hooks/rtc/use-rtc-depot-data";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

function money(n: number) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function RTCEstablishmentDashboard() {
    const { userContext, signOut } = useAuth();
    const navigate = useNavigate();

    // Filters State
    const [busFilter, setBusFilter] = useState("");
    const [routeFilter, setRouteFilter] = useState("all");
    const [schemeFilter, setSchemeFilter] = useState("all");
    const [districtFilter, setDistrictFilter] = useState("all"); // Mostly redundant for depot, but added as per req
    const [date, setDate] = useState<Date | undefined>(undefined);

    const establishmentId = userContext?.establishmentId;

    const { data: est, isLoading: estLoading } = useRTCEstablishment(establishmentId);
    const { data: taps, isLoading: tapsLoading } = useRTCTapEvents(establishmentId, 500);

    const handleLogout = async () => {
        await signOut();
        navigate("/");
    };

    // --- Derived Data & Filtering ---
    const processedData = useMemo(() => {
        if (!taps) return { rows: [], stats: { total: 0, free: 0, freeSubsidy: 0, concession: 0, concessionPaid: 0, concessionSubsidy: 0, revenue: 0 } };

        let filtered = taps;

        // 1. Bus Number Filter
        if (busFilter.trim()) {
            filtered = filtered.filter(t =>
                (t.meta?.bus_no || "").toLowerCase().includes(busFilter.toLowerCase())
            );
        }

        // 2. Route Filter
        if (routeFilter !== "all") {
            filtered = filtered.filter(t => (t.meta?.route || "") === routeFilter);
        }

        // 3. Scheme Filter
        if (schemeFilter !== "all") {
            if (schemeFilter === "Paid") {
                filtered = filtered.filter(t => !t.meta?.is_free && !t.meta?.govt_subsidy);
            } else {
                filtered = filtered.filter(t => (t.meta?.remarks || "Standard") === schemeFilter);
            }
        }

        // 4. Date Filter
        if (date) {
            const filterStr = date.toDateString();
            filtered = filtered.filter(t => new Date(t.occurred_at).toDateString() === filterStr);
        }

        // Stats calculation on filtered data
        let total = 0;
        let free = 0;
        let freeSubsidy = 0;
        let concession = 0;
        let concessionPaid = 0;
        let concessionSubsidy = 0;
        let revenue = 0;

        for (const t of filtered) {
            total++;
            const fare = Number(t.meta?.fare || 0);
            const subsidy = Number(t.meta?.govt_subsidy || 0);
            const isFree = t.meta?.is_free;
            const remarks = t.meta?.remarks || "";

            if (isFree) {
                free++;
                freeSubsidy += subsidy;
            } else if (subsidy > 0) {
                // Concession (Partially Paid)
                concession++;
                concessionPaid += fare; // User paid this
                concessionSubsidy += subsidy;
            } else {
                // Fully Paid
                revenue += fare; // Aggregated into "Total Revenue" usually, or strictly "Paid Revenue"?
                // Design shows "Total Revenue ₹190". 
                // Usually Revenue = User Paid Amount. 
                // So logic: Revenue = (Standard Paid Fare) + (Concession Paid Fare)
            }
        }

        // Recalculate Total Revenue to include all USER PAID amounts
        const totalUserRevenue = filtered.reduce((sum, t) => sum + Number(t.meta?.fare || 0), 0);

        return {
            rows: filtered,
            stats: { total, free, freeSubsidy, concession, concessionPaid, concessionSubsidy, revenue: totalUserRevenue }
        };

    }, [taps, busFilter, routeFilter, schemeFilter, date]);


    // Extract Unique Options
    const routes = useMemo(() => Array.from(new Set(taps?.map(t => t.meta?.route || "Unknown").filter(r => r !== "Unknown"))), [taps]);
    const schemes = useMemo(() => {
        const s = new Set<string>();
        s.add("Paid");
        taps?.forEach(t => {
            if (t.meta?.remarks) s.add(t.meta.remarks);
        });
        return Array.from(s);
    }, [taps]);


    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            {/* Light Header with Gradient Text */}
            <header className="bg-white border-b sticky top-0 z-30">
                <div className="container mx-auto px-6 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <img src="/opoc/ap-logo.png" alt="AP Govt" className="w-10 h-10 object-contain" />
                        <div className="flex flex-col">
                            <h1 className="text-xl font-bold flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent leading-none">
                                {est?.name || "Guntur Depot"}
                            </h1>
                            <p className="text-slate-500 text-xs mt-0.5 font-medium tracking-wide">
                                Government of Andhra Pradesh — AP State Road Transport Corp.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end mr-2">
                            <span className="text-sm font-medium text-slate-700">{est?.code || "RTCD"}</span>
                            <span className="text-[10px] uppercase tracking-wider font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                                {est?.is_approved ? "Active" : "Pending"}
                            </span>
                        </div>
                        <Button variant="ghost" size="sm" className="text-slate-500 hover:text-red-600 hover:bg-red-50" onClick={handleLogout}>
                            <LogOut className="w-4 h-4 mr-2" /> Logout
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-6 space-y-6 container mx-auto max-w-7xl">

                {/* KPI Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* 1. Total Tickets */}
                    <Card className="shadow-sm border-l-4 border-l-slate-800">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-slate-100 rounded-lg">
                                <Ticket className="w-6 h-6 text-slate-700" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">Total Tickets</p>
                                <h3 className="text-2xl font-bold text-slate-900">{processedData.stats.total}</h3>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2. Free Scheme */}
                    <Card className="shadow-sm border-l-4 border-l-green-500">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-green-50 rounded-lg">
                                <Gift className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">Free Scheme</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-2xl font-bold text-slate-900">{processedData.stats.free}</h3>
                                    <span className="text-xs text-slate-500">(Govt: ₹{processedData.stats.freeSubsidy})</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. Concession */}
                    <Card className="shadow-sm border-l-4 border-l-yellow-500">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-yellow-50 rounded-lg">
                                <Gift className="w-6 h-6 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">Concession</p>
                                <div className="flex flex-col">
                                    <h3 className="text-2xl font-bold text-slate-900 leading-none">{processedData.stats.concession}</h3>
                                    <span className="text-[10px] text-slate-500 mt-1">(Govt: ₹{processedData.stats.concessionSubsidy}, Paid: ₹{processedData.stats.concessionPaid})</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 4. Total Revenue */}
                    <Card className="shadow-sm border-l-4 border-l-blue-500">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-blue-50 rounded-lg">
                                <Wallet className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">Total Revenue</p>
                                <h3 className="text-2xl font-bold text-slate-900">{money(processedData.stats.revenue)}</h3>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters Row */}
                <Card className="shadow-sm border-0">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3 text-slate-500 font-medium text-sm">
                            <Filter className="w-4 h-4" /> Filters
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                            {/* Routes */}
                            <Select value={routeFilter} onValueChange={setRouteFilter}>
                                <SelectTrigger className="bg-slate-50 border-slate-200">
                                    <SelectValue placeholder="All Routes" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Routes</SelectItem>
                                    {routes.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            {/* Bus Number */}
                            <Input
                                placeholder="Bus Number"
                                className="bg-slate-50 border-slate-200"
                                value={busFilter}
                                onChange={(e) => setBusFilter(e.target.value)}
                            />

                            {/* Schemes */}
                            <Select value={schemeFilter} onValueChange={setSchemeFilter}>
                                <SelectTrigger className="bg-slate-50 border-slate-200">
                                    <SelectValue placeholder="All Schemes" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Schemes</SelectItem>
                                    {schemes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            {/* Date Picker */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={`bg-slate-50 border-slate-200 justify-start text-left font-normal ${!date && "text-muted-foreground"}`}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "dd-MM-yyyy") : <span>dd-mm-yyyy</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>

                            {/* Districts */}
                            <Select value={districtFilter} onValueChange={setDistrictFilter}>
                                <SelectTrigger className="bg-slate-50 border-slate-200">
                                    <SelectValue placeholder="All Districts" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Districts</SelectItem>
                                    <SelectItem value="Guntur">Guntur</SelectItem>
                                    <SelectItem value="Krishna">Krishna</SelectItem>
                                    <SelectItem value="Visakhapatnam">Visakhapatnam</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Tickets Table */}
                <Card className="shadow-sm border-0 overflow-hidden">
                    <CardContent className="p-0">
                        <div className="p-4 border-b bg-white flex justify-between items-center">
                            <h3 className="font-semibold text-slate-800">Tickets ({processedData.stats.total})</h3>
                        </div>
                        <div className="overflow-x-auto">
                            {tapsLoading ? (
                                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-400" /></div>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-medium">
                                        <tr>
                                            <th className="px-6 py-3">Bus No</th>
                                            <th className="px-6 py-3">Route</th>
                                            <th className="px-6 py-3">From</th>
                                            <th className="px-6 py-3">To</th>
                                            <th className="px-6 py-3">Worker</th>
                                            <th className="px-6 py-3">Timestamp</th>
                                            <th className="px-6 py-3">Fare</th>
                                            <th className="px-6 py-3 text-right">Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {processedData.rows.length === 0 ? (
                                            <tr><td colSpan={8} className="text-center py-8 text-slate-400">No tickets found matching filters.</td></tr>
                                        ) : (
                                            processedData.rows.map(t => {
                                                const fare = Number(t.meta?.fare || 0);
                                                const subsidy = Number(t.meta?.govt_subsidy || 0);
                                                const isFree = t.meta?.is_free;

                                                // Fare Display Logic
                                                let fareDisplay;

                                                if (isFree) {
                                                    fareDisplay = (
                                                        <div className="flex flex-col text-xs">
                                                            <span className="text-green-600 font-bold">User: Free</span>
                                                            <span className="text-slate-500">Govt: ₹{subsidy}</span>
                                                        </div>
                                                    );
                                                } else if (subsidy > 0) {
                                                    fareDisplay = (
                                                        <div className="flex flex-col text-xs">
                                                            <span className="font-bold">User: ₹{fare}</span>
                                                            <span className="text-orange-600">Govt: ₹{subsidy}</span>
                                                        </div>
                                                    );
                                                } else {
                                                    fareDisplay = (
                                                        <div className="flex flex-col text-xs">
                                                            <span className="font-bold">User: ₹{fare}</span>
                                                            <span className="text-slate-400">Govt: ₹0</span>
                                                        </div>
                                                    );
                                                }

                                                // Badge Logic
                                                let badge = <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">Paid</Badge>;
                                                const remarks = t.meta?.remarks || "";

                                                if (remarks.includes("Old Age")) badge = <Badge className="bg-green-600 hover:bg-green-700 text-white border-0">Old Age</Badge>;
                                                else if (remarks.includes("Student") || remarks.includes("Concession")) badge = <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-0">Student/Emp</Badge>;
                                                else if (isFree) badge = <Badge className="bg-green-600 hover:bg-green-700 text-white border-0">{remarks || "Govt Scheme"}</Badge>;

                                                return (
                                                    <tr key={t.id} className="hover:bg-slate-50 transition-colors bg-white">
                                                        <td className="px-6 py-4 font-mono text-xs text-slate-600">{t.meta?.bus_no || "AP07-1234"}</td>
                                                        <td className="px-6 py-4">{t.meta?.route || "—"}</td>
                                                        <td className="px-6 py-4">{t.meta?.from || "—"}</td>
                                                        <td className="px-6 py-4">{t.meta?.to || "—"}</td>
                                                        <td className="px-6 py-4 text-slate-700">{t.meta?.worker_name || "—"}</td>
                                                        <td className="px-6 py-4 text-slate-500 text-xs">{format(new Date(t.occurred_at), "dd/MM/yyyy, hh:mm a")}</td>
                                                        <td className="px-6 py-4">{fareDisplay}</td>
                                                        <td className="px-6 py-4 text-right">{badge}</td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

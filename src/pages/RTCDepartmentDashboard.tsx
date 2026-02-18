import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Ticket, Bus, Landmark, Calendar, Search, Download, RefreshCw, Filter, ExternalLink } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { format } from "date-fns";

// --- Types ---
interface TicketData {
    id: string;
    establishment_id: string;
    fare: number;
    govt_subsidy_amount: number;
    issued_at: string;
    is_free: boolean;
    remarks: string; // Scheme Name
    route_name: string;
    bus_number: string; // Added Bus Number
    workers: {
        first_name: string;
        last_name: string;
        worker_id: string; // Citigen ID
    } | null;
}

interface EstablishmentData {
    id: string;
    name: string;
    code: string;
    district: string;
}

// --- Fetch Functions ---

async function fetchDashboardData() {
    // 1. Fetch ALL Tickets (Optimized: select only needed fields + worker details)
    const { data: tickets, error: tErr } = await supabase
        .from("tickets" as any)
        .select("id, establishment_id, fare, govt_subsidy_amount, issued_at, is_free, remarks, route_name, bus_number, workers(first_name, last_name, worker_id)");

    if (tErr) throw tErr;

    // 2. Fetch Depots
    const { data: establishments, error: eErr } = await supabase
        .from("establishments")
        .select("id, name, code, district")
        .eq("establishment_type", "Depot");

    if (eErr) throw eErr;

    return {
        tickets: tickets as unknown as TicketData[],
        depots: establishments as EstablishmentData[]
    };
}

// --- Helpers ---
const TELUGU_NAMES = [
    "Srinivas Rao", "Lakshmi Narayana", "Venkateswara Rao", "Subba Rao",
    "Appa Rao", "Krishna Murthy", "Rama Rao", "Nageswara Rao",
    "Satyanarayana", "Siva Prasad", "Ravi Kumar", "Koteswara Rao",
    "Durga Rao", "Samba Siva", "Pulla Rao", "Venkata Ramana",
    "Chandra Sekhar", "Narasimha Rao", "Surya Narayana", "Ramakrishna"
];

const getRandomName = (id: string) => {
    // Deterministic random based on ID char code sum
    const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return TELUGU_NAMES[sum % TELUGU_NAMES.length];
};

const formatCitigenId = (ticketId: string, index: number) => {
    // Mock format: AP-C-YYYY-XXXXXXX
    // Using a deterministic sequence
    const year = "19" + (80 + (index % 20));
    const seq = String(index + 1).padStart(8, '0');
    return `AP-C-${year}-${seq}`;
};


export default function RTCDepartmentDashboard() {
    const { signOut } = useAuth();
    const [districtFilter, setDistrictFilter] = useState("all");
    const [depotFilter, setDepotFilter] = useState("all");
    const [schemeFilter, setSchemeFilter] = useState("all");

    // State for Drill-Down View Dialog
    const [selectedDepotId, setSelectedDepotId] = useState<string | null>(null);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["rtc-dashboard-data"],
        queryFn: fetchDashboardData
    });

    // --- Derived Data using Filters ---
    const processedData = useMemo(() => {
        if (!data) return null;

        let filteredTickets = data.tickets;

        // 1. Filter by District (Implicitly filters depots first)
        const relevantDepotIds = new Set(
            data.depots
                .filter(d => districtFilter === "all" || d.district === districtFilter)
                .map(d => d.id)
        );

        filteredTickets = filteredTickets.filter(t => relevantDepotIds.has(t.establishment_id));

        // 2. Filter by Depot
        if (depotFilter !== "all") {
            filteredTickets = filteredTickets.filter(t => t.establishment_id === depotFilter);
        }

        // 3. Filter by Scheme
        if (schemeFilter !== "all") {
            if (schemeFilter === "Paid") {
                filteredTickets = filteredTickets.filter(t => !t.is_free);
            } else {
                filteredTickets = filteredTickets.filter(t => t.remarks === schemeFilter);
            }
        }

        // --- Aggregations on Filtered Data ---

        // Global Stats
        const totalTickets = filteredTickets.length;
        const today = new Date().toISOString().split('T')[0];
        const todayTickets = filteredTickets.filter(t => t.issued_at.startsWith(today)).length;
        const totalRevenue = filteredTickets.reduce((sum, t) => sum + (t.fare || 0), 0);
        const totalSubsidy = filteredTickets.reduce((sum, t) => sum + (t.govt_subsidy_amount || 0), 0);
        const freeTicketsCount = filteredTickets.filter(t => t.is_free).length;

        // Depot Stats (Only for visible depots)
        // Note: If 'depotFilter' is active, this array will effectively have 1 item or 0
        const visibleDepots = data.depots.filter(d => {
            if (districtFilter !== "all" && d.district !== districtFilter) return false;
            if (depotFilter !== "all" && d.id !== depotFilter) return false;
            return true;
        });

        const depotStats = visibleDepots.map(depot => {
            const depotTickets = filteredTickets.filter(t => t.establishment_id === depot.id);
            return {
                ...depot,
                tickets: depotTickets.length,
                freeTickets: depotTickets.filter(t => t.is_free).length,
                revenue: depotTickets.reduce((sum, t) => sum + (t.fare || 0), 0),
                subsidy: depotTickets.reduce((sum, t) => sum + (t.govt_subsidy_amount || 0), 0)
            };
        });

        // Scheme Stats
        const schemeCounts: Record<string, number> = {};
        filteredTickets.forEach(t => {
            const scheme = t.is_free ? (t.remarks || 'Unknown Scheme') : 'Paid';
            schemeCounts[scheme] = (schemeCounts[scheme] || 0) + 1;
        });
        const schemeStats = Object.keys(schemeCounts).map((key, index) => ({
            name: key,
            value: schemeCounts[key],
            // Use Orange/Green/Earth tones instead of Blues
            color: ['#F97316', '#22C55E', '#EAB308', '#EF4444', '#8B5CF6', '#64748B'][index % 6]
        }));

        // Route Stats
        const routeCounts: Record<string, { tickets: number, free: number, paid: number, revenue: number, subsidy: number }> = {};
        filteredTickets.forEach(t => {
            const route = t.route_name || 'Unknown';
            if (!routeCounts[route]) routeCounts[route] = { tickets: 0, free: 0, paid: 0, revenue: 0, subsidy: 0 };

            routeCounts[route].tickets++;
            if (t.is_free) routeCounts[route].free++;
            else routeCounts[route].paid++;
            routeCounts[route].revenue += (t.fare || 0);
            routeCounts[route].subsidy += (t.govt_subsidy_amount || 0);
        });
        const routeStats = Object.keys(routeCounts).map(key => ({
            name: key,
            ...routeCounts[key]
        }));


        return {
            stats: { totalTickets, todayTickets, totalRevenue, totalSubsidy, freeTicketsCount },
            depots: depotStats,
            schemes: schemeStats,
            routes: routeStats
        };

    }, [data, districtFilter, depotFilter, schemeFilter]);


    // Options for Filters
    const uniqueDistricts = useMemo(() => {
        if (!data?.depots) return [];
        return Array.from(new Set(data.depots.map(d => d.district)));
    }, [data?.depots]);

    const availableDepots = useMemo(() => {
        if (!data?.depots) return [];
        return data.depots.filter(d => districtFilter === "all" || d.district === districtFilter);
    }, [data?.depots, districtFilter]);

    const availableSchemes = useMemo(() => {
        if (!data?.tickets) return [];
        const schemes = new Set<string>();
        schemes.add("Paid");
        data.tickets.forEach(t => {
            if (t.is_free && t.remarks) schemes.add(t.remarks);
        });
        return Array.from(schemes);
    }, [data?.tickets]);


    const selectedDepotDetails = useMemo(() => {
        if (!selectedDepotId || !data) return null;
        const depot = data.depots.find(d => d.id === selectedDepotId);
        const tickets = data.tickets.filter(t => t.establishment_id === selectedDepotId)
            // Sort by latest
            .sort((a, b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime())
            .slice(0, 50); // Limit to last 50 for view

        return { depot, tickets };
    }, [selectedDepotId, data]);


    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-orange-600" /></div>
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-8">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-20 shadow-sm border-t-4 border-t-orange-600">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Use a placeholder or reliable URL for the logo if local file missing */}
                        <img src="/opoc/ap-logo.png" alt="AP Govt" className="w-12 h-12 object-contain" />
                        <div className="flex flex-col">
                            <span className="text-2xl font-black text-orange-700 leading-none tracking-tight">APSRTC COMMAND CONTROL</span>
                            <span className="text-xs text-slate-500 font-bold tracking-widest mt-1">GOVERNMENT OF ANDHRA PRADESH</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <div className="text-sm font-bold text-slate-700">Administrator</div>
                            <div className="text-xs text-slate-500">apsrtc@gmail.com</div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={signOut} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                            <RefreshCw className="w-4 h-4 mr-2" /> Log Out
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6 space-y-6">

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-l-4 border-l-orange-500 shadow-sm">
                        <CardContent className="p-4 flex flex-col gap-1">
                            <span className="text-sm font-medium text-slate-500">Total Tickets (State)</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-slate-800">{processedData?.stats.totalTickets || 0}</span>
                                <Ticket className="w-4 h-4 text-slate-400" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-green-500 shadow-sm">
                        <CardContent className="p-4 flex flex-col gap-1">
                            <span className="text-sm font-medium text-slate-500">Free Scheme Usage</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-slate-800">{processedData?.stats.freeTicketsCount || 0}</span>
                                <span className="text-sm text-green-600 font-medium">(Govt: ₹{processedData?.stats.totalSubsidy || 0})</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-slate-500 shadow-sm">
                        <CardContent className="p-4 flex flex-col gap-1">
                            <span className="text-sm font-medium text-slate-500">Total Revenue</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-slate-800">₹{processedData?.stats.totalRevenue || 0}</span>
                                <Landmark className="w-4 h-4 text-slate-400" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="p-4 shadow-sm">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="flex items-center gap-2 text-slate-500">
                            <Filter className="w-4 h-4" />
                            <span className="font-medium text-sm">Filters</span>
                        </div>

                        {/* District Filter */}
                        <Select value={districtFilter} onValueChange={(val) => { setDistrictFilter(val); setDepotFilter("all"); }}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Districts" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Districts</SelectItem>
                                {uniqueDistricts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        {/* Depot Filter */}
                        <Select value={depotFilter} onValueChange={setDepotFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Depots" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Depots</SelectItem>
                                {availableDepots.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        {/* Scheme Filter */}
                        <Select value={schemeFilter} onValueChange={setSchemeFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Schemes" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Schemes</SelectItem>
                                {availableSchemes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <div className="ml-auto flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-2" /> Refresh</Button>
                        </div>
                    </div>
                </Card>

                {/* Main Content Tabs */}
                <Tabs defaultValue="depots" className="space-y-4">
                    <TabsList className="bg-white border w-full justify-start h-12 p-1">
                        <TabsTrigger value="depots" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 border-0 h-full px-6 transition-all rounded-none">Depots</TabsTrigger>
                        <TabsTrigger value="drilldown" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 border-0 h-full px-6 transition-all rounded-none">Drill-Down</TabsTrigger>
                        <TabsTrigger value="schemes" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 border-0 h-full px-6 transition-all rounded-none">Schemes</TabsTrigger>
                        <TabsTrigger value="routes" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 border-0 h-full px-6 transition-all rounded-none">Routes</TabsTrigger>
                    </TabsList>

                    {/* Depots Grid Tab */}
                    <TabsContent value="depots">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {processedData?.depots.map(depot => (
                                <Card key={depot.id} className="hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <div className="flex gap-2 items-center">
                                                <Bus className="w-5 h-5 text-slate-400" />
                                                <div className="flex flex-col">
                                                    <CardTitle className="text-base font-semibold text-slate-800">{depot.name}</CardTitle>
                                                    <span className="text-xs text-slate-500">{depot.district} District</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                                            <div className="flex flex-col">
                                                <span className="text-lg font-bold text-slate-800">{depot.tickets}</span>
                                                <span className="text-[10px] text-slate-500 uppercase font-medium">Tickets</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-lg font-bold text-green-600">{depot.freeTickets}</span>
                                                <span className="text-[10px] text-slate-500 uppercase font-medium">Free</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-lg font-bold text-orange-600">₹{depot.revenue}</span>
                                                <span className="text-[10px] text-slate-500 uppercase font-medium">Revenue</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {processedData?.depots.length === 0 && (
                                <div className="col-span-3 text-center p-8 text-slate-500">No depots match the selected filters.</div>
                            )}
                        </div>
                    </TabsContent>

                    {/* Drill-Down Table Tab */}
                    <TabsContent value="drilldown">
                        <Card>
                            <CardHeader><CardTitle className="text-base">Depot Performance Drill-Down</CardTitle></CardHeader>
                            <CardContent>
                                <div className="rounded-md border">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 border-b">
                                            <tr>
                                                <th className="h-10 px-4 text-left font-medium text-slate-500">Name</th>
                                                <th className="h-10 px-4 text-left font-medium text-slate-500">Tickets</th>
                                                <th className="h-10 px-4 text-left font-medium text-slate-500">Free</th>
                                                <th className="h-10 px-4 text-left font-medium text-slate-500">Govt Paid (Est)</th>
                                                <th className="h-10 px-4 text-left font-medium text-slate-500">Revenue</th>
                                                <th className="h-10 px-4 text-right font-medium text-slate-500">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {processedData?.depots.map(depot => (
                                                <tr key={depot.id} className="border-b hover:bg-slate-50/50">
                                                    <td className="p-4 font-medium">{depot.name}</td>
                                                    <td className="p-4">{depot.tickets}</td>
                                                    <td className="p-4 text-green-600">{depot.freeTickets}</td>
                                                    <td className="p-4">₹{depot.subsidy}</td>
                                                    <td className="p-4 font-medium">₹{depot.revenue}</td>
                                                    <td className="p-4 text-right">
                                                        <span
                                                            className="text-orange-600 hover:underline cursor-pointer flex items-center justify-end gap-1"
                                                            onClick={() => setSelectedDepotId(depot.id)}
                                                        >
                                                            View <ExternalLink className="w-3 h-3" />
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Schemes Tab */}
                    <TabsContent value="schemes">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader><CardTitle className="text-base">Scheme Distribution (Tickets)</CardTitle></CardHeader>
                                <CardContent className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={processedData?.schemes}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                outerRadius={100}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {processedData?.schemes.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle className="text-base">Scheme Breakdown</CardTitle></CardHeader>
                                <CardContent className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={processedData?.schemes}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                            <Tooltip cursor={{ fill: 'transparent' }} />
                                            <Bar dataKey="value" fill="#F97316" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Routes Tab */}
                    <TabsContent value="routes">
                        <Card className="mb-6">
                            <CardHeader><CardTitle className="text-base">Route-Wise Analysis</CardTitle></CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={processedData?.routes}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip cursor={{ fill: 'transparent' }} />
                                        <Legend />
                                        <Bar dataKey="tickets" name="Total Tickets" fill="#F97316" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="free" name="Free Tickets" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-0">
                                <div className="rounded-md border-t">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 border-b">
                                            <tr>
                                                <th className="h-10 px-6 text-left font-medium text-slate-500">Route</th>
                                                <th className="h-10 px-6 text-left font-medium text-slate-500">Total</th>
                                                <th className="h-10 px-6 text-left font-medium text-slate-500">Free</th>
                                                <th className="h-10 px-6 text-left font-medium text-slate-500">Paid</th>
                                                <th className="h-10 px-6 text-left font-medium text-slate-500">Revenue</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {processedData?.routes.map((route, i) => (
                                                <tr key={i} className="border-b hover:bg-slate-50/50">
                                                    <td className="p-6 font-medium">{route.name}</td>
                                                    <td className="p-6">{route.tickets}</td>
                                                    <td className="p-6 text-green-600">{route.free}</td>
                                                    <td className="p-6">{route.paid}</td>
                                                    <td className="p-6 font-medium">₹{route.revenue}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Drill-Down Details Dialog */}
                <Dialog open={!!selectedDepotId} onOpenChange={(open) => !open && setSelectedDepotId(null)}>
                    <DialogContent className="max-w-[700px] md:max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>{selectedDepotDetails?.depot?.name} - Recent Tickets</DialogTitle>
                            <DialogDescription>
                                Showing last 50 transactions for this depot.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[400px] overflow-y-auto border rounded-md">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 sticky top-0">
                                    <tr>
                                        <th className="p-3 font-medium">Bus Number</th>
                                        <th className="p-3 font-medium">Route</th>
                                        <th className="p-3 font-medium">Citigen ID</th>
                                        <th className="p-3 font-medium">Name</th>
                                        <th className="p-3 font-medium">Type</th>
                                        <th className="p-3 font-medium">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedDepotDetails?.tickets.map((t, index) => (
                                        <tr key={t.id} className="border-b">
                                            <td className="p-3 font-mono text-xs">{t.bus_number || 'AP39Z-001'}</td>
                                            <td className="p-3">{t.route_name}</td>
                                            <td className="p-3 font-mono text-xs">{formatCitigenId(t.establishment_id, index)}</td>
                                            <td className="p-3">{t.workers ? `${t.workers.first_name} ${t.workers.last_name}` : getRandomName(t.id)}</td>
                                            <td className="p-3">
                                                {t.is_free ? (
                                                    <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">{t.remarks}</span>
                                                ) : (
                                                    <span className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full">Paid</span>
                                                )}
                                            </td>
                                            <td className="p-3 font-medium">
                                                {t.is_free ? `₹${t.govt_subsidy_amount} (Sub)` : `₹${t.fare}`}
                                            </td>
                                        </tr>
                                    ))}
                                    {selectedDepotDetails?.tickets.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-slate-500">No tickets found for this depot.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </DialogContent>
                </Dialog>

            </main>
        </div>
    );
}

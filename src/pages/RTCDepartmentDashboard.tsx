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

    // 2. Fetch TG Depots only (cast via unknown to avoid Supabase generic depth errors)
    const estRes = await (supabase as any)
        .from("establishments")
        .select("id, name, code, district")
        .eq("establishment_type", "Depot")
        .eq("state_tag", "TG");

    if (estRes.error) throw estRes.error;

    return {
        tickets: tickets as unknown as TicketData[],
        depots: (estRes.data ?? []) as EstablishmentData[]
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
    // Mock format: TG-C-YYYY-XXXXXXX
    const year = "19" + (80 + (index % 20));
    const seq = String(index + 1).padStart(8, '0');
    return `TG-C-${year}-${seq}`;
};

// --- Static Depot Data ---
const TG_STATIC_DEPOTS = [
    { id: "tg-d1", name: "Hyderabad Central Depot", code: "HYD-C", district: "Hyderabad", tickets: 4823, freeTickets: 2341, revenue: 96460, subsidy: 70230 },
    { id: "tg-d2", name: "Warangal Depot",          code: "WGL-1", district: "Warangal",  tickets: 2176, freeTickets:  987, revenue: 43520, subsidy: 29610 },
    { id: "tg-d3", name: "Karimnagar Depot",         code: "KMR-1", district: "Karimnagar", tickets: 1654, freeTickets:  712, revenue: 33080, subsidy: 21360 },
    { id: "tg-d4", name: "Nizamabad Depot",          code: "NZB-1", district: "Nizamabad",  tickets: 1389, freeTickets:  603, revenue: 27780, subsidy: 18090 },
];

const AP_STATIC_DEPOTS = [
    { id: "ap-d1", name: "Vijayawada Depot",      code: "VJA-1", district: "Krishna",        tickets: 5240, freeTickets: 2810, revenue: 104800, subsidy: 84300 },
    { id: "ap-d2", name: "Visakhapatnam Depot",   code: "VSK-1", district: "Visakhapatnam",  tickets: 4610, freeTickets: 2430, revenue:  92200, subsidy: 72900 },
    { id: "ap-d3", name: "Guntur Depot",           code: "GNT-1", district: "Guntur",         tickets: 3870, freeTickets: 1960, revenue:  77400, subsidy: 58800 },
    { id: "ap-d4", name: "Tirupati Depot",         code: "TPT-1", district: "Chittoor",       tickets: 3120, freeTickets: 1540, revenue:  62400, subsidy: 46200 },
];

// --- Static Scheme & Route Data ---
const STATIC_SCHEMES = [
    { name: "Mahalakshmi",        value: 5890, color: "#F97316" },
    { name: "Old Age",            value: 4210, color: "#22C55E" },
    { name: "Student Concession", value: 3283, color: "#EAB308" },
    { name: "Paid",               value: 13499, color: "#64748B" },
];

const STATIC_ROUTES = [
    { name: "HYD → WGL", tickets: 2340, free: 1120, paid: 1220, revenue: 36600, subsidy: 33600 },
    { name: "HYD → KMR", tickets: 1980, free:  890, paid: 1090, revenue: 32670, subsidy: 26700 },
    { name: "WGL → NZB", tickets: 1560, free:  712, paid:  848, revenue: 25440, subsidy: 21360 },
    { name: "NZB → HYD", tickets:  882, free:  361, paid:  521, revenue: 15630, subsidy: 10830 },
    { name: "VJA → GNT", tickets: 2890, free: 1380, paid: 1510, revenue: 45300, subsidy: 41400 },
    { name: "VJA → VSK", tickets: 2560, free: 1190, paid: 1370, revenue: 41100, subsidy: 35700 },
    { name: "GNT → TPT", tickets: 1970, free:  920, paid: 1050, revenue: 31500, subsidy: 27600 },
    { name: "VSK → VJA", tickets: 1840, free:  860, paid:  980, revenue: 29400, subsidy: 25800 },
    { name: "TPT → GNT", tickets: 1740, free:  720, paid: 1020, revenue: 30600, subsidy: 21600 },
];

// --- Mock ticket generator for static depots ---
const MOCK_ROUTES: Record<string, string[]> = {
    TG: ["HYD → WGL", "HYD → KMR", "WGL → NZB", "KMR → HYD", "NZB → HYD"],
    AP: ["VJA → GNT", "VJA → VSK", "GNT → TPT", "VSK → VJA", "TPT → GNT"],
};
const SCHEMES = ["Mahalakshmi", "Old Age", "Student Concession", "Paid"];
function generateStaticTickets(depotId: string, count = 25) {
    const isAP = depotId.startsWith("ap-");
    const routes = isAP ? MOCK_ROUTES.AP : MOCK_ROUTES.TG;
    const stateCode = isAP ? "AP" : "TS";
    return Array.from({ length: count }, (_, i) => {
        const isFree = i % 3 === 0;
        const scheme = isFree ? SCHEMES[i % 3] : "Paid";
        const fare = isFree ? 0 : [25, 30, 45, 60, 75][i % 5];
        const subsidy = isFree ? [25, 30, 45][i % 3] : 0;
        return {
            id: `${depotId}-t${i}`,
            busNo: `${stateCode}${String(10 + (i % 8)).padStart(2, "0")}Z-${String(1000 + i * 7)}`,
            route: routes[i % routes.length],
            workerName: TELUGU_NAMES[i % TELUGU_NAMES.length],
            citigenId: `${isAP ? "AP" : "TG"}-C-${1980 + (i % 20)}-${String(i + 1).padStart(8, "0")}`,
            isFree, scheme, fare, subsidy,
        };
    });
}

// Normalise scheme names from DB to display names
const normaliseScheme = (name: string) => {
    if (!name) return name;
    if (name.toLowerCase().includes('mahila shakti')) return 'Mahalakshmi';
    return name;
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
                        <div className="h-14 w-14 flex items-center justify-center flex-shrink-0 border border-orange-200 rounded">
                            <img src="/Emblem_of_India.png" alt="Emblem of India" className="w-12 h-12 object-contain" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-2xl font-black text-orange-700 leading-none tracking-tight">GOI TRANSPORT COMMAND</span>
                            <span className="text-xs text-slate-500 font-bold tracking-widest mt-1">Government of India</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <div className="text-sm font-bold text-slate-700">Administrator</div>
                            <div className="text-xs text-slate-500">transport@gov.in</div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={signOut} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                            <RefreshCw className="w-4 h-4 mr-2" /> Log Out
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6 space-y-6">

                {/* KPI Cards */}
                {(() => {
                    const allStatic = [...TG_STATIC_DEPOTS, ...AP_STATIC_DEPOTS];
                    const s = allStatic.reduce((acc, d) => ({ tickets: acc.tickets + d.tickets, free: acc.free + d.freeTickets, revenue: acc.revenue + d.revenue, subsidy: acc.subsidy + d.subsidy }), { tickets: 0, free: 0, revenue: 0, subsidy: 0 });
                    const totalTickets = s.tickets + (processedData?.stats.totalTickets || 0);
                    const totalFree = s.free + (processedData?.stats.freeTicketsCount || 0);
                    const totalRevenue = s.revenue + (processedData?.stats.totalRevenue || 0);
                    const totalSubsidy = s.subsidy + (processedData?.stats.totalSubsidy || 0);
                    return (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="border-l-4 border-l-orange-500 shadow-sm">
                                <CardContent className="p-4 flex flex-col gap-1">
                                    <span className="text-sm font-medium text-slate-500">Total Tickets (All Depots)</span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-bold text-slate-800">{totalTickets.toLocaleString()}</span>
                                        <Ticket className="w-4 h-4 text-slate-400" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-l-4 border-l-green-500 shadow-sm">
                                <CardContent className="p-4 flex flex-col gap-1">
                                    <span className="text-sm font-medium text-slate-500">Free Scheme Usage</span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-bold text-slate-800">{totalFree.toLocaleString()}</span>
                                        <span className="text-sm text-green-600 font-medium">(Govt: ₹{(totalSubsidy / 1000).toFixed(0)}K)</span>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-l-4 border-l-slate-500 shadow-sm">
                                <CardContent className="p-4 flex flex-col gap-1">
                                    <span className="text-sm font-medium text-slate-500">Total Revenue</span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-bold text-slate-800">₹{(totalRevenue / 1000).toFixed(0)}K</span>
                                        <Landmark className="w-4 h-4 text-slate-400" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    );
                })()}

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
                                {availableSchemes.map(s => <SelectItem key={s} value={s}>{normaliseScheme(s)}</SelectItem>)}
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
                        <p className="text-xs text-slate-400 mb-3">Double-click a depot card to view its tickets.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[...TG_STATIC_DEPOTS, ...AP_STATIC_DEPOTS].map(depot => {
                                const isAP = depot.id.startsWith("ap-");
                                return (
                                    <Card key={depot.id} onDoubleClick={() => setSelectedDepotId(depot.id)} className={`hover:shadow-md transition-shadow border-t-4 cursor-pointer select-none ${isAP ? "border-t-blue-400" : "border-t-orange-400"}`}>
                                        <CardHeader className="pb-2">
                                            <div className="flex gap-2 items-center justify-between">
                                                <div className="flex gap-2 items-center">
                                                    <Bus className={`w-5 h-5 ${isAP ? "text-blue-400" : "text-orange-400"}`} />
                                                    <div className="flex flex-col">
                                                        <CardTitle className="text-sm font-semibold text-slate-800">{depot.name}</CardTitle>
                                                        <span className="text-xs text-slate-500">{depot.district}</span>
                                                    </div>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isAP ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>{isAP ? "AP" : "TG"}</span>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-3 gap-2 mt-1 text-center">
                                                <div className="flex flex-col">
                                                    <span className="text-base font-bold text-slate-800">{depot.tickets.toLocaleString()}</span>
                                                    <span className="text-[10px] text-slate-500 uppercase font-medium">Tickets</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-base font-bold text-green-600">{depot.freeTickets.toLocaleString()}</span>
                                                    <span className="text-[10px] text-slate-500 uppercase font-medium">Free</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`text-base font-bold ${isAP ? "text-blue-600" : "text-orange-600"}`}>₹{(depot.revenue / 1000).toFixed(0)}K</span>
                                                    <span className="text-[10px] text-slate-500 uppercase font-medium">Revenue</span>
                                                </div>
                                            </div>
                                            <div className="mt-2 pt-2 border-t flex justify-between text-[10px] text-slate-400">
                                                <span>Subsidy: <span className="text-green-600 font-medium">₹{(depot.subsidy / 1000).toFixed(0)}K</span></span>
                                                <span>Paid: <span className="font-medium text-slate-600">{(depot.tickets - depot.freeTickets).toLocaleString()}</span></span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                            {/* Live DB depots */}
                            {processedData?.depots.map(depot => (
                                <Card key={depot.id} onDoubleClick={() => setSelectedDepotId(depot.id)} className="hover:shadow-md transition-shadow border-t-4 border-t-orange-400 cursor-pointer select-none">
                                    <CardHeader className="pb-2">
                                        <div className="flex gap-2 items-center justify-between">
                                            <div className="flex gap-2 items-center">
                                                <Bus className="w-5 h-5 text-orange-400" />
                                                <div className="flex flex-col">
                                                    <CardTitle className="text-sm font-semibold text-slate-800">{depot.name}</CardTitle>
                                                    <span className="text-xs text-slate-500">{depot.district}</span>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">TG</span>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-3 gap-2 mt-1 text-center">
                                            <div className="flex flex-col">
                                                <span className="text-base font-bold text-slate-800">{depot.tickets}</span>
                                                <span className="text-[10px] text-slate-500 uppercase font-medium">Tickets</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-base font-bold text-green-600">{depot.freeTickets}</span>
                                                <span className="text-[10px] text-slate-500 uppercase font-medium">Free</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-base font-bold text-orange-600">₹{depot.revenue}</span>
                                                <span className="text-[10px] text-slate-500 uppercase font-medium">Revenue</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
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
                                                <th className="h-10 px-4 text-left font-medium text-slate-500">State</th>
                                                <th className="h-10 px-4 text-left font-medium text-slate-500">Name</th>
                                                <th className="h-10 px-4 text-left font-medium text-slate-500">District</th>
                                                <th className="h-10 px-4 text-left font-medium text-slate-500">Tickets</th>
                                                <th className="h-10 px-4 text-left font-medium text-slate-500">Free</th>
                                                <th className="h-10 px-4 text-left font-medium text-slate-500">Govt Subsidy</th>
                                                <th className="h-10 px-4 text-left font-medium text-slate-500">Revenue</th>
                                                <th className="h-10 px-4 text-right font-medium text-slate-500">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[...TG_STATIC_DEPOTS, ...AP_STATIC_DEPOTS].map(depot => {
                                                const isAP = depot.id.startsWith("ap-");
                                                return (
                                                    <tr key={depot.id} className="border-b hover:bg-slate-50/50">
                                                        <td className="p-4">
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isAP ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>{isAP ? "AP" : "TG"}</span>
                                                        </td>
                                                        <td className="p-4 font-medium">{depot.name}</td>
                                                        <td className="p-4 text-slate-500">{depot.district}</td>
                                                        <td className="p-4">{depot.tickets.toLocaleString()}</td>
                                                        <td className="p-4 text-green-600">{depot.freeTickets.toLocaleString()}</td>
                                                        <td className="p-4">₹{(depot.subsidy / 1000).toFixed(0)}K</td>
                                                        <td className="p-4 font-medium">₹{(depot.revenue / 1000).toFixed(0)}K</td>
                                                        <td className="p-4 text-right">
                                                            <span
                                                                className={`hover:underline cursor-pointer flex items-center justify-end gap-1 ${isAP ? "text-blue-600" : "text-orange-600"}`}
                                                                onClick={() => setSelectedDepotId(depot.id)}
                                                            >
                                                                View <ExternalLink className="w-3 h-3" />
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {processedData?.depots.map(depot => (
                                                <tr key={depot.id} className="border-b hover:bg-slate-50/50">
                                                    <td className="p-4">
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">TG</span>
                                                    </td>
                                                    <td className="p-4 font-medium">{depot.name}</td>
                                                    <td className="p-4 text-slate-500">{depot.district}</td>
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
                        {(() => {
                            // Merge static + DB scheme data
                            const merged = STATIC_SCHEMES.map(s => ({ ...s }));
                            processedData?.schemes.forEach(s => {
                                const ex = merged.find(m => m.name === s.name);
                                if (ex) ex.value += s.value;
                                else merged.push(s);
                            });
                            return (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Card>
                                        <CardHeader><CardTitle className="text-base">Scheme Distribution (Tickets)</CardTitle></CardHeader>
                                        <CardContent className="h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={merged} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={100} dataKey="value">
                                                        {merged.map((entry, index) => (
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
                                                <BarChart data={merged}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                                                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                                    <Tooltip cursor={{ fill: "transparent" }} />
                                                    <Bar dataKey="value" name="Tickets" radius={[4, 4, 0, 0]}>
                                                        {merged.map((entry, index) => (
                                                            <Cell key={`bar-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                    {/* Scheme summary table */}
                                    <Card className="md:col-span-2">
                                        <CardHeader><CardTitle className="text-base">Scheme Summary</CardTitle></CardHeader>
                                        <CardContent className="p-0">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 border-b">
                                                    <tr>
                                                        <th className="h-10 px-6 text-left font-medium text-slate-500">Scheme</th>
                                                        <th className="h-10 px-6 text-left font-medium text-slate-500">Tickets</th>
                                                        <th className="h-10 px-6 text-left font-medium text-slate-500">Share</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {merged.map((s, i) => {
                                                        const total = merged.reduce((sum, x) => sum + x.value, 0);
                                                        return (
                                                            <tr key={i} className="border-b hover:bg-slate-50/50">
                                                                <td className="px-6 py-3 flex items-center gap-2">
                                                                    <span className="w-3 h-3 rounded-full inline-block" style={{ background: s.color }} />
                                                                    {s.name}
                                                                </td>
                                                                <td className="px-6 py-3 font-medium">{s.value.toLocaleString()}</td>
                                                                <td className="px-6 py-3 text-slate-500">{((s.value / total) * 100).toFixed(1)}%</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </CardContent>
                                    </Card>
                                </div>
                            );
                        })()}
                    </TabsContent>

                    {/* Routes Tab */}
                    <TabsContent value="routes">
                        {(() => {
                            const allRoutes = [...STATIC_ROUTES, ...(processedData?.routes || [])];
                            return (
                                <>
                                    <Card className="mb-4">
                                        <CardHeader><CardTitle className="text-base">Route-Wise Analysis</CardTitle></CardHeader>
                                        <CardContent className="h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={allRoutes}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                                                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                                    <Tooltip cursor={{ fill: "transparent" }} />
                                                    <Legend />
                                                    <Bar dataKey="tickets" name="Total" fill="#F97316" radius={[4, 4, 0, 0]} />
                                                    <Bar dataKey="free"    name="Free"  fill="#22c55e" radius={[4, 4, 0, 0]} />
                                                    <Bar dataKey="paid"   name="Paid"  fill="#64748b" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-0">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 border-b">
                                                    <tr>
                                                        <th className="h-10 px-6 text-left font-medium text-slate-500">Route</th>
                                                        <th className="h-10 px-6 text-left font-medium text-slate-500">Total</th>
                                                        <th className="h-10 px-6 text-left font-medium text-slate-500">Free</th>
                                                        <th className="h-10 px-6 text-left font-medium text-slate-500">Paid</th>
                                                        <th className="h-10 px-6 text-left font-medium text-slate-500">Revenue</th>
                                                        <th className="h-10 px-6 text-left font-medium text-slate-500">Subsidy</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {allRoutes.map((route, i) => (
                                                        <tr key={i} className="border-b hover:bg-slate-50/50">
                                                            <td className="px-6 py-3 font-medium">{route.name}</td>
                                                            <td className="px-6 py-3">{route.tickets.toLocaleString()}</td>
                                                            <td className="px-6 py-3 text-green-600">{route.free.toLocaleString()}</td>
                                                            <td className="px-6 py-3">{route.paid.toLocaleString()}</td>
                                                            <td className="px-6 py-3 font-medium">₹{(route.revenue / 1000).toFixed(0)}K</td>
                                                            <td className="px-6 py-3 text-green-600">₹{(route.subsidy / 1000).toFixed(0)}K</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </CardContent>
                                    </Card>
                                </>
                            );
                        })()}
                    </TabsContent>
                </Tabs>

                {/* Drill-Down Details Dialog */}
                {(() => {
                    const isStatic = selectedDepotId?.startsWith("tg-") || selectedDepotId?.startsWith("ap-");
                    const staticDepot = isStatic ? [...TG_STATIC_DEPOTS, ...AP_STATIC_DEPOTS].find(d => d.id === selectedDepotId) : null;
                    const staticTickets = staticDepot ? generateStaticTickets(staticDepot.id) : [];
                    const dialogTitle = staticDepot?.name ?? selectedDepotDetails?.depot?.name ?? "";
                    return (
                        <Dialog open={!!selectedDepotId} onOpenChange={(open) => !open && setSelectedDepotId(null)}>
                            <DialogContent className="max-w-[700px] md:max-w-4xl">
                                <DialogHeader>
                                    <DialogTitle>{dialogTitle} — Ticket List</DialogTitle>
                                    <DialogDescription>Showing {isStatic ? staticTickets.length : (selectedDepotDetails?.tickets.length ?? 0)} tickets for this depot.</DialogDescription>
                                </DialogHeader>
                                <div className="max-h-[420px] overflow-y-auto border rounded-md">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 sticky top-0">
                                            <tr>
                                                <th className="p-3 font-medium">Bus No</th>
                                                <th className="p-3 font-medium">Route</th>
                                                <th className="p-3 font-medium">Citigen ID</th>
                                                <th className="p-3 font-medium">Name</th>
                                                <th className="p-3 font-medium">Type</th>
                                                <th className="p-3 font-medium">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {isStatic ? (
                                                staticTickets.map(t => (
                                                    <tr key={t.id} className="border-b hover:bg-slate-50/50">
                                                        <td className="p-3 font-mono text-xs">{t.busNo}</td>
                                                        <td className="p-3">{t.route}</td>
                                                        <td className="p-3 font-mono text-xs">{t.citigenId}</td>
                                                        <td className="p-3">{t.workerName}</td>
                                                        <td className="p-3">
                                                            {t.isFree
                                                                ? <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">{t.scheme}</span>
                                                                : <span className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full">Paid</span>
                                                            }
                                                        </td>
                                                        <td className="p-3 font-medium">
                                                            {t.isFree ? `₹${t.subsidy} (Sub)` : `₹${t.fare}`}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                selectedDepotDetails?.tickets.map((t, index) => (
                                                    <tr key={t.id} className="border-b hover:bg-slate-50/50">
                                                        <td className="p-3 font-mono text-xs">{t.bus_number || 'GOV-INDIA-001'}</td>
                                                        <td className="p-3">{t.route_name}</td>
                                                        <td className="p-3 font-mono text-xs">{formatCitigenId(t.establishment_id, index)}</td>
                                                        <td className="p-3">{t.workers ? `${t.workers.first_name} ${t.workers.last_name}` : getRandomName(t.id)}</td>
                                                        <td className="p-3">
                                                            {t.is_free
                                                                ? <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">{normaliseScheme(t.remarks)}</span>
                                                                : <span className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full">Paid</span>
                                                            }
                                                        </td>
                                                        <td className="p-3 font-medium">
                                                            {t.is_free ? `₹${t.govt_subsidy_amount} (Sub)` : `₹${t.fare}`}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                            {!isStatic && selectedDepotDetails?.tickets.length === 0 && (
                                                <tr><td colSpan={6} className="p-8 text-center text-slate-500">No tickets found for this depot.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </DialogContent>
                        </Dialog>
                    );
                })()}

            </main>
        </div>
    );
}

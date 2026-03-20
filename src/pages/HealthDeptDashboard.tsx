import { useState, useMemo, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Activity, Building2, IndianRupee, Filter, RefreshCw, Stethoscope, HeartPulse, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Use local backend for development, deployed for production
const API = (import.meta.env.VITE_API_URL || "https://workerconnection-backend.vercel.app").replace(/\/$/, '') + "/api";

const SCHEME_COLORS: Record<string, string> = {
    "State Health Scheme": "#16a34a",
    "EHS": "#2563eb",
    "PMJAY": "#9333ea",
    "Paid": "#64748b",
};
const SERVICE_COLORS = ["#ea580c", "#2563eb", "#16a34a", "#9333ea", "#f59e0b"];

function money(n: number | string) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n));
}

async function fetchHealthStats() {
    const res = await fetch(`${API}/health/stats`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

// State-specific coordinates for disease mapping
const STATE_COORDS: Record<string, [number, number]> = {
    "AP": [15.9129, 79.7400],
    "TG": [17.3850, 78.4867],
    "UP": [26.8467, 80.9462],
    "MH": [19.7515, 75.7139],
};

// Comprehensive location coordinates for all states
const MANDAL_COORDS: Record<string, Record<string, [number, number]>> = {
    "TG": {
        "Hyderabad": [17.3850, 78.4867],
        "Secunderabad": [17.4399, 78.4983],
        "LB Nagar": [17.3436, 78.5536],
        "Kukatpally": [17.4849, 78.4138],
        "Uppal": [17.4057, 78.5594],
        "Warangal": [17.9784, 79.5941],
        "Karimnagar": [18.4386, 79.1288],
        "Nizamabad": [18.6725, 78.0941],
        "Khammam": [17.2473, 80.1514],
        "Nalgonda": [17.0575, 79.2671],
    },
    "AP": {
        "Visakhapatnam": [17.6869, 83.2185],
        "Vijayawada": [16.5062, 80.6480],
        "Guntur": [16.3067, 80.4365],
        "Kurnool": [15.8281, 78.8353],
        "Tirupati": [13.1939, 79.8941],
        "Kadapa": [14.4676, 78.7475],
        "Nellore": [14.4426, 79.9864],
        "Ongole": [15.5057, 80.0508],
        "Rajahmundry": [17.0011, 81.8050],
        "Tenali": [16.2392, 80.6479],
    },
    "UP": {
        "Lucknow": [26.8467, 80.9462],
        "Kanpur": [26.4499, 80.3308],
        "Varanasi": [25.3200, 82.9789],
        "Agra": [27.1767, 78.0081],
        "Allahabad": [25.4358, 81.8463],
        "Meerut": [28.9845, 77.7064],
        "Noida": [28.5355, 77.3910],
        "Ghaziabad": [28.6692, 77.4538],
        "Bareilly": [28.3670, 79.4304],
        "Aligarh": [27.8974, 78.0880],
    },
    "MH": {
        "Mumbai": [19.0760, 72.8777],
        "Pune": [18.5204, 73.8567],
        "Nagpur": [21.1458, 79.0882],
        "Thane": [19.2183, 72.9781],
        "Aurangabad": [19.8762, 75.3433],
        "Nashik": [19.9975, 73.7898],
        "Kolhapur": [16.7050, 73.7421],
        "Satara": [17.6726, 73.9187],
        "Akola": [20.7100, 77.0069],
        "Chandrapur": [19.9689, 79.2941],
    },
};

// State-specific disease hotspots
const STATE_DISEASE_HOTSPOTS: Record<string, { area: string; disease: string; color: string }[]> = {
    "TG": [
        { area: "Hyderabad", disease: "Dengue Fever", color: "#dc2626" },
        { area: "Warangal", disease: "Hepatitis B", color: "#ea580c" },
        { area: "Nizamabad", disease: "Malaria", color: "#dc2626" },
        { area: "Karimnagar", disease: "Tuberculosis (TB)", color: "#b91c1c" },
    ],
    "AP": [
        { area: "Visakhapatnam", disease: "Dengue Fever", color: "#dc2626" },
        { area: "Vijayawada", disease: "Typhoid", color: "#ea580c" },
        { area: "Guntur", disease: "Malaria", color: "#dc2626" },
        { area: "Tirupati", disease: "Respiratory Infection", color: "#f59e0b" },
    ],
    "UP": [
        { area: "Lucknow", disease: "Dengue Fever", color: "#dc2626" },
        { area: "Kanpur", disease: "Hepatitis A", color: "#ea580c" },
        { area: "Varanasi", disease: "Typhoid", color: "#dc2626" },
        { area: "Agra", disease: "Malaria", color: "#f59e0b" },
    ],
    "MH": [
        { area: "Mumbai", disease: "Dengue Fever", color: "#dc2626" },
        { area: "Pune", disease: "Respiratory Infection", color: "#ea580c" },
        { area: "Nagpur", disease: "Malaria", color: "#dc2626" },
        { area: "Nashik", disease: "Hepatitis B", color: "#b91c1c" },
    ],
};

// Seeded random for stable positions
function seededRandom(seed: number) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

function jitter(base: [number, number], spread: number, seed: number): [number, number] {
    return [
        base[0] + (seededRandom(seed) - 0.5) * spread,
        base[1] + (seededRandom(seed + 1) - 0.5) * spread,
    ];
}

// --- Static demo alert data with realistic names & serious diseases ---
const AP_NAMES_MALE = [
    "Ravi Kumar", "Srinivas Goud", "Mahesh Reddy", "Ramesh Yadav", "Venkat Rao",
    "Kiran Kumar", "Praveen Reddy", "Suresh Naik", "Anil Deshmukh", "Harish Goud",
    "Vijay Kumar", "Naresh Reddy", "Sanjay Rao", "Raju Goud", "Santosh Kumar",
    "Bhaskar Rao", "Mohan Reddy", "Karthik Reddy", "Ajay Kumar", "Sunil Rao",
    "Srinu Goud", "Ramana Rao", "Vamshi Krishna", "Chandra Reddy", "Gopal Rao",
];
const AP_NAMES_FEMALE = [
    "Lakshmi Bai", "Padmavathi Devi", "Saraswathi Rao", "Mamatha Reddy", "Aruna Goud",
    "Vijaya Lakshmi", "Sunita Naik", "Radha Devi", "Annapurna Goud", "Meena Kumari",
    "Kavitha Reddy", "Bharathi Rao", "Durga Devi", "Swapna Reddy", "Jyothi Goud",
    "Vasantha Devi", "Manjula Rao", "Saroja Devi", "Tulasi Reddy", "Ratna Kumari",
];

function generateAlertData(state: string) {
    const records: any[] = [];
    let id = 0;
    const stateDisease = STATE_DISEASE_HOTSPOTS[state] || STATE_DISEASE_HOTSPOTS["TG"];
    const stateMandals = MANDAL_COORDS[state] || MANDAL_COORDS["TG"];
    
    const stateNames: Record<string, string> = {
        "TG": "Telangana",
        "AP": "Andhra Pradesh",
        "UP": "Uttar Pradesh",
        "MH": "Maharashtra",
    };

    stateDisease.forEach(({ area, disease, color }, areaIdx) => {
        const base = stateMandals[area] || STATE_COORDS[state] || [17.3850, 78.4867];
        // 12 cases per area
        for (let i = 0; i < 12; i++) {
            const seed = areaIdx * 100 + i;
            const isMale = seededRandom(seed * 7) > 0.45;
            const names = isMale ? AP_NAMES_MALE : AP_NAMES_FEMALE;
            const fullName = names[Math.floor(seededRandom(seed * 3) * names.length)];
            const [firstName, ...rest] = fullName.split(" ");
            const lastName = rest.join(" ");
            const age = 18 + Math.floor(seededRandom(seed * 13) * 55);
            const coords = jitter(base, 0.04, seed * 17);

            records.push({
                id: id++,
                first_name: firstName,
                last_name: lastName,
                gender: isMale ? "Male" : "Female",
                age,
                diagnosis: disease,
                mandal: area,
                district: stateNames[state] || "Telangana",
                coords,
                color,
            });
        }
    });

    // Build hotspots — one per area
    const hotspots = stateDisease.map(({ area, disease }) => ({
        diagnosis: disease,
        mandal: area,
        district: stateNames[state] || "Telangana",
        case_count: records.filter(r => r.mandal === area).length,
    }));

    return { records, hotspots };
}

// Initialize with TG by default
let DEMO_ALERTS = generateAlertData("TG");

async function fetchHealthRecords(filters: Record<string, string>) {
    const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v && v !== "all"))
    );
    const res = await fetch(`${API}/health/records?${params}&limit=200`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export default function HealthDeptDashboard() {
    const { userContext, signOut } = useAuth();

    const [selectedState, setSelectedState] = useState("TG");
    const [districtFilter, setDistrictFilter] = useState("all");
    const [hospitalFilter, setHospitalFilter] = useState("all");
    const [schemeFilter, setSchemeFilter] = useState("all");
    const [serviceFilter, setServiceFilter] = useState("all");

    const { data: stats, isLoading: statsLoading, refetch } = useQuery({
        queryKey: ["health-stats"],
        queryFn: fetchHealthStats,
        retry: 2,
    });

    const { data: recordsData, isLoading: recordsLoading } = useQuery({
        queryKey: ["health-records", hospitalFilter, schemeFilter, serviceFilter],
        queryFn: () => fetchHealthRecords({
            establishment_id: hospitalFilter !== "all" ? hospitalFilter : "",
            scheme_name: schemeFilter !== "all" ? schemeFilter : "",
            service_type: serviceFilter !== "all" ? serviceFilter : "",
        }),
        retry: 2,
    });

    // Demo alert data — regenerate based on selected state
    const CURRENT_ALERTS = generateAlertData(selectedState);
    const alertMarkers = CURRENT_ALERTS.records;
    const alertHotspots = CURRENT_ALERTS.hotspots;

    // Map ref for programmatic zoom
    const mapRef = useRef<any>(null);

    const zoomToMandal = (mandal: string) => {
        const stateMandals = MANDAL_COORDS[selectedState] || MANDAL_COORDS["TG"];
        const coords = stateMandals[mandal];
        if (coords && mapRef.current) {
            mapRef.current.setView(coords, 14, { animate: true });
        }
    };

    const hospitals: any[] = stats?.hospitals || [];
    const totals = stats?.totals || {};
    const byScheme: any[] = stats?.byScheme || [];
    const byService: any[] = stats?.byService || [];
    const byDisease: any[] = stats?.byDisease || [];
    const byDistrict: any[] = stats?.byDistrict || [];
    const records: any[] = recordsData?.records || [];

    const filteredHospitals = useMemo(() =>
        districtFilter === "all" ? hospitals : hospitals.filter((h) => h.district === districtFilter),
        [hospitals, districtFilter]
    );

    const districts = useMemo(() => [...new Set(hospitals.map((h) => h.district))], [hospitals]);

    const isLoading = statsLoading;

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="animate-spin w-8 h-8 text-orange-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-8">

            {/* Header — same structure as APSRTC */}
            <header className="bg-white border-b sticky top-0 z-20 shadow-sm border-t-4 border-t-orange-600">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-14 w-14 flex items-center justify-center flex-shrink-0 border border-orange-200 rounded">
                            <img src="/indian-flag.svg" alt="India Flag" className="w-12 h-12 object-contain" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-2xl font-black text-orange-700 leading-none tracking-tight">
                                HEALTH COMMAND CONTROL
                            </span>
                            <span className="text-xs text-slate-500 font-bold tracking-widest mt-1">
                                Government of India — Health Management Portal
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <div className="text-sm font-bold text-slate-700">Administrator</div>
                            <div className="text-xs text-slate-500">{userContext?.email}</div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => signOut()}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" /> Log Out
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6 space-y-6">

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-l-4 border-l-orange-500 shadow-sm">
                        <CardContent className="p-4 flex flex-col gap-1">
                            <span className="text-sm font-medium text-slate-500">Total Records</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-slate-800">{totals.total_records || 0}</span>
                                <Activity className="w-4 h-4 text-slate-400" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-blue-500 shadow-sm">
                        <CardContent className="p-4 flex flex-col gap-1">
                            <span className="text-sm font-medium text-slate-500">Total Hospitals</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-slate-800">{hospitals.length}</span>
                                <Building2 className="w-4 h-4 text-slate-400" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-green-500 shadow-sm">
                        <CardContent className="p-4 flex flex-col gap-1">
                            <span className="text-sm font-medium text-slate-500">Unique Patients</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-slate-800">{totals.unique_patients || 0}</span>
                                <span className="text-sm text-green-600 font-medium">beneficiaries</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-slate-500 shadow-sm">
                        <CardContent className="p-4 flex flex-col gap-1">
                            <span className="text-sm font-medium text-slate-500">Govt Spend</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-slate-800">{money(totals.govt_paid || 0)}</span>
                                <IndianRupee className="w-4 h-4 text-slate-400" />
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
                        <Select value={districtFilter} onValueChange={(v) => { setDistrictFilter(v); }}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Districts" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Districts</SelectItem>
                                {districts.map((d: any) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={hospitalFilter} onValueChange={setHospitalFilter}>
                            <SelectTrigger className="w-[220px]">
                                <SelectValue placeholder="All Hospitals" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Hospitals</SelectItem>
                                {hospitals.map((h: any) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={schemeFilter} onValueChange={setSchemeFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Schemes" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Schemes</SelectItem>
                                {["State Health Scheme", "EHS", "PMJAY", "Paid"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={serviceFilter} onValueChange={setServiceFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Services" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Services</SelectItem>
                                {["Consultation", "Pharmacy", "Laboratory", "Surgery"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <div className="ml-auto flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => refetch()}>
                                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Main Tabs */}
                <Tabs defaultValue="hospitals" className="space-y-4">
                    <TabsList className="bg-white border w-full justify-start h-12 p-1">
                        {[
                            { value: "hospitals", label: "Hospitals" },
                            { value: "drilldown", label: "Drill-Down" },
                            { value: "schemes", label: "Schemes" },
                            { value: "services", label: "Services" },
                            { value: "diseases", label: "Diseases" },
                            { value: "alerts", label: `Alerts${alertHotspots.length > 0 ? ` (${alertHotspots.length})` : ""}` },
                        ].map(t => (
                            <TabsTrigger
                                key={t.value}
                                value={t.value}
                                className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 border-0 h-full px-6 transition-all rounded-none"
                            >
                                {t.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {/* Hospitals Grid */}
                    <TabsContent value="hospitals">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {filteredHospitals.map((h: any) => (
                                <Card key={h.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setHospitalFilter(h.id)}>
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <div className="flex gap-2 items-center">
                                                <Stethoscope className="w-5 h-5 text-slate-400" />
                                                <div className="flex flex-col">
                                                    <CardTitle className="text-base font-semibold text-slate-800">{h.name}</CardTitle>
                                                    <span className="text-xs text-slate-500">{h.district} District</span>
                                                </div>
                                            </div>
                                            <Badge className="bg-green-50 text-green-700 border-green-200 text-[10px]">Active</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                                            <div className="flex flex-col">
                                                <span className="text-lg font-bold text-slate-800">{h.records}</span>
                                                <span className="text-[10px] text-slate-500 uppercase font-medium">Records</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-lg font-bold text-green-600">{money(h.govt_paid)}</span>
                                                <span className="text-[10px] text-slate-500 uppercase font-medium">Govt Paid</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-lg font-bold text-orange-600">{money(h.total_cost)}</span>
                                                <span className="text-[10px] text-slate-500 uppercase font-medium">Total Cost</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {filteredHospitals.length === 0 && (
                                <div className="col-span-3 text-center p-8 text-slate-500">No hospitals match the selected filters.</div>
                            )}
                        </div>
                    </TabsContent>

                    {/* Alerts Map Tab */}
                    <TabsContent value="alerts">
                        <div className="space-y-4">
                            {/* State Filter for Alerts */}
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-slate-500">Select State:</span>
                                <Select value={selectedState} onValueChange={(v) => { setSelectedState(v); }}>
                                    <SelectTrigger className="w-[180px] font-bold bg-orange-50 border-orange-200">
                                        <SelectValue placeholder="Select State" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="AP">Andhra Pradesh</SelectItem>
                                        <SelectItem value="TG">Telangana</SelectItem>
                                        <SelectItem value="UP">Uttar Pradesh</SelectItem>
                                        <SelectItem value="MH">Maharashtra</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Hotspot Summary */}
                            {alertHotspots.length > 0 && (
                                <Card className="border-l-4 border-l-red-500">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <AlertTriangle className="w-5 h-5 text-red-600" />
                                            Disease Hotspot Alerts
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex flex-wrap gap-2">
                                            {alertHotspots.slice(0, 12).map((h: any, i: number) => (
                                                <Badge key={i} className="text-xs py-1 px-3 cursor-pointer hover:opacity-80 transition-opacity" style={{
                                                    background: h.case_count >= 5 ? "#dc2626" : h.case_count >= 3 ? "#ea580c" : "#f59e0b",
                                                    color: "white",
                                                }}
                                                    onClick={() => zoomToMandal(h.mandal || h.district)}
                                                >
                                                    {h.diagnosis} — {h.mandal || h.district} ({h.case_count} cases)
                                                </Badge>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Map */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <span className="text-red-600">GOVT ALERT</span> — Disease Outbreak Map
                                    </CardTitle>
                                    <p className="text-xs text-slate-500">Each dot represents a reported case. Click a dot for patient details. Click a hotspot badge above to zoom into that area.</p>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div style={{ height: 550 }}>
                                        <MapContainer
                                            center={STATE_COORDS[selectedState] || STATE_COORDS["TG"]}
                                            zoom={10}
                                            style={{ height: "100%", width: "100%", borderRadius: "0 0 8px 8px" }}
                                            scrollWheelZoom={true}
                                            ref={mapRef}
                                        >
                                            <TileLayer
                                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            />
                                            {alertMarkers.map((m: any, i: number) => (
                                                <CircleMarker
                                                    key={i}
                                                    center={m.coords}
                                                    radius={14}
                                                    fillColor={m.color}
                                                    color="#fff"
                                                    weight={2}
                                                    opacity={0.9}
                                                    fillOpacity={0.85}
                                                >
                                                    <Popup>
                                                        <div style={{ minWidth: 170, fontFamily: "system-ui" }}>
                                                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, borderBottom: "1px solid #e2e8f0", paddingBottom: 4 }}>Patient Details</div>
                                                            <table style={{ fontSize: 13, lineHeight: 1.8 }}>
                                                                <tbody>
                                                                    <tr><td style={{ fontWeight: 600, paddingRight: 12, color: "#475569" }}>Name</td><td>{m.first_name} {m.last_name}</td></tr>
                                                                    <tr><td style={{ fontWeight: 600, paddingRight: 12, color: "#475569" }}>Gender</td><td>{m.gender}</td></tr>
                                                                    <tr><td style={{ fontWeight: 600, paddingRight: 12, color: "#475569" }}>Age</td><td>{m.age} yrs</td></tr>
                                                                    <tr><td style={{ fontWeight: 600, paddingRight: 12, color: "#dc2626" }}>Disease</td><td style={{ fontWeight: 600 }}>{m.diagnosis}</td></tr>
                                                                    <tr><td style={{ fontWeight: 600, paddingRight: 12, color: "#475569" }}>Area</td><td>{m.mandal}, {m.district}</td></tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </Popup>
                                                </CircleMarker>
                                            ))}
                                        </MapContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Drill-Down Table */}
                    <TabsContent value="drilldown">
                        <Card>
                            <CardHeader><CardTitle className="text-base">District-wise Performance</CardTitle></CardHeader>
                            <CardContent>
                                <div className="rounded-md border">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 border-b">
                                            <tr>
                                                {["District", "Records", "Unique Patients", "Govt Paid", "Total Cost"].map(h => (
                                                    <th key={h} className="h-10 px-4 text-left font-medium text-slate-500">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {byDistrict.map((d: any, i: number) => (
                                                <tr key={i} className="border-b hover:bg-slate-50/50">
                                                    <td className="p-4 font-medium">{d.district}</td>
                                                    <td className="p-4">{d.records}</td>
                                                    <td className="p-4">{d.unique_patients || "—"}</td>
                                                    <td className="p-4 text-green-600 font-medium">{money(d.govt_paid)}</td>
                                                    <td className="p-4">{money(d.total_cost)}</td>
                                                </tr>
                                            ))}
                                            {byDistrict.length === 0 && (
                                                <tr><td colSpan={5} className="p-8 text-center text-slate-400">No data available</td></tr>
                                            )}
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
                                <CardHeader><CardTitle className="text-base">Scheme Distribution</CardTitle></CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={260}>
                                        <PieChart>
                                            <Pie data={byScheme} dataKey="records" nameKey="scheme_name" cx="50%" cy="50%" outerRadius={95}
                                                label={({ scheme_name, percent }) => `${scheme_name}: ${(percent * 100).toFixed(0)}%`}>
                                                {byScheme.map((s: any, i: number) => (
                                                    <Cell key={i} fill={SCHEME_COLORS[s.scheme_name] || SERVICE_COLORS[i % SERVICE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(v: any) => [v, "Records"]} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle className="text-base">Govt Spend by Scheme</CardTitle></CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={260}>
                                        <BarChart data={byScheme}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="scheme_name" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                                            <Tooltip formatter={(v: any) => [money(v), "Govt Paid"]} />
                                            <Bar dataKey="govt_paid" fill="#ea580c" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Services Tab */}
                    <TabsContent value="services">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader><CardTitle className="text-base">Service Distribution</CardTitle></CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={260}>
                                        <PieChart>
                                            <Pie data={byService} dataKey="records" nameKey="service_type" cx="50%" cy="50%" outerRadius={95}
                                                label={({ service_type, percent }) => `${service_type}: ${(percent * 100).toFixed(0)}%`}>
                                                {byService.map((_: any, i: number) => <Cell key={i} fill={SERVICE_COLORS[i % SERVICE_COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle className="text-base">Cost by Service Type</CardTitle></CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={260}>
                                        <BarChart data={byService}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="service_type" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                                            <Tooltip formatter={(v: any) => [money(v), "Cost"]} />
                                            <Bar dataKey="total_cost" fill="#2563eb" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Diseases Tab */}
                    <TabsContent value="diseases">
                        <Card>
                            <CardHeader><CardTitle className="text-base">Disease / Diagnosis Summary</CardTitle></CardHeader>
                            <CardContent>
                                <div className="rounded-md border">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 border-b">
                                            <tr>
                                                {["Disease / Diagnosis", "Records", "Total Cost", "Govt Paid"].map(h => (
                                                    <th key={h} className="h-10 px-4 text-left font-medium text-slate-500">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {byDisease.map((d: any, i: number) => (
                                                <tr key={i} className="border-b hover:bg-slate-50/50">
                                                    <td className="p-4 font-medium">{d.diagnosis}</td>
                                                    <td className="p-4">{d.records}</td>
                                                    <td className="p-4">{money(d.total_cost)}</td>
                                                    <td className="p-4 text-green-600 font-medium">{money(d.govt_paid)}</td>
                                                </tr>
                                            ))}
                                            {byDisease.length === 0 && (
                                                <tr><td colSpan={4} className="p-8 text-center text-slate-400">No data available</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Recent Records Table */}
                {records.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <HeartPulse className="w-4 h-4 text-orange-600" />
                                Recent Health Records ({records.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b">
                                        <tr>
                                            {["Date", "Hospital", "Worker", "Service", "Disease", "Cost", "Govt Paid", "Scheme"].map(h => (
                                                <th key={h} className="h-10 px-4 text-left font-medium text-slate-500 whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.slice(0, 50).map((r: any) => (
                                            <tr key={r.id} className="border-b hover:bg-slate-50/50">
                                                <td className="p-3 whitespace-nowrap text-xs">{new Date(r.created_at).toLocaleDateString("en-IN")}</td>
                                                <td className="p-3 text-xs">{r.hospital_name || "—"}</td>
                                                <td className="p-3 text-xs whitespace-nowrap">
                                                    {r.first_name} {r.last_name}<br />
                                                    <span className="text-slate-400 text-[10px]">{r.worker_code}</span>
                                                </td>
                                                <td className="p-3 text-xs">{r.service_type}</td>
                                                <td className="p-3 text-xs">{r.diagnosis}</td>
                                                <td className="p-3 text-xs">{money(r.cost)}</td>
                                                <td className="p-3 text-xs text-green-600 font-medium">{money(r.govt_paid)}</td>
                                                <td className="p-3">
                                                    <Badge
                                                        style={{ background: SCHEME_COLORS[r.scheme_name] || "#64748b", color: "white", fontSize: 10 }}
                                                    >
                                                        {r.scheme_name}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Empty state when no records and no stats */}
                {records.length === 0 && !statsLoading && !recordsLoading && (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <HeartPulse className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <div className="text-slate-500 text-sm">No health records found. Records will appear here once hospitals start entering data.</div>
                        </CardContent>
                    </Card>
                )}

            </main>
        </div>
    );
}

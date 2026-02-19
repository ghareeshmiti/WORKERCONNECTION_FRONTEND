import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { authenticateUser } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, LogOut, CreditCard, Plus, RefreshCw, Stethoscope, FlaskConical, Pill, Scissors, ScanLine, CheckCircle2, XCircle, Calendar, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API = "https://workerconnection-backend.vercel.app/api";
const SCHEME_COLORS: Record<string, string> = {
    "NTR Vaidya Seva": "#ea580c", // Orange-600
    "EHS": "#0284c7", // Sky-600
    "PMJAY": "#9333ea", // Purple-600
    "Paid": "#64748b", // Slate-500
};

function money(n: number | string) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n));
}

interface Worker {
    id: string;
    worker_id: string;
    first_name: string;
    last_name: string;
    gender: string;
    dob: string;
    district: string;
    mandal: string;
    blood_group?: string;
    allergies?: string;
    chronic_conditions?: string;
    scheme_name?: string;
    photo_url?: string;
}

interface HealthRecord {
    id: string;
    service_type: string;
    scheme_name: string;
    diagnosis: string;
    description: string;
    cost: number;
    govt_paid: number;
    created_at: string;
}

interface Appointment {
    id: string;
    doctor_name: string;
    department: string;
    appointment_date: string;
    status: string;
    notes: string;
}

interface Checkup {
    id: string;
    checkup_type: string;
    doctor_name: string;
    findings: string;
    vitals: Record<string, string>;
    prescriptions: string;
    checkup_date: string;
}

const SERVICE_ICONS: Record<string, React.ReactNode> = {
    Consultation: <Stethoscope size={14} />,
    Laboratory: <FlaskConical size={14} />,
    Pharmacy: <Pill size={14} />,
    Surgery: <Scissors size={14} />,
};

export default function HospitalEntry() {
    const { userContext, signOut } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [workerIdInput, setWorkerIdInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "success" | "failed">("idle");
    const [worker, setWorker] = useState<Worker | null>(null);
    const [records, setRecords] = useState<HealthRecord[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [checkups, setCheckups] = useState<Checkup[]>([]);
    const [showForm, setShowForm] = useState(false);

    // New record form
    const [form, setForm] = useState({
        service_type: "Consultation",
        scheme_name: "NTR Vaidya Seva",
        diagnosis: "",
        description: "",
        cost: "",
        govt_paid: "",
    });
    const [submitting, setSubmitting] = useState(false);

    const establishmentId = userContext?.establishmentId || "";
    const establishmentName = userContext?.fullName || userContext?.email?.split("@")[0] || "Hospital";
    const staffName = userContext?.email?.split("@")[0] || "Staff";

    const lookupWorkerById = async (workerId: string) => {
        setLoading(true);
        setWorker(null);
        try {
            const res = await fetch(`${API}/health/worker-lookup?worker_id=${workerId.trim()}`);
            if (!res.ok) {
                const err = await res.json();
                toast({ title: "Not Found", description: err.error || "Worker not found", variant: "destructive" });
                setScanStatus("failed");
                setTimeout(() => setScanStatus("idle"), 2000);
                return;
            }
            const data = await res.json();
            setWorker(data.worker);
            setRecords(data.records || []);
            setAppointments(data.appointments || []);
            setCheckups(data.checkups || []);
            setScanStatus("success");
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
            setScanStatus("failed");
            setTimeout(() => setScanStatus("idle"), 2000);
        } finally {
            setLoading(false);
        }
    };

    const lookupWorker = () => lookupWorkerById(workerIdInput);

    // FIDO2 / Smart Card scan — same flow as ConductorDashboard
    const handleScanCard = async () => {
        setScanning(true);
        setScanStatus("scanning");
        try {
            const result = await authenticateUser("", "verification");

            if (result.verified && result.username) {
                // result.username is the worker_id string
                toast({ title: "Card Verified ✓", description: "Loading patient profile..." });
                await lookupWorkerById(result.username);
            } else {
                setScanStatus("failed");
                toast({ title: "Verification Failed", description: "Card could not be verified. Try manual entry.", variant: "destructive" });
                setTimeout(() => setScanStatus("idle"), 2500);
            }
        } catch (error: any) {
            setScanStatus("failed");
            if (error.name === "NotAllowedError") {
                toast({ title: "Scan Cancelled", description: "Please tap your card when prompted.", variant: "destructive" });
            } else {
                toast({ title: "Scan Error", description: error.message || "Failed to read card. Try manual entry.", variant: "destructive" });
            }
            setTimeout(() => setScanStatus("idle"), 2500);
        } finally {
            setScanning(false);
        }
    };

    const submitRecord = async () => {
        if (!worker || !form.service_type || !form.diagnosis) {
            toast({ title: "Missing fields", description: "Please fill in Service, Diagnosis", variant: "destructive" });
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(`${API}/health/record`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    worker_id: worker.id,
                    establishment_id: establishmentId,
                    operator_id: userContext?.authUserId,
                    service_type: form.service_type,
                    scheme_name: form.scheme_name,
                    diagnosis: form.diagnosis,
                    description: form.description,
                    cost: parseFloat(form.cost) || 0,
                    govt_paid: parseFloat(form.govt_paid) || 0,
                }),
            });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            setRecords(prev => [data.record, ...prev]);
            setShowForm(false);
            setForm({ service_type: "Consultation", scheme_name: "NTR Vaidya Seva", diagnosis: "", description: "", cost: "", govt_paid: "" });
            toast({ title: "Record Added", description: `${form.service_type} record saved successfully.` });
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    const age = worker?.dob ? Math.floor((Date.now() - new Date(worker.dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : null;

    return (
        <div className="min-h-screen bg-slate-50 pb-8">

            {/* Header — APSRTC style */}
            <header className="bg-white border-b sticky top-0 z-20 shadow-sm border-t-4 border-t-orange-600">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/opoc/ap-logo.png" alt="AP Govt" className="w-12 h-12 object-contain" />
                        <div className="flex flex-col">
                            <span className="text-xl font-black text-orange-700 leading-none tracking-tight">{establishmentName}</span>
                            <span className="text-xs text-slate-500 font-bold tracking-widest mt-1">AP HEALTH DEPARTMENT — PATIENT ENTRY</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <div className="text-sm font-bold text-slate-700">{staffName}</div>
                            <div className="text-xs text-slate-500">{userContext?.email}</div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/"); }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50">
                            <LogOut className="w-4 h-4 mr-2" /> Log Out
                        </Button>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-6 max-w-4xl">
                {/* Card Scan Area */}
                {!worker && (
                    <Card className="border-2 border-dashed border-orange-200 bg-white shadow-none mb-6">
                        <CardContent className="p-10 flex flex-col items-center gap-6">

                            {/* Animated icon based on state */}
                            <div className={`relative flex items-center justify-center w-24 h-24 rounded-full transition-all duration-500 ${scanStatus === "scanning" ? "bg-orange-50 animate-pulse" :
                                scanStatus === "success" ? "bg-green-50" :
                                    scanStatus === "failed" ? "bg-red-50" :
                                        "bg-slate-50"
                                }`}>
                                {scanStatus === "success" ? (
                                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                                ) : scanStatus === "failed" ? (
                                    <XCircle className="w-12 h-12 text-red-500" />
                                ) : scanStatus === "scanning" ? (
                                    <ScanLine className="w-12 h-12 text-orange-500" />
                                ) : (
                                    <CreditCard className="w-12 h-12 text-slate-400" />
                                )}
                                {scanStatus === "scanning" && (
                                    <span className="absolute inset-0 rounded-full border-4 border-orange-400 animate-ping opacity-30" />
                                )}
                            </div>

                            <div className="text-center">
                                <div className="text-lg font-bold text-slate-800 mb-1">
                                    {scanStatus === "scanning" ? "Scanning... Please tap card" :
                                        scanStatus === "success" ? "Card Verified!" :
                                            scanStatus === "failed" ? "Scan Failed" :
                                                "Patient Smart Card"}
                                </div>
                                <div className="text-sm text-slate-500">
                                    {scanStatus === "scanning" ? "Hold the card near the reader" :
                                        scanStatus === "success" ? "Loading patient details..." :
                                            scanStatus === "failed" ? "Try again or use manual entry below" :
                                                "Tap the button to scan the patient's health card"}
                                </div>
                            </div>

                            {/* Primary Scan Button */}
                            <Button
                                size="lg"
                                onClick={handleScanCard}
                                disabled={scanning || loading}
                                className="h-14 px-10 text-base font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-md hover:shadow-lg transition-all gap-3"
                            >
                                {scanning ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Scanning...</>
                                ) : (
                                    <><ScanLine className="w-5 h-5" /> Scan Card</>
                                )}
                            </Button>

                            {/* Divider */}
                            <div className="flex items-center gap-3 w-full max-w-sm">
                                <div className="flex-1 h-px bg-slate-200" />
                                <span className="text-xs text-slate-400 font-medium">OR ENTER MANUALLY</span>
                                <div className="flex-1 h-px bg-slate-200" />
                            </div>

                            {/* Manual Worker ID input */}
                            <div className="flex gap-2 w-full max-w-sm">
                                <Input
                                    placeholder="Worker ID (e.g. WKR2445425056)"
                                    value={workerIdInput}
                                    onChange={e => setWorkerIdInput(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && lookupWorker()}
                                    className="h-10 text-sm"
                                />
                                <Button
                                    onClick={lookupWorker}
                                    disabled={loading || !workerIdInput.trim()}
                                    variant="outline"
                                    className="h-10 px-4 border-orange-300 text-orange-700 hover:bg-orange-50"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                                </Button>
                            </div>

                        </CardContent>
                    </Card>
                )}

                {/* Worker Profile */}
                {worker && (
                    <>
                        {/* Worker Header */}
                        <Card className="border-none shadow-md mb-6 overflow-hidden">
                            <div className="bg-gradient-to-r from-orange-600 to-orange-500 p-5 flex justify-between items-center text-white">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl overflow-hidden border-2 border-white/30">
                                        {worker.photo_url ? (
                                            <img src={worker.photo_url} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <span>{worker.gender === "Female" ? "👩" : "👨"}</span>
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-bold text-lg">Name: {worker.first_name} {worker.last_name}</div>
                                        <div className="text-orange-50 text-xs mt-1 font-medium bg-orange-700/30 px-2 py-0.5 rounded inline-block">Card ID: {worker.worker_id}</div>
                                        <div className="text-orange-100 text-sm mt-0.5">Age/Gender: {age || "N/A"} / {worker.gender}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-orange-100 text-sm font-medium">District: {worker.district}</div>
                                    <div className="text-orange-200 text-xs">Mandal/City: {worker.mandal}</div>
                                </div>
                            </div>
                            <CardContent className="p-5 bg-white">
                                <div className="flex flex-wrap gap-3 items-center">
                                    {worker.blood_group && <Badge variant="outline" className="border-slate-200 text-slate-700">Blood Group: <b className="ml-1 text-slate-900">{worker.blood_group}</b></Badge>}
                                    {worker.allergies && <Badge variant="outline" className="border-slate-200 text-slate-700">Allergies: <b className="ml-1 text-slate-900">{worker.allergies}</b></Badge>}
                                    {worker.chronic_conditions && <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">Chronic: <b className="ml-1">{worker.chronic_conditions}</b></Badge>}
                                    {worker.scheme_name && (
                                        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200 border-none">{worker.scheme_name}</Badge>
                                    )}
                                    <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Eligible for Govt Benefits</Badge>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Action Buttons */}
                        <div className="flex gap-3 mb-6">
                            <Button onClick={() => setShowForm(!showForm)} className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm gap-2">
                                <Plus size={16} /> Record New Benefit / Service
                            </Button>
                            <Button variant="outline" onClick={() => { setWorker(null); setWorkerIdInput(""); }} className="border-slate-300 text-slate-700 hover:bg-slate-50 gap-2">
                                <RefreshCw size={14} /> New Scan
                            </Button>
                        </div>

                        {/* New Record Form */}
                        {showForm && (
                            <Card className="border border-orange-200 shadow-sm mb-6 animate-in slide-in-from-top-2">
                                <CardHeader className="bg-orange-50/50 border-b border-orange-100 py-3">
                                    <CardTitle className="text-sm text-orange-800 flex items-center gap-2">
                                        <Plus className="w-4 h-4" /> Record New Benefit / Service
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Service Type *</label>
                                            <Select value={form.service_type} onValueChange={v => setForm(f => ({ ...f, service_type: v }))}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {["Consultation", "Pharmacy", "Laboratory", "Surgery"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Scheme *</label>
                                            <Select value={form.scheme_name} onValueChange={v => setForm(f => ({ ...f, scheme_name: v }))}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {["NTR Vaidya Seva", "EHS", "PMJAY", "Paid"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Diagnosis / Disease *</label>
                                            <Input value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} placeholder="e.g. Diabetes, Fever..." />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</label>
                                            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Monthly diabetes medicines" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Cost (₹)</label>
                                            <Input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} placeholder="0" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Govt Paid (₹)</label>
                                            <Input type="number" value={form.govt_paid} onChange={e => setForm(f => ({ ...f, govt_paid: e.target.value }))} placeholder="0" />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                                        <Button onClick={submitRecord} disabled={submitting} className="bg-orange-600 hover:bg-orange-700 text-white">
                                            {submitting ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                                            Save Record
                                        </Button>
                                        <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Appointments */}
                        {appointments.length > 0 && (
                            <Card className="border-none shadow-sm mb-6 overflow-hidden">
                                <CardHeader className="bg-slate-50 border-b border-slate-100 py-3">
                                    <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-orange-600" /> Appointments
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                                <tr>
                                                    {["Date", "Doctor", "Department", "Status", "Notes"].map(h => (
                                                        <th key={h} className="px-4 py-3 text-xs uppercase tracking-wider">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {appointments.map((a) => (
                                                    <tr key={a.id} className="hover:bg-slate-50/50">
                                                        <td className="px-4 py-3 font-medium text-slate-700">{new Date(a.appointment_date).toLocaleDateString("en-IN")}</td>
                                                        <td className="px-4 py-3 text-slate-600">{a.doctor_name}</td>
                                                        <td className="px-4 py-3 text-slate-600">{a.department}</td>
                                                        <td className="px-4 py-3">
                                                            <Badge className={a.status === "Scheduled" ? "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100" : "bg-green-50 text-green-700 border-green-100 hover:bg-green-100"}>
                                                                {a.status}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate">{a.notes}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Past Checkups */}
                        {/* Past Checkups */}
                        {checkups.length > 0 && (
                            <Card className="border-none shadow-sm mb-6 overflow-hidden">
                                <CardHeader className="bg-slate-50 border-b border-slate-100 py-3">
                                    <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <ClipboardList className="w-4 h-4 text-orange-600" /> Past Checkups & Reports
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-slate-100">
                                        {checkups.map((c) => (
                                            <div key={c.id} className="p-4 hover:bg-slate-50/50">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-semibold text-sm text-slate-800">{c.checkup_type}</span>
                                                    <span className="text-xs text-slate-500">{new Date(c.checkup_date).toLocaleDateString("en-IN")}</span>
                                                </div>
                                                <div className="text-xs text-slate-500 mb-2">Doctor: {c.doctor_name}</div>
                                                <div className="text-xs text-slate-700 font-medium">Findings: {c.findings}</div>
                                                {c.vitals && (
                                                    <div className="text-xs text-slate-500 mt-1 bg-slate-50 p-1.5 rounded inline-block">
                                                        <span className="font-medium">Vitals:</span> BP {c.vitals.bp}, Pulse {c.vitals.pulse}, Temp {c.vitals.temp}, Weight {c.vitals.weight}
                                                    </div>
                                                )}
                                                <div className="text-xs text-slate-500 mt-1">Prescriptions: {c.prescriptions}</div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Recent Service Records */}
                        <Card className="border-none shadow-sm mb-6 overflow-hidden">
                            <CardHeader className="bg-slate-50 border-b border-slate-100 py-3">
                                <CardTitle className="text-sm font-semibold text-slate-700">Recent Service Records</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                            <tr>
                                                {["Date", "Service", "Description", "Disease", "Cost", "Scheme"].map(h => (
                                                    <th key={h} className="px-4 py-3 text-xs uppercase tracking-wider">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {records.map((r) => {
                                                const isFree = r.govt_paid > 0;
                                                return (
                                                    <tr key={r.id} className="hover:bg-slate-50/50">
                                                        <td className="px-4 py-3 font-medium text-slate-700">{new Date(r.created_at).toLocaleDateString("en-IN")}</td>
                                                        <td className="px-4 py-3 text-slate-600">
                                                            <span className="flex items-center gap-2">
                                                                <span className="text-orange-600 bg-orange-50 p-1 rounded-full">{SERVICE_ICONS[r.service_type]}</span>
                                                                {r.service_type}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600">{r.description}</td>
                                                        <td className="px-4 py-3 text-slate-600">{r.diagnosis}</td>
                                                        <td className="px-4 py-3">
                                                            {isFree ? (
                                                                <span className="text-green-600 font-medium text-xs bg-green-50 px-2 py-0.5 rounded border border-green-100">Free (Govt: {money(r.govt_paid)})</span>
                                                            ) : (
                                                                <span className="font-medium text-slate-700">{money(r.cost)}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Badge style={{ background: SCHEME_COLORS[r.scheme_name] || "#64748b", color: "white" }} className="border-none font-normal">
                                                                {r.scheme_name}
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {records.length === 0 && (
                                                <tr><td colSpan={6} className="p-8 text-center text-slate-400 text-sm">No records yet</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
}

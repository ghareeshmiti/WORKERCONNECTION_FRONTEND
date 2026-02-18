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
const HEALTH_GREEN = "#16a34a";
const SCHEME_COLORS: Record<string, string> = {
    "NTR Vaidya Seva": "#16a34a",
    "EHS": "#2563eb",
    "PMJAY": "#9333ea",
    "Paid": "#64748b",
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
                        <Card style={{ border: "none", boxShadow: "0 2px 12px rgba(22,163,74,0.15)", marginBottom: 20, overflow: "hidden" }}>
                            <div style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 100%)", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                                        {worker.gender === "Female" ? "👩" : "👨"}
                                    </div>
                                    <div>
                                        <div style={{ color: "white", fontWeight: 700, fontSize: 16 }}>Name: {worker.first_name} {worker.last_name}</div>
                                        <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 12 }}>Card ID: {worker.worker_id}</div>
                                        <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 12 }}>Age/Gender: {age} / {worker.gender}</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 12 }}>District: {worker.district}</div>
                                    <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 12 }}>Mandal/City: {worker.mandal}, {worker.district}</div>
                                </div>
                            </div>
                            <CardContent style={{ padding: "14px 20px" }}>
                                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                                    {worker.blood_group && <span style={{ fontSize: 13 }}><b>Blood Group:</b> {worker.blood_group}</span>}
                                    {worker.allergies && <span style={{ fontSize: 13 }}><b>Allergies:</b> {worker.allergies}</span>}
                                    {worker.chronic_conditions && <span style={{ fontSize: 13, color: "#dc2626" }}><b>Chronic Conditions:</b> {worker.chronic_conditions}</span>}
                                    {worker.scheme_name && (
                                        <Badge style={{ background: SCHEME_COLORS[worker.scheme_name] || HEALTH_GREEN, color: "white" }}>{worker.scheme_name}</Badge>
                                    )}
                                    <Badge style={{ background: "#dcfce7", color: HEALTH_GREEN, border: "1px solid #86efac" }}>✓ Eligible for Govt Scheme Benefits</Badge>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Action Buttons */}
                        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                            <Button onClick={() => setShowForm(!showForm)} style={{ background: HEALTH_GREEN, color: "white" }}>
                                <Plus size={15} style={{ marginRight: 6 }} /> Record New Benefit / Service
                            </Button>
                            <Button variant="outline" onClick={() => { setWorker(null); setWorkerIdInput(""); }}>
                                <RefreshCw size={14} style={{ marginRight: 6 }} /> New Scan
                            </Button>
                        </div>

                        {/* New Record Form */}
                        {showForm && (
                            <Card style={{ border: `1px solid #86efac`, boxShadow: "0 2px 12px rgba(22,163,74,0.1)", marginBottom: 20 }}>
                                <CardHeader style={{ borderBottom: "1px solid #f0fdf4", paddingBottom: 12 }}>
                                    <CardTitle style={{ fontSize: 14, color: HEALTH_GREEN }}>+ Record New Benefit / Service</CardTitle>
                                </CardHeader>
                                <CardContent style={{ padding: 20 }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                                        <div>
                                            <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>Service Type *</label>
                                            <Select value={form.service_type} onValueChange={v => setForm(f => ({ ...f, service_type: v }))}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {["Consultation", "Pharmacy", "Laboratory", "Surgery"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>Scheme *</label>
                                            <Select value={form.scheme_name} onValueChange={v => setForm(f => ({ ...f, scheme_name: v }))}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {["NTR Vaidya Seva", "EHS", "PMJAY", "Paid"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>Diagnosis / Disease *</label>
                                            <Input value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} placeholder="e.g. Diabetes, Fever..." />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>Description</label>
                                            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Monthly diabetes medicines" />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>Total Cost (₹)</label>
                                            <Input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} placeholder="0" />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>Govt Paid (₹)</label>
                                            <Input type="number" value={form.govt_paid} onChange={e => setForm(f => ({ ...f, govt_paid: e.target.value }))} placeholder="0" />
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                                        <Button onClick={submitRecord} disabled={submitting} style={{ background: HEALTH_GREEN, color: "white" }}>
                                            {submitting ? <Loader2 size={14} className="animate-spin" style={{ marginRight: 6 }} /> : null}
                                            Save Record
                                        </Button>
                                        <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Appointments */}
                        {appointments.length > 0 && (
                            <Card style={{ border: "none", boxShadow: "0 1px 8px rgba(0,0,0,0.08)", marginBottom: 20 }}>
                                <CardHeader style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 12 }}>
                                    <CardTitle style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                                        <Calendar size={15} color={HEALTH_GREEN} /> Appointments
                                    </CardTitle>
                                </CardHeader>
                                <CardContent style={{ padding: 0 }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                        <thead>
                                            <tr style={{ background: "#f8fafc" }}>
                                                {["Date", "Doctor", "Department", "Status", "Notes"].map(h => (
                                                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, color: "#64748b", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {appointments.map((a) => (
                                                <tr key={a.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                                                    <td style={{ padding: "10px 16px", fontSize: 12 }}>{new Date(a.appointment_date).toLocaleDateString("en-IN")}</td>
                                                    <td style={{ padding: "10px 16px", fontSize: 12 }}>{a.doctor_name}</td>
                                                    <td style={{ padding: "10px 16px", fontSize: 12 }}>{a.department}</td>
                                                    <td style={{ padding: "10px 16px" }}>
                                                        <Badge style={{ background: a.status === "Scheduled" ? "#dbeafe" : "#dcfce7", color: a.status === "Scheduled" ? "#2563eb" : HEALTH_GREEN, fontSize: 10 }}>{a.status}</Badge>
                                                    </td>
                                                    <td style={{ padding: "10px 16px", fontSize: 12, color: "#64748b" }}>{a.notes}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </CardContent>
                            </Card>
                        )}

                        {/* Past Checkups */}
                        {checkups.length > 0 && (
                            <Card style={{ border: "none", boxShadow: "0 1px 8px rgba(0,0,0,0.08)", marginBottom: 20 }}>
                                <CardHeader style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 12 }}>
                                    <CardTitle style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                                        <ClipboardList size={15} color={HEALTH_GREEN} /> Past Checkups & Reports
                                    </CardTitle>
                                </CardHeader>
                                <CardContent style={{ padding: 16 }}>
                                    {checkups.map((c) => (
                                        <div key={c.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #f1f5f9" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                                <span style={{ fontWeight: 600, fontSize: 13 }}>{c.checkup_type}</span>
                                                <span style={{ fontSize: 12, color: "#64748b" }}>{new Date(c.checkup_date).toLocaleDateString("en-IN")}</span>
                                            </div>
                                            <div style={{ fontSize: 12, color: "#64748b" }}>Doctor: {c.doctor_name}</div>
                                            <div style={{ fontSize: 12, marginTop: 4 }}>Findings: {c.findings}</div>
                                            {c.vitals && (
                                                <div style={{ fontSize: 12, color: "#64748b" }}>
                                                    Vitals: BP {c.vitals.bp}, Pulse {c.vitals.pulse}, Temp {c.vitals.temp}, Weight {c.vitals.weight}
                                                </div>
                                            )}
                                            <div style={{ fontSize: 12, color: "#64748b" }}>Prescriptions: {c.prescriptions}</div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {/* Recent Service Records */}
                        <Card style={{ border: "none", boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
                            <CardHeader style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 12 }}>
                                <CardTitle style={{ fontSize: 14 }}>Recent Service Records</CardTitle>
                            </CardHeader>
                            <CardContent style={{ padding: 0 }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ background: "#f8fafc" }}>
                                            {["Date", "Service", "Description", "Disease", "Cost", "Scheme"].map(h => (
                                                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, color: "#64748b", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.map((r) => {
                                            const isFree = r.govt_paid > 0;
                                            return (
                                                <tr key={r.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                                                    <td style={{ padding: "10px 16px", fontSize: 12 }}>{new Date(r.created_at).toLocaleDateString("en-IN")}</td>
                                                    <td style={{ padding: "10px 16px", fontSize: 12 }}>
                                                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                            {SERVICE_ICONS[r.service_type]} {r.service_type}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: "10px 16px", fontSize: 12 }}>{r.description}</td>
                                                    <td style={{ padding: "10px 16px", fontSize: 12 }}>{r.diagnosis}</td>
                                                    <td style={{ padding: "10px 16px", fontSize: 12 }}>
                                                        {isFree ? (
                                                            <span style={{ color: HEALTH_GREEN }}>Free (Govt: {money(r.govt_paid)})</span>
                                                        ) : (
                                                            money(r.cost)
                                                        )}
                                                    </td>
                                                    <td style={{ padding: "10px 16px" }}>
                                                        <Badge style={{ background: SCHEME_COLORS[r.scheme_name] || "#64748b", color: "white", fontSize: 10 }}>{r.scheme_name}</Badge>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {records.length === 0 && (
                                            <tr><td colSpan={6} style={{ padding: 30, textAlign: "center", color: "#94a3b8" }}>No records yet</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
}

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "react-router-dom";
import { authenticateUser } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, LogOut, CreditCard, Plus, RefreshCw, Stethoscope, FlaskConical, Pill, Scissors, ScanLine, CheckCircle2, XCircle, Calendar, ClipboardList, FileText, ArrowLeft, Clock, AlertCircle, Users, UserCheck, Ticket, Heart, Brain, Smile, Eye, Baby } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";
const HEALTH_API = "https://workerconnection-backend.vercel.app/api";

const SCHEME_COLORS: Record<string, string> = {
    "NTR Vaidya Seva": "#ea580c",
    "EHS": "#0284c7",
    "PMJAY": "#9333ea",
    "Paid": "#64748b",
};

const SPECIALIZATION_ICONS: Record<string, React.ReactNode> = {
    "General Medicine": <Stethoscope size={20} />,
    "Cardiology": <Heart size={20} />,
    "Neurology": <Brain size={20} />,
    "Dental": <Smile size={20} />,
    "Dermatology": <Eye size={20} />,
    "Gynecology": <Baby size={20} />,
};

const SPECIALIZATION_COLORS: Record<string, string> = {
    "General Medicine": "bg-blue-50 text-blue-700 border-blue-200",
    "Cardiology": "bg-red-50 text-red-700 border-red-200",
    "Neurology": "bg-purple-50 text-purple-700 border-purple-200",
    "Dental": "bg-cyan-50 text-cyan-700 border-cyan-200",
    "Dermatology": "bg-amber-50 text-amber-700 border-amber-200",
    "Gynecology": "bg-pink-50 text-pink-700 border-pink-200",
};

function money(n: number | string) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n));
}

function calcAge(dob: string | null | undefined): number | null {
    if (!dob) return null;
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
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

interface FamilyMember {
    id: string;
    name: string;
    relation: string;
    gender: string;
    date_of_birth: string;
    blood_group?: string;
    allergies?: string;
    chronic_conditions?: string;
    phone?: string;
    photo_url?: string;
}

interface Family {
    id: string;
    family_name: string;
    address?: string;
    district?: string;
    phone?: string;
    members: FamilyMember[];
}

interface Doctor {
    id: string;
    name: string;
    email: string;
    specialization: string;
    qualification: string;
    experience_years: number;
    phone?: string;
    photo_url?: string;
    queue_count: number;
}

interface QueueResult {
    token_number: number;
    patient_name: string;
    doctor_name: string;
    doctor_specialization: string;
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

type OpdStep = "scan" | "family" | "doctor" | "confirm" | "success" | "worker-detail";

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

    // OPD Flow state
    const [opdStep, setOpdStep] = useState<OpdStep>("scan");
    const [workerIdInput, setWorkerIdInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "success" | "failed">("idle");

    // Family state
    const [workerInfo, setWorkerInfo] = useState<{ id: string; worker_id: string; name: string } | null>(null);
    const [family, setFamily] = useState<Family | null>(null);
    const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);

    // Doctor state
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
    const [visitNotes, setVisitNotes] = useState("");
    const [patientWeight, setPatientWeight] = useState("");
    const [patientTemp, setPatientTemp] = useState("");

    // Queue result
    const [queueResult, setQueueResult] = useState<QueueResult | null>(null);
    const [submittingQueue, setSubmittingQueue] = useState(false);

    // Worker detail state (for direct lookup / health records)
    const [worker, setWorker] = useState<Worker | null>(null);
    const [records, setRecords] = useState<HealthRecord[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [checkups, setCheckups] = useState<Checkup[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [detailView, setDetailView] = useState<"dashboard" | "prescriptions">("dashboard");

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

    // === API CALLS ===

    const lookupFamilyByCard = async (cardUid: string) => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/families/by-card/${encodeURIComponent(cardUid)}`);
            if (!res.ok) {
                // Fallback: try worker lookup for cards without family
                const err = await res.json();
                toast({ title: "No Family Found", description: err.error || "Try worker lookup instead", variant: "destructive" });
                setScanStatus("failed");
                setTimeout(() => setScanStatus("idle"), 2000);
                return false;
            }
            const data = await res.json();
            setWorkerInfo(data.worker);
            setFamily(data.family);
            setScanStatus("success");
            setOpdStep("family");
            return true;
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
            setScanStatus("failed");
            setTimeout(() => setScanStatus("idle"), 2000);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const lookupWorkerById = async (workerId: string) => {
        setLoading(true);
        try {
            // Try family lookup first via worker card_uid
            const familyRes = await fetch(`${API}/api/families/by-card/${encodeURIComponent(workerId)}`);
            if (familyRes.ok) {
                const data = await familyRes.json();
                setWorkerInfo(data.worker);
                setFamily(data.family);
                setScanStatus("success");
                setOpdStep("family");
                return;
            }

            // Fallback to direct worker lookup
            const res = await fetch(`${HEALTH_API}/health/worker-lookup?worker_id=${workerId.trim()}`);
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
            setOpdStep("worker-detail");
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
            setScanStatus("failed");
            setTimeout(() => setScanStatus("idle"), 2000);
        } finally {
            setLoading(false);
        }
    };

    const fetchDoctors = async () => {
        try {
            const res = await fetch(`${API}/api/doctors?establishment_id=${establishmentId}`);
            if (!res.ok) throw new Error("Failed to fetch doctors");
            const data = await res.json();
            setDoctors(data.doctors || []);
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    };

    const handleScanCard = async () => {
        setScanning(true);
        setScanStatus("scanning");
        try {
            const result = await authenticateUser("", "verification");
            if (result.verified && result.username) {
                toast({ title: "Card Verified", description: "Loading family details..." });
                await lookupWorkerById(result.username);
            } else {
                setScanStatus("failed");
                toast({ title: "Verification Failed", description: "Card could not be verified.", variant: "destructive" });
                setTimeout(() => setScanStatus("idle"), 2500);
            }
        } catch (error: any) {
            setScanStatus("failed");
            if (error.name === "NotAllowedError") {
                toast({ title: "Scan Cancelled", description: "Please tap your card when prompted.", variant: "destructive" });
            } else {
                toast({ title: "Scan Error", description: error.message || "Failed to read card.", variant: "destructive" });
            }
            setTimeout(() => setScanStatus("idle"), 2500);
        } finally {
            setScanning(false);
        }
    };

    const handleSelectMember = (member: FamilyMember) => {
        setSelectedMember(member);
        fetchDoctors();
        setOpdStep("doctor");
    };

    const handleSelectDoctor = (doctor: Doctor) => {
        setSelectedDoctor(doctor);
        setOpdStep("confirm");
    };

    const handleAddToQueue = async () => {
        if (!selectedDoctor || !selectedMember || !family) return;
        setSubmittingQueue(true);
        try {
            const res = await fetch(`${API}/api/queue/add`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    doctor_id: selectedDoctor.id,
                    family_member_id: selectedMember.id,
                    family_id: family.id,
                    establishment_id: establishmentId,
                    added_by: userContext?.authUserId,
                    notes: visitNotes || null,
                    vitals: (patientWeight || patientTemp) ? {
                        ...(patientWeight ? { weight: patientWeight + " kg" } : {}),
                        ...(patientTemp ? { temperature: patientTemp + " °F" } : {}),
                    } : null,
                }),
            });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            setQueueResult(data);
            setOpdStep("success");
            toast({ title: "Patient Queued!", description: `Token #${data.token_number} assigned` });
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setSubmittingQueue(false);
        }
    };

    const resetAll = () => {
        setOpdStep("scan");
        setWorkerIdInput("");
        setScanStatus("idle");
        setWorkerInfo(null);
        setFamily(null);
        setSelectedMember(null);
        setDoctors([]);
        setSelectedDoctor(null);
        setVisitNotes("");
        setPatientWeight("");
        setPatientTemp("");
        setQueueResult(null);
        setWorker(null);
        setRecords([]);
        setAppointments([]);
        setCheckups([]);
        setShowForm(false);
        setDetailView("dashboard");
    };

    const submitRecord = async () => {
        if (!worker || !form.service_type || !form.diagnosis) {
            toast({ title: "Missing fields", description: "Please fill in Service, Diagnosis", variant: "destructive" });
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(`${HEALTH_API}/health/record`, {
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

    // === STEP INDICATOR ===
    const steps = [
        { key: "scan", label: "Scan Card" },
        { key: "family", label: "Select Member" },
        { key: "doctor", label: "Select Doctor" },
        { key: "confirm", label: "Confirm" },
    ];
    const currentStepIndex = steps.findIndex(s => s.key === opdStep);

    return (
        <div className="min-h-screen bg-slate-50 pb-8">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-20 shadow-sm border-t-4 border-t-orange-600">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/opoc/ap-logo.png" alt="AP Govt" className="w-12 h-12 object-contain" />
                        <div className="flex flex-col">
                            <span className="text-xl font-black text-orange-700 leading-none tracking-tight">{establishmentName}</span>
                            <span className="text-xs text-slate-500 font-bold tracking-widest mt-1">AP HEALTH DEPARTMENT — OPD PATIENT ENTRY</span>
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

                {/* Step Indicator (only for OPD flow) */}
                {opdStep !== "worker-detail" && opdStep !== "success" && (
                    <div className="flex items-center justify-center gap-1 mb-6">
                        {steps.map((step, i) => (
                            <div key={step.key} className="flex items-center">
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                    i < currentStepIndex ? "bg-green-100 text-green-700" :
                                    i === currentStepIndex ? "bg-orange-600 text-white shadow-md" :
                                    "bg-slate-100 text-slate-400"
                                }`}>
                                    {i < currentStepIndex ? <CheckCircle2 size={14} /> : <span className="w-4 text-center">{i + 1}</span>}
                                    <span className="hidden sm:inline">{step.label}</span>
                                </div>
                                {i < steps.length - 1 && (
                                    <div className={`w-8 h-0.5 mx-1 ${i < currentStepIndex ? "bg-green-300" : "bg-slate-200"}`} />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* ═══════════ STEP 1: SCAN CARD ═══════════ */}
                {opdStep === "scan" && (
                    <Card className="border-2 border-dashed border-orange-200 bg-white shadow-none mb-6">
                        <CardContent className="p-10 flex flex-col items-center gap-6">
                            <div className={`relative flex items-center justify-center w-24 h-24 rounded-full transition-all duration-500 ${
                                scanStatus === "scanning" ? "bg-orange-50 animate-pulse" :
                                scanStatus === "success" ? "bg-green-50" :
                                scanStatus === "failed" ? "bg-red-50" : "bg-slate-50"
                            }`}>
                                {scanStatus === "success" ? <CheckCircle2 className="w-12 h-12 text-green-500" /> :
                                 scanStatus === "failed" ? <XCircle className="w-12 h-12 text-red-500" /> :
                                 scanStatus === "scanning" ? <ScanLine className="w-12 h-12 text-orange-500" /> :
                                 <CreditCard className="w-12 h-12 text-slate-400" />}
                                {scanStatus === "scanning" && <span className="absolute inset-0 rounded-full border-4 border-orange-400 animate-ping opacity-30" />}
                            </div>

                            <div className="text-center">
                                <div className="text-lg font-bold text-slate-800 mb-1">
                                    {scanStatus === "scanning" ? "Scanning... Please tap card" :
                                     scanStatus === "success" ? "Card Verified!" :
                                     scanStatus === "failed" ? "Scan Failed" : "Patient Health Card"}
                                </div>
                                <div className="text-sm text-slate-500">
                                    {scanStatus === "scanning" ? "Hold the card near the reader" :
                                     scanStatus === "success" ? "Loading family details..." :
                                     scanStatus === "failed" ? "Try again or use manual entry below" :
                                     "Scan the patient's NFC health card to begin"}
                                </div>
                            </div>

                            <Button size="lg" onClick={handleScanCard} disabled={scanning || loading}
                                className="h-14 px-10 text-base font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-md hover:shadow-lg transition-all gap-3">
                                {scanning ? <><Loader2 className="w-5 h-5 animate-spin" /> Scanning...</> :
                                 <><ScanLine className="w-5 h-5" /> Scan Card</>}
                            </Button>

                        </CardContent>
                    </Card>
                )}

                {/* ═══════════ STEP 2: SELECT FAMILY MEMBER ═══════════ */}
                {opdStep === "family" && family && (
                    <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <Users className="text-orange-600" /> {family.family_name}
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    Card Holder: {workerInfo?.name} ({workerInfo?.worker_id}) — Select the family member who needs consultation
                                </p>
                            </div>
                            <Button variant="outline" onClick={resetAll} className="gap-2 text-slate-600">
                                <ArrowLeft size={16} /> Back
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {family.members.map((member) => {
                                const age = calcAge(member.date_of_birth);
                                const isHead = member.relation === "SELF";
                                return (
                                    <Card key={member.id}
                                        className={`cursor-pointer border-2 transition-all hover:shadow-md hover:border-orange-300 ${
                                            isHead ? "border-orange-200 bg-orange-50/30" : "border-slate-200"
                                        }`}
                                        onClick={() => handleSelectMember(member)}>
                                        <CardContent className="p-5">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0 ${
                                                    isHead ? "bg-orange-100" : "bg-slate-100"
                                                }`}>
                                                    {member.gender === "Female" ? "👩" : member.gender === "Male" ? "👨" : "👤"}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-slate-800 text-lg truncate">{member.name}</div>
                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                        <Badge variant="outline" className={isHead ? "border-orange-300 text-orange-700 bg-orange-50" : "border-slate-200 text-slate-600"}>
                                                            {member.relation === "SELF" ? "PRIMARY CARD HOLDER" : member.relation}
                                                        </Badge>
                                                        {age !== null && <span className="text-xs text-slate-500">{age} yrs</span>}
                                                        {member.gender && <span className="text-xs text-slate-500">{member.gender}</span>}
                                                    </div>
                                                    {(member.blood_group || member.chronic_conditions) && (
                                                        <div className="flex gap-2 mt-2 flex-wrap">
                                                            {member.blood_group && <Badge variant="outline" className="text-xs border-slate-200">{member.blood_group}</Badge>}
                                                            {member.chronic_conditions && member.chronic_conditions !== "None" && (
                                                                <Badge variant="outline" className="text-xs border-red-200 text-red-600 bg-red-50">{member.chronic_conditions}</Badge>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <ArrowLeft className="w-5 h-5 text-slate-300 rotate-180 shrink-0" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ═══════════ STEP 3: SELECT DOCTOR ═══════════ */}
                {opdStep === "doctor" && selectedMember && (
                    <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <Stethoscope className="text-orange-600" /> Select Doctor
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    Patient: <b>{selectedMember.name}</b> ({selectedMember.relation}, {calcAge(selectedMember.date_of_birth)} yrs)
                                    — Choose the doctor for consultation
                                </p>
                            </div>
                            <Button variant="outline" onClick={() => setOpdStep("family")} className="gap-2 text-slate-600">
                                <ArrowLeft size={16} /> Back
                            </Button>
                        </div>

                        {doctors.length === 0 ? (
                            <Card className="border-dashed border-2 border-slate-200">
                                <CardContent className="p-10 flex flex-col items-center gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                                    <p className="text-slate-500">Loading doctors...</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {doctors.map((doc) => {
                                    const colorClass = SPECIALIZATION_COLORS[doc.specialization] || "bg-slate-50 text-slate-700 border-slate-200";
                                    return (
                                        <Card key={doc.id}
                                            className="cursor-pointer border-2 border-slate-200 transition-all hover:shadow-md hover:border-orange-300"
                                            onClick={() => handleSelectDoctor(doc)}>
                                            <CardContent className="p-5">
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${colorClass} border`}>
                                                        {SPECIALIZATION_ICONS[doc.specialization] || <Stethoscope size={20} />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-bold text-slate-800 truncate">{doc.name}</div>
                                                        <Badge className={`mt-1 text-xs border ${colorClass}`}>{doc.specialization}</Badge>
                                                        <div className="text-xs text-slate-500 mt-1.5">{doc.qualification}</div>
                                                        <div className="text-xs text-slate-400">{doc.experience_years} yrs experience</div>
                                                    </div>
                                                </div>
                                                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                                    <span className="text-xs text-slate-500">Queue Today</span>
                                                    <Badge variant="outline" className={`${
                                                        Number(doc.queue_count) > 5 ? "border-red-200 text-red-600 bg-red-50" :
                                                        Number(doc.queue_count) > 0 ? "border-amber-200 text-amber-600 bg-amber-50" :
                                                        "border-green-200 text-green-600 bg-green-50"
                                                    }`}>
                                                        {doc.queue_count} patients
                                                    </Badge>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ═══════════ STEP 4: CONFIRM & QUEUE ═══════════ */}
                {opdStep === "confirm" && selectedMember && selectedDoctor && (
                    <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Ticket className="text-orange-600" /> Confirm Queue Entry
                            </h2>
                            <Button variant="outline" onClick={() => setOpdStep("doctor")} className="gap-2 text-slate-600">
                                <ArrowLeft size={16} /> Back
                            </Button>
                        </div>

                        <Card className="border-2 border-orange-200 shadow-md overflow-hidden">
                            <div className="bg-gradient-to-r from-orange-600 to-orange-500 p-5 text-white">
                                <div className="text-sm text-orange-100 font-medium mb-1">OPD Queue Entry</div>
                                <div className="text-2xl font-bold">{establishmentName}</div>
                            </div>
                            <CardContent className="p-6 space-y-5">
                                {/* Patient Details */}
                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-xl shrink-0">
                                        {selectedMember.gender === "Female" ? "👩" : "👨"}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-lg">{selectedMember.name}</div>
                                        <div className="text-sm text-slate-500">
                                            {selectedMember.relation} • {calcAge(selectedMember.date_of_birth)} yrs • {selectedMember.gender}
                                            {selectedMember.blood_group && ` • ${selectedMember.blood_group}`}
                                        </div>
                                        {selectedMember.chronic_conditions && selectedMember.chronic_conditions !== "None" && (
                                            <Badge variant="outline" className="mt-1 text-xs border-red-200 text-red-600 bg-red-50">{selectedMember.chronic_conditions}</Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Doctor Details */}
                                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border ${
                                        SPECIALIZATION_COLORS[selectedDoctor.specialization] || "bg-slate-50 text-slate-700 border-slate-200"
                                    }`}>
                                        {SPECIALIZATION_ICONS[selectedDoctor.specialization] || <Stethoscope size={20} />}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-lg">{selectedDoctor.name}</div>
                                        <div className="text-sm text-slate-500">{selectedDoctor.specialization} • {selectedDoctor.qualification}</div>
                                        <div className="text-xs text-slate-400">Current queue: {selectedDoctor.queue_count} patients</div>
                                    </div>
                                </div>

                                {/* Intake Vitals */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Weight (Optional)</label>
                                        <div className="relative">
                                            <Input type="number" step="0.1" min="0" max="300" value={patientWeight} onChange={e => setPatientWeight(e.target.value)}
                                                placeholder="e.g. 65" className="h-10 pr-10" />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">kg</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Temperature (Optional)</label>
                                        <div className="relative">
                                            <Input type="number" step="0.1" min="90" max="110" value={patientTemp} onChange={e => setPatientTemp(e.target.value)}
                                                placeholder="e.g. 98.6" className="h-10 pr-10" />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">°F</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Visit Notes */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reason for Visit (Optional)</label>
                                    <Input value={visitNotes} onChange={e => setVisitNotes(e.target.value)}
                                        placeholder="e.g. Fever since 3 days, follow-up checkup..."
                                        className="h-10" />
                                </div>

                                <div className="flex gap-3 pt-3 border-t border-slate-100">
                                    <Button onClick={handleAddToQueue} disabled={submittingQueue}
                                        className="flex-1 h-12 bg-orange-600 hover:bg-orange-700 text-white text-base font-bold shadow-md gap-2">
                                        {submittingQueue ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5" />}
                                        Add to Doctor's Queue
                                    </Button>
                                    <Button variant="outline" onClick={() => setOpdStep("doctor")} className="h-12">Cancel</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* ═══════════ STEP 5: SUCCESS ═══════════ */}
                {opdStep === "success" && queueResult && (
                    <div className="flex flex-col items-center gap-6 py-8 animate-in zoom-in-95 fade-in duration-300">
                        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="w-10 h-10 text-green-600" />
                        </div>
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-green-700 mb-2">Patient Queued Successfully!</h2>
                            <p className="text-slate-500">The patient has been added to the doctor's queue</p>
                        </div>

                        <Card className="w-full max-w-md border-2 border-green-200 shadow-lg">
                            <CardContent className="p-6 text-center space-y-4">
                                <div className="text-6xl font-black text-orange-600">#{queueResult.token_number}</div>
                                <div className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Token Number</div>

                                <div className="border-t border-slate-100 pt-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Patient</span>
                                        <span className="font-semibold text-slate-800">{queueResult.patient_name}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Doctor</span>
                                        <span className="font-semibold text-slate-800">{queueResult.doctor_name}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Specialization</span>
                                        <span className="font-semibold text-slate-800">{queueResult.doctor_specialization}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Date</span>
                                        <span className="font-semibold text-slate-800">{new Date().toLocaleDateString("en-IN")}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Button onClick={resetAll} size="lg"
                            className="h-14 px-10 text-base font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-md gap-3">
                            <ScanLine className="w-5 h-5" /> Scan Next Card
                        </Button>
                    </div>
                )}

                {/* ═══════════ WORKER DETAIL VIEW (Fallback) ═══════════ */}
                {opdStep === "worker-detail" && worker && detailView === "dashboard" && (
                    <>
                        {/* Worker Header */}
                        <Card className="border-none shadow-md mb-6 overflow-hidden">
                            <div className="bg-gradient-to-r from-orange-600 to-orange-500 p-6 flex justify-between items-center text-white">
                                <div className="flex items-center gap-5">
                                    <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-4xl overflow-hidden border-4 border-white/30 shadow-sm shrink-0">
                                        {worker.photo_url ? (
                                            <img src={worker.photo_url} alt="Profile" className="w-full h-full object-cover"
                                                onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = `<span>${worker.gender === "Female" ? "👩" : "👨"}</span>`; }} />
                                        ) : (
                                            <span>{worker.gender === "Female" ? "👩" : "👨"}</span>
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-bold text-2xl mb-1">{worker.first_name} {worker.last_name}</div>
                                        <div className="text-orange-50 text-sm font-medium bg-orange-700/30 px-3 py-1 rounded inline-block mb-1">Card ID: {worker.worker_id}</div>
                                        <div className="text-orange-100 text-sm font-medium opacity-90">Age: {calcAge(worker.dob) || "N/A"} • Gender: {worker.gender}</div>
                                    </div>
                                </div>
                                <div className="text-right hidden sm:block">
                                    <div className="text-orange-100 text-base font-semibold">District: {worker.district}</div>
                                    <div className="text-orange-200 text-sm">Mandal: {worker.mandal}</div>
                                </div>
                            </div>
                            <CardContent className="p-5 bg-white">
                                <div className="flex flex-wrap gap-3 items-center">
                                    {worker.blood_group && <Badge variant="outline" className="border-slate-200 text-slate-700">Blood Group: <b className="ml-1 text-slate-900">{worker.blood_group}</b></Badge>}
                                    {worker.allergies && <Badge variant="outline" className="border-slate-200 text-slate-700">Allergies: <b className="ml-1 text-slate-900">{worker.allergies}</b></Badge>}
                                    {worker.chronic_conditions && <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">Chronic: <b className="ml-1">{worker.chronic_conditions}</b></Badge>}
                                    {worker.scheme_name && <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200 border-none">{worker.scheme_name}</Badge>}
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex gap-3 mb-6">
                            <Button onClick={() => setShowForm(!showForm)} className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm gap-2">
                                <Plus size={16} /> Record New Service
                            </Button>
                            <Button variant="outline" onClick={() => setDetailView("prescriptions")} className="border-orange-200 text-orange-700 hover:bg-orange-50 gap-2">
                                <FileText size={16} /> E-Prescription
                            </Button>
                            <Button variant="outline" onClick={resetAll} className="border-slate-300 text-slate-700 hover:bg-slate-50 gap-2">
                                <RefreshCw size={14} /> New Scan
                            </Button>
                        </div>

                        {/* New Record Form */}
                        {showForm && (
                            <Card className="border border-orange-200 shadow-sm mb-6 animate-in slide-in-from-top-2">
                                <CardHeader className="bg-orange-50/50 border-b border-orange-100 py-3">
                                    <CardTitle className="text-sm text-orange-800 flex items-center gap-2">
                                        <Plus className="w-4 h-4" /> Record New Service
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
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Diagnosis *</label>
                                            <Input value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} placeholder="e.g. Diabetes, Fever..." />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</label>
                                            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Monthly diabetes medicines" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Cost</label>
                                            <Input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} placeholder="0" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Govt Paid</label>
                                            <Input type="number" value={form.govt_paid} onChange={e => setForm(f => ({ ...f, govt_paid: e.target.value }))} placeholder="0" />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                                        <Button onClick={submitRecord} disabled={submitting} className="bg-orange-600 hover:bg-orange-700 text-white">
                                            {submitting ? <Loader2 size={14} className="animate-spin mr-2" /> : null} Save Record
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
                                                <tr>{["Date", "Doctor", "Department", "Status", "Notes"].map(h => <th key={h} className="px-4 py-3 text-xs uppercase tracking-wider">{h}</th>)}</tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {appointments.map((a) => (
                                                    <tr key={a.id} className="hover:bg-slate-50/50">
                                                        <td className="px-4 py-3 font-medium text-slate-700">{new Date(a.appointment_date).toLocaleDateString("en-IN")}</td>
                                                        <td className="px-4 py-3 text-slate-600">{a.doctor_name}</td>
                                                        <td className="px-4 py-3 text-slate-600">{a.department}</td>
                                                        <td className="px-4 py-3"><Badge className={a.status === "Scheduled" ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-green-50 text-green-700 border-green-100"}>{a.status}</Badge></td>
                                                        <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate">{a.notes}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Checkups */}
                        {checkups.length > 0 && (
                            <Card className="border-none shadow-sm mb-6 overflow-hidden">
                                <CardHeader className="bg-slate-50 border-b border-slate-100 py-3">
                                    <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <ClipboardList className="w-4 h-4 text-orange-600" /> Past Checkups
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
                                                <div className="text-xs text-slate-500 mt-1">Rx: {c.prescriptions}</div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Recent Records */}
                        <Card className="border-none shadow-sm mb-6 overflow-hidden">
                            <CardHeader className="bg-slate-50 border-b border-slate-100 py-3">
                                <CardTitle className="text-sm font-semibold text-slate-700">Recent Service Records</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                            <tr>{["Date", "Service", "Description", "Disease", "Cost", "Scheme"].map(h => <th key={h} className="px-4 py-3 text-xs uppercase tracking-wider">{h}</th>)}</tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {records.map((r) => (
                                                <tr key={r.id} className="hover:bg-slate-50/50">
                                                    <td className="px-4 py-3 font-medium text-slate-700">{new Date(r.created_at).toLocaleDateString("en-IN")}</td>
                                                    <td className="px-4 py-3 text-slate-600"><span className="flex items-center gap-2"><span className="text-orange-600 bg-orange-50 p-1 rounded-full">{SERVICE_ICONS[r.service_type]}</span>{r.service_type}</span></td>
                                                    <td className="px-4 py-3 text-slate-600">{r.description}</td>
                                                    <td className="px-4 py-3 text-slate-600">{r.diagnosis}</td>
                                                    <td className="px-4 py-3">{r.govt_paid > 0 ? <span className="text-green-600 font-medium text-xs bg-green-50 px-2 py-0.5 rounded border border-green-100">Free (Govt: {money(r.govt_paid)})</span> : <span className="font-medium text-slate-700">{money(r.cost)}</span>}</td>
                                                    <td className="px-4 py-3"><Badge style={{ background: SCHEME_COLORS[r.scheme_name] || "#64748b", color: "white" }} className="border-none font-normal">{r.scheme_name}</Badge></td>
                                                </tr>
                                            ))}
                                            {records.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400 text-sm">No records yet</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* E-Prescriptions View */}
                {opdStep === "worker-detail" && worker && detailView === "prescriptions" && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <FileText className="text-orange-600" /> E-Prescriptions for {worker.first_name} {worker.last_name}
                            </h2>
                            <Button variant="outline" onClick={() => setDetailView("dashboard")} className="gap-2 text-slate-600">
                                <ArrowLeft size={16} /> Back
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-teal-700 uppercase tracking-wide flex items-center gap-2">
                                <Clock size={16} /> Current Prescriptions
                            </h3>
                            <Card className="border border-teal-100 shadow-sm overflow-hidden">
                                <div className="bg-teal-50/50 p-4 border-b border-teal-100 flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-lg">Type 2 Diabetes Mellitus</h4>
                                        <div className="text-sm text-slate-500">Dr. Mohan • Guntur General Hospital</div>
                                    </div>
                                    <Badge className="bg-teal-600 hover:bg-teal-700 text-white border-none">Current</Badge>
                                </div>
                                <CardContent className="p-0">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                                            <tr><th className="px-6 py-3 font-semibold w-1/3">Medicine</th><th className="px-6 py-3 font-semibold">Dosage</th><th className="px-6 py-3 font-semibold">Duration</th><th className="px-6 py-3 font-semibold">Instructions</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            <tr><td className="px-6 py-4 font-medium text-slate-700">Metformin 500mg</td><td className="px-6 py-4 text-slate-600">1 - 0 - 1</td><td className="px-6 py-4 text-slate-600">30 days</td><td className="px-6 py-4 text-slate-600">After food</td></tr>
                                            <tr><td className="px-6 py-4 font-medium text-slate-700">Glimepiride 2mg</td><td className="px-6 py-4 text-slate-600">1 - 0 - 0</td><td className="px-6 py-4 text-slate-600">30 days</td><td className="px-6 py-4 text-slate-600">Before breakfast</td></tr>
                                        </tbody>
                                    </table>
                                    <div className="p-4 bg-slate-50/50 text-xs text-slate-500 border-t border-slate-100 italic">Note: Review HbA1c after 3 months</div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

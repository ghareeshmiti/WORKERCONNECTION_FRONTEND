import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, LogOut, Users, Clock, CheckCircle2, Play, Eye, FileText, Plus, Trash2, Heart, AlertCircle, RefreshCw, X, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

// ─── Dropdown options for E-Prescription ───
const DIAGNOSIS_OPTIONS = [
    "Acute Upper Respiratory Infection", "Viral Fever", "Dengue Fever", "Malaria", "Typhoid Fever",
    "Urinary Tract Infection", "Gastritis", "Acid Peptic Disease", "Acute Gastroenteritis", "Irritable Bowel Syndrome",
    "Type 2 Diabetes Mellitus", "Hypertension", "Hyperlipidemia", "Hypothyroidism", "Hyperthyroidism",
    "Iron Deficiency Anemia", "Vitamin D Deficiency", "Vitamin B12 Deficiency",
    "Migraine", "Tension Headache", "Vertigo", "Cervical Spondylosis", "Lumbar Spondylosis",
    "Osteoarthritis", "Rheumatoid Arthritis", "Gout",
    "Bronchial Asthma", "COPD", "Pneumonia", "Allergic Rhinitis", "Sinusitis",
    "Conjunctivitis", "Otitis Media", "Pharyngitis", "Tonsillitis",
    "Dermatitis", "Eczema", "Fungal Infection", "Scabies", "Urticaria",
    "Anxiety Disorder", "Depression", "Insomnia",
];

const SYMPTOM_OPTIONS = [
    "Fever", "Cough", "Cold / Runny Nose", "Sore Throat", "Body Pains",
    "Headache", "Dizziness", "Fatigue / Weakness", "Nausea", "Vomiting",
    "Diarrhea", "Constipation", "Abdominal Pain", "Chest Pain", "Breathlessness",
    "Joint Pain", "Back Pain", "Neck Pain", "Muscle Cramps",
    "Skin Rash", "Itching", "Swelling", "Burning Urination", "Frequent Urination",
    "Loss of Appetite", "Weight Loss", "Weight Gain", "Excessive Thirst",
    "Blurred Vision", "Ear Pain", "Nasal Congestion", "Sneezing",
    "Palpitations", "Numbness / Tingling", "Difficulty Sleeping",
];

const MEDICINE_OPTIONS = [
    "Tab. Paracetamol 500mg", "Tab. Paracetamol 650mg", "Tab. Dolo 650mg",
    "Tab. Azithromycin 500mg", "Tab. Amoxicillin 500mg", "Tab. Amoxicillin + Clavulanic Acid 625mg",
    "Tab. Cefixime 200mg", "Tab. Ciprofloxacin 500mg", "Tab. Ofloxacin 200mg",
    "Tab. Metformin 500mg", "Tab. Metformin 1000mg", "Tab. Glimepiride 1mg", "Tab. Glimepiride 2mg",
    "Tab. Amlodipine 5mg", "Tab. Amlodipine 10mg", "Tab. Telmisartan 40mg", "Tab. Telmisartan 80mg",
    "Tab. Atorvastatin 10mg", "Tab. Atorvastatin 20mg", "Tab. Rosuvastatin 10mg",
    "Tab. Pantoprazole 40mg", "Tab. Omeprazole 20mg", "Tab. Ranitidine 150mg",
    "Tab. Domperidone 10mg", "Tab. Ondansetron 4mg",
    "Tab. Cetirizine 10mg", "Tab. Levocetirizine 5mg", "Tab. Montelukast 10mg",
    "Tab. Diclofenac 50mg", "Tab. Ibuprofen 400mg", "Tab. Aceclofenac 100mg",
    "Tab. Prednisolone 5mg", "Tab. Prednisolone 10mg", "Tab. Methylprednisolone 4mg",
    "Tab. Levothyroxine 25mcg", "Tab. Levothyroxine 50mcg",
    "Tab. Iron + Folic Acid", "Tab. Calcium + Vitamin D3", "Tab. Vitamin B Complex",
    "Tab. Multivitamin", "Tab. Vitamin D3 60000 IU", "Tab. Methylcobalamin 1500mcg",
    "Cap. Rabeprazole 20mg + Domperidone 30mg", "Cap. Amoxicillin 500mg",
    "Syp. Ambroxol + Guaiphenesin", "Syp. Cough Suppressant (Dextromethorphan)",
    "Syp. ORS Sachets", "Syp. Lactulose",
    "Inj. Diclofenac 75mg", "Inj. Ondansetron 4mg", "Inj. Pantoprazole 40mg",
    "Cream Clotrimazole 1%", "Ointment Mupirocin 2%", "Lotion Calamine",
    "Eye Drops Moxifloxacin 0.5%", "Eye Drops Lubricant (Carboxymethylcellulose)",
    "Nasal Spray Fluticasone", "Inhaler Salbutamol 100mcg",
];

const DOSAGE_OPTIONS = [
    "1-0-0", "0-1-0", "0-0-1", "1-0-1", "1-1-1", "1-1-0", "0-1-1",
    "½-0-½", "½-½-½", "1-0-0 (empty stomach)", "0-0-1 (bedtime)",
    "1-1-1-1", "SOS (as needed)", "Once a week", "Once a day",
];

const FREQUENCY_OPTIONS = [
    "Before Food", "After Food", "With Food", "Empty Stomach",
    "Before Breakfast", "After Breakfast", "Before Lunch", "After Lunch",
    "Before Dinner", "After Dinner", "At Bedtime", "As Needed (SOS)",
];

const DURATION_OPTIONS = [
    "3 days", "5 days", "7 days", "10 days", "14 days",
    "1 month", "2 months", "3 months", "6 months",
    "Continue", "As directed",
];

const TEST_OPTIONS = [
    "CBC (Complete Blood Count)", "ESR", "CRP", "Blood Sugar Fasting", "Blood Sugar PP",
    "HbA1c", "Lipid Profile", "Liver Function Test (LFT)", "Kidney Function Test (KFT / RFT)",
    "Thyroid Profile (T3, T4, TSH)", "Serum Uric Acid", "Serum Calcium", "Serum Vitamin D",
    "Serum Vitamin B12", "Serum Iron / Ferritin", "Urine Routine & Microscopy",
    "Urine Culture & Sensitivity", "Chest X-Ray PA View", "X-Ray Spine",
    "ECG", "2D Echocardiography", "USG Abdomen", "USG KUB",
    "Dengue NS1 Antigen", "Dengue IgM/IgG", "Malaria Antigen (Rapid)", "Widal Test",
    "Blood Culture & Sensitivity", "Sputum for AFB", "Stool Routine",
    "HBsAg", "Anti-HCV", "HIV I & II", "RA Factor", "ANA Profile",
];

interface QueueEntry {
    id: string;
    token_number: number;
    status: string;
    patient_name: string;
    relation: string;
    gender: string;
    date_of_birth: string;
    blood_group?: string;
    allergies?: string;
    chronic_conditions?: string;
    family_name: string;
    family_member_id: string;
    family_id: string;
    notes?: string;
    queued_at: string;
    called_at?: string;
    completed_at?: string;
}

interface QueueSummary {
    total: number;
    waiting: number;
    in_consultation: number;
    completed: number;
}

interface PatientProfile {
    patient: QueueEntry & { patient_phone?: string; family_address?: string; family_district?: string; doctor_name?: string; specialization?: string };
    prescriptions: Prescription[];
    health_records: any[];
    family_members: { id: string; name: string; relation: string; gender: string; date_of_birth?: string; blood_group?: string; allergies?: string; chronic_conditions?: string; phone?: string }[];
    worker_info: { worker_id: string; first_name: string; last_name: string; phone?: string; district?: string; mandal?: string; card_uid?: string; photo_url?: string; scheme_name?: string; head_dob?: string; aadhaar_number?: string } | null;
    past_visits: { queued_at: string; status: string; notes?: string; token_number: number; doctor_name: string; specialization: string }[];
}

interface Prescription {
    id: string;
    diagnosis: string;
    symptoms?: string;
    vitals?: Record<string, string>;
    medicines?: Medicine[];
    tests_recommended?: string;
    advice?: string;
    follow_up_date?: string;
    doctor_name: string;
    specialization: string;
    created_at: string;
}

interface Medicine {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
}

interface DoctorProfile {
    id: string;
    name: string;
    specialization: string;
    qualification: string;
    hospital_name: string;
    establishment_id: string;
}

function calcAge(dob: string | null | undefined): number | null {
    if (!dob) return null;
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
}

const STATUS_STYLES: Record<string, string> = {
    WAITING: "bg-amber-50 text-amber-700 border-amber-200",
    IN_CONSULTATION: "bg-blue-50 text-blue-700 border-blue-200",
    COMPLETED: "bg-green-50 text-green-700 border-green-200",
    CANCELLED: "bg-slate-50 text-slate-500 border-slate-200",
};

// ─── Searchable Combo Select (dropdown + type custom) ───
function ComboSelect({ value, onChange, options, placeholder, className = "" }: {
    value: string; onChange: (v: string) => void; options: string[]; placeholder: string; className?: string;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const ref = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

    return (
        <div ref={ref} className={`relative ${className}`}>
            <div className="relative">
                <Input value={value} placeholder={placeholder}
                    onChange={e => { onChange(e.target.value); setSearch(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    className="h-9 text-sm pr-8" />
                <button type="button" onClick={() => setOpen(!open)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <ChevronDown size={14} />
                </button>
            </div>
            {open && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg">
                    {filtered.length === 0 ? (
                        <div className="p-2 text-xs text-slate-400 text-center">No matches — type custom value</div>
                    ) : filtered.map((opt, i) => (
                        <button key={i} type="button"
                            className={`w-full text-left px-3 py-1.5 text-sm hover:bg-orange-50 hover:text-orange-800 ${opt === value ? "bg-orange-50 text-orange-700 font-medium" : "text-slate-700"}`}
                            onClick={() => { onChange(opt); setSearch(""); setOpen(false); }}>
                            {opt}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Multi-select Tag Picker ───
function MultiTagSelect({ values, onChange, options, placeholder }: {
    values: string[]; onChange: (v: string[]) => void; options: string[]; placeholder: string;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const ref = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()) && !values.includes(o));

    return (
        <div ref={ref} className="relative">
            {values.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                    {values.map((v, i) => (
                        <span key={i} className="inline-flex items-center gap-1 bg-orange-50 border border-orange-200 text-orange-800 text-xs px-2 py-0.5 rounded-full">
                            {v}
                            <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))} className="text-orange-500 hover:text-red-500">
                                <X size={10} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <div className="relative">
                <Input value={search} placeholder={placeholder}
                    onChange={e => { setSearch(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={e => {
                        if (e.key === "Enter" && search.trim()) {
                            e.preventDefault();
                            if (!values.includes(search.trim())) onChange([...values, search.trim()]);
                            setSearch("");
                        }
                    }}
                    className="h-9 text-sm pr-8" />
                <button type="button" onClick={() => setOpen(!open)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <ChevronDown size={14} />
                </button>
            </div>
            {open && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg">
                    {filtered.length === 0 ? (
                        <div className="p-2 text-xs text-slate-400 text-center">{search ? "Press Enter to add custom" : "All selected"}</div>
                    ) : filtered.map((opt, i) => (
                        <button key={i} type="button"
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-orange-50 hover:text-orange-800 text-slate-700"
                            onClick={() => { onChange([...values, opt]); setSearch(""); }}>
                            {opt}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function DoctorDashboard() {
    const { userContext, signOut } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
    const [queue, setQueue] = useState<QueueEntry[]>([]);
    const [summary, setSummary] = useState<QueueSummary>({ total: 0, waiting: 0, in_consultation: 0, completed: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Patient view
    const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);
    const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
    const [patientLoading, setPatientLoading] = useState(false);
    const [patientTab, setPatientTab] = useState<"profile" | "history" | "prescriptions">("profile");

    // Prescription form
    const [showRxForm, setShowRxForm] = useState(false);
    const [rxForm, setRxForm] = useState({
        diagnosis: "",
        symptoms: [] as string[],
        bp: "",
        temperature: "",
        pulse: "",
        weight: "",
        spo2: "",
        tests_recommended: [] as string[],
        advice: "",
        follow_up_date: "",
    });
    const [medicines, setMedicines] = useState<Medicine[]>([{ name: "", dosage: "", frequency: "", duration: "", instructions: "" }]);
    const [rxSubmitting, setRxSubmitting] = useState(false);

    const doctorId = userContext?.doctorId;

    // Fetch doctor profile
    useEffect(() => {
        if (!userContext?.authUserId) return;
        fetch(`${API}/api/doctors/me/${userContext.authUserId}`)
            .then(r => r.json())
            .then(data => { if (data.id) setDoctorProfile(data); })
            .catch(console.error);
    }, [userContext?.authUserId]);

    // Fetch queue
    const fetchQueue = useCallback(async (showRefresh = false) => {
        if (!doctorId) return;
        if (showRefresh) setRefreshing(true);
        try {
            const today = new Date().toISOString().split("T")[0];
            const res = await fetch(`${API}/api/queue/doctor/${doctorId}?date=${today}`);
            if (!res.ok) throw new Error("Failed to fetch queue");
            const data = await res.json();
            setQueue(data.queue || []);
            setSummary(data.summary || { total: 0, waiting: 0, in_consultation: 0, completed: 0 });
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [doctorId, toast]);

    useEffect(() => { fetchQueue(); }, [fetchQueue]);

    // Real-time subscription on patient_queue
    useEffect(() => {
        if (!doctorId) return;
        const channel = supabase
            .channel("doctor-queue-" + doctorId)
            .on("postgres_changes", { event: "*", schema: "public", table: "patient_queue", filter: `doctor_id=eq.${doctorId}` },
                () => { fetchQueue(); }
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [doctorId, fetchQueue]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => fetchQueue(), 30000);
        return () => clearInterval(interval);
    }, [fetchQueue]);

    // Update queue status
    const updateStatus = async (queueId: string, status: string) => {
        try {
            const res = await fetch(`${API}/api/queue/${queueId}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error("Failed to update status");
            toast({ title: "Updated", description: `Patient status: ${status}` });
            // If completed, close the patient panel and return to queue
            if (status === "COMPLETED") {
                setSelectedQueueId(null);
                setPatientProfile(null);
                setShowRxForm(false);
                resetRxForm();
            }
            fetchQueue();
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    };

    // View patient profile
    const viewPatient = async (queueId: string) => {
        setSelectedQueueId(queueId);
        setPatientLoading(true);
        setPatientTab("profile");
        try {
            const res = await fetch(`${API}/api/queue/${queueId}/patient-profile`);
            if (!res.ok) throw new Error("Failed to load patient");
            const data = await res.json();
            setPatientProfile(data);
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setPatientLoading(false);
        }
    };

    // Start consultation (change status + open patient view)
    const startConsultation = async (entry: QueueEntry) => {
        await updateStatus(entry.id, "IN_CONSULTATION");
        viewPatient(entry.id);
    };

    // Submit prescription
    const submitPrescription = async () => {
        if (!patientProfile || !selectedQueueId || !doctorId) return;
        if (!rxForm.diagnosis.trim()) {
            toast({ title: "Required", description: "Please enter diagnosis", variant: "destructive" });
            return;
        }
        setRxSubmitting(true);
        try {
            const vitals: Record<string, string> = {};
            if (rxForm.bp) vitals.bp = rxForm.bp;
            if (rxForm.temperature) vitals.temperature = rxForm.temperature;
            if (rxForm.pulse) vitals.pulse = rxForm.pulse;
            if (rxForm.weight) vitals.weight = rxForm.weight;
            if (rxForm.spo2) vitals.spo2 = rxForm.spo2;

            const validMedicines = medicines.filter(m => m.name.trim());

            const res = await fetch(`${API}/api/prescriptions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    queue_id: selectedQueueId,
                    doctor_id: doctorId,
                    family_member_id: patientProfile.patient.family_member_id,
                    establishment_id: doctorProfile?.establishment_id,
                    diagnosis: rxForm.diagnosis,
                    symptoms: rxForm.symptoms.length > 0 ? rxForm.symptoms.join(", ") : null,
                    vitals: Object.keys(vitals).length > 0 ? vitals : null,
                    medicines: validMedicines.length > 0 ? validMedicines : null,
                    tests_recommended: rxForm.tests_recommended.length > 0 ? rxForm.tests_recommended.join(", ") : null,
                    advice: rxForm.advice || null,
                    follow_up_date: rxForm.follow_up_date || null,
                }),
            });
            if (!res.ok) throw new Error(await res.text());
            toast({ title: "Prescription Saved", description: "Patient marked as completed." });
            setShowRxForm(false);
            setSelectedQueueId(null);
            setPatientProfile(null);
            resetRxForm();
            fetchQueue();
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setRxSubmitting(false);
        }
    };

    const resetRxForm = () => {
        setRxForm({ diagnosis: "", symptoms: [], bp: "", temperature: "", pulse: "", weight: "", spo2: "", tests_recommended: [], advice: "", follow_up_date: "" });
        setMedicines([{ name: "", dosage: "", frequency: "", duration: "", instructions: "" }]);
    };

    const addMedicine = () => setMedicines(prev => [...prev, { name: "", dosage: "", frequency: "", duration: "", instructions: "" }]);
    const removeMedicine = (i: number) => setMedicines(prev => prev.filter((_, idx) => idx !== i));
    const updateMedicine = (i: number, field: keyof Medicine, value: string) => {
        setMedicines(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
    };

    const closePatientView = () => {
        setSelectedQueueId(null);
        setPatientProfile(null);
        setShowRxForm(false);
        resetRxForm();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-8">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-20 shadow-sm border-t-4 border-t-orange-600">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/opoc/ap-logo.png" alt="AP Govt" className="w-12 h-12 object-contain" />
                        <div className="flex flex-col">
                            <span className="text-xl font-black text-orange-700 leading-none tracking-tight">
                                {doctorProfile?.hospital_name || "Hospital"}
                            </span>
                            <span className="text-xs text-slate-500 font-bold tracking-widest mt-1">
                                AP HEALTH DEPARTMENT — DOCTOR DASHBOARD
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <div className="text-sm font-bold text-slate-700">{doctorProfile?.name || "Doctor"}</div>
                            <div className="text-xs text-slate-500">{doctorProfile?.specialization} • {doctorProfile?.qualification}</div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => fetchQueue(true)} disabled={refreshing} className="gap-2">
                            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
                        </Button>
                        <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/"); }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50">
                            <LogOut className="w-4 h-4 mr-2" /> Log Out
                        </Button>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-6 max-w-6xl">

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card className="border-none shadow-sm">
                        <CardContent className="p-4 text-center">
                            <div className="text-3xl font-black text-slate-800">{summary.total}</div>
                            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">Total Today</div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm bg-amber-50/50">
                        <CardContent className="p-4 text-center">
                            <div className="text-3xl font-black text-amber-700">{summary.waiting}</div>
                            <div className="text-xs text-amber-600 font-semibold uppercase tracking-wider mt-1">Waiting</div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm bg-blue-50/50">
                        <CardContent className="p-4 text-center">
                            <div className="text-3xl font-black text-blue-700">{summary.in_consultation}</div>
                            <div className="text-xs text-blue-600 font-semibold uppercase tracking-wider mt-1">In Consultation</div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm bg-green-50/50">
                        <CardContent className="p-4 text-center">
                            <div className="text-3xl font-black text-green-700">{summary.completed}</div>
                            <div className="text-xs text-green-600 font-semibold uppercase tracking-wider mt-1">Completed</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1">

                    {/* Patient Queue List — hidden when viewing a patient */}
                    {!selectedQueueId && <Card className="border-none shadow-md overflow-hidden">
                        <CardHeader className="bg-white border-b border-slate-100 py-3 px-5">
                            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Users className="w-4 h-4 text-orange-600" /> Patient Queue — {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {queue.length === 0 ? (
                                <div className="p-12 text-center">
                                    <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <div className="text-slate-500 font-medium">No patients in queue yet</div>
                                    <div className="text-sm text-slate-400 mt-1">Patients will appear here when added by the front desk</div>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {queue.map((entry) => {
                                        const age = calcAge(entry.date_of_birth);
                                        const isActive = entry.id === selectedQueueId;
                                        const waitTime = entry.queued_at ? Math.floor((Date.now() - new Date(entry.queued_at).getTime()) / 60000) : 0;

                                        return (
                                            <div key={entry.id} className={`p-4 transition-all ${isActive ? "bg-orange-50 border-l-4 border-l-orange-500" : "hover:bg-slate-50/50"}`}>
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-600 shrink-0">
                                                            {entry.token_number}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-bold text-slate-800 truncate">{entry.patient_name}</div>
                                                            <div className="text-xs text-slate-500">
                                                                {entry.relation} • {age ? `${age} yrs` : "N/A"} • {entry.gender}
                                                                {entry.blood_group && ` • ${entry.blood_group}`}
                                                            </div>
                                                            {entry.notes && <div className="text-xs text-slate-400 mt-0.5 truncate italic">{entry.notes}</div>}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <Badge variant="outline" className={STATUS_STYLES[entry.status] || ""}>{entry.status.replace("_", " ")}</Badge>

                                                        {entry.status === "WAITING" && (
                                                            <>
                                                                <span className="text-xs text-slate-400">{waitTime}m</span>
                                                                <Button size="sm" onClick={() => startConsultation(entry)}
                                                                    className="bg-orange-600 hover:bg-orange-700 text-white gap-1 h-8">
                                                                    <Play size={12} /> Start
                                                                </Button>
                                                            </>
                                                        )}
                                                        {entry.status === "IN_CONSULTATION" && (
                                                            <Button size="sm" variant="outline" onClick={() => viewPatient(entry.id)}
                                                                className="border-blue-200 text-blue-700 hover:bg-blue-50 gap-1 h-8">
                                                                <Eye size={12} /> View
                                                            </Button>
                                                        )}
                                                        {entry.status === "COMPLETED" && (
                                                            <Button size="sm" variant="ghost" onClick={() => viewPatient(entry.id)}
                                                                className="text-slate-500 gap-1 h-8">
                                                                <Eye size={12} /> View
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                                {entry.chronic_conditions && entry.chronic_conditions !== "None" && (
                                                    <div className="mt-2 ml-13">
                                                        <Badge variant="outline" className="text-xs border-red-200 text-red-600 bg-red-50">
                                                            <AlertCircle size={10} className="mr-1" /> {entry.chronic_conditions}
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>}

                    {/* Patient Detail Panel — full width */}
                    {selectedQueueId && (
                        <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
                            {patientLoading ? (
                                <Card className="border-none shadow-md"><CardContent className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-600" /></CardContent></Card>
                            ) : patientProfile ? (
                                <>
                                    {/* Patient Header */}
                                    <Card className="border-none shadow-md overflow-hidden">
                                        <div className="bg-gradient-to-r from-orange-600 to-orange-500 p-5 text-white">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    {patientProfile.worker_info?.photo_url ? (
                                                        <img src={patientProfile.worker_info.photo_url} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-white/30 shadow" />
                                                    ) : (
                                                        <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl border-2 border-white/30">
                                                            {patientProfile.patient.gender === "Female" ? "👩" : "👨"}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-bold text-xl">{patientProfile.patient.patient_name}</div>
                                                        <div className="text-orange-100 text-sm">
                                                            {patientProfile.patient.relation} • {calcAge(patientProfile.patient.date_of_birth)} yrs • {patientProfile.patient.gender}
                                                            {patientProfile.patient.blood_group && ` • ${patientProfile.patient.blood_group}`}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="sm" onClick={closePatientView}
                                                    className="text-white hover:bg-white/20 border border-white/30 gap-1.5 px-3">
                                                    <X size={16} /> Close
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Alerts */}
                                        {(patientProfile.patient.allergies || patientProfile.patient.chronic_conditions) && (
                                            <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex flex-wrap gap-2">
                                                {patientProfile.patient.allergies && patientProfile.patient.allergies !== "None" && (
                                                    <Badge variant="outline" className="border-red-200 text-red-700 bg-white">Allergies: {patientProfile.patient.allergies}</Badge>
                                                )}
                                                {patientProfile.patient.chronic_conditions && patientProfile.patient.chronic_conditions !== "None" && (
                                                    <Badge variant="outline" className="border-red-200 text-red-700 bg-white">Chronic: {patientProfile.patient.chronic_conditions}</Badge>
                                                )}
                                            </div>
                                        )}

                                        {/* Tabs */}
                                        <div className="flex border-b border-slate-100">
                                            {(["profile", "history", "prescriptions"] as const).map(tab => (
                                                <button key={tab} onClick={() => setPatientTab(tab)}
                                                    className={`flex-1 py-2.5 text-sm font-semibold capitalize transition-all ${
                                                        patientTab === tab ? "text-orange-700 border-b-2 border-orange-600 bg-orange-50/50" : "text-slate-500 hover:text-slate-700"
                                                    }`}>
                                                    {tab}
                                                </button>
                                            ))}
                                        </div>

                                        <CardContent className="p-5 max-h-[75vh] overflow-y-auto">
                                            {/* Profile Tab */}
                                            {patientTab === "profile" && (
                                                <div className="space-y-5 text-sm">
                                                    {/* ─── OPD VISIT DETAILS ─── */}
                                                    <div>
                                                        <div className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-3">OPD Visit Details</div>
                                                        <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                                                            {/* Token & Queue Info */}
                                                            <div className="flex items-center gap-3 mb-3">
                                                                <div className="w-12 h-12 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-lg">
                                                                    #{patientProfile.patient.token_number}
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-slate-500">Token Number</div>
                                                                    <div className="font-semibold text-slate-800">
                                                                        Queued at {new Date(patientProfile.patient.queued_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                                                    </div>
                                                                </div>
                                                                <Badge className={`ml-auto ${STATUS_STYLES[patientProfile.patient.status]}`}>
                                                                    {patientProfile.patient.status.replace("_", " ")}
                                                                </Badge>
                                                            </div>

                                                            {/* Reason for Visit */}
                                                            {patientProfile.patient.notes && (
                                                                <div className="p-3 bg-white rounded-lg border border-amber-100 mb-3">
                                                                    <div className="text-[10px] font-bold text-amber-600 uppercase mb-1">Purpose of Consultation</div>
                                                                    <div className="text-slate-800 font-medium">{patientProfile.patient.notes}</div>
                                                                </div>
                                                            )}

                                                            {/* Intake Vitals */}
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="p-3 bg-white rounded-lg border border-blue-100 text-center">
                                                                    <div className="text-[10px] font-bold text-blue-500 uppercase">Weight</div>
                                                                    <div className="text-xl font-bold text-blue-800">
                                                                        {(patientProfile.patient as any).intake_vitals?.weight || "—"}
                                                                    </div>
                                                                </div>
                                                                <div className="p-3 bg-white rounded-lg border border-red-100 text-center">
                                                                    <div className="text-[10px] font-bold text-red-500 uppercase">Temperature</div>
                                                                    <div className="text-xl font-bold text-red-800">
                                                                        {(patientProfile.patient as any).intake_vitals?.temperature || "—"}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Patient Details */}
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Patient Details</div>
                                                        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-5 text-center text-slate-400">👤</span>
                                                                <div><div className="text-[10px] text-slate-400">Full Name</div><div className="font-semibold text-slate-800">{patientProfile.patient.patient_name}</div></div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-5 text-center text-slate-400">🏷</span>
                                                                <div><div className="text-[10px] text-slate-400">Relation</div><div className="font-semibold text-slate-800">{patientProfile.patient.relation}</div></div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-5 text-center text-slate-400">📅</span>
                                                                <div><div className="text-[10px] text-slate-400">Age</div><div className="font-semibold text-slate-800">{calcAge(patientProfile.patient.date_of_birth)} years</div></div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-5 text-center text-slate-400">⚧</span>
                                                                <div><div className="text-[10px] text-slate-400">Gender</div><div className="font-semibold text-slate-800">{patientProfile.patient.gender}</div></div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-5 text-center text-red-400">🩸</span>
                                                                <div><div className="text-[10px] text-slate-400">Blood Group</div><div className="font-semibold text-slate-800">{patientProfile.patient.blood_group || "N/A"}</div></div>
                                                            </div>
                                                            {patientProfile.patient.patient_phone && (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="w-5 text-center text-slate-400">📞</span>
                                                                    <div><div className="text-[10px] text-slate-400">Phone</div><div className="font-semibold text-slate-800">{patientProfile.patient.patient_phone}</div></div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Medical Alerts */}
                                                    {(patientProfile.patient.allergies && patientProfile.patient.allergies !== "None") || (patientProfile.patient.chronic_conditions && patientProfile.patient.chronic_conditions !== "None") ? (
                                                        <div>
                                                            <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3">Medical Alerts</div>
                                                            <div className="space-y-2">
                                                                {patientProfile.patient.allergies && patientProfile.patient.allergies !== "None" && (
                                                                    <div className="p-3 bg-red-50 rounded-lg border border-red-100 flex items-start gap-2">
                                                                        <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                                                                        <div><div className="text-[10px] font-bold text-red-500 uppercase">Allergies</div><div className="text-red-800 font-medium">{patientProfile.patient.allergies}</div></div>
                                                                    </div>
                                                                )}
                                                                {patientProfile.patient.chronic_conditions && patientProfile.patient.chronic_conditions !== "None" && (
                                                                    <div className="p-3 bg-orange-50 rounded-lg border border-orange-100 flex items-start gap-2">
                                                                        <Heart size={14} className="text-orange-500 mt-0.5 shrink-0" />
                                                                        <div><div className="text-[10px] font-bold text-orange-500 uppercase">Chronic Conditions</div><div className="text-orange-800 font-medium">{patientProfile.patient.chronic_conditions}</div></div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : null}

                                                    {/* Card Holder / Worker Info */}
                                                    {patientProfile.worker_info && (
                                                        <div>
                                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Card Holder Details</div>
                                                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                                <div className="flex items-center gap-3 mb-3">
                                                                    {patientProfile.worker_info.photo_url ? (
                                                                        <img src={patientProfile.worker_info.photo_url} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow" />
                                                                    ) : (
                                                                        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-lg font-bold text-orange-700">
                                                                            {patientProfile.worker_info.first_name?.[0]}{patientProfile.worker_info.last_name?.[0]}
                                                                        </div>
                                                                    )}
                                                                    <div>
                                                                        <div className="font-bold text-slate-800">{patientProfile.worker_info.first_name} {patientProfile.worker_info.last_name}</div>
                                                                        <div className="text-xs text-slate-500">Card ID: {patientProfile.worker_info.worker_id}</div>
                                                                    </div>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                                    {patientProfile.worker_info.card_uid && (
                                                                        <div><span className="text-slate-400">NFC UID:</span> <span className="font-mono font-medium text-slate-700">{patientProfile.worker_info.card_uid}</span></div>
                                                                    )}
                                                                    {patientProfile.worker_info.district && (
                                                                        <div><span className="text-slate-400">District:</span> <span className="font-medium text-slate-700">{patientProfile.worker_info.district}</span></div>
                                                                    )}
                                                                    {patientProfile.worker_info.mandal && (
                                                                        <div><span className="text-slate-400">Mandal:</span> <span className="font-medium text-slate-700">{patientProfile.worker_info.mandal}</span></div>
                                                                    )}
                                                                    {patientProfile.worker_info.phone && (
                                                                        <div><span className="text-slate-400">Phone:</span> <span className="font-medium text-slate-700">{patientProfile.worker_info.phone}</span></div>
                                                                    )}
                                                                    {patientProfile.worker_info.scheme_name && (
                                                                        <div className="col-span-2">
                                                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">{patientProfile.worker_info.scheme_name}</Badge>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Family Members */}
                                                    {patientProfile.family_members && patientProfile.family_members.length > 1 && (
                                                        <div>
                                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Family Members ({patientProfile.family_members.length})</div>
                                                            <div className="space-y-2">
                                                                {patientProfile.family_members.map((fm) => {
                                                                    const fmAge = calcAge(fm.date_of_birth);
                                                                    const isCurrent = fm.id === patientProfile.patient.family_member_id;
                                                                    return (
                                                                        <div key={fm.id} className={`p-2.5 rounded-lg border text-xs flex items-center gap-3 ${isCurrent ? "bg-orange-50 border-orange-200" : "bg-white border-slate-100"}`}>
                                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${isCurrent ? "bg-orange-200 text-orange-800" : "bg-slate-100 text-slate-600"}`}>
                                                                                {fm.gender === "Female" ? "👩" : "👨"}
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                                                                    {fm.name} {isCurrent && <Badge className="bg-orange-600 text-white text-[9px] px-1.5 py-0 h-4">Current Patient</Badge>}
                                                                                </div>
                                                                                <div className="text-slate-500">{fm.relation} {fmAge ? `• ${fmAge} yrs` : ""} {fm.blood_group ? `• ${fm.blood_group}` : ""}</div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* History Tab */}
                                            {patientTab === "history" && (
                                                <div className="space-y-5">
                                                    {/* Past Visits */}
                                                    {patientProfile.past_visits && patientProfile.past_visits.length > 0 && (
                                                        <div>
                                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Past OPD Visits</div>
                                                            <div className="space-y-2">
                                                                {patientProfile.past_visits.map((v, i) => (
                                                                    <div key={i} className="p-3 border border-slate-100 rounded-lg text-sm flex items-center justify-between">
                                                                        <div>
                                                                            <div className="font-semibold text-slate-800">{v.doctor_name}</div>
                                                                            <div className="text-xs text-slate-500">{v.specialization} {v.notes ? `• ${v.notes}` : ""}</div>
                                                                        </div>
                                                                        <div className="text-right shrink-0">
                                                                            <div className="text-xs text-slate-400">{new Date(v.queued_at).toLocaleDateString("en-IN")}</div>
                                                                            <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[v.status] || ""}`}>{v.status}</Badge>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Health Records */}
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Health Records</div>
                                                        {patientProfile.health_records.length === 0 && (!patientProfile.past_visits || patientProfile.past_visits.length === 0) ? (
                                                            <div className="text-center text-slate-400 py-6">No history found for this patient</div>
                                                        ) : patientProfile.health_records.length === 0 ? (
                                                            <div className="text-center text-slate-400 py-4 text-xs">No hospital records found</div>
                                                        ) : patientProfile.health_records.map((r: any) => (
                                                            <div key={r.id} className="p-3 border border-slate-100 rounded-lg text-sm mb-2">
                                                                <div className="flex justify-between items-start">
                                                                    <div className="font-semibold text-slate-800">{r.diagnosis || r.service_type}</div>
                                                                    <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString("en-IN")}</span>
                                                                </div>
                                                                <div className="text-xs text-slate-500 mt-1">{r.service_type} {r.description ? `• ${r.description}` : ""}</div>
                                                                {r.hospital_name && <div className="text-xs text-slate-400 mt-0.5">{r.hospital_name}</div>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Prescriptions Tab */}
                                            {patientTab === "prescriptions" && (
                                                <div className="space-y-3">
                                                    {patientProfile.prescriptions.length === 0 ? (
                                                        <div className="text-center text-slate-400 py-6">No prescriptions found</div>
                                                    ) : patientProfile.prescriptions.map((rx) => (
                                                        <div key={rx.id} className="p-3 border border-slate-100 rounded-lg text-sm">
                                                            <div className="flex justify-between items-start">
                                                                <div className="font-semibold text-slate-800">{rx.diagnosis}</div>
                                                                <span className="text-xs text-slate-400">{new Date(rx.created_at).toLocaleDateString("en-IN")}</span>
                                                            </div>
                                                            <div className="text-xs text-slate-500">{rx.doctor_name} • {rx.specialization}</div>
                                                            {rx.vitals && Object.keys(rx.vitals).length > 0 && (
                                                                <div className="mt-2 flex flex-wrap gap-2">
                                                                    {Object.entries(rx.vitals).map(([k, v]) => (
                                                                        <span key={k} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">{k}: {v}</span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {rx.medicines && rx.medicines.length > 0 && (
                                                                <div className="mt-2 space-y-1">
                                                                    {rx.medicines.map((m, i) => (
                                                                        <div key={i} className="text-xs bg-slate-50 p-1.5 rounded">
                                                                            <b>{m.name}</b> — {m.dosage} — {m.frequency} — {m.duration}
                                                                            {m.instructions && <span className="text-slate-400"> ({m.instructions})</span>}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {rx.tests_recommended && <div className="text-xs text-slate-500 mt-1">Tests: {rx.tests_recommended}</div>}
                                                            {rx.advice && <div className="text-xs text-slate-500 mt-1 italic">Advice: {rx.advice}</div>}
                                                            {rx.follow_up_date && <div className="text-xs text-orange-600 mt-1 font-medium">Follow-up: {new Date(rx.follow_up_date).toLocaleDateString("en-IN")}</div>}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Action Buttons */}
                                    {patientProfile.patient.status !== "COMPLETED" && !showRxForm && (
                                        <div className="flex gap-3">
                                            <Button onClick={() => setShowRxForm(true)} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white gap-2 h-11">
                                                <FileText size={16} /> Write E-Prescription
                                            </Button>
                                            <Button variant="outline" onClick={() => updateStatus(selectedQueueId!, "COMPLETED")}
                                                className="border-orange-200 text-orange-700 hover:bg-orange-50 gap-2 h-11">
                                                <CheckCircle2 size={16} /> Complete
                                            </Button>
                                        </div>
                                    )}

                                    {/* Back to Queue button for completed patients */}
                                    {patientProfile.patient.status === "COMPLETED" && !showRxForm && (
                                        <Button variant="outline" onClick={closePatientView}
                                            className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 gap-2 h-11">
                                            <X size={16} /> Back to Queue
                                        </Button>
                                    )}

                                    {/* E-Prescription Form */}
                                    {showRxForm && (
                                        <Card className="border-2 border-orange-200 shadow-md animate-in slide-in-from-bottom-4 duration-300">
                                            <CardHeader className="bg-orange-50 border-b border-orange-100 py-3 px-5">
                                                <CardTitle className="text-sm font-bold text-orange-800 flex items-center gap-2">
                                                    <FileText size={16} /> E-Prescription — {patientProfile.patient.patient_name}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-5 space-y-5">
                                                {/* Diagnosis */}
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Diagnosis *</label>
                                                    <ComboSelect value={rxForm.diagnosis} onChange={v => setRxForm(f => ({ ...f, diagnosis: v }))}
                                                        options={DIAGNOSIS_OPTIONS} placeholder="Search or type diagnosis..." />
                                                </div>

                                                {/* Symptoms — multi-select */}
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Symptoms</label>
                                                    <MultiTagSelect values={rxForm.symptoms} onChange={v => setRxForm(f => ({ ...f, symptoms: v }))}
                                                        options={SYMPTOM_OPTIONS} placeholder="Search & select symptoms..." />
                                                </div>

                                                {/* Vitals */}
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Vitals</label>
                                                    <div className="grid grid-cols-5 gap-2">
                                                        <Input placeholder="BP (e.g. 120/80)" value={rxForm.bp} onChange={e => setRxForm(f => ({ ...f, bp: e.target.value }))} className="text-sm h-9" />
                                                        <Input placeholder="Temp °F" value={rxForm.temperature} onChange={e => setRxForm(f => ({ ...f, temperature: e.target.value }))} className="text-sm h-9" />
                                                        <Input placeholder="Pulse bpm" value={rxForm.pulse} onChange={e => setRxForm(f => ({ ...f, pulse: e.target.value }))} className="text-sm h-9" />
                                                        <Input placeholder="Weight kg" value={rxForm.weight} onChange={e => setRxForm(f => ({ ...f, weight: e.target.value }))} className="text-sm h-9" />
                                                        <Input placeholder="SpO2 %" value={rxForm.spo2} onChange={e => setRxForm(f => ({ ...f, spo2: e.target.value }))} className="text-sm h-9" />
                                                    </div>
                                                </div>

                                                {/* Medicines */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Medicines</label>
                                                        <Button size="sm" variant="outline" onClick={addMedicine} className="h-7 text-xs gap-1">
                                                            <Plus size={12} /> Add
                                                        </Button>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {medicines.map((med, i) => (
                                                            <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-bold text-slate-400 w-5">{i + 1}.</span>
                                                                    <ComboSelect value={med.name} onChange={v => updateMedicine(i, "name", v)}
                                                                        options={MEDICINE_OPTIONS} placeholder="Search medicine..." className="flex-1" />
                                                                    <Button variant="ghost" size="sm" onClick={() => removeMedicine(i)} className="h-9 w-9 p-0 text-red-400 hover:text-red-600 shrink-0">
                                                                        <Trash2 size={14} />
                                                                    </Button>
                                                                </div>
                                                                <div className="grid grid-cols-3 gap-2 ml-7">
                                                                    <ComboSelect value={med.dosage} onChange={v => updateMedicine(i, "dosage", v)}
                                                                        options={DOSAGE_OPTIONS} placeholder="Dosage" />
                                                                    <ComboSelect value={med.frequency} onChange={v => updateMedicine(i, "frequency", v)}
                                                                        options={FREQUENCY_OPTIONS} placeholder="Frequency" />
                                                                    <ComboSelect value={med.duration} onChange={v => updateMedicine(i, "duration", v)}
                                                                        options={DURATION_OPTIONS} placeholder="Duration" />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Tests — multi-select */}
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tests Recommended</label>
                                                    <MultiTagSelect values={rxForm.tests_recommended} onChange={v => setRxForm(f => ({ ...f, tests_recommended: v }))}
                                                        options={TEST_OPTIONS} placeholder="Search & select tests..." />
                                                </div>

                                                {/* Follow-up & Advice */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Follow-up Date</label>
                                                        <Input type="date" value={rxForm.follow_up_date}
                                                            onChange={e => setRxForm(f => ({ ...f, follow_up_date: e.target.value }))} className="h-9" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Advice / Notes</label>
                                                        <Input value={rxForm.advice} onChange={e => setRxForm(f => ({ ...f, advice: e.target.value }))}
                                                            placeholder="e.g. Avoid sugar, exercise 30 mins daily" className="h-9" />
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex gap-3 pt-3 border-t border-slate-100">
                                                    <Button onClick={submitPrescription} disabled={rxSubmitting}
                                                        className="flex-1 bg-orange-600 hover:bg-orange-700 text-white h-11 gap-2">
                                                        {rxSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 size={16} />}
                                                        Save Prescription & Complete
                                                    </Button>
                                                    <Button variant="outline" onClick={() => setShowRxForm(false)} className="h-11">Cancel</Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </>
                            ) : null}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

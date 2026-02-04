import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock, LogOut, User, Calendar, CheckCircle, AlertCircle, XCircle,
  Loader2, Download, Building2, Heart, Gift, MessageSquare, HelpCircle,
  QrCode, ChevronRight, MapPin, Pill
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import QRCode from "react-qr-code";
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- DUMMY DATA ---
const DUMMY_DATA = {
  profile: {
    first_name: "Ramesh",
    last_name: "Kumar",
    worker_id: "WKR-AP-2026-00145",
    aadhaar_number: "XXXX XXXX 1234",
    phone_number: "9876543210",
    establishment: "Sarika's Construction",
    location: "Guntur, Andhra Pradesh",
    email: "ramesh.kumar@email.com",
    photo_url: "",

    // Extended Profile
    dob: "15 Aug 1985",
    raw_dob: "1985-08-15",
    age: 40,
    gender: "Male",
    father_name: "Suresh Kumar",
    joining_date: "10 Mar 2023",
    designation: "Site Supervisor",
    status: "Active",
    address: "CN-12, 4th Line, Brundavan Gardens, Guntur, Andhra Pradesh - 522006",

    // Bank Details
    bank_name: "State Bank of India",
    account_number: "XXXX XXXX 8921",
    ifsc: "SBIN0001234",
    bank_branch: "Guntur Main Branch",

    // Identifiers
    eshram_id: "455222736053",
    bocw_id: "ABOCWWB/32/2025/1/55069988",
    esi_number: "5222736053",
    pf_number: "AP/MAS/0054055/000/0000250",
    mgnregs_id: "AP-03-033-035-034/060016",
    trade_union_id: "H-165"
  },
  documents: [
    { name: "Aadhaar Card", type: "ID Proof", date: "10 Mar 2022", status: "Verified" },
    { name: "Voter ID", type: "ID Proof", date: "10 Mar 2022", status: "Verified" },
    { name: "Ration Card", type: "Address Proof", date: "10 Mar 2022", status: "Verified" },
    { name: "BOCW Registration", type: "Registration Certificate", date: "20 Aug 2021", status: "Verified" },
    { name: "e-Shram Card", type: "Registration Certificate", date: "15 May 2022", status: "Verified" }
  ],
  faqs: [
    { q: "How do I change my mobile number?", a: "Please visit your nearest MeeSeva centre or department office with your new mobile number and Aadhaar card to update it." },
    { q: "I don't see my schemes – what should I do?", a: "Ensure your profile and work history are up to date. If you still don't see eligible schemes, contact the support helpline." },
    { q: "How do I reset my PIN?", a: "You can reset your PIN from the login screen by clicking on 'Forgot PIN' and verifying your mobile number using OTP." },
    { q: "My attendance is not showing correctly. What should I do?", a: "Raise a grievance under 'Attendance & Wages' category with specific dates and details. Your site supervisor will be notified." },
    { q: "How can I add a family member for health benefits?", a: "Family members can be added through the 'Profile' tab or by visiting the department office with their Aadhaar cards." },
    { q: "When will I receive my scheme benefits?", a: "Benefit disbursement timelines vary by scheme. You can track status in the 'Schemes' tab under 'Availed by you'." }
  ],
  // ... continue stats ...
  stats: {
    attendance: { present: 1, total: 25, label: "days present" },
    health: { visits: 4, label: "visits" },
    schemes: { active: 3, label: "active" },
    grievances: { open: 1, label: "open" }
  },
  notifications: [
    {
      id: 1,
      title: "Scheme Application Update",
      message: "Your Chandranna Bima application is under review. Expected completion in 7 days.",
      type: "Info",
      date: "01 Feb 2026",
      status: "blue"
    },
    {
      id: 2,
      title: "Grievance Response",
      message: "Your grievance GRV-2026-00045 has received a new response from the department.",
      type: "Action Required",
      date: "12 Jan 2026",
      status: "red"
    },
    {
      id: 3,
      title: "Health Card Renewed",
      message: "Your ESI health card has been renewed successfully until December 2026.",
      type: "Info",
      date: "01 Jan 2026",
      status: "blue"
    },
    {
      id: 4,
      title: "New Scheme Available",
      message: "You may be eligible for Thalliki Vandanam scheme. Check and apply now.",
      type: "Alert",
      date: "28 Dec 2025",
      status: "orange"
    }
  ],
  health_profile: {
    blood_group: "B+",
    height: "172 cm",
    weight: "68 kg",
    bp: "120/80",
    last_checkup: "12 Jan 2026",
    next_due: "12 Apr 2026",
    insurance_id: "ESI-AP-2024-8899",
    hospital: "City General Hospital, Guntur"
  },
  health_history: [
    {
      date: "12 Jan 2026", type: "General Checkup", doctor: "Dr. Rao", status: "Completed",
      notes: "All vitals normal. Prescribed vitamins.",
      member_name: "Ramesh Kumar", member_relation: "Self",
      hospital: "ESI Hospital, Vijayawada", city: "Vijayawada",
      cost: "850", govt_paid: "850", category: "OP", insurance_type: "ESI"
    },
    {
      date: "20 Dec 2025", type: "Full Body Checkup", doctor: "Dr. Latha", status: "Completed",
      notes: "Routine checkup. BP slightly elevated.",
      member_name: "Lakshmi Kumar", member_relation: "Spouse",
      hospital: "Govt General Hospital, Krishna", city: "Krishna",
      cost: "1,200", govt_paid: "1,200", category: "Diagnostics", insurance_type: "Govt"
    },
    {
      date: "05 Nov 2025", type: "Vaccination", doctor: "Dr. Reddy", status: "Completed",
      notes: "Flu vaccination administered.",
      member_name: "Sanjay Kumar", member_relation: "Child",
      hospital: "ESI Hospital, Vijayawada", city: "Vijayawada",
      cost: "3,500", govt_paid: "3,500", category: "OP", insurance_type: "ESI"
    },
    {
      date: "12 Sep 2025", type: "Eye Surgery", doctor: "Dr. Venkat", status: "Completed",
      notes: "Cataract surgery successful.",
      member_name: "Venkata Rao", member_relation: "Parent",
      hospital: "Apollo Hospitals", city: "Guntur",
      cost: "25,000", govt_paid: "20,000", category: "Surgery", insurance_type: "Private"
    }
  ],
  schemes_list: [
    {
      id: 1, name: "Pradhan Mantri Shram Yogi Maandhan (PM-SYM)", type: "Central", status: "Eligible",
      desc: "Pension scheme for unorganized workers providing ₹3,000 per month after age 60.",
      benefit_type: "Pension", benefit_val: "₹3,000", tags: ["Central"]
    },
    {
      id: 2, name: "BOCW Workers Welfare Fund", type: "Welfare Board", status: "Eligible",
      desc: "Financial assistance for construction workers including education support for children.",
      benefit_type: "Cash", benefit_val: "₹25,000", tags: ["Welfare Board"]
    },
    {
      id: 3, name: "ESI Medical Benefits", type: "Central", status: "Eligible",
      desc: "Comprehensive medical care for workers and dependents through ESI hospitals.",
      benefit_type: "Insurance", benefit_val: "", tags: ["Central"]
    },
    {
      id: 4, name: "Chandranna Bima", type: "State", status: "Applied",
      desc: "Life and accident insurance for workers with coverage up to ₹5 lakhs.",
      benefit_type: "Insurance", benefit_val: "₹500,000", tags: ["State"]
    },
    // Super Six Initiatives
    {
      id: 5, name: "Talliki Vandanam", type: "State", status: "Active",
      desc: "Financial assistance for school-going children.",
      benefit_type: "Cash", benefit_val: "₹15,000", tags: ["State", "Education"]
    },
    {
      id: 6, name: "Deepam Scheme", type: "State", status: "Active",
      desc: "Provision of three free LPG cylinders per year to every household.",
      benefit_type: "Subsidy", benefit_val: "3 Cylinders", tags: ["State", "Household"]
    },
    {
      id: 7, name: "Free Bus Travel", type: "State", status: "Active",
      desc: "Free travel for women across Andhra Pradesh.",
      benefit_type: "Service", benefit_val: "Free Travel", tags: ["State", "Transport"]
    },
    {
      id: 8, name: "Aadabidda Nidhi", type: "State", status: "Eligible",
      desc: "Monthly financial assistance of ₹1,500 for women (18-59 years).",
      benefit_type: "Cash", benefit_val: "₹1,500/mo", tags: ["State", "Women"]
    },
    {
      id: 9, name: "Yuva Galam", type: "State", status: "Eligible",
      desc: "A monthly unemployment allowance of ₹3,000 for youth.",
      benefit_type: "Cash", benefit_val: "₹3,000/mo", tags: ["State", "Youth"]
    },
    {
      id: 10, name: "Annadata Sukhibhava", type: "State", status: "Eligible",
      desc: "Direct financial aid of ₹20,000 annually to farmers.",
      benefit_type: "Cash", benefit_val: "₹20,000/yr", tags: ["State", "Agriculture"]
    },
    {
      id: 11, name: "PM Garib Kalyan Yojana", type: "Central", status: "Pending Verification",
      desc: "Free food grain distribution for workers and families.",
      benefit_type: "Other", benefit_val: "", tags: ["Central"]
    }
  ],
  grievances_list: [
    {
      id: "GRV-2026-00045", category: "Attendance & Wages", status: "In Progress",
      subject: "Attendance not recorded for 25th Dec",
      desc: "My attendance for 25th December 2025 was not recorded even though I was present at the site. I have my site entry register proof.",
      created_at: "10 Jan 2026", sla: "25 Jan 2026"
    },
    {
      id: "GRV-2025-00892", category: "Schemes & Benefits", status: "Resolved",
      subject: "BOCW benefit not received",
      desc: "I have not received the quarterly benefit amount for BOCW scheme for Q3 2025.",
      created_at: "05 Nov 2025", sla: "20 Nov 2025"
    },
    {
      id: "GRV-2026-00102", category: "Workplace Safety", status: "Submitted",
      subject: "Lack of safety gear at Site B",
      desc: "Safety helmets and gloves are not being provided at the new construction site B.",
      created_at: "15 Jan 2026", sla: "30 Jan 2026"
    },
    {
      id: "GRV-2026-00155", category: "Harassment", status: "In Progress",
      subject: "Misbehavior by supervisor",
      desc: "Reporting verbal harassment by site supervisor on 12th Jan. Requesting immediate action.",
      created_at: "16 Jan 2026", sla: "31 Jan 2026"
    },
    {
      id: "GRV-2025-00788", category: "Attendance & Wages", status: "Resolved",
      subject: "Overtime payment delay",
      desc: "Overtime payment for October 2025 has not been credited to my account.",
      created_at: "10 Nov 2025", sla: "25 Nov 2025"
    },
    {
      id: "GRV-2026-00201", category: "Schemes & Benefits", status: "Submitted",
      subject: "Application for Thalliki Vandanam rejected",
      desc: "My application was rejected without a clear reason. I have attached all documents.",
      created_at: "20 Jan 2026", sla: "04 Feb 2026"
    },
    {
      id: "GRV-2025-00999", category: "Facilities", status: "Resolved",
      subject: "No drinking water at site",
      desc: "There was no clean drinking water available at the main site for 2 days.",
      created_at: "01 Dec 2025", sla: "05 Dec 2025"
    },
    {
      id: "GRV-2026-00010", category: "Attendance & Wages", status: "Resolved",
      subject: "Incorrect wage calculation",
      desc: "My wages for December week 1 were calculated for 4 days instead of 6.",
      created_at: "02 Jan 2026", sla: "10 Jan 2026"
    },
    {
      id: "GRV-2026-00230", category: "Workplace Safety", status: "Submitted",
      subject: "Broken scaffolding",
      desc: "The scaffolding on the 2nd floor is damaged and dangerous to use.",
      created_at: "22 Jan 2026", sla: "25 Jan 2026"
    },
    {
      id: "GRV-2025-00650", category: "Harassment", status: "Resolved",
      subject: "Discrimination in task allocation",
      desc: "I am consistently being given hazardous tasks compared to others.",
      created_at: "15 Oct 2025", sla: "30 Oct 2025"
    },
    {
      id: "GRV-2026-00055", category: "Schemes & Benefits", status: "In Progress",
      subject: "Status of Chandranna Bima claim",
      desc: "Checking status of my accident claim submitted last month.",
      created_at: "12 Jan 2026", sla: "27 Jan 2026"
    },
    {
      id: "GRV-2025-00500", category: "Attendance & Wages", status: "Resolved",
      subject: "Provident Fund not reflecting",
      desc: "My PF contribution for September is not showing in the portal.",
      created_at: "05 Oct 2025", sla: "20 Oct 2025"
    },
    {
      id: "GRV-2026-00250", category: "Facilities", status: "Submitted",
      subject: "Washroom conditions",
      desc: "Ladies washroom at the south gate is not functional.",
      created_at: "25 Jan 2026", sla: "30 Jan 2026"
    },
    {
      id: "GRV-2026-00180", category: "General", status: "In Progress",
      subject: "ID Card lost",
      desc: "I lost my physical ID card and need a replacement.",
      created_at: "18 Jan 2026", sla: "25 Jan 2026"
    },
    {
      id: "GRV-2025-00440", category: "Attendance & Wages", status: "Resolved",
      subject: "Leave approval pending",
      desc: "My medical leave request for August was not approved in time.",
      created_at: "01 Sep 2025", sla: "05 Sep 2025"
    }
  ]
};

// --- DUMMY CHART DATA ---
const ATTENDANCE_PIE_DATA = [
  { name: 'Present', value: 22, color: '#22c55e' }, // green-500
  { name: 'Absent', value: 2, color: '#ef4444' },  // red-500
  { name: 'Partial', value: 0, color: '#f97316' }, // orange-500
];

const WEEKLY_HOURS_DATA = [
  { day: 'Mon', hours: 9.2 },
  { day: 'Tue', hours: 9.0 },
  { day: 'Wed', hours: 9.3 },
  { day: 'Thu', hours: 8.8 },
  { day: 'Fri', hours: 9.1 },
  { day: 'Sat', hours: 5.0 },
  { day: 'Sun', hours: 0 },
];

export default function WorkerDashboard() {
  const { userContext, signOut } = useAuth();
  const navigate = useNavigate();

  // -- Profile State --
  const [workerProfile, setWorkerProfile] = useState<any>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (userContext?.workerId) {
      fetchWorkerProfile();
    }
  }, [userContext?.workerId]);

  const fetchWorkerProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('id', userContext?.workerId)
        .single();

      if (error) throw error;
      if (data) {
        setWorkerProfile(data);
      }
    } catch (error) {
      console.error('Error fetching worker profile:', error);
      toast.error('Failed to load profile data');
    }
  };

  // Helper to get display data (fallback to dummy)
  const getDisplayProfile = () => {
    if (workerProfile) {
      return {
        // Map Supabase fields to Dashboard expected format
        first_name: workerProfile.first_name || DUMMY_DATA.profile.first_name,
        last_name: workerProfile.last_name || DUMMY_DATA.profile.last_name,
        worker_id: (() => {
          const rawId = workerProfile.worker_id || DUMMY_DATA.profile.worker_id;
          const year = new Date().getFullYear();
          // If ID is just numbers or phone-like (10+ digits), format it
          if (/^\d{10,}$/.test(rawId)) {
            return `WKR-AP-${year}-${rawId}`;
          }
          // If ID starts with WKR but no dashes (e.g. WKR7107...), format it
          if (rawId.startsWith('WKR') && !rawId.includes('-')) {
            const suffix = rawId.replace('WKR', '');
            return `WKR-AP-${year}-${suffix}`;
          }
          // Display as is if it already matches format or is unknown style
          return rawId;
        })(),
        // Fallbacks for missing DB fields (using dummy for demo if missing)
        aadhaar_number: workerProfile.aadhaar_last_four ? `XXXX XXXX ${workerProfile.aadhaar_last_four}` : DUMMY_DATA.profile.aadhaar_number,
        phone_number: workerProfile.phone || DUMMY_DATA.profile.phone_number,
        establishment: DUMMY_DATA.profile.establishment, // DB link?
        location: `${workerProfile.district}, ${workerProfile.state}` || DUMMY_DATA.profile.location,

        dob: workerProfile.date_of_birth ? format(new Date(workerProfile.date_of_birth), 'dd MMM yyyy') : DUMMY_DATA.profile.dob,
        raw_dob: workerProfile.date_of_birth, // For editing
        gender: workerProfile.gender || DUMMY_DATA.profile.gender,
        designation: DUMMY_DATA.profile.designation, // Often in mapping, not worker table
        address: workerProfile.address_line || DUMMY_DATA.profile.address,
        email: workerProfile.email || "ramesh.kumar@email.com",
        photo_url: workerProfile.photo_url || DUMMY_DATA.profile.photo_url,
        age: DUMMY_DATA.profile.age, // Fallback

        // ID numbers
        eshram_id: DUMMY_DATA.profile.eshram_id, // Add real cols if exist
        bocw_id: DUMMY_DATA.profile.bocw_id,
        esi_number: DUMMY_DATA.profile.esi_number,
        pf_number: DUMMY_DATA.profile.pf_number,
        trade_union_id: DUMMY_DATA.profile.trade_union_id
      };
    }
    return DUMMY_DATA.profile;
  };

  const displayProfile = getDisplayProfile();

  // -- Photo Upload Handlers --
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoRemove = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const uploadPhotoToSupabase = async (): Promise<string | null> => {
    if (!photoFile || !userContext?.workerId) return null;

    try {
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${userContext.workerId}-${Date.now()}.${fileExt}`;
      const filePath = `worker-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('worker-photos')
        .upload(filePath, photoFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('worker-photos')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Photo upload error:', error);
      toast.error('Failed to upload photo');
      return null;
    }
  };



  // -- Health Filter State --
  const [selectedMember, setSelectedMember] = useState("All");
  const [selectedHospital, setSelectedHospital] = useState("All");

  const filteredHealthHistory = DUMMY_DATA.health_history.filter(record => {
    const matchMember = selectedMember === "All" || record.member_relation.includes(selectedMember) || (selectedMember === "Self" && record.member_relation === "Self");
    const matchHospital = selectedHospital === "All" || record.hospital.includes(selectedHospital);
    return matchMember && matchHospital;
  });

  // -- Schemes State --
  const [schemesTab, setSchemesTab] = useState("eligible");
  const [schemesFilter, setSchemesFilter] = useState("All");

  const filteredSchemes = DUMMY_DATA.schemes_list.filter(scheme => {
    // Tab Filter
    const isAvailed = scheme.status === "Applied" || scheme.status === "Pending Verification" || scheme.status === "Active";
    if (schemesTab === "eligible" && isAvailed) return false;
    if (schemesTab === "availed" && !isAvailed) return false;

    // Type Filter
    if (schemesFilter !== "All" && scheme.type !== schemesFilter) return false;

    return true;
  });

  // -- Grievances State --
  const [grievancesTab, setGrievancesTab] = useState("my_grievances");
  const [grievancesFilter, setGrievancesFilter] = useState("All");

  const filteredGrievances = DUMMY_DATA.grievances_list.filter(item => {
    if (grievancesFilter !== "All" && item.status !== grievancesFilter) return false;
    return true;
  });

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Header - Kept consistent with App Branding */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src=" src=" /opoc/ap-logo.png" alt="Seal" className="w-10 h-10 object-contain" />
            <div className="flex flex-col">
              <span className="text-lg md:text-xl font-display font-bold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent leading-none">
                One State - One Card
              </span>
              <span className="text-xs text-slate-500 font-medium tracking-wide">Government of Andhra Pradesh</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-sm font-medium text-slate-700">{displayProfile.first_name} {displayProfile.last_name}</span>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-mono">
                {displayProfile.worker_id}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-500 hover:text-red-500 hover:bg-red-50">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl">

        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Hi, {displayProfile.first_name} 👋</h1>
            <p className="text-slate-500">Welcome back to your dashboard</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
          <div className="flex items-center justify-between overflow-x-auto pb-2 border-b mb-6 gap-4">
            <TabsList className="bg-transparent p-0 h-auto gap-4 md:gap-6 justify-start w-full md:w-auto overflow-x-auto mask-linear-fade">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none px-1 pb-3 pt-2 font-medium text-slate-500 data-[state=active]:text-orange-600 gap-2"
              >
                <div className="w-4 h-4" ><Building2 className="w-full h-full" /></div>
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="attendance"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none px-1 pb-3 pt-2 font-medium text-slate-500 data-[state=active]:text-orange-600 gap-2"
              >
                <div className="w-4 h-4"><Calendar className="w-full h-full" /></div>
                Attendance
              </TabsTrigger>
              <TabsTrigger
                value="health"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none px-1 pb-3 pt-2 font-medium text-slate-500 data-[state=active]:text-orange-600 gap-2"
              >
                <div className="w-4 h-4"><Heart className="w-full h-full" /></div>
                Health
              </TabsTrigger>
              <TabsTrigger
                value="schemes"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none px-1 pb-3 pt-2 font-medium text-slate-500 data-[state=active]:text-orange-600 gap-2"
              >
                <div className="w-4 h-4"><Gift className="w-full h-full" /></div>
                Schemes
              </TabsTrigger>
              <TabsTrigger
                value="grievances"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none px-1 pb-3 pt-2 font-medium text-slate-500 data-[state=active]:text-orange-600 gap-2"
              >
                <div className="w-4 h-4"><MessageSquare className="w-full h-full" /></div>
                Grievances
              </TabsTrigger>
              <TabsTrigger
                value="profile"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none px-1 pb-3 pt-2 font-medium text-slate-500 data-[state=active]:text-orange-600 gap-2"
              >
                <div className="w-4 h-4"><User className="w-full h-full" /></div>
                Profile
              </TabsTrigger>
              <TabsTrigger
                value="help"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none px-1 pb-3 pt-2 font-medium text-slate-500 data-[state=active]:text-orange-600 gap-2"
              >
                <div className="w-4 h-4"><HelpCircle className="w-full h-full" /></div>
                Help
              </TabsTrigger>
            </TabsList>

            {/* Global Actions - Show QR (Placed here as requested) */}
            <div className="flex items-center gap-2 shrink-0 ml-auto md:ml-0">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="hidden md:flex gap-2 text-xs border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 hover:text-orange-800">
                    <QrCode className="w-3.5 h-3.5" />
                    Show QR Code
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Worker Profile QR Code</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col items-center justify-center p-6 space-y-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                      <QRCode
                        value={`https://workerconnect.miti.us/public/worker?workerid=${DUMMY_DATA.profile.aadhaar_number}`}
                        size={200}
                      />
                    </div>
                    <p className="text-sm text-center text-muted-foreground break-all">
                      Scan to verify worker identity
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <TabsContent value="overview" className="space-y-6 animate-in fade-in-50">

            {/* 1. Summary Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Attendance Card */}
              <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setActiveTab('attendance')}>
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-slate-500 font-medium">Attendance this month</span>
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">{DUMMY_DATA.stats.attendance.present} <span className="text-lg font-medium text-slate-500">days present</span></h3>
                    <div className="flex items-center text-xs text-blue-600 font-medium mt-1 cursor-pointer">
                      Tap to see full attendance <ChevronRight className="w-3 h-3 ml-0.5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Health Card */}
              <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setActiveTab('health')}>
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-slate-500 font-medium">Health visits <span className="text-xs opacity-70">(last 12mo)</span></span>
                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                      <Heart className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">{DUMMY_DATA.stats.health.visits} <span className="text-lg font-medium text-slate-500">visits</span></h3>
                    <div className="flex items-center text-xs text-emerald-600 font-medium mt-1 cursor-pointer">
                      Tap for details <ChevronRight className="w-3 h-3 ml-0.5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Schemes Card */}
              <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setActiveTab('schemes')}>
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-slate-500 font-medium">Schemes you benefit from</span>
                    <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-100 transition-colors">
                      <Gift className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">{DUMMY_DATA.stats.schemes.active} <span className="text-lg font-medium text-slate-500">active</span></h3>
                    <div className="flex items-center text-xs text-purple-600 font-medium mt-1 cursor-pointer">
                      View or apply for more <ChevronRight className="w-3 h-3 ml-0.5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Grievances Card */}
              <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setActiveTab('grievances')}>
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-slate-500 font-medium">Open grievances</span>
                    <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 group-hover:bg-orange-100 transition-colors">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">{DUMMY_DATA.stats.grievances.open} <span className="text-lg font-medium text-slate-500">open</span></h3>
                    <div className="flex items-center text-xs text-orange-600 font-medium mt-1 cursor-pointer">
                      Track or raise new <ChevronRight className="w-3 h-3 ml-0.5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 2. Establishment Banner */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-500 mb-0.5">Currently mapped to</p>
                <h3 className="font-bold text-slate-900 text-base">{DUMMY_DATA.profile.establishment}</h3>
                <div className="flex items-center text-xs text-slate-500 mt-0.5 font-medium">
                  <MapPin className="w-3 h-3 mr-1" /> {DUMMY_DATA.profile.location}
                </div>
              </div>
            </div>

            {/* 3. Notifications */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-4 px-1">Notifications</h3>
              <div className="space-y-3">
                {DUMMY_DATA.notifications.map((notif) => (
                  <Card key={notif.id} className="border-l-4 border-l-transparent hover:border-l-orange-400 transition-all hover:shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-slate-800">{notif.title}</h4>
                            {notif.type === 'Alert' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed mb-3">{notif.message}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className={`text-xs font-normal border-0 px-2 py-0.5
                                ${notif.status === 'blue' ? 'bg-blue-50 text-blue-700' :
                                notif.status === 'red' ? 'bg-red-50 text-red-700' :
                                  'bg-orange-50 text-orange-700'}`
                            }>
                              {notif.type}
                            </Badge>
                            <span className="text-xs text-slate-400">• {notif.date}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

          </TabsContent>

          <TabsContent value="attendance" className="space-y-8 animate-in fade-in-50">

            {/* 1. Top KPI Cards (Requested Layout - Minus Schemes Card) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Today's Status */}
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-sm font-semibold text-slate-600">Today's Status</span>
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <Badge variant="secondary" className="bg-red-50 text-red-700 hover:bg-red-50 mb-2 font-normal rounded-md px-2">Absent</Badge>
                    <div className="text-xs text-slate-400 font-mono">In: --:-- | Out: --:--</div>
                  </div>
                </CardContent>
              </Card>

              {/* This Month */}
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-sm font-semibold text-slate-600">This Month</span>
                    <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">1 <span className="text-sm font-normal text-slate-400">/ 25</span></h3>
                    <div className="text-xs text-slate-500 mt-1">Days present</div>
                  </div>
                </CardContent>
              </Card>

              {/* Partial Days */}
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-sm font-semibold text-slate-600">Partial Days</span>
                    <div className="w-6 h-6 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
                      <AlertCircle className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-orange-600">0</h3>
                    <div className="text-xs text-slate-500 mt-1">Incomplete attendance</div>
                  </div>
                </CardContent>
              </Card>

              {/* Worker ID */}
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-sm font-semibold text-slate-600">Worker ID</span>
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 font-mono truncate">{DUMMY_DATA.profile.worker_id}</h3>
                    <div className="text-xs text-slate-500 mt-1">Use for remote check-in</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 2. Attendance Report Table */}
            <Card className="border-none shadow-sm bg-white">
              <CardHeader className="px-0 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Download className="w-4 h-4 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Attendance Report</h3>
                </div>
              </CardHeader>
              <CardContent className="px-0">

                {/* Filters Toolbar */}
                <div className="flex flex-wrap items-center gap-3 mb-6 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                  {/* Date Range Picker Placeholder */}
                  <div className="flex items-center gap-2 bg-white border px-3 py-1.5 rounded-md text-sm text-slate-600 shadow-sm cursor-pointer hover:border-blue-300 transition-colors">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>05 Jan 2026 - 04 Feb 2026</span>
                  </div>

                  {/* Quick Filters */}
                  <div className="flex items-center gap-1">
                    {['Last 7 days', 'Last 14 days', 'Last 30 days', 'This month', 'Last month'].map((filter) => (
                      <button key={filter} className="text-xs font-medium px-3 py-1.5 rounded-md text-slate-600 hover:bg-white hover:shadow-sm hover:text-blue-600 transition-all">
                        {filter}
                      </button>
                    ))}
                  </div>

                  <div className="ml-auto">
                    <Button variant="outline" size="sm" className="gap-2 h-8 text-xs font-medium">
                      <Download className="w-3.5 h-3.5" /> Export CSV
                    </Button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                      <tr>
                        <th className="px-6 py-3 w-32">Date</th>
                        <th className="px-6 py-3">Establishment</th>
                        <th className="px-6 py-3">Department</th>
                        <th className="px-6 py-3">Check-in</th>
                        <th className="px-6 py-3">Check-out</th>
                        <th className="px-6 py-3">Hours</th>
                        <th className="px-6 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { date: "04 Feb 2026", est: "Sarika's Construction", dept: "Construction", in: "12:30", out: "21:49", hrs: "9.3h", status: "Present" },
                        { date: "03 Feb 2026", est: "City Civic Center", dept: "Maintenance", in: "10:22", out: "--", hrs: "--", status: "Present" },
                        { date: "17 Jan 2026", est: "Green Valley Project", dept: "Gardening", in: "18:55", out: "19:03", hrs: "0.1h", status: "Present" },
                        { date: "16 Jan 2026", est: "Sarika's Construction", dept: "Construction", in: "15:35", out: "20:23", hrs: "4.8h", status: "Present" }
                      ].map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-700 whitespace-nowrap">{row.date}</td>
                          <td className="px-6 py-4 text-slate-600 font-medium">{row.est}</td>
                          <td className="px-6 py-4 text-slate-500">{row.dept}</td>
                          <td className="px-6 py-4 font-mono text-slate-500">{row.in}</td>
                          <td className="px-6 py-4 font-mono text-slate-500">{row.out}</td>
                          <td className="px-6 py-4 font-mono text-slate-500">{row.hrs}</td>
                          <td className="px-6 py-4 text-right">
                            <Badge className="bg-green-600 hover:bg-green-700 text-white font-normal px-3 py-0.5 rounded-full">
                              {row.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* 3. Charts Section (Moved Below Table) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pie Chart: Attendance Distribution */}
              <Card className="border-none shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-slate-800">Attendance Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={ATTENDANCE_PIE_DATA}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {ATTENDANCE_PIE_DATA.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Bar Chart: Weekly Hours */}
              <Card className="border-none shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-slate-800">Weekly Hours Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={WEEKLY_HOURS_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <RechartsTooltip
                          cursor={{ fill: '#f1f5f9' }}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

          </TabsContent>

          <TabsContent value="health" className="space-y-8 animate-in fade-in-50">
            {/* 1. Health Vitals Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Blood Group */}
              <Card>
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-2">
                    <Heart className="w-5 h-5" />
                  </div>
                  <span className="text-sm text-slate-500 font-medium">Blood Group</span>
                  <span className="text-xl font-bold text-slate-800 mt-1">{DUMMY_DATA.health_profile.blood_group}</span>
                </CardContent>
              </Card>
              {/* Weight */}
              <Card>
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 mb-2">
                    <User className="w-5 h-5" />
                  </div>
                  <span className="text-sm text-slate-500 font-medium">Weight</span>
                  <span className="text-xl font-bold text-slate-800 mt-1">{DUMMY_DATA.health_profile.weight}</span>
                </CardContent>
              </Card>
              {/* Blood Pressure */}
              <Card>
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-500 mb-2">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="text-sm text-slate-500 font-medium">Blood Pressure</span>
                  <span className="text-xl font-bold text-slate-800 mt-1">{DUMMY_DATA.health_profile.bp}</span>
                </CardContent>
              </Card>
              {/* Next Due */}
              <Card>
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 mb-2">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span className="text-sm text-slate-500 font-medium">Next Checkup</span>
                  <span className="text-xl font-bold text-slate-800 mt-1">{DUMMY_DATA.health_profile.next_due}</span>
                </CardContent>
              </Card>
            </div>
            {/* 3. Health History List */}
            <div className="grid grid-cols-1">
              <div className="col-span-1">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-800">Checkup History</h3>
                  <Button variant="ghost" size="sm" className="text-slate-500">View All</Button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 mb-4">
                  <select
                    className="text-sm border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedMember}
                    onChange={(e) => setSelectedMember(e.target.value)}
                  >
                    <option value="All">All Family Members</option>
                    <option value="Self">Self (Ramesh)</option>
                    <option value="Spouse">Spouse (Lakshmi)</option>
                    <option value="Child">Child (Sanjay)</option>
                    <option value="Parent">Parent (Venkata)</option>
                  </select>

                  <select
                    className="text-sm border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedHospital}
                    onChange={(e) => setSelectedHospital(e.target.value)}
                  >
                    <option value="All">All Hospitals</option>
                    <option value="ESI Hospital">ESI Hospital</option>
                    <option value="Govt General Hospital">Govt General Hospital</option>
                    <option value="Apollo Hospitals">Apollo Hospitals</option>
                  </select>
                </div>

                <Card>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                      {filteredHealthHistory.length > 0 ? (
                        filteredHealthHistory.map((record, i) => (
                          <div key={i} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-4">
                            <div className="mt-1">
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                {record.type.includes("Eye") ? <Pill className="w-5 h-5" /> :
                                  record.type.includes("Vaccine") ? <Pill className="w-5 h-5" /> :
                                    <Heart className="w-5 h-5" />}
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                    {record.type}
                                    {/* Status Badge */}
                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal border-green-200 text-green-700 bg-green-50">
                                      {record.status}
                                    </Badge>
                                  </h4>
                                  <div className="flex items-center text-xs text-slate-500 mt-1 gap-2">
                                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {record.member_name} <span className="text-[10px] bg-slate-100 px-1 rounded">{record.member_relation}</span></span>
                                  </div>
                                  <div className="flex items-center text-xs text-slate-500 mt-1 gap-2">
                                    <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {record.hospital}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs text-slate-400 block mb-1">{record.date}</span>
                                  <span className="text-sm font-bold text-slate-800">₹{record.cost}</span>
                                  {record.govt_paid && <span className="text-[10px] text-green-600 block">Govt: ₹{record.govt_paid}</span>}
                                </div>
                              </div>
                              <div className="mt-3 flex gap-2">
                                <Badge variant="secondary" className="font-normal text-xs bg-slate-100 text-slate-500 hover:bg-slate-200">{record.category}</Badge>
                                <Badge variant="secondary" className="font-normal text-xs bg-blue-50 text-blue-600 hover:bg-blue-100">{record.insurance_type}</Badge>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-slate-500">
                          <p>No records found for the selected filters.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="schemes" className="animate-in fade-in-50">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Schemes</h3>

            {/* Sub-Tabs: Eligible vs Availed */}
            <div className="bg-slate-100 p-1 rounded-lg inline-flex w-full md:w-auto mb-6">
              <button
                onClick={() => setSchemesTab("eligible")}
                className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all ${schemesTab === "eligible" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Eligible for you
              </button>
              <button
                onClick={() => setSchemesTab("availed")}
                className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all ${schemesTab === "availed" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Availed by you
              </button>
            </div>

            {/* Type Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              {["All", "State", "Central", "Welfare Board"].map(filter => (
                <button
                  key={filter}
                  onClick={() => setSchemesFilter(filter)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${schemesFilter === filter
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Schemes List */}
            <div className="space-y-4">
              {filteredSchemes.map(scheme => (
                <Card key={scheme.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
                      <div className="flex-1">
                        <div className="flex gap-2 mb-2 items-center">
                          <Badge variant="secondary" className={`text-[10px] font-normal px-2 py-0.5 
                              ${scheme.type === "Central" ? "bg-blue-50 text-blue-700" :
                              scheme.type === "State" ? "bg-orange-50 text-orange-700" :
                                "bg-green-50 text-green-700"}`}>
                            {scheme.type}
                          </Badge>

                          {scheme.status === "Eligible" && <span className="text-[10px] text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Eligible</span>}
                          {scheme.status === "Pending Verification" && <span className="text-[10px] text-orange-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Pending Verification</span>}
                          {scheme.status === "Applied" && <span className="text-[10px] text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Applied</span>}
                          {scheme.status === "Active" && <span className="text-[10px] text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Active</span>}
                        </div>

                        <h4 className="text-base font-bold text-slate-800 mb-1">{scheme.name}</h4>
                        <p className="text-sm text-slate-500 mb-3 leading-relaxed">{scheme.desc}</p>

                        <div className="flex items-center gap-2">
                          <div className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded font-medium">
                            {scheme.benefit_type}
                          </div>
                          {scheme.benefit_val && (
                            <div className="text-slate-800 text-xs px-1 font-bold">
                              {scheme.benefit_val}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="w-full md:w-auto flex flex-col items-end justify-between min-w-[120px]">
                        {scheme.status === "Eligible" ? (
                          <Button size="sm" variant="outline" className="w-full md:w-auto border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800">
                            Apply Now
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="w-full md:w-auto bg-slate-50 text-slate-500 border-slate-200 cursor-default hover:bg-slate-50">
                            {scheme.status}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredSchemes.length === 0 && (
                <div className="text-center p-10 border-2 border-dashed rounded-xl bg-slate-50/50">
                  <p className="text-slate-500">No schemes found in this category.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="grievances" className="animate-in fade-in-50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Grievances</h3>
              <Button size="sm" className="gap-2 bg-teal-700 hover:bg-teal-800 text-white" onClick={() => setGrievancesTab("raise_new")}>
                <MessageSquare className="w-4 h-4" /> Raise New
              </Button>
            </div>

            {/* Sub-Tabs: My Grievances vs Raise New */}
            <div className="bg-slate-100 p-1 rounded-lg flex w-full md:w-auto mb-6">
              <button
                onClick={() => setGrievancesTab("my_grievances")}
                className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all ${grievancesTab === "my_grievances" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                My grievances
              </button>
              <button
                onClick={() => setGrievancesTab("raise_new")}
                className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all ${grievancesTab === "raise_new" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Raise new
              </button>
            </div>

            {grievancesTab === "my_grievances" && (
              <>
                {/* Status Filters */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {["All", "Submitted", "In Progress", "Resolved"].map(filter => (
                    <button
                      key={filter}
                      onClick={() => setGrievancesFilter(filter)}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${grievancesFilter === filter
                        ? "bg-teal-700 text-white border-teal-700"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                {/* Grievances List */}
                <div className="space-y-4">
                  {filteredGrievances.map(item => (
                    <Card key={item.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-slate-400">{item.id}</span>
                            <Badge variant="secondary" className={`text-[10px] font-normal px-2 py-0.5
                                 ${item.status === "Resolved" ? "bg-green-50 text-green-700" :
                                item.status === "In Progress" ? "bg-orange-50 text-orange-700" :
                                  "bg-blue-50 text-blue-700"
                              }`}>
                              {item.status}
                            </Badge>
                          </div>
                        </div>

                        <h4 className="font-bold text-slate-800 mb-1">{item.category}</h4>
                        <p className="text-sm text-slate-600 mb-3 leading-relaxed">{item.desc}</p>

                        <div className="flex items-center text-xs text-slate-400 gap-4">
                          <span>Created: {item.created_at}</span>
                          <span>SLA: {item.sla}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {filteredGrievances.length === 0 && (
                    <div className="text-center p-10 border-2 border-dashed rounded-xl bg-slate-50/50">
                      <p className="text-slate-500">No grievances found.</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {grievancesTab === "raise_new" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-slate-800">Raise a New Grievance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="service">Service Category</Label>
                    <Select>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="attendance">Attendance & Wages</SelectItem>
                        <SelectItem value="schemes">Schemes & Benefits</SelectItem>
                        <SelectItem value="safety">Workplace Safety</SelectItem>
                        <SelectItem value="harassment">Harassment</SelectItem>
                        <SelectItem value="facilities">Facilities</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="desc">Description</Label>
                    <Textarea id="desc" placeholder="Please describe your issue in detail..." className="min-h-[150px]" />
                  </div>

                  <div className="flex gap-4">
                    <Button className="flex-1 bg-teal-700 hover:bg-teal-800">Submit Grievance</Button>
                    <Button variant="outline" className="flex-1" onClick={() => setGrievancesTab("my_grievances")}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

          </TabsContent>
          <TabsContent value="profile" className="animate-in fade-in-50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">Profile & Documents</h3>
            </div>

            <div className="space-y-8">

              {/* 1. Personal Details */}
              <Card>
                <CardHeader className="pb-4 border-b flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-slate-500" />
                    <CardTitle className="text-base text-slate-800">Personal Details</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" className="text-teal-600 hover:text-teal-700 hover:bg-teal-50" onClick={() => setIsEditProfileOpen(true)}>
                    Edit
                  </Button>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row gap-8">
                    {/* Avatar */}
                    <div className="flex flex-col items-center gap-3 shrink-0">
                      <div className="w-32 h-32 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-3xl font-bold border-4 border-white shadow-sm overflow-hidden">
                        {displayProfile.photo_url ? (
                          <img src={displayProfile.photo_url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <span>{displayProfile.first_name?.[0]}{displayProfile.last_name?.[0]}</span>
                        )}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setIsEditProfileOpen(true)}>Edit Photo</Button>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                      <div>
                        <label className="text-xs text-slate-500 uppercase tracking-wider font-medium">Full Name</label>
                        <div className="text-base font-semibold text-slate-800 mt-1">{displayProfile.first_name} {displayProfile.last_name}</div>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 uppercase tracking-wider font-medium">Gender</label>
                        <div className="text-base font-medium text-slate-800 mt-1">{displayProfile.gender}</div>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 uppercase tracking-wider font-medium">Designation</label>
                        <div className="text-base font-medium text-slate-800 mt-1">{displayProfile.designation}</div>
                      </div>

                      <div>
                        <label className="text-xs text-slate-500 uppercase tracking-wider font-medium">Date of Birth</label>
                        <div className="text-base font-medium text-slate-800 mt-1">{displayProfile.dob}</div>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 uppercase tracking-wider font-medium">Mobile</label>
                        <div className="text-base font-medium text-slate-800 mt-1">{displayProfile.phone_number}</div>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 uppercase tracking-wider font-medium">Email</label>
                        <div className="text-base font-medium text-slate-800 mt-1">{displayProfile.email}</div>
                      </div>

                      <div className="md:col-span-3">
                        <label className="text-xs text-slate-500 uppercase tracking-wider font-medium">Address</label>
                        <div className="text-base font-medium text-slate-800 mt-1">{displayProfile.address}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 2. Worker Identifiers */}
              <div>
                <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-slate-500" /> Worker Identifiers
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Grid of ID Cards */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-blue-300 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                      <span className="text-sm font-bold">WID</span>
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-xs text-slate-500 block uppercase tracking-wide">Worker ID</span>
                      <span className="text-sm font-bold text-slate-800 truncate block" title={displayProfile.worker_id}>{displayProfile.worker_id}</span>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-blue-300 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                      <span className="text-sm font-bold">ES</span>
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-xs text-slate-500 block uppercase tracking-wide">e-Shram Number</span>
                      <span className="text-sm font-bold text-slate-800 truncate block" title={DUMMY_DATA.profile.eshram_id}>{DUMMY_DATA.profile.eshram_id}</span>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-blue-300 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                      <span className="text-sm font-bold">BO</span>
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-xs text-slate-500 block uppercase tracking-wide">BOCW Registration</span>
                      <span className="text-sm font-bold text-slate-800 truncate block" title={DUMMY_DATA.profile.bocw_id}>{DUMMY_DATA.profile.bocw_id}</span>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-blue-300 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                      <span className="text-sm font-bold">ESI</span>
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-xs text-slate-500 block uppercase tracking-wide">ESI Number</span>
                      <span className="text-sm font-bold text-slate-800 truncate block" title={DUMMY_DATA.profile.esi_number}>{DUMMY_DATA.profile.esi_number}</span>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-blue-300 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                      <span className="text-sm font-bold">PF</span>
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-xs text-slate-500 block uppercase tracking-wide">PF Number</span>
                      <span className="text-sm font-bold text-slate-800 truncate block" title={DUMMY_DATA.profile.pf_number}>{DUMMY_DATA.profile.pf_number}</span>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-blue-300 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                      <span className="text-sm font-bold">MG</span>
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-xs text-slate-500 block uppercase tracking-wide">MGNREGS</span>
                      <span className="text-sm font-bold text-slate-800 truncate block" title={DUMMY_DATA.profile.mgnregs_id}>{DUMMY_DATA.profile.mgnregs_id}</span>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-blue-300 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                      <span className="text-sm font-bold">TU</span>
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-xs text-slate-500 block uppercase tracking-wide">Trade Union Number</span>
                      <span className="text-sm font-bold text-slate-800 truncate block" title={DUMMY_DATA.profile.trade_union_id}>{DUMMY_DATA.profile.trade_union_id}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2 italic">* To change these details, please contact your department office.</p>
              </div>

              {/* 3. Family Members */}
              <div>
                <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-slate-500" /> Family Members
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="flex flex-row items-center p-4 gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                      <User className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-bold text-slate-800">{displayProfile.first_name} {displayProfile.last_name}</h5>
                      <p className="text-sm text-slate-500">Self • Family</p>
                    </div>
                    <Badge variant="secondary" className="bg-green-50 text-green-700 font-normal">Health Covered</Badge>
                  </Card>
                  {DUMMY_DATA.health_history.reduce((acc: any[], curr) => {
                    if (!acc.find(i => i.name === curr.member_name)) {
                      acc.push({ name: curr.member_name, relation: curr.member_relation });
                    }
                    return acc;
                  }, []).map((member, i) => (
                    <Card key={i} className="flex flex-row items-center p-4 gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        <User className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-bold text-slate-800">{member.name}</h5>
                        <p className="text-sm text-slate-500">{member.relation} • Family</p>
                      </div>
                      <Badge variant="secondary" className="bg-green-50 text-green-700 font-normal">Health Covered</Badge>
                    </Card>
                  ))}
                </div>
              </div>

              {/* 4. Documents */}
              <div>
                <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-slate-500" /> Documents
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {DUMMY_DATA.documents.map((doc, i) => (
                    <Card key={i} className="p-4 hover:border-slate-300 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-bold text-slate-800 text-sm">{doc.name}</h5>
                          <p className="text-xs text-slate-500 mt-0.5">{doc.type}</p>
                          <p className="text-[10px] text-slate-400 mt-2">Uploaded: {doc.date}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                          View
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

            </div>
          </TabsContent>

          <TabsContent value="help" className="animate-in fade-in-50">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Help & Support</h3>

            <div className="space-y-8">

              {/* 1. FAQs */}
              <div className="space-y-4">
                <h4 className="text-base font-semibold text-slate-700 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" /> Frequently Asked Questions
                </h4>
                <Card>
                  <CardContent className="p-0">
                    <Accordion type="single" collapsible className="w-full">
                      {DUMMY_DATA.faqs.map((faq, i) => (
                        <AccordionItem key={i} value={`item-${i}`} className="px-6 border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                          <AccordionTrigger className="text-sm font-medium text-slate-700 hover:no-underline hover:text-blue-600 text-left">
                            {faq.q}
                          </AccordionTrigger>
                          <AccordionContent className="text-sm text-slate-500 leading-relaxed pb-4">
                            {faq.a}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              </div>

              {/* 2. Contact Support */}
              <div className="space-y-4">
                <h4 className="text-base font-semibold text-slate-700 flex items-center gap-2">
                  <span className="w-4 h-4" >📞</span> Contact Support
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Direct Contact */}
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-base text-slate-800">Direct Contact</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-teal-50 flex items-center justify-center text-teal-600">
                          <span className="text-xs font-bold">HQ</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700">Head Office</p>
                          <p className="text-xs text-slate-500">Vijayawada</p>
                        </div>
                      </div>
                      <div className="text-sm text-slate-600 space-y-1 pl-11">
                        <p>Toll Free: <span className="font-semibold">155214</span></p>
                        <p>Email: <a href="mailto:support@worker.ap.gov.in" className="text-blue-600 hover:underline">support@worker.ap.gov.in</a></p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Request Callback */}
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-base text-slate-800">Request Callback</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Reason</Label>
                        <Input placeholder="E.g. Payment Issue" className="h-8 text-sm" />
                      </div>
                      <Button size="sm" className="w-full bg-slate-800 hover:bg-slate-700">Request Call</Button>
                    </CardContent>
                  </Card>

                </div>
              </div>

              {/* 3. Feedback */}
              <div className="space-y-4">
                <h4 className="text-base font-semibold text-slate-700 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Give Feedback
                </h4>
                <Card>
                  <CardContent className="p-4">
                    <Textarea placeholder="Share your suggestions to improve the portal..." className="min-h-[80px] mb-3" />
                    <div className="flex justify-end">
                      <Button size="sm">Submit Feedback</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

            </div>
          </TabsContent>
        </Tabs>

      </main >

      {/* -- EDIT PROFILE DIALOG -- */}
      < Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen} >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Photo Upload Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-2xl font-bold border-2 border-dashed border-slate-300 overflow-hidden">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : displayProfile.photo_url ? (
                  <img src={displayProfile.photo_url} alt="Current" className="w-full h-full object-cover" />
                ) : (
                  displayProfile.first_name?.[0] || 'U'
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="relative overflow-hidden">
                  Upload New Photo
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                  />
                </Button>
                {(photoPreview || workerProfile?.photo_url) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={handlePhotoRemove}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  defaultValue={displayProfile.first_name}
                  onChange={(e) => setWorkerProfile({ ...workerProfile, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  defaultValue={displayProfile.last_name}
                  onChange={(e) => setWorkerProfile({ ...workerProfile, last_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  defaultValue={displayProfile.raw_dob ? displayProfile.raw_dob.split('T')[0] : ''}
                  onChange={(e) => setWorkerProfile({ ...workerProfile, date_of_birth: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  defaultValue={displayProfile.gender}
                  onValueChange={(val) => setWorkerProfile({ ...workerProfile, gender: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Mobile Number</Label>
                <Input
                  defaultValue={displayProfile.phone_number}
                  onChange={(e) => setWorkerProfile({ ...workerProfile, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  defaultValue={displayProfile.email}
                  onChange={(e) => setWorkerProfile({ ...workerProfile, email: e.target.value })}
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label>Address</Label>
                <Textarea
                  defaultValue={displayProfile.address}
                  onChange={(e) => setWorkerProfile({ ...workerProfile, address_line: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => {
                setIsEditProfileOpen(false);
                handlePhotoRemove(); // Clear preview on cancel
              }}>Cancel</Button>
              <Button onClick={async () => {
                try {
                  if (!userContext?.workerId) return;

                  // Upload photo first if selected
                  let photoUrl = workerProfile?.photo_url;
                  if (photoFile) {
                    const uploadedUrl = await uploadPhotoToSupabase();
                    if (uploadedUrl) {
                      photoUrl = uploadedUrl;
                    }
                  }

                  const updates = {
                    first_name: workerProfile.first_name,
                    last_name: workerProfile.last_name,
                    date_of_birth: workerProfile.date_of_birth,
                    gender: workerProfile.gender,
                    phone: workerProfile.phone,
                    email: workerProfile.email,
                    address_line: workerProfile.address_line,
                    photo_url: photoUrl,
                    updated_at: new Date().toISOString(),
                  };

                  const { error } = await supabase
                    .from('workers')
                    .update(updates)
                    .eq('id', userContext.workerId);

                  if (error) throw error;

                  toast.success("Profile updated successfully!");
                  setIsEditProfileOpen(false);
                  handlePhotoRemove(); // Clear preview after save
                  // Refresh data
                  fetchWorkerProfile();
                } catch (e) {
                  console.error('Update failed:', e);
                  toast.error("Failed to update profile");
                }
              }}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog >
    </div >
  );
}

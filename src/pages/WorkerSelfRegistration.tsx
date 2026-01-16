import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, ArrowRight, Check, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { getDistricts, getMandalsForDistrict, getVillagesForMandal } from '@/data/india-locations';
import { supabase } from '@/integrations/supabase/client';

// Password validation regex
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const formatAadhaar = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 12);
    const parts = [];
    for (let i = 0; i < digits.length; i += 4) parts.push(digits.slice(i, i + 4));
    return parts.join('-');
};

const calculateAge = (dob: string): number => {
    if (!dob) return 0;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
};

// --- Validation Schemas ---

const identitySchema = z.object({
    aadhaar: z.string().regex(/^\d{4}-\d{4}-\d{4}$/, 'Aadhaar must be in XXXX-XXXX-XXXX format'),
    otpVerified: z.literal(true, { errorMap: () => ({ message: 'Please verify OTP' }) }),
});

const personalSchema = z.object({
    firstName: z.string().trim().min(2, 'First name is required').max(50),
    lastName: z.string().trim().min(2, 'Last name is required').max(50),
    gender: z.string().min(1, 'Gender is required'),
    dateOfBirth: z.string().min(1, 'Date of birth is required'),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Valid 10-digit mobile number required'),
    password: z.string().regex(passwordRegex, 'Password: 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special char'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
}).refine((data) => calculateAge(data.dateOfBirth) >= 18, {
    message: "Must be at least 18 years old",
    path: ["dateOfBirth"],
});

const otherDetailsSchema = z.object({
    fatherName: z.string().min(1, 'Father Name is required'),
    motherName: z.string().min(1, 'Mother Name is required'),
    maritalStatus: z.string().min(1, 'Marital Status is required'),
    caste: z.string().min(1, 'Caste is required'),
    disabilityStatus: z.string().optional(),
    photoUrl: z.string().min(1, 'Photo is required'),
    bankAccountNumber: z.string().min(1, 'Account Number is required'),
    ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC Code format'),
    eshramId: z.string().optional(),
    bocwId: z.string().optional(),
    nresMember: z.string().optional(),
    tradeUnionMember: z.string().optional(),
});

const professionalSchema = z.object({
    educationLevel: z.string().optional(),
    skillCategory: z.string().optional(),
    workHistory: z.string().optional(),
});

const addressSchema = z.object({
    presentDoorNo: z.string().trim().min(1, 'Door number is required'),
    presentStreet: z.string().trim().min(1, 'Street is required'),
    presentDistrict: z.string().min(1, 'District is required'),
    presentMandal: z.string().min(1, 'Mandal is required'),
    presentVillage: z.string().min(1, 'Village is required'),
    presentPincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
    permanentDoorNo: z.string().trim().min(1, 'Door number is required'),
    permanentStreet: z.string().trim().min(1, 'Street is required'),
    permanentDistrict: z.string().min(1, 'District is required'),
    permanentMandal: z.string().min(1, 'Mandal is required'),
    permanentVillage: z.string().min(1, 'Village is required'),
    permanentPincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
});

type FormData = {
    aadhaar: string; otp: string; otpVerified: boolean; otpSent: boolean;
    firstName: string; lastName: string; gender: string; dateOfBirth: string; phone: string;
    password: string; confirmPassword: string;

    fatherName: string; motherName: string;
    maritalStatus: string; caste: string; disabilityStatus: string;
    photoUrl: string;
    bankAccountNumber: string; ifscCode: string;
    eshramId: string; bocwId: string; nresMember: string; tradeUnionMember: string;

    educationLevel: string; skillCategory: string; workHistory: string;

    presentDoorNo: string; presentStreet: string; presentDistrict: string; presentMandal: string; presentVillage: string; presentPincode: string;
    permanentDoorNo: string; permanentStreet: string; permanentDistrict: string; permanentMandal: string; permanentVillage: string; permanentPincode: string;
    sameAsPresent: boolean;
};

const STEPS = ['Identity', 'Personal', 'Other Details', 'Professional', 'Address', 'Review'];
const GENDERS = ['Male', 'Female', 'Other'];
const MARITAL_STATUSES = ['Single', 'Married', 'Widow', 'Divorced'];
const CASTES = ['OC', 'BC', 'SC', 'ST', 'Other'];

export default function WorkerSelfRegistration() {
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState<FormData>({
        aadhaar: '', otp: '', otpVerified: false, otpSent: false,
        firstName: '', lastName: '', gender: '', dateOfBirth: '', phone: '',
        password: '', confirmPassword: '',

        fatherName: '', motherName: '', maritalStatus: '', caste: '', disabilityStatus: 'None',
        photoUrl: '', bankAccountNumber: '', ifscCode: '',
        eshramId: '', bocwId: '', nresMember: 'No', tradeUnionMember: 'No',

        educationLevel: '', skillCategory: '', workHistory: '',

        presentDoorNo: '', presentStreet: '', presentDistrict: '', presentMandal: '', presentVillage: '', presentPincode: '',
        permanentDoorNo: '', permanentStreet: '', permanentDistrict: '', permanentMandal: '', permanentVillage: '', permanentPincode: '',
        sameAsPresent: false,
    });

    const navigate = useNavigate();
    const { toast } = useToast();

    const districts = useMemo(() => getDistricts(), []);
    const presentMandals = useMemo(() => getMandalsForDistrict(formData.presentDistrict), [formData.presentDistrict]);
    const presentVillages = useMemo(() => getVillagesForMandal(formData.presentDistrict, formData.presentMandal), [formData.presentDistrict, formData.presentMandal]);

    const permanentMandals = useMemo(() => getMandalsForDistrict(formData.permanentDistrict), [formData.permanentDistrict]);
    const permanentVillages = useMemo(() => getVillagesForMandal(formData.permanentDistrict, formData.permanentMandal), [formData.permanentDistrict, formData.permanentMandal]);

    const updateField = (field: keyof FormData, value: any) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value };

            // Auto-clear dependent fields
            if (field === 'presentDistrict') { newData.presentMandal = ''; newData.presentVillage = ''; }
            if (field === 'presentMandal') { newData.presentVillage = ''; }
            if (field === 'permanentDistrict') { newData.permanentMandal = ''; newData.permanentVillage = ''; }
            if (field === 'permanentMandal') { newData.permanentVillage = ''; }

            if (field === 'sameAsPresent' && value === true) {
                newData.permanentDoorNo = prev.presentDoorNo;
                newData.permanentStreet = prev.presentStreet;
                newData.permanentDistrict = prev.presentDistrict;
                newData.permanentMandal = prev.presentMandal;
                newData.permanentVillage = prev.presentVillage;
                newData.permanentPincode = prev.presentPincode;
            }
            return newData;
        });
        setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];

        if (!allowedTypes.includes(file.type)) {
            toast({ title: "Invalid File Type", description: "Only PNG, JPEG, and JPG formats are allowed.", variant: "destructive" });
            return;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `reg-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        setUploading(true);
        setErrors(prev => ({ ...prev, photoUrl: '' }));

        try {
            const { error: uploadError } = await supabase.storage
                .from('worker_photos')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('worker_photos')
                .getPublicUrl(fileName);

            updateField('photoUrl', publicUrl);
            toast({ title: "Success", description: "Photo uploaded successfully" });
        } catch (error: any) {
            toast({ title: "Upload Error", description: error.message, variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    const validateStep = (currentStep: number) => {
        try {
            setErrors({});
            if (currentStep === 0) identitySchema.parse({ aadhaar: formData.aadhaar, otpVerified: formData.otpVerified });
            if (currentStep === 1) personalSchema.parse(formData);
            if (currentStep === 2) otherDetailsSchema.parse(formData);
            if (currentStep === 3) professionalSchema.parse(formData);
            if (currentStep === 4) addressSchema.parse(formData);
            return true;
        } catch (err) {
            if (err instanceof z.ZodError) {
                const newErrors: Record<string, string> = {};
                err.errors.forEach(e => {
                    if (e.path[0]) newErrors[e.path[0] as string] = e.message;
                });
                setErrors(newErrors);
                toast({ title: "Validation Failed", description: "Please fill all required fields correctly.", variant: "destructive" });
            }
            return false;
        }
    };

    const nextStep = () => {
        if (validateStep(step)) setStep(s => Math.min(s + 1, STEPS.length - 1));
    };

    const prevStep = () => setStep(s => Math.max(s - 1, 0));

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const presentAddress = `${formData.presentDoorNo}, ${formData.presentStreet}, ${formData.presentVillage}, ${formData.presentMandal}, ${formData.presentDistrict} - ${formData.presentPincode}`;

            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-worker`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // Mapped fields
                    firstName: formData.firstName.trim(),
                    lastName: formData.lastName.trim(),
                    phone: formData.phone,
                    password: formData.password,
                    dateOfBirth: formData.dateOfBirth,
                    gender: formData.gender.toLowerCase(),
                    aadhaarLastFour: formData.aadhaar.replace(/-/g, '').slice(-4),
                    aadhaarNumber: formData.aadhaar,
                    state: 'Andhra Pradesh',
                    district: formData.presentDistrict,
                    mandal: formData.presentMandal,
                    village: formData.presentVillage,
                    pincode: formData.presentPincode,
                    addressLine: presentAddress,

                    fatherName: formData.fatherName,
                    motherName: formData.motherName,
                    maritalStatus: formData.maritalStatus,
                    caste: formData.caste,
                    disabilityStatus: formData.disabilityStatus,
                    photoUrl: formData.photoUrl,

                    bankAccountNumber: formData.bankAccountNumber,
                    ifscCode: formData.ifscCode,
                    eshramId: formData.eshramId,
                    bocwId: formData.bocwId,
                    nresMember: formData.nresMember,
                    tradeUnionMember: formData.tradeUnionMember,

                    educationLevel: formData.educationLevel,
                    skillCategory: formData.skillCategory,
                    workHistory: formData.workHistory,
                    // Emergency contact fallback to Father
                    emergencyContactName: formData.fatherName,
                }),
            });

            const data = await response.json();
            if (data.success) {
                toast({ title: 'Success!', description: `Worker ID: ${data.worker_id}` });
                navigate('/auth?role=worker');
            } else {
                toast({ title: 'Registration Failed', description: data.message, variant: 'destructive' });
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Network error or server unavailable.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    // UI Components
    const ReqStar = () => <span className="text-destructive ml-1">*</span>;
    const ErrorMsg = ({ id }: { id: string }) => errors[id] ? <p className="text-sm text-destructive mt-1">{errors[id]}</p> : null;

    return (
        <div className="min-h-screen bg-muted/30 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"><ArrowLeft className="w-4 h-4" /> Back to Home</Link>

                {/* Steps Indicator */}
                <div className="mb-8 overflow-x-auto">
                    <div className="flex items-center justify-between min-w-[600px] px-2">
                        {STEPS.map((s, idx) => (
                            <div key={idx} className="flex flex-col items-center gap-2 relative z-10">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors
                            ${idx < step ? 'bg-primary border-primary text-primary-foreground' :
                                        idx === step ? 'bg-background border-primary text-primary' :
                                            'bg-background border-muted text-muted-foreground'}`}>
                                    {idx < step ? <Check className="w-4 h-4" /> : idx + 1}
                                </div>
                                <span className={`text-xs ${idx === step ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{s}</span>
                            </div>
                        ))}
                        {/* Connector Line could be added here */}
                    </div>
                </div>

                <Card className="shadow-lg border-0">
                    <CardHeader className="bg-primary/5 border-b">
                        <CardTitle>{STEPS[step]}</CardTitle>
                        <CardDescription>
                            {step === 0 && 'Verify your identity securely.'}
                            {step === 1 && 'Basic personal information.'}
                            {step === 2 && 'Family, caste, banking & photo.'}
                            {step === 3 && 'Skills & education details.'}
                            {step === 4 && 'Communication details.'}
                            {step === 5 && 'Review & Submit.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">

                        {/* --- Step 0: Identity --- */}
                        {step === 0 && (
                            <div className="space-y-6 max-w-md mx-auto">
                                <div className="space-y-2">
                                    <Label>Aadhaar Number <ReqStar /></Label>
                                    <Input value={formData.aadhaar} onChange={e => {
                                        const val = formatAadhaar(e.target.value);
                                        setFormData(p => ({ ...p, aadhaar: val }));
                                        if (formData.otpVerified) setFormData(p => ({ ...p, otpVerified: false }));
                                    }} placeholder="XXXX-XXXX-XXXX" maxLength={14} disabled={formData.otpVerified} />
                                    <ErrorMsg id="aadhaar" />
                                </div>

                                {!formData.otpVerified && (
                                    <div className="space-y-4 pt-2">
                                        <Button onClick={() => { setOtpLoading(true); setTimeout(() => { setFormData(p => ({ ...p, otpSent: true })); setOtpLoading(false); }, 1500); }}
                                            className="w-full" variant="outline" disabled={formData.aadhaar.length !== 14 || otpLoading || formData.otpSent}>
                                            {otpLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />} {formData.otpSent ? 'OTP Sent' : 'Get OTP'}
                                        </Button>
                                        {formData.otpSent && (
                                            <div className="flex gap-2">
                                                <Input value={formData.otp} onChange={e => setFormData(p => ({ ...p, otp: e.target.value }))} placeholder="Enter OTP" maxLength={4} />
                                                <Button onClick={() => {
                                                    if (formData.otp.length === 4) setFormData(p => ({ ...p, otpVerified: true }));
                                                    else setErrors(p => ({ ...p, otp: 'Invalid OTP' }));
                                                }}>Verify</Button>
                                            </div>
                                        )}
                                        <ErrorMsg id="otp" />
                                    </div>
                                )}
                                {formData.otpVerified && (
                                    <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-center gap-3 border border-green-200">
                                        <ShieldCheck className="w-5 h-5" /> Aadhaar Verified
                                    </div>
                                )}
                                <ErrorMsg id="otpVerified" />
                            </div>
                        )}

                        {/* --- Step 1: Personal --- */}
                        {step === 1 && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>First Name <ReqStar /></Label>
                                        <Input value={formData.firstName} onChange={e => updateField('firstName', e.target.value)} />
                                        <ErrorMsg id="firstName" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Last Name <ReqStar /></Label>
                                        <Input value={formData.lastName} onChange={e => updateField('lastName', e.target.value)} />
                                        <ErrorMsg id="lastName" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Gender <ReqStar /></Label>
                                        <Select value={formData.gender} onValueChange={v => updateField('gender', v)}>
                                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                            <SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <ErrorMsg id="gender" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Date of Birth <ReqStar /></Label>
                                        <Input type="date" value={formData.dateOfBirth} onChange={e => updateField('dateOfBirth', e.target.value)} />
                                        <ErrorMsg id="dateOfBirth" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone Number <ReqStar /></Label>
                                    <Input value={formData.phone} onChange={e => updateField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="9876543210" />
                                    <ErrorMsg id="phone" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Password <ReqStar /></Label>
                                        <div className="relative">
                                            <Input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={e => updateField('password', e.target.value)} />
                                            <Button variant="ghost" size="icon" className="absolute right-0 top-0" onClick={() => setShowPassword(!showPassword)}><Eye className="h-4 w-4" /></Button>
                                        </div>
                                        <ErrorMsg id="password" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Confirm Password <ReqStar /></Label>
                                        <Input type="password" value={formData.confirmPassword} onChange={e => updateField('confirmPassword', e.target.value)} />
                                        <ErrorMsg id="confirmPassword" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- Step 2: Other Details (NEW) --- */}
                        {step === 2 && (
                            <div className="space-y-4">
                                {/* Photo Upload */}
                                <div className="space-y-2 p-4 border rounded-lg bg-muted/20">
                                    <Label>Profile Photo <ReqStar /> <span className="text-xs text-muted-foreground font-normal">(PNG/JPG only)</span></Label>
                                    <div className="flex gap-4 items-center">
                                        {formData.photoUrl && <img src={formData.photoUrl} alt="Preview" className="h-16 w-16 rounded object-cover border" />}
                                        <Input type="file" accept="image/png, image/jpeg, image/jpg" onChange={handleFileUpload} disabled={uploading} />
                                    </div>
                                    {uploading && <p className="text-xs text-blue-500">Uploading...</p>}
                                    <ErrorMsg id="photoUrl" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Father Name <ReqStar /></Label>
                                        <Input value={formData.fatherName} onChange={e => updateField('fatherName', e.target.value)} />
                                        <ErrorMsg id="fatherName" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Mother Name <ReqStar /></Label>
                                        <Input value={formData.motherName} onChange={e => updateField('motherName', e.target.value)} />
                                        <ErrorMsg id="motherName" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Marital Status <ReqStar /></Label>
                                        <Select value={formData.maritalStatus} onValueChange={v => updateField('maritalStatus', v)}>
                                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                            <SelectContent>{MARITAL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <ErrorMsg id="maritalStatus" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Caste <ReqStar /></Label>
                                        <Select value={formData.caste} onValueChange={v => updateField('caste', v)}>
                                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                            <SelectContent>{CASTES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <ErrorMsg id="caste" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Disability</Label>
                                    <Select value={formData.disabilityStatus} onValueChange={v => updateField('disabilityStatus', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="None">None</SelectItem>
                                            <SelectItem value="Physical">Physical</SelectItem>
                                            <SelectItem value="Visual">Visual</SelectItem>
                                            <SelectItem value="Hearing">Hearing</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="pt-4 border-t">
                                    <h4 className="font-medium mb-4">Banking Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Account Number <ReqStar /></Label>
                                            <Input value={formData.bankAccountNumber} onChange={e => updateField('bankAccountNumber', e.target.value)} />
                                            <ErrorMsg id="bankAccountNumber" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>IFSC Code <ReqStar /></Label>
                                            <Input value={formData.ifscCode} onChange={e => updateField('ifscCode', e.target.value.toUpperCase())} placeholder="ABCD0123456" />
                                            <ErrorMsg id="ifscCode" />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t">
                                    <h4 className="font-medium mb-4">Additional IDs (Optional)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2"><Label>eShram ID</Label><Input value={formData.eshramId} onChange={e => updateField('eshramId', e.target.value)} /></div>
                                        <div className="space-y-2"><Label>BOCW ID</Label><Input value={formData.bocwId} onChange={e => updateField('bocwId', e.target.value)} /></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                        <div className="space-y-2">
                                            <Label>NRES Member</Label>
                                            <Select value={formData.nresMember} onValueChange={v => updateField('nresMember', v)}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Union Member</Label>
                                            <Select value={formData.tradeUnionMember} onValueChange={v => updateField('tradeUnionMember', v)}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- Step 3: Professional (Simplified) --- */}
                        {step === 3 && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Education Level</Label>
                                        <Select value={formData.educationLevel} onValueChange={v => updateField('educationLevel', v)}>
                                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                            <SelectContent>
                                                {['Illiterate', '5th Pass', '8th Pass', '10th Pass', '12th Pass', 'ITI/Diploma', 'Graduate', 'Post Graduate'].map(l =>
                                                    <SelectItem key={l} value={l}>{l}</SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Skill Category</Label>
                                        <Select value={formData.skillCategory} onValueChange={v => updateField('skillCategory', v)}>
                                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                            <SelectContent>
                                                {['Unskilled', 'Semi-Skilled', 'Skilled', 'Highly Skilled'].map(s =>
                                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Work History / Experience</Label>
                                    <Textarea value={formData.workHistory} onChange={e => updateField('workHistory', e.target.value)} placeholder="Describe previous work experience..." />
                                </div>
                            </div>
                        )}

                        {/* --- Step 4: Address --- */}
                        {step === 4 && (
                            <div className="space-y-4">
                                <div className="space-y-4">
                                    <h4 className="font-medium text-primary">Present Address</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2"><Label>Door No <ReqStar /></Label><Input value={formData.presentDoorNo} onChange={e => updateField('presentDoorNo', e.target.value)} /><ErrorMsg id="presentDoorNo" /></div>
                                        <div className="space-y-2"><Label>Street <ReqStar /></Label><Input value={formData.presentStreet} onChange={e => updateField('presentStreet', e.target.value)} /><ErrorMsg id="presentStreet" /></div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>District <ReqStar /></Label>
                                        <Select value={formData.presentDistrict} onValueChange={v => updateField('presentDistrict', v)}>
                                            <SelectTrigger><SelectValue placeholder="Select District" /></SelectTrigger>
                                            <SelectContent>{districts.map(d => <SelectItem key={d.code} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <ErrorMsg id="presentDistrict" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Mandal <ReqStar /></Label>
                                            <Select value={formData.presentMandal} onValueChange={v => updateField('presentMandal', v)} disabled={!formData.presentDistrict}>
                                                <SelectTrigger><SelectValue placeholder="Select Mandal" /></SelectTrigger>
                                                <SelectContent>{presentMandals.map(m => <SelectItem key={m.code} value={m.name}>{m.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <ErrorMsg id="presentMandal" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Village <ReqStar /></Label>
                                            <Select value={formData.presentVillage} onValueChange={v => updateField('presentVillage', v)} disabled={!formData.presentMandal}>
                                                <SelectTrigger><SelectValue placeholder="Select Village" /></SelectTrigger>
                                                <SelectContent>{presentVillages.map(v => <SelectItem key={v.code} value={v.name}>{v.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <ErrorMsg id="presentVillage" />
                                        </div>
                                    </div>
                                    <div className="space-y-2"><Label>Pincode <ReqStar /></Label><Input value={formData.presentPincode} onChange={e => updateField('presentPincode', e.target.value.slice(0, 6))} /><ErrorMsg id="presentPincode" /></div>
                                </div>

                                <div className="flex items-center space-x-2 py-4 border-t">
                                    <Checkbox id="sameAs" checked={formData.sameAsPresent} onCheckedChange={(c) => updateField('sameAsPresent', !!c)} />
                                    <Label htmlFor="sameAs">Permanent Address same as Present</Label>
                                </div>

                                {!formData.sameAsPresent && (
                                    <div className="space-y-4">
                                        <h4 className="font-medium text-primary">Permanent Address</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2"><Label>Door No <ReqStar /></Label><Input value={formData.permanentDoorNo} onChange={e => updateField('permanentDoorNo', e.target.value)} /><ErrorMsg id="permanentDoorNo" /></div>
                                            <div className="space-y-2"><Label>Street <ReqStar /></Label><Input value={formData.permanentStreet} onChange={e => updateField('permanentStreet', e.target.value)} /><ErrorMsg id="permanentStreet" /></div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>District <ReqStar /></Label>
                                            <Select value={formData.permanentDistrict} onValueChange={v => updateField('permanentDistrict', v)}>
                                                <SelectTrigger><SelectValue placeholder="Select District" /></SelectTrigger>
                                                <SelectContent>{districts.map(d => <SelectItem key={d.code} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <ErrorMsg id="permanentDistrict" />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Mandal <ReqStar /></Label>
                                                <Select value={formData.permanentMandal} onValueChange={v => updateField('permanentMandal', v)} disabled={!formData.permanentDistrict}>
                                                    <SelectTrigger><SelectValue placeholder="Select Mandal" /></SelectTrigger>
                                                    <SelectContent>{permanentMandals.map(m => <SelectItem key={m.code} value={m.name}>{m.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                                <ErrorMsg id="permanentMandal" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Village <ReqStar /></Label>
                                                <Select value={formData.permanentVillage} onValueChange={v => updateField('permanentVillage', v)} disabled={!formData.permanentMandal}>
                                                    <SelectTrigger><SelectValue placeholder="Select Village" /></SelectTrigger>
                                                    <SelectContent>{permanentVillages.map(v => <SelectItem key={v.code} value={v.name}>{v.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                                <ErrorMsg id="permanentVillage" />
                                            </div>
                                        </div>
                                        <div className="space-y-2"><Label>Pincode <ReqStar /></Label><Input value={formData.permanentPincode} onChange={e => updateField('permanentPincode', e.target.value.slice(0, 6))} /><ErrorMsg id="permanentPincode" /></div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- Step 5: Review --- */}
                        {step === 5 && (
                            <div className="space-y-4">
                                <div className="bg-muted p-4 rounded text-sm space-y-2">
                                    <p><strong>Name:</strong> {formData.firstName} {formData.lastName}</p>
                                    <p><strong>Aadhaar:</strong> {formData.aadhaar}</p>
                                    <p><strong>Phone:</strong> {formData.phone}</p>
                                    <p><strong>Caste:</strong> {formData.caste}</p>
                                    <p><strong>Address:</strong> {formData.presentVillage}, {formData.presentDistrict}</p>
                                </div>
                                <p className="text-center text-muted-foreground">Please ensure all details are correct before submitting.</p>
                            </div>
                        )}

                        <div className="flex justify-between mt-8 pt-4 border-t">
                            <Button variant="outline" onClick={prevStep} disabled={step === 0 || loading}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back
                            </Button>
                            {step < 5 ? (
                                <Button onClick={nextStep} disabled={uploading}>Next <ArrowRight className="w-4 h-4 ml-2" /></Button>
                            ) : (
                                <Button onClick={handleSubmit} disabled={loading || uploading}>
                                    {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Submit Registration
                                </Button>
                            )}
                        </div>

                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

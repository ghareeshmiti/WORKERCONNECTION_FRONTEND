
import { useState, useMemo } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import { getDistricts, getMandalsForDistrict, getVillagesForMandal } from '@/data/india-locations';
import { useNavigate } from 'react-router-dom';

// Validation Schemes
const identitySchema = z.object({
    aadhaar: z.string().length(14, "Aadhaar must be 12 digits"), // XXXX-XXXX-XXXX
    otp: z.string().length(4, "OTP must be 4 digits"),
    eshramId: z.string().min(10, "Invalid eShram ID").optional().or(z.literal('')),
    bocwId: z.string().min(5, "Invalid BOCW ID").optional().or(z.literal('')),
});

const personalSchema = z.object({
    firstName: z.string().min(2, "First Name required"),
    lastName: z.string().min(2, "Last Name required"),
    gender: z.string().min(1, "Gender required"),
    dob: z.string().min(1, "Date of Birth required"),
    phone: z.string().regex(/^[6-9]\d{9}$/, "Valid mobile number required"),
});

const addressSchema = z.object({
    district: z.string().min(1, "District required"),
    mandal: z.string().min(1, "Mandal required"),
    village: z.string().min(1, "Village required"),
    pincode: z.string().regex(/^\d{6}$/, "Valid pincode required"),
    addressLine: z.string().optional(),
});

type FormData = {
    // Stage 1
    aadhaar: string;
    otp: string;
    eshramId: string;
    bocwId: string;
    isVerified: boolean;

    // Stage 2
    firstName: string;
    lastName: string;
    gender: string;
    dob: string;
    phone: string;

    // Stage 3
    district: string;
    mandal: string;
    village: string;
    pincode: string;
    addressLine: string;
};

const GENDERS = ['Male', 'Female', 'Other'];

export default function WorkerSelfRegistration() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [step, setStep] = useState(0); // 0: Identity, 1: Personal, 2: Address, 3: Success
    const [loading, setLoading] = useState(false);
    const [otpSent, setOtpSent] = useState(false);

    const [formData, setFormData] = useState<FormData>({
        aadhaar: '', otp: '', eshramId: '', bocwId: '', isVerified: false,
        firstName: '', lastName: '', gender: '', dob: '', phone: '',
        district: '', mandal: '', village: '', pincode: '', addressLine: ''
    });

    // Location Data
    const districts = useMemo(() => getDistricts(), []);
    const mandals = useMemo(() => {
        if (!formData.district) return [];
        const d = districts.find((x: any) => (x.code === formData.district || x.name === formData.district || x === formData.district));
        return getMandalsForDistrict(typeof d === 'string' ? d : d?.name || formData.district);
    }, [formData.district, districts]);
    const villages = useMemo(() => {
        if (!formData.mandal) return [];
        const d = districts.find((x: any) => (x.code === formData.district || x.name === formData.district || x === formData.district));
        return getVillagesForMandal(typeof d === 'string' ? d : d?.name || formData.district, formData.mandal);
    }, [formData.mandal, formData.district, districts]);


    const updateField = (k: keyof FormData, v: any) => setFormData(p => ({ ...p, [k]: v }));

    const formatAadhaar = (v: string) => {
        const d = v.replace(/\D/g, '').slice(0, 12);
        const parts = [];
        for (let i = 0; i < d.length; i += 4) parts.push(d.slice(i, i + 4));
        return parts.join('-');
    };

    const handleSendOtp = () => {
        if (formData.aadhaar.length < 14) return toast({ title: "Invalid Aadhaar", variant: "destructive" });
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setOtpSent(true);
            toast({ title: "OTP Sent", description: "Use any 4 digits to verify." });
        }, 1500);
    };

    const handleVerifyOtp = () => {
        if (formData.otp.length !== 4) return toast({ title: "Invalid OTP", variant: "destructive" });
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            updateField('isVerified', true);
            toast({ title: "Verified", description: "Identity verified successfully." });
        }, 1000);
    };

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payload = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                aadhaarNumber: formData.aadhaar, // Full Aadhaar
                phone: formData.phone,
                dob: formData.dob,
                gender: formData.gender,
                state: 'Andhra Pradesh',
                district: formData.district,
                mandal: formData.mandal,
                village: formData.village,
                pincode: formData.pincode,
                addressLine: formData.addressLine,
                eshramId: formData.eshramId,
                bocwId: formData.bocwId
            };

            const res = await fetch(`${API_URL}/public/register-worker`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            setStep(3); // Success
        } catch (e: any) {
            toast({ title: "Registration Failed", description: e.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl shadow-lg">
                <CardHeader className="text-center border-b bg-white rounded-t-xl">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                        <ShieldCheck className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-display text-primary">Worker Registration</CardTitle>
                    <CardDescription>Join the secure workforce network</CardDescription>

                    {/* Stepper */}
                    <div className="flex justify-center gap-2 mt-6">
                        {[0, 1, 2].map(i => (
                            <div key={i} className={`h-2 w-16 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-slate-200'}`} />
                        ))}
                    </div>
                </CardHeader>

                <CardContent className="p-6 md:p-8">
                    {/* STAGE 1: IDENTITY */}
                    {step === 0 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="text-center space-y-2 mb-6">
                                <h3 className="text-lg font-semibold">Identity Verification</h3>
                                <p className="text-sm text-muted-foreground">Verify your Aadhaar to proceed via OTP.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Aadhaar Number</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                value={formData.aadhaar}
                                                onChange={e => updateField('aadhaar', formatAadhaar(e.target.value))}
                                                placeholder="XXXX-XXXX-XXXX"
                                                maxLength={14}
                                                disabled={formData.isVerified}
                                            />
                                            {!formData.isVerified && (
                                                <Button
                                                    onClick={handleSendOtp}
                                                    disabled={loading || formData.aadhaar.length < 14 || otpSent}
                                                    variant="outline"
                                                >
                                                    {otpSent ? "Sent" : "Get OTP"}
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {otpSent && !formData.isVerified && (
                                        <div className="space-y-2">
                                            <Label>Enter OTP</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={formData.otp}
                                                    onChange={e => updateField('otp', e.target.value.replace(/\D/g, '').slice(0, 4))}
                                                    placeholder="XXXX"
                                                    maxLength={4}
                                                />
                                                <Button onClick={handleVerifyOtp} disabled={loading}>Verify</Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground">Enter any 4 digits (Demo Mode)</p>
                                        </div>
                                    )}

                                    {formData.isVerified && (
                                        <div className="flex items-center text-success font-medium h-10 mt-6">
                                            <CheckCircle2 className="w-5 h-5 mr-2" /> Verified
                                        </div>
                                    )}
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>eShram ID</Label>
                                        <Input
                                            value={formData.eshramId}
                                            onChange={e => updateField('eshramId', e.target.value)}
                                            placeholder="eShram Number"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>BOCW ID</Label>
                                        <Input
                                            value={formData.bocwId}
                                            onChange={e => updateField('bocwId', e.target.value)}
                                            placeholder="BOCW Registration Number"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button
                                        onClick={() => setStep(1)}
                                        disabled={!formData.isVerified}
                                        className="w-full md:w-auto"
                                    >
                                        Next Step <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STAGE 2: PERSONAL INFO */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="text-center space-y-2 mb-6">
                                <h3 className="text-lg font-semibold">Personal Details</h3>
                                <p className="text-sm text-muted-foreground">Tell us about yourself.</p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>First Name</Label>
                                    <Input value={formData.firstName} onChange={e => updateField('firstName', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Last Name</Label>
                                    <Input value={formData.lastName} onChange={e => updateField('lastName', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Date of Birth</Label>
                                    <Input
                                        type="date"
                                        value={formData.dob}
                                        onChange={e => updateField('dob', e.target.value)}
                                        max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Gender</Label>
                                    <Select value={formData.gender} onValueChange={v => updateField('gender', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            {GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label>Mobile Number</Label>
                                    <Input
                                        value={formData.phone}
                                        onChange={e => updateField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        maxLength={10}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between pt-4">
                                <Button variant="outline" onClick={() => setStep(0)}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                                <Button
                                    onClick={() => {
                                        if (formData.firstName && formData.lastName && formData.dob && formData.gender && formData.phone.length === 10)
                                            setStep(2);
                                        else
                                            toast({ title: "Missing Fields", variant: "destructive" });
                                    }}
                                >
                                    Next Step <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STAGE 3: ADDRESS */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="text-center space-y-2 mb-6">
                                <h3 className="text-lg font-semibold">Address Details</h3>
                                <p className="text-sm text-muted-foreground">Where are you located?</p>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>state</Label>
                                        <Input value="Andhra Pradesh" disabled />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>District</Label>
                                        <Select value={formData.district} onValueChange={v => updateField('district', v)}>
                                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                            <SelectContent>
                                                {districts.map((d: any) => (
                                                    <SelectItem key={d.code || d} value={d.code || d}>{d.name || d}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Mandal</Label>
                                        <Select value={formData.mandal} onValueChange={v => updateField('mandal', v)} disabled={!formData.district}>
                                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                            <SelectContent>
                                                {mandals.map((m: any) => (
                                                    <SelectItem key={m.code || m} value={m.name || m}>{m.name || m}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Village</Label>
                                        <Select value={formData.village} onValueChange={v => updateField('village', v)} disabled={!formData.mandal}>
                                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                            <SelectContent>
                                                {villages.map((v: any) => (
                                                    <SelectItem key={v.code} value={v.name}>{v.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Pincode</Label>
                                        <Input value={formData.pincode} onChange={e => updateField('pincode', e.target.value)} maxLength={6} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Address Line</Label>
                                        <Input value={formData.addressLine} onChange={e => updateField('addressLine', e.target.value)} />
                                    </div>
                                </div>

                                <div className="flex justify-between pt-4">
                                    <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                                    <Button onClick={handleSubmit} disabled={loading}>
                                        {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                        Submit Registration
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SUCCESS */}
                    {step === 3 && (
                        <div className="text-center py-10 space-y-6 animate-in zoom-in duration-300">
                            <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-10 h-10 text-success" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold">Registration Successful!</h3>
                                <p className="text-muted-foreground">Your application has been submitted.</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg border max-w-sm mx-auto">
                                <p className="text-sm font-medium">Status: <span className="text-warning">Pending Approval</span></p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Visit the Department office for final approval and to collect your FIDO Smart Card.
                                </p>
                            </div>
                            <Button onClick={() => navigate('/')} variant="outline" className="mt-4">
                                Return to Home
                            </Button>
                        </div>
                    )}

                </CardContent>
            </Card>
        </div>
    );
}

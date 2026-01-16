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
import { Loader2, ArrowLeft, ArrowRight, Check, User, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { getDistricts, getMandalsForDistrict, getVillagesForMandal } from '@/data/india-locations';

// Password validation regex
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Format Aadhaar with hyphens
const formatAadhaar = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  const parts = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join('-');
};

// Calculate age from date of birth
const calculateAge = (dob: string): number => {
  if (!dob) return 0;
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Validation schemas
const identitySchema = z.object({
  aadhaar: z.string().regex(/^\d{4}-\d{4}-\d{4}$/, 'Aadhaar must be in XXXX-XXXX-XXXX format'),
  otpVerified: z.literal(true, { errorMap: () => ({ message: 'Please verify OTP' }) }),
});

const personalSchema = z.object({
  firstName: z.string().trim().min(2, 'First name must be at least 2 characters').max(50),
  lastName: z.string().trim().min(2, 'Last name must be at least 2 characters').max(50),
  gender: z.string().min(1, 'Gender is required'),
  maritalStatus: z.string().min(1, 'Marital status is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit mobile number'),
  password: z.string().regex(passwordRegex, 'Password must have min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character'),
  confirmPassword: z.string(),
  caste: z.string().optional(),
  disabilityStatus: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => {
  const age = calculateAge(data.dateOfBirth);
  return age >= 18;
}, {
  message: "Must be at least 18 years old",
  path: ["dateOfBirth"],
});

const professionalSchema = z.object({
  educationLevel: z.string().optional(),
  skillCategory: z.string().optional(),
  workHistory: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  nresMember: z.string().optional(),
  tradeUnionMember: z.string().optional(),
  eshramId: z.string().optional(),
  bocwId: z.string().optional(),
});

const addressSchema = z.object({
  presentDoorNo: z.string().trim().min(1, 'Door number is required').max(20),
  presentStreet: z.string().trim().min(1, 'Street is required').max(100),
  presentDistrict: z.string().min(1, 'District is required'),
  presentMandal: z.string().min(1, 'Mandal/City is required'),
  presentVillage: z.string().min(1, 'Village/Area is required'),
  presentPincode: z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits'),
  permanentDoorNo: z.string().trim().min(1, 'Door number is required').max(20),
  permanentStreet: z.string().trim().min(1, 'Street is required').max(100),
  permanentDistrict: z.string().min(1, 'District is required'),
  permanentMandal: z.string().min(1, 'Mandal/City is required'),
  permanentVillage: z.string().min(1, 'Village/Area is required'),
  permanentPincode: z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits'),
});


type FormData = {
  aadhaar: string;
  otp: string;
  otpVerified: boolean;
  otpSent: boolean;
  firstName: string;
  lastName: string;
  gender: string;
  maritalStatus: string;
  dateOfBirth: string;
  fatherName: string;
  motherName: string;
  caste: string;
  disabilityStatus: string;
  phone: string;
  password: string;
  confirmPassword: string;

  educationLevel: string;
  skillCategory: string;
  workHistory: string;
  bankAccountNumber: string;
  ifscCode: string;
  nresMember: string;
  tradeUnionMember: string;
  eshramId: string;
  bocwId: string;
  photoUrl: string;

  presentDoorNo: string;
  presentStreet: string;
  presentDistrict: string;
  presentMandal: string;
  presentVillage: string;
  presentPincode: string;
  permanentDoorNo: string;
  permanentStreet: string;
  permanentDistrict: string;
  permanentMandal: string;
  permanentVillage: string;
  permanentPincode: string;
  sameAsPresent: boolean;
};

const STEPS = ['Identity', 'Personal', 'Professional', 'Address', 'Review'];
const GENDERS = ['Male', 'Female', 'Other'];
const MARITAL_STATUSES = ['Single', 'Married', 'Widowed', 'Divorced'];

export default function WorkerRegister() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    aadhaar: '', otp: '', otpVerified: false, otpSent: false,
    firstName: '', lastName: '',
    gender: '', maritalStatus: '', dateOfBirth: '',
    fatherName: '', motherName: '', caste: '', disabilityStatus: 'None',
    phone: '', password: '', confirmPassword: '',

    educationLevel: '', skillCategory: '', workHistory: '',
    bankAccountNumber: '', ifscCode: '',
    nresMember: 'No', tradeUnionMember: 'No',
    eshramId: '', bocwId: '', photoUrl: '',

    presentDoorNo: '', presentStreet: '', presentDistrict: '',
    presentMandal: '', presentVillage: '', presentPincode: '',
    permanentDoorNo: '', permanentStreet: '', permanentDistrict: '',
    permanentMandal: '', permanentVillage: '', permanentPincode: '',
    sameAsPresent: false,
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  const districts = useMemo(() => getDistricts(), []);
  const presentMandals = useMemo(() => getMandalsForDistrict(formData.presentDistrict), [formData.presentDistrict]);
  const presentVillages = useMemo(() => getVillagesForMandal(formData.presentDistrict, formData.presentMandal), [formData.presentDistrict, formData.presentMandal]);

  const permanentMandals = useMemo(() => getMandalsForDistrict(formData.permanentDistrict), [formData.permanentDistrict]);
  const permanentVillages = useMemo(() => getVillagesForMandal(formData.permanentDistrict, formData.permanentMandal), [formData.permanentDistrict, formData.permanentMandal]);

  const age = useMemo(() => calculateAge(formData.dateOfBirth), [formData.dateOfBirth]);

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      if (field === 'presentDistrict') {
        newData.presentMandal = '';
        newData.presentVillage = '';
      } else if (field === 'presentMandal') {
        newData.presentVillage = '';
      }

      if (field === 'permanentDistrict') {
        newData.permanentMandal = '';
        newData.permanentVillage = '';
      } else if (field === 'permanentMandal') {
        newData.permanentVillage = '';
      }

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

  const handleAadhaarChange = (value: string) => {
    const formatted = formatAadhaar(value);
    updateField('aadhaar', formatted);
    if (formData.otpVerified || formData.otpSent) {
      setFormData(prev => ({ ...prev, otpVerified: false, otpSent: false, otp: '' }));
    }
  };

  const isValidAadhaar = /^\d{4}-\d{4}-\d{4}$/.test(formData.aadhaar);

  const handleGenerateOTP = () => {
    if (!isValidAadhaar) return;
    setOtpLoading(true);
    setTimeout(() => {
      setFormData(prev => ({ ...prev, otpSent: true }));
      toast({ title: 'OTP Sent', description: 'A verification OTP has been sent (simulated).' });
      setOtpLoading(false);
    }, 1000);
  };

  const handleVerifyOTP = () => {
    if (formData.otp.length === 4 && /^\d{4}$/.test(formData.otp)) {
      setFormData(prev => ({ ...prev, otpVerified: true }));
      toast({ title: 'Verified!', description: 'Aadhaar verification successful.' });
    } else {
      setErrors(prev => ({ ...prev, otp: 'Please enter a valid 4-digit OTP' }));
    }
  };

  const validateStep = (stepIndex: number): boolean => {
    try {
      setErrors({});
      switch (stepIndex) {
        case 0:
          identitySchema.parse({
            aadhaar: formData.aadhaar,
            otpVerified: formData.otpVerified,
          });
          break;
        case 1:
          personalSchema.parse(formData);
          break;
        case 2:
          professionalSchema.parse(formData);
          break;
        case 3:
          addressSchema.parse(formData);
          break;
      }
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach(e => {
          if (e.path[0]) newErrors[e.path[0] as string] = e.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const prevStep = () => setStep(prev => Math.max(prev - 1, 0));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const presentAddress = `${formData.presentDoorNo}, ${formData.presentStreet}, ${formData.presentVillage}, ${formData.presentMandal}, ${formData.presentDistrict} - ${formData.presentPincode}`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-worker`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
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
            emergencyContactName: formData.fatherName?.trim() || '',
            emergencyContactPhone: null,

            fatherName: formData.fatherName,
            motherName: formData.motherName,
            maritalStatus: formData.maritalStatus,
            caste: formData.caste,
            disabilityStatus: formData.disabilityStatus,

            educationLevel: formData.educationLevel,
            skillCategory: formData.skillCategory,
            workHistory: formData.workHistory,
            bankAccountNumber: formData.bankAccountNumber,
            ifscCode: formData.ifscCode,
            photoUrl: formData.photoUrl,
            nresMember: formData.nresMember,
            tradeUnionMember: formData.tradeUnionMember,
            eshramId: formData.eshramId,
            bocwId: formData.bocwId,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({ title: 'Success!', description: `Registration complete. Your Worker ID is ${data.worker_id}` });
        navigate('/auth?role=worker');
      } else {
        toast({ title: 'Registration Failed', description: data.message, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to register. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center">
              <User className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-display font-bold">Worker Registration</h1>
          <p className="text-muted-foreground">Create your account to track attendance</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8 flex-wrap gap-y-2">
          {STEPS.map((stepName, index) => (
            <div key={stepName} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${index < step ? 'bg-primary text-primary-foreground' :
                index === step ? 'bg-primary text-primary-foreground' :
                  'bg-muted text-muted-foreground'
                }`}>
                {index < step ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <span className={`ml-2 text-xs hidden lg:inline ${index === step ? 'font-medium' : 'text-muted-foreground'}`}>
                {stepName}
              </span>
              {index < STEPS.length - 1 && (
                <div className={`w-6 md:w-8 h-0.5 mx-2 ${index < step ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step]}</CardTitle>
            <CardDescription>
              {step === 0 && 'Verify your identity using Aadhaar'}
              {step === 1 && 'Enter your personal details'}
              {step === 2 && 'Professional & Banking Details'}
              {step === 3 && 'Enter your present and permanent address'}
              {step === 4 && 'Review your information before submitting'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step 0: Identity Verification */}
            {step === 0 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="aadhaar">Aadhaar Number *</Label>
                  <Input
                    id="aadhaar"
                    value={formData.aadhaar}
                    onChange={e => handleAadhaarChange(e.target.value)}
                    placeholder="XXXX-XXXX-XXXX"
                    maxLength={14}
                    disabled={formData.otpVerified}
                    className={formData.otpVerified ? 'bg-muted' : ''}
                  />
                  {errors.aadhaar && <p className="text-sm text-destructive">{errors.aadhaar}</p>}
                </div>

                {!formData.otpVerified && (
                  <div className="space-y-4">
                    <Button
                      onClick={handleGenerateOTP}
                      disabled={!isValidAadhaar || otpLoading || formData.otpSent}
                      variant="outline"
                      className="w-full"
                    >
                      {otpLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {formData.otpSent ? 'OTP Sent' : 'Generate OTP'}
                    </Button>

                    {formData.otpSent && (
                      <div className="space-y-2">
                        <Label htmlFor="otp">Enter OTP *</Label>
                        <div className="flex gap-2">
                          <Input
                            id="otp"
                            value={formData.otp}
                            onChange={e => updateField('otp', e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="Enter 4-digit OTP"
                            maxLength={4}
                            className="flex-1"
                          />
                          <Button onClick={handleVerifyOTP} disabled={formData.otp.length !== 4}>
                            Verify
                          </Button>
                        </div>
                        {errors.otp && <p className="text-sm text-destructive">{errors.otp}</p>}
                        <p className="text-xs text-muted-foreground">For POC: Enter any 4-digit number</p>
                      </div>
                    )}
                  </div>
                )}

                {formData.otpVerified && (
                  <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200">Aadhaar Verified Successfully</p>
                      <p className="text-sm text-green-600 dark:text-green-400">Your identity has been verified</p>
                    </div>
                  </div>
                )}
                {errors.otpVerified && <p className="text-sm text-destructive">{errors.otpVerified}</p>}
              </div>
            )}

            {/* Step 1: Personal Information */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name *</Label>
                    <Input value={formData.firstName} onChange={e => updateField('firstName', e.target.value)} />
                    {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name *</Label>
                    <Input value={formData.lastName} onChange={e => updateField('lastName', e.target.value)} />
                    {errors.lastName && <p className="text-sm text-destructive">{errors.lastName}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Gender *</Label>
                    <Select value={formData.gender} onValueChange={v => updateField('gender', v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.gender && <p className="text-sm text-destructive">{errors.gender}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth *</Label>
                    <Input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={e => updateField('dateOfBirth', e.target.value)}
                      max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                    />
                    {errors.dateOfBirth && <p className="text-sm text-destructive">{errors.dateOfBirth}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Father Name</Label>
                    <Input value={formData.fatherName} onChange={e => updateField('fatherName', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Mother Name</Label>
                    <Input value={formData.motherName} onChange={e => updateField('motherName', e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Marital Status *</Label>
                    <Select value={formData.maritalStatus} onValueChange={v => updateField('maritalStatus', v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {MARITAL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.maritalStatus && <p className="text-sm text-destructive">{errors.maritalStatus}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Caste</Label>
                    <Input value={formData.caste} onChange={e => updateField('caste', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Disability Status</Label>
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

                <div className="space-y-2">
                  <Label>Mobile Number *</Label>
                  <Input
                    value={formData.phone}
                    onChange={e => updateField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    maxLength={10}
                  />
                  {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Password *</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={e => updateField('password', e.target.value)}
                        placeholder="Min 8 chars..."
                      />
                      <Button
                        type="button" variant="ghost" size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm Password *</Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={e => updateField('confirmPassword', e.target.value)}
                        placeholder="Re-enter password"
                      />
                      <Button
                        type="button" variant="ghost" size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Professional Details */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Education Level</Label>
                    <Select value={formData.educationLevel} onValueChange={v => updateField('educationLevel', v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Illiterate">Illiterate</SelectItem>
                        <SelectItem value="5th Pass">5th Pass</SelectItem>
                        <SelectItem value="8th Pass">8th Pass</SelectItem>
                        <SelectItem value="10th Pass">10th Pass</SelectItem>
                        <SelectItem value="12th Pass">12th Pass</SelectItem>
                        <SelectItem value="ITI/Diploma">ITI/Diploma</SelectItem>
                        <SelectItem value="Graduate">Graduate</SelectItem>
                        <SelectItem value="Post Graduate">Post Graduate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Skill Category</Label>
                    <Select value={formData.skillCategory} onValueChange={v => updateField('skillCategory', v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Unskilled">Unskilled</SelectItem>
                        <SelectItem value="Semi-Skilled">Semi-Skilled</SelectItem>
                        <SelectItem value="Skilled">Skilled</SelectItem>
                        <SelectItem value="Highly Skilled">Highly Skilled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Work History</Label>
                  <Textarea
                    value={formData.workHistory}
                    onChange={e => updateField('workHistory', e.target.value)}
                    placeholder="List past employers, dates, and roles..."
                  />
                </div>

                <h3 className="font-medium pt-4 border-t">Banking & IDs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bank Account Number</Label>
                    <Input value={formData.bankAccountNumber} onChange={e => updateField('bankAccountNumber', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>IFSC Code</Label>
                    <Input value={formData.ifscCode} onChange={e => updateField('ifscCode', e.target.value.toUpperCase())} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Photo URL</Label>
                  <Input value={formData.photoUrl} onChange={e => updateField('photoUrl', e.target.value)} placeholder="https://..." />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>eShram ID</Label>
                    <Input value={formData.eshramId} onChange={e => updateField('eshramId', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>BoCW ID</Label>
                    <Input value={formData.bocwId} onChange={e => updateField('bocwId', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>NRES Member</Label>
                    <Select value={formData.nresMember} onValueChange={v => updateField('nresMember', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Trade Union Member</Label>
                    <Select value={formData.tradeUnionMember} onValueChange={v => updateField('tradeUnionMember', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Address */}
            {step === 3 && (
              <div className="space-y-6">
                {/* Present Address */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Present Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Door No *</Label>
                      <Input
                        value={formData.presentDoorNo}
                        onChange={e => updateField('presentDoorNo', e.target.value)}
                        placeholder="e.g., 1-2-34/A"
                      />
                      {errors.presentDoorNo && <p className="text-sm text-destructive">{errors.presentDoorNo}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Street *</Label>
                      <Input
                        value={formData.presentStreet}
                        onChange={e => updateField('presentStreet', e.target.value)}
                        placeholder="Street name"
                      />
                      {errors.presentStreet && <p className="text-sm text-destructive">{errors.presentStreet}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>District *</Label>
                    <Select value={formData.presentDistrict} onValueChange={v => updateField('presentDistrict', v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50">
                        {districts.map(d => (
                          <SelectItem key={d.code} value={d.name}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.presentDistrict && <p className="text-sm text-destructive">{errors.presentDistrict}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Mandal / City *</Label>
                      <Select
                        value={formData.presentMandal}
                        onValueChange={v => updateField('presentMandal', v)}
                        disabled={!formData.presentDistrict}
                      >
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg z-50">
                          {presentMandals.map(m => (
                            <SelectItem key={m.code} value={m.name}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.presentMandal && <p className="text-sm text-destructive">{errors.presentMandal}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Village / Area *</Label>
                      <Select
                        value={formData.presentVillage}
                        onValueChange={v => updateField('presentVillage', v)}
                        disabled={!formData.presentMandal}
                      >
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg z-50 max-h-[200px]">
                          {presentVillages.map(v => (
                            <SelectItem key={v.code} value={v.name}>{v.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.presentVillage && <p className="text-sm text-destructive">{errors.presentVillage}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Pincode *</Label>
                    <Input
                      value={formData.presentPincode}
                      onChange={e => updateField('presentPincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit pincode"
                      maxLength={6}
                    />
                    {errors.presentPincode && <p className="text-sm text-destructive">{errors.presentPincode}</p>}
                  </div>
                </div>

                {/* Same as Present Checkbox */}
                <div className="flex items-center space-x-2 py-2 border-t border-b">
                  <Checkbox
                    id="sameAsPresent"
                    checked={formData.sameAsPresent}
                    onCheckedChange={(checked) => updateField('sameAsPresent', !!checked)}
                  />
                  <Label htmlFor="sameAsPresent" className="cursor-pointer">Permanent address same as present address</Label>
                </div>

                {/* Permanent Address */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Permanent Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Door No *</Label>
                      <Input
                        value={formData.permanentDoorNo}
                        onChange={e => updateField('permanentDoorNo', e.target.value)}
                        disabled={formData.sameAsPresent}
                        className={formData.sameAsPresent ? 'bg-muted' : ''}
                      />
                      {errors.permanentDoorNo && <p className="text-sm text-destructive">{errors.permanentDoorNo}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Street *</Label>
                      <Input
                        value={formData.permanentStreet}
                        onChange={e => updateField('permanentStreet', e.target.value)}
                        disabled={formData.sameAsPresent}
                        className={formData.sameAsPresent ? 'bg-muted' : ''}
                      />
                      {errors.permanentStreet && <p className="text-sm text-destructive">{errors.permanentStreet}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>District *</Label>
                    <Select
                      value={formData.permanentDistrict}
                      onValueChange={v => updateField('permanentDistrict', v)}
                      disabled={formData.sameAsPresent}
                    >
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50">
                        {districts.map(d => (
                          <SelectItem key={d.code} value={d.name}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.permanentDistrict && <p className="text-sm text-destructive">{errors.permanentDistrict}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Mandal / City *</Label>
                      <Select
                        value={formData.permanentMandal}
                        onValueChange={v => updateField('permanentMandal', v)}
                        disabled={formData.sameAsPresent || !formData.permanentDistrict}
                      >
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg z-50">
                          {permanentMandals.map(m => (
                            <SelectItem key={m.code} value={m.name}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.permanentMandal && <p className="text-sm text-destructive">{errors.permanentMandal}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Village / Area *</Label>
                      <Select
                        value={formData.permanentVillage}
                        onValueChange={v => updateField('permanentVillage', v)}
                        disabled={formData.sameAsPresent || !formData.permanentMandal}
                      >
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg z-50 max-h-[200px]">
                          {permanentVillages.map(v => (
                            <SelectItem key={v.code} value={v.name}>{v.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.permanentVillage && <p className="text-sm text-destructive">{errors.permanentVillage}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Pincode *</Label>
                    <Input
                      value={formData.permanentPincode}
                      onChange={e => updateField('permanentPincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      disabled={formData.sameAsPresent}
                      className={formData.sameAsPresent ? 'bg-muted' : ''}
                    />
                    {errors.permanentPincode && <p className="text-sm text-destructive">{errors.permanentPincode}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium">Personal Information</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Name:</span>
                    <span>{formData.firstName} {formData.lastName}</span>
                    <span className="text-muted-foreground">Gender:</span>
                    <span>{formData.gender}</span>
                    <span className="text-muted-foreground">Phone:</span>
                    <span>{formData.phone}</span>
                    <span className="text-muted-foreground">Aadhaar:</span>
                    <span>XXXX-XXXX-{formData.aadhaar.slice(-4)}</span>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium">Professional & Banking</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Education:</span>
                    <span>{formData.educationLevel || '-'}</span>
                    <span className="text-muted-foreground">Bank Account:</span>
                    <span>{formData.bankAccountNumber ? 'Provided' : 'Not Provided'}</span>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium">Address</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">District:</span>
                    <span>{formData.presentDistrict}</span>
                    <span className="text-muted-foreground">Mandal:</span>
                    <span>{formData.presentMandal}</span>
                    <span className="text-muted-foreground">Village:</span>
                    <span>{formData.presentVillage}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-between mt-6">
              {step > 0 && (
                <Button variant="outline" onClick={prevStep} disabled={loading}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
              )}
              {step < 4 ? (
                <Button onClick={nextStep} className="ml-auto">
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading} className="ml-auto">
                  {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Submit Registration
                </Button>
              )}
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}

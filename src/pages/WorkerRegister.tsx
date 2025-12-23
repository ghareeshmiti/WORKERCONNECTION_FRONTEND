import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, ArrowRight, Check, User, Eye, EyeOff, ShieldCheck, Info } from 'lucide-react';
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
  middleName: z.string().max(50).optional(),
  lastName: z.string().trim().min(2, 'Last name must be at least 2 characters').max(50),
  gender: z.string().min(1, 'Gender is required'),
  maritalStatus: z.string().min(1, 'Marital status is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  fatherHusbandName: z.string().trim().min(2, 'This field is required').max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit mobile number'),
  password: z.string().regex(passwordRegex, 'Password must have min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character'),
  confirmPassword: z.string(),
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

const otherSchema = z.object({
  nresMember: z.string().min(1, 'Please select Yes or No'),
  tradeUnionMember: z.string().min(1, 'Please select Yes or No'),
});

type FormData = {
  aadhaar: string;
  otp: string;
  otpVerified: boolean;
  otpSent: boolean;
  eshramId: string;
  bocwId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
  maritalStatus: string;
  dateOfBirth: string;
  fatherHusbandName: string;
  caste: string;
  subCaste: string;
  phone: string;
  password: string;
  confirmPassword: string;
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
  nresMember: string;
  tradeUnionMember: string;
};

const STEPS = ['Identity Verification', 'Personal Information', 'Address', 'Other Details', 'Review'];
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
    eshramId: '', bocwId: '',
    firstName: '', middleName: '', lastName: '',
    gender: '', maritalStatus: '', dateOfBirth: '',
    fatherHusbandName: '', caste: '', subCaste: '',
    phone: '', password: '', confirmPassword: '',
    presentDoorNo: '', presentStreet: '', presentDistrict: '',
    presentMandal: '', presentVillage: '', presentPincode: '',
    permanentDoorNo: '', permanentStreet: '', permanentDistrict: '',
    permanentMandal: '', permanentVillage: '', permanentPincode: '',
    sameAsPresent: false,
    nresMember: '', tradeUnionMember: '',
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Memoized dropdown options for present address
  const districts = useMemo(() => getDistricts(), []);
  const presentMandals = useMemo(() => getMandalsForDistrict(formData.presentDistrict), [formData.presentDistrict]);
  const presentVillages = useMemo(() => getVillagesForMandal(formData.presentDistrict, formData.presentMandal), [formData.presentDistrict, formData.presentMandal]);
  
  // Memoized dropdown options for permanent address
  const permanentMandals = useMemo(() => getMandalsForDistrict(formData.permanentDistrict), [formData.permanentDistrict]);
  const permanentVillages = useMemo(() => getVillagesForMandal(formData.permanentDistrict, formData.permanentMandal), [formData.permanentDistrict, formData.permanentMandal]);

  const age = useMemo(() => calculateAge(formData.dateOfBirth), [formData.dateOfBirth]);

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Reset dependent dropdowns for present address
      if (field === 'presentDistrict') {
        newData.presentMandal = '';
        newData.presentVillage = '';
      } else if (field === 'presentMandal') {
        newData.presentVillage = '';
      }
      
      // Reset dependent dropdowns for permanent address
      if (field === 'permanentDistrict') {
        newData.permanentMandal = '';
        newData.permanentVillage = '';
      } else if (field === 'permanentMandal') {
        newData.permanentVillage = '';
      }
      
      // Handle same as present checkbox
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
    // Reset OTP state if aadhaar changes
    if (formData.otpVerified || formData.otpSent) {
      setFormData(prev => ({ ...prev, otpVerified: false, otpSent: false, otp: '' }));
    }
  };

  const isValidAadhaar = /^\d{4}-\d{4}-\d{4}$/.test(formData.aadhaar);

  const handleGenerateOTP = () => {
    if (!isValidAadhaar) return;
    setOtpLoading(true);
    // Simulate OTP sending
    setTimeout(() => {
      setFormData(prev => ({ ...prev, otpSent: true }));
      toast({ title: 'OTP Sent', description: 'A verification OTP has been sent (simulated).' });
      setOtpLoading(false);
    }, 1000);
  };

  const handleVerifyOTP = () => {
    // Accept any 4-digit OTP for POC
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
          personalSchema.parse({
            firstName: formData.firstName,
            middleName: formData.middleName,
            lastName: formData.lastName,
            gender: formData.gender,
            maritalStatus: formData.maritalStatus,
            dateOfBirth: formData.dateOfBirth,
            fatherHusbandName: formData.fatherHusbandName,
            phone: formData.phone,
            password: formData.password,
            confirmPassword: formData.confirmPassword,
          });
          break;
        case 2:
          addressSchema.parse({
            presentDoorNo: formData.presentDoorNo,
            presentStreet: formData.presentStreet,
            presentDistrict: formData.presentDistrict,
            presentMandal: formData.presentMandal,
            presentVillage: formData.presentVillage,
            presentPincode: formData.presentPincode,
            permanentDoorNo: formData.permanentDoorNo,
            permanentStreet: formData.permanentStreet,
            permanentDistrict: formData.permanentDistrict,
            permanentMandal: formData.permanentMandal,
            permanentVillage: formData.permanentVillage,
            permanentPincode: formData.permanentPincode,
          });
          break;
        case 3:
          otherSchema.parse({
            nresMember: formData.nresMember,
            tradeUnionMember: formData.tradeUnionMember,
          });
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
        'https://aldtcudqvbhmngkstbrr.supabase.co/functions/v1/register-worker',
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
            state: 'Andhra Pradesh',
            district: formData.presentDistrict,
            mandal: formData.presentMandal,
            pincode: formData.presentPincode,
            addressLine: presentAddress,
            emergencyContactName: formData.fatherHusbandName.trim(),
            emergencyContactPhone: null,
            skills: [],
            experienceYears: null,
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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4">
      <div className="container mx-auto max-w-2xl">
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
        <div className="flex items-center justify-center mb-8 overflow-x-auto pb-2">
          {STEPS.map((stepName, index) => (
            <div key={stepName} className="flex items-center flex-shrink-0">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                index < step ? 'bg-primary text-primary-foreground' :
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
              {step === 2 && 'Enter your present and permanent address'}
              {step === 3 && 'Additional information'}
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
                
                {formData.otpVerified && (
                  <div className="space-y-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">Optional identification numbers:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="eshramId">eShram ID</Label>
                        <Input 
                          id="eshramId" 
                          value={formData.eshramId} 
                          onChange={e => updateField('eshramId', e.target.value)} 
                          placeholder="Enter eShram ID"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bocwId">BoCW ID</Label>
                        <Input 
                          id="bocwId" 
                          value={formData.bocwId} 
                          onChange={e => updateField('bocwId', e.target.value)} 
                          placeholder="Enter BoCW ID"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {errors.otpVerified && <p className="text-sm text-destructive">{errors.otpVerified}</p>}
              </div>
            )}

            {/* Step 1: Personal Information */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input 
                      id="firstName" 
                      value={formData.firstName} 
                      onChange={e => updateField('firstName', e.target.value)} 
                    />
                    {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="middleName">Middle Name</Label>
                    <Input 
                      id="middleName" 
                      value={formData.middleName} 
                      onChange={e => updateField('middleName', e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input 
                      id="lastName" 
                      value={formData.lastName} 
                      onChange={e => updateField('lastName', e.target.value)} 
                    />
                    {errors.lastName && <p className="text-sm text-destructive">{errors.lastName}</p>}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender *</Label>
                    <Select value={formData.gender} onValueChange={v => updateField('gender', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50">
                        {GENDERS.map(g => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.gender && <p className="text-sm text-destructive">{errors.gender}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maritalStatus">Marital Status *</Label>
                    <Select value={formData.maritalStatus} onValueChange={v => updateField('maritalStatus', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50">
                        {MARITAL_STATUSES.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.maritalStatus && <p className="text-sm text-destructive">{errors.maritalStatus}</p>}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                    <Input 
                      id="dateOfBirth" 
                      type="date" 
                      value={formData.dateOfBirth} 
                      onChange={e => updateField('dateOfBirth', e.target.value)}
                      max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                    />
                    {errors.dateOfBirth && <p className="text-sm text-destructive">{errors.dateOfBirth}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Age</Label>
                    <Input value={age > 0 ? `${age} years` : ''} disabled className="bg-muted" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fatherHusbandName">Father / Husband Name *</Label>
                  <Input 
                    id="fatherHusbandName" 
                    value={formData.fatherHusbandName} 
                    onChange={e => updateField('fatherHusbandName', e.target.value)} 
                  />
                  {errors.fatherHusbandName && <p className="text-sm text-destructive">{errors.fatherHusbandName}</p>}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="caste">Caste (Optional)</Label>
                    <Input 
                      id="caste" 
                      value={formData.caste} 
                      onChange={e => updateField('caste', e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subCaste">Sub-caste (Optional)</Label>
                    <Input 
                      id="subCaste" 
                      value={formData.subCaste} 
                      onChange={e => updateField('subCaste', e.target.value)} 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Mobile Number *</Label>
                  <Input 
                    id="phone" 
                    value={formData.phone} 
                    onChange={e => updateField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} 
                    placeholder="9876543210"
                    maxLength={10}
                  />
                  {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input 
                        id="password" 
                        type={showPassword ? "text" : "password"} 
                        value={formData.password} 
                        onChange={e => updateField('password', e.target.value)} 
                        placeholder="Min 8 chars, 1 upper, 1 lower, 1 number, 1 special"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <div className="relative">
                      <Input 
                        id="confirmPassword" 
                        type={showConfirmPassword ? "text" : "password"} 
                        value={formData.confirmPassword} 
                        onChange={e => updateField('confirmPassword', e.target.value)} 
                        placeholder="Re-enter password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
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

            {/* Step 2: Address */}
            {step === 2 && (
              <div className="space-y-6">
                {/* Present Address */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Present Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="presentDoorNo">Door No *</Label>
                      <Input 
                        id="presentDoorNo" 
                        value={formData.presentDoorNo} 
                        onChange={e => updateField('presentDoorNo', e.target.value)} 
                        placeholder="e.g., 1-2-34/A"
                        maxLength={20}
                      />
                      {errors.presentDoorNo && <p className="text-sm text-destructive">{errors.presentDoorNo}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="presentStreet">Street *</Label>
                      <Input 
                        id="presentStreet" 
                        value={formData.presentStreet} 
                        onChange={e => updateField('presentStreet', e.target.value)} 
                        placeholder="Street name"
                        maxLength={100}
                      />
                      {errors.presentStreet && <p className="text-sm text-destructive">{errors.presentStreet}</p>}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>District *</Label>
                    <Select value={formData.presentDistrict} onValueChange={v => updateField('presentDistrict', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select district" />
                      </SelectTrigger>
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
                        <SelectTrigger>
                          <SelectValue placeholder={formData.presentDistrict ? "Select mandal" : "Select district first"} />
                        </SelectTrigger>
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
                        <SelectTrigger>
                          <SelectValue placeholder={formData.presentMandal ? "Select village" : "Select mandal first"} />
                        </SelectTrigger>
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
                    <Label htmlFor="presentPincode">Pincode *</Label>
                    <Input 
                      id="presentPincode" 
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
                      <Label htmlFor="permanentDoorNo">Door No *</Label>
                      <Input 
                        id="permanentDoorNo" 
                        value={formData.permanentDoorNo} 
                        onChange={e => updateField('permanentDoorNo', e.target.value)} 
                        placeholder="e.g., 1-2-34/A"
                        maxLength={20}
                        disabled={formData.sameAsPresent}
                        className={formData.sameAsPresent ? 'bg-muted' : ''}
                      />
                      {errors.permanentDoorNo && <p className="text-sm text-destructive">{errors.permanentDoorNo}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="permanentStreet">Street *</Label>
                      <Input 
                        id="permanentStreet" 
                        value={formData.permanentStreet} 
                        onChange={e => updateField('permanentStreet', e.target.value)} 
                        placeholder="Street name"
                        maxLength={100}
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
                      <SelectTrigger className={formData.sameAsPresent ? 'bg-muted' : ''}>
                        <SelectValue placeholder="Select district" />
                      </SelectTrigger>
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
                        <SelectTrigger className={formData.sameAsPresent ? 'bg-muted' : ''}>
                          <SelectValue placeholder={formData.permanentDistrict ? "Select mandal" : "Select district first"} />
                        </SelectTrigger>
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
                        <SelectTrigger className={formData.sameAsPresent ? 'bg-muted' : ''}>
                          <SelectValue placeholder={formData.permanentMandal ? "Select village" : "Select mandal first"} />
                        </SelectTrigger>
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
                    <Label htmlFor="permanentPincode">Pincode *</Label>
                    <Input 
                      id="permanentPincode" 
                      value={formData.permanentPincode} 
                      onChange={e => updateField('permanentPincode', e.target.value.replace(/\D/g, '').slice(0, 6))} 
                      placeholder="6-digit pincode"
                      maxLength={6}
                      disabled={formData.sameAsPresent}
                      className={formData.sameAsPresent ? 'bg-muted' : ''}
                    />
                    {errors.permanentPincode && <p className="text-sm text-destructive">{errors.permanentPincode}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Other Details */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Are you a NRES Member? *</Label>
                  <Select value={formData.nresMember} onValueChange={v => updateField('nresMember', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Yes or No" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.nresMember && <p className="text-sm text-destructive">{errors.nresMember}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label>Are you a Trade Union Member? *</Label>
                  <Select value={formData.tradeUnionMember} onValueChange={v => updateField('tradeUnionMember', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Yes or No" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.tradeUnionMember && <p className="text-sm text-destructive">{errors.tradeUnionMember}</p>}
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800 dark:text-blue-200">Information</p>
                    <p className="text-blue-600 dark:text-blue-400">
                      NRES (National Rural Employment Scheme) and Trade Union membership helps in 
                      providing additional benefits and protection under labor laws. This information 
                      is collected for statistical purposes only.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase text-muted-foreground">Identity Verification</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm bg-muted/50 p-4 rounded-lg">
                    <div><strong>Aadhaar:</strong> {formData.aadhaar.replace(/\d{4}-\d{4}/, 'XXXX-XXXX')}</div>
                    <div><strong>Verified:</strong> <span className="text-green-600">Yes</span></div>
                    {formData.eshramId && <div><strong>eShram ID:</strong> {formData.eshramId}</div>}
                    {formData.bocwId && <div><strong>BoCW ID:</strong> {formData.bocwId}</div>}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase text-muted-foreground">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm bg-muted/50 p-4 rounded-lg">
                    <div><strong>Name:</strong> {formData.firstName} {formData.middleName} {formData.lastName}</div>
                    <div><strong>Gender:</strong> {formData.gender}</div>
                    <div><strong>Date of Birth:</strong> {formData.dateOfBirth}</div>
                    <div><strong>Age:</strong> {age} years</div>
                    <div><strong>Marital Status:</strong> {formData.maritalStatus}</div>
                    <div><strong>Father/Husband:</strong> {formData.fatherHusbandName}</div>
                    <div><strong>Mobile:</strong> {formData.phone}</div>
                    {formData.caste && <div><strong>Caste:</strong> {formData.caste}</div>}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase text-muted-foreground">Present Address</h3>
                  <div className="text-sm bg-muted/50 p-4 rounded-lg">
                    {formData.presentDoorNo}, {formData.presentStreet}, {formData.presentVillage}, {formData.presentMandal}, {formData.presentDistrict} - {formData.presentPincode}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase text-muted-foreground">Permanent Address</h3>
                  <div className="text-sm bg-muted/50 p-4 rounded-lg">
                    {formData.permanentDoorNo}, {formData.permanentStreet}, {formData.permanentVillage}, {formData.permanentMandal}, {formData.permanentDistrict} - {formData.permanentPincode}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase text-muted-foreground">Other Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm bg-muted/50 p-4 rounded-lg">
                    <div><strong>NRES Member:</strong> {formData.nresMember === 'yes' ? 'Yes' : 'No'}</div>
                    <div><strong>Trade Union Member:</strong> {formData.tradeUnionMember === 'yes' ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={prevStep} disabled={step === 0 || loading}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={nextStep} className="bg-primary hover:bg-primary/90">
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading} className="bg-primary hover:bg-primary/90">
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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

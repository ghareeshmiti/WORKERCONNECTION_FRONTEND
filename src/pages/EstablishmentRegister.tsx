import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, ArrowRight, Check, Building2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getDistricts, getMandalsForDistrict, getVillagesForMandal } from '@/data/india-locations';

// Password validation regex
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Validation schemas
const detailsSchema = z.object({
  name: z.string().trim().min(3, 'Establishment name must be at least 3 characters').max(100),
  contactPerson: z.string().trim().min(3, 'Name must be at least 3 characters').regex(/^[a-zA-Z\s]+$/, 'Only alphabets and spaces allowed'),
  email: z.string().trim().email('Invalid email address').max(255),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit mobile number'),
  password: z.string().regex(passwordRegex, 'Password must have min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const addressSchema = z.object({
  doorNo: z.string().trim().min(1, 'Door number is required').max(20, 'Max 20 characters').regex(/^[a-zA-Z0-9\-\/\s]+$/, 'Only alphanumeric characters'),
  street: z.string().trim().min(1, 'Street is required').max(100, 'Max 100 characters'),
  district: z.string().min(1, 'District is required'),
  mandal: z.string().min(1, 'Mandal/City is required'),
  village: z.string().min(1, 'Village/Area is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits'),
});

const businessSchema = z.object({
  hasPlanApproval: z.enum(['yes', 'no'], { errorMap: () => ({ message: 'Please select Yes or No' }) }),
  category: z.string().min(1, 'Category is required'),
  natureOfWork: z.string().min(1, 'Nature of work is required'),
  commencementDate: z.string().min(1, 'Date of commencement is required'),
  completionDate: z.string().optional(),
  departmentId: z.string().uuid('Please select a department'),
}).refine((data) => {
  const today = new Date().toISOString().split('T')[0];
  return data.commencementDate <= today;
}, {
  message: "Commencement date cannot be in the future",
  path: ["commencementDate"],
}).refine((data) => {
  if (data.completionDate && data.commencementDate) {
    return data.completionDate > data.commencementDate;
  }
  return true;
}, {
  message: "Completion date must be after commencement date",
  path: ["completionDate"],
});

const constructionSchema = z.object({
  estimatedCost: z.string().optional(),
  constructionArea: z.string().optional(),
  builtUpArea: z.string().optional(),
  basicEstimationCost: z.string().optional(),
  maleWorkers: z.string().optional(),
  femaleWorkers: z.string().optional(),
});

type FormData = {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  doorNo: string;
  street: string;
  district: string;
  mandal: string;
  village: string;
  pincode: string;
  hasPlanApproval: string;
  category: string;
  natureOfWork: string;
  commencementDate: string;
  completionDate: string;
  departmentId: string;
  estimatedCost: string;
  constructionArea: string;
  builtUpArea: string;
  basicEstimationCost: string;
  maleWorkers: string;
  femaleWorkers: string;
};

type Department = { id: string; name: string; code: string };

const STEPS = ['Establishment Details', 'Address Details', 'Business Details', 'Construction Details', 'Review'];

const CATEGORIES = ['State Government', 'Private', 'Contractor'];
const NATURE_OF_WORK = ['Road Construction', 'Building Construction'];

export default function EstablishmentRegister() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '', contactPerson: '', email: '', phone: '',
    password: '', confirmPassword: '',
    doorNo: '', street: '', district: '', mandal: '', village: '', pincode: '',
    hasPlanApproval: '', category: '', natureOfWork: '',
    commencementDate: '', completionDate: '', departmentId: '',
    estimatedCost: '', constructionArea: '', builtUpArea: '',
    basicEstimationCost: '', maleWorkers: '', femaleWorkers: '',
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch departments on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');

      if (!error && data) {
        setDepartments(data);
        // If only one department, auto-select it
        if (data.length === 1) {
          setFormData(prev => ({ ...prev, departmentId: data[0].id }));
        }
      }
      setLoadingDepts(false);
    };
    fetchDepartments();
  }, []);

  // Memoized dropdown options
  const districts = useMemo(() => getDistricts(), []);
  const mandals = useMemo(() => getMandalsForDistrict(formData.district), [formData.district]);
  const villages = useMemo(() => getVillagesForMandal(formData.district, formData.mandal), [formData.district, formData.mandal]);

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      // Reset dependent dropdowns
      if (field === 'district') {
        newData.mandal = '';
        newData.village = '';
      } else if (field === 'mandal') {
        newData.village = '';
      }
      return newData;
    });
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateStep = (stepIndex: number): boolean => {
    try {
      setErrors({});
      switch (stepIndex) {
        case 0:
          detailsSchema.parse({
            name: formData.name,
            contactPerson: formData.contactPerson,
            email: formData.email,
            phone: formData.phone,
            password: formData.password,
            confirmPassword: formData.confirmPassword,
          });
          break;
        case 1:
          addressSchema.parse({
            doorNo: formData.doorNo,
            street: formData.street,
            district: formData.district,
            mandal: formData.mandal,
            village: formData.village,
            pincode: formData.pincode,
          });
          break;
        case 2:
          businessSchema.parse({
            hasPlanApproval: formData.hasPlanApproval,
            category: formData.category,
            natureOfWork: formData.natureOfWork,
            commencementDate: formData.commencementDate,
            completionDate: formData.completionDate,
            departmentId: formData.departmentId,
          });
          break;
        case 3:
          constructionSchema.parse({
            estimatedCost: formData.estimatedCost,
            constructionArea: formData.constructionArea,
            builtUpArea: formData.builtUpArea,
            basicEstimationCost: formData.basicEstimationCost,
            maleWorkers: formData.maleWorkers,
            femaleWorkers: formData.femaleWorkers,
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

  // Generate establishment code from name
  const generateCode = (name: string) => {
    const cleanName = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const prefix = cleanName.substring(0, 3) || 'EST';
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    return `${prefix}-${timestamp}`;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const code = generateCode(formData.name);
      const fullAddress = `${formData.doorNo}, ${formData.street}, ${formData.village}, ${formData.mandal}, ${formData.district} - ${formData.pincode}`;

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/register/establishment`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            code: code,
            description: formData.contactPerson.trim(),
            establishmentType: formData.category,
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
            phone: formData.phone,
            state: 'Andhra Pradesh', // All districts in JSON are from AP
            district: formData.district,
            mandal: formData.mandal,
            pincode: formData.pincode,
            addressLine: fullAddress,
            licenseNumber: formData.hasPlanApproval === 'yes' ? 'APPROVED' : null,
            departmentId: formData.departmentId,
            constructionType: formData.natureOfWork,
            projectName: formData.village,
            contractorName: formData.contactPerson.trim(),
            estimatedWorkers: formData.maleWorkers && formData.femaleWorkers
              ? parseInt(formData.maleWorkers || '0') + parseInt(formData.femaleWorkers || '0')
              : null,
            startDate: formData.commencementDate || null,
            expectedEndDate: formData.completionDate || null,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({ title: 'Success!', description: 'Establishment registered. Please login.' });
        navigate('/auth?role=establishment');
      } else {
        toast({ title: 'Registration Failed', description: data.message, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to register. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const selectedDept = departments.find(d => d.id === formData.departmentId);

  // Check if departments are available - disable Next on business step if no departments
  const canProceedFromBusinessStep = departments.length > 0 && formData.departmentId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-xl bg-accent flex items-center justify-center">
              <Building2 className="w-8 h-8 text-accent-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-display font-bold">Establishment Registration</h1>
          <p className="text-muted-foreground">Register your establishment to manage workers</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8 flex-wrap gap-y-2">
          {STEPS.map((stepName, index) => (
            <div key={stepName} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${index < step ? 'bg-accent text-accent-foreground' :
                index === step ? 'bg-accent text-accent-foreground' :
                  'bg-muted text-muted-foreground'
                }`}>
                {index < step ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <span className={`ml-2 text-xs hidden lg:inline ${index === step ? 'font-medium' : 'text-muted-foreground'}`}>
                {stepName}
              </span>
              {index < STEPS.length - 1 && (
                <div className={`w-6 md:w-8 h-0.5 mx-2 ${index < step ? 'bg-accent' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step]}</CardTitle>
            <CardDescription>
              {step === 0 && 'Enter establishment details and login credentials'}
              {step === 1 && 'Enter the establishment address'}
              {step === 2 && 'Provide business and department information'}
              {step === 3 && 'Construction project details (optional)'}
              {step === 4 && 'Review your information before submitting'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step 0: Establishment Details */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Establishment Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e => updateField('name', e.target.value)}
                    placeholder="Enter establishment name"
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Owner / Manager / Contact Person Name *</Label>
                  <Input
                    id="contactPerson"
                    value={formData.contactPerson}
                    onChange={e => updateField('contactPerson', e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                    placeholder="Enter contact person name"
                  />
                  {errors.contactPerson && <p className="text-sm text-destructive">{errors.contactPerson}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={e => updateField('email', e.target.value)}
                      placeholder="example@domain.com"
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
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

            {/* Step 1: Address Details */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="doorNo">Door Number *</Label>
                    <Input
                      id="doorNo"
                      value={formData.doorNo}
                      onChange={e => updateField('doorNo', e.target.value)}
                      placeholder="e.g., 1-2-34/A"
                      maxLength={20}
                    />
                    {errors.doorNo && <p className="text-sm text-destructive">{errors.doorNo}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="street">Street *</Label>
                    <Input
                      id="street"
                      value={formData.street}
                      onChange={e => updateField('street', e.target.value)}
                      placeholder="Street name"
                      maxLength={100}
                    />
                    {errors.street && <p className="text-sm text-destructive">{errors.street}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="district">District *</Label>
                  <Select value={formData.district} onValueChange={v => updateField('district', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select district" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      {districts.map(d => (
                        <SelectItem key={d.code} value={d.name}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.district && <p className="text-sm text-destructive">{errors.district}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mandal">Mandal / City *</Label>
                    <Select
                      value={formData.mandal}
                      onValueChange={v => updateField('mandal', v)}
                      disabled={!formData.district}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={formData.district ? "Select mandal" : "Select district first"} />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50">
                        {mandals.map(m => (
                          <SelectItem key={m.code} value={m.name}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.mandal && <p className="text-sm text-destructive">{errors.mandal}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="village">Village / Area *</Label>
                    <Select
                      value={formData.village}
                      onValueChange={v => updateField('village', v)}
                      disabled={!formData.mandal}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={formData.mandal ? "Select village" : "Select mandal first"} />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50 max-h-[200px]">
                        {villages.map(v => (
                          <SelectItem key={v.code} value={v.name}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.village && <p className="text-sm text-destructive">{errors.village}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode *</Label>
                  <Input
                    id="pincode"
                    value={formData.pincode}
                    onChange={e => updateField('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit pincode"
                    maxLength={6}
                  />
                  {errors.pincode && <p className="text-sm text-destructive">{errors.pincode}</p>}
                </div>
              </div>
            )}

            {/* Step 2: Business Details */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Plan Approval ID? *</Label>
                  <Select value={formData.hasPlanApproval} onValueChange={v => updateField('hasPlanApproval', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Yes or No" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.hasPlanApproval && <p className="text-sm text-destructive">{errors.hasPlanApproval}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category of Establishment *</Label>
                  <Select value={formData.category} onValueChange={v => updateField('category', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="natureOfWork">Nature of Work *</Label>
                  <Select value={formData.natureOfWork} onValueChange={v => updateField('natureOfWork', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select nature of work" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      {NATURE_OF_WORK.map(work => (
                        <SelectItem key={work} value={work}>{work}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.natureOfWork && <p className="text-sm text-destructive">{errors.natureOfWork}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="commencementDate">Date of Commencement *</Label>
                    <Input
                      id="commencementDate"
                      type="date"
                      value={formData.commencementDate}
                      onChange={e => updateField('commencementDate', e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                    />
                    {errors.commencementDate && <p className="text-sm text-destructive">{errors.commencementDate}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="completionDate">Tentative Date of Completion</Label>
                    <Input
                      id="completionDate"
                      type="date"
                      value={formData.completionDate}
                      onChange={e => updateField('completionDate', e.target.value)}
                      min={formData.commencementDate || undefined}
                    />
                    {errors.completionDate && <p className="text-sm text-destructive">{errors.completionDate}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="departmentId">Department *</Label>
                  {loadingDepts ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading departments...
                    </div>
                  ) : departments.length === 0 ? (
                    <p className="text-sm text-destructive">No departments available. Please contact administrator.</p>
                  ) : departments.length === 1 ? (
                    <Input value={`${departments[0].name} (${departments[0].code})`} disabled className="bg-muted" />
                  ) : (
                    <Select value={formData.departmentId} onValueChange={v => updateField('departmentId', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50">
                        {departments.map(dept => (
                          <SelectItem key={dept.id} value={dept.id}>{dept.name} ({dept.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {errors.departmentId && <p className="text-sm text-destructive">{errors.departmentId}</p>}
                </div>
              </div>
            )}

            {/* Step 3: Construction Details */}
            {step === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">All fields in this section are optional.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="estimatedCost">Estimated Cost (₹)</Label>
                    <Input
                      id="estimatedCost"
                      type="number"
                      min="0"
                      value={formData.estimatedCost}
                      onChange={e => updateField('estimatedCost', e.target.value)}
                      placeholder="Enter amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="basicEstimationCost">Basic Estimation Cost (₹)</Label>
                    <Input
                      id="basicEstimationCost"
                      type="number"
                      min="0"
                      value={formData.basicEstimationCost}
                      onChange={e => updateField('basicEstimationCost', e.target.value)}
                      placeholder="Enter amount"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="constructionArea">Construction Area (sq ft)</Label>
                    <Input
                      id="constructionArea"
                      type="number"
                      min="0"
                      value={formData.constructionArea}
                      onChange={e => updateField('constructionArea', e.target.value)}
                      placeholder="Enter area"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="builtUpArea">Built-up Area (sq ft)</Label>
                    <Input
                      id="builtUpArea"
                      type="number"
                      min="0"
                      value={formData.builtUpArea}
                      onChange={e => updateField('builtUpArea', e.target.value)}
                      placeholder="Enter area"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maleWorkers">Male Workers</Label>
                    <Input
                      id="maleWorkers"
                      type="number"
                      min="0"
                      value={formData.maleWorkers}
                      onChange={e => updateField('maleWorkers', e.target.value)}
                      placeholder="Number of male workers"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="femaleWorkers">Female Workers</Label>
                    <Input
                      id="femaleWorkers"
                      type="number"
                      min="0"
                      value={formData.femaleWorkers}
                      onChange={e => updateField('femaleWorkers', e.target.value)}
                      placeholder="Number of female workers"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase text-muted-foreground">Establishment Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm bg-muted/50 p-4 rounded-lg">
                    <div><strong>Name:</strong> {formData.name}</div>
                    <div><strong>Contact Person:</strong> {formData.contactPerson}</div>
                    <div><strong>Email:</strong> {formData.email}</div>
                    <div><strong>Mobile:</strong> {formData.phone}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase text-muted-foreground">Address Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm bg-muted/50 p-4 rounded-lg">
                    <div><strong>Door No:</strong> {formData.doorNo}</div>
                    <div><strong>Street:</strong> {formData.street}</div>
                    <div><strong>District:</strong> {formData.district}</div>
                    <div><strong>Mandal:</strong> {formData.mandal}</div>
                    <div><strong>Village:</strong> {formData.village}</div>
                    <div><strong>Pincode:</strong> {formData.pincode}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase text-muted-foreground">Business Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm bg-muted/50 p-4 rounded-lg">
                    <div><strong>Plan Approval:</strong> {formData.hasPlanApproval === 'yes' ? 'Yes' : 'No'}</div>
                    <div><strong>Category:</strong> {formData.category}</div>
                    <div><strong>Nature of Work:</strong> {formData.natureOfWork}</div>
                    <div><strong>Department:</strong> {selectedDept?.name || 'N/A'}</div>
                    <div><strong>Commencement:</strong> {formData.commencementDate}</div>
                    <div><strong>Completion:</strong> {formData.completionDate || 'Not specified'}</div>
                  </div>
                </div>

                {(formData.estimatedCost || formData.maleWorkers || formData.femaleWorkers) && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm uppercase text-muted-foreground">Construction Details</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm bg-muted/50 p-4 rounded-lg">
                      {formData.estimatedCost && <div><strong>Estimated Cost:</strong> ₹{formData.estimatedCost}</div>}
                      {formData.constructionArea && <div><strong>Construction Area:</strong> {formData.constructionArea} sq ft</div>}
                      {formData.builtUpArea && <div><strong>Built-up Area:</strong> {formData.builtUpArea} sq ft</div>}
                      {(formData.maleWorkers || formData.femaleWorkers) && (
                        <div><strong>Workers:</strong> {formData.maleWorkers || 0} Male, {formData.femaleWorkers || 0} Female</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={prevStep} disabled={step === 0 || loading}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={nextStep} className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white">
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading} className="bg-accent hover:bg-accent/90">
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

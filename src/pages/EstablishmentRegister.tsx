import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Clock, Loader2, ArrowLeft, ArrowRight, Check, Building2 } from 'lucide-react';
import { INDIA_STATES } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';

// Validation schemas
const detailsSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters').max(100),
  code: z.string().trim().min(3, 'Code must be at least 3 characters').max(20).regex(/^[A-Z0-9-]+$/i, 'Only letters, numbers, and hyphens'),
  description: z.string().max(500).optional(),
  establishmentType: z.string().optional(),
  email: z.string().trim().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  confirmPassword: z.string(),
  phone: z.string().regex(/^(\+91)?[6-9]\d{9}$/, 'Invalid Indian phone number').optional().or(z.literal('')),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const addressSchema = z.object({
  state: z.string().min(1, 'State is required'),
  district: z.string().trim().min(2, 'District is required').max(100),
  mandal: z.string().max(100).optional(),
  pincode: z.string().regex(/^\d{6}$/, 'Must be 6 digits').optional().or(z.literal('')),
  addressLine: z.string().max(500).optional(),
});

const businessSchema = z.object({
  licenseNumber: z.string().max(50).optional(),
  departmentId: z.string().uuid('Please select a department'),
});

const constructionSchema = z.object({
  constructionType: z.string().optional(),
  projectName: z.string().max(100).optional(),
  contractorName: z.string().max(100).optional(),
  estimatedWorkers: z.number().min(1).max(10000).optional(),
  startDate: z.string().optional(),
  expectedEndDate: z.string().optional(),
});

type FormData = {
  name: string;
  code: string;
  description: string;
  establishmentType: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  state: string;
  district: string;
  mandal: string;
  pincode: string;
  addressLine: string;
  licenseNumber: string;
  departmentId: string;
  constructionType: string;
  projectName: string;
  contractorName: string;
  estimatedWorkers: string;
  startDate: string;
  expectedEndDate: string;
};

type Department = { id: string; name: string; code: string };

const STEPS = ['Details', 'Address', 'Business', 'Construction', 'Review'];

export default function EstablishmentRegister() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<FormData>({
    name: '', code: '', description: '', establishmentType: '',
    email: '', password: '', confirmPassword: '', phone: '',
    state: '', district: '', mandal: '', pincode: '', addressLine: '',
    licenseNumber: '', departmentId: '',
    constructionType: '', projectName: '', contractorName: '',
    estimatedWorkers: '', startDate: '', expectedEndDate: '',
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
      }
      setLoadingDepts(false);
    };
    fetchDepartments();
  }, []);

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateStep = (stepIndex: number): boolean => {
    try {
      setErrors({});
      switch (stepIndex) {
        case 0:
          detailsSchema.parse({
            name: formData.name,
            code: formData.code,
            description: formData.description,
            establishmentType: formData.establishmentType,
            email: formData.email,
            password: formData.password,
            confirmPassword: formData.confirmPassword,
            phone: formData.phone,
          });
          break;
        case 1:
          addressSchema.parse({
            state: formData.state,
            district: formData.district,
            mandal: formData.mandal,
            pincode: formData.pincode,
            addressLine: formData.addressLine,
          });
          break;
        case 2:
          businessSchema.parse({
            licenseNumber: formData.licenseNumber,
            departmentId: formData.departmentId,
          });
          break;
        case 3:
          constructionSchema.parse({
            constructionType: formData.constructionType,
            projectName: formData.projectName,
            contractorName: formData.contractorName,
            estimatedWorkers: formData.estimatedWorkers ? parseInt(formData.estimatedWorkers) : undefined,
            startDate: formData.startDate,
            expectedEndDate: formData.expectedEndDate,
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
      const response = await fetch(
        'https://aldtcudqvbhmngkstbrr.supabase.co/functions/v1/register-establishment',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
            description: formData.description.trim() || null,
            establishmentType: formData.establishmentType || null,
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
            phone: formData.phone || null,
            state: formData.state,
            district: formData.district.trim(),
            mandal: formData.mandal.trim() || null,
            pincode: formData.pincode || null,
            addressLine: formData.addressLine.trim() || null,
            licenseNumber: formData.licenseNumber.trim() || null,
            departmentId: formData.departmentId,
            constructionType: formData.constructionType || null,
            projectName: formData.projectName.trim() || null,
            contractorName: formData.contractorName.trim() || null,
            estimatedWorkers: formData.estimatedWorkers ? parseInt(formData.estimatedWorkers) : null,
            startDate: formData.startDate || null,
            expectedEndDate: formData.expectedEndDate || null,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4">
      <div className="container mx-auto max-w-2xl">
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
        <div className="flex items-center justify-center mb-8">
          {STEPS.map((stepName, index) => (
            <div key={stepName} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                index < step ? 'bg-accent text-accent-foreground' :
                index === step ? 'bg-accent text-accent-foreground' :
                'bg-muted text-muted-foreground'
              }`}>
                {index < step ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <span className={`ml-2 text-sm hidden md:inline ${index === step ? 'font-medium' : 'text-muted-foreground'}`}>
                {stepName}
              </span>
              {index < STEPS.length - 1 && (
                <div className={`w-8 md:w-12 h-0.5 mx-2 ${index < step ? 'bg-accent' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step]}</CardTitle>
            <CardDescription>
              {step === 0 && 'Establishment details and login credentials'}
              {step === 1 && 'Location in India'}
              {step === 2 && 'Business registration and department'}
              {step === 3 && 'Construction project details (optional)'}
              {step === 4 && 'Review your information before submitting'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step 0: Details */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Establishment Name *</Label>
                    <Input id="name" value={formData.name} onChange={e => updateField('name', e.target.value)} />
                    {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Unique Code *</Label>
                    <Input id="code" placeholder="EST-001" value={formData.code} onChange={e => updateField('code', e.target.value.toUpperCase())} />
                    {errors.code && <p className="text-sm text-destructive">{errors.code}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="establishmentType">Type</Label>
                  <Select value={formData.establishmentType} onValueChange={v => updateField('establishmentType', v)}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="construction">Construction Site</SelectItem>
                      <SelectItem value="factory">Factory</SelectItem>
                      <SelectItem value="warehouse">Warehouse</SelectItem>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={formData.description} onChange={e => updateField('description', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" value={formData.email} onChange={e => updateField('email', e.target.value)} />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" placeholder="9876543210" value={formData.phone} onChange={e => updateField('phone', e.target.value)} />
                    {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input id="password" type="password" value={formData.password} onChange={e => updateField('password', e.target.value)} />
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={e => updateField('confirmPassword', e.target.value)} />
                    {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Address */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="state">State *</Label>
                    <Select value={formData.state} onValueChange={v => updateField('state', v)}>
                      <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                      <SelectContent>
                        {INDIA_STATES.map(state => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.state && <p className="text-sm text-destructive">{errors.state}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="district">District *</Label>
                    <Input id="district" value={formData.district} onChange={e => updateField('district', e.target.value)} />
                    {errors.district && <p className="text-sm text-destructive">{errors.district}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mandal">Mandal/Taluk</Label>
                    <Input id="mandal" value={formData.mandal} onChange={e => updateField('mandal', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input id="pincode" maxLength={6} placeholder="500001" value={formData.pincode} onChange={e => updateField('pincode', e.target.value.replace(/\D/g, ''))} />
                    {errors.pincode && <p className="text-sm text-destructive">{errors.pincode}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressLine">Full Address</Label>
                  <Textarea id="addressLine" value={formData.addressLine} onChange={e => updateField('addressLine', e.target.value)} />
                </div>
              </div>
            )}

            {/* Step 2: Business */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="departmentId">Department *</Label>
                  {loadingDepts ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading departments...
                    </div>
                  ) : departments.length === 0 ? (
                    <p className="text-sm text-destructive">No departments available. Please contact administrator.</p>
                  ) : (
                    <Select value={formData.departmentId} onValueChange={v => updateField('departmentId', v)}>
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        {departments.map(dept => (
                          <SelectItem key={dept.id} value={dept.id}>{dept.name} ({dept.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {errors.departmentId && <p className="text-sm text-destructive">{errors.departmentId}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">License / Registration Number</Label>
                  <Input id="licenseNumber" value={formData.licenseNumber} onChange={e => updateField('licenseNumber', e.target.value)} />
                </div>
              </div>
            )}

            {/* Step 3: Construction */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="constructionType">Construction Type</Label>
                  <Select value={formData.constructionType} onValueChange={v => updateField('constructionType', v)}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="industrial">Industrial</SelectItem>
                      <SelectItem value="infrastructure">Infrastructure</SelectItem>
                      <SelectItem value="renovation">Renovation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="projectName">Project Name</Label>
                    <Input id="projectName" value={formData.projectName} onChange={e => updateField('projectName', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contractorName">Contractor Name</Label>
                    <Input id="contractorName" value={formData.contractorName} onChange={e => updateField('contractorName', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimatedWorkers">Estimated Workers</Label>
                  <Input id="estimatedWorkers" type="number" min="1" value={formData.estimatedWorkers} onChange={e => updateField('estimatedWorkers', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input id="startDate" type="date" value={formData.startDate} onChange={e => updateField('startDate', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expectedEndDate">Expected End Date</Label>
                    <Input id="expectedEndDate" type="date" value={formData.expectedEndDate} onChange={e => updateField('expectedEndDate', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Name:</strong> {formData.name}</div>
                  <div><strong>Code:</strong> {formData.code}</div>
                  <div><strong>Type:</strong> {formData.establishmentType || 'Not specified'}</div>
                  <div><strong>Email:</strong> {formData.email}</div>
                  <div><strong>Phone:</strong> {formData.phone || 'Not provided'}</div>
                  <div><strong>Department:</strong> {selectedDept?.name || 'N/A'}</div>
                  <div><strong>State:</strong> {formData.state}</div>
                  <div><strong>District:</strong> {formData.district}</div>
                  <div className="col-span-2"><strong>Address:</strong> {formData.addressLine || 'Not provided'}</div>
                  <div><strong>Project:</strong> {formData.projectName || 'Not specified'}</div>
                  <div><strong>Est. Workers:</strong> {formData.estimatedWorkers || 'Not specified'}</div>
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
                <Button onClick={nextStep} className="bg-accent hover:bg-accent/90">
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

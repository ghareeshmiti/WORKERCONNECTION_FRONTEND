import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Clock, Loader2, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { INDIA_STATES } from '@/lib/types';

// Validation schemas
const identitySchema = z.object({
  firstName: z.string().trim().min(2, 'First name must be at least 2 characters').max(50),
  lastName: z.string().trim().min(2, 'Last name must be at least 2 characters').max(50),
  email: z.string().trim().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const personalSchema = z.object({
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  phone: z.string().regex(/^(\+91)?[6-9]\d{9}$/, 'Invalid Indian phone number').optional().or(z.literal('')),
  aadhaarLastFour: z.string().regex(/^\d{4}$/, 'Must be exactly 4 digits').optional().or(z.literal('')),
});

const addressSchema = z.object({
  state: z.string().min(1, 'State is required'),
  district: z.string().trim().min(2, 'District is required').max(100),
  mandal: z.string().max(100).optional(),
  pincode: z.string().regex(/^\d{6}$/, 'Must be 6 digits').optional().or(z.literal('')),
  addressLine: z.string().max(500).optional(),
});

const otherSchema = z.object({
  emergencyContactName: z.string().max(100).optional(),
  emergencyContactPhone: z.string().regex(/^(\+91)?[6-9]\d{9}$/, 'Invalid phone number').optional().or(z.literal('')),
  skills: z.string().max(500).optional(),
  experienceYears: z.number().min(0).max(50).optional(),
});

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  aadhaarLastFour: string;
  state: string;
  district: string;
  mandal: string;
  pincode: string;
  addressLine: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  skills: string;
  experienceYears: string;
};

const STEPS = ['Identity', 'Personal', 'Address', 'Other', 'Review'];

export default function WorkerRegister() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<FormData>({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    dateOfBirth: '', gender: '', phone: '', aadhaarLastFour: '',
    state: '', district: '', mandal: '', pincode: '', addressLine: '',
    emergencyContactName: '', emergencyContactPhone: '', skills: '', experienceYears: '',
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateStep = (stepIndex: number): boolean => {
    try {
      setErrors({});
      switch (stepIndex) {
        case 0:
          identitySchema.parse({
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            password: formData.password,
            confirmPassword: formData.confirmPassword,
          });
          break;
        case 1:
          personalSchema.parse({
            dateOfBirth: formData.dateOfBirth,
            gender: formData.gender,
            phone: formData.phone,
            aadhaarLastFour: formData.aadhaarLastFour,
          });
          break;
        case 2:
          addressSchema.parse({
            state: formData.state,
            district: formData.district,
            mandal: formData.mandal,
            pincode: formData.pincode,
            addressLine: formData.addressLine,
          });
          break;
        case 3:
          otherSchema.parse({
            emergencyContactName: formData.emergencyContactName,
            emergencyContactPhone: formData.emergencyContactPhone,
            skills: formData.skills,
            experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : undefined,
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
        'https://aldtcudqvbhmngkstbrr.supabase.co/functions/v1/register-worker',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
            dateOfBirth: formData.dateOfBirth || null,
            gender: formData.gender || null,
            phone: formData.phone || null,
            aadhaarLastFour: formData.aadhaarLastFour || null,
            state: formData.state,
            district: formData.district.trim(),
            mandal: formData.mandal.trim() || null,
            pincode: formData.pincode || null,
            addressLine: formData.addressLine.trim() || null,
            emergencyContactName: formData.emergencyContactName.trim() || null,
            emergencyContactPhone: formData.emergencyContactPhone || null,
            skills: formData.skills ? formData.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
            experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : null,
          }),
        }
      );

      const data = await response.json();
      
      if (data.success) {
        toast({ title: 'Success!', description: 'Registration complete. Please login.' });
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
              <Clock className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-display font-bold">Worker Registration</h1>
          <p className="text-muted-foreground">Create your account to track attendance</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {STEPS.map((stepName, index) => (
            <div key={stepName} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                index < step ? 'bg-primary text-primary-foreground' :
                index === step ? 'bg-primary text-primary-foreground' :
                'bg-muted text-muted-foreground'
              }`}>
                {index < step ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <span className={`ml-2 text-sm hidden md:inline ${index === step ? 'font-medium' : 'text-muted-foreground'}`}>
                {stepName}
              </span>
              {index < STEPS.length - 1 && (
                <div className={`w-8 md:w-16 h-0.5 mx-2 ${index < step ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step]}</CardTitle>
            <CardDescription>
              {step === 0 && 'Enter your identity information'}
              {step === 1 && 'Personal details (optional)'}
              {step === 2 && 'Your address in India'}
              {step === 3 && 'Additional information (optional)'}
              {step === 4 && 'Review your information before submitting'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step 0: Identity */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input id="firstName" value={formData.firstName} onChange={e => updateField('firstName', e.target.value)} />
                    {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input id="lastName" value={formData.lastName} onChange={e => updateField('lastName', e.target.value)} />
                    {errors.lastName && <p className="text-sm text-destructive">{errors.lastName}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={formData.email} onChange={e => updateField('email', e.target.value)} />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
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
            )}

            {/* Step 1: Personal */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input id="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={e => updateField('dateOfBirth', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={formData.gender} onValueChange={v => updateField('gender', v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (+91)</Label>
                  <Input id="phone" placeholder="9876543210" value={formData.phone} onChange={e => updateField('phone', e.target.value)} />
                  {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aadhaarLastFour">Last 4 digits of Aadhaar</Label>
                  <Input id="aadhaarLastFour" maxLength={4} placeholder="1234" value={formData.aadhaarLastFour} onChange={e => updateField('aadhaarLastFour', e.target.value.replace(/\D/g, ''))} />
                  {errors.aadhaarLastFour && <p className="text-sm text-destructive">{errors.aadhaarLastFour}</p>}
                </div>
              </div>
            )}

            {/* Step 2: Address */}
            {step === 2 && (
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

            {/* Step 3: Other */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                    <Input id="emergencyContactName" value={formData.emergencyContactName} onChange={e => updateField('emergencyContactName', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
                    <Input id="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={e => updateField('emergencyContactPhone', e.target.value)} />
                    {errors.emergencyContactPhone && <p className="text-sm text-destructive">{errors.emergencyContactPhone}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="skills">Skills (comma separated)</Label>
                  <Input id="skills" placeholder="Masonry, Plumbing, Electrical" value={formData.skills} onChange={e => updateField('skills', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experienceYears">Years of Experience</Label>
                  <Input id="experienceYears" type="number" min="0" max="50" value={formData.experienceYears} onChange={e => updateField('experienceYears', e.target.value)} />
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Name:</strong> {formData.firstName} {formData.lastName}</div>
                  <div><strong>Email:</strong> {formData.email}</div>
                  <div><strong>Phone:</strong> {formData.phone || 'Not provided'}</div>
                  <div><strong>Gender:</strong> {formData.gender || 'Not provided'}</div>
                  <div><strong>State:</strong> {formData.state}</div>
                  <div><strong>District:</strong> {formData.district}</div>
                  <div className="col-span-2"><strong>Address:</strong> {formData.addressLine || 'Not provided'}</div>
                  <div><strong>Skills:</strong> {formData.skills || 'Not provided'}</div>
                  <div><strong>Experience:</strong> {formData.experienceYears ? `${formData.experienceYears} years` : 'Not provided'}</div>
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
                <Button onClick={nextStep}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading}>
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

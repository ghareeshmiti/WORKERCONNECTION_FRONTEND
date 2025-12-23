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
import { Loader2, ArrowLeft, ArrowRight, Check, Landmark } from 'lucide-react';
import { INDIA_STATES } from '@/lib/types';

// Validation schemas
const detailsSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters').max(100),
  code: z.string().trim().min(3, 'Code must be at least 3 characters').max(20).regex(/^[A-Z0-9-]+$/i, 'Only letters, numbers, and hyphens'),
  description: z.string().max(500).optional(),
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

type FormData = {
  name: string;
  code: string;
  description: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  state: string;
  district: string;
  mandal: string;
  pincode: string;
  addressLine: string;
};

const STEPS = ['Details', 'Address', 'Review'];

export default function DepartmentRegister() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<FormData>({
    name: '', code: '', description: '',
    email: '', password: '', confirmPassword: '', phone: '',
    state: '', district: '', mandal: '', pincode: '', addressLine: '',
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
          detailsSchema.parse({
            name: formData.name,
            code: formData.code,
            description: formData.description,
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
        'https://aldtcudqvbhmngkstbrr.supabase.co/functions/v1/register-department',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
            description: formData.description.trim() || null,
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
            phone: formData.phone || null,
            state: formData.state,
            district: formData.district.trim(),
            mandal: formData.mandal.trim() || null,
            pincode: formData.pincode || null,
            addressLine: formData.addressLine.trim() || null,
          }),
        }
      );

      const data = await response.json();
      
      if (data.success) {
        toast({ title: 'Success!', description: 'Department registered successfully. Please login.' });
        navigate('/auth?role=department');
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
            <div className="w-16 h-16 rounded-xl bg-success flex items-center justify-center">
              <Landmark className="w-8 h-8 text-success-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-display font-bold">Department Registration</h1>
          <p className="text-muted-foreground">Register your department to manage establishments</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {STEPS.map((stepName, index) => (
            <div key={stepName} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                index < step ? 'bg-success text-success-foreground' :
                index === step ? 'bg-success text-success-foreground' :
                'bg-muted text-muted-foreground'
              }`}>
                {index < step ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <span className={`ml-2 text-sm hidden md:inline ${index === step ? 'font-medium' : 'text-muted-foreground'}`}>
                {stepName}
              </span>
              {index < STEPS.length - 1 && (
                <div className={`w-12 md:w-16 h-0.5 mx-2 ${index < step ? 'bg-success' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step]}</CardTitle>
            <CardDescription>
              {step === 0 && 'Department details and admin credentials'}
              {step === 1 && 'Location in India'}
              {step === 2 && 'Review your information before submitting'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step 0: Details */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Department Name *</Label>
                    <Input id="name" value={formData.name} onChange={e => updateField('name', e.target.value)} />
                    {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Unique Code *</Label>
                    <Input id="code" placeholder="DEPT-001" value={formData.code} onChange={e => updateField('code', e.target.value.toUpperCase())} />
                    {errors.code && <p className="text-sm text-destructive">{errors.code}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={formData.description} onChange={e => updateField('description', e.target.value)} placeholder="Brief description of the department..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Admin Email *</Label>
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

            {/* Step 2: Review */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="grid gap-4">
                  <div className="p-4 rounded-lg bg-muted">
                    <h4 className="font-medium mb-2">Department Information</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-muted-foreground">Name:</span>
                      <span>{formData.name}</span>
                      <span className="text-muted-foreground">Code:</span>
                      <span>{formData.code}</span>
                      <span className="text-muted-foreground">Email:</span>
                      <span>{formData.email}</span>
                      {formData.phone && (
                        <>
                          <span className="text-muted-foreground">Phone:</span>
                          <span>{formData.phone}</span>
                        </>
                      )}
                      {formData.description && (
                        <>
                          <span className="text-muted-foreground">Description:</span>
                          <span>{formData.description}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <h4 className="font-medium mb-2">Location</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-muted-foreground">State:</span>
                      <span>{formData.state}</span>
                      <span className="text-muted-foreground">District:</span>
                      <span>{formData.district}</span>
                      {formData.mandal && (
                        <>
                          <span className="text-muted-foreground">Mandal:</span>
                          <span>{formData.mandal}</span>
                        </>
                      )}
                      {formData.pincode && (
                        <>
                          <span className="text-muted-foreground">Pincode:</span>
                          <span>{formData.pincode}</span>
                        </>
                      )}
                      {formData.addressLine && (
                        <>
                          <span className="text-muted-foreground">Address:</span>
                          <span>{formData.addressLine}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={prevStep} disabled={step === 0}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={nextStep}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading} className="bg-success hover:bg-success/90">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Complete Registration
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

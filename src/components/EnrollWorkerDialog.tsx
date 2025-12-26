import { useState, useMemo } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, ArrowLeft, ArrowRight, Check, UserPlus } from 'lucide-react';
import { getDistricts, getMandalsForDistrict, getVillagesForMandal } from '@/data/india-locations';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

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
const personalSchema = z.object({
  firstName: z.string().trim().min(2, 'First name must be at least 2 characters').max(50),
  lastName: z.string().trim().min(2, 'Last name must be at least 2 characters').max(50),
  gender: z.string().min(1, 'Gender is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit mobile number'),
}).refine((data) => {
  const age = calculateAge(data.dateOfBirth);
  return age >= 18;
}, {
  message: "Must be at least 18 years old",
  path: ["dateOfBirth"],
});

const addressSchema = z.object({
  district: z.string().min(1, 'District is required'),
  mandal: z.string().min(1, 'Mandal/City is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits').optional().or(z.literal('')),
  addressLine: z.string().max(200).optional(),
});

type FormData = {
  aadhaar: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  district: string;
  mandal: string;
  pincode: string;
  addressLine: string;
  accessCardId: string;
};

const GENDERS = ['Male', 'Female', 'Other'];

interface EnrollWorkerDialogProps {
  departmentId: string;
}

export function EnrollWorkerDialog({ departmentId }: EnrollWorkerDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<FormData>({
    aadhaar: '',
    firstName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    phone: '',
    district: '',
    mandal: '',
    pincode: '',
    addressLine: '',
    accessCardId: '',
  });

  const districts = useMemo(() => getDistricts(), []);
  const mandals = useMemo(() => {
    return formData.district ? getMandalsForDistrict(formData.district) : [];
  }, [formData.district]);

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Reset dependent fields
      if (field === 'district') {
        newData.mandal = '';
      }
      
      return newData;
    });
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleAadhaarChange = (value: string) => {
    const formatted = formatAadhaar(value);
    updateField('aadhaar', formatted);
  };

  const validateStep = () => {
    setErrors({});
    
    try {
      if (step === 0) {
        personalSchema.parse(formData);
      } else if (step === 1) {
        addressSchema.parse(formData);
      }
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) newErrors[e.path[0] as string] = e.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(prev => Math.min(prev + 1, 2));
    }
  };

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 0));
  };

  const resetForm = () => {
    setStep(0);
    setFormData({
      aadhaar: '',
      firstName: '',
      lastName: '',
      gender: '',
      dateOfBirth: '',
      phone: '',
      district: '',
      mandal: '',
      pincode: '',
      addressLine: '',
      accessCardId: '',
    });
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    
    setLoading(true);
    
    try {
      // Generate worker_id
      const { count: workerCount } = await supabase
        .from('workers')
        .select('*', { count: 'exact', head: true });
      
      const workerId = `WKR${String((workerCount ?? 0) + 1).padStart(8, '0')}`;
      
      // Extract last 4 digits of Aadhaar
      const aadhaarDigits = formData.aadhaar.replace(/-/g, '');
      const aadhaarLastFour = aadhaarDigits.length >= 4 ? aadhaarDigits.slice(-4) : null;

      // Insert worker with department_id
      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .insert({
          worker_id: workerId,
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          gender: formData.gender,
          date_of_birth: formData.dateOfBirth || null,
          phone: formData.phone,
          aadhaar_last_four: aadhaarLastFour,
          state: 'Andhra Pradesh',
          district: formData.district,
          mandal: formData.mandal || null,
          pincode: formData.pincode || null,
          address_line: formData.addressLine || null,
          access_card_id: formData.accessCardId || null,
          department_id: departmentId,
          is_active: true,
        })
        .select('id, worker_id')
        .single();

      if (workerError) {
        throw new Error(`Worker creation failed: ${workerError.message}`);
      }

      toast({
        title: 'Worker Enrolled Successfully',
        description: `Worker ID: ${workerId}`,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['department-workers'] });
      queryClient.invalidateQueries({ queryKey: ['department-stats'] });

      resetForm();
      setOpen(false);

    } catch (error) {
      console.error('Enrollment error:', error);
      toast({
        title: 'Enrollment Failed',
        description: error instanceof Error ? error.message : 'Failed to enroll worker',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const STEPS = ['Personal Information', 'Address & Card', 'Review'];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          Enroll Worker
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enroll New Worker</DialogTitle>
          <DialogDescription>
            Add a worker to your department. They will be visible only to establishments under this department.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i < step ? 'bg-success text-success-foreground' :
                i === step ? 'bg-primary text-primary-foreground' :
                'bg-muted text-muted-foreground'
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 md:w-16 h-1 mx-1 ${i < step ? 'bg-success' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 0: Personal Information */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Aadhaar Number (Optional)</Label>
              <Input
                placeholder="XXXX-XXXX-XXXX"
                value={formData.aadhaar}
                onChange={(e) => handleAadhaarChange(e.target.value)}
                maxLength={14}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                />
                {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                />
                {errors.lastName && <p className="text-sm text-destructive">{errors.lastName}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gender *</Label>
                <Select value={formData.gender} onValueChange={(v) => updateField('gender', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-sm text-destructive">{errors.gender}</p>}
              </div>
              <div className="space-y-2">
                <Label>Date of Birth *</Label>
                <Input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => updateField('dateOfBirth', e.target.value)}
                />
                {errors.dateOfBirth && <p className="text-sm text-destructive">{errors.dateOfBirth}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mobile Number *</Label>
              <Input
                placeholder="10-digit mobile number"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
              />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
            </div>
          </div>
        )}

        {/* Step 1: Address & Access Card */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>District *</Label>
                <Select value={formData.district} onValueChange={(v) => updateField('district', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {districts.map((d: any) => (
                      <SelectItem key={typeof d === 'string' ? d : d.code} value={typeof d === 'string' ? d : d.code}>
                        {typeof d === 'string' ? d : d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.district && <p className="text-sm text-destructive">{errors.district}</p>}
              </div>
              <div className="space-y-2">
                <Label>Mandal/City *</Label>
                <Select 
                  value={formData.mandal} 
                  onValueChange={(v) => updateField('mandal', v)}
                  disabled={!formData.district}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {mandals.map((m: any) => (
                      <SelectItem key={typeof m === 'string' ? m : m.code} value={typeof m === 'string' ? m : m.code}>
                        {typeof m === 'string' ? m : m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.mandal && <p className="text-sm text-destructive">{errors.mandal}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Pincode</Label>
              <Input
                placeholder="6-digit pincode"
                value={formData.pincode}
                onChange={(e) => updateField('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
              />
              {errors.pincode && <p className="text-sm text-destructive">{errors.pincode}</p>}
            </div>

            <div className="space-y-2">
              <Label>Address Line</Label>
              <Input
                placeholder="Street, Door No., etc."
                value={formData.addressLine}
                onChange={(e) => updateField('addressLine', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Access Card ID</Label>
              <Input
                placeholder="Enter access card number"
                value={formData.accessCardId}
                onChange={(e) => updateField('accessCardId', e.target.value.toUpperCase())}
              />
              <p className="text-xs text-muted-foreground">Optional - can be assigned later</p>
            </div>
          </div>
        )}

        {/* Step 2: Review */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium">Personal Information</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Name:</span>
                <span>{formData.firstName} {formData.lastName}</span>
                <span className="text-muted-foreground">Gender:</span>
                <span>{formData.gender}</span>
                <span className="text-muted-foreground">Date of Birth:</span>
                <span>{formData.dateOfBirth}</span>
                <span className="text-muted-foreground">Phone:</span>
                <span>{formData.phone}</span>
                {formData.aadhaar && (
                  <>
                    <span className="text-muted-foreground">Aadhaar:</span>
                    <span>XXXX-XXXX-{formData.aadhaar.slice(-4)}</span>
                  </>
                )}
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium">Address</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">District:</span>
                <span>{formData.district}</span>
                <span className="text-muted-foreground">Mandal:</span>
                <span>{formData.mandal}</span>
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

            {formData.accessCardId && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium">Access Card</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Card ID:</span>
                  <span>{formData.accessCardId}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          {step > 0 ? (
            <Button variant="outline" onClick={prevStep} disabled={loading}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
          ) : (
            <div />
          )}

          {step < STEPS.length - 1 ? (
            <Button onClick={nextStep}>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Enroll Worker
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
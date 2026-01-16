import { useState, useMemo } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { getDistricts, getMandalsForDistrict, getVillagesForMandal } from '@/data/india-locations';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

// Helper to calculate age
const calculateAge = (dob: string) => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Calculate max date for 18 years ago
const getMaxDOB = () => {
  const today = new Date();
  today.setFullYear(today.getFullYear() - 18);
  return today.toISOString().split('T')[0];
};

const personalSchema = z.object({
  aadhaar: z.string().regex(/^\d{12}$/, 'Must be valid 12-digit Aadhaar'),
  eshramId: z.string().optional(),
  bocwId: z.string().optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  gender: z.string().min(1, 'Gender is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required').refine((dob) => calculateAge(dob) >= 18, {
    message: "Worker must be at least 18 years old"
  }),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number'),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  maritalStatus: z.string().optional(),
  caste: z.string().optional(),
  disabilityStatus: z.string().optional(),
  photoUrl: z.string().optional(),
});

const addressSchema = z.object({
  district: z.string().min(1, 'District is required'),
  mandal: z.string().min(1, 'Mandal is required'),
  village: z.string().min(1, 'Village is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode'),
  addressLine: z.string().optional(),
});

const professionalSchema = z.object({
  educationLevel: z.string().optional(),
  skillCategory: z.string().optional(),
  workHistory: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  nresMember: z.string().optional(),
  tradeUnionMember: z.string().optional(),
});

interface EnrollWorkerDialogProps {
  establishmentId?: string;
  mappedBy?: string;
}

export function EnrollWorkerDialog({ establishmentId, mappedBy }: EnrollWorkerDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0); // 0: Personal, 1: Professional, 2: Address, 3: Card Setup
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newWorkerId, setNewWorkerId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    aadhaar: '', eshramId: '', bocwId: '',
    firstName: '', lastName: '', gender: '', dateOfBirth: '', phone: '',
    fatherName: '', motherName: '', maritalStatus: '', caste: '', disabilityStatus: 'None',
    photoUrl: '',

    educationLevel: '', skillCategory: '', workHistory: '',
    bankAccountNumber: '', ifscCode: '',
    nresMember: 'No', tradeUnionMember: 'No',

    district: '', mandal: '', village: '', pincode: '', addressLine: '',
  });

  const districts = useMemo(() => getDistricts(), []);
  const mandals = useMemo(() => getMandalsForDistrict(formData.district), [formData.district]);
  const villages = useMemo(() => getVillagesForMandal(formData.district, formData.mandal), [formData.district, formData.mandal]);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `enroll-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    setUploading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('worker_photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('worker_photos')
        .getPublicUrl(filePath);

      updateField('photoUrl', publicUrl);
      toast({ title: "Success", description: "Photo uploaded successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const validateStep = () => {
    try {
      if (step === 0) personalSchema.parse(formData);
      if (step === 1) professionalSchema.parse(formData);
      if (step === 2) addressSchema.parse(formData);
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: err.errors[0].message,
          variant: "destructive"
        })
      }
      return false;
    }
  };

  const handleNext = () => {
    if (validateStep()) setStep(prev => prev + 1);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true);

    try {
      // 1. Create worker
      const generatedWorkerId = `WKR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      const { data: worker, error: workerError } = await supabase
        .from('workers')
        .insert({
          worker_id: generatedWorkerId,
          first_name: formData.firstName,
          last_name: formData.lastName,
          aadhaar_number: formData.aadhaar,
          date_of_birth: formData.dateOfBirth,
          gender: formData.gender,
          phone: formData.phone,
          state: 'Andhra Pradesh',
          district: formData.district,
          mandal: formData.mandal,
          village: formData.village,
          pincode: formData.pincode,
          address_line: formData.addressLine,
          // New Fields
          father_name: formData.fatherName || null,
          mother_name: formData.motherName || null,
          marital_status: formData.maritalStatus || null,
          caste: formData.caste || null,
          disability_status: formData.disabilityStatus || null,
          eshram_id: formData.eshramId || null,
          bocw_id: formData.bocwId || null,
          photo_url: formData.photoUrl || null,

          education_level: formData.educationLevel || null,
          skill_category: formData.skillCategory || null,
          work_history: formData.workHistory || null,
          bank_account_number: formData.bankAccountNumber || null,
          ifsc_code: formData.ifscCode || null,
          nres_member: formData.nresMember || 'No',
          trade_union_member: formData.tradeUnionMember || 'No',

          status: 'APPROVED', // Direct enrollment implies approval
        })
        .select()
        .single();

      if (workerError) throw workerError;

      // 2. Map to establishment if provided
      if (establishmentId && mappedBy && worker) {
        const { error: mapError } = await supabase
          .from('worker_establishment_mapping')
          .insert({
            worker_id: worker.id,
            establishment_id: establishmentId,
            mapped_by: mappedBy
          });
        if (mapError) throw mapError;
      }

      setNewWorkerId(worker.id);
      toast({ title: "Worker Enrolled", description: "Worker profile created successfully." });
      queryClient.invalidateQueries({ queryKey: [establishmentId ? 'establishment-workers' : 'workers'] });
      setStep(3); // Move to card setup

    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const STEPS_LABELS = ['Personal', 'Professional', 'Address', 'Card Setup'];

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) {
        setStep(0);
        setNewWorkerId(null);
      }
      setOpen(v);
    }}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          Enroll New Worker
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enroll New Worker</DialogTitle>
          <DialogDescription>
            Step {step + 1} of {STEPS_LABELS.length}: {STEPS_LABELS[step]}
          </DialogDescription>
        </DialogHeader>

        {step < 3 ? (
          <div className="space-y-6 py-4">
            {/* Step 0: Personal */}
            {step === 0 && (
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Aadhaar Number</Label>
                    <Input value={formData.aadhaar} onChange={e => updateField('aadhaar', e.target.value)} maxLength={12} placeholder="12 digit number" />
                  </div>
                  <div className="space-y-2">
                    <Label>Photo</Label>
                    <div className="flex gap-2 items-center">
                      <Input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading} className="h-8 text-xs" />
                      {formData.photoUrl && <Check className="w-4 h-4 text-green-500" />}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input value={formData.firstName} onChange={e => updateField('firstName', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input value={formData.lastName} onChange={e => updateField('lastName', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select value={formData.gender} onValueChange={v => updateField('gender', v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={e => updateField('dateOfBirth', e.target.value)}
                      max={getMaxDOB()}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Father Name</Label>
                    <Input value={formData.fatherName} onChange={e => updateField('fatherName', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Mother Name</Label>
                    <Input value={formData.motherName} onChange={e => updateField('motherName', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Marital Status</Label>
                    <Select value={formData.maritalStatus} onValueChange={v => updateField('maritalStatus', v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Single">Single</SelectItem>
                        <SelectItem value="Married">Married</SelectItem>
                        <SelectItem value="Widow">Widow</SelectItem>
                        <SelectItem value="Divorced">Divorced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Caste</Label>
                    <Select value={formData.caste} onValueChange={v => updateField('caste', v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OC">OC</SelectItem>
                        <SelectItem value="BC">BC</SelectItem>
                        <SelectItem value="SC">SC</SelectItem>
                        <SelectItem value="ST">ST</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1">
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
                </div>
                <div className="grid grid-cols-1">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={formData.phone} onChange={e => updateField('phone', e.target.value)} placeholder="10 digits" maxLength={10} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Professional */}
            {step === 1 && (
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
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
                  <Textarea value={formData.workHistory} onChange={e => updateField('workHistory', e.target.value)} placeholder="Past experience..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input value={formData.bankAccountNumber} onChange={e => updateField('bankAccountNumber', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>IFSC Code</Label>
                    <Input value={formData.ifscCode} onChange={e => updateField('ifscCode', e.target.value.toUpperCase())} />
                  </div>
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
                    <Label>Union Member</Label>
                    <Select value={formData.tradeUnionMember} onValueChange={v => updateField('tradeUnionMember', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Address */}
            {step === 2 && (
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>District</Label>
                  <Select value={formData.district} onValueChange={(v) => {
                    updateField('district', v);
                    updateField('mandal', '');
                    updateField('village', '');
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {districts.map(d => <SelectItem key={d.code} value={d.name}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mandal</Label>
                    <Select value={formData.mandal} onValueChange={(v) => {
                      updateField('mandal', v);
                      updateField('village', '');
                    }} disabled={!formData.district}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {mandals.map(m => <SelectItem key={m.code} value={m.name}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Village</Label>
                    <Select value={formData.village} onValueChange={(v) => updateField('village', v)} disabled={!formData.mandal}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {villages.map(v => <SelectItem key={v.code} value={v.name}>{v.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Pincode</Label>
                  <Input value={formData.pincode} onChange={e => updateField('pincode', e.target.value)} maxLength={6} />
                </div>
                <div className="space-y-2">
                  <Label>Address Line</Label>
                  <Input value={formData.addressLine} onChange={e => updateField('addressLine', e.target.value)} placeholder="H.No, Street..." />
                </div>
              </div>
            )}
          </div>
        ) : (
          // Card Setup Step
          <div className="py-6 text-center space-y-4">
            <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Worker Enrolled Successfully!</h3>
              <p className="text-muted-foreground">The worker profile has been created.</p>
            </div>
            {/* Placeholder for Card Setup - separate flow or integrated later */}
            <div className="p-4 border rounded bg-muted/20">
              <p className="text-sm">Smart Card Setup can be done from the Worker List for this worker.</p>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-4">
          {step < 3 && (
            <>
              <Button variant="outline" onClick={() => setStep(prev => prev - 1)} disabled={step === 0}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={step === 2 ? handleSubmit : handleNext} disabled={loading || uploading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {step === 2 ? 'Submit Enrollment' : 'Next'}
                {step !== 2 && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </>
          )}
          {step === 3 && (
            <Button onClick={() => setOpen(false)} className="w-full">
              Done
            </Button>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
}
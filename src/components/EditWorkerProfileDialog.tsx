import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Loader2, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getDistricts, getMandalsForDistrict, getVillagesForMandal } from '@/data/india-locations';
import { useMemo } from 'react';

const editWorkerSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  mandal: z.string().optional(),
  village: z.string().optional(),
  pincode: z.string().optional(),
  address_line: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  skills: z.string().optional(),
  experience_years: z.coerce.number().min(0).optional(),
  father_name: z.string().optional(),
  mother_name: z.string().optional(),
  marital_status: z.string().optional(),
  caste: z.string().optional(),
  bank_account_number: z.string().optional(),
  ifsc_code: z.string().optional(),
  photo_url: z.string().optional(),
  nres_member: z.string().optional(),
  trade_union_member: z.string().optional(),
  eshram_id: z.string().optional(),
  bocw_id: z.string().optional(),
  disability_status: z.string().optional(),
  education_level: z.string().optional(),
  skill_category: z.string().optional(),
  work_history: z.string().optional(),
});

type EditWorkerFormData = z.infer<typeof editWorkerSchema>;

interface EditWorkerProfileDialogProps {
  worker: {
    id: string;
    first_name: string;
    last_name: string;
    phone?: string | null;
    email?: string | null;
    date_of_birth?: string | null;
    gender?: string | null;
    state?: string | null;
    district?: string | null;
    mandal?: string | null;
    village?: string | null;
    pincode?: string | null;
    address_line?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    skills?: string[] | null;
    experience_years?: number | null;
    father_name?: string | null;
    mother_name?: string | null;
    marital_status?: string | null;
    caste?: string | null;
    bank_account_number?: string | null;
    ifsc_code?: string | null;
    photo_url?: string | null;
    nres_member?: string | null;
    trade_union_member?: string | null;
    eshram_id?: string | null;
    bocw_id?: string | null;
    aadhaar_number?: string | null;
    disability_status?: string | null;
    education_level?: string | null;
    skill_category?: string | null;
    work_history?: string | null;
  } | null | undefined;
}

export function EditWorkerProfileDialog({ worker }: EditWorkerProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<EditWorkerFormData>({
    resolver: zodResolver(editWorkerSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      date_of_birth: '',
      gender: '',
      state: 'Andhra Pradesh',
      district: '',
      mandal: '',
      village: '',
      pincode: '',
      address_line: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      skills: '',
      experience_years: 0,
      father_name: '',
      mother_name: '',
      marital_status: '',
      caste: '',
      bank_account_number: '',
      ifsc_code: '',
      photo_url: '',
      nres_member: 'No',
      trade_union_member: 'No',
      eshram_id: '',
      bocw_id: '',
      disability_status: 'None',
      education_level: '',
      skill_category: '',
      work_history: '',
    },
  });

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && worker) {
      form.reset({
        first_name: worker.first_name || '',
        last_name: worker.last_name || '',
        phone: worker.phone || '',
        email: worker.email || '',
        date_of_birth: worker.date_of_birth || '',
        gender: worker.gender || '',
        state: worker.state || 'Andhra Pradesh',
        district: worker.district || '',
        mandal: worker.mandal || '',
        village: worker.village || '',
        pincode: worker.pincode || '',
        address_line: worker.address_line || '',
        emergency_contact_name: worker.emergency_contact_name || '',
        emergency_contact_phone: worker.emergency_contact_phone || '',
        skills: worker.skills?.join(', ') || '',
        experience_years: worker.experience_years || 0,
        father_name: worker.father_name || '',
        mother_name: worker.mother_name || '',
        marital_status: worker.marital_status || '',
        caste: worker.caste || '',
        bank_account_number: worker.bank_account_number || '',
        ifsc_code: worker.ifsc_code || '',
        photo_url: worker.photo_url || '',
        nres_member: worker.nres_member || 'No',
        trade_union_member: worker.trade_union_member || 'No',
        eshram_id: worker.eshram_id || '',
        bocw_id: worker.bocw_id || '',
        disability_status: worker.disability_status || 'None',
        education_level: worker.education_level || '',
        skill_category: worker.skill_category || '',
        work_history: worker.work_history || '',
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${worker?.id}-${Math.random().toString(36).substring(7)}.${fileExt}`;
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

      form.setValue('photo_url', publicUrl);
      toast.success('Photo uploaded successfully');
    } catch (error: any) {
      toast.error(error.message || 'Error uploading photo');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: EditWorkerFormData) => {
    if (!worker?.id) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('workers')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone || null,
          email: data.email || null,
          date_of_birth: data.date_of_birth || null,
          gender: data.gender || null,
          state: data.state || 'Andhra Pradesh',
          district: data.district || null,
          mandal: data.mandal || null,
          village: data.village || null,
          pincode: data.pincode || null,
          address_line: data.address_line || null,
          emergency_contact_name: data.emergency_contact_name || null,
          emergency_contact_phone: data.emergency_contact_phone || null,
          skills: data.skills ? data.skills.split(',').map(s => s.trim()).filter(Boolean) : null,
          experience_years: data.experience_years,
          father_name: data.father_name || null,
          mother_name: data.mother_name || null,
          marital_status: data.marital_status || null,
          caste: data.caste || null,
          bank_account_number: data.bank_account_number || null,
          ifsc_code: data.ifsc_code || null,
          photo_url: data.photo_url || null,
          nres_member: data.nres_member || 'No',
          trade_union_member: data.trade_union_member || 'No',
          eshram_id: data.eshram_id || null,
          bocw_id: data.bocw_id || null,
          disability_status: data.disability_status || null,
          education_level: data.education_level || null,
          skill_category: data.skill_category || null,
          work_history: data.work_history || null,
        })
        .eq('id', worker.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      queryClient.invalidateQueries({ queryKey: ['worker-profile'] });
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const districts = useMemo(() => getDistricts(), []);

  const watchedDistrict = form.watch('district');
  const watchedMandal = form.watch('mandal');

  const mandals = useMemo(() => {
    if (!watchedDistrict) return [];
    const selected = districts.find((d: any) => d.code === watchedDistrict || d.name === watchedDistrict || d === watchedDistrict);
    const distName = selected ? (typeof selected === 'string' ? selected : selected.name) : watchedDistrict;
    return getMandalsForDistrict(distName);
  }, [watchedDistrict, districts]);

  const villages = useMemo(() => {
    if (!watchedDistrict || !watchedMandal) return [];
    const selected = districts.find((d: any) => d.code === watchedDistrict || d.name === watchedDistrict || d === watchedDistrict);
    const distName = selected ? (typeof selected === 'string' ? selected : selected.name) : watchedDistrict;
    return getVillagesForMandal(distName, watchedMandal);
  }, [watchedDistrict, watchedMandal, districts]);

  if (!worker) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Your Profile</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* Photo & IDs */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground border-b pb-2">Identification & Photo</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FormLabel>Aadhaar Number</FormLabel>
                  <Input value={worker.aadhaar_number || ''} disabled className="bg-muted" />
                </div>
                <FormField
                  control={form.control}
                  name="photo_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Photo</FormLabel>
                      <FormControl>
                        <div className="flex gap-4 items-center">
                          {field.value && (
                            <div className="h-16 w-16 rounded overflow-hidden border">
                              <img src={field.value} alt="Profile" className="h-full w-full object-cover" />
                            </div>
                          )}
                          <div className="flex-1">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleFileUpload}
                              disabled={uploading}
                            />
                            {uploading && <p className="text-xs text-muted-foreground mt-1">Uploading...</p>}
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="eshram_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>eShram ID</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bocw_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>BOCW ID</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Personal Info */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground border-b pb-2">Personal Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date_of_birth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="father_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Father Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mother_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mother Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="marital_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marital Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Single">Single</SelectItem>
                          <SelectItem value="Married">Married</SelectItem>
                          <SelectItem value="Widow">Widow</SelectItem>
                          <SelectItem value="Divorced">Divorced</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="caste"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Caste</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Caste" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="OC">OC</SelectItem>
                          <SelectItem value="BC">BC</SelectItem>
                          <SelectItem value="SC">SC</SelectItem>
                          <SelectItem value="ST">ST</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="disability_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Disability Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="Physical">Physical</SelectItem>
                          <SelectItem value="Visual">Visual</SelectItem>
                          <SelectItem value="Hearing">Hearing</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="education_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Education Level</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Banking Details */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground border-b pb-2">Banking Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bank_account_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ifsc_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IFSC Code</FormLabel>
                      <FormControl><Input {...field} className="uppercase" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground border-b pb-2">Address Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>District</FormLabel>
                      <Select value={field.value} onValueChange={(val) => {
                        field.onChange(val);
                        form.setValue('mandal', ''); // Reset mandal
                        form.setValue('village', '');
                      }}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select District" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {districts.map((d: any) => (
                            <SelectItem key={d.code || d} value={d.name || d}>{d.name || d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mandal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mandal</FormLabel>
                      <Select value={field.value} onValueChange={(val) => {
                        field.onChange(val);
                        form.setValue('village', '');
                      }} disabled={!watchedDistrict}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Mandal" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mandals.map((m: any) => (
                            <SelectItem key={m.code || m} value={m.name || m}>{m.name || m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="village"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Village</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange} disabled={!watchedMandal}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Village" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {villages.map((v: any) => (
                            <SelectItem key={v.code} value={v.name}>{v.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pincode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pincode</FormLabel>
                      <FormControl>
                        <Input placeholder="6-digit code" {...field} maxLength={6} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1">
                <FormField
                  control={form.control}
                  name="address_line"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line</FormLabel>
                      <FormControl>
                        <Input placeholder="House No, Street, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Professional & Emergency */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground border-b pb-2">Professional & Emergency</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nres_member"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NRES Member</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="trade_union_member"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trade Union Member</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Yes">Yes</SelectItem>
                          <SelectItem value="No">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="skill_category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Skill Category</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Unskilled">Unskilled</SelectItem>
                          <SelectItem value="Semi-Skilled">Semi-Skilled</SelectItem>
                          <SelectItem value="Skilled">Skilled</SelectItem>
                          <SelectItem value="Highly Skilled">Highly Skilled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="experience_years"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experience (Years)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1">
                <FormField
                  control={form.control}
                  name="skills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specific Skills (Comma separated)</FormLabel>
                      <FormControl>
                        <Input placeholder="Painter, Driver, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1">
                <FormField
                  control={form.control}
                  name="work_history"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work History</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Past employers, roles, duration..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="emergency_contact_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact</FormLabel>
                      <FormControl>
                        <Input placeholder="Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergency_contact_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || uploading}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

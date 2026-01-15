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
import { Pencil, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getDistricts, getMandalsForDistrict } from '@/data/india-locations';
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
  pincode: z.string().optional(),
  address_line: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  skills: z.string().optional(), // Comma separated
  experience_years: z.coerce.number().min(0).optional(),
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
    pincode?: string | null;
    address_line?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    skills?: string[] | null;
    experience_years?: number | null;
  } | null | undefined;
}

export function EditWorkerProfileDialog({ worker }: EditWorkerProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      pincode: '',
      address_line: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      skills: '',
      experience_years: 0,
    },
  });

  // Reset form with worker data when dialog opens or worker data changes
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
        pincode: worker.pincode || '',
        address_line: worker.address_line || '',
        emergency_contact_name: worker.emergency_contact_name || '',
        emergency_contact_phone: worker.emergency_contact_phone || '',
        skills: worker.skills?.join(', ') || '',
        experience_years: worker.experience_years || 0,
      });
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
          pincode: data.pincode || null,
          address_line: data.address_line || null,
          emergency_contact_name: data.emergency_contact_name || null,
          emergency_contact_phone: data.emergency_contact_phone || null,
          skills: data.skills ? data.skills.split(',').map(s => s.trim()).filter(Boolean) : null,
          experience_years: data.experience_years,
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

  if (!worker) return null;

  const districts = useMemo(() => getDistricts(), []);

  const watchedDistrict = form.watch('district');
  const mandals = useMemo(() => {
    if (!watchedDistrict) return [];
    const selected = districts.find((d: any) => d.code === watchedDistrict || d.name === watchedDistrict || d === watchedDistrict);
    const distName = selected ? (typeof selected === 'string' ? selected : selected.name) : watchedDistrict;
    return getMandalsForDistrict(distName);
  }, [watchedDistrict, districts]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Your Profile</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

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
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground border-b pb-2">Contact Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="10-digit number" {...field} maxLength={10} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="example@email.com" {...field} />
                      </FormControl>
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
                      <Select value={field.value} onValueChange={field.onChange} disabled={!watchedDistrict}>
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
                <FormField
                  control={form.control}
                  name="skills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Skills (Comma separated)</FormLabel>
                      <FormControl>
                        <Input placeholder="Painter, Driver, etc." {...field} />
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
              <Button type="submit" disabled={isSubmitting}>
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

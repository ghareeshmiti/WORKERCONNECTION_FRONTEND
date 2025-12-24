import { useState, useEffect } from 'react';
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const editEstablishmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address_line: z.string().optional(),
  contractor_name: z.string().optional(),
  project_name: z.string().optional(),
});

type EditEstablishmentFormData = z.infer<typeof editEstablishmentSchema>;

interface EditEstablishmentProfileDialogProps {
  establishmentId: string | undefined;
}

export function EditEstablishmentProfileDialog({ establishmentId }: EditEstablishmentProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: establishment, isLoading } = useQuery({
    queryKey: ['establishment-profile', establishmentId],
    queryFn: async () => {
      if (!establishmentId) return null;
      const { data, error } = await supabase
        .from('establishments')
        .select('*')
        .eq('id', establishmentId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!establishmentId && open,
  });

  const form = useForm<EditEstablishmentFormData>({
    resolver: zodResolver(editEstablishmentSchema),
    defaultValues: {
      name: '',
      description: '',
      phone: '',
      email: '',
      address_line: '',
      contractor_name: '',
      project_name: '',
    },
  });

  // Reset form when establishment data loads or dialog opens
  useEffect(() => {
    if (establishment && open) {
      form.reset({
        name: establishment.name || '',
        description: establishment.description || '',
        phone: establishment.phone || '',
        email: establishment.email || '',
        address_line: establishment.address_line || '',
        contractor_name: establishment.contractor_name || '',
        project_name: establishment.project_name || '',
      });
    }
  }, [establishment, open, form]);

  // Reset form state when dialog closes
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      form.reset({
        name: '',
        description: '',
        phone: '',
        email: '',
        address_line: '',
        contractor_name: '',
        project_name: '',
      });
    }
  };

  const onSubmit = async (data: EditEstablishmentFormData) => {
    if (!establishmentId) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('establishments')
        .update({
          name: data.name,
          description: data.description || null,
          phone: data.phone || null,
          email: data.email || null,
          address_line: data.address_line || null,
          contractor_name: data.contractor_name || null,
          project_name: data.project_name || null,
        })
        .eq('id', establishmentId);

      if (error) throw error;

      toast.success('Establishment updated successfully');
      queryClient.invalidateQueries({ queryKey: ['establishment-profile'] });
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update establishment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!establishmentId) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="w-4 h-4 mr-2" />
          Edit Establishment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Establishment Details</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Establishment Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="project_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter project name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contractor_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contractor Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter contractor name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone number" {...field} />
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
                      <Input type="email" placeholder="Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address_line"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isLoading}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

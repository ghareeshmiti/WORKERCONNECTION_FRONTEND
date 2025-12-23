import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MapWorkerParams {
  workerId: string;
  establishmentId: string;
  mappedBy: string;
  notes?: string;
}

interface UnmapWorkerParams {
  mappingId: string;
  unmappedBy: string;
}

export function useMapWorker() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ workerId, establishmentId, mappedBy, notes }: MapWorkerParams) => {
      const { data, error } = await supabase
        .from('worker_mappings')
        .insert({
          worker_id: workerId,
          establishment_id: establishmentId,
          mapped_by: mappedBy,
          notes: notes || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['establishment-workers'] });
      queryClient.invalidateQueries({ queryKey: ['unmapped-workers'] });
      queryClient.invalidateQueries({ queryKey: ['establishment-today-attendance'] });
      toast({ title: 'Success', description: 'Worker mapped successfully' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error', 
        description: error.message.includes('unique') 
          ? 'Worker is already mapped to an establishment' 
          : error.message,
        variant: 'destructive' 
      });
    },
  });
}

export function useUnmapWorker() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ mappingId, unmappedBy }: UnmapWorkerParams) => {
      const { data, error } = await supabase
        .from('worker_mappings')
        .update({
          is_active: false,
          unmapped_at: new Date().toISOString(),
          unmapped_by: unmappedBy,
        })
        .eq('id', mappingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['establishment-workers'] });
      queryClient.invalidateQueries({ queryKey: ['unmapped-workers'] });
      queryClient.invalidateQueries({ queryKey: ['establishment-today-attendance'] });
      toast({ title: 'Success', description: 'Worker unmapped successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

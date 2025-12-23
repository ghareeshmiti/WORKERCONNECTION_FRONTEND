import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useMapWorker } from '@/hooks/use-worker-mapping';
import { UserPlus, Search, Loader2, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface AddWorkerByIdDialogProps {
  establishmentId: string;
  mappedBy: string;
}

interface WorkerSearchResult {
  id: string;
  worker_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  state: string;
  district: string;
  is_active: boolean;
  hasActiveMapping: boolean;
}

export function AddWorkerByIdDialog({ establishmentId, mappedBy }: AddWorkerByIdDialogProps) {
  const [open, setOpen] = useState(false);
  const [workerId, setWorkerId] = useState('');
  const [searching, setSearching] = useState(false);
  const [worker, setWorker] = useState<WorkerSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const mapWorker = useMapWorker();

  const handleSearch = async () => {
    if (!workerId.trim()) {
      setError('Please enter a Worker ID');
      return;
    }

    setSearching(true);
    setError(null);
    setWorker(null);

    try {
      // Search for worker by worker_id
      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .select('id, worker_id, first_name, last_name, phone, state, district, is_active')
        .eq('worker_id', workerId.trim().toUpperCase())
        .maybeSingle();

      if (workerError) throw workerError;

      if (!workerData) {
        setError(`No worker found with ID: ${workerId.trim().toUpperCase()}`);
        return;
      }

      // Check if worker has an active mapping
      const { data: mappingData } = await supabase
        .from('worker_mappings')
        .select('id, establishment_id')
        .eq('worker_id', workerData.id)
        .eq('is_active', true)
        .maybeSingle();

      setWorker({
        ...workerData,
        hasActiveMapping: !!mappingData,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to search for worker');
    } finally {
      setSearching(false);
    }
  };

  const handleAddWorker = async () => {
    if (!worker) return;

    try {
      await mapWorker.mutateAsync({
        workerId: worker.id,
        establishmentId,
        mappedBy,
      });
      handleClose();
      toast.success('Worker Added', {
        description: `${worker.first_name} ${worker.last_name} has been added to your establishment.`,
      });
    } catch (err) {
      // Error toast is handled by the mutation
    }
  };

  const handleClose = () => {
    setOpen(false);
    setWorkerId('');
    setWorker(null);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserPlus className="w-4 h-4" />
          Add by ID
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Worker by ID</DialogTitle>
          <DialogDescription>
            Enter the worker's ID to add them to your establishment
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="worker-id">Worker ID</Label>
            <div className="flex gap-2">
              <Input
                id="worker-id"
                placeholder="e.g., WKR-ABC123"
                value={workerId}
                onChange={(e) => setWorkerId(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                className="font-mono"
              />
              <Button onClick={handleSearch} disabled={searching}>
                {searching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {worker && (
            <div className="p-4 rounded-lg border bg-card space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {worker.first_name} {worker.last_name}
                  </div>
                  <Badge variant="outline" className="font-mono text-xs mt-1">
                    {worker.worker_id}
                  </Badge>
                </div>
                <Badge variant={worker.is_active ? 'default' : 'secondary'}>
                  {worker.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              
              <div className="text-sm text-muted-foreground space-y-1">
                {worker.phone && <div>Phone: {worker.phone}</div>}
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {worker.district}, {worker.state}
                </div>
              </div>

              {worker.hasActiveMapping ? (
                <div className="flex items-center gap-2 p-2 rounded bg-warning/10 text-warning text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  This worker is already mapped to an establishment
                </div>
              ) : (
                <Button 
                  onClick={handleAddWorker} 
                  disabled={mapWorker.isPending || !worker.is_active}
                  className="w-full gap-2"
                >
                  {mapWorker.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Add to Establishment
                </Button>
              )}

              {!worker.is_active && (
                <p className="text-xs text-muted-foreground text-center">
                  Cannot add inactive worker
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

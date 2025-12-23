import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useUnmappedWorkers } from '@/hooks/use-dashboard-data';
import { useMapWorker } from '@/hooks/use-worker-mapping';
import { UserPlus, Search, Loader2, MapPin } from 'lucide-react';

interface MapWorkerDialogProps {
  establishmentId: string;
  mappedBy: string;
}

export function MapWorkerDialog({ establishmentId, mappedBy }: MapWorkerDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: workers, isLoading } = useUnmappedWorkers();
  const mapWorker = useMapWorker();

  const filteredWorkers = workers?.filter(w => 
    w.worker_id.toLowerCase().includes(search.toLowerCase()) ||
    w.first_name.toLowerCase().includes(search.toLowerCase()) ||
    w.last_name.toLowerCase().includes(search.toLowerCase()) ||
    (w.phone && w.phone.includes(search))
  ) || [];

  const handleMap = async (workerId: string) => {
    await mapWorker.mutateAsync({
      workerId,
      establishmentId,
      mappedBy,
    });
    setOpen(false);
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="w-4 h-4" />
          Map Worker
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Map Worker to Establishment</DialogTitle>
          <DialogDescription>
            Search and select an unmapped worker to add to your establishment
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, name, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredWorkers.length > 0 ? (
            <div className="space-y-2">
              {filteredWorkers.map((worker) => (
                <div
                  key={worker.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {worker.first_name} {worker.last_name}
                      </span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {worker.worker_id}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1">
                      {worker.phone && <span>{worker.phone}</span>}
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {worker.district}, {worker.state}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleMap(worker.id)}
                    disabled={mapWorker.isPending}
                  >
                    {mapWorker.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Map'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {search ? 'No workers found matching your search' : 'No unmapped workers available'}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

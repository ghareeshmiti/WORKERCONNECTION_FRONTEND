import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useUnmappedWorkers } from '@/hooks/use-dashboard-data';
import { useMapWorker, useBulkMapWorkers } from '@/hooks/use-worker-mapping';
import { UserPlus, Search, Loader2, MapPin, Users, CheckSquare } from 'lucide-react';
import { formatWorkerId } from '@/lib/format';

interface MapWorkerDialogProps {
  establishmentId: string;
  mappedBy: string;
}

export function MapWorkerDialog({ establishmentId, mappedBy }: MapWorkerDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  const { data: workers, isLoading } = useUnmappedWorkers();
  const mapWorker = useMapWorker();
  const bulkMapWorkers = useBulkMapWorkers();

  const filteredWorkers = workers?.filter(w =>
    (w.is_active === true) && // Only active workers can be mapped
    (w.worker_id.toLowerCase().includes(search.toLowerCase()) ||
      w.first_name.toLowerCase().includes(search.toLowerCase()) ||
      w.last_name.toLowerCase().includes(search.toLowerCase()) ||
      (w.phone && w.phone.includes(search)))
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

  const handleBulkMap = async () => {
    if (selectedWorkers.size === 0) return;

    await bulkMapWorkers.mutateAsync({
      workerIds: Array.from(selectedWorkers),
      establishmentId,
      mappedBy,
    });

    setOpen(false);
    setSearch('');
    setSelectedWorkers(new Set());
    setBulkMode(false);
  };

  const toggleWorkerSelection = (workerId: string) => {
    const newSelection = new Set(selectedWorkers);
    if (newSelection.has(workerId)) {
      newSelection.delete(workerId);
    } else {
      newSelection.add(workerId);
    }
    setSelectedWorkers(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedWorkers.size === filteredWorkers.length) {
      setSelectedWorkers(new Set());
    } else {
      setSelectedWorkers(new Set(filteredWorkers.map(w => w.id)));
    }
  };

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSearch('');
      setSelectedWorkers(new Set());
      setBulkMode(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white">
          <UserPlus className="w-4 h-4" />
          Map Worker
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Map Worker to Establishment</DialogTitle>
          <DialogDescription>
            {bulkMode
              ? `Select multiple workers to add (${selectedWorkers.size} selected)`
              : 'Search and select an unmapped worker to add to your establishment'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, name, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={bulkMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setBulkMode(!bulkMode);
              setSelectedWorkers(new Set());
            }}
            className="gap-1"
          >
            <Users className="w-4 h-4" />
            Bulk
          </Button>
        </div>

        {bulkMode && filteredWorkers.length > 0 && (
          <div className="flex items-center justify-between py-2 border-b">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSelectAll}
              className="gap-2"
            >
              <CheckSquare className="w-4 h-4" />
              {selectedWorkers.size === filteredWorkers.length ? 'Deselect All' : 'Select All'}
            </Button>
            {selectedWorkers.size > 0 && (
              <Button
                size="sm"
                onClick={handleBulkMap}
                disabled={bulkMapWorkers.isPending}
                className="gap-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
              >
                {bulkMapWorkers.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                Map {selectedWorkers.size} Workers
              </Button>
            )}
          </div>
        )}

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
                  className={`flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors ${bulkMode ? 'cursor-pointer' : ''
                    } ${selectedWorkers.has(worker.id) ? 'border-primary bg-primary/5' : ''}`}
                  onClick={bulkMode ? () => toggleWorkerSelection(worker.id) : undefined}
                >
                  {bulkMode && (
                    <Checkbox
                      checked={selectedWorkers.has(worker.id)}
                      onCheckedChange={() => toggleWorkerSelection(worker.id)}
                      className="mr-3"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {worker.first_name} {worker.last_name}
                      </span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {formatWorkerId(worker.worker_id)}
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
                  {!bulkMode && (
                    <Button
                      size="sm"
                      onClick={() => handleMap(worker.id)}
                      disabled={mapWorker.isPending}
                      className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
                    >
                      {mapWorker.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Map'
                      )}
                    </Button>
                  )}
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

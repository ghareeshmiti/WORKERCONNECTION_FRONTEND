import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, X } from 'lucide-react';
import { formatWorkerId } from '@/lib/format';
import { Button } from '@/components/ui/button';

interface Worker {
  id: string;
  worker_id: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  district: string;
  state: string;
  is_active?: boolean;
}

interface WorkerSearchProps {
  workers: Worker[];
  onFilter: (filtered: Worker[]) => void;
  placeholder?: string;
}

export function WorkerSearch({ workers, onFilter, placeholder = "Search by ID, name, or phone..." }: WorkerSearchProps) {
  const [search, setSearch] = useState('');

  const handleSearch = (value: string) => {
    setSearch(value);

    if (!value.trim()) {
      onFilter(workers);
      return;
    }

    const searchLower = value.toLowerCase();
    const filtered = workers.filter(w =>
      w.worker_id.toLowerCase().includes(searchLower) ||
      w.first_name.toLowerCase().includes(searchLower) ||
      w.last_name.toLowerCase().includes(searchLower) ||
      `${w.first_name} ${w.last_name}`.toLowerCase().includes(searchLower) ||
      (w.phone && w.phone.includes(value))
    );

    onFilter(filtered);
  };

  const clearSearch = () => {
    setSearch('');
    onFilter(workers);
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        className="pl-10 pr-10"
      />
      {search && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
          onClick={clearSearch}
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

interface WorkerSearchResultProps {
  worker: Worker;
  action?: React.ReactNode;
}

export function WorkerSearchResult({ worker, action }: WorkerSearchResultProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {worker.first_name} {worker.last_name}
          </span>
          <Badge variant="outline" className="font-mono text-xs">
            {formatWorkerId(worker.worker_id)}
          </Badge>
          {worker.is_active !== undefined && (
            <Badge variant={worker.is_active ? 'default' : 'secondary'}>
              {worker.is_active ? 'Active' : 'Inactive'}
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1">
          {worker.phone && <span>{worker.phone}</span>}
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {worker.district}, {worker.state}
          </span>
        </div>
      </div>
      {action}
    </div>
  );
}

export function useWorkerFilter<T extends Worker>(workers: T[] | undefined) {
  const [filteredWorkers, setFilteredWorkers] = useState<T[]>([]);
  const [hasActiveFilter, setHasActiveFilter] = useState(false);

  const handleFilter = (filtered: Worker[]) => {
    setFilteredWorkers(filtered as T[]);
    setHasActiveFilter(true);
  };

  const displayWorkers = hasActiveFilter ? filteredWorkers : (workers || []);

  return {
    displayWorkers,
    handleFilter,
    setHasActiveFilter,
  };
}

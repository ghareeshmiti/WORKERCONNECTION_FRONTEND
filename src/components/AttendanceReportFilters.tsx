import { DateRangePicker, DateRangePresets } from '@/components/DateRangePicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { DateRange } from 'react-day-picker';

interface Worker {
  id: string;
  worker_id: string;
  first_name: string;
  last_name: string;
}

interface Establishment {
  id: string;
  name: string;
  code: string;
}

interface AttendanceReportFiltersProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  establishments?: Establishment[];
  selectedEstablishment?: string;
  onEstablishmentChange?: (id: string | undefined) => void;
  workers?: Worker[];
  selectedWorker?: string;
  onWorkerChange?: (id: string | undefined) => void;
  onExport?: () => void;
  showEstablishmentFilter?: boolean;
}

export function AttendanceReportFilters({
  dateRange,
  onDateRangeChange,
  establishments,
  selectedEstablishment,
  onEstablishmentChange,
  workers,
  selectedWorker,
  onWorkerChange,
  onExport,
  showEstablishmentFilter = true,
}: AttendanceReportFiltersProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-4 flex-wrap">
      {/* Date Range */}
      <div className="flex items-center gap-2 flex-wrap">
        <DateRangePicker dateRange={dateRange} onDateRangeChange={onDateRangeChange} />
        <DateRangePresets onSelect={onDateRangeChange} />
      </div>

      {/* Establishment Filter */}
      {showEstablishmentFilter && establishments && establishments.length > 0 && (
        <div className="flex items-center gap-2">
          <Select
            value={selectedEstablishment || 'all'}
            onValueChange={(val) => onEstablishmentChange?.(val === 'all' ? undefined : val)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Establishments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Establishments</SelectItem>
              {establishments.map((est) => (
                <SelectItem key={est.id} value={est.id}>
                  {est.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedEstablishment && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEstablishmentChange?.(undefined)}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      {/* Worker Filter */}
      {workers && workers.length > 0 && (
        <div className="flex items-center gap-2">
          <Select
            value={selectedWorker || 'all'}
            onValueChange={(val) => onWorkerChange?.(val === 'all' ? undefined : val)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Workers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Workers</SelectItem>
              {workers.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.first_name} {w.last_name} ({w.worker_id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedWorker && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onWorkerChange?.(undefined)}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      {/* Export Button */}
      {onExport && (
        <Button variant="outline" size="sm" onClick={onExport} className="ml-auto">
          <Download className="w-4 h-4 mr-1" />
          Export CSV
        </Button>
      )}
    </div>
  );
}

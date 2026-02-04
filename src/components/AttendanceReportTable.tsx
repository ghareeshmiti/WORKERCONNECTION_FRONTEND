import { AttendanceReportRow } from '@/hooks/use-attendance-reports';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Clock, LogIn, LogOut } from 'lucide-react';
import { formatWorkerId } from '@/lib/format';

interface AttendanceReportTableProps {
  data: AttendanceReportRow[];
  showEstablishment?: boolean;
  showDepartment?: boolean;
}

export function AttendanceReportTable({
  data,
  showEstablishment = true,
  showDepartment = false
}: AttendanceReportTableProps) {
  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '--';
    return format(new Date(timestamp), 'HH:mm');
  };

  const formatHours = (hours: number | null) => {
    if (hours === null || hours === undefined) return '--';
    return `${hours.toFixed(1)}h`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <Badge className="bg-success text-success-foreground">Present</Badge>;
      case 'PARTIAL':
        return <Badge variant="secondary" className="bg-warning text-warning-foreground">Partial</Badge>;
      case 'ABSENT':
        return <Badge variant="destructive">Absent</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No attendance records found for the selected filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 font-medium">Date</th>
            <th className="text-left py-3 font-medium">Worker ID</th>
            <th className="text-left py-3 font-medium">Worker Name</th>
            {showEstablishment && (
              <th className="text-left py-3 font-medium">Establishment</th>
            )}
            {showDepartment && (
              <th className="text-left py-3 font-medium">Department</th>
            )}
            <th className="text-center py-3 font-medium">
              <span className="flex items-center justify-center gap-1">
                <LogIn className="w-3 h-3" /> Check-in
              </span>
            </th>
            <th className="text-center py-3 font-medium">
              <span className="flex items-center justify-center gap-1">
                <LogOut className="w-3 h-3" /> Check-out
              </span>
            </th>
            <th className="text-center py-3 font-medium">
              <span className="flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" /> Hours
              </span>
            </th>
            <th className="text-center py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-b border-muted hover:bg-muted/30 transition-colors">
              <td className="py-3">{format(new Date(row.date), 'dd MMM yyyy')}</td>
              <td className="py-3 font-mono text-xs">{formatWorkerId(row.workerId)}</td>
              <td className="py-3">{row.workerName}</td>
              {showEstablishment && (
                <td className="py-3">{row.establishmentName}</td>
              )}
              {showDepartment && (
                <td className="py-3">{row.departmentName}</td>
              )}
              <td className="py-3 text-center">{formatTime(row.checkIn)}</td>
              <td className="py-3 text-center">{formatTime(row.checkOut)}</td>
              <td className="py-3 text-center font-medium">{formatHours(row.hoursWorked)}</td>
              <td className="py-3 text-center">{getStatusBadge(row.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

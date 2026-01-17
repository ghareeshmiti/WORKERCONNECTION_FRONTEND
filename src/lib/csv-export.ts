// CSV Export utility functions

export interface CSVColumn<T> {
  key: keyof T | string;
  header: string;
  formatter?: (value: any, row: T) => string;
}

export function generateCSV<T extends Record<string, any>>(
  data: T[],
  columns: CSVColumn<T>[],
  filename: string
): void {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Generate header row
  const headers = columns.map(col => `"${col.header}"`).join(',');

  // Generate data rows
  const rows = data.map(row => {
    return columns.map(col => {
      let value: any;

      // Handle nested keys like "workers.first_name"
      if (typeof col.key === 'string' && col.key.includes('.')) {
        const keys = col.key.split('.');
        value = keys.reduce((obj, key) => obj?.[key], row);
      } else {
        value = row[col.key as keyof T];
      }

      // Apply formatter if provided
      if (col.formatter) {
        value = col.formatter(value, row);
      }

      // Handle null/undefined
      if (value === null || value === undefined) {
        value = '';
      }

      // Escape quotes and wrap in quotes
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    }).join(',');
  });

  // Combine headers and rows
  const csv = [headers, ...rows].join('\n');

  // Create and trigger download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Pre-defined column configurations for common exports

export const workerColumns: CSVColumn<any>[] = [
  { key: 'workers.worker_id', header: 'Worker ID' },
  { key: 'workers.first_name', header: 'First Name' },
  { key: 'workers.last_name', header: 'Last Name' },
  { key: 'workers.father_name', header: 'Father Name' },
  { key: 'workers.mother_name', header: 'Mother Name' },
  { key: 'workers.gender', header: 'Gender' },
  { key: 'workers.dob', header: 'Date of Birth', formatter: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '' },
  { key: 'workers.aadhaar_number', header: 'Aadhaar Number' },
  { key: 'workers.phone', header: 'Phone' },
  { key: 'workers.email', header: 'Email' },
  { key: 'workers.caste', header: 'Caste' },
  { key: 'workers.religion', header: 'Religion' },
  { key: 'workers.marital_status', header: 'Marital Status' },
  { key: 'workers.disability_status', header: 'Disability Status' },
  { key: 'workers.education_level', header: 'Education Level' },
  { key: 'workers.skill_category', header: 'Skill Category' },
  { key: 'workers.address_line', header: 'Address' },
  { key: 'workers.village', header: 'Village' },
  { key: 'workers.mandal', header: 'Mandal' },
  { key: 'workers.district', header: 'District' },
  { key: 'workers.state', header: 'State' },
  { key: 'workers.pincode', header: 'Pincode' },
  { key: 'workers.bank_account_number', header: 'Bank Account' },
  { key: 'workers.ifsc_code', header: 'IFSC Code' },
  { key: 'workers.ration_card_number', header: 'Ration Card' },
  { key: 'workers.esic_number', header: 'ESIC Details' },
  { key: 'workers.pf_number', header: 'EPF Details' },
  { key: 'workers.labor_card_details', header: 'Labor Card' },
  { key: 'workers.nres_member', header: 'NREGS Member' },
  { key: 'workers.trade_union_member', header: 'Trade Union Member' },
  { key: 'workers.created_at', header: 'Registered On', formatter: (v) => v ? new Date(v).toLocaleString('en-IN') : '' },
  {
    key: 'workers.is_active',
    header: 'Status',
    formatter: (value) => value ? 'Active' : 'Inactive'
  },
];

export const workerWithEstablishmentColumns: CSVColumn<any>[] = [
  ...workerColumns,
  { key: 'establishments.name', header: 'Mapped Establishment' },
  { key: 'establishments.code', header: 'Establishment Code' },
];

export const attendanceColumns: CSVColumn<any>[] = [
  { key: 'attendance_date', header: 'Date' },
  { key: 'status', header: 'Status' },
  {
    key: 'first_checkin_at',
    header: 'Check-in',
    formatter: (value) => value ? new Date(value).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    }) : ''
  },
  {
    key: 'last_checkout_at',
    header: 'Check-out',
    formatter: (value) => value ? new Date(value).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    }) : ''
  },
  {
    key: 'total_hours',
    header: 'Hours',
    formatter: (value) => value ? value.toFixed(2) : ''
  },
  {
    key: 'establishments.name',
    header: 'Establishment',
    formatter: (value) => value || '—'
  },
  {
    key: 'establishments',
    header: 'Location',
    formatter: (value) => {
      if (!value) return '—';
      const parts = [value.district, value.mandal].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : '—';
    }
  },
];

export const establishmentColumns: CSVColumn<any>[] = [
  { key: 'code', header: 'Code' },
  { key: 'name', header: 'Name' },
  { key: 'establishment_type', header: 'Type' },
  { key: 'address_line', header: 'Address' },
  { key: 'village', header: 'Village' },
  { key: 'mandal', header: 'Mandal' },
  { key: 'district', header: 'District' },
  { key: 'state', header: 'State' },
  { key: 'pincode', header: 'Pincode' },
  { key: 'phone', header: 'Phone' },
  { key: 'email', header: 'Email' },
  { key: 'contact_person', header: 'Contact Person' },
  { key: 'gstin', header: 'GSTIN' },
  { key: 'pan', header: 'PAN' },
  { key: 'lin', header: 'LIN' },
  { key: 'created_at', header: 'Registered On', formatter: (v) => v ? new Date(v).toLocaleString('en-IN') : '' },
  {
    key: 'is_active',
    header: 'Status',
    formatter: (value) => value ? 'Active' : 'Inactive'
  },
];

export const attendanceTrendColumns: CSVColumn<any>[] = [
  { key: 'date', header: 'Date' },
  { key: 'present', header: 'Present' },
  { key: 'partial', header: 'Partial' },
  { key: 'absent', header: 'Absent' },
  { key: 'total', header: 'Total' },
  {
    key: 'rate',
    header: 'Attendance Rate (%)',
    formatter: (value) => `${value}%`
  },
];

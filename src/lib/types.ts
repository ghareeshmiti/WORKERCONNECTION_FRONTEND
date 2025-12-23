export type AppRole = 'DEPARTMENT_ADMIN' | 'ESTABLISHMENT_ADMIN' | 'WORKER';

export type AttendanceStatus = 'PRESENT' | 'PARTIAL' | 'ABSENT';

export type AttendanceEventType = 'CHECK_IN' | 'CHECK_OUT';

export interface UserContext {
  authUserId: string;
  role: AppRole;
  workerId?: string;
  establishmentId?: string;
  departmentId?: string;
  fullName?: string;
  email?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  state: string;
  district: string;
  mandal?: string;
  pincode?: string;
  addressLine?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Establishment {
  id: string;
  departmentId: string;
  name: string;
  code: string;
  description?: string;
  establishmentType?: string;
  state: string;
  district: string;
  mandal?: string;
  pincode?: string;
  addressLine?: string;
  phone?: string;
  email?: string;
  licenseNumber?: string;
  constructionType?: string;
  projectName?: string;
  contractorName?: string;
  estimatedWorkers?: number;
  startDate?: string;
  expectedEndDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Worker {
  id: string;
  workerId: string;
  employeeId?: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  email?: string;
  aadhaarLastFour?: string;
  state: string;
  district: string;
  mandal?: string;
  pincode?: string;
  addressLine?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  skills?: string[];
  experienceYears?: number;
  photoUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerMapping {
  id: string;
  workerId: string;
  establishmentId: string;
  mappedAt: string;
  mappedBy?: string;
  unmappedAt?: string;
  unmappedBy?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  authUserId: string;
  fullName?: string;
  avatarUrl?: string;
  workerId?: string;
  establishmentId?: string;
  departmentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceEvent {
  id: string;
  workerId: string;
  eventType: AttendanceEventType;
  occurredAt: string;
  region: string;
  establishmentId?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

export interface AttendanceDailyRollup {
  id: string;
  workerId: string;
  attendanceDate: string;
  firstCheckinAt?: string;
  lastCheckoutAt?: string;
  status: AttendanceStatus;
  establishmentId?: string;
  totalHours?: number;
  createdAt: string;
  updatedAt: string;
}

// Registration form types
export interface WorkerRegistrationData {
  // Identity
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  // Personal
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  aadhaarLastFour?: string;
  // Address
  state: string;
  district: string;
  mandal?: string;
  pincode?: string;
  addressLine?: string;
  // Other
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  skills?: string[];
  experienceYears?: number;
}

export interface EstablishmentRegistrationData {
  // Establishment Details
  name: string;
  code: string;
  description?: string;
  establishmentType?: string;
  email: string;
  password: string;
  phone?: string;
  // Address
  state: string;
  district: string;
  mandal?: string;
  pincode?: string;
  addressLine?: string;
  // Business Details
  licenseNumber?: string;
  departmentId: string;
  // Construction Details
  constructionType?: string;
  projectName?: string;
  contractorName?: string;
  estimatedWorkers?: number;
  startDate?: string;
  expectedEndDate?: string;
}

export interface DepartmentRegistrationData {
  name: string;
  code: string;
  description?: string;
  email: string;
  password: string;
  phone?: string;
  state: string;
  district: string;
  mandal?: string;
  pincode?: string;
  addressLine?: string;
}

// India states list
export const INDIA_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
] as const;

export const INDIA_REGIONS = [
  "North India", "South India", "East India", "West India", "Central India", "Northeast India"
] as const;

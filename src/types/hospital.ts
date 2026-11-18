export type UserRole = 'Admin' | 'Doctor' | 'Receptionist';

export type NavPage =
  | 'dashboard'
  | 'command-centre'
  | 'patients'
  | 'emr'
  | 'emergency'
  | 'doctors'
  | 'appointments'
  | 'queue'
  | 'beds'
  | 'discharge'
  | 'blood-bank'
  | 'insurance'
  | 'billing'
  | 'pharmacy'
  | 'laboratory'
  | 'staff'
  | 'ambulance'
  | 'feedback'
  | 'audit-logs'
  | 'reports'
  | 'notifications'
  | 'settings';

export interface DemoAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department: string;
  title: string;
  avatarUrl?: string;
}

export interface UserSession {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  title: string;
  avatarUrl?: string;
  rememberMe: boolean;
  loginAt: string;
}

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface MedicalRecordEntry {
  id: string;
  date: string;
  title: string;
  doctorName: string;
  department: string;
  notes: string;
}

export interface Patient {
  id: string; // e.g., PAT-2026-0001
  fullName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  email: string;
  address: string;
  bloodGroup: BloodGroup;
  registrationDate: string; // YYYY-MM-DD
  emergencyContact?: string;
  allergies?: string;
  medicalHistory: MedicalRecordEntry[];
}

export type DoctorAvailability = 'Available' | 'In Consultation' | 'On Leave' | 'Off Duty';

export interface Doctor {
  id: string; // e.g., DOC-101
  name: string;
  specialization: string;
  department: string;
  experienceYears: number;
  contact: string;
  email: string;
  consultationFee: number;
  availability: DoctorAvailability;
  avatarUrl?: string;
  scheduleDays: string[];
  shiftHours: string;
}

export type AppointmentStatus = 'Scheduled' | 'Completed' | 'Cancelled' | 'Pending';

export interface Appointment {
  id: string; // e.g., APT-2026-001
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  department: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm (24h, e.g., "09:30")
  reason: string;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
}

export type BedStatus = 'Available' | 'Occupied' | 'Reserved';

export interface Ward {
  id: string; // e.g., WRD-ICU
  name: string;
  floor: string;
  type: 'General' | 'ICU' | 'Cardiology' | 'Pediatrics' | 'Maternity' | 'Surgical';
  dailyRate: number;
}

export interface Bed {
  id: string; // e.g., BED-ICU-01
  bedNumber: string;
  wardId: string;
  wardName: string;
  status: BedStatus;
  patientId?: string;
  patientName?: string;
  admittedDate?: string;
  expectedDischarge?: string;
  notes?: string;
}

export type PaymentStatus = 'Paid' | 'Pending' | 'Partially Paid';

export interface Invoice {
  id: string; // e.g., INV-2026-001
  patientId: string;
  patientName: string;
  date: string;
  dueDate: string;
  consultationCharges: number;
  roomCharges: number;
  labCharges: number;
  medicineCharges: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: 'Card' | 'Insurance' | 'Cash' | 'Bank Transfer';
  notes?: string;
}

export interface Medicine {
  id: string; // e.g., MED-101
  name: string;
  genericName: string;
  category: string;
  manufacturer: string;
  batchNumber: string;
  stock: number;
  reorderLevel: number;
  unitPrice: number;
  expiryDate: string; // YYYY-MM-DD
  unit: string;
}

export type LabTestStatus = 'Requested' | 'Processing' | 'Completed';

export interface LabTest {
  id: string; // e.g., LAB-2026-001
  testName: string;
  category: string;
  patientId: string;
  patientName: string;
  orderedByDoctor: string;
  requestDate: string;
  completedDate?: string;
  status: LabTestStatus;
  resultSummary?: string;
  referenceRange?: string;
  cost: number;
  technician?: string;
}

export type StaffAvailability = 'Available' | 'On Shift' | 'In Break' | 'Off Duty' | 'On Leave';

export interface StaffMember {
  id: string; // e.g., STF-101
  fullName: string;
  role: string;
  department: string;
  shift: 'Morning' | 'Evening' | 'Night';
  phone: string;
  email: string;
  joinDate: string;
  status: 'Active' | 'On Leave';
  availability?: StaffAvailability;
  notes?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  actor: string;
  module: string;
  message: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category:
    | 'Appointment'
    | 'Billing'
    | 'Pharmacy'
    | 'Beds'
    | 'Patients'
    | 'Laboratory'
    | 'Queue'
    | 'Emergency'
    | 'Blood Bank'
    | 'Discharge';
  severity: 'info' | 'warning' | 'critical' | 'success';
  timestamp: string;
  targetPage: NavPage;
  read: boolean;
}

export interface HospitalSettings {
  hospitalName: string;
  registrationCode: string;
  address: string;
  phone: string;
  email: string;
  currencySymbol: string;
  taxRatePercent: number;
  defaultAppointmentDurationMins: number;
  lowStockDefaultThreshold: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

export type QueueStatus = 'Waiting' | 'Consulting' | 'Completed' | 'Cancelled';
export type QueuePriority = 'Standard' | 'Priority' | 'Urgent';

export interface QueueToken {
  id: string; // e.g., QUE-2026-001
  tokenNumber: string; // e.g., T-101
  patientId: string;
  patientName: string;
  department: string;
  doctorId: string;
  doctorName: string;
  priority: QueuePriority;
  status: QueueStatus;
  checkInTime: string; // ISO string
  calledAt?: string; // ISO string
  completedAt?: string; // ISO string
  notes?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO string
  actorName: string;
  actorEmail: string;
  actorRole: UserRole | 'System';
  module: string;
  action: string;
  entityId?: string;
  details: string;
}

export interface EmrDiagnosis {
  id: string;
  patientId: string;
  date: string;
  condition: string;
  icdCode?: string;
  doctorId: string;
  doctorName: string;
  department: string;
  severity: 'Mild' | 'Moderate' | 'Severe';
  status: 'Active' | 'Monitoring' | 'Resolved';
  notes?: string;
}

export interface EmrPrescription {
  id: string;
  patientId: string;
  date: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  prescribedBy: string;
  status: 'Active' | 'Completed';
  instructions?: string;
}

export type EmergencyPriority = 'Critical' | 'High' | 'Moderate' | 'Low';
export type EmergencyTreatmentStatus =
  | 'Triage'
  | 'Under Treatment'
  | 'Stabilized'
  | 'Admitted'
  | 'Discharged';

export interface EmergencyCase {
  id: string; // e.g., EMRG-2026-001
  patientId: string;
  patientName: string;
  arrivalTime: string; // ISO string
  chiefComplaint: string;
  triageVitals?: string;
  priority: EmergencyPriority;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  treatmentStatus: EmergencyTreatmentStatus;
  admittedWard?: string;
  bedId?: string;
  bedNumber?: string;
  notes?: string;
}

export type DischargeDoctorApproval = 'Pending' | 'Approved' | 'Rejected';
export type DischargeWorkflowStatus = 'Requested' | 'Approved' | 'Completed';

export interface DischargeRecord {
  id: string; // e.g., DSC-2026-001
  patientId: string;
  patientName: string;
  bedId?: string;
  bedNumber?: string;
  wardName?: string;
  admittedDate?: string;
  requestDate: string;
  dischargeDate?: string;
  doctorId: string;
  doctorName: string;
  doctorApproval: DischargeDoctorApproval;
  status: DischargeWorkflowStatus;
  consultationFee: number;
  roomDays: number;
  roomRate: number;
  labCharges: number;
  medicineCharges: number;
  discount: number;
  totalAmount: number;
  invoiceId?: string;
  dischargeSummary: string;
  medicationInstructions: string;
  followUpDate?: string;
  followUpDoctor?: string;
  followUpAppointmentId?: string;
}

export interface BloodGroupStock {
  bloodGroup: BloodGroup;
  unitsAvailable: number;
  minThreshold: number;
  lastUpdated: string;
}

export interface BloodDonation {
  id: string; // e.g., BDN-2026-001
  donorName: string;
  donorPhone: string;
  bloodGroup: BloodGroup;
  units: number;
  donationDate: string;
  screeningStatus: 'Cleared' | 'Quarantined' | 'Pending';
  notes?: string;
}

export interface BloodRequest {
  id: string; // e.g., BRQ-2026-001
  patientId: string;
  patientName: string;
  bloodGroup: BloodGroup;
  unitsRequested: number;
  priority: 'Emergency' | 'Urgent' | 'Routine';
  requestedBy: string;
  requestDate: string;
  status: 'Pending' | 'Fulfilled' | 'Cancelled';
  notes?: string;
}

export interface BloodIssueRecord {
  id: string; // e.g., BIS-2026-001
  requestId?: string;
  patientId: string;
  patientName: string;
  bloodGroup: BloodGroup;
  unitsIssued: number;
  issuedDate: string;
  issuedBy: string;
  notes?: string;
}

export interface InsurancePolicy {
  id: string; // e.g., POL-2026-001
  patientId: string;
  patientName: string;
  providerName: string;
  policyNumber: string;
  planName: string;
  coverageLimit: number;
  validUntil: string;
  status: 'Active' | 'Expired' | 'Pending Verification';
}

export type ClaimStatus = 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Paid';

export interface InsuranceClaim {
  id: string; // e.g., CLM-2026-001
  patientId: string;
  patientName: string;
  policyId: string;
  policyNumber: string;
  providerName: string;
  invoiceId?: string;
  submittedDate: string;
  claimAmount: number;
  approvedAmount: number;
  paidAmount: number;
  status: ClaimStatus;
  diagnosisOrReason: string;
  remarks?: string;
}

export interface MedicinePurchase {
  id: string; // e.g., MPH-2026-001
  medicineId: string;
  medicineName: string;
  supplier: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  purchaseDate: string;
  receivedBy: string;
  notes?: string;
}

export interface MedicineIssue {
  id: string; // e.g., MIS-2026-001
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  patientId: string;
  patientName: string;
  quantity: number;
  issuedDate: string;
  prescribedBy: string;
  notes?: string;
}

export type AmbulanceType = 'ALS' | 'BLS' | 'Patient Transport';
export type AmbulanceStatus = 'Available' | 'Dispatched' | 'En Route' | 'On Scene' | 'Maintenance';

export interface Ambulance {
  id: string; // e.g., AMB-101
  vehicleNumber: string;
  plateNumber: string;
  type: AmbulanceType;
  driverName: string;
  driverPhone: string;
  driverLicense: string;
  status: AmbulanceStatus;
  lastServiceDate: string;
}

export type AmbulanceTripPriority = 'Critical' | 'Urgent' | 'Routine';
export type AmbulanceTripStatus = 'Dispatched' | 'En Route' | 'On Scene' | 'Completed' | 'Cancelled';

export interface AmbulanceTrip {
  id: string; // e.g., TRP-2026-001
  ambulanceId: string;
  vehicleNumber: string;
  driverName: string;
  patientName: string;
  patientId?: string;
  emergencyCaseId?: string;
  pickupLocation: string;
  destination: string;
  priority: AmbulanceTripPriority;
  status: AmbulanceTripStatus;
  dispatchTime: string; // ISO string
  completedTime?: string; // ISO string
  notes?: string;
}

export type FeedbackCategory =
  | 'Clinical Care'
  | 'Nursing & Support'
  | 'Front Desk & Queue'
  | 'Pharmacy & Lab'
  | 'Facility & Hygiene';

export interface PatientFeedback {
  id: string; // e.g., FDB-2026-001
  patientId: string;
  patientName: string;
  department: string;
  doctorId?: string;
  doctorName?: string;
  category: FeedbackCategory;
  rating: 1 | 2 | 3 | 4 | 5;
  comments: string;
  submittedDate: string;
}


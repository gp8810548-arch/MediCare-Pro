import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityLog,
  Ambulance,
  AmbulanceTrip,
  AmbulanceTripPriority,
  AmbulanceTripStatus,
  Appointment,
  AppointmentStatus,
  AuditLogEntry,
  Bed,
  BedStatus,
  BloodDonation,
  BloodGroup,
  BloodGroupStock,
  BloodIssueRecord,
  BloodRequest,
  ClaimStatus,
  DischargeRecord,
  Doctor,
  EmergencyCase,
  EmergencyPriority,
  EmergencyTreatmentStatus,
  EmrDiagnosis,
  EmrPrescription,
  HospitalSettings,
  InsuranceClaim,
  InsurancePolicy,
  Invoice,
  LabTest,
  Medicine,
  MedicineIssue,
  MedicinePurchase,
  MedicalRecordEntry,
  NavPage,
  NotificationItem,
  Patient,
  PatientFeedback,
  QueuePriority,
  QueueStatus,
  QueueToken,
  StaffMember,
  ToastMessage,
  UserSession,
  Ward,
} from '../types/hospital';
import { parseQrPayload, QrRecordTarget } from '../utils/qrCode';
import {
  addDaysIso,
  buildHospitalNotifications,
  calculateInvoiceTotal,
  createInitialActivities,
  createInitialAmbulances,
  createInitialAmbulanceTrips,
  createInitialAppointments,
  createInitialAuditLogs,
  createInitialBeds,
  createInitialBloodDonations,
  createInitialBloodInventory,
  createInitialBloodIssues,
  createInitialBloodRequests,
  createInitialDischarges,
  createInitialDoctors,
  createInitialEmergencyCases,
  createInitialEmrDiagnoses,
  createInitialEmrPrescriptions,
  createInitialFeedback,
  createInitialInsuranceClaims,
  createInitialInsurancePolicies,
  createInitialInvoices,
  createInitialLabTests,
  createInitialMedicineIssues,
  createInitialMedicinePurchases,
  createInitialMedicines,
  createInitialPatients,
  createInitialQueueTokens,
  createInitialStaff,
  createInitialWards,
  DEMO_ACCOUNTS,
  detectAppointmentConflict,
  generatePatientId,
  generateSequentialId,
  generateYearSequentialId,
  getTodayIso,
  INITIAL_SETTINGS,
  ROLE_ALLOWED_PAGES,
} from '../services/dataService';
import {
  clearAllHospitalStorage,
  loadFromStorage,
  removeFromStorage,
  saveToStorage,
  STORAGE_KEYS,
} from '../services/storage';

interface HospitalContextValue {
  // Auth & Navigation
  session: UserSession | null;
  activePage: NavPage;
  setActivePage: (page: NavPage) => void;
  allowedPages: NavPage[];
  login: (email: string, password: string, rememberMe: boolean) => { ok: boolean; error?: string };
  loginAsDemoRole: (role: 'Admin' | 'Doctor' | 'Receptionist') => void;
  logout: () => void;

  // Theme & UI
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  qrScannerOpen: boolean;
  setQrScannerOpen: (open: boolean) => void;
  qrTarget: QrRecordTarget | null;
  clearQrTarget: () => void;
  navigateToQrTarget: (target: QrRecordTarget) => void;
  toasts: ToastMessage[];
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;

  // Domain Data
  patients: Patient[];
  doctors: Doctor[];
  appointments: Appointment[];
  wards: Ward[];
  beds: Bed[];
  invoices: Invoice[];
  medicines: Medicine[];
  labTests: LabTest[];
  staff: StaffMember[];
  activities: ActivityLog[];
  auditLogs: AuditLogEntry[];
  queueTokens: QueueToken[];
  emrDiagnoses: EmrDiagnosis[];
  emrPrescriptions: EmrPrescription[];
  emergencyCases: EmergencyCase[];
  discharges: DischargeRecord[];
  bloodInventory: BloodGroupStock[];
  bloodDonations: BloodDonation[];
  bloodRequests: BloodRequest[];
  bloodIssues: BloodIssueRecord[];
  insurancePolicies: InsurancePolicy[];
  insuranceClaims: InsuranceClaim[];
  medicinePurchases: MedicinePurchase[];
  medicineIssues: MedicineIssue[];
  ambulances: Ambulance[];
  ambulanceTrips: AmbulanceTrip[];
  feedbackList: PatientFeedback[];
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  settings: HospitalSettings;

  // Patient Actions
  addPatient: (input: Omit<Patient, 'id' | 'registrationDate' | 'medicalHistory'> & { registrationDate?: string }) => Patient;
  updatePatient: (patient: Patient) => void;
  deletePatient: (id: string) => void;
  addMedicalRecord: (patientId: string, record: Omit<MedicalRecordEntry, 'id'>) => void;

  // Doctor Actions
  addDoctor: (input: Omit<Doctor, 'id'>) => Doctor;
  updateDoctor: (doctor: Doctor) => void;
  deleteDoctor: (id: string) => void;

  // Appointment Actions
  bookAppointment: (input: {
    patientId: string;
    doctorId: string;
    date: string;
    time: string;
    reason: string;
    status?: AppointmentStatus;
    notes?: string;
  }) => { ok: boolean; error?: string; appointment?: Appointment };
  rescheduleAppointment: (
    appointmentId: string,
    date: string,
    time: string,
    doctorId?: string
  ) => { ok: boolean; error?: string };
  updateAppointmentStatus: (appointmentId: string, status: AppointmentStatus) => void;
  deleteAppointment: (appointmentId: string) => void;

  // Bed & Ward Actions
  addWard: (input: Omit<Ward, 'id'>) => Ward;
  addBedToWard: (wardId: string, bedNumber: string) => { ok: boolean; error?: string };
  allocateBed: (params: {
    bedId: string;
    patientId: string;
    status: 'Occupied' | 'Reserved';
    expectedDischarge?: string;
    notes?: string;
  }) => { ok: boolean; error?: string };
  dischargeBed: (bedId: string) => void;
  updateBedStatus: (bedId: string, status: BedStatus) => void;

  // Billing Actions
  createInvoice: (input: {
    patientId: string;
    date: string;
    dueDate: string;
    consultationCharges: number;
    roomCharges: number;
    labCharges: number;
    medicineCharges: number;
    discount: number;
    paidAmount: number;
    paymentMethod?: Invoice['paymentMethod'];
    notes?: string;
  }) => Invoice;
  recordInvoicePayment: (invoiceId: string, paymentAmount: number, method: Invoice['paymentMethod']) => void;
  deleteInvoice: (invoiceId: string) => void;

  // Pharmacy Actions
  addMedicine: (input: Omit<Medicine, 'id'>) => Medicine;
  updateMedicine: (medicine: Medicine) => void;
  deleteMedicine: (id: string) => void;
  recordMedicinePurchase: (input: {
    medicineId: string;
    supplier: string;
    batchNumber: string;
    expiryDate: string;
    quantity: number;
    unitCost: number;
    purchaseDate?: string;
    notes?: string;
  }) => { ok: boolean; error?: string; purchase?: MedicinePurchase };
  issueMedicine: (input: {
    medicineId: string;
    patientId: string;
    quantity: number;
    prescribedBy: string;
    notes?: string;
  }) => { ok: boolean; error?: string; issue?: MedicineIssue };

  // Laboratory Actions
  addLabTest: (input: Omit<LabTest, 'id' | 'patientName'>) => LabTest;
  updateLabTest: (test: LabTest) => void;
  deleteLabTest: (id: string) => void;

  // Staff Actions
  addStaffMember: (input: Omit<StaffMember, 'id'>) => StaffMember;
  updateStaffMember: (member: StaffMember) => void;
  deleteStaffMember: (id: string) => void;

  // Patient Queue Actions
  issueQueueToken: (input: {
    patientId: string;
    doctorId: string;
    department: string;
    priority: QueuePriority;
    notes?: string;
  }) => { ok: boolean; error?: string; token?: QueueToken };
  updateQueueStatus: (tokenId: string, status: QueueStatus) => { ok: boolean; error?: string };
  deleteQueueToken: (tokenId: string) => void;

  // EMR Actions
  addEmrDiagnosis: (input: Omit<EmrDiagnosis, 'id'>) => EmrDiagnosis;
  updateEmrDiagnosisStatus: (id: string, status: EmrDiagnosis['status']) => void;
  addEmrPrescription: (input: Omit<EmrPrescription, 'id'>) => EmrPrescription;
  updateEmrPrescriptionStatus: (id: string, status: EmrPrescription['status']) => void;
  updatePatientAllergies: (patientId: string, allergies: string) => void;

  // Emergency Management Actions
  registerEmergencyCase: (input: {
    patientId: string;
    chiefComplaint: string;
    triageVitals?: string;
    priority: EmergencyPriority;
    assignedDoctorId?: string;
    notes?: string;
  }) => { ok: boolean; error?: string; emergencyCase?: EmergencyCase };
  updateEmergencyCase: (updated: EmergencyCase) => void;
  admitEmergencyToBed: (emergencyId: string, bedId: string) => { ok: boolean; error?: string };
  deleteEmergencyCase: (id: string) => void;

  // Discharge Management Actions
  createDischargeRequest: (input: {
    patientId: string;
    bedId?: string;
    doctorId: string;
    consultationFee: number;
    roomDays: number;
    roomRate: number;
    labCharges: number;
    medicineCharges: number;
    discount: number;
    dischargeSummary: string;
    medicationInstructions: string;
    followUpDate?: string;
    followUpDoctor?: string;
  }) => { ok: boolean; error?: string; discharge?: DischargeRecord };
  updateDischargeApproval: (id: string, decision: 'Approved' | 'Rejected') => { ok: boolean; error?: string };
  finalizeDischarge: (id: string, paymentMethod?: Invoice['paymentMethod'], paidAmount?: number) => { ok: boolean; error?: string; invoice?: Invoice };
  deleteDischargeRecord: (id: string) => void;

  // Blood Bank Management Actions
  recordBloodDonation: (input: Omit<BloodDonation, 'id'>) => BloodDonation;
  updateBloodStockThreshold: (bloodGroup: BloodGroup, minThreshold: number) => void;
  createBloodRequest: (input: {
    patientId: string;
    bloodGroup: BloodGroup;
    unitsRequested: number;
    priority: BloodRequest['priority'];
    requestedBy: string;
    notes?: string;
  }) => { ok: boolean; error?: string; request?: BloodRequest };
  fulfillBloodRequest: (requestId: string, notes?: string) => { ok: boolean; error?: string; issue?: BloodIssueRecord };
  issueBloodUnitsDirect: (input: {
    patientId: string;
    bloodGroup: BloodGroup;
    units: number;
    notes?: string;
  }) => { ok: boolean; error?: string; issue?: BloodIssueRecord };
  cancelBloodRequest: (requestId: string) => void;

  // Insurance Management Actions
  addInsurancePolicy: (input: Omit<InsurancePolicy, 'id' | 'patientName'>) => { ok: boolean; error?: string; policy?: InsurancePolicy };
  updateInsurancePolicy: (policy: InsurancePolicy) => void;
  submitInsuranceClaim: (input: {
    patientId: string;
    policyId: string;
    invoiceId?: string;
    claimAmount: number;
    diagnosisOrReason: string;
    remarks?: string;
  }) => { ok: boolean; error?: string; claim?: InsuranceClaim };
  reviewInsuranceClaim: (
    claimId: string,
    decision: ClaimStatus,
    approvedAmount?: number,
    remarks?: string
  ) => { ok: boolean; error?: string };

  // Ambulance Management Actions
  addAmbulance: (input: Omit<Ambulance, 'id'>) => Ambulance;
  updateAmbulance: (ambulance: Ambulance) => void;
  dispatchAmbulance: (input: {
    ambulanceId: string;
    patientName: string;
    patientId?: string;
    emergencyCaseId?: string;
    pickupLocation: string;
    destination: string;
    priority: AmbulanceTripPriority;
    notes?: string;
  }) => { ok: boolean; error?: string; trip?: AmbulanceTrip };
  updateAmbulanceTripStatus: (tripId: string, status: AmbulanceTripStatus) => { ok: boolean; error?: string };

  // Patient Feedback Actions
  submitFeedback: (input: Omit<PatientFeedback, 'id' | 'patientName' | 'submittedDate'>) => { ok: boolean; error?: string; feedback?: PatientFeedback };
  deleteFeedback: (id: string) => void;

  // Notifications & Settings
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  updateSettings: (next: HospitalSettings) => void;
  resetDemoData: () => void;
}

const HospitalContext = createContext<HospitalContextValue | undefined>(undefined);

export const HospitalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<UserSession | null>(() =>
    loadFromStorage<UserSession | null>(STORAGE_KEYS.SESSION, null)
  );
  const [activePage, setActivePageState] = useState<NavPage>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    loadFromStorage<'light' | 'dark'>(STORAGE_KEYS.THEME, 'light')
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [qrTarget, setQrTarget] = useState<QrRecordTarget | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Persisted Hospital Entities
  const [patients, setPatients] = useState<Patient[]>(() =>
    loadFromStorage(STORAGE_KEYS.PATIENTS, createInitialPatients())
  );
  const [doctors, setDoctors] = useState<Doctor[]>(() =>
    loadFromStorage(STORAGE_KEYS.DOCTORS, createInitialDoctors())
  );
  const [appointments, setAppointments] = useState<Appointment[]>(() =>
    loadFromStorage(STORAGE_KEYS.APPOINTMENTS, createInitialAppointments())
  );
  const [wards, setWards] = useState<Ward[]>(() =>
    loadFromStorage(STORAGE_KEYS.WARDS, createInitialWards())
  );
  const [beds, setBeds] = useState<Bed[]>(() =>
    loadFromStorage(STORAGE_KEYS.BEDS, createInitialBeds())
  );
  const [invoices, setInvoices] = useState<Invoice[]>(() =>
    loadFromStorage(STORAGE_KEYS.INVOICES, createInitialInvoices())
  );
  const [medicines, setMedicines] = useState<Medicine[]>(() =>
    loadFromStorage(STORAGE_KEYS.MEDICINES, createInitialMedicines())
  );
  const [labTests, setLabTests] = useState<LabTest[]>(() =>
    loadFromStorage(STORAGE_KEYS.LAB_TESTS, createInitialLabTests())
  );
  const [staff, setStaff] = useState<StaffMember[]>(() =>
    loadFromStorage(STORAGE_KEYS.STAFF, createInitialStaff())
  );
  const [activities, setActivities] = useState<ActivityLog[]>(() =>
    loadFromStorage(STORAGE_KEYS.ACTIVITIES, createInitialActivities())
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() =>
    loadFromStorage(STORAGE_KEYS.AUDIT_LOGS, createInitialAuditLogs())
  );
  const [queueTokens, setQueueTokens] = useState<QueueToken[]>(() =>
    loadFromStorage(STORAGE_KEYS.QUEUE, createInitialQueueTokens())
  );
  const [emrDiagnoses, setEmrDiagnoses] = useState<EmrDiagnosis[]>(() =>
    loadFromStorage(STORAGE_KEYS.EMR_DIAGNOSES, createInitialEmrDiagnoses())
  );
  const [emrPrescriptions, setEmrPrescriptions] = useState<EmrPrescription[]>(() =>
    loadFromStorage(STORAGE_KEYS.EMR_PRESCRIPTIONS, createInitialEmrPrescriptions())
  );
  const [emergencyCases, setEmergencyCases] = useState<EmergencyCase[]>(() =>
    loadFromStorage(STORAGE_KEYS.EMERGENCY_CASES, createInitialEmergencyCases())
  );
  const [discharges, setDischarges] = useState<DischargeRecord[]>(() =>
    loadFromStorage(STORAGE_KEYS.DISCHARGES, createInitialDischarges())
  );
  const [bloodInventory, setBloodInventory] = useState<BloodGroupStock[]>(() =>
    loadFromStorage(STORAGE_KEYS.BLOOD_INVENTORY, createInitialBloodInventory())
  );
  const [bloodDonations, setBloodDonations] = useState<BloodDonation[]>(() =>
    loadFromStorage(STORAGE_KEYS.BLOOD_DONATIONS, createInitialBloodDonations())
  );
  const [bloodRequests, setBloodRequests] = useState<BloodRequest[]>(() =>
    loadFromStorage(STORAGE_KEYS.BLOOD_REQUESTS, createInitialBloodRequests())
  );
  const [bloodIssues, setBloodIssues] = useState<BloodIssueRecord[]>(() =>
    loadFromStorage(STORAGE_KEYS.BLOOD_ISSUES, createInitialBloodIssues())
  );
  const [insurancePolicies, setInsurancePolicies] = useState<InsurancePolicy[]>(() =>
    loadFromStorage(STORAGE_KEYS.INSURANCE_POLICIES, createInitialInsurancePolicies())
  );
  const [insuranceClaims, setInsuranceClaims] = useState<InsuranceClaim[]>(() =>
    loadFromStorage(STORAGE_KEYS.INSURANCE_CLAIMS, createInitialInsuranceClaims())
  );
  const [medicinePurchases, setMedicinePurchases] = useState<MedicinePurchase[]>(() =>
    loadFromStorage(STORAGE_KEYS.MEDICINE_PURCHASES, createInitialMedicinePurchases())
  );
  const [medicineIssues, setMedicineIssues] = useState<MedicineIssue[]>(() =>
    loadFromStorage(STORAGE_KEYS.MEDICINE_ISSUES, createInitialMedicineIssues())
  );
  const [ambulances, setAmbulances] = useState<Ambulance[]>(() =>
    loadFromStorage(STORAGE_KEYS.AMBULANCES, createInitialAmbulances())
  );
  const [ambulanceTrips, setAmbulanceTrips] = useState<AmbulanceTrip[]>(() =>
    loadFromStorage(STORAGE_KEYS.AMBULANCE_TRIPS, createInitialAmbulanceTrips())
  );
  const [feedbackList, setFeedbackList] = useState<PatientFeedback[]>(() =>
    loadFromStorage(STORAGE_KEYS.FEEDBACK, createInitialFeedback())
  );
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() =>
    loadFromStorage(STORAGE_KEYS.READ_NOTIFICATIONS, [])
  );
  const [settings, setSettings] = useState<HospitalSettings>(() =>
    loadFromStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS)
  );

  // Sync HTML `.dark` class with theme state
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveToStorage(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  // Persist entity updates automatically to LocalStorage
  useEffect(() => saveToStorage(STORAGE_KEYS.PATIENTS, patients), [patients]);
  useEffect(() => saveToStorage(STORAGE_KEYS.DOCTORS, doctors), [doctors]);
  useEffect(() => saveToStorage(STORAGE_KEYS.APPOINTMENTS, appointments), [appointments]);
  useEffect(() => saveToStorage(STORAGE_KEYS.WARDS, wards), [wards]);
  useEffect(() => saveToStorage(STORAGE_KEYS.BEDS, beds), [beds]);
  useEffect(() => saveToStorage(STORAGE_KEYS.INVOICES, invoices), [invoices]);
  useEffect(() => saveToStorage(STORAGE_KEYS.MEDICINES, medicines), [medicines]);
  useEffect(() => saveToStorage(STORAGE_KEYS.LAB_TESTS, labTests), [labTests]);
  useEffect(() => saveToStorage(STORAGE_KEYS.STAFF, staff), [staff]);
  useEffect(() => saveToStorage(STORAGE_KEYS.ACTIVITIES, activities), [activities]);
  useEffect(() => saveToStorage(STORAGE_KEYS.AUDIT_LOGS, auditLogs), [auditLogs]);
  useEffect(() => saveToStorage(STORAGE_KEYS.QUEUE, queueTokens), [queueTokens]);
  useEffect(() => saveToStorage(STORAGE_KEYS.EMR_DIAGNOSES, emrDiagnoses), [emrDiagnoses]);
  useEffect(() => saveToStorage(STORAGE_KEYS.EMR_PRESCRIPTIONS, emrPrescriptions), [emrPrescriptions]);
  useEffect(() => saveToStorage(STORAGE_KEYS.EMERGENCY_CASES, emergencyCases), [emergencyCases]);
  useEffect(() => saveToStorage(STORAGE_KEYS.DISCHARGES, discharges), [discharges]);
  useEffect(() => saveToStorage(STORAGE_KEYS.BLOOD_INVENTORY, bloodInventory), [bloodInventory]);
  useEffect(() => saveToStorage(STORAGE_KEYS.BLOOD_DONATIONS, bloodDonations), [bloodDonations]);
  useEffect(() => saveToStorage(STORAGE_KEYS.BLOOD_REQUESTS, bloodRequests), [bloodRequests]);
  useEffect(() => saveToStorage(STORAGE_KEYS.BLOOD_ISSUES, bloodIssues), [bloodIssues]);
  useEffect(() => saveToStorage(STORAGE_KEYS.INSURANCE_POLICIES, insurancePolicies), [insurancePolicies]);
  useEffect(() => saveToStorage(STORAGE_KEYS.INSURANCE_CLAIMS, insuranceClaims), [insuranceClaims]);
  useEffect(() => saveToStorage(STORAGE_KEYS.MEDICINE_PURCHASES, medicinePurchases), [medicinePurchases]);
  useEffect(() => saveToStorage(STORAGE_KEYS.MEDICINE_ISSUES, medicineIssues), [medicineIssues]);
  useEffect(() => saveToStorage(STORAGE_KEYS.AMBULANCES, ambulances), [ambulances]);
  useEffect(() => saveToStorage(STORAGE_KEYS.AMBULANCE_TRIPS, ambulanceTrips), [ambulanceTrips]);
  useEffect(() => saveToStorage(STORAGE_KEYS.FEEDBACK, feedbackList), [feedbackList]);
  useEffect(() => saveToStorage(STORAGE_KEYS.READ_NOTIFICATIONS, readNotificationIds), [readNotificationIds]);
  useEffect(() => saveToStorage(STORAGE_KEYS.SETTINGS, settings), [settings]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: Omit<ToastMessage, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { ...toast, id }]);
      window.setTimeout(() => {
        dismissToast(id);
      }, 3600);
    },
    [dismissToast]
  );

  const recordAudit = useCallback(
    (
      module: string,
      action: string,
      details: string,
      entityId?: string,
      overrideActor?: { name: string; email: string; role: UserSession['role'] | 'System' }
    ) => {
      const entry: AuditLogEntry = {
        id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        actorName: overrideActor?.name ?? session?.name ?? 'System',
        actorEmail: overrideActor?.email ?? session?.email ?? 'system@medicarepro.demo',
        actorRole: overrideActor?.role ?? session?.role ?? 'System',
        module,
        action,
        entityId,
        details,
      };
      setAuditLogs((prev) => [entry, ...prev].slice(0, 500));
    },
    [session?.name, session?.email, session?.role]
  );

  const logActivity = useCallback(
    (module: string, message: string) => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const entry: ActivityLog = {
        id: `ACT-${Date.now()}`,
        timestamp: `${getTodayIso()} ${hh}:${mm}`,
        actor: session?.name ?? 'System',
        module,
        message,
      };
      setActivities((prev) => [entry, ...prev].slice(0, 30));
    },
    [session?.name]
  );

  const allowedPages = useMemo<NavPage[]>(() => {
    if (!session) return [];
    return ROLE_ALLOWED_PAGES[session.role];
  }, [session]);

  const setActivePage = useCallback(
    (page: NavPage) => {
      if (session && !ROLE_ALLOWED_PAGES[session.role].includes(page)) {
        pushToast({
          type: 'error',
          title: 'Access Restricted',
          description: `${session.role} demo role does not have permission for this module.`,
        });
        return;
      }
      setActivePageState(page);
    },
    [session, pushToast]
  );

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const clearQrTarget = useCallback(() => {
    setQrTarget(null);
  }, []);

  const navigateToQrTarget = useCallback(
    (target: QrRecordTarget) => {
      const targetPage: NavPage = target.type === 'patient' ? 'patients' : 'laboratory';
      if (session && !ROLE_ALLOWED_PAGES[session.role].includes(targetPage)) {
        pushToast({
          type: 'error',
          title: 'Access Restricted',
          description: `${session.role} demo role cannot open ${targetPage} records.`,
        });
        return;
      }
      setQrTarget(target);
      setActivePageState(targetPage);
      setQrScannerOpen(false);
    },
    [session, pushToast]
  );

  // Resolve deep-linked ?qr=PAT:... or ?qr=LAB:... once user is signed in
  useEffect(() => {
    if (!session || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const qrParam = params.get('qr');
    if (!qrParam) return;
    const parsed = parseQrPayload(qrParam);
    params.delete('qr');
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', nextUrl);
    if (parsed) {
      navigateToQrTarget({
        type: parsed.type,
        id: parsed.id,
        action: parsed.type === 'patient' ? 'profile' : 'report',
      });
    }
  }, [session, navigateToQrTarget]);

  // Auth Handlers
  const login = useCallback(
    (email: string, password: string, rememberMe: boolean) => {
      const normalized = email.trim().toLowerCase();
      const account = DEMO_ACCOUNTS.find(
        (acc) => acc.email.toLowerCase() === normalized && acc.password === password
      );
      if (!account) {
        return {
          ok: false,
          error: 'Invalid credentials. Please use one of the demonstration accounts below.',
        };
      }
      const nextSession: UserSession = {
        userId: account.id,
        name: account.name,
        email: account.email,
        role: account.role,
        department: account.department,
        title: account.title,
        avatarUrl: account.avatarUrl,
        rememberMe,
        loginAt: new Date().toISOString(),
      };
      setSession(nextSession);
      if (rememberMe) {
        saveToStorage(STORAGE_KEYS.SESSION, nextSession);
      } else {
        removeFromStorage(STORAGE_KEYS.SESSION);
      }
      setActivePageState('dashboard');
      recordAudit(
        'Authentication',
        'User Login',
        `Signed in under ${account.role} demonstration workspace.`,
        account.id,
        { name: account.name, email: account.email, role: account.role }
      );
      pushToast({
        type: 'success',
        title: `Welcome back, ${account.name}`,
        description: `Signed in under ${account.role} demonstration workspace.`,
      });
      return { ok: true };
    },
    [pushToast, recordAudit]
  );

  const loginAsDemoRole = useCallback(
    (role: 'Admin' | 'Doctor' | 'Receptionist') => {
      const account = DEMO_ACCOUNTS.find((a) => a.role === role);
      if (!account) return;
      login(account.email, account.password, true);
    },
    [login]
  );

  const logout = useCallback(() => {
    if (session) {
      recordAudit(
        'Authentication',
        'User Logout',
        `Signed out from ${session.role} workspace.`,
        session.userId,
        { name: session.name, email: session.email, role: session.role }
      );
    }
    setSession(null);
    removeFromStorage(STORAGE_KEYS.SESSION);
    setActivePageState('dashboard');
  }, [session, recordAudit]);

  // Patient CRUD
  const addPatient = useCallback(
    (input: Omit<Patient, 'id' | 'registrationDate' | 'medicalHistory'> & { registrationDate?: string }) => {
      const newPatient: Patient = {
        ...input,
        id: generatePatientId(patients),
        registrationDate: input.registrationDate || getTodayIso(),
        medicalHistory: [],
      };
      setPatients((prev) => [newPatient, ...prev]);
      logActivity('Patients', `Registered new patient ${newPatient.fullName} (${newPatient.id})`);
      recordAudit('Patients', 'Patient Created', `Registered ${newPatient.fullName}`, newPatient.id);
      pushToast({
        type: 'success',
        title: 'Patient Registered',
        description: `${newPatient.fullName} assigned ID ${newPatient.id}.`,
      });
      return newPatient;
    },
    [patients, logActivity, recordAudit, pushToast]
  );

  const updatePatient = useCallback(
    (updated: Patient) => {
      setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setAppointments((prev) =>
        prev.map((a) => (a.patientId === updated.id ? { ...a, patientName: updated.fullName } : a))
      );
      setBeds((prev) =>
        prev.map((b) => (b.patientId === updated.id ? { ...b, patientName: updated.fullName } : b))
      );
      setInvoices((prev) =>
        prev.map((inv) => (inv.patientId === updated.id ? { ...inv, patientName: updated.fullName } : inv))
      );
      setLabTests((prev) =>
        prev.map((t) => (t.patientId === updated.id ? { ...t, patientName: updated.fullName } : t))
      );
      setQueueTokens((prev) =>
        prev.map((q) => (q.patientId === updated.id ? { ...q, patientName: updated.fullName } : q))
      );
      setBloodRequests((prev) =>
        prev.map((r) => (r.patientId === updated.id ? { ...r, patientName: updated.fullName } : r))
      );
      setBloodIssues((prev) =>
        prev.map((b) => (b.patientId === updated.id ? { ...b, patientName: updated.fullName } : b))
      );
      setInsurancePolicies((prev) =>
        prev.map((pol) => (pol.patientId === updated.id ? { ...pol, patientName: updated.fullName } : pol))
      );
      setInsuranceClaims((prev) =>
        prev.map((clm) => (clm.patientId === updated.id ? { ...clm, patientName: updated.fullName } : clm))
      );
      setMedicineIssues((prev) =>
        prev.map((mi) => (mi.patientId === updated.id ? { ...mi, patientName: updated.fullName } : mi))
      );
      setAmbulanceTrips((prev) =>
        prev.map((tr) => (tr.patientId === updated.id ? { ...tr, patientName: updated.fullName } : tr))
      );
      setFeedbackList((prev) =>
        prev.map((fb) => (fb.patientId === updated.id ? { ...fb, patientName: updated.fullName } : fb))
      );
      logActivity('Patients', `Updated profile for ${updated.fullName} (${updated.id})`);
      recordAudit('Patients', 'Patient Updated', `Updated patient record for ${updated.fullName}`, updated.id);
      pushToast({ type: 'success', title: 'Patient Profile Updated', description: updated.fullName });
    },
    [logActivity, recordAudit, pushToast]
  );

  const deletePatient = useCallback(
    (id: string) => {
      const target = patients.find((p) => p.id === id);
      setPatients((prev) => prev.filter((p) => p.id !== id));
      setBeds((prev) =>
        prev.map((b) =>
          b.patientId === id
            ? {
                ...b,
                status: 'Available',
                patientId: undefined,
                patientName: undefined,
                admittedDate: undefined,
                expectedDischarge: undefined,
                notes: undefined,
              }
            : b
        )
      );
      logActivity('Patients', `Removed patient record ${target?.fullName ?? id}`);
      recordAudit('Patients', 'Patient Deleted', `Removed patient record ${target?.fullName ?? id}`, id);
      pushToast({ type: 'info', title: 'Patient Record Deleted', description: target?.fullName ?? id });
    },
    [patients, logActivity, recordAudit, pushToast]
  );

  const addMedicalRecord = useCallback(
    (patientId: string, record: Omit<MedicalRecordEntry, 'id'>) => {
      const entry: MedicalRecordEntry = { ...record, id: `MH-${Date.now()}` };
      setPatients((prev) =>
        prev.map((p) => (p.id === patientId ? { ...p, medicalHistory: [entry, ...p.medicalHistory] } : p))
      );
      logActivity('Patients', `Added medical history note for ${patientId}`);
      recordAudit('EMR / Patients', 'Medical Note Added', `Added clinical entry "${record.title}"`, patientId);
      pushToast({ type: 'success', title: 'Medical History Added' });
    },
    [logActivity, recordAudit, pushToast]
  );

  // Doctor CRUD
  const addDoctor = useCallback(
    (input: Omit<Doctor, 'id'>) => {
      const newDoc: Doctor = {
        ...input,
        id: generateSequentialId(
          'DOC',
          doctors.map((d) => d.id)
        ),
      };
      setDoctors((prev) => [newDoc, ...prev]);
      logActivity('Doctors', `Added physician ${newDoc.name} (${newDoc.specialization})`);
      recordAudit('Doctors', 'Doctor Added', `Added ${newDoc.name} (${newDoc.department})`, newDoc.id);
      pushToast({ type: 'success', title: 'Doctor Profile Added', description: newDoc.name });
      return newDoc;
    },
    [doctors, logActivity, recordAudit, pushToast]
  );

  const updateDoctor = useCallback(
    (updated: Doctor) => {
      setDoctors((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setAppointments((prev) =>
        prev.map((a) =>
          a.doctorId === updated.id
            ? { ...a, doctorName: updated.name, department: updated.department }
            : a
        )
      );
      logActivity('Doctors', `Updated profile for ${updated.name}`);
      recordAudit('Doctors', 'Doctor Updated', `Updated physician ${updated.name} (${updated.availability})`, updated.id);
      pushToast({ type: 'success', title: 'Doctor Profile Updated', description: updated.name });
    },
    [logActivity, recordAudit, pushToast]
  );

  const deleteDoctor = useCallback(
    (id: string) => {
      const target = doctors.find((d) => d.id === id);
      setDoctors((prev) => prev.filter((d) => d.id !== id));
      logActivity('Doctors', `Removed doctor ${target?.name ?? id}`);
      recordAudit('Doctors', 'Doctor Removed', `Removed physician ${target?.name ?? id}`, id);
      pushToast({ type: 'info', title: 'Doctor Removed', description: target?.name ?? id });
    },
    [doctors, logActivity, recordAudit, pushToast]
  );

  // Appointment CRUD + Conflict Detection
  const bookAppointment = useCallback(
    (input: {
      patientId: string;
      doctorId: string;
      date: string;
      time: string;
      reason: string;
      status?: AppointmentStatus;
      notes?: string;
    }) => {
      const conflict = detectAppointmentConflict(appointments, input.doctorId, input.date, input.time);
      if (conflict) {
        return {
          ok: false,
          error: `Schedule conflict: ${conflict.doctorName} already has an appointment with ${conflict.patientName} on ${conflict.date} at ${conflict.time}.`,
        };
      }
      const patient = patients.find((p) => p.id === input.patientId);
      const doctor = doctors.find((d) => d.id === input.doctorId);
      if (!patient || !doctor) {
        return { ok: false, error: 'Selected patient or doctor record could not be found.' };
      }
      const newApt: Appointment = {
        id: generateYearSequentialId(
          'APT',
          appointments.map((a) => a.id)
        ),
        patientId: patient.id,
        patientName: patient.fullName,
        doctorId: doctor.id,
        doctorName: doctor.name,
        department: doctor.department,
        date: input.date,
        time: input.time,
        reason: input.reason,
        status: input.status ?? 'Scheduled',
        notes: input.notes,
        createdAt: getTodayIso(),
      };
      setAppointments((prev) => [newApt, ...prev]);
      logActivity('Appointments', `Booked ${newApt.id} for ${patient.fullName} with ${doctor.name} (${input.date} ${input.time})`);
      recordAudit(
        'Appointments',
        'Appointment Booked',
        `Scheduled ${newApt.id} for ${patient.fullName} with ${doctor.name} on ${input.date} ${input.time}`,
        newApt.id
      );
      pushToast({
        type: 'success',
        title: 'Appointment Scheduled',
        description: `${patient.fullName} with ${doctor.name} on ${input.date} at ${input.time}.`,
      });
      return { ok: true, appointment: newApt };
    },
    [appointments, patients, doctors, logActivity, recordAudit, pushToast]
  );

  const rescheduleAppointment = useCallback(
    (appointmentId: string, date: string, time: string, doctorId?: string) => {
      const current = appointments.find((a) => a.id === appointmentId);
      if (!current) return { ok: false, error: 'Appointment not found.' };
      const targetDoctorId = doctorId ?? current.doctorId;
      const conflict = detectAppointmentConflict(appointments, targetDoctorId, date, time, appointmentId);
      if (conflict) {
        return {
          ok: false,
          error: `Schedule conflict: ${conflict.doctorName} is already booked on ${date} at ${time} (${conflict.patientName}).`,
        };
      }
      const doc = doctors.find((d) => d.id === targetDoctorId);
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === appointmentId
            ? {
                ...a,
                date,
                time,
                doctorId: targetDoctorId,
                doctorName: doc?.name ?? a.doctorName,
                department: doc?.department ?? a.department,
                status: a.status === 'Cancelled' ? 'Scheduled' : a.status,
              }
            : a
        )
      );
      logActivity('Appointments', `Rescheduled ${appointmentId} to ${date} ${time}`);
      recordAudit(
        'Appointments',
        'Appointment Rescheduled',
        `Rescheduled ${appointmentId} (${current.patientName}) to ${date} ${time}`,
        appointmentId
      );
      pushToast({ type: 'success', title: 'Appointment Rescheduled', description: `${date} at ${time}` });
      return { ok: true };
    },
    [appointments, doctors, logActivity, recordAudit, pushToast]
  );

  const updateAppointmentStatus = useCallback(
    (appointmentId: string, status: AppointmentStatus) => {
      setAppointments((prev) => prev.map((a) => (a.id === appointmentId ? { ...a, status } : a)));
      logActivity('Appointments', `Marked ${appointmentId} as ${status}`);
      recordAudit('Appointments', 'Appointment Status Updated', `Marked ${appointmentId} as ${status}`, appointmentId);
      pushToast({ type: 'info', title: `Appointment ${status}`, description: appointmentId });
    },
    [logActivity, recordAudit, pushToast]
  );

  const deleteAppointment = useCallback(
    (appointmentId: string) => {
      setAppointments((prev) => prev.filter((a) => a.id !== appointmentId));
      logActivity('Appointments', `Deleted appointment ${appointmentId}`);
      recordAudit('Appointments', 'Appointment Deleted', `Deleted appointment ${appointmentId}`, appointmentId);
      pushToast({ type: 'info', title: 'Appointment Deleted', description: appointmentId });
    },
    [logActivity, recordAudit, pushToast]
  );

  // Bed & Ward CRUD
  const addWard = useCallback(
    (input: Omit<Ward, 'id'>) => {
      const newWard: Ward = {
        ...input,
        id: `WRD-${input.type.slice(0, 3).toUpperCase()}-${String(wards.length + 1).padStart(2, '0')}`,
      };
      setWards((prev) => [...prev, newWard]);
      logActivity('Beds & Wards', `Created ward ${newWard.name}`);
      recordAudit('Beds & Wards', 'Ward Created', `Created ward ${newWard.name} (${newWard.floor})`, newWard.id);
      pushToast({ type: 'success', title: 'Ward Added', description: newWard.name });
      return newWard;
    },
    [wards.length, logActivity, recordAudit, pushToast]
  );

  const addBedToWard = useCallback(
    (wardId: string, bedNumber: string) => {
      const ward = wards.find((w) => w.id === wardId);
      if (!ward) return { ok: false, error: 'Selected ward does not exist.' };
      const duplicate = beds.some(
        (b) => b.bedNumber.trim().toLowerCase() === bedNumber.trim().toLowerCase()
      );
      if (duplicate) {
        return { ok: false, error: `Bed number "${bedNumber}" already exists.` };
      }
      const newBed: Bed = {
        id: `BED-${Date.now()}`,
        bedNumber: bedNumber.trim(),
        wardId: ward.id,
        wardName: ward.name,
        status: 'Available',
      };
      setBeds((prev) => [...prev, newBed]);
      logActivity('Beds & Wards', `Added bed ${newBed.bedNumber} to ${ward.name}`);
      recordAudit('Beds & Wards', 'Bed Added', `Added bed ${newBed.bedNumber} to ${ward.name}`, newBed.id);
      pushToast({ type: 'success', title: 'Bed Added', description: `${newBed.bedNumber} in ${ward.name}` });
      return { ok: true };
    },
    [wards, beds, logActivity, recordAudit, pushToast]
  );

  const allocateBed = useCallback(
    (params: {
      bedId: string;
      patientId: string;
      status: 'Occupied' | 'Reserved';
      expectedDischarge?: string;
      notes?: string;
    }) => {
      const targetBed = beds.find((b) => b.id === params.bedId);
      if (!targetBed) return { ok: false, error: 'Bed not found.' };
      if (targetBed.status === 'Occupied') {
        return { ok: false, error: `Bed ${targetBed.bedNumber} is already occupied by ${targetBed.patientName}.` };
      }
      // Prevent duplicate bed allocation to the same patient
      const existingPatientBed = beds.find(
        (b) => b.id !== params.bedId && b.patientId === params.patientId && (b.status === 'Occupied' || b.status === 'Reserved')
      );
      if (existingPatientBed) {
        return {
          ok: false,
          error: `Duplicate allocation blocked: ${existingPatientBed.patientName} is already assigned to bed ${existingPatientBed.bedNumber} (${existingPatientBed.wardName}).`,
        };
      }
      const patient = patients.find((p) => p.id === params.patientId);
      if (!patient) return { ok: false, error: 'Patient not found.' };

      setBeds((prev) =>
        prev.map((b) =>
          b.id === params.bedId
            ? {
                ...b,
                status: params.status,
                patientId: patient.id,
                patientName: patient.fullName,
                admittedDate: getTodayIso(),
                expectedDischarge: params.expectedDischarge || addDaysIso(getTodayIso(), 3),
                notes: params.notes,
              }
            : b
        )
      );
      logActivity('Beds & Wards', `Allocated bed ${targetBed.bedNumber} (${params.status}) to ${patient.fullName}`);
      recordAudit(
        'Beds & Wards',
        'Bed Allocated',
        `Allocated bed ${targetBed.bedNumber} (${params.status}) to ${patient.fullName}`,
        targetBed.id
      );
      pushToast({
        type: 'success',
        title: `Bed ${params.status}`,
        description: `${targetBed.bedNumber} assigned to ${patient.fullName}.`,
      });
      return { ok: true };
    },
    [beds, patients, logActivity, recordAudit, pushToast]
  );

  const dischargeBed = useCallback(
    (bedId: string) => {
      const target = beds.find((b) => b.id === bedId);
      setBeds((prev) =>
        prev.map((b) =>
          b.id === bedId
            ? {
                ...b,
                status: 'Available',
                patientId: undefined,
                patientName: undefined,
                admittedDate: undefined,
                expectedDischarge: undefined,
                notes: undefined,
              }
            : b
        )
      );
      logActivity('Beds & Wards', `Discharged ${target?.patientName ?? 'patient'} from bed ${target?.bedNumber ?? bedId}`);
      recordAudit(
        'Beds & Wards',
        'Bed Released',
        `Released bed ${target?.bedNumber ?? bedId} (${target?.patientName ?? 'patient'})`,
        bedId
      );
      pushToast({
        type: 'success',
        title: 'Bed Discharged',
        description: `Bed ${target?.bedNumber ?? ''} is now Available.`,
      });
    },
    [beds, logActivity, recordAudit, pushToast]
  );

  const updateBedStatus = useCallback(
    (bedId: string, status: BedStatus) => {
      if (status === 'Available') {
        dischargeBed(bedId);
        return;
      }
      setBeds((prev) => prev.map((b) => (b.id === bedId ? { ...b, status } : b)));
      pushToast({ type: 'info', title: 'Bed Status Updated' });
    },
    [dischargeBed, pushToast]
  );

  // Billing CRUD
  const createInvoice = useCallback(
    (input: {
      patientId: string;
      date: string;
      dueDate: string;
      consultationCharges: number;
      roomCharges: number;
      labCharges: number;
      medicineCharges: number;
      discount: number;
      paidAmount: number;
      paymentMethod?: Invoice['paymentMethod'];
      notes?: string;
    }) => {
      const patient = patients.find((p) => p.id === input.patientId);
      const totalAmount = calculateInvoiceTotal(
        input.consultationCharges,
        input.roomCharges,
        input.labCharges,
        input.medicineCharges,
        input.discount
      );
      const paid = Math.min(totalAmount, Math.max(0, Number(input.paidAmount) || 0));
      const paymentStatus: Invoice['paymentStatus'] =
        paid >= totalAmount && totalAmount > 0 ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Pending';

      const newInvoice: Invoice = {
        id: generateYearSequentialId(
          'INV',
          invoices.map((i) => i.id)
        ),
        patientId: input.patientId,
        patientName: patient?.fullName ?? 'Unknown Patient',
        date: input.date || getTodayIso(),
        dueDate: input.dueDate || addDaysIso(getTodayIso(), 14),
        consultationCharges: Number(input.consultationCharges) || 0,
        roomCharges: Number(input.roomCharges) || 0,
        labCharges: Number(input.labCharges) || 0,
        medicineCharges: Number(input.medicineCharges) || 0,
        discount: Number(input.discount) || 0,
        totalAmount,
        paidAmount: paid,
        paymentStatus,
        paymentMethod: input.paymentMethod,
        notes: input.notes,
      };
      setInvoices((prev) => [newInvoice, ...prev]);
      logActivity('Billing', `Generated invoice ${newInvoice.id} for ${newInvoice.patientName} ($${totalAmount.toFixed(2)})`);
      recordAudit(
        'Billing',
        'Invoice Created',
        `Created ${newInvoice.id} for ${newInvoice.patientName} totaling $${totalAmount.toFixed(2)}`,
        newInvoice.id
      );
      pushToast({
        type: 'success',
        title: 'Invoice Generated',
        description: `${newInvoice.id} · ${newInvoice.patientName} ($${totalAmount.toFixed(2)})`,
      });
      return newInvoice;
    },
    [patients, invoices, logActivity, recordAudit, pushToast]
  );

  const recordInvoicePayment = useCallback(
    (invoiceId: string, paymentAmount: number, method: Invoice['paymentMethod']) => {
      setInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id !== invoiceId) return inv;
          const nextPaid = Math.min(inv.totalAmount, inv.paidAmount + Math.max(0, paymentAmount));
          const nextStatus: Invoice['paymentStatus'] =
            nextPaid >= inv.totalAmount ? 'Paid' : nextPaid > 0 ? 'Partially Paid' : 'Pending';
          return {
            ...inv,
            paidAmount: nextPaid,
            paymentStatus: nextStatus,
            paymentMethod: method ?? inv.paymentMethod,
          };
        })
      );
      logActivity('Billing', `Recorded payment of $${paymentAmount.toFixed(2)} on ${invoiceId}`);
      recordAudit(
        'Billing',
        'Payment Recorded',
        `Recorded $${paymentAmount.toFixed(2)} via ${method ?? 'Default'} on invoice ${invoiceId}`,
        invoiceId
      );
      pushToast({ type: 'success', title: 'Payment Recorded', description: `${invoiceId} updated.` });
    },
    [logActivity, recordAudit, pushToast]
  );

  const deleteInvoice = useCallback(
    (invoiceId: string) => {
      setInvoices((prev) => prev.filter((i) => i.id !== invoiceId));
      logActivity('Billing', `Removed invoice ${invoiceId}`);
      recordAudit('Billing', 'Invoice Deleted', `Deleted invoice ${invoiceId}`, invoiceId);
      pushToast({ type: 'info', title: 'Invoice Deleted', description: invoiceId });
    },
    [logActivity, recordAudit, pushToast]
  );

  // Pharmacy CRUD
  const addMedicine = useCallback(
    (input: Omit<Medicine, 'id'>) => {
      const med: Medicine = {
        ...input,
        id: generateSequentialId(
          'MED',
          medicines.map((m) => m.id)
        ),
      };
      setMedicines((prev) => [med, ...prev]);
      logActivity('Pharmacy', `Added ${med.name} (${med.stock} ${med.unit}) to inventory`);
      recordAudit('Pharmacy', 'Medicine Stock Added', `Added ${med.name} · Qty ${med.stock} ${med.unit}`, med.id);
      pushToast({ type: 'success', title: 'Medicine Added', description: med.name });
      return med;
    },
    [medicines, logActivity, recordAudit, pushToast]
  );

  const updateMedicine = useCallback(
    (updated: Medicine) => {
      setMedicines((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      logActivity('Pharmacy', `Updated stock/details for ${updated.name}`);
      recordAudit(
        'Pharmacy',
        'Medicine Stock Updated',
        `Updated ${updated.name} (Stock: ${updated.stock} ${updated.unit}, Batch: ${updated.batchNumber})`,
        updated.id
      );
      pushToast({ type: 'success', title: 'Medicine Updated', description: updated.name });
    },
    [logActivity, recordAudit, pushToast]
  );

  const deleteMedicine = useCallback(
    (id: string) => {
      const target = medicines.find((m) => m.id === id);
      setMedicines((prev) => prev.filter((m) => m.id !== id));
      logActivity('Pharmacy', `Removed ${target?.name ?? id} from pharmacy inventory`);
      recordAudit('Pharmacy', 'Medicine Removed', `Removed ${target?.name ?? id} from inventory`, id);
      pushToast({ type: 'info', title: 'Medicine Removed', description: target?.name ?? id });
    },
    [medicines, logActivity, recordAudit, pushToast]
  );

  // Laboratory CRUD
  const addLabTest = useCallback(
    (input: Omit<LabTest, 'id' | 'patientName'>) => {
      const patient = patients.find((p) => p.id === input.patientId);
      const test: LabTest = {
        ...input,
        id: generateYearSequentialId(
          'LAB',
          labTests.map((t) => t.id)
        ),
        patientName: patient?.fullName ?? 'Unknown Patient',
      };
      setLabTests((prev) => [test, ...prev]);
      logActivity('Laboratory', `Ordered ${test.testName} (${test.id}) for ${test.patientName}`);
      recordAudit('Laboratory', 'Lab Test Ordered', `Ordered ${test.testName} for ${test.patientName}`, test.id);
      pushToast({ type: 'success', title: 'Lab Test Ordered', description: `${test.testName} · ${test.patientName}` });
      return test;
    },
    [patients, labTests, logActivity, recordAudit, pushToast]
  );

  const updateLabTest = useCallback(
    (updated: LabTest) => {
      setLabTests((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      logActivity('Laboratory', `Updated ${updated.testName} (${updated.id}) → ${updated.status}`);
      recordAudit('Laboratory', 'Lab Test Updated', `Updated ${updated.testName} → ${updated.status}`, updated.id);
      pushToast({ type: 'success', title: 'Lab Record Updated', description: `${updated.id} · ${updated.status}` });
    },
    [logActivity, recordAudit, pushToast]
  );

  const deleteLabTest = useCallback(
    (id: string) => {
      setLabTests((prev) => prev.filter((t) => t.id !== id));
      logActivity('Laboratory', `Deleted lab test ${id}`);
      recordAudit('Laboratory', 'Lab Test Deleted', `Deleted lab test ${id}`, id);
      pushToast({ type: 'info', title: 'Lab Record Deleted', description: id });
    },
    [logActivity, recordAudit, pushToast]
  );

  // Staff CRUD
  const addStaffMember = useCallback(
    (input: Omit<StaffMember, 'id'>) => {
      const member: StaffMember = {
        ...input,
        id: generateSequentialId(
          'STF',
          staff.map((s) => s.id)
        ),
      };
      setStaff((prev) => [member, ...prev]);
      logActivity('Staff', `Added staff member ${member.fullName} (${member.role})`);
      recordAudit('Staff', 'Staff Added', `Added ${member.fullName} (${member.role} · ${member.department})`, member.id);
      pushToast({ type: 'success', title: 'Staff Member Added', description: member.fullName });
      return member;
    },
    [staff, logActivity, recordAudit, pushToast]
  );

  const updateStaffMember = useCallback(
    (updated: StaffMember) => {
      setStaff((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      logActivity('Staff', `Updated record for ${updated.fullName}`);
      recordAudit(
        'Staff',
        'Staff Updated',
        `Updated ${updated.fullName} (${updated.availability ?? updated.status})`,
        updated.id
      );
      pushToast({ type: 'success', title: 'Staff Profile Updated', description: updated.fullName });
    },
    [logActivity, recordAudit, pushToast]
  );

  const deleteStaffMember = useCallback(
    (id: string) => {
      const target = staff.find((s) => s.id === id);
      setStaff((prev) => prev.filter((s) => s.id !== id));
      logActivity('Staff', `Removed staff member ${target?.fullName ?? id}`);
      recordAudit('Staff', 'Staff Removed', `Removed staff member ${target?.fullName ?? id}`, id);
      pushToast({ type: 'info', title: 'Staff Record Removed', description: target?.fullName ?? id });
    },
    [staff, logActivity, recordAudit, pushToast]
  );

  // Patient Queue Management
  const issueQueueToken = useCallback(
    (input: {
      patientId: string;
      doctorId: string;
      department: string;
      priority: QueuePriority;
      notes?: string;
    }) => {
      const patient = patients.find((p) => p.id === input.patientId);
      const doctor = doctors.find((d) => d.id === input.doctorId);
      if (!patient || !doctor) {
        return { ok: false, error: 'Selected patient or doctor record could not be found.' };
      }
      const alreadyActive = queueTokens.find(
        (t) => t.patientId === input.patientId && (t.status === 'Waiting' || t.status === 'Consulting')
      );
      if (alreadyActive) {
        return {
          ok: false,
          error: `${patient.fullName} already holds active queue token ${alreadyActive.tokenNumber} (${alreadyActive.status}).`,
        };
      }
      const nextNum = queueTokens.reduce((max, t) => {
        const match = t.tokenNumber.match(/(\d+)$/);
        const n = match ? parseInt(match[1], 10) : 100;
        return n > max ? n : max;
      }, 100);
      const tokenNumber = `T-${nextNum + 1}`;
      const newToken: QueueToken = {
        id: generateYearSequentialId(
          'QUE',
          queueTokens.map((t) => t.id)
        ),
        tokenNumber,
        patientId: patient.id,
        patientName: patient.fullName,
        department: input.department || doctor.department,
        doctorId: doctor.id,
        doctorName: doctor.name,
        priority: input.priority,
        status: 'Waiting',
        checkInTime: new Date().toISOString(),
        notes: input.notes?.trim() || undefined,
      };
      setQueueTokens((prev) => [newToken, ...prev]);
      logActivity('Queue', `Issued token ${tokenNumber} for ${patient.fullName} (${newToken.department})`);
      recordAudit(
        'Patient Queue',
        'Token Issued',
        `Issued ${tokenNumber} (${input.priority}) for ${patient.fullName} assigned to ${doctor.name}`,
        newToken.id
      );
      pushToast({
        type: 'success',
        title: `Queue Token ${tokenNumber} Issued`,
        description: `${patient.fullName} queued for ${doctor.name}.`,
      });
      return { ok: true, token: newToken };
    },
    [patients, doctors, queueTokens, logActivity, recordAudit, pushToast]
  );

  const updateQueueStatus = useCallback(
    (tokenId: string, status: QueueStatus) => {
      if (!session) {
        return { ok: false, error: 'Authentication required to update queue status.' };
      }
      if (status === 'Completed' && session.role === 'Receptionist') {
        pushToast({
          type: 'error',
          title: 'Permission Restricted',
          description: 'Only Doctors or Administrators can mark a consultation as Completed.',
        });
        return { ok: false, error: 'Only Doctors or Administrators can complete consultations.' };
      }
      const target = queueTokens.find((t) => t.id === tokenId);
      if (!target) {
        return { ok: false, error: 'Queue token not found.' };
      }
      const nowIso = new Date().toISOString();
      setQueueTokens((prev) =>
        prev.map((t) => {
          if (t.id !== tokenId) return t;
          return {
            ...t,
            status,
            calledAt: status === 'Consulting' ? t.calledAt || nowIso : t.calledAt,
            completedAt: status === 'Completed' ? nowIso : t.completedAt,
          };
        })
      );
      logActivity('Queue', `Updated token ${target.tokenNumber} (${target.patientName}) → ${status}`);
      recordAudit(
        'Patient Queue',
        'Queue Status Changed',
        `Token ${target.tokenNumber} for ${target.patientName} changed from ${target.status} to ${status}`,
        target.id
      );
      pushToast({
        type: 'info',
        title: `Token ${target.tokenNumber} · ${status}`,
        description: target.patientName,
      });
      return { ok: true };
    },
    [session, queueTokens, logActivity, recordAudit, pushToast]
  );

  const deleteQueueToken = useCallback(
    (tokenId: string) => {
      const target = queueTokens.find((t) => t.id === tokenId);
      setQueueTokens((prev) => prev.filter((t) => t.id !== tokenId));
      logActivity('Queue', `Removed queue token ${target?.tokenNumber ?? tokenId}`);
      recordAudit('Patient Queue', 'Token Removed', `Removed queue token ${target?.tokenNumber ?? tokenId}`, tokenId);
      pushToast({ type: 'info', title: 'Queue Entry Removed', description: target?.tokenNumber ?? tokenId });
    },
    [queueTokens, logActivity, recordAudit, pushToast]
  );

  // EMR Actions
  const addEmrDiagnosis = useCallback(
    (input: Omit<EmrDiagnosis, 'id'>) => {
      const dx: EmrDiagnosis = {
        ...input,
        id: generateYearSequentialId(
          'DX',
          emrDiagnoses.map((d) => d.id)
        ),
      };
      setEmrDiagnoses((prev) => [dx, ...prev]);
      logActivity('EMR', `Recorded diagnosis "${dx.condition}" for ${dx.patientId}`);
      recordAudit('EMR', 'Diagnosis Recorded', `Recorded "${dx.condition}" (${dx.severity})`, dx.patientId);
      pushToast({ type: 'success', title: 'Diagnosis Added to EMR', description: dx.condition });
      return dx;
    },
    [emrDiagnoses, logActivity, recordAudit, pushToast]
  );

  const updateEmrDiagnosisStatus = useCallback(
    (id: string, status: EmrDiagnosis['status']) => {
      const target = emrDiagnoses.find((d) => d.id === id);
      setEmrDiagnoses((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
      recordAudit('EMR', 'Diagnosis Status Updated', `Updated diagnosis ${id} → ${status}`, target?.patientId);
      pushToast({ type: 'info', title: `Diagnosis ${status}` });
    },
    [emrDiagnoses, recordAudit, pushToast]
  );

  const addEmrPrescription = useCallback(
    (input: Omit<EmrPrescription, 'id'>) => {
      const rx: EmrPrescription = {
        ...input,
        id: generateYearSequentialId(
          'RX',
          emrPrescriptions.map((p) => p.id)
        ),
      };
      setEmrPrescriptions((prev) => [rx, ...prev]);
      logActivity('EMR', `Added prescription ${rx.medicationName} for ${rx.patientId}`);
      recordAudit('EMR', 'Prescription Recorded', `Added ${rx.medicationName} (${rx.dosage})`, rx.patientId);
      pushToast({ type: 'success', title: 'Prescription Saved to EMR', description: rx.medicationName });
      return rx;
    },
    [emrPrescriptions, logActivity, recordAudit, pushToast]
  );

  const updateEmrPrescriptionStatus = useCallback(
    (id: string, status: EmrPrescription['status']) => {
      const target = emrPrescriptions.find((p) => p.id === id);
      setEmrPrescriptions((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
      recordAudit('EMR', 'Prescription Status Updated', `Updated prescription ${id} → ${status}`, target?.patientId);
      pushToast({ type: 'info', title: `Prescription ${status}` });
    },
    [emrPrescriptions, recordAudit, pushToast]
  );

  const updatePatientAllergies = useCallback(
    (patientId: string, allergies: string) => {
      setPatients((prev) => prev.map((p) => (p.id === patientId ? { ...p, allergies: allergies.trim() } : p)));
      recordAudit('EMR', 'Allergies Updated', `Updated allergy alerts for ${patientId}: ${allergies || 'None reported'}`, patientId);
      pushToast({ type: 'success', title: 'Patient Allergies Updated' });
    },
    [recordAudit, pushToast]
  );

  // Emergency Management Actions
  const registerEmergencyCase = useCallback(
    (input: {
      patientId: string;
      chiefComplaint: string;
      triageVitals?: string;
      priority: EmergencyPriority;
      assignedDoctorId?: string;
      notes?: string;
    }) => {
      const patient = patients.find((p) => p.id === input.patientId);
      if (!patient) {
        return { ok: false, error: 'Selected patient could not be found.' };
      }
      const doc = input.assignedDoctorId
        ? doctors.find((d) => d.id === input.assignedDoctorId)
        : undefined;
      const newCase: EmergencyCase = {
        id: generateYearSequentialId(
          'EMRG',
          emergencyCases.map((e) => e.id)
        ),
        patientId: patient.id,
        patientName: patient.fullName,
        arrivalTime: new Date().toISOString(),
        chiefComplaint: input.chiefComplaint.trim(),
        triageVitals: input.triageVitals?.trim() || undefined,
        priority: input.priority,
        assignedDoctorId: doc?.id,
        assignedDoctorName: doc?.name,
        treatmentStatus: doc ? 'Under Treatment' : 'Triage',
        notes: input.notes?.trim() || undefined,
      };
      setEmergencyCases((prev) => [newCase, ...prev]);
      logActivity(
        'Emergency',
        `Registered ${input.priority} emergency case ${newCase.id} for ${patient.fullName}${
          doc ? ` (${doc.name})` : ''
        }`
      );
      recordAudit(
        'Emergency',
        'Emergency Case Registered',
        `Registered ${newCase.id} (${input.priority}) for ${patient.fullName}${
          doc ? ` assigned to ${doc.name}` : ''
        }`,
        newCase.id
      );
      pushToast({
        type: input.priority === 'Critical' ? 'error' : 'info',
        title: `Emergency Case ${newCase.id}`,
        description: `${patient.fullName} · ${input.priority} priority.`,
      });
      return { ok: true, emergencyCase: newCase };
    },
    [patients, doctors, emergencyCases, logActivity, recordAudit, pushToast]
  );

  const updateEmergencyCase = useCallback(
    (updated: EmergencyCase) => {
      const prev = emergencyCases.find((e) => e.id === updated.id);
      setEmergencyCases((list) => list.map((e) => (e.id === updated.id ? updated : e)));
      logActivity(
        'Emergency',
        `Updated emergency ${updated.id} (${updated.patientName}) → ${updated.treatmentStatus}`
      );
      if (prev?.assignedDoctorId !== updated.assignedDoctorId && updated.assignedDoctorName) {
        recordAudit(
          'Emergency',
          'Emergency Doctor Assigned',
          `Assigned ${updated.assignedDoctorName} to ${updated.id} (${updated.patientName})`,
          updated.id
        );
      } else {
        recordAudit(
          'Emergency',
          'Emergency Case Updated',
          `Updated ${updated.id} → ${updated.treatmentStatus} (${updated.priority})`,
          updated.id
        );
      }
      pushToast({
        type: 'success',
        title: `Emergency ${updated.id} Updated`,
        description: `${updated.treatmentStatus} · ${updated.priority}`,
      });
    },
    [emergencyCases, logActivity, recordAudit, pushToast]
  );

  const admitEmergencyToBed = useCallback(
    (emergencyId: string, bedId: string) => {
      const emrg = emergencyCases.find((e) => e.id === emergencyId);
      const bed = beds.find((b) => b.id === bedId);
      if (!emrg || !bed) {
        return { ok: false, error: 'Emergency case or bed could not be found.' };
      }
      const alloc = allocateBed({
        bedId,
        patientId: emrg.patientId,
        status: 'Occupied',
        notes: `Emergency admission (${emrg.id}): ${emrg.chiefComplaint}`,
      });
      if (!alloc.ok) {
        return alloc;
      }
      setEmergencyCases((prev) =>
        prev.map((e) =>
          e.id === emergencyId
            ? {
                ...e,
                treatmentStatus: 'Admitted' as EmergencyTreatmentStatus,
                bedId: bed.id,
                bedNumber: bed.bedNumber,
                admittedWard: bed.wardName,
              }
            : e
        )
      );
      recordAudit(
        'Emergency',
        'Emergency Patient Admitted',
        `Admitted ${emrg.patientName} (${emrg.id}) to bed ${bed.bedNumber} (${bed.wardName})`,
        emrg.id
      );
      return { ok: true };
    },
    [emergencyCases, beds, allocateBed, recordAudit]
  );

  const deleteEmergencyCase = useCallback(
    (id: string) => {
      setEmergencyCases((prev) => prev.filter((e) => e.id !== id));
      recordAudit('Emergency', 'Emergency Case Removed', `Deleted emergency case ${id}`, id);
      pushToast({ type: 'info', title: 'Emergency Record Deleted', description: id });
    },
    [recordAudit, pushToast]
  );

  // Discharge Management Actions
  const createDischargeRequest = useCallback(
    (input: {
      patientId: string;
      bedId?: string;
      doctorId: string;
      consultationFee: number;
      roomDays: number;
      roomRate: number;
      labCharges: number;
      medicineCharges: number;
      discount: number;
      dischargeSummary: string;
      medicationInstructions: string;
      followUpDate?: string;
      followUpDoctor?: string;
    }) => {
      const patient = patients.find((p) => p.id === input.patientId);
      const doctor = doctors.find((d) => d.id === input.doctorId);
      if (!patient || !doctor) {
        return { ok: false, error: 'Selected patient or attending physician could not be found.' };
      }
      const bed = input.bedId ? beds.find((b) => b.id === input.bedId) : undefined;
      const roomCharges = Math.max(0, input.roomDays) * Math.max(0, input.roomRate);
      const totalAmount = calculateInvoiceTotal(
        input.consultationFee,
        roomCharges,
        input.labCharges,
        input.medicineCharges,
        input.discount
      );
      const record: DischargeRecord = {
        id: generateYearSequentialId(
          'DSC',
          discharges.map((d) => d.id)
        ),
        patientId: patient.id,
        patientName: patient.fullName,
        bedId: bed?.id,
        bedNumber: bed?.bedNumber,
        wardName: bed?.wardName,
        admittedDate: bed?.admittedDate,
        requestDate: getTodayIso(),
        doctorId: doctor.id,
        doctorName: doctor.name,
        doctorApproval: 'Pending',
        status: 'Requested',
        consultationFee: Number(input.consultationFee) || 0,
        roomDays: Number(input.roomDays) || 0,
        roomRate: Number(input.roomRate) || 0,
        labCharges: Number(input.labCharges) || 0,
        medicineCharges: Number(input.medicineCharges) || 0,
        discount: Number(input.discount) || 0,
        totalAmount,
        dischargeSummary: input.dischargeSummary.trim(),
        medicationInstructions: input.medicationInstructions.trim(),
        followUpDate: input.followUpDate || undefined,
        followUpDoctor: input.followUpDoctor || doctor.name,
      };
      setDischarges((prev) => [record, ...prev]);
      logActivity('Discharge', `Created discharge request ${record.id} for ${patient.fullName}`);
      recordAudit('Discharge', 'Discharge Requested', `Initiated ${record.id} for ${patient.fullName}`, record.id);
      pushToast({
        type: 'success',
        title: `Discharge Request ${record.id}`,
        description: `Pending physician approval from ${doctor.name}.`,
      });
      return { ok: true, discharge: record };
    },
    [patients, doctors, beds, discharges, logActivity, recordAudit, pushToast]
  );

  const updateDischargeApproval = useCallback(
    (id: string, decision: 'Approved' | 'Rejected') => {
      if (!session || (session.role !== 'Doctor' && session.role !== 'Admin')) {
        pushToast({
          type: 'error',
          title: 'Permission Restricted',
          description: 'Only Doctors or Administrators can approve or reject medical discharge.',
        });
        return { ok: false, error: 'Physician or Admin permission required.' };
      }
      const target = discharges.find((d) => d.id === id);
      if (!target) return { ok: false, error: 'Discharge record not found.' };

      setDischarges((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                doctorApproval: decision,
                status: decision === 'Approved' ? 'Approved' : 'Requested',
              }
            : d
        )
      );
      logActivity('Discharge', `${decision} discharge ${id} (${target.patientName})`);
      recordAudit('Discharge', `Doctor ${decision}`, `${session.name} marked ${id} as ${decision}`, id);
      pushToast({
        type: decision === 'Approved' ? 'success' : 'info',
        title: `Discharge ${decision}`,
        description: `${id} · ${target.patientName}`,
      });
      return { ok: true };
    },
    [session, discharges, logActivity, recordAudit, pushToast]
  );

  const finalizeDischarge = useCallback(
    (id: string, paymentMethod: Invoice['paymentMethod'] = 'Card', paidAmount?: number) => {
      const target = discharges.find((d) => d.id === id);
      if (!target) return { ok: false, error: 'Discharge record not found.' };
      if (target.doctorApproval !== 'Approved') {
        return { ok: false, error: 'Physician approval is required before finalizing discharge.' };
      }
      if (target.status === 'Completed') {
        return { ok: false, error: 'This discharge has already been finalized.' };
      }

      const roomCharges = target.roomDays * target.roomRate;
      const invoice = createInvoice({
        patientId: target.patientId,
        date: getTodayIso(),
        dueDate: addDaysIso(getTodayIso(), 7),
        consultationCharges: target.consultationFee,
        roomCharges,
        labCharges: target.labCharges,
        medicineCharges: target.medicineCharges,
        discount: target.discount,
        paidAmount: typeof paidAmount === 'number' ? paidAmount : target.totalAmount,
        paymentMethod,
        notes: `Final inpatient discharge settlement (${target.id})`,
      });

      if (target.bedId) {
        dischargeBed(target.bedId);
      }

      const dischargeDate = getTodayIso();
      setDischarges((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                status: 'Completed',
                dischargeDate,
                invoiceId: invoice.id,
              }
            : d
        )
      );

      logActivity('Discharge', `Completed discharge ${id} & generated ${invoice.id}`);
      recordAudit(
        'Discharge',
        'Discharge Finalized',
        `Finalized ${id} for ${target.patientName} · Invoice ${invoice.id} ($${invoice.totalAmount.toFixed(2)})`,
        id
      );
      pushToast({
        type: 'success',
        title: `Patient Discharged · ${target.patientName}`,
        description: `Final invoice ${invoice.id} issued (${invoice.paymentStatus}).`,
      });
      return { ok: true, invoice };
    },
    [discharges, createInvoice, dischargeBed, logActivity, recordAudit, pushToast]
  );

  const deleteDischargeRecord = useCallback(
    (id: string) => {
      setDischarges((prev) => prev.filter((d) => d.id !== id));
      recordAudit('Discharge', 'Discharge Record Deleted', `Removed discharge record ${id}`, id);
      pushToast({ type: 'info', title: 'Discharge Record Removed', description: id });
    },
    [recordAudit, pushToast]
  );

  // Blood Bank Management Actions
  const recordBloodDonation = useCallback(
    (input: Omit<BloodDonation, 'id'>) => {
      const donation: BloodDonation = {
        ...input,
        id: generateYearSequentialId(
          'BDN',
          bloodDonations.map((d) => d.id)
        ),
      };
      setBloodDonations((prev) => [donation, ...prev]);
      if (donation.screeningStatus === 'Cleared' && donation.units > 0) {
        setBloodInventory((prev) =>
          prev.map((item) =>
            item.bloodGroup === donation.bloodGroup
              ? {
                  ...item,
                  unitsAvailable: item.unitsAvailable + donation.units,
                  lastUpdated: donation.donationDate || getTodayIso(),
                }
              : item
          )
        );
      }
      logActivity(
        'Blood Bank',
        `Recorded ${donation.units} unit(s) ${donation.bloodGroup} donation from ${donation.donorName} (${donation.screeningStatus})`
      );
      recordAudit(
        'Blood Bank',
        'Blood Donation Recorded',
        `Recorded ${donation.units} unit(s) ${donation.bloodGroup} from ${donation.donorName} (${donation.screeningStatus})`,
        donation.id
      );
      pushToast({
        type: 'success',
        title: `Donation Logged · ${donation.bloodGroup}`,
        description:
          donation.screeningStatus === 'Cleared'
            ? `+${donation.units} unit(s) added to available blood stock.`
            : `Marked as ${donation.screeningStatus}; stock held.`,
      });
      return donation;
    },
    [bloodDonations, logActivity, recordAudit, pushToast]
  );

  const updateBloodStockThreshold = useCallback(
    (bloodGroup: BloodGroup, minThreshold: number) => {
      const safeThreshold = Math.max(1, Math.round(minThreshold));
      setBloodInventory((prev) =>
        prev.map((item) =>
          item.bloodGroup === bloodGroup
            ? { ...item, minThreshold: safeThreshold, lastUpdated: getTodayIso() }
            : item
        )
      );
      recordAudit(
        'Blood Bank',
        'Threshold Updated',
        `Updated minimum threshold for ${bloodGroup} to ${safeThreshold} units`,
        bloodGroup
      );
      pushToast({
        type: 'success',
        title: `${bloodGroup} Threshold Updated`,
        description: `Minimum stock alert set to ${safeThreshold} units.`,
      });
    },
    [recordAudit, pushToast]
  );

  const createBloodRequest = useCallback(
    (input: {
      patientId: string;
      bloodGroup: BloodGroup;
      unitsRequested: number;
      priority: BloodRequest['priority'];
      requestedBy: string;
      notes?: string;
    }) => {
      const patient = patients.find((p) => p.id === input.patientId);
      if (!patient) {
        return { ok: false, error: 'Selected patient could not be found.' };
      }
      if (input.unitsRequested <= 0) {
        return { ok: false, error: 'Units requested must be at least 1.' };
      }
      const req: BloodRequest = {
        id: generateYearSequentialId(
          'BRQ',
          bloodRequests.map((r) => r.id)
        ),
        patientId: patient.id,
        patientName: patient.fullName,
        bloodGroup: input.bloodGroup,
        unitsRequested: Math.round(input.unitsRequested),
        priority: input.priority,
        requestedBy: input.requestedBy.trim() || session?.name || 'Attending Physician',
        requestDate: getTodayIso(),
        status: 'Pending',
        notes: input.notes?.trim() || undefined,
      };
      setBloodRequests((prev) => [req, ...prev]);
      logActivity(
        'Blood Bank',
        `Created ${req.priority} blood request ${req.id} (${req.bloodGroup} × ${req.unitsRequested}) for ${patient.fullName}`
      );
      recordAudit(
        'Blood Bank',
        'Blood Request Created',
        `Requested ${req.unitsRequested} unit(s) ${req.bloodGroup} for ${patient.fullName}`,
        req.id
      );
      pushToast({
        type: 'success',
        title: `Blood Request ${req.id}`,
        description: `${req.unitsRequested} unit(s) ${req.bloodGroup} for ${patient.fullName}.`,
      });
      return { ok: true, request: req };
    },
    [patients, bloodRequests, session?.name, logActivity, recordAudit, pushToast]
  );

  const fulfillBloodRequest = useCallback(
    (requestId: string, notes?: string) => {
      const req = bloodRequests.find((r) => r.id === requestId);
      if (!req) return { ok: false, error: 'Blood request not found.' };
      if (req.status !== 'Pending') {
        return { ok: false, error: `Request ${req.id} is already ${req.status}.` };
      }
      const stock = bloodInventory.find((b) => b.bloodGroup === req.bloodGroup);
      if (!stock || stock.unitsAvailable < req.unitsRequested) {
        return {
          ok: false,
          error: `Insufficient ${req.bloodGroup} stock (${stock?.unitsAvailable ?? 0} available, ${req.unitsRequested} needed).`,
        };
      }

      const today = getTodayIso();
      setBloodInventory((prev) =>
        prev.map((item) =>
          item.bloodGroup === req.bloodGroup
            ? {
                ...item,
                unitsAvailable: item.unitsAvailable - req.unitsRequested,
                lastUpdated: today,
              }
            : item
        )
      );
      setBloodRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'Fulfilled' } : r))
      );

      const issue: BloodIssueRecord = {
        id: generateYearSequentialId(
          'BIS',
          bloodIssues.map((i) => i.id)
        ),
        requestId: req.id,
        patientId: req.patientId,
        patientName: req.patientName,
        bloodGroup: req.bloodGroup,
        unitsIssued: req.unitsRequested,
        issuedDate: today,
        issuedBy: session?.name ?? 'Blood Bank Staff',
        notes: notes?.trim() || req.notes || 'Cross-matched and released.',
      };
      setBloodIssues((prev) => [issue, ...prev]);

      logActivity(
        'Blood Bank',
        `Issued ${issue.unitsIssued} unit(s) ${issue.bloodGroup} to ${issue.patientName} (${req.id})`
      );
      recordAudit(
        'Blood Bank',
        'Blood Units Issued',
        `Fulfilled ${req.id}: issued ${issue.unitsIssued} unit(s) ${issue.bloodGroup} to ${issue.patientName}`,
        issue.id
      );
      pushToast({
        type: 'success',
        title: `Issued ${issue.unitsIssued} Unit(s) · ${issue.bloodGroup}`,
        description: `Request ${req.id} fulfilled for ${issue.patientName}.`,
      });
      return { ok: true, issue };
    },
    [bloodRequests, bloodInventory, bloodIssues, session?.name, logActivity, recordAudit, pushToast]
  );

  const issueBloodUnitsDirect = useCallback(
    (input: { patientId: string; bloodGroup: BloodGroup; units: number; notes?: string }) => {
      const patient = patients.find((p) => p.id === input.patientId);
      if (!patient) return { ok: false, error: 'Selected patient not found.' };
      if (input.units <= 0) return { ok: false, error: 'Units to issue must be at least 1.' };

      const stock = bloodInventory.find((b) => b.bloodGroup === input.bloodGroup);
      if (!stock || stock.unitsAvailable < input.units) {
        return {
          ok: false,
          error: `Insufficient ${input.bloodGroup} stock (${stock?.unitsAvailable ?? 0} available).`,
        };
      }
      const today = getTodayIso();
      setBloodInventory((prev) =>
        prev.map((item) =>
          item.bloodGroup === input.bloodGroup
            ? { ...item, unitsAvailable: item.unitsAvailable - input.units, lastUpdated: today }
            : item
        )
      );
      const issue: BloodIssueRecord = {
        id: generateYearSequentialId(
          'BIS',
          bloodIssues.map((i) => i.id)
        ),
        patientId: patient.id,
        patientName: patient.fullName,
        bloodGroup: input.bloodGroup,
        unitsIssued: Math.round(input.units),
        issuedDate: today,
        issuedBy: session?.name ?? 'Blood Bank Staff',
        notes: input.notes?.trim() || 'Direct clinical issue.',
      };
      setBloodIssues((prev) => [issue, ...prev]);
      logActivity(
        'Blood Bank',
        `Directly issued ${issue.unitsIssued} unit(s) ${issue.bloodGroup} to ${patient.fullName}`
      );
      recordAudit(
        'Blood Bank',
        'Direct Blood Issue',
        `Issued ${issue.unitsIssued} unit(s) ${issue.bloodGroup} to ${patient.fullName}`,
        issue.id
      );
      pushToast({
        type: 'success',
        title: `Issued ${issue.unitsIssued} Unit(s) · ${issue.bloodGroup}`,
        description: `Released to ${patient.fullName}.`,
      });
      return { ok: true, issue };
    },
    [patients, bloodInventory, bloodIssues, session?.name, logActivity, recordAudit, pushToast]
  );

  const cancelBloodRequest = useCallback(
    (requestId: string) => {
      const target = bloodRequests.find((r) => r.id === requestId);
      setBloodRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'Cancelled' } : r))
      );
      recordAudit('Blood Bank', 'Blood Request Cancelled', `Cancelled blood request ${requestId}`, requestId);
      pushToast({ type: 'info', title: 'Blood Request Cancelled', description: target?.id ?? requestId });
    },
    [bloodRequests, recordAudit, pushToast]
  );

  // Insurance Management Actions
  const addInsurancePolicy = useCallback(
    (input: Omit<InsurancePolicy, 'id' | 'patientName'>) => {
      const patient = patients.find((p) => p.id === input.patientId);
      if (!patient) {
        return { ok: false, error: 'Selected patient could not be found.' };
      }
      const policy: InsurancePolicy = {
        ...input,
        id: generateYearSequentialId(
          'POL',
          insurancePolicies.map((p) => p.id)
        ),
        patientName: patient.fullName,
      };
      setInsurancePolicies((prev) => [policy, ...prev]);
      logActivity('Insurance', `Added policy ${policy.policyNumber} (${policy.providerName}) for ${patient.fullName}`);
      recordAudit(
        'Insurance',
        'Policy Added',
        `Added ${policy.providerName} policy ${policy.policyNumber} for ${patient.fullName}`,
        policy.id
      );
      pushToast({
        type: 'success',
        title: 'Insurance Policy Added',
        description: `${patient.fullName} · ${policy.providerName}`,
      });
      return { ok: true, policy };
    },
    [patients, insurancePolicies, logActivity, recordAudit, pushToast]
  );

  const updateInsurancePolicy = useCallback(
    (updated: InsurancePolicy) => {
      setInsurancePolicies((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      recordAudit(
        'Insurance',
        'Policy Updated',
        `Updated policy ${updated.policyNumber} (${updated.status}) for ${updated.patientName}`,
        updated.id
      );
      pushToast({ type: 'success', title: 'Insurance Policy Updated', description: updated.policyNumber });
    },
    [recordAudit, pushToast]
  );

  const submitInsuranceClaim = useCallback(
    (input: {
      patientId: string;
      policyId: string;
      invoiceId?: string;
      claimAmount: number;
      diagnosisOrReason: string;
      remarks?: string;
    }) => {
      const patient = patients.find((p) => p.id === input.patientId);
      const policy = insurancePolicies.find((p) => p.id === input.policyId);
      if (!patient || !policy) {
        return { ok: false, error: 'Selected patient or insurance policy could not be found.' };
      }
      if (input.claimAmount <= 0) {
        return { ok: false, error: 'Claim amount must be greater than zero.' };
      }
      const claim: InsuranceClaim = {
        id: generateYearSequentialId(
          'CLM',
          insuranceClaims.map((c) => c.id)
        ),
        patientId: patient.id,
        patientName: patient.fullName,
        policyId: policy.id,
        policyNumber: policy.policyNumber,
        providerName: policy.providerName,
        invoiceId: input.invoiceId || undefined,
        submittedDate: getTodayIso(),
        claimAmount: Number(input.claimAmount),
        approvedAmount: 0,
        paidAmount: 0,
        status: 'Submitted',
        diagnosisOrReason: input.diagnosisOrReason.trim(),
        remarks: input.remarks?.trim() || undefined,
      };
      setInsuranceClaims((prev) => [claim, ...prev]);
      logActivity(
        'Insurance',
        `Submitted claim ${claim.id} ($${claim.claimAmount.toFixed(2)}) for ${patient.fullName}`
      );
      recordAudit(
        'Insurance',
        'Claim Submitted',
        `Submitted ${claim.id} ($${claim.claimAmount.toFixed(2)}) under ${policy.providerName}`,
        claim.id
      );
      pushToast({
        type: 'success',
        title: `Claim ${claim.id} Submitted`,
        description: `${patient.fullName} · ${policy.providerName}`,
      });
      return { ok: true, claim };
    },
    [patients, insurancePolicies, insuranceClaims, logActivity, recordAudit, pushToast]
  );

  const reviewInsuranceClaim = useCallback(
    (claimId: string, decision: ClaimStatus, approvedAmount?: number, remarks?: string) => {
      const claim = insuranceClaims.find((c) => c.id === claimId);
      if (!claim) return { ok: false, error: 'Claim record not found.' };

      const targetApproved =
        decision === 'Rejected'
          ? 0
          : typeof approvedAmount === 'number'
          ? approvedAmount
          : claim.approvedAmount > 0
          ? claim.approvedAmount
          : claim.claimAmount;

      if (targetApproved < 0 || targetApproved > claim.claimAmount) {
        return { ok: false, error: 'Approved amount must be between $0 and the claimed amount.' };
      }

      const nextPaid = decision === 'Paid' ? targetApproved : claim.paidAmount;
      const incrementalPayment = Math.max(0, nextPaid - claim.paidAmount);

      setInsuranceClaims((prev) =>
        prev.map((c) =>
          c.id === claimId
            ? {
                ...c,
                status: decision,
                approvedAmount: decision === 'Under Review' ? c.approvedAmount : targetApproved,
                paidAmount: nextPaid,
                remarks: remarks !== undefined ? remarks.trim() : c.remarks,
              }
            : c
        )
      );

      if (decision === 'Paid' && incrementalPayment > 0 && claim.invoiceId) {
        const linkedInv = invoices.find((i) => i.id === claim.invoiceId);
        if (linkedInv && linkedInv.paidAmount < linkedInv.totalAmount) {
          recordInvoicePayment(claim.invoiceId, incrementalPayment, 'Insurance');
        }
      }

      logActivity('Insurance', `Updated claim ${claimId} status → ${decision}`);
      recordAudit(
        'Insurance',
        `Claim ${decision}`,
        `${claim.id} (${claim.patientName}) marked ${decision}${
          decision === 'Approved' || decision === 'Paid' ? ` ($${targetApproved.toFixed(2)})` : ''
        }`,
        claimId
      );
      pushToast({
        type: decision === 'Rejected' ? 'info' : 'success',
        title: `Claim ${claimId} · ${decision}`,
        description: `${claim.patientName} · ${claim.providerName}`,
      });
      return { ok: true };
    },
    [insuranceClaims, invoices, recordInvoicePayment, logActivity, recordAudit, pushToast]
  );

  // Advanced Pharmacy Purchase & Dispense Issue Actions
  const recordMedicinePurchase = useCallback(
    (input: {
      medicineId: string;
      supplier: string;
      batchNumber: string;
      expiryDate: string;
      quantity: number;
      unitCost: number;
      purchaseDate?: string;
      notes?: string;
    }) => {
      const med = medicines.find((m) => m.id === input.medicineId);
      if (!med) return { ok: false, error: 'Selected medicine could not be found.' };
      if (input.quantity <= 0) return { ok: false, error: 'Purchase quantity must be at least 1.' };

      const qty = Math.round(input.quantity);
      const unitCost = Math.max(0, Number(input.unitCost) || 0);
      const purchase: MedicinePurchase = {
        id: generateYearSequentialId(
          'MPH',
          medicinePurchases.map((p) => p.id)
        ),
        medicineId: med.id,
        medicineName: med.name,
        supplier: input.supplier.trim(),
        batchNumber: input.batchNumber.trim() || med.batchNumber,
        expiryDate: input.expiryDate || med.expiryDate,
        quantity: qty,
        unitCost,
        totalCost: Math.round(qty * unitCost * 100) / 100,
        purchaseDate: input.purchaseDate || getTodayIso(),
        receivedBy: session?.name ?? 'Pharmacy Staff',
        notes: input.notes?.trim() || undefined,
      };

      setMedicines((prev) =>
        prev.map((m) =>
          m.id === med.id
            ? {
                ...m,
                stock: m.stock + qty,
                batchNumber: purchase.batchNumber,
                expiryDate: purchase.expiryDate,
              }
            : m
        )
      );
      setMedicinePurchases((prev) => [purchase, ...prev]);

      logActivity('Pharmacy', `Restocked +${qty} ${med.unit} of ${med.name} (${purchase.id})`);
      recordAudit(
        'Pharmacy',
        'Medicine Purchase Recorded',
        `Purchased +${qty} ${med.unit} of ${med.name} from ${purchase.supplier} (Batch ${purchase.batchNumber})`,
        purchase.id
      );
      pushToast({
        type: 'success',
        title: `Stock Restocked · ${med.name}`,
        description: `+${qty} ${med.unit} received (${purchase.id}).`,
      });
      return { ok: true, purchase };
    },
    [medicines, medicinePurchases, session?.name, logActivity, recordAudit, pushToast]
  );

  const issueMedicine = useCallback(
    (input: {
      medicineId: string;
      patientId: string;
      quantity: number;
      prescribedBy: string;
      notes?: string;
    }) => {
      const med = medicines.find((m) => m.id === input.medicineId);
      const patient = patients.find((p) => p.id === input.patientId);
      if (!med || !patient) {
        return { ok: false, error: 'Selected medicine or patient record could not be found.' };
      }
      const qty = Math.round(input.quantity);
      if (qty <= 0) return { ok: false, error: 'Quantity to issue must be at least 1.' };
      if (med.stock < qty) {
        return {
          ok: false,
          error: `Insufficient stock for ${med.name} (${med.stock} ${med.unit} available, ${qty} requested).`,
        };
      }

      const issue: MedicineIssue = {
        id: generateYearSequentialId(
          'MIS',
          medicineIssues.map((i) => i.id)
        ),
        medicineId: med.id,
        medicineName: med.name,
        batchNumber: med.batchNumber,
        patientId: patient.id,
        patientName: patient.fullName,
        quantity: qty,
        issuedDate: getTodayIso(),
        prescribedBy: input.prescribedBy.trim() || session?.name || 'Attending Physician',
        notes: input.notes?.trim() || undefined,
      };

      setMedicines((prev) =>
        prev.map((m) => (m.id === med.id ? { ...m, stock: m.stock - qty } : m))
      );
      setMedicineIssues((prev) => [issue, ...prev]);

      logActivity('Pharmacy', `Dispensed ${qty} ${med.unit} of ${med.name} to ${patient.fullName}`);
      recordAudit(
        'Pharmacy',
        'Medicine Dispensed',
        `Issued ${qty} ${med.unit} of ${med.name} (Batch ${med.batchNumber}) to ${patient.fullName}`,
        issue.id
      );
      pushToast({
        type: 'success',
        title: `Medicine Issued · ${med.name}`,
        description: `${qty} ${med.unit} dispensed to ${patient.fullName}.`,
      });
      return { ok: true, issue };
    },
    [medicines, patients, medicineIssues, session?.name, logActivity, recordAudit, pushToast]
  );

  // Ambulance Fleet & Dispatch Management Actions
  const addAmbulance = useCallback(
    (input: Omit<Ambulance, 'id'>) => {
      const vehicle: Ambulance = {
        ...input,
        id: generateSequentialId(
          'AMB',
          ambulances.map((a) => a.id)
        ),
      };
      setAmbulances((prev) => [vehicle, ...prev]);
      logActivity('Ambulance', `Registered ambulance ${vehicle.vehicleNumber} (${vehicle.type})`);
      recordAudit(
        'Ambulance',
        'Ambulance Registered',
        `Registered ${vehicle.vehicleNumber} (${vehicle.plateNumber}) · Driver ${vehicle.driverName}`,
        vehicle.id
      );
      pushToast({
        type: 'success',
        title: `Ambulance Added · ${vehicle.vehicleNumber}`,
        description: `Driver: ${vehicle.driverName}`,
      });
      return vehicle;
    },
    [ambulances, logActivity, recordAudit, pushToast]
  );

  const updateAmbulance = useCallback(
    (updated: Ambulance) => {
      setAmbulances((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      recordAudit(
        'Ambulance',
        'Ambulance Updated',
        `Updated ${updated.vehicleNumber} (${updated.status}) · Driver ${updated.driverName}`,
        updated.id
      );
      pushToast({
        type: 'success',
        title: `Ambulance ${updated.vehicleNumber} Updated`,
        description: updated.status,
      });
    },
    [recordAudit, pushToast]
  );

  const dispatchAmbulance = useCallback(
    (input: {
      ambulanceId: string;
      patientName: string;
      patientId?: string;
      emergencyCaseId?: string;
      pickupLocation: string;
      destination: string;
      priority: AmbulanceTripPriority;
      notes?: string;
    }) => {
      const vehicle = ambulances.find((a) => a.id === input.ambulanceId);
      if (!vehicle) return { ok: false, error: 'Selected ambulance could not be found.' };
      if (vehicle.status !== 'Available') {
        return { ok: false, error: `${vehicle.vehicleNumber} is currently ${vehicle.status} and cannot be dispatched.` };
      }
      const linkedPat = input.patientId ? patients.find((p) => p.id === input.patientId) : undefined;
      const trip: AmbulanceTrip = {
        id: generateYearSequentialId(
          'TRP',
          ambulanceTrips.map((t) => t.id)
        ),
        ambulanceId: vehicle.id,
        vehicleNumber: vehicle.vehicleNumber,
        driverName: vehicle.driverName,
        patientName: linkedPat?.fullName ?? input.patientName.trim(),
        patientId: linkedPat?.id,
        emergencyCaseId: input.emergencyCaseId || undefined,
        pickupLocation: input.pickupLocation.trim(),
        destination: input.destination.trim() || 'MediCare Pro Emergency Bay',
        priority: input.priority,
        status: 'Dispatched',
        dispatchTime: new Date().toISOString(),
        notes: input.notes?.trim() || undefined,
      };
      setAmbulanceTrips((prev) => [trip, ...prev]);
      setAmbulances((prev) =>
        prev.map((a) => (a.id === vehicle.id ? { ...a, status: 'Dispatched' } : a))
      );

      logActivity(
        'Ambulance',
        `Dispatched ${vehicle.vehicleNumber} (${input.priority}) for ${trip.patientName}`
      );
      recordAudit(
        'Ambulance',
        'Ambulance Dispatched',
        `Dispatched ${vehicle.vehicleNumber} (${trip.id}, ${input.priority}) to ${trip.pickupLocation} for ${trip.patientName}`,
        trip.id
      );
      pushToast({
        type: input.priority === 'Critical' ? 'error' : 'info',
        title: `Dispatched ${vehicle.vehicleNumber}`,
        description: `${trip.patientName} · ${trip.pickupLocation}`,
      });
      return { ok: true, trip };
    },
    [ambulances, patients, ambulanceTrips, logActivity, recordAudit, pushToast]
  );

  const updateAmbulanceTripStatus = useCallback(
    (tripId: string, status: AmbulanceTripStatus) => {
      const trip = ambulanceTrips.find((t) => t.id === tripId);
      if (!trip) return { ok: false, error: 'Ambulance trip record not found.' };

      const nowIso = new Date().toISOString();
      setAmbulanceTrips((prev) =>
        prev.map((t) =>
          t.id === tripId
            ? {
                ...t,
                status,
                completedTime: status === 'Completed' || status === 'Cancelled' ? nowIso : t.completedTime,
              }
            : t
        )
      );

      const nextVehicleStatus =
        status === 'Completed' || status === 'Cancelled' ? 'Available' : status;
      setAmbulances((prev) =>
        prev.map((a) => (a.id === trip.ambulanceId ? { ...a, status: nextVehicleStatus } : a))
      );

      logActivity('Ambulance', `Trip ${trip.id} (${trip.vehicleNumber}) updated → ${status}`);
      recordAudit(
        'Ambulance',
        'Trip Status Updated',
        `Trip ${trip.id} (${trip.vehicleNumber}) changed to ${status}`,
        trip.id
      );
      pushToast({
        type: 'info',
        title: `Trip ${trip.id} · ${status}`,
        description: `${trip.vehicleNumber} is now ${nextVehicleStatus}.`,
      });
      return { ok: true };
    },
    [ambulanceTrips, logActivity, recordAudit, pushToast]
  );

  // Patient Feedback Actions
  const submitFeedback = useCallback(
    (input: Omit<PatientFeedback, 'id' | 'patientName' | 'submittedDate'>) => {
      const patient = patients.find((p) => p.id === input.patientId);
      if (!patient) return { ok: false, error: 'Selected patient could not be found.' };
      if (!input.comments.trim()) return { ok: false, error: 'Feedback comment is required.' };
      const doc = input.doctorId ? doctors.find((d) => d.id === input.doctorId) : undefined;
      const entry: PatientFeedback = {
        id: generateYearSequentialId(
          'FDB',
          feedbackList.map((f) => f.id)
        ),
        patientId: patient.id,
        patientName: patient.fullName,
        department: input.department || doc?.department || 'General Medicine',
        doctorId: doc?.id,
        doctorName: doc?.name ?? input.doctorName,
        category: input.category,
        rating: input.rating,
        comments: input.comments.trim(),
        submittedDate: getTodayIso(),
      };
      setFeedbackList((prev) => [entry, ...prev]);
      logActivity('Patient Feedback', `Logged ${entry.rating}★ feedback (${entry.department}) from ${patient.fullName}`);
      recordAudit(
        'Patient Feedback',
        'Feedback Submitted',
        `Recorded ${entry.rating}★ rating for ${entry.department} (${entry.category})`,
        entry.id
      );
      pushToast({
        type: 'success',
        title: `Feedback Recorded · ${entry.rating}/5 ★`,
        description: `${entry.department} · ${patient.fullName}`,
      });
      return { ok: true, feedback: entry };
    },
    [patients, doctors, feedbackList, logActivity, recordAudit, pushToast]
  );

  const deleteFeedback = useCallback(
    (id: string) => {
      setFeedbackList((prev) => prev.filter((f) => f.id !== id));
      recordAudit('Patient Feedback', 'Feedback Removed', `Deleted feedback entry ${id}`, id);
      pushToast({ type: 'info', title: 'Feedback Entry Removed', description: id });
    },
    [recordAudit, pushToast]
  );

  // Derived Notifications
  const notifications = useMemo(
    () =>
      buildHospitalNotifications({
        appointments,
        invoices,
        medicines,
        beds,
        patients,
        labTests,
        emergencyCases,
        discharges,
        bloodInventory,
        readIds: readNotificationIds,
      }),
    [
      appointments,
      invoices,
      medicines,
      beds,
      patients,
      labTests,
      emergencyCases,
      discharges,
      bloodInventory,
      readNotificationIds,
    ]
  );

  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const markNotificationRead = useCallback((id: string) => {
    setReadNotificationIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setReadNotificationIds(notifications.map((n) => n.id));
    pushToast({ type: 'info', title: 'All notifications marked as read' });
  }, [notifications, pushToast]);

  const updateSettings = useCallback(
    (next: HospitalSettings) => {
      setSettings(next);
      logActivity('Settings', 'Updated hospital administration settings');
      recordAudit('Settings', 'Settings Updated', 'Updated hospital configuration and billing defaults.');
      pushToast({ type: 'success', title: 'Settings Saved' });
    },
    [logActivity, recordAudit, pushToast]
  );

  const resetDemoData = useCallback(() => {
    clearAllHospitalStorage();
    setPatients(createInitialPatients());
    setDoctors(createInitialDoctors());
    setAppointments(createInitialAppointments());
    setWards(createInitialWards());
    setBeds(createInitialBeds());
    setInvoices(createInitialInvoices());
    setMedicines(createInitialMedicines());
    setLabTests(createInitialLabTests());
    setStaff(createInitialStaff());
    setActivities(createInitialActivities());
    setAuditLogs(createInitialAuditLogs());
    setQueueTokens(createInitialQueueTokens());
    setEmrDiagnoses(createInitialEmrDiagnoses());
    setEmrPrescriptions(createInitialEmrPrescriptions());
    setEmergencyCases(createInitialEmergencyCases());
    setDischarges(createInitialDischarges());
    setBloodInventory(createInitialBloodInventory());
    setBloodDonations(createInitialBloodDonations());
    setBloodRequests(createInitialBloodRequests());
    setBloodIssues(createInitialBloodIssues());
    setInsurancePolicies(createInitialInsurancePolicies());
    setInsuranceClaims(createInitialInsuranceClaims());
    setMedicinePurchases(createInitialMedicinePurchases());
    setMedicineIssues(createInitialMedicineIssues());
    setAmbulances(createInitialAmbulances());
    setAmbulanceTrips(createInitialAmbulanceTrips());
    setFeedbackList(createInitialFeedback());
    setReadNotificationIds([]);
    setSettings(INITIAL_SETTINGS);
    pushToast({
      type: 'success',
      title: 'Demonstration Data Reset',
      description: 'All hospital records restored to initial baseline.',
    });
  }, [pushToast]);

  const value: HospitalContextValue = {
    session,
    activePage,
    setActivePage,
    allowedPages,
    login,
    loginAsDemoRole,
    logout,
    theme,
    toggleTheme,
    sidebarCollapsed,
    setSidebarCollapsed,
    qrScannerOpen,
    setQrScannerOpen,
    qrTarget,
    clearQrTarget,
    navigateToQrTarget,
    toasts,
    pushToast,
    dismissToast,
    patients,
    doctors,
    appointments,
    wards,
    beds,
    invoices,
    medicines,
    labTests,
    staff,
    activities,
    auditLogs,
    queueTokens,
    emrDiagnoses,
    emrPrescriptions,
    emergencyCases,
    discharges,
    bloodInventory,
    bloodDonations,
    bloodRequests,
    bloodIssues,
    insurancePolicies,
    insuranceClaims,
    medicinePurchases,
    medicineIssues,
    ambulances,
    ambulanceTrips,
    feedbackList,
    notifications,
    unreadNotificationCount,
    settings,
    addPatient,
    updatePatient,
    deletePatient,
    addMedicalRecord,
    addDoctor,
    updateDoctor,
    deleteDoctor,
    bookAppointment,
    rescheduleAppointment,
    updateAppointmentStatus,
    deleteAppointment,
    addWard,
    addBedToWard,
    allocateBed,
    dischargeBed,
    updateBedStatus,
    createInvoice,
    recordInvoicePayment,
    deleteInvoice,
    addMedicine,
    updateMedicine,
    deleteMedicine,
    recordMedicinePurchase,
    issueMedicine,
    addLabTest,
    updateLabTest,
    deleteLabTest,
    addStaffMember,
    updateStaffMember,
    deleteStaffMember,
    issueQueueToken,
    updateQueueStatus,
    deleteQueueToken,
    addEmrDiagnosis,
    updateEmrDiagnosisStatus,
    addEmrPrescription,
    updateEmrPrescriptionStatus,
    updatePatientAllergies,
    registerEmergencyCase,
    updateEmergencyCase,
    admitEmergencyToBed,
    deleteEmergencyCase,
    createDischargeRequest,
    updateDischargeApproval,
    finalizeDischarge,
    deleteDischargeRecord,
    recordBloodDonation,
    updateBloodStockThreshold,
    createBloodRequest,
    fulfillBloodRequest,
    issueBloodUnitsDirect,
    cancelBloodRequest,
    addInsurancePolicy,
    updateInsurancePolicy,
    submitInsuranceClaim,
    reviewInsuranceClaim,
    addAmbulance,
    updateAmbulance,
    dispatchAmbulance,
    updateAmbulanceTripStatus,
    submitFeedback,
    deleteFeedback,
    markNotificationRead,
    markAllNotificationsRead,
    updateSettings,
    resetDemoData,
  };

  return <HospitalContext.Provider value={value}>{children}</HospitalContext.Provider>;
};

export function useHospital(): HospitalContextValue {
  const ctx = useContext(HospitalContext);
  if (!ctx) {
    throw new Error('useHospital must be used within a HospitalProvider');
  }
  return ctx;
}

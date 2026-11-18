/**
 * MediCare Pro — LocalStorage Persistence Layer
 * ---------------------------------------------------------------------------
 * Organized with clean collection keys so each entity maps 1:1 to a future
 * Supabase PostgreSQL table (e.g., `supabase.from('patients').select('*')`).
 */

export const STORAGE_KEYS = {
  SESSION: 'medicare_pro_session',
  THEME: 'medicare_pro_theme',
  PATIENTS: 'medicare_pro_patients',
  DOCTORS: 'medicare_pro_doctors',
  APPOINTMENTS: 'medicare_pro_appointments',
  WARDS: 'medicare_pro_wards',
  BEDS: 'medicare_pro_beds',
  INVOICES: 'medicare_pro_invoices',
  MEDICINES: 'medicare_pro_medicines',
  LAB_TESTS: 'medicare_pro_lab_tests',
  STAFF: 'medicare_pro_staff',
  ACTIVITIES: 'medicare_pro_activities',
  READ_NOTIFICATIONS: 'medicare_pro_read_notifications',
  SETTINGS: 'medicare_pro_settings',
  QUEUE: 'medicare_pro_queue',
  AUDIT_LOGS: 'medicare_pro_audit_logs',
  EMR_DIAGNOSES: 'medicare_pro_emr_diagnoses',
  EMR_PRESCRIPTIONS: 'medicare_pro_emr_prescriptions',
  EMERGENCY_CASES: 'medicare_pro_emergency_cases',
  DISCHARGES: 'medicare_pro_discharges',
  BLOOD_INVENTORY: 'medicare_pro_blood_inventory',
  BLOOD_DONATIONS: 'medicare_pro_blood_donations',
  BLOOD_REQUESTS: 'medicare_pro_blood_requests',
  BLOOD_ISSUES: 'medicare_pro_blood_issues',
  INSURANCE_POLICIES: 'medicare_pro_insurance_policies',
  INSURANCE_CLAIMS: 'medicare_pro_insurance_claims',
  MEDICINE_PURCHASES: 'medicare_pro_medicine_purchases',
  MEDICINE_ISSUES: 'medicare_pro_medicine_issues',
  AMBULANCES: 'medicare_pro_ambulances',
  AMBULANCE_TRIPS: 'medicare_pro_ambulance_trips',
  FEEDBACK: 'medicare_pro_feedback',
} as const;

export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`[Storage] Failed to parse key "${key}", using fallback.`, error);
    return fallback;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`[Storage] Failed to write key "${key}".`, error);
  }
}

export function removeFromStorage(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error(`[Storage] Failed to remove key "${key}".`, error);
  }
}

export function clearAllHospitalStorage(): void {
  Object.values(STORAGE_KEYS).forEach((key) => {
    if (key !== STORAGE_KEYS.THEME) {
      removeFromStorage(key);
    }
  });
}

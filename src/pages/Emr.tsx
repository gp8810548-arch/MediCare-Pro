import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  FlaskConical,
  Pill,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import { getTodayIso } from '../services/dataService';
import { Modal } from '../components/Modal';
import { PatientQrCode } from '../components/PatientQrCode';

type EmrTab =
  | 'overview'
  | 'diagnoses'
  | 'prescriptions'
  | 'lab-reports'
  | 'appointments'
  | 'doctor-notes';

export const Emr: React.FC = () => {
  const {
    patients,
    doctors,
    appointments,
    labTests,
    emrDiagnoses,
    emrPrescriptions,
    session,
    addEmrDiagnosis,
    updateEmrDiagnosisStatus,
    addEmrPrescription,
    updateEmrPrescriptionStatus,
    updatePatientAllergies,
    addMedicalRecord,
    setActivePage,
  } = useHospital();

  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id ?? '');
  const [activeTab, setActiveTab] = useState<EmrTab>('overview');

  // Allergy editor state
  const [editingAllergies, setEditingAllergies] = useState(false);
  const [allergyDraft, setAllergyDraft] = useState('');

  // Diagnosis modal state
  const [dxModalOpen, setDxModalOpen] = useState(false);
  const [dxCondition, setDxCondition] = useState('');
  const [dxIcd, setDxIcd] = useState('');
  const [dxDoctorId, setDxDoctorId] = useState(doctors[0]?.id ?? '');
  const [dxSeverity, setDxSeverity] = useState<'Mild' | 'Moderate' | 'Severe'>('Moderate');
  const [dxNotes, setDxNotes] = useState('');
  const [dxError, setDxError] = useState('');

  // Prescription modal state
  const [rxModalOpen, setRxModalOpen] = useState(false);
  const [rxMed, setRxMed] = useState('');
  const [rxDosage, setRxDosage] = useState('');
  const [rxFreq, setRxFreq] = useState('');
  const [rxDuration, setRxDuration] = useState('');
  const [rxInstructions, setRxInstructions] = useState('');
  const [rxError, setRxError] = useState('');

  // Doctor note modal state
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDepartment, setNoteDepartment] = useState(session?.department || 'General Medicine');
  const [noteDoctorName, setNoteDoctorName] = useState(
    session?.role === 'Doctor' ? session.name : doctors[0]?.name ?? 'Dr. Evelyn Reed'
  );
  const [noteBody, setNoteBody] = useState('');
  const [noteError, setNoteError] = useState('');

  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.bloodGroup.toLowerCase().includes(q)
    );
  }, [patients, patientSearch]);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId) ?? patients[0] ?? null,
    [patients, selectedPatientId]
  );

  const patientDiagnoses = useMemo(
    () =>
      selectedPatient ? emrDiagnoses.filter((d) => d.patientId === selectedPatient.id) : [],
    [emrDiagnoses, selectedPatient]
  );

  const patientPrescriptions = useMemo(
    () =>
      selectedPatient ? emrPrescriptions.filter((r) => r.patientId === selectedPatient.id) : [],
    [emrPrescriptions, selectedPatient]
  );

  const patientLabTests = useMemo(
    () => (selectedPatient ? labTests.filter((t) => t.patientId === selectedPatient.id) : []),
    [labTests, selectedPatient]
  );

  const patientAppointments = useMemo(
    () =>
      selectedPatient ? appointments.filter((a) => a.patientId === selectedPatient.id) : [],
    [appointments, selectedPatient]
  );

  const startAllergyEdit = () => {
    setAllergyDraft(selectedPatient?.allergies ?? '');
    setEditingAllergies(true);
  };

  const saveAllergies = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    updatePatientAllergies(selectedPatient.id, allergyDraft);
    setEditingAllergies(false);
  };

  const handleAddDiagnosis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    if (!dxCondition.trim()) {
      setDxError('Diagnosis condition name is required.');
      return;
    }
    const doc = doctors.find((d) => d.id === dxDoctorId) ?? doctors[0];
    if (!doc) {
      setDxError('Attending physician is required.');
      return;
    }
    addEmrDiagnosis({
      patientId: selectedPatient.id,
      date: getTodayIso(),
      condition: dxCondition.trim(),
      icdCode: dxIcd.trim() || undefined,
      doctorId: doc.id,
      doctorName: doc.name,
      department: doc.department,
      severity: dxSeverity,
      status: 'Active',
      notes: dxNotes.trim() || undefined,
    });
    setDxModalOpen(false);
    setDxCondition('');
    setDxIcd('');
    setDxNotes('');
    setDxError('');
  };

  const handleAddPrescription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    if (!rxMed.trim() || !rxDosage.trim() || !rxFreq.trim() || !rxDuration.trim()) {
      setRxError('Medication, dosage, frequency, and duration are required.');
      return;
    }
    addEmrPrescription({
      patientId: selectedPatient.id,
      date: getTodayIso(),
      medicationName: rxMed.trim(),
      dosage: rxDosage.trim(),
      frequency: rxFreq.trim(),
      duration: rxDuration.trim(),
      prescribedBy: session?.name ?? 'Attending Physician',
      status: 'Active',
      instructions: rxInstructions.trim() || undefined,
    });
    setRxModalOpen(false);
    setRxMed('');
    setRxDosage('');
    setRxFreq('');
    setRxDuration('');
    setRxInstructions('');
    setRxError('');
  };

  const handleAddDoctorNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    if (!noteTitle.trim() || !noteBody.trim()) {
      setNoteError('Note title and clinical summary text are required.');
      return;
    }
    addMedicalRecord(selectedPatient.id, {
      date: getTodayIso(),
      title: noteTitle.trim(),
      doctorName: noteDoctorName.trim() || session?.name || 'Physician',
      department: noteDepartment.trim() || 'General Medicine',
      notes: noteBody.trim(),
    });
    setNoteModalOpen(false);
    setNoteTitle('');
    setNoteBody('');
    setNoteError('');
  };

  const tabs: { id: EmrTab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Medical History & Allergies' },
    { id: 'diagnoses', label: 'Diagnoses', count: patientDiagnoses.length },
    { id: 'prescriptions', label: 'Prescriptions', count: patientPrescriptions.length },
    { id: 'lab-reports', label: 'Lab Reports', count: patientLabTests.length },
    { id: 'appointments', label: 'Appointments', count: patientAppointments.length },
    {
      id: 'doctor-notes',
      label: 'Doctor Notes',
      count: selectedPatient?.medicalHistory.length ?? 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Privacy & Prototype Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] px-5 py-3.5 shadow-xs">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-[#16B8A6] shrink-0" />
          <div className="text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-[#142D4E] dark:text-white">
              Confidential Electronic Medical Records ·{' '}
            </span>
            Restricted to authorized Medical Staff & Administrators. Demonstration dataset only; does not provide automated medical diagnoses.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar: Patient Directory Picker */}
        <div className="lg:col-span-4 xl:col-span-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xs flex flex-col max-h-[760px]">
          <div className="mb-3">
            <h3 className="font-display text-sm font-bold text-[#142D4E] dark:text-white">
              Select Patient Record
            </h3>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Search name, ID, blood group..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F4F7FB] dark:bg-slate-800 py-2 pl-9 pr-3 text-xs text-[#1E293B] dark:text-slate-100 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none"
              />
            </div>
          </div>

          <ul className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-1">
            {filteredPatients.map((p) => {
              const active = selectedPatient?.id === p.id;
              const hasAllergy = Boolean(p.allergies && p.allergies.toLowerCase() !== 'none reported');
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPatientId(p.id);
                      setEditingAllergies(false);
                    }}
                    className={`w-full text-left px-3 py-3 rounded-lg transition-colors my-0.5 ${
                      active
                        ? 'bg-[#2563EB] text-white'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/70 text-[#1E293B] dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm truncate">{p.fullName}</span>
                      <span
                        className={`font-mono-num text-xs font-bold shrink-0 ${
                          active ? 'text-white/90' : 'text-[#16B8A6]'
                        }`}
                      >
                        {p.bloodGroup}
                      </span>
                    </div>
                    <div
                      className={`mt-1 flex items-center justify-between text-xs font-mono-num ${
                        active ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <span>{p.id}</span>
                      <span>
                        {p.age}y · {p.gender[0]}
                      </span>
                    </div>
                    {hasAllergy && (
                      <div
                        className={`mt-1 text-[11px] font-medium truncate ${
                          active ? 'text-amber-100' : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        Allergy: {p.allergies}
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
            {filteredPatients.length === 0 && (
              <li className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                No matching patient records.
              </li>
            )}
          </ul>
        </div>

        {/* Right Main EMR Workspace */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-5">
          {!selectedPatient ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-12 text-center text-sm text-slate-500">
              Select a patient to view their Electronic Medical Record.
            </div>
          ) : (
            <>
              {/* Patient Clinical Header Card */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono-num text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-[#2563EB]">{selectedPatient.id}</span>
                      <span>·</span>
                      <span>Blood Group {selectedPatient.bloodGroup}</span>
                      <span>·</span>
                      <span>
                        {selectedPatient.age} yrs · {selectedPatient.gender}
                      </span>
                      <span>·</span>
                      <span>Registered {selectedPatient.registrationDate}</span>
                    </div>
                    <h2 className="font-display text-xl font-bold text-[#142D4E] dark:text-white">
                      {selectedPatient.fullName}
                    </h2>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Phone: {selectedPatient.phone} · Emergency Contact:{' '}
                      {selectedPatient.emergencyContact || 'Not listed'}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <PatientQrCode patientId={selectedPatient.id} size={74} />
                  </div>
                </div>

                {/* Allergies Alert Bar */}
                <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Recorded Allergies:</span>
                      {!editingAllergies && (
                        <span className="font-normal text-amber-900 dark:text-amber-200">
                          {selectedPatient.allergies || 'None reported'}
                        </span>
                      )}
                    </div>
                    {!editingAllergies && (
                      <button
                        type="button"
                        onClick={startAllergyEdit}
                        className="text-xs font-semibold text-[#2563EB] hover:underline"
                      >
                        Update Allergies
                      </button>
                    )}
                  </div>
                  {editingAllergies && (
                    <form onSubmit={saveAllergies} className="mt-2.5 flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={allergyDraft}
                        onChange={(e) => setAllergyDraft(e.target.value)}
                        placeholder="e.g., Penicillin, Latex, or None reported"
                        className="flex-1 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-[#1E293B] dark:text-slate-100 focus:outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          className="rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingAllergies(false)}
                          className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* EMR Sub-navigation Tabs */}
                <div className="mt-4 flex flex-wrap items-center gap-1 rounded-lg bg-[#F4F7FB] dark:bg-slate-800/80 p-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'bg-white dark:bg-slate-900 text-[#142D4E] dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-[#142D4E] dark:hover:text-white'
                      }`}
                    >
                      {tab.label}
                      {typeof tab.count === 'number' ? ` (${tab.count})` : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-sm font-bold text-[#142D4E] dark:text-white flex items-center gap-2">
                        <Activity className="h-4 w-4 text-[#2563EB]" />
                        Active & Past Diagnoses
                      </h3>
                      <button
                        type="button"
                        onClick={() => setDxModalOpen(true)}
                        className="text-xs font-semibold text-[#2563EB] hover:underline"
                      >
                        + Add Diagnosis
                      </button>
                    </div>
                    {patientDiagnoses.length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        No diagnoses recorded yet.
                      </p>
                    ) : (
                      <ul className="space-y-2.5">
                        {patientDiagnoses.slice(0, 4).map((d) => (
                          <li
                            key={d.id}
                            className="rounded-lg border border-slate-100 dark:border-slate-800 p-3 text-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-[#1E293B] dark:text-slate-100">
                                {d.condition}
                              </span>
                              <span className="font-mono-num text-slate-500">{d.status}</span>
                            </div>
                            <div className="mt-1 text-slate-500 dark:text-slate-400">
                              {d.doctorName} · {d.date} {d.icdCode ? `· Code ${d.icdCode}` : ''}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-sm font-bold text-[#142D4E] dark:text-white flex items-center gap-2">
                        <Pill className="h-4 w-4 text-[#16B8A6]" />
                        Current Prescriptions
                      </h3>
                      <button
                        type="button"
                        onClick={() => setRxModalOpen(true)}
                        className="text-xs font-semibold text-[#2563EB] hover:underline"
                      >
                        + Add Prescription
                      </button>
                    </div>
                    {patientPrescriptions.length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        No prescriptions recorded yet.
                      </p>
                    ) : (
                      <ul className="space-y-2.5">
                        {patientPrescriptions.slice(0, 4).map((rx) => (
                          <li
                            key={rx.id}
                            className="rounded-lg border border-slate-100 dark:border-slate-800 p-3 text-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-[#1E293B] dark:text-slate-100">
                                {rx.medicationName}
                              </span>
                              <span className="font-semibold text-[#16B8A6]">{rx.status}</span>
                            </div>
                            <div className="mt-1 text-slate-500 dark:text-slate-400">
                              {rx.dosage} · {rx.frequency} · {rx.duration}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-sm font-bold text-[#142D4E] dark:text-white flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-[#2563EB]" />
                        Medical History & Physician Notes
                      </h3>
                      <button
                        type="button"
                        onClick={() => setNoteModalOpen(true)}
                        className="text-xs font-semibold text-[#2563EB] hover:underline"
                      >
                        + Add Clinical Note
                      </button>
                    </div>
                    {selectedPatient.medicalHistory.length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        No medical history entries recorded yet.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {selectedPatient.medicalHistory.map((mh) => (
                          <div key={mh.id} className="py-3 first:pt-0 last:pb-0">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-[#142D4E] dark:text-white">
                                {mh.title}
                              </span>
                              <span className="font-mono-num text-slate-500 dark:text-slate-400">
                                {mh.date}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                              {mh.notes}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              {mh.doctorName} · {mh.department}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'diagnoses' && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-base font-bold text-[#142D4E] dark:text-white">
                      Diagnoses History
                    </h3>
                    <button
                      type="button"
                      onClick={() => setDxModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Diagnosis
                    </button>
                  </div>

                  {patientDiagnoses.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      No diagnoses logged for {selectedPatient.fullName}.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {patientDiagnoses.map((d) => (
                        <div
                          key={d.id}
                          className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono-num text-xs font-semibold text-[#2563EB]">
                                {d.id}
                              </span>
                              {d.icdCode && (
                                <span className="font-mono-num text-xs text-slate-500">
                                  ICD {d.icdCode}
                                </span>
                              )}
                              <span
                                className={`text-xs font-semibold ${
                                  d.severity === 'Severe'
                                    ? 'text-red-600 dark:text-red-400'
                                    : d.severity === 'Moderate'
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                {d.severity}
                              </span>
                            </div>
                            <h4 className="mt-1 font-semibold text-sm text-[#142D4E] dark:text-white">
                              {d.condition}
                            </h4>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              {d.doctorName} · {d.department} · Recorded {d.date}
                            </p>
                            {d.notes && (
                              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
                                {d.notes}
                              </p>
                            )}
                          </div>
                          <select
                            aria-label={`Status for diagnosis ${d.condition}`}
                            value={d.status}
                            onChange={(e) =>
                              updateEmrDiagnosisStatus(
                                d.id,
                                e.target.value as 'Active' | 'Monitoring' | 'Resolved'
                              )
                            }
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F4F7FB] dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-[#1E293B] dark:text-slate-100 shrink-0"
                          >
                            <option value="Active">Active</option>
                            <option value="Monitoring">Monitoring</option>
                            <option value="Resolved">Resolved</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'prescriptions' && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-base font-bold text-[#142D4E] dark:text-white">
                      Medication Prescriptions
                    </h3>
                    <button
                      type="button"
                      onClick={() => setRxModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Prescription
                    </button>
                  </div>

                  {patientPrescriptions.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      No prescriptions logged for {selectedPatient.fullName}.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {patientPrescriptions.map((rx) => (
                        <div
                          key={rx.id}
                          className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2 text-xs font-mono-num text-slate-500">
                              <span className="font-semibold text-[#16B8A6]">{rx.id}</span>
                              <span>·</span>
                              <span>Prescribed {rx.date}</span>
                              <span>·</span>
                              <span>{rx.prescribedBy}</span>
                            </div>
                            <h4 className="mt-1 font-semibold text-sm text-[#142D4E] dark:text-white">
                              {rx.medicationName} ({rx.dosage})
                            </h4>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              {rx.frequency} · Duration: {rx.duration}
                            </p>
                            {rx.instructions && (
                              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                {rx.instructions}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              updateEmrPrescriptionStatus(
                                rx.id,
                                rx.status === 'Active' ? 'Completed' : 'Active'
                              )
                            }
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shrink-0 ${
                              rx.status === 'Active'
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {rx.status}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'lab-reports' && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-base font-bold text-[#142D4E] dark:text-white flex items-center gap-2">
                      <FlaskConical className="h-4 w-4 text-indigo-600" />
                      Linked Laboratory Reports
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActivePage('laboratory')}
                      className="text-xs font-semibold text-[#2563EB] hover:underline"
                    >
                      Open Laboratory Module
                    </button>
                  </div>
                  {patientLabTests.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      No diagnostic laboratory tests recorded for {selectedPatient.fullName}.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {patientLabTests.map((t) => (
                        <div
                          key={t.id}
                          className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-1.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono-num text-xs font-semibold text-[#2563EB]">
                              {t.id} · {t.category}
                            </span>
                            <span className="text-xs font-semibold text-[#16B8A6]">{t.status}</span>
                          </div>
                          <div className="text-sm font-semibold text-[#142D4E] dark:text-white">
                            {t.testName}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Ordered by {t.orderedByDoctor} on {t.requestDate}
                            {t.completedDate ? ` · Completed ${t.completedDate}` : ''}
                          </div>
                          {t.resultSummary && (
                            <div className="mt-2 rounded-md bg-[#F4F7FB] dark:bg-slate-800/80 p-2.5 text-xs text-[#1E293B] dark:text-slate-200">
                              <span className="font-semibold">Findings: </span>
                              {t.resultSummary}
                              {t.referenceRange ? ` (Ref: ${t.referenceRange})` : ''}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'appointments' && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-base font-bold text-[#142D4E] dark:text-white flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-[#2563EB]" />
                      Appointment History
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActivePage('appointments')}
                      className="text-xs font-semibold text-[#2563EB] hover:underline"
                    >
                      Manage Appointments
                    </button>
                  </div>
                  {patientAppointments.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      No appointments on record for {selectedPatient.fullName}.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {patientAppointments.map((a) => (
                        <div
                          key={a.id}
                          className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <div className="font-semibold text-sm text-[#142D4E] dark:text-white">
                              {a.reason}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {a.doctorName} · {a.department}
                            </div>
                          </div>
                          <div className="text-right font-mono-num text-xs">
                            <div className="font-semibold text-[#1E293B] dark:text-slate-100">
                              {a.date} · {a.time}
                            </div>
                            <div className="text-[#16B8A6] font-semibold">{a.status}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'doctor-notes' && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-base font-bold text-[#142D4E] dark:text-white flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#2563EB]" />
                      Doctor Clinical Notes
                    </h3>
                    <button
                      type="button"
                      onClick={() => setNoteModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      <Stethoscope className="h-3.5 w-3.5" />
                      Add Doctor Note
                    </button>
                  </div>
                  {selectedPatient.medicalHistory.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      No doctor encounter notes recorded yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedPatient.medicalHistory.map((note) => (
                        <div
                          key={note.id}
                          className="rounded-lg border border-slate-200 dark:border-slate-800 p-4"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-[#142D4E] dark:text-white">
                              {note.title}
                            </span>
                            <span className="font-mono-num text-slate-500">{note.date}</span>
                          </div>
                          <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-200">
                            {note.notes}
                          </p>
                          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            Author: {note.doctorName} · {note.department}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Diagnosis Modal */}
      <Modal
        open={dxModalOpen}
        onClose={() => setDxModalOpen(false)}
        title="Record Patient Diagnosis"
        subtitle={selectedPatient ? `${selectedPatient.fullName} (${selectedPatient.id})` : undefined}
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleAddDiagnosis} className="space-y-4">
          {dxError && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {dxError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Condition / Clinical Diagnosis *
            </label>
            <input
              type="text"
              value={dxCondition}
              onChange={(e) => setDxCondition(e.target.value)}
              placeholder="e.g., Community-Acquired Pneumonia"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                ICD Code (optional)
              </label>
              <input
                type="text"
                value={dxIcd}
                onChange={(e) => setDxIcd(e.target.value)}
                placeholder="e.g., J18.9"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Severity
              </label>
              <select
                value={dxSeverity}
                onChange={(e) => setDxSeverity(e.target.value as 'Mild' | 'Moderate' | 'Severe')}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
              >
                <option value="Mild">Mild</option>
                <option value="Moderate">Moderate</option>
                <option value="Severe">Severe</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Recording Physician
            </label>
            <select
              value={dxDoctorId}
              onChange={(e) => setDxDoctorId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.department})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Clinical Notes
            </label>
            <textarea
              rows={2}
              value={dxNotes}
              onChange={(e) => setDxNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDxModalOpen(false)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Save Diagnosis
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Prescription Modal */}
      <Modal
        open={rxModalOpen}
        onClose={() => setRxModalOpen(false)}
        title="Add EMR Prescription"
        subtitle={selectedPatient ? `${selectedPatient.fullName} (${selectedPatient.id})` : undefined}
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleAddPrescription} className="space-y-4">
          {rxError && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {rxError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Medication Name *
            </label>
            <input
              type="text"
              value={rxMed}
              onChange={(e) => setRxMed(e.target.value)}
              placeholder="e.g., Amoxicillin 500mg Capsule"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Dosage *
              </label>
              <input
                type="text"
                value={rxDosage}
                onChange={(e) => setRxDosage(e.target.value)}
                placeholder="500 mg"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Frequency *
              </label>
              <input
                type="text"
                value={rxFreq}
                onChange={(e) => setRxFreq(e.target.value)}
                placeholder="Twice daily"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Duration *
              </label>
              <input
                type="text"
                value={rxDuration}
                onChange={(e) => setRxDuration(e.target.value)}
                placeholder="7 days"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Administration Instructions
            </label>
            <textarea
              rows={2}
              value={rxInstructions}
              onChange={(e) => setRxInstructions(e.target.value)}
              placeholder="Take after meals..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRxModalOpen(false)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Save Prescription
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Doctor Note Modal */}
      <Modal
        open={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        title="Add Doctor Clinical Note"
        subtitle={selectedPatient ? `${selectedPatient.fullName} (${selectedPatient.id})` : undefined}
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleAddDoctorNote} className="space-y-4">
          {noteError && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {noteError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Encounter Title *
            </label>
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="e.g., Ward Round Progress Note"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Physician
              </label>
              <input
                type="text"
                value={noteDoctorName}
                onChange={(e) => setNoteDoctorName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Department
              </label>
              <input
                type="text"
                value={noteDepartment}
                onChange={(e) => setNoteDepartment(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Clinical Note *
            </label>
            <textarea
              rows={4}
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Observations, vital assessment, treatment plan..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setNoteModalOpen(false)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Save Clinical Note
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

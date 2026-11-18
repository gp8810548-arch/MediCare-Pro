import React, { useMemo, useState } from 'react';
import {
  Activity,
  BedDouble,
  Plus,
  Search,
  ShieldAlert,
  Stethoscope,
  Trash2,
} from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import {
  BloodGroup,
  EmergencyCase,
  EmergencyPriority,
  EmergencyTreatmentStatus,
} from '../types/hospital';
import { DataTable, TableColumn } from '../components/DataTable';
import { Modal } from '../components/Modal';

export const Emergency: React.FC = () => {
  const {
    emergencyCases,
    patients,
    doctors,
    beds,
    addPatient,
    registerEmergencyCase,
    updateEmergencyCase,
    admitEmergencyToBed,
    deleteEmergencyCase,
  } = useHospital();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'Active' | 'All'>('Active');
  const [priorityFilter, setPriorityFilter] = useState<'All' | EmergencyPriority>('All');

  // Register Modal
  const [registerOpen, setRegisterOpen] = useState(false);
  const [patientMode, setPatientMode] = useState<'existing' | 'new'>('existing');
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id ?? '');
  const [quickName, setQuickName] = useState('');
  const [quickAge, setQuickAge] = useState('35');
  const [quickGender, setQuickGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickBlood, setQuickBlood] = useState<BloodGroup>('O+');

  const [complaint, setComplaint] = useState('');
  const [vitals, setVitals] = useState('');
  const [priority, setPriority] = useState<EmergencyPriority>('High');
  const [assignedDoctorId, setAssignedDoctorId] = useState('');
  const [caseNotes, setCaseNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Manage Case Modal
  const [editingCase, setEditingCase] = useState<EmergencyCase | null>(null);
  const [admitBedId, setAdmitBedId] = useState('');
  const [manageError, setManageError] = useState('');

  const availableDoctors = useMemo(
    () => doctors.filter((d) => d.availability === 'Available'),
    [doctors]
  );

  const availableBeds = useMemo(
    () => beds.filter((b) => b.status === 'Available'),
    [beds]
  );

  const filteredCases = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return emergencyCases
      .filter((c) => {
        if (viewMode === 'Active' && c.treatmentStatus === 'Discharged') return false;
        if (priorityFilter !== 'All' && c.priority !== priorityFilter) return false;
        if (!q) return true;
        return (
          c.id.toLowerCase().includes(q) ||
          c.patientName.toLowerCase().includes(q) ||
          c.patientId.toLowerCase().includes(q) ||
          c.chiefComplaint.toLowerCase().includes(q) ||
          (c.assignedDoctorName ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const pOrder: Record<EmergencyPriority, number> = {
          Critical: 0,
          High: 1,
          Moderate: 2,
          Low: 3,
        };
        if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
        return b.arrivalTime.localeCompare(a.arrivalTime);
      });
  }, [emergencyCases, viewMode, priorityFilter, searchQuery]);

  const counts = useMemo(() => {
    const active = emergencyCases.filter((c) => c.treatmentStatus !== 'Discharged');
    return {
      active: active.length,
      critical: active.filter((c) => c.priority === 'Critical').length,
      underTreatment: active.filter((c) => c.treatmentStatus === 'Under Treatment').length,
      admitted: active.filter((c) => c.treatmentStatus === 'Admitted').length,
    };
  }, [emergencyCases]);

  const openRegisterModal = () => {
    setPatientMode('existing');
    setSelectedPatientId(patients[0]?.id ?? '');
    setQuickName('');
    setQuickAge('35');
    setQuickGender('Male');
    setQuickPhone('');
    setQuickBlood('O+');
    setComplaint('');
    setVitals('');
    setPriority('High');
    setAssignedDoctorId(availableDoctors[0]?.id ?? doctors[0]?.id ?? '');
    setCaseNotes('');
    setFormError('');
    setRegisterOpen(true);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint.trim()) {
      setFormError('Chief complaint / emergency reason is required.');
      return;
    }

    let targetPatientId = selectedPatientId;
    if (patientMode === 'new') {
      const parsedAge = Number(quickAge);
      if (!quickName.trim() || !quickPhone.trim() || !Number.isFinite(parsedAge) || parsedAge <= 0) {
        setFormError('Quick registration requires patient name, valid age, and contact phone.');
        return;
      }
      const created = addPatient({
        fullName: quickName.trim(),
        age: parsedAge,
        gender: quickGender,
        phone: quickPhone.trim(),
        email: 'er.walkin@medicarepro.demo',
        address: 'Emergency Department Intake',
        bloodGroup: quickBlood,
        allergies: 'Pending verification',
      });
      targetPatientId = created.id;
    } else if (!targetPatientId) {
      setFormError('Please select a patient record.');
      return;
    }

    const res = registerEmergencyCase({
      patientId: targetPatientId,
      chiefComplaint: complaint,
      triageVitals: vitals,
      priority,
      assignedDoctorId: assignedDoctorId || undefined,
      notes: caseNotes,
    });
    if (!res.ok) {
      setFormError(res.error || 'Could not register emergency case.');
      return;
    }
    setRegisterOpen(false);
  };

  const handleManageSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCase) return;
    setManageError('');

    const doc = doctors.find((d) => d.id === editingCase.assignedDoctorId);
    const updatedPayload: EmergencyCase = {
      ...editingCase,
      assignedDoctorName: doc?.name,
    };
    updateEmergencyCase(updatedPayload);

    if (admitBedId && !editingCase.bedId) {
      const res = admitEmergencyToBed(editingCase.id, admitBedId);
      if (!res.ok) {
        setManageError(res.error || 'Could not allocate bed for emergency admission.');
        return;
      }
    }
    setEditingCase(null);
    setAdmitBedId('');
  };

  const formatTimeShort = (iso: string) => {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return iso;
    return dt.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const columns: TableColumn<EmergencyCase>[] = [
    {
      key: 'id',
      header: 'Case ID',
      render: (c) => (
        <div>
          <div className="font-mono-num text-xs font-bold text-[#142D4E] dark:text-white">{c.id}</div>
          <div className="font-mono-num text-[11px] text-slate-500 dark:text-slate-400">
            {formatTimeShort(c.arrivalTime)}
          </div>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Patient & Triage',
      render: (c) => (
        <div>
          <div className="font-semibold text-[#1E293B] dark:text-slate-100">{c.patientName}</div>
          <div className="text-xs text-slate-600 dark:text-slate-300">{c.chiefComplaint}</div>
          {c.triageVitals && (
            <div className="font-mono-num text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {c.triageVitals}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (c) => (
        <span
          className={`text-xs font-bold ${
            c.priority === 'Critical'
              ? 'text-red-600 dark:text-red-400'
              : c.priority === 'High'
              ? 'text-amber-600 dark:text-amber-400'
              : c.priority === 'Moderate'
              ? 'text-[#2563EB] dark:text-blue-400'
              : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          {c.priority}
        </span>
      ),
    },
    {
      key: 'doctor',
      header: 'Assigned Doctor',
      render: (c) => (
        <div className="text-sm text-[#263449] dark:text-slate-200">
          {c.assignedDoctorName || <span className="text-amber-600 font-medium">Unassigned</span>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Treatment & Admission',
      render: (c) => (
        <div>
          <div className="text-xs font-semibold text-[#16B8A6]">{c.treatmentStatus}</div>
          {c.bedNumber && (
            <div className="font-mono-num text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {c.admittedWard} · Bed {c.bedNumber}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => {
              setEditingCase({ ...c });
              setAdmitBedId('');
              setManageError('');
            }}
            className="rounded-lg bg-[#2563EB] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
          >
            Update / Admit
          </button>
          <button
            type="button"
            onClick={() => deleteEmergencyCase(c.id)}
            aria-label={`Delete emergency case ${c.id}`}
            className="rounded-lg p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#142D4E] dark:text-white">
            Emergency Case Management
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Triage incoming emergencies, assign available physicians, track treatment, and coordinate ward bed admission.
          </p>
        </div>
        <button
          type="button"
          onClick={openRegisterModal}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-red-700 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          Register Emergency Case
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Active ER Cases</span>
            <ShieldAlert className="h-4 w-4 text-red-500" />
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-[#142D4E] dark:text-white">
            {counts.active}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Critical Priority</span>
            <Activity className="h-4 w-4 text-red-600" />
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-red-600 dark:text-red-400">
            {counts.critical}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Under Treatment</span>
            <Stethoscope className="h-4 w-4 text-[#2563EB]" />
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-[#142D4E] dark:text-white">
            {counts.underTreatment}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Admitted to Ward</span>
            <BedDouble className="h-4 w-4 text-[#16B8A6]" />
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-[#142D4E] dark:text-white">
            {counts.admitted}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xs">
        <div className="flex items-center gap-1 rounded-lg bg-[#F4F7FB] dark:bg-slate-800/80 p-1 w-fit">
          {(['Active', 'All'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === mode
                  ? 'bg-white dark:bg-slate-900 text-[#142D4E] dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {mode === 'Active' ? 'Active Emergencies' : 'All Cases'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px] flex-1 sm:flex-initial">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search case, patient, doctor..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F4F7FB] dark:bg-slate-800 py-2 pl-9 pr-3 text-sm text-[#1E293B] dark:text-slate-100 focus:outline-none"
            />
          </div>
          <select
            aria-label="Filter by emergency priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as 'All' | EmergencyPriority)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F4F7FB] dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
          >
            <option value="All">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Moderate">Moderate</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredCases}
        rowKey={(c) => c.id}
        emptyTitle="No emergency cases in this view"
        emptyDescription="Register a new emergency case or switch to All Cases."
      />

      {/* Register Emergency Modal */}
      <Modal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        title="Register Emergency Case"
        subtitle="Immediate ER intake, physician assignment, and triage priority"
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {formError}
            </div>
          )}

          <div className="flex items-center gap-1 rounded-lg bg-[#F4F7FB] dark:bg-slate-800 p-1 w-fit">
            <button
              type="button"
              onClick={() => setPatientMode('existing')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                patientMode === 'existing'
                  ? 'bg-white dark:bg-slate-900 text-[#142D4E] dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Existing Patient
            </button>
            <button
              type="button"
              onClick={() => setPatientMode('new')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                patientMode === 'new'
                  ? 'bg-white dark:bg-slate-900 text-[#142D4E] dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Quick ER Registration
            </button>
          </div>

          {patientMode === 'existing' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Registered Patient *
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.id} · {p.bloodGroup})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-[#F8FAFC] dark:bg-slate-800/40">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Patient Full Name *
                </label>
                <input
                  type="text"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Age *
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={quickAge}
                  onChange={(e) => setQuickAge(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Blood Group
                </label>
                <select
                  value={quickBlood}
                  onChange={(e) => setQuickBlood(e.target.value as BloodGroup)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
                >
                  {(['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] as BloodGroup[]).map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Gender
                </label>
                <select
                  value={quickGender}
                  onChange={(e) => setQuickGender(e.target.value as 'Male' | 'Female' | 'Other')}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Emergency Contact Phone *
                </label>
                <input
                  type="text"
                  value={quickPhone}
                  onChange={(e) => setQuickPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Chief Complaint / Incident Summary *
            </label>
            <input
              type="text"
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder="e.g., Acute dyspnea and chest discomfort"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Initial Triage Vitals
              </label>
              <input
                type="text"
                value={vitals}
                onChange={(e) => setVitals(e.target.value)}
                placeholder="BP 140/90 · HR 110 · SpO2 95%"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Emergency Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as EmergencyPriority)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
              >
                <option value="Critical">Critical (Immediate Resuscitation)</option>
                <option value="High">High (Urgent Triage)</option>
                <option value="Moderate">Moderate</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Assign Available Physician
            </label>
            <select
              value={assignedDoctorId}
              onChange={(e) => setAssignedDoctorId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
            >
              <option value="">Leave in Triage Queue (Unassigned)</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} · {d.department} ({d.availability})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              value={caseNotes}
              onChange={(e) => setCaseNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRegisterOpen(false)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Register Emergency
            </button>
          </div>
        </form>
      </Modal>

      {/* Update & Admit Emergency Case Modal */}
      <Modal
        open={Boolean(editingCase)}
        onClose={() => setEditingCase(null)}
        title={editingCase ? `Manage Case ${editingCase.id}` : 'Manage Case'}
        subtitle={editingCase?.patientName}
        maxWidthClass="max-w-lg"
      >
        {editingCase && (
          <form onSubmit={handleManageSave} className="space-y-4">
            {manageError && (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                {manageError}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Treatment Status
                </label>
                <select
                  value={editingCase.treatmentStatus}
                  onChange={(e) =>
                    setEditingCase({
                      ...editingCase,
                      treatmentStatus: e.target.value as EmergencyTreatmentStatus,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
                >
                  <option value="Triage">Triage</option>
                  <option value="Under Treatment">Under Treatment</option>
                  <option value="Stabilized">Stabilized</option>
                  <option value="Admitted">Admitted</option>
                  <option value="Discharged">Discharged</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Priority
                </label>
                <select
                  value={editingCase.priority}
                  onChange={(e) =>
                    setEditingCase({
                      ...editingCase,
                      priority: e.target.value as EmergencyPriority,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Assigned Physician
              </label>
              <select
                value={editingCase.assignedDoctorId ?? ''}
                onChange={(e) =>
                  setEditingCase({
                    ...editingCase,
                    assignedDoctorId: e.target.value || undefined,
                  })
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
              >
                <option value="">Unassigned</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.availability})
                  </option>
                ))}
              </select>
            </div>

            {editingCase.bedNumber ? (
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/30 px-3.5 py-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                Currently admitted to <span className="font-semibold">{editingCase.admittedWard}</span> · Bed{' '}
                <span className="font-mono-num font-bold">{editingCase.bedNumber}</span>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Admit to Available Hospital Bed (optional)
                </label>
                <select
                  value={admitBedId}
                  onChange={(e) => setAdmitBedId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
                >
                  <option value="">Do not admit yet</option>
                  {availableBeds.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bedNumber} · {b.wardName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Treatment & Admission Notes
              </label>
              <textarea
                rows={3}
                value={editingCase.notes ?? ''}
                onChange={(e) => setEditingCase({ ...editingCase, notes: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCase(null)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

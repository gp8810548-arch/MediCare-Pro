import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  DollarSign,
  FileText,
  LogOut,
  Plus,
  Printer,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import { addDaysIso, calculateInvoiceTotal, formatCurrency, getTodayIso } from '../services/dataService';
import { DischargeRecord, DischargeWorkflowStatus, Invoice } from '../types/hospital';
import { DataTable, TableColumn } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { PatientQrCode } from '../components/PatientQrCode';

export const Discharge: React.FC = () => {
  const {
    discharges,
    patients,
    doctors,
    beds,
    wards,
    settings,
    session,
    createDischargeRequest,
    updateDischargeApproval,
    finalizeDischarge,
    deleteDischargeRecord,
  } = useHospital();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | DischargeWorkflowStatus>('All');

  // Create Request Modal
  const [requestOpen, setRequestOpen] = useState(false);
  const [formPatientId, setFormPatientId] = useState('');
  const [formBedId, setFormBedId] = useState('');
  const [formDoctorId, setFormDoctorId] = useState('');
  const [formConsultFee, setFormConsultFee] = useState('150');
  const [formRoomDays, setFormRoomDays] = useState('1');
  const [formRoomRate, setFormRoomRate] = useState('210');
  const [formLabCharges, setFormLabCharges] = useState('0');
  const [formMedCharges, setFormMedCharges] = useState('0');
  const [formDiscount, setFormDiscount] = useState('0');
  const [formSummary, setFormSummary] = useState('');
  const [formMedInstructions, setFormMedInstructions] = useState('');
  const [formFollowUpDate, setFormFollowUpDate] = useState(addDaysIso(getTodayIso(), 7));
  const [formError, setFormError] = useState('');

  // Finalize Settlement Modal
  const [finalizeTarget, setFinalizeTarget] = useState<DischargeRecord | null>(null);
  const [payMethod, setPayMethod] = useState<NonNullable<Invoice['paymentMethod']>>('Card');
  const [paidAmount, setPaidAmount] = useState('0');

  // Printable Summary Modal
  const [printTarget, setPrintTarget] = useState<DischargeRecord | null>(null);

  const canApproveDischarge = session?.role === 'Admin' || session?.role === 'Doctor';

  const liveTotal = useMemo(
    () =>
      calculateInvoiceTotal(
        Number(formConsultFee) || 0,
        (Number(formRoomDays) || 0) * (Number(formRoomRate) || 0),
        Number(formLabCharges) || 0,
        Number(formMedCharges) || 0,
        Number(formDiscount) || 0
      ),
    [formConsultFee, formRoomDays, formRoomRate, formLabCharges, formMedCharges, formDiscount]
  );

  const counts = useMemo(() => {
    const pending = discharges.filter((d) => d.status === 'Requested').length;
    const approved = discharges.filter((d) => d.status === 'Approved').length;
    const completed = discharges.filter((d) => d.status === 'Completed').length;
    const billedTotal = discharges
      .filter((d) => d.status === 'Completed')
      .reduce((sum, d) => sum + d.totalAmount, 0);
    return { pending, approved, completed, billedTotal };
  }, [discharges]);

  const filteredDischarges = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return discharges.filter((d) => {
      if (statusFilter !== 'All' && d.status !== statusFilter) return false;
      if (!q) return true;
      return (
        d.id.toLowerCase().includes(q) ||
        d.patientName.toLowerCase().includes(q) ||
        d.patientId.toLowerCase().includes(q) ||
        d.doctorName.toLowerCase().includes(q)
      );
    });
  }, [discharges, statusFilter, searchQuery]);

  const applyPatientAdmissionDefaults = (pid: string) => {
    setFormPatientId(pid);
    const activeBed = beds.find((b) => b.patientId === pid && b.status === 'Occupied');
    if (activeBed) {
      setFormBedId(activeBed.id);
      const ward = wards.find((w) => w.id === activeBed.wardId);
      setFormRoomRate(String(ward?.dailyRate ?? 210));
      if (activeBed.admittedDate) {
        const diffDays = Math.max(
          1,
          Math.ceil(
            (new Date(`${getTodayIso()}T00:00:00`).getTime() -
              new Date(`${activeBed.admittedDate}T00:00:00`).getTime()) /
              86_400_000
          )
        );
        setFormRoomDays(String(diffDays));
      }
    } else {
      setFormBedId('');
    }
  };

  const openRequestModal = () => {
    const defaultPid =
      beds.find((b) => b.status === 'Occupied' && b.patientId)?.patientId ?? patients[0]?.id ?? '';
    applyPatientAdmissionDefaults(defaultPid);
    setFormDoctorId(doctors[0]?.id ?? '');
    setFormConsultFee(String(doctors[0]?.consultationFee ?? 150));
    setFormLabCharges('0');
    setFormMedCharges('0');
    setFormDiscount('0');
    setFormSummary('');
    setFormMedInstructions('');
    setFormFollowUpDate(addDaysIso(getTodayIso(), 7));
    setFormError('');
    setRequestOpen(true);
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPatientId || !formDoctorId) {
      setFormError('Patient and attending physician are required.');
      return;
    }
    if (!formSummary.trim() || !formMedInstructions.trim()) {
      setFormError('Discharge summary and medication instructions are required.');
      return;
    }
    const res = createDischargeRequest({
      patientId: formPatientId,
      bedId: formBedId || undefined,
      doctorId: formDoctorId,
      consultationFee: Number(formConsultFee) || 0,
      roomDays: Number(formRoomDays) || 0,
      roomRate: Number(formRoomRate) || 0,
      labCharges: Number(formLabCharges) || 0,
      medicineCharges: Number(formMedCharges) || 0,
      discount: Number(formDiscount) || 0,
      dischargeSummary: formSummary,
      medicationInstructions: formMedInstructions,
      followUpDate: formFollowUpDate || undefined,
    });
    if (!res.ok) {
      setFormError(res.error || 'Could not create discharge request.');
      return;
    }
    setRequestOpen(false);
  };

  const handleFinalizeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalizeTarget) return;
    finalizeDischarge(finalizeTarget.id, payMethod, Number(paidAmount) || 0);
    setFinalizeTarget(null);
  };

  const columns: TableColumn<DischargeRecord>[] = [
    {
      key: 'id',
      header: 'Discharge ID',
      render: (d) => (
        <div>
          <div className="font-mono-num text-xs font-bold text-[#142D4E] dark:text-white">{d.id}</div>
          <div className="font-mono-num text-[11px] text-slate-500">Req {d.requestDate}</div>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Patient & Ward',
      render: (d) => (
        <div>
          <div className="font-semibold text-[#1E293B] dark:text-slate-100">{d.patientName}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {d.bedNumber ? `${d.wardName} · Bed ${d.bedNumber}` : 'Outpatient / Released'}
          </div>
        </div>
      ),
    },
    {
      key: 'approval',
      header: 'Doctor Approval',
      render: (d) => (
        <div>
          <div
            className={`text-xs font-semibold ${
              d.doctorApproval === 'Approved'
                ? 'text-emerald-600 dark:text-emerald-400'
                : d.doctorApproval === 'Rejected'
                ? 'text-red-600 dark:text-red-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {d.doctorApproval}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{d.doctorName}</div>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Final Billing',
      align: 'right',
      render: (d) => (
        <div className="font-mono-num">
          <div className="font-semibold text-[#142D4E] dark:text-white">
            {formatCurrency(d.totalAmount, settings.currencySymbol)}
          </div>
          {d.invoiceId && <div className="text-[11px] text-[#16B8A6]">{d.invoiceId}</div>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Workflow Status',
      render: (d) => (
        <span
          className={`text-xs font-semibold ${
            d.status === 'Completed'
              ? 'text-emerald-600 dark:text-emerald-400'
              : d.status === 'Approved'
              ? 'text-[#2563EB] dark:text-blue-400'
              : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          {d.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (d) => (
        <div className="flex items-center justify-end gap-1.5">
          {d.status === 'Requested' && d.doctorApproval !== 'Approved' && canApproveDischarge && (
            <>
              <button
                type="button"
                onClick={() => updateDischargeApproval(d.id, 'Approved')}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 whitespace-nowrap shrink-0"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Approve
              </button>
              <button
                type="button"
                onClick={() => updateDischargeApproval(d.id, 'Rejected')}
                aria-label={`Reject discharge ${d.id}`}
                className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <XCircle className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          {d.status === 'Approved' && d.doctorApproval === 'Approved' && (
            <button
              type="button"
              onClick={() => {
                setFinalizeTarget(d);
                setPayMethod('Card');
                setPaidAmount(String(d.totalAmount));
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-[#2563EB] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" />
              Finalize
            </button>
          )}
          <button
            type="button"
            onClick={() => setPrintTarget(d)}
            aria-label={`Print discharge summary ${d.id}`}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-[#142D4E] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <Printer className="h-3.5 w-3.5" />
            Summary
          </button>
          <button
            type="button"
            onClick={() => deleteDischargeRecord(d.id)}
            aria-label={`Delete discharge ${d.id}`}
            className="rounded-lg p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const printPatient = useMemo(
    () => (printTarget ? patients.find((p) => p.id === printTarget.patientId) : undefined),
    [printTarget, patients]
  );

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#142D4E] dark:text-white">
            Patient Discharge & Summary Workflow
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Coordinate discharge requests, physician sign-off, final inpatient billing, follow-up care, and A4 printable summaries.
          </p>
        </div>
        <button
          type="button"
          onClick={openRequestModal}
          className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          New Discharge Request
        </button>
      </div>

      {/* KPI Cards */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Pending Approval</span>
            <FileText className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-[#142D4E] dark:text-white">
            {counts.pending}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Approved · Ready</span>
            <ClipboardCheck className="h-4 w-4 text-[#2563EB]" />
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-[#142D4E] dark:text-white">
            {counts.approved}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Discharges Completed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-[#142D4E] dark:text-white">
            {counts.completed}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Settled Final Billing</span>
            <DollarSign className="h-4 w-4 text-[#16B8A6]" />
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-[#142D4E] dark:text-white">
            {formatCurrency(counts.billedTotal, settings.currencySymbol)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-[#F4F7FB] dark:bg-slate-800/80 p-1">
          {(['All', 'Requested', 'Approved', 'Completed'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === tab
                  ? 'bg-white dark:bg-slate-900 text-[#142D4E] dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="relative min-w-[230px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search discharge ID, patient, doctor..."
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F4F7FB] dark:bg-slate-800 py-2 pl-9 pr-3 text-sm text-[#1E293B] dark:text-slate-100 focus:outline-none"
          />
        </div>
      </div>

      <div className="no-print">
        <DataTable
          columns={columns}
          data={filteredDischarges}
          rowKey={(d) => d.id}
          emptyTitle="No discharge records match filters"
          emptyDescription="Create a new discharge request or adjust status filtering."
        />
      </div>

      {/* New Discharge Request Modal */}
      <Modal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        title="Initiate Patient Discharge Request"
        subtitle="Automatically calculates inpatient room & clinical charges"
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleRequestSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Patient *
              </label>
              <select
                value={formPatientId}
                onChange={(e) => applyPatientAdmissionDefaults(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Approving Physician *
              </label>
              <select
                value={formDoctorId}
                onChange={(e) => {
                  setFormDoctorId(e.target.value);
                  const d = doctors.find((doc) => doc.id === e.target.value);
                  if (d) setFormConsultFee(String(d.consultationFee));
                }}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.department})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Consultation Fee
              </label>
              <input
                type="number"
                min={0}
                value={formConsultFee}
                onChange={(e) => setFormConsultFee(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Room Days
              </label>
              <input
                type="number"
                min={0}
                value={formRoomDays}
                onChange={(e) => setFormRoomDays(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Daily Bed Rate
              </label>
              <input
                type="number"
                min={0}
                value={formRoomRate}
                onChange={(e) => setFormRoomRate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Laboratory Charges
              </label>
              <input
                type="number"
                min={0}
                value={formLabCharges}
                onChange={(e) => setFormLabCharges(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Pharmacy / Meds
              </label>
              <input
                type="number"
                min={0}
                value={formMedCharges}
                onChange={(e) => setFormMedCharges(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Discount
              </label>
              <input
                type="number"
                min={0}
                value={formDiscount}
                onChange={(e) => setFormDiscount(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-num"
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800/60 px-4 py-2.5 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              Calculated Final Discharge Total:
            </span>
            <span className="font-mono-num text-base font-bold text-[#142D4E] dark:text-white">
              {formatCurrency(liveTotal, settings.currencySymbol)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Clinical Discharge Summary *
            </label>
            <textarea
              rows={2}
              value={formSummary}
              onChange={(e) => setFormSummary(e.target.value)}
              placeholder="Hospital course, procedures completed, stability status..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Medication & Care Instructions *
              </label>
              <textarea
                rows={2}
                value={formMedInstructions}
                onChange={(e) => setFormMedInstructions(e.target.value)}
                placeholder="Take-home prescriptions, activity restrictions..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Follow-Up Date
              </label>
              <input
                type="date"
                value={formFollowUpDate}
                onChange={(e) => setFormFollowUpDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRequestOpen(false)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Submit Request
            </button>
          </div>
        </form>
      </Modal>

      {/* Finalize Settlement Modal */}
      <Modal
        open={Boolean(finalizeTarget)}
        onClose={() => setFinalizeTarget(null)}
        title={finalizeTarget ? `Finalize Discharge · ${finalizeTarget.id}` : 'Finalize Discharge'}
        subtitle={finalizeTarget?.patientName}
        maxWidthClass="max-w-md"
      >
        {finalizeTarget && (
          <form onSubmit={handleFinalizeSubmit} className="space-y-4">
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3.5 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Discharge Charges</span>
                <span className="font-mono-num font-bold text-[#142D4E] dark:text-white">
                  {formatCurrency(finalizeTarget.totalAmount, settings.currencySymbol)}
                </span>
              </div>
              {finalizeTarget.bedNumber && (
                <div className="text-xs text-[#16B8A6]">
                  Releases bed {finalizeTarget.bedNumber} ({finalizeTarget.wardName}) back to Available.
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Settlement Method
              </label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as NonNullable<Invoice['paymentMethod']>)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="Card">Card</option>
                <option value="Insurance">Insurance</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Amount Collected Now
              </label>
              <input
                type="number"
                min={0}
                max={finalizeTarget.totalAmount}
                step="0.01"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-num"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFinalizeTarget(null)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Confirm & Generate Invoice
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Printable A4 Discharge Document Modal */}
      <Modal
        open={Boolean(printTarget)}
        onClose={() => setPrintTarget(null)}
        title={printTarget ? `Discharge Summary · ${printTarget.id}` : 'Discharge Summary'}
        maxWidthClass="max-w-3xl"
        printable
      >
        {printTarget && (
          <div className="print-a4-sheet space-y-5">
            <div className="no-print flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#142D4E] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <Printer className="h-4 w-4" />
                Print A4 Discharge Document
              </button>
            </div>

            <div className="print-a4-header flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#142D4E] pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-[#142D4E] dark:text-white">
                  {settings.hospitalName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {settings.address} · {settings.phone}
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                  Inpatient Discharge Summary & Settlement Record
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right font-mono-num text-xs">
                  <div className="font-bold text-[#142D4E] dark:text-white">{printTarget.id}</div>
                  <div className="text-slate-500">
                    Discharge Date: {printTarget.dischargeDate || 'Pending Finalization'}
                  </div>
                  <div className="text-slate-500">Status: {printTarget.status}</div>
                </div>
                <PatientQrCode patientId={printTarget.patientId} size={64} />
              </div>
            </div>

            <div className="print-a4-meta-grid grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 text-xs">
              <div className="space-y-1">
                <div className="font-semibold text-slate-500 uppercase">Patient Information</div>
                <div className="text-sm font-bold text-[#142D4E] dark:text-white">
                  {printTarget.patientName}
                </div>
                <div className="font-mono-num">
                  Patient ID: {printTarget.patientId}
                  {printPatient ? ` · ${printPatient.age}y ${printPatient.gender} · Blood ${printPatient.bloodGroup}` : ''}
                </div>
                {printPatient?.allergies && (
                  <div className="text-amber-700 dark:text-amber-300 font-semibold">
                    Allergies: {printPatient.allergies}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-slate-500 uppercase">Admission & Physician Sign-Off</div>
                <div>Attending Physician: {printTarget.doctorName}</div>
                <div>Approval Status: {printTarget.doctorApproval}</div>
                <div>
                  Ward / Bed:{' '}
                  {printTarget.bedNumber
                    ? `${printTarget.wardName} · Bed ${printTarget.bedNumber}`
                    : 'Daycare / Outpatient'}
                </div>
                {printTarget.admittedDate && <div>Admitted Date: {printTarget.admittedDate}</div>}
              </div>
            </div>

            <div className="print-a4-panel rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-2 text-sm">
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#142D4E] dark:text-white">
                Clinical Course & Discharge Summary
              </h4>
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                {printTarget.dischargeSummary}
              </p>
            </div>

            <div className="print-a4-panel rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-2 text-sm">
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#142D4E] dark:text-white">
                Medication & Home Care Instructions
              </h4>
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                {printTarget.medicationInstructions}
              </p>
              {printTarget.followUpDate && (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#2563EB]">
                  Scheduled Follow-Up: {printTarget.followUpDate} with {printTarget.followUpDoctor || printTarget.doctorName}
                </div>
              )}
            </div>

            <table className="print-a4-table w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left">Billing Component</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Consultation & Physician Care</td>
                  <td className="text-right font-mono-num">
                    {formatCurrency(printTarget.consultationFee, settings.currencySymbol)}
                  </td>
                </tr>
                <tr>
                  <td>
                    Inpatient Room & Telemetry ({printTarget.roomDays} days ×{' '}
                    {formatCurrency(printTarget.roomRate, settings.currencySymbol)})
                  </td>
                  <td className="text-right font-mono-num">
                    {formatCurrency(printTarget.roomDays * printTarget.roomRate, settings.currencySymbol)}
                  </td>
                </tr>
                <tr>
                  <td>Laboratory & Diagnostics</td>
                  <td className="text-right font-mono-num">
                    {formatCurrency(printTarget.labCharges, settings.currencySymbol)}
                  </td>
                </tr>
                <tr>
                  <td>Pharmacy & Medications</td>
                  <td className="text-right font-mono-num">
                    {formatCurrency(printTarget.medicineCharges, settings.currencySymbol)}
                  </td>
                </tr>
                <tr>
                  <td>Adjustments / Discount</td>
                  <td className="text-right font-mono-num">
                    -{formatCurrency(printTarget.discount, settings.currencySymbol)}
                  </td>
                </tr>
                <tr className="font-bold">
                  <td>Net Final Discharge Total</td>
                  <td className="text-right font-mono-num">
                    {formatCurrency(printTarget.totalAmount, settings.currencySymbol)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="print-a4-footer flex items-center justify-between text-[11px] text-slate-500 pt-3 border-t border-slate-200 dark:border-slate-700">
              <span>{settings.hospitalName} · Demonstration Record (Non-Diagnostic)</span>
              <span className="font-mono-num">
                {printTarget.invoiceId ? `Invoice Ref: ${printTarget.invoiceId}` : 'Pre-Settlement Copy'}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

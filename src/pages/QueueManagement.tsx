import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ListOrdered,
  Play,
  Plus,
  Search,
  Trash2,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import { computeQueueWaitEstimate } from '../services/dataService';
import { QueuePriority, QueueStatus, QueueToken } from '../types/hospital';
import { DataTable, TableColumn } from '../components/DataTable';
import { Modal } from '../components/Modal';

export const QueueManagement: React.FC = () => {
  const {
    queueTokens,
    patients,
    doctors,
    session,
    issueQueueToken,
    updateQueueStatus,
    deleteQueueToken,
  } = useHospital();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | QueueStatus>('All');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');

  const [modalOpen, setModalOpen] = useState(false);
  const [formPatientId, setFormPatientId] = useState('');
  const [formDoctorId, setFormDoctorId] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formPriority, setFormPriority] = useState<QueuePriority>('Standard');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');

  const departments = useMemo(() => {
    const set = new Set<string>();
    doctors.forEach((d) => set.add(d.department));
    queueTokens.forEach((q) => set.add(q.department));
    return ['All', ...Array.from(set).sort()];
  }, [doctors, queueTokens]);

  const filteredTokens = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return queueTokens
      .filter((t) => {
        if (statusFilter !== 'All' && t.status !== statusFilter) return false;
        if (departmentFilter !== 'All' && t.department !== departmentFilter) return false;
        if (!q) return true;
        return (
          t.tokenNumber.toLowerCase().includes(q) ||
          t.patientName.toLowerCase().includes(q) ||
          t.patientId.toLowerCase().includes(q) ||
          t.doctorName.toLowerCase().includes(q) ||
          t.department.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const order: Record<QueueStatus, number> = {
          Consulting: 0,
          Waiting: 1,
          Completed: 2,
          Cancelled: 3,
        };
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        const prioOrder: Record<QueuePriority, number> = { Urgent: 0, Priority: 1, Standard: 2 };
        if (a.status === 'Waiting' && prioOrder[a.priority] !== prioOrder[b.priority]) {
          return prioOrder[a.priority] - prioOrder[b.priority];
        }
        return b.checkInTime.localeCompare(a.checkInTime);
      });
  }, [queueTokens, statusFilter, departmentFilter, searchQuery]);

  const waitEstimate = useMemo(
    () => computeQueueWaitEstimate(queueTokens, departmentFilter),
    [queueTokens, departmentFilter]
  );

  const counts = useMemo(
    () => ({
      waiting: queueTokens.filter((t) => t.status === 'Waiting').length,
      consulting: queueTokens.filter((t) => t.status === 'Consulting').length,
      completed: queueTokens.filter((t) => t.status === 'Completed').length,
      total: queueTokens.length,
    }),
    [queueTokens]
  );

  const openIssueModal = () => {
    const defaultDoc = doctors[0];
    setFormPatientId(patients[0]?.id ?? '');
    setFormDoctorId(defaultDoc?.id ?? '');
    setFormDepartment(defaultDoc?.department ?? '');
    setFormPriority('Standard');
    setFormNotes('');
    setFormError('');
    setModalOpen(true);
  };

  const handleDoctorChange = (docId: string) => {
    setFormDoctorId(docId);
    const doc = doctors.find((d) => d.id === docId);
    if (doc) setFormDepartment(doc.department);
  };

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPatientId) {
      setFormError('Please select a registered patient.');
      return;
    }
    if (!formDoctorId) {
      setFormError('Please assign an attending physician.');
      return;
    }
    if (!formDepartment.trim()) {
      setFormError('Department assignment is required.');
      return;
    }
    const res = issueQueueToken({
      patientId: formPatientId,
      doctorId: formDoctorId,
      department: formDepartment.trim(),
      priority: formPriority,
      notes: formNotes,
    });
    if (!res.ok) {
      setFormError(res.error || 'Could not issue queue token.');
      return;
    }
    setModalOpen(false);
  };

  const formatTimeShort = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const canCompleteConsult = session?.role === 'Admin' || session?.role === 'Doctor';
  const canDeleteToken = session?.role === 'Admin' || session?.role === 'Receptionist';

  const columns: TableColumn<QueueToken>[] = [
    {
      key: 'tokenNumber',
      header: 'Token',
      render: (t) => (
        <div>
          <span className="font-mono-num text-sm font-bold text-[#142D4E] dark:text-white">
            {t.tokenNumber}
          </span>
          <div className="font-mono-num text-[11px] text-slate-500 dark:text-slate-400">{t.id}</div>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Patient',
      render: (t) => (
        <div>
          <div className="font-semibold text-[#1E293B] dark:text-slate-100">{t.patientName}</div>
          <div className="font-mono-num text-xs text-slate-500 dark:text-slate-400">{t.patientId}</div>
        </div>
      ),
    },
    {
      key: 'assignment',
      header: 'Department & Doctor',
      render: (t) => (
        <div>
          <div className="text-sm font-medium text-[#263449] dark:text-slate-200">{t.department}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{t.doctorName}</div>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (t) => (
        <span
          className={`text-xs font-semibold ${
            t.priority === 'Urgent'
              ? 'text-red-600 dark:text-red-400'
              : t.priority === 'Priority'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          {t.priority}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => {
        const tone =
          t.status === 'Consulting'
            ? 'text-[#2563EB] dark:text-blue-400'
            : t.status === 'Completed'
            ? 'text-emerald-600 dark:text-emerald-400'
            : t.status === 'Cancelled'
            ? 'text-slate-400 dark:text-slate-500'
            : 'text-amber-600 dark:text-amber-400';
        const dot =
          t.status === 'Consulting'
            ? 'bg-[#2563EB]'
            : t.status === 'Completed'
            ? 'bg-emerald-500'
            : t.status === 'Cancelled'
            ? 'bg-slate-400'
            : 'bg-amber-500';
        return (
          <div>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${tone}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
              {t.status}
            </span>
            <div className="font-mono-num text-[11px] text-slate-400 mt-0.5">
              In {formatTimeShort(t.checkInTime)}
              {t.calledAt ? ` · Call ${formatTimeShort(t.calledAt)}` : ''}
            </div>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Queue Controls',
      align: 'right',
      render: (t) => (
        <div className="flex items-center justify-end gap-1.5">
          {t.status === 'Waiting' && (
            <>
              <button
                type="button"
                onClick={() => updateQueueStatus(t.id, 'Consulting')}
                className="inline-flex items-center gap-1 rounded-lg bg-[#2563EB] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
              >
                <Play className="h-3 w-3" />
                Start Consult
              </button>
              <button
                type="button"
                onClick={() => updateQueueStatus(t.id, 'Cancelled')}
                aria-label={`Cancel token ${t.tokenNumber}`}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancel
              </button>
            </>
          )}
          {t.status === 'Consulting' && (
            <button
              type="button"
              disabled={!canCompleteConsult}
              onClick={() => updateQueueStatus(t.id, 'Completed')}
              title={
                canCompleteConsult
                  ? 'Mark consultation completed'
                  : 'Doctor or Admin permission required to complete consultation'
              }
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
            >
              <CheckCircle2 className="h-3 w-3" />
              Complete
            </button>
          )}
          {(t.status === 'Completed' || t.status === 'Cancelled') && canDeleteToken && (
            <button
              type="button"
              onClick={() => deleteQueueToken(t.id)}
              aria-label={`Remove token ${t.tokenNumber}`}
              className="rounded-lg p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const statusTabs: ('All' | QueueStatus)[] = ['All', 'Waiting', 'Consulting', 'Completed', 'Cancelled'];

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#142D4E] dark:text-white">
            Token-Based Patient Queue
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Generate patient queue tokens, assign departments & physicians, and track real-time consultation status.
          </p>
        </div>

        <button
          type="button"
          onClick={openIssueModal}
          className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          Issue Queue Token
        </button>
      </div>

      {/* Live Queue Metrics & Estimated Wait */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span>Waiting Queue</span>
            <ListOrdered className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-[#142D4E] dark:text-white">
            {counts.waiting}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Patients awaiting call</div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span>In Consultation</span>
            <UserCheck className="h-4 w-4 text-[#2563EB]" />
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-[#142D4E] dark:text-white">
            {counts.consulting}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Currently with physician</div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span>Completed Visits</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-[#142D4E] dark:text-white">
            {counts.completed}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Finished queue tokens</div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span>Estimated Wait</span>
            <Clock className="h-4 w-4 text-[#16B8A6]" />
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-[#142D4E] dark:text-white">
            {waitEstimate.hasSufficientData ? `${waitEstimate.estimatedWaitMins} min` : 'N/A'}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {waitEstimate.hasSufficientData
              ? `Avg ${waitEstimate.avgConsultMins}m/visit (${waitEstimate.sampleCount} completed)`
              : 'Insufficient historical visit data'}
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-[#F4F7FB] dark:bg-slate-800/80 p-1">
          {statusTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-white dark:bg-slate-900 text-[#142D4E] dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-[#142D4E] dark:hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[230px] flex-1 sm:flex-initial">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search token, patient, doctor..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F4F7FB] dark:bg-slate-800 py-2 pl-9 pr-3 text-sm text-[#1E293B] dark:text-slate-100 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none"
            />
          </div>

          <select
            aria-label="Filter queue by department"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F4F7FB] dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100 focus:border-[#2563EB] focus:outline-none"
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                {d === 'All' ? 'All Departments' : d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Queue Table */}
      <DataTable
        columns={columns}
        data={filteredTokens}
        rowKey={(t) => t.id}
        emptyTitle="No queue tokens match your filters"
        emptyDescription="Issue a new patient queue token or clear the active search/department filter."
      />

      {/* Issue Queue Token Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Issue Patient Queue Token"
        subtitle="Automatically assigns the next sequential consultation token"
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleIssueSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-sm text-red-700 dark:text-red-300">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Select Patient *
            </label>
            <select
              value={formPatientId}
              onChange={(e) => setFormPatientId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100 focus:border-[#2563EB] focus:outline-none"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.id})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Assign Physician *
              </label>
              <select
                value={formDoctorId}
                onChange={(e) => handleDoctorChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100 focus:border-[#2563EB] focus:outline-none"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.availability})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Department *
              </label>
              <input
                type="text"
                value={formDepartment}
                onChange={(e) => setFormDepartment(e.target.value)}
                placeholder="e.g., Cardiology"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100 focus:border-[#2563EB] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Triage Priority
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Standard', 'Priority', 'Urgent'] as QueuePriority[]).map((prio) => (
                <button
                  key={prio}
                  type="button"
                  onClick={() => setFormPriority(prio)}
                  className={`rounded-lg border py-2 text-xs font-semibold transition-colors ${
                    formPriority === prio
                      ? prio === 'Urgent'
                        ? 'border-red-600 bg-red-600 text-white'
                        : 'border-[#2563EB] bg-[#2563EB] text-white'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {prio}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Visit Reason / Notes
            </label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Optional check-in notes or symptoms summary..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-slate-100 focus:border-[#2563EB] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Generate Token
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

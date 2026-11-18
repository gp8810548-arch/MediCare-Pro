import React, { useMemo, useState } from 'react';
import {
  MessageSquarePlus,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import { computeDepartmentSatisfaction } from '../services/dataService';
import { FeedbackCategory, PatientFeedback } from '../types/hospital';
import { PatientSatisfactionChart } from '../components/Charts';
import { DataTable, TableColumn } from '../components/DataTable';
import { ConfirmationDialog, Modal } from '../components/Modal';

const CATEGORIES: FeedbackCategory[] = [
  'Clinical Care',
  'Nursing & Support',
  'Front Desk & Queue',
  'Pharmacy & Lab',
  'Facility & Hygiene',
];

export const Feedback: React.FC = () => {
  const {
    feedbackList,
    patients,
    doctors,
    session,
    submitFeedback,
    deleteFeedback,
  } = useHospital();

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [ratingFilter, setRatingFilter] = useState<'All' | '5' | '4' | '3' | 'Low'>('All');

  // Submit Feedback Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [fPatientId, setFPatientId] = useState('');
  const [fDepartment, setFDepartment] = useState('Cardiology');
  const [fDoctorId, setFDoctorId] = useState('');
  const [fCategory, setFCategory] = useState<FeedbackCategory>('Clinical Care');
  const [fRating, setFRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [fComments, setFComments] = useState('');
  const [fError, setFError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<PatientFeedback | null>(null);

  const departments = useMemo(() => {
    const set = new Set<string>(['Cardiology', 'Neurology', 'Orthopedics', 'Internal Medicine', 'Emergency Care']);
    doctors.forEach((d) => set.add(d.department));
    feedbackList.forEach((f) => set.add(f.department));
    return Array.from(set);
  }, [doctors, feedbackList]);

  const deptSatisfaction = useMemo(
    () => computeDepartmentSatisfaction(feedbackList),
    [feedbackList]
  );

  const metrics = useMemo(() => {
    const count = feedbackList.length;
    const avg =
      count > 0
        ? Math.round((feedbackList.reduce((s, f) => s + f.rating, 0) / count) * 10) / 10
        : 0;
    const positivePct =
      count > 0
        ? Math.round((feedbackList.filter((f) => f.rating >= 4).length / count) * 100)
        : 0;
    const topDept = deptSatisfaction[0]?.department ?? '—';
    return { count, avg, positivePct, topDept };
  }, [feedbackList, deptSatisfaction]);

  const filteredFeedback = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return feedbackList.filter((f) => {
      if (departmentFilter !== 'All' && f.department !== departmentFilter) return false;
      if (ratingFilter === '5' && f.rating !== 5) return false;
      if (ratingFilter === '4' && f.rating !== 4) return false;
      if (ratingFilter === '3' && f.rating !== 3) return false;
      if (ratingFilter === 'Low' && f.rating > 2) return false;
      if (!q) return true;
      return (
        f.patientName.toLowerCase().includes(q) ||
        f.department.toLowerCase().includes(q) ||
        f.comments.toLowerCase().includes(q) ||
        (f.doctorName ?? '').toLowerCase().includes(q)
      );
    });
  }, [feedbackList, departmentFilter, ratingFilter, searchQuery]);

  const openModal = () => {
    setFPatientId(patients[0]?.id ?? '');
    setFDepartment(departments[0] ?? 'Cardiology');
    setFDoctorId('');
    setFCategory('Clinical Care');
    setFRating(5);
    setFComments('');
    setFError('');
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fPatientId || !fComments.trim()) {
      setFError('Please select a patient and provide feedback comments.');
      return;
    }
    const res = submitFeedback({
      patientId: fPatientId,
      department: fDepartment,
      doctorId: fDoctorId || undefined,
      category: fCategory,
      rating: fRating,
      comments: fComments,
    });
    if (!res.ok) {
      setFError(res.error || 'Could not submit feedback.');
      return;
    }
    setModalOpen(false);
  };

  const columns: TableColumn<PatientFeedback>[] = [
    {
      key: 'id',
      header: 'ID & Date',
      render: (f) => (
        <div>
          <div className="font-mono-num text-xs font-semibold text-[#142D4E] dark:text-slate-100">{f.id}</div>
          <div className="font-mono-num text-xs text-slate-500">{f.submittedDate}</div>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Patient & Department',
      render: (f) => (
        <div>
          <div className="text-sm font-semibold text-[#1E293B] dark:text-white">{f.patientName}</div>
          <div className="text-xs text-slate-500">
            {f.department}
            {f.doctorName ? ` · ${f.doctorName}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'rating',
      header: 'Rating & Category',
      render: (f) => (
        <div>
          <div className="flex items-center gap-0.5 text-amber-500">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`h-3.5 w-3.5 ${n <= f.rating ? 'fill-amber-400 text-amber-500' : 'text-slate-300 dark:text-slate-700'}`}
              />
            ))}
            <span className="ml-1.5 font-mono-num text-xs font-bold text-[#142D4E] dark:text-slate-100">
              {f.rating}.0
            </span>
          </div>
          <div className="text-[11px] text-slate-500">{f.category}</div>
        </div>
      ),
    },
    {
      key: 'comments',
      header: 'Comments',
      render: (f) => (
        <p className="max-w-md text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{f.comments}</p>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (f) =>
        session?.role === 'Admin' ? (
          <button
            type="button"
            onClick={() => setDeleteTarget(f)}
            aria-label={`Delete feedback ${f.id}`}
            className="rounded p-1.5 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : (
          <span className="text-xs text-slate-400">Logged</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#142D4E] dark:text-white">
            Patient Feedback &amp; Experience Analytics
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Collect patient experience ratings, qualitative comments, and department-wise satisfaction metrics.
          </p>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Submit Patient Feedback
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Average Satisfaction</p>
          <p className="mt-1 font-mono-num text-2xl font-bold text-[#142D4E] dark:text-white">
            {metrics.avg.toFixed(1)} <span className="text-sm font-normal text-slate-400">/ 5.0</span>
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Hospital-wide experience score</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Positive Feedback Rate</p>
          <p className="mt-1 font-mono-num text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {metrics.positivePct}%
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Ratings of 4★ or 5★</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Responses</p>
          <p className="mt-1 font-mono-num text-2xl font-bold text-[#2563EB] dark:text-blue-400">{metrics.count}</p>
          <p className="mt-0.5 text-xs text-slate-500">Across {deptSatisfaction.length} departments</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Highest Rated Dept</p>
          <p className="mt-1 font-display text-lg font-bold text-[#16B8A6] truncate">{metrics.topDept}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {deptSatisfaction[0] ? `${deptSatisfaction[0].avgRating}/5.0 avg` : 'No data yet'}
          </p>
        </div>
      </div>

      {/* Department Satisfaction Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h3 className="font-display text-sm font-bold text-[#142D4E] dark:text-white mb-3">
            Department-Wise Satisfaction Score
          </h3>
          <PatientSatisfactionChart data={deptSatisfaction} />
        </div>

        <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h3 className="font-display text-sm font-bold text-[#142D4E] dark:text-white mb-3">
            Department Score Breakdown
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {deptSatisfaction.map((row) => (
              <div key={row.department} className="flex items-center justify-between py-2.5 text-xs">
                <div>
                  <div className="font-semibold text-[#1E293B] dark:text-slate-100">{row.department}</div>
                  <div className="text-slate-500">{row.count} review(s)</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-[#16B8A6]"
                      style={{ width: `${Math.min(100, (row.avgRating / 5) * 100)}%` }}
                    />
                  </div>
                  <span className="font-mono-num font-bold text-[#142D4E] dark:text-white w-9 text-right">
                    {row.avgRating.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search comments, patient name, doctor..."
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-9 pr-3 text-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            aria-label="Filter by department"
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium"
          >
            <option value="All">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value as 'All' | '5' | '4' | '3' | 'Low')}
            aria-label="Filter by rating"
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium"
          >
            <option value="All">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="Low">1–2 Stars</option>
          </select>
        </div>
      </div>

      <DataTable
        data={filteredFeedback}
        columns={columns}
        rowKey={(f) => f.id}
        emptyTitle="No patient feedback matches filters"
        emptyDescription="Submit a new patient feedback entry or adjust filter selections."
      />

      {/* Submit Feedback Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Submit Patient Feedback"
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {fError && (
            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {fError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Patient *
              </label>
              <select
                value={fPatientId}
                onChange={(e) => setFPatientId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Department *
              </label>
              <select
                value={fDepartment}
                onChange={(e) => setFDepartment(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Attending Physician (Optional)
              </label>
              <select
                value={fDoctorId}
                onChange={(e) => setFDoctorId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="">General Department Feedback</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.department})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Feedback Category
              </label>
              <select
                value={fCategory}
                onChange={(e) => setFCategory(e.target.value as FeedbackCategory)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Experience Rating *
            </label>
            <div className="flex items-center gap-2">
              {([1, 2, 3, 4, 5] as const).map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFRating(star)}
                  className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    fRating === star
                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Star
                    className={`h-3.5 w-3.5 ${
                      star <= fRating ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
                    }`}
                  />
                  <span className="font-mono-num">{star}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Comments *
            </label>
            <textarea
              rows={3}
              required
              value={fComments}
              onChange={(e) => setFComments(e.target.value)}
              placeholder="Share patient remarks regarding care quality, communication, or waiting experience..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Submit Feedback
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteFeedback(deleteTarget.id);
        }}
        title="Remove Feedback Record"
        message={`Delete feedback ${deleteTarget?.id} from ${deleteTarget?.patientName}?`}
        confirmLabel="Delete"
      />
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  List,
  Plus,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import { DataTable, TableColumn } from '../components/DataTable';
import { ConfirmationDialog, Modal } from '../components/Modal';
import { Appointment, AppointmentStatus } from '../types/hospital';
import { detectAppointmentConflict, getTodayIso } from '../services/dataService';

const TIME_SLOTS = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
];

const STATUS_OPTIONS: ('All' | AppointmentStatus)[] = ['All', 'Scheduled', 'Pending', 'Completed', 'Cancelled'];

export const Appointments: React.FC = () => {
  const {
    appointments,
    patients,
    doctors,
    bookAppointment,
    rescheduleAppointment,
    updateAppointmentStatus,
  } = useHospital();

  const today = getTodayIso();
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | AppointmentStatus>('All');

  // Calendar Month State
  const initialDate = new Date(`${today}T00:00:00`);
  const [calYear, setCalYear] = useState(initialDate.getFullYear());
  const [calMonth, setCalMonth] = useState(initialDate.getMonth()); // 0-indexed
  const [selectedDayIso, setSelectedDayIso] = useState(today);

  // Booking Modal State
  const [bookOpen, setBookOpen] = useState(false);
  const [patientId, setPatientId] = useState(patients[0]?.id ?? '');
  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? '');
  const [bookDate, setBookDate] = useState(today);
  const [bookTime, setBookTime] = useState('10:00');
  const [reason, setReason] = useState('');
  const [bookStatus, setBookStatus] = useState<AppointmentStatus>('Scheduled');
  const [bookError, setBookError] = useState('');

  // Reschedule Modal State
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [resDate, setResDate] = useState('');
  const [resTime, setResTime] = useState('');
  const [resDoctorId, setResDoctorId] = useState('');
  const [resError, setResError] = useState('');

  // Cancel Confirmation
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);

  const filteredAppointments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return appointments
      .filter((a) => {
        const matchesQ =
          !q ||
          a.patientName.toLowerCase().includes(q) ||
          a.doctorName.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q) ||
          a.department.toLowerCase().includes(q);
        const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
        return matchesQ && matchesStatus;
      })
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }, [appointments, search, statusFilter]);

  // Live conflict preview in Booking Modal
  const liveBookConflict = useMemo(() => {
    if (!doctorId || !bookDate || !bookTime) return undefined;
    return detectAppointmentConflict(appointments, doctorId, bookDate, bookTime);
  }, [appointments, doctorId, bookDate, bookTime]);

  // Live conflict preview in Reschedule Modal
  const liveRescheduleConflict = useMemo(() => {
    if (!rescheduleTarget || !resDoctorId || !resDate || !resTime) return undefined;
    return detectAppointmentConflict(appointments, resDoctorId, resDate, resTime, rescheduleTarget.id);
  }, [appointments, rescheduleTarget, resDoctorId, resDate, resTime]);

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(calYear, calMonth, 1);
    const startWeekday = firstOfMonth.getDay(); // 0=Sun
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells: { iso: string | null; dayNum: number | null }[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ iso: null, dayNum: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ iso, dayNum: d });
    }
    return cells;
  }, [calYear, calMonth]);

  const monthLabel = new Date(calYear, calMonth, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const dayAppointments = useMemo(
    () =>
      filteredAppointments
        .filter((a) => a.date === selectedDayIso)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [filteredAppointments, selectedDayIso]
  );

  const openBookModal = (presetDate?: string) => {
    setPatientId(patients[0]?.id ?? '');
    setDoctorId(doctors[0]?.id ?? '');
    setBookDate(presetDate || selectedDayIso || today);
    setBookTime('10:00');
    setReason('');
    setBookStatus('Scheduled');
    setBookError('');
    setBookOpen(true);
  };

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBookError('');
    if (!patientId || !doctorId) {
      setBookError('Please select both a patient and a doctor.');
      return;
    }
    if (!reason.trim()) {
      setBookError('Please enter a consultation reason.');
      return;
    }
    const result = bookAppointment({
      patientId,
      doctorId,
      date: bookDate,
      time: bookTime,
      reason: reason.trim(),
      status: bookStatus,
    });
    if (!result.ok && result.error) {
      setBookError(result.error);
      return;
    }
    setSelectedDayIso(bookDate);
    setBookOpen(false);
  };

  const openReschedule = (apt: Appointment) => {
    setRescheduleTarget(apt);
    setResDate(apt.date);
    setResTime(apt.time);
    setResDoctorId(apt.doctorId);
    setResError('');
  };

  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleTarget) return;
    const result = rescheduleAppointment(rescheduleTarget.id, resDate, resTime, resDoctorId);
    if (!result.ok && result.error) {
      setResError(result.error);
      return;
    }
    setSelectedDayIso(resDate);
    setRescheduleTarget(null);
  };

  const getStatusTextClass = (status: AppointmentStatus) => {
    switch (status) {
      case 'Scheduled':
        return 'text-[#2563EB] bg-[#2563EB]/10';
      case 'Completed':
        return 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10';
      case 'Pending':
        return 'text-amber-700 dark:text-amber-400 bg-amber-500/10';
      case 'Cancelled':
        return 'text-rose-700 dark:text-rose-400 bg-rose-500/10';
    }
  };

  const columns: TableColumn<Appointment>[] = [
    {
      key: 'id',
      header: 'Appt ID',
      render: (a) => <span className="font-mono-num text-xs font-semibold text-[#2563EB]">{a.id}</span>,
    },
    {
      key: 'datetime',
      header: 'Date & Time',
      render: (a) => (
        <div>
          <div className="font-mono-num text-xs font-semibold text-[#142D4E] dark:text-white">
            {a.date}
          </div>
          <div className="font-mono-num text-xs text-slate-500">{a.time}</div>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Patient',
      render: (a) => (
        <div>
          <div className="font-medium">{a.patientName}</div>
          <div className="font-mono-num text-xs text-slate-400">{a.patientId}</div>
        </div>
      ),
    },
    {
      key: 'doctor',
      header: 'Physician',
      render: (a) => (
        <div>
          <div className="font-medium">{a.doctorName}</div>
          <div className="text-xs text-[#16B8A6]">{a.department}</div>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (a) => <span className="text-xs text-slate-600 dark:text-slate-300">{a.reason}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (a) => (
        <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${getStatusTextClass(a.status)}`}>
          {a.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (a) => (
        <div className="inline-flex items-center gap-1">
          {a.status !== 'Completed' && a.status !== 'Cancelled' && (
            <>
              <button
                type="button"
                title="Mark Completed"
                onClick={() => updateAppointmentStatus(a.id, 'Completed')}
                className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                <CheckCircle2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Reschedule"
                onClick={() => openReschedule(a)}
                className="rounded p-1.5 text-[#2563EB] hover:bg-blue-50 dark:hover:bg-blue-950/30"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Cancel Appointment"
                onClick={() => setCancelTarget(a)}
                className="rounded p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[210px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search appointments by patient, doctor, ID..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F4F7FB] dark:bg-slate-800 py-2 pl-9 pr-3 text-sm focus:border-[#2563EB] focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-[#F4F7FB] dark:bg-slate-800 p-1">
            {STATUS_OPTIONS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-white dark:bg-slate-900 text-[#142D4E] dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-[#142D4E] dark:hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-[#F4F7FB] dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-slate-900 text-[#142D4E] dark:text-white shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>Calendar</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-[#142D4E] dark:text-white shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>All History</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => openBookModal()}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>

      {/* Calendar View vs List View */}
      {viewMode === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Monthly Calendar Grid */}
          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-bold text-[#142D4E] dark:text-white">
                {monthLabel}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  aria-label="Previous month"
                  className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(`${today}T00:00:00`);
                    setCalYear(d.getFullYear());
                    setCalMonth(d.getMonth());
                    setSelectedDayIso(today);
                  }}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  aria-label="Next month"
                  className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((cell, idx) => {
                if (!cell.iso || !cell.dayNum) {
                  return <div key={`empty-${idx}`} className="h-16 rounded-lg bg-slate-50/40 dark:bg-slate-800/20" />;
                }
                const dayCount = filteredAppointments.filter((a) => a.date === cell.iso).length;
                const isSelected = cell.iso === selectedDayIso;
                const isToday = cell.iso === today;

                return (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => setSelectedDayIso(cell.iso!)}
                    className={`h-16 rounded-lg border p-2 text-left flex flex-col justify-between transition-colors ${
                      isSelected
                        ? 'border-[#2563EB] bg-[#2563EB]/8 dark:bg-[#2563EB]/20'
                        : 'border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span
                      className={`font-mono-num text-xs font-semibold ${
                        isToday
                          ? 'text-[#2563EB]'
                          : isSelected
                            ? 'text-[#142D4E] dark:text-white'
                            : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {cell.dayNum}
                    </span>
                    {dayCount > 0 && (
                      <span className="font-mono-num text-[11px] font-semibold text-[#16B8A6]">
                        {dayCount} appt{dayCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Schedule Panel */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-display text-base font-bold text-[#142D4E] dark:text-white">
                  Schedule · <span className="font-mono-num">{selectedDayIso}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {dayAppointments.length} appointment(s) on selected date
                </p>
              </div>
              <button
                type="button"
                onClick={() => openBookModal(selectedDayIso)}
                className="text-xs font-semibold text-[#2563EB] hover:underline whitespace-nowrap"
              >
                + Add Slot
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 flex-1">
              {dayAppointments.length === 0 ? (
                <div className="py-12 text-center">
                  <CalendarClock className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    No appointments scheduled for {selectedDayIso}.
                  </p>
                </div>
              ) : (
                dayAppointments.map((apt) => (
                  <div key={apt.id} className="py-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono-num text-xs font-bold text-[#142D4E] dark:text-white">
                            {apt.time}
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">·</span>
                          <span className="text-sm font-semibold text-[#263449] dark:text-slate-100">
                            {apt.patientName}
                          </span>
                        </div>
                        <p className="text-xs text-[#16B8A6] font-medium">
                          {apt.doctorName} · {apt.department}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{apt.reason}</p>
                      </div>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-semibold shrink-0 ${getStatusTextClass(
                          apt.status
                        )}`}
                      >
                        {apt.status}
                      </span>
                    </div>

                    {apt.status !== 'Completed' && apt.status !== 'Cancelled' && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => updateAppointmentStatus(apt.id, 'Completed')}
                          className="rounded border border-emerald-200 dark:border-emerald-900 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        >
                          Complete
                        </button>
                        <button
                          type="button"
                          onClick={() => openReschedule(apt)}
                          className="rounded border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          Reschedule
                        </button>
                        <button
                          type="button"
                          onClick={() => setCancelTarget(apt)}
                          className="rounded border border-rose-200 dark:border-rose-900 px-2.5 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredAppointments}
          rowKey={(a) => a.id}
          emptyTitle="No appointments match your filter"
          emptyDescription="Book an appointment or adjust your status filter."
        />
      )}

      {/* Book Appointment Modal */}
      <Modal
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        title="Book New Appointment"
        subtitle="Automatic conflict detection prevents double-booking any physician slot"
      >
        <form onSubmit={handleBookSubmit} className="space-y-4">
          {(bookError || liveBookConflict) && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                {bookError ||
                  `Conflict detected: ${liveBookConflict?.doctorName} is already booked with ${liveBookConflict?.patientName} on ${liveBookConflict?.date} at ${liveBookConflict?.time}. Please choose another slot.`}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Patient *
              </label>
              <select
                required
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Doctor *
              </label>
              <select
                required
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {d.specialization} ({d.availability})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={bookDate}
                onChange={(e) => setBookDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Time Slot *
              </label>
              <select
                value={bookTime}
                onChange={(e) => setBookTime(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-num focus:border-[#2563EB] focus:outline-none"
              >
                {TIME_SLOTS.map((slot) => {
                  const taken = detectAppointmentConflict(appointments, doctorId, bookDate, slot);
                  return (
                    <option key={slot} value={slot}>
                      {slot} {taken ? '(Booked)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Consultation Reason *
              </label>
              <input
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Cardiology follow-up evaluation"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Initial Status
              </label>
              <select
                value={bookStatus}
                onChange={(e) => setBookStatus(e.target.value as AppointmentStatus)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none"
              >
                <option value="Scheduled">Scheduled</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setBookOpen(false)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={Boolean(liveBookConflict)}
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Booking
            </button>
          </div>
        </form>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        open={Boolean(rescheduleTarget)}
        onClose={() => setRescheduleTarget(null)}
        title={`Reschedule · ${rescheduleTarget?.id ?? ''}`}
        subtitle={rescheduleTarget ? `Patient: ${rescheduleTarget.patientName}` : undefined}
      >
        <form onSubmit={handleRescheduleSubmit} className="space-y-4">
          {(resError || liveRescheduleConflict) && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                {resError ||
                  `Conflict detected: ${liveRescheduleConflict?.doctorName} already has an appointment at ${liveRescheduleConflict?.date} ${liveRescheduleConflict?.time}.`}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Physician
            </label>
            <select
              value={resDoctorId}
              onChange={(e) => setResDoctorId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} · {d.specialization}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                New Date
              </label>
              <input
                type="date"
                required
                value={resDate}
                onChange={(e) => setResDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                New Time
              </label>
              <select
                value={resTime}
                onChange={(e) => setResTime(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-num"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setRescheduleTarget(null)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={Boolean(liveRescheduleConflict)}
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Save New Time
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => {
          if (cancelTarget) updateAppointmentStatus(cancelTarget.id, 'Cancelled');
        }}
        title="Cancel Appointment"
        message={`Cancel appointment ${cancelTarget?.id} for ${cancelTarget?.patientName} with ${cancelTarget?.doctorName} on ${cancelTarget?.date} at ${cancelTarget?.time}?`}
        confirmLabel="Cancel Appointment"
      />
    </div>
  );
};

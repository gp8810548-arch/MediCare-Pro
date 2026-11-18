import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BedDouble,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock,
  ListOrdered,
  LogOut,
  Play,
  Radio,
  ShieldAlert,
  Stethoscope,
  UserPlus,
  Users,
} from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import { computeBedOccupancyByWard, computeQueueWaitEstimate, getTodayIso } from '../services/dataService';
import { DataTable, TableColumn } from '../components/DataTable';
import { QueueToken } from '../types/hospital';

export const CommandCentre: React.FC = () => {
  const {
    patients,
    doctors,
    appointments,
    wards,
    beds,
    queueTokens,
    emergencyCases,
    discharges,
    notifications,
    allowedPages,
    session,
    setActivePage,
    updateQueueStatus,
  } = useHospital();

  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const today = getTodayIso();

  const departments = useMemo(() => {
    const set = new Set<string>();
    doctors.forEach((d) => set.add(d.department));
    queueTokens.forEach((q) => set.add(q.department));
    return ['All', ...Array.from(set).sort()];
  }, [doctors, queueTokens]);

  const metrics = useMemo(() => {
    const availableDoctors = doctors.filter(
      (d) =>
        d.availability === 'Available' &&
        (selectedDepartment === 'All' || d.department === selectedDepartment)
    );
    const totalDeptDoctors = doctors.filter(
      (d) => selectedDepartment === 'All' || d.department === selectedDepartment
    );

    const occupiedBeds = beds.filter((b) => b.status === 'Occupied').length;
    const occupancyPct = beds.length > 0 ? Math.round((occupiedBeds / beds.length) * 100) : 0;

    const waitingQueue = queueTokens.filter(
      (t) =>
        t.status === 'Waiting' &&
        (selectedDepartment === 'All' || t.department === selectedDepartment)
    );
    const activeEmergencies = emergencyCases.filter((e) => e.treatmentStatus !== 'Discharged');
    const criticalEmergencyCount = activeEmergencies.filter(
      (e) => e.priority === 'Critical' || e.priority === 'High'
    ).length;

    const upcomingApts = appointments.filter(
      (a) =>
        (a.status === 'Scheduled' || a.status === 'Pending') &&
        a.date >= today &&
        (selectedDepartment === 'All' || a.department === selectedDepartment)
    );

    const pendingDischargeQueue = discharges.filter((d) => d.status !== 'Completed');

    const criticalAlerts = notifications.filter(
      (n) => n.severity === 'critical' || n.severity === 'warning'
    );

    return {
      totalPatients: patients.length,
      availableDoctorsCount: availableDoctors.length,
      totalDoctorsCount: totalDeptDoctors.length,
      emergencyCount: activeEmergencies.length,
      criticalEmergencyCount,
      occupiedBeds,
      totalBeds: beds.length,
      occupancyPct,
      waitingCount: waitingQueue.length,
      upcomingAppointmentsCount: upcomingApts.length,
      pendingDischargesCount: pendingDischargeQueue.length,
      awaitingDoctorSignoff: pendingDischargeQueue.filter((d) => d.doctorApproval === 'Pending').length,
      criticalAlertsCount: criticalAlerts.length,
      waitingQueue,
      criticalAlerts,
      upcomingApts,
    };
  }, [patients.length, doctors, beds, queueTokens, emergencyCases, discharges, appointments, notifications, selectedDepartment, today]);

  const waitEstimate = useMemo(
    () => computeQueueWaitEstimate(queueTokens, selectedDepartment),
    [queueTokens, selectedDepartment]
  );

  const wardBreakdown = useMemo(() => computeBedOccupancyByWard(wards, beds), [wards, beds]);

  const activeQueueRows = useMemo(() => {
    return queueTokens
      .filter(
        (t) =>
          (t.status === 'Waiting' || t.status === 'Consulting') &&
          (selectedDepartment === 'All' || t.department === selectedDepartment)
      )
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'Consulting' ? -1 : 1;
        const prioOrder = { Urgent: 0, Priority: 1, Standard: 2 };
        if (prioOrder[a.priority] !== prioOrder[b.priority]) {
          return prioOrder[a.priority] - prioOrder[b.priority];
        }
        return a.checkInTime.localeCompare(b.checkInTime);
      });
  }, [queueTokens, selectedDepartment]);

  const canCompleteConsult = session?.role !== 'Receptionist';

  const queueColumns: TableColumn<QueueToken>[] = [
    {
      key: 'token',
      header: 'Token',
      render: (t) => (
        <div>
          <span className="font-mono-num text-sm font-bold text-[#142D4E] dark:text-white">
            {t.tokenNumber}
          </span>
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {t.priority}
          </div>
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
      key: 'doctor',
      header: 'Doctor & Dept',
      render: (t) => (
        <div>
          <div className="text-sm text-[#263449] dark:text-slate-200">{t.doctorName}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{t.department}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => (
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
            t.status === 'Consulting'
              ? 'text-[#2563EB] dark:text-blue-400'
              : t.priority === 'Urgent'
              ? 'text-red-600 dark:text-red-400'
              : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              t.status === 'Consulting'
                ? 'bg-[#2563EB]'
                : t.priority === 'Urgent'
                ? 'bg-red-500'
                : 'bg-amber-500'
            }`}
          />
          {t.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Quick Action',
      align: 'right',
      render: (t) => (
        <div className="flex items-center justify-end gap-2">
          {t.status === 'Waiting' && (
            <button
              type="button"
              onClick={() => updateQueueStatus(t.id, 'Consulting')}
              className="inline-flex items-center gap-1 rounded-lg bg-[#2563EB] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Play className="h-3 w-3" />
              Call
            </button>
          )}
          {t.status === 'Consulting' && canCompleteConsult && (
            <button
              type="button"
              onClick={() => updateQueueStatus(t.id, 'Completed')}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0"
            >
              <CheckCircle2 className="h-3 w-3" />
              Complete
            </button>
          )}
        </div>
      ),
    },
  ];

  const kpiCards = [
    {
      label: 'Total Patients',
      value: metrics.totalPatients,
      sub: 'Registered active profiles',
      icon: Users,
      tone: 'text-[#2563EB] bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400',
      page: 'patients' as const,
    },
    {
      label: 'Available Doctors',
      value: `${metrics.availableDoctorsCount} / ${metrics.totalDoctorsCount}`,
      sub: 'Physicians ready on shift',
      icon: Stethoscope,
      tone: 'text-[#16B8A6] bg-teal-50 dark:bg-teal-950/50 dark:text-teal-400',
      page: 'doctors' as const,
    },
    {
      label: 'Emergency Cases',
      value: metrics.emergencyCount,
      sub: `${metrics.criticalEmergencyCount} critical/high priority active`,
      icon: ShieldAlert,
      tone:
        metrics.emergencyCount > 0
          ? 'text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400'
          : 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300',
      page: 'emergency' as const,
    },
    {
      label: 'Bed Occupancy',
      value: `${metrics.occupancyPct}%`,
      sub: `${metrics.occupiedBeds} of ${metrics.totalBeds} beds occupied`,
      icon: BedDouble,
      tone:
        metrics.occupancyPct >= 85
          ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400'
          : 'text-[#142D4E] bg-slate-100 dark:bg-slate-800 dark:text-slate-200',
      page: 'beds' as const,
    },
    {
      label: 'Patients Waiting',
      value: metrics.waitingCount,
      sub: waitEstimate.hasSufficientData
        ? `Est. wait ~${waitEstimate.estimatedWaitMins} mins (${waitEstimate.sampleCount} samples)`
        : 'Wait estimate: insufficient history',
      icon: ListOrdered,
      tone: 'text-[#2563EB] bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400',
      page: 'queue' as const,
    },
    {
      label: 'Upcoming Appointments',
      value: metrics.upcomingAppointmentsCount,
      sub: 'Scheduled or pending from today',
      icon: CalendarClock,
      tone: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-400',
      page: 'appointments' as const,
    },
    {
      label: 'Pending Discharges',
      value: metrics.pendingDischargesCount,
      sub: `${metrics.awaitingDoctorSignoff} awaiting physician approval`,
      icon: LogOut,
      tone:
        metrics.pendingDischargesCount > 0
          ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400'
          : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400',
      page: 'discharge' as const,
    },
    {
      label: 'Critical Hospital Alerts',
      value: metrics.criticalAlertsCount,
      sub: 'Stock, expiry & clinical warnings',
      icon: BellRing,
      tone:
        metrics.criticalAlertsCount > 0
          ? 'text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400'
          : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400',
      page: 'notifications' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#16B8A6]">
            <Radio className="h-4 w-4" />
            <span>Operational Command Centre</span>
          </div>
          <h2 className="font-display text-xl font-bold text-[#142D4E] dark:text-white">
            Hospital Live Capacity & Operations
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time operational metrics synthesized across patient queue, beds, physicians, appointments, and pharmacy alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Filter Command Centre by department"
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F4F7FB] dark:bg-slate-800 px-3 py-2 text-sm font-medium text-[#1E293B] dark:text-slate-100 focus:border-[#2563EB] focus:outline-none"
          >
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept === 'All' ? 'All Departments' : dept}
              </option>
            ))}
          </select>

          {allowedPages.includes('queue') && (
            <button
              type="button"
              onClick={() => setActivePage('queue')}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
            >
              <ListOrdered className="h-4 w-4" />
              Open Token Queue
            </button>
          )}
          {allowedPages.includes('patients') && (
            <button
              type="button"
              onClick={() => setActivePage('patients')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm font-semibold text-[#142D4E] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              <UserPlus className="h-4 w-4" />
              Patients
            </button>
          )}
        </div>
      </div>

      {/* 8 Operational KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          const canNavigate = allowedPages.includes(card.page);
          return (
            <div key={card.label}>
              <button
                type="button"
                disabled={!canNavigate}
                onClick={() => canNavigate && setActivePage(card.page)}
                className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all disabled:cursor-default group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {card.label}
                    </p>
                    <div className="mt-2 font-mono-num text-2xl font-bold text-[#142D4E] dark:text-white">
                      {card.value}
                    </div>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${card.tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="truncate">{card.sub}</span>
                  {canNavigate && (
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:translate-x-0.5 group-hover:opacity-100 transition-all" />
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left 2 cols: Active Queue Monitor & Ward Bed Occupancy */}
        <div className="xl:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-[#142D4E] dark:text-white">
                  Active Patient Queue
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Priority order (Urgent → Priority → Standard) with live token status progression
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5 font-mono-num">
                  <Clock className="h-3.5 w-3.5 text-[#16B8A6]" />
                  {waitEstimate.hasSufficientData
                    ? `Avg consult ${waitEstimate.avgConsultMins}m · Est. wait ~${waitEstimate.estimatedWaitMins}m`
                    : 'Estimated wait unavailable (< 2 completed visits)'}
                </span>
              </div>
            </div>

            <DataTable
              columns={queueColumns}
              data={activeQueueRows.slice(0, 6)}
              rowKey={(t) => t.id}
              emptyTitle="Queue is currently clear"
              emptyDescription="No patients are waiting or in consultation for the selected department."
            />

            {activeQueueRows.length > 0 && allowedPages.includes('queue') && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setActivePage('queue')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:underline"
                >
                  Manage full patient queue ({queueTokens.length} total tokens)
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Ward Bed Occupancy Matrix */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-[#142D4E] dark:text-white">
                  Ward Capacity & Pending Discharges
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Real-time bed allocation across inpatient hospital wards
                </p>
              </div>
              {allowedPages.includes('beds') && (
                <button
                  type="button"
                  onClick={() => setActivePage('beds')}
                  className="text-xs font-semibold text-[#2563EB] hover:underline whitespace-nowrap shrink-0"
                >
                  Open Beds & Wards
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {wardBreakdown.map((w) => {
                const total = w.available + w.occupied + w.reserved;
                const pct = total > 0 ? Math.round((w.occupied / total) * 100) : 0;
                return (
                  <div
                    key={w.ward}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900/60 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-semibold text-[#142D4E] dark:text-white truncate">{w.ward}</span>
                      <span className="font-mono-num text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {w.occupied}/{total} ({pct}%)
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className={`h-full transition-all ${
                          pct >= 85 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-500' : 'bg-[#16B8A6]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono-num">
                      <span>Available: {w.available}</span>
                      <span>Reserved: {w.reserved}</span>
                      <span>Occupied: {w.occupied}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Critical Alerts & Upcoming Appointments */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h3 className="font-display text-base font-bold text-[#142D4E] dark:text-white">
                  Critical Hospital Alerts
                </h3>
              </div>
              <span className="font-mono-num text-xs font-semibold text-slate-500 dark:text-slate-400">
                {metrics.criticalAlertsCount} active
              </span>
            </div>

            {metrics.criticalAlerts.length === 0 ? (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                No critical inventory or clinical alerts at this time.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {metrics.criticalAlerts.slice(0, 6).map((alert) => {
                  const canOpen = allowedPages.includes(alert.targetPage);
                  return (
                    <li key={alert.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-semibold ${
                              alert.severity === 'critical'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {alert.category} · {alert.severity.toUpperCase()}
                          </p>
                          <p className="mt-0.5 text-sm font-medium text-[#1E293B] dark:text-slate-100">
                            {alert.title}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {alert.message}
                          </p>
                        </div>
                        {canOpen && (
                          <button
                            type="button"
                            onClick={() => setActivePage(alert.targetPage)}
                            className="rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs font-semibold text-[#2563EB] hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0"
                          >
                            Review
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold text-[#142D4E] dark:text-white">
                Upcoming Appointments
              </h3>
              {allowedPages.includes('appointments') && (
                <button
                  type="button"
                  onClick={() => setActivePage('appointments')}
                  className="text-xs font-semibold text-[#2563EB] hover:underline"
                >
                  View all
                </button>
              )}
            </div>

            {metrics.upcomingApts.length === 0 ? (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                No upcoming scheduled appointments in this view.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {metrics.upcomingApts.slice(0, 5).map((apt) => (
                  <li key={apt.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#1E293B] dark:text-slate-100 truncate">
                        {apt.patientName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {apt.doctorName} · {apt.department}
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-mono-num">
                      <div className="text-xs font-semibold text-[#142D4E] dark:text-white">{apt.time}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{apt.date}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

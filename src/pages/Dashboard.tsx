import React, { useMemo } from 'react';
import {
  ArrowRight,
  BedDouble,
  Bell,
  CalendarClock,
  Clock,
  DollarSign,
  HeartPulse,
  Plus,
  Stethoscope,
  Users,
} from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import { StatCard } from '../components/StatCard';
import {
  AppointmentStatusChart,
  BedOccupancyChart,
  DepartmentBarChart,
  PatientRegistrationChart,
  RevenueAnalyticsChart,
} from '../components/Charts';
import {
  ASSET_IMAGES,
  computeBedOccupancyByWard,
  computeDepartmentStats,
  computeMonthlyRegistrations,
  computeMonthlyRevenue,
  formatCurrency,
  getTodayIso,
} from '../services/dataService';

export const Dashboard: React.FC = () => {
  const {
    session,
    patients,
    doctors,
    appointments,
    wards,
    beds,
    invoices,
    activities,
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    setActivePage,
    allowedPages,
    settings,
  } = useHospital();

  const today = getTodayIso();

  const stats = useMemo(() => {
    const todaysAppointments = appointments.filter((a) => a.date === today && a.status !== 'Cancelled').length;
    const availableBeds = beds.filter((b) => b.status === 'Available').length;
    const totalCollected = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const totalPending = invoices.reduce((sum, inv) => sum + Math.max(0, inv.totalAmount - inv.paidAmount), 0);

    return {
      totalPatients: patients.length,
      totalDoctors: doctors.length,
      todaysAppointments,
      availableBeds,
      totalBeds: beds.length,
      monthlyRevenue: totalCollected,
      pendingPayments: totalPending,
      pendingInvoiceCount: invoices.filter((i) => i.paymentStatus !== 'Paid').length,
    };
  }, [patients.length, doctors.length, appointments, beds, invoices, today]);

  // 100% Data-driven chart series computed from live stored records
  const registrationChartData = useMemo(() => computeMonthlyRegistrations(patients, 6), [patients]);
  const revenueChartData = useMemo(() => computeMonthlyRevenue(invoices, 6), [invoices]);
  const departmentStats = useMemo(() => computeDepartmentStats(appointments, doctors), [appointments, doctors]);
  const bedOccupancyData = useMemo(() => computeBedOccupancyByWard(wards, beds), [wards, beds]);

  const appointmentStatusData = useMemo(() => {
    const countOf = (status: string) => appointments.filter((a) => a.status === status).length;
    return [
      { name: 'Scheduled', value: countOf('Scheduled'), color: '#2563EB' },
      { name: 'Completed', value: countOf('Completed'), color: '#16A34A' },
      { name: 'Pending', value: countOf('Pending'), color: '#F59E0B' },
      { name: 'Cancelled', value: countOf('Cancelled'), color: '#EF4444' },
    ].filter((d) => d.value > 0);
  }, [appointments]);

  const recentPatients = useMemo(
    () => [...patients].sort((a, b) => b.registrationDate.localeCompare(a.registrationDate)).slice(0, 5),
    [patients]
  );

  const upcomingAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.date >= today && a.status !== 'Cancelled' && a.status !== 'Completed')
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
        .slice(0, 5),
    [appointments, today]
  );

  const canOpen = (page: Parameters<typeof setActivePage>[0]) => allowedPages.includes(page);

  return (
    <div className="space-y-6">
      {/* Premium 3D Welcome Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#142D4E] via-[#1B3A63] to-[#133554] text-white p-6 sm:p-7 border border-slate-200/10 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-medium text-[#16B8A6]">
              <HeartPulse className="h-4 w-4" />
              <span>{settings.hospitalName} · {today}</span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white leading-snug [text-wrap:balance]">
              Welcome back, {session?.name ?? 'Administrator'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              You have <span className="font-semibold text-white tabular-nums">{stats.todaysAppointments}</span> scheduled appointments today, <span className="font-semibold text-[#16B8A6] tabular-nums">{stats.availableBeds}</span> available hospital beds across {wards.length} wards, and <span className="font-semibold text-white tabular-nums">{unreadNotificationCount}</span> active operational alerts.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {canOpen('patients') && (
                <button
                  type="button"
                  onClick={() => setActivePage('patients')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-600 active:scale-[0.98] transition-all whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Register Patient</span>
                </button>
              )}
              {canOpen('appointments') && (
                <button
                  type="button"
                  onClick={() => setActivePage('appointments')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/15 active:scale-[0.98] transition-all whitespace-nowrap"
                >
                  <CalendarClock className="h-3.5 w-3.5 text-[#16B8A6]" />
                  <span>Book Appointment</span>
                </button>
              )}
              {canOpen('beds') && (
                <button
                  type="button"
                  onClick={() => setActivePage('beds')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/15 active:scale-[0.98] transition-all whitespace-nowrap"
                >
                  <BedDouble className="h-3.5 w-3.5 text-[#16B8A6]" />
                  <span>Ward Occupancy</span>
                </button>
              )}
            </div>
          </div>

          {/* 3D Glass Shield & Telemetry Visual */}
          <div className="relative hidden sm:flex items-center justify-center shrink-0 perspective-1000">
            <div className="relative h-36 w-36 lg:h-40 lg:w-40 rounded-2xl overflow-hidden border border-white/20 shadow-2xl animate-float-slow">
              <img
                src={ASSET_IMAGES.dashboard3dGraphic}
                alt="3D Healthcare Telemetry Shield"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* KPI Overview Row (6 Animated Statistics Cards) */}
      <section aria-label="Hospital Key Metrics" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        <StatCard
          label="Total Patients"
          value={stats.totalPatients}
          numericValue={stats.totalPatients}
          detail="Active registered profiles"
          icon={Users}
          tone="blue"
          onClick={canOpen('patients') ? () => setActivePage('patients') : undefined}
        />
        <StatCard
          label="Total Doctors"
          value={stats.totalDoctors}
          numericValue={stats.totalDoctors}
          detail={`${doctors.filter((d) => d.availability === 'Available').length} available on shift`}
          icon={Stethoscope}
          tone="teal"
          onClick={canOpen('doctors') ? () => setActivePage('doctors') : undefined}
        />
        <StatCard
          label="Today's Appointments"
          value={stats.todaysAppointments}
          numericValue={stats.todaysAppointments}
          detail={`Scheduled for ${today}`}
          icon={CalendarClock}
          tone="navy"
          onClick={canOpen('appointments') ? () => setActivePage('appointments') : undefined}
        />
        <StatCard
          label="Available Beds"
          value={`${stats.availableBeds} / ${stats.totalBeds}`}
          numericValue={stats.availableBeds}
          suffix={` / ${stats.totalBeds}`}
          detail={`${beds.filter((b) => b.status === 'Occupied').length} occupied · ${beds.filter((b) => b.status === 'Reserved').length} reserved`}
          icon={BedDouble}
          tone="teal"
          onClick={canOpen('beds') ? () => setActivePage('beds') : undefined}
        />
        <StatCard
          label="Collected Revenue"
          value={formatCurrency(stats.monthlyRevenue, settings.currencySymbol)}
          numericValue={stats.monthlyRevenue}
          formatter={(n) => formatCurrency(n, settings.currencySymbol)}
          detail="Sum of paid invoice amounts"
          icon={DollarSign}
          tone="blue"
          onClick={canOpen('billing') ? () => setActivePage('billing') : undefined}
        />
        <StatCard
          label="Pending Payments"
          value={formatCurrency(stats.pendingPayments, settings.currencySymbol)}
          numericValue={stats.pendingPayments}
          formatter={(n) => formatCurrency(n, settings.currencySymbol)}
          detail={`${stats.pendingInvoiceCount} open invoice(s)`}
          icon={Clock}
          tone="amber"
          onClick={canOpen('billing') ? () => setActivePage('billing') : undefined}
        />
      </section>

      {/* Primary Data-Driven Charts Row */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="font-display text-base font-bold text-[#142D4E] dark:text-white">
                Patient Registrations (6 Months)
              </h2>
              <p className="text-xs text-[#64748B] dark:text-slate-400">
                Computed directly from patient registration dates
              </p>
            </div>
            {canOpen('reports') && (
              <button
                type="button"
                onClick={() => setActivePage('reports')}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] hover:underline whitespace-nowrap"
              >
                <span>Full Analytics</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <PatientRegistrationChart data={registrationChartData} />
        </div>

        <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="font-display text-base font-bold text-[#142D4E] dark:text-white">
                Revenue & Receivables
              </h2>
              <p className="text-xs text-[#64748B] dark:text-slate-400">
                Collected vs. pending balances from hospital invoices
              </p>
            </div>
            {canOpen('billing') && (
              <button
                type="button"
                onClick={() => setActivePage('billing')}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] hover:underline whitespace-nowrap"
              >
                <span>Open Billing</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <RevenueAnalyticsChart data={revenueChartData} />
        </div>
      </section>

      {/* Bed Occupancy & Department Analytics Row */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="font-display text-base font-bold text-[#142D4E] dark:text-white">
                Bed Occupancy by Ward
              </h2>
              <p className="text-xs text-[#64748B] dark:text-slate-400">
                Available (Green), Occupied (Red), and Reserved (Amber)
              </p>
            </div>
            {canOpen('beds') && (
              <button
                type="button"
                onClick={() => setActivePage('beds')}
                className="text-xs font-medium text-[#2563EB] hover:underline whitespace-nowrap"
              >
                Manage Wards
              </button>
            )}
          </div>
          <BedOccupancyChart data={bedOccupancyData} />
        </div>

        <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="font-display text-base font-bold text-[#142D4E] dark:text-white">
                Department Workload
              </h2>
              <p className="text-xs text-[#64748B] dark:text-slate-400">
                Total scheduled & completed visits per clinical department
              </p>
            </div>
            {canOpen('doctors') && (
              <button
                type="button"
                onClick={() => setActivePage('doctors')}
                className="text-xs font-medium text-[#2563EB] hover:underline whitespace-nowrap"
              >
                View Doctors
              </button>
            )}
          </div>
          <DepartmentBarChart data={departmentStats} />
        </div>
      </section>

      {/* Secondary Row: Appointment Stats, Upcoming Appointments, Recent Registrations */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h2 className="font-display text-base font-bold text-[#142D4E] dark:text-white">
            Appointment Analytics
          </h2>
          <p className="text-xs text-[#64748B] dark:text-slate-400">
            Live breakdown across all statuses
          </p>
          <AppointmentStatusChart data={appointmentStatusData} />
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
            {appointmentStatusData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <span
                    className="h-2.5 w-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span>{item.name}</span>
                </span>
                <span className="font-mono-num font-semibold text-[#142D4E] dark:text-white">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="font-display text-base font-bold text-[#142D4E] dark:text-white">
                Upcoming Appointments
              </h2>
              <p className="text-xs text-[#64748B] dark:text-slate-400">Next scheduled visits</p>
            </div>
            {canOpen('appointments') && (
              <button
                type="button"
                onClick={() => setActivePage('appointments')}
                className="text-xs font-medium text-[#2563EB] hover:underline whitespace-nowrap"
              >
                Manage
              </button>
            )}
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 flex-1">
            {upcomingAppointments.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                No upcoming appointments scheduled.
              </p>
            ) : (
              upcomingAppointments.map((apt) => (
                <div key={apt.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1E293B] dark:text-slate-100 truncate">
                      {apt.patientName}
                    </p>
                    <p className="text-xs text-[#64748B] dark:text-slate-400 truncate">
                      {apt.doctorName} · {apt.department}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono-num text-xs font-semibold text-[#142D4E] dark:text-slate-200">
                      {apt.time}
                    </div>
                    <div className="font-mono-num text-[11px] text-slate-400">{apt.date}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="font-display text-base font-bold text-[#142D4E] dark:text-white">
                Recent Patient Registrations
              </h2>
              <p className="text-xs text-[#64748B] dark:text-slate-400">Latest patient intake</p>
            </div>
            {canOpen('patients') && (
              <button
                type="button"
                onClick={() => setActivePage('patients')}
                className="text-xs font-medium text-[#2563EB] hover:underline whitespace-nowrap"
              >
                View All
              </button>
            )}
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 flex-1">
            {recentPatients.map((patient) => (
              <div key={patient.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2563EB]/10 text-xs font-bold text-[#2563EB]">
                    {patient.fullName
                      .split(' ')
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join('')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1E293B] dark:text-slate-100 truncate">
                      {patient.fullName}
                    </p>
                    <p className="text-xs text-[#64748B] dark:text-slate-400 truncate">
                      {patient.id} · {patient.age}y · {patient.bloodGroup}
                    </p>
                  </div>
                </div>
                <div className="font-mono-num text-xs text-slate-400 shrink-0">
                  {patient.registrationDate}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom Row: Notification Centre & Recent Patient Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#2563EB]" />
              <h2 className="font-display text-base font-bold text-[#142D4E] dark:text-white">
                Notification Centre
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setActivePage('notifications')}
              className="text-xs font-medium text-[#2563EB] hover:underline whitespace-nowrap"
            >
              View All ({unreadNotificationCount} unread)
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.slice(0, 5).map((n) => (
              <div key={n.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`font-semibold ${
                        n.severity === 'critical'
                          ? 'text-rose-600 dark:text-rose-400'
                          : n.severity === 'warning'
                            ? 'text-amber-600 dark:text-amber-400'
                            : n.severity === 'success'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-[#2563EB]'
                      }`}
                    >
                      {n.category}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="font-mono-num text-slate-400">{n.timestamp}</span>
                    {!n.read && (
                      <>
                        <span className="text-slate-300 dark:text-slate-700">·</span>
                        <span className="font-semibold text-[#16B8A6]">Unread</span>
                      </>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-medium text-[#1E293B] dark:text-slate-100">
                    {n.title}
                  </p>
                  <p className="text-xs text-[#64748B] dark:text-slate-400">{n.message}</p>
                </div>
                {!n.read && (
                  <button
                    type="button"
                    onClick={() => markNotificationRead(n.id)}
                    className="shrink-0 text-xs font-medium text-slate-500 hover:text-[#2563EB]"
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="mb-3">
            <h2 className="font-display text-base font-bold text-[#142D4E] dark:text-white">
              Recent Patient & Clinical Activity
            </h2>
            <p className="text-xs text-[#64748B] dark:text-slate-400">
              Live audit feed across all MediCare Pro modules
            </p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {activities.slice(0, 6).map((act) => (
              <div key={act.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-[#1E293B] dark:text-slate-100">{act.message}</p>
                  <p className="mt-0.5 text-xs text-[#64748B] dark:text-slate-400">
                    {act.actor} · {act.module}
                  </p>
                </div>
                <span className="font-mono-num text-xs text-slate-400 shrink-0">
                  {act.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

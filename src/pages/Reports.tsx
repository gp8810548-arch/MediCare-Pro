import React, { useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import {
  BedOccupancyChart,
  DepartmentBarChart,
  DoctorWorkloadChart,
  EmergencyStatsChart,
  PatientRegistrationChart,
  PatientSatisfactionChart,
  PharmacyInventoryChart,
  RevenueAnalyticsChart,
} from '../components/Charts';
import {
  computeBedOccupancyByWard,
  computeDepartmentSatisfaction,
  computeDepartmentStats,
  computeMonthlyRegistrations,
  computeMonthlyRevenue,
  formatCurrency,
} from '../services/dataService';

type ReportGroup = 'all' | 'clinical' | 'financial' | 'operations';

export const Reports: React.FC = () => {
  const {
    patients,
    doctors,
    appointments,
    wards,
    beds,
    invoices,
    medicines,
    labTests,
    emergencyCases,
    queueTokens,
    feedbackList,
    insuranceClaims,
    settings,
  } = useHospital();

  const [reportGroup, setReportGroup] = useState<ReportGroup>('all');

  const metrics = useMemo(() => {
    const totalBeds = beds.length || 1;
    const occupied = beds.filter((b) => b.status === 'Occupied').length;
    const occupancyPct = Math.round((occupied / totalBeds) * 100);

    const totalBilled = invoices.reduce((s, i) => s + i.totalAmount, 0);
    const totalCollected = invoices.reduce((s, i) => s + i.paidAmount, 0);
    const totalPending = Math.max(0, totalBilled - totalCollected);

    const lowStock = medicines.filter((m) => m.stock <= m.reorderLevel).length;
    const totalStockValue = medicines.reduce((s, m) => s + m.stock * m.unitPrice, 0);

    const avgSatisfaction =
      feedbackList.length > 0
        ? Math.round((feedbackList.reduce((s, f) => s + f.rating, 0) / feedbackList.length) * 10) / 10
        : 0;

    return {
      occupancyPct,
      occupied,
      totalBeds: beds.length,
      totalBilled,
      totalCollected,
      totalPending,
      lowStock,
      totalStockValue,
      completedLabs: labTests.filter((t) => t.status === 'Completed').length,
      activeEmergencies: emergencyCases.filter((e) => e.treatmentStatus !== 'Discharged').length,
      avgSatisfaction,
    };
  }, [beds, invoices, medicines, labTests, emergencyCases, feedbackList]);

  const registrationData = useMemo(() => computeMonthlyRegistrations(patients, 6), [patients]);
  const revenueData = useMemo(() => computeMonthlyRevenue(invoices, 6), [invoices]);
  const departmentPerformance = useMemo(
    () => computeDepartmentStats(appointments, doctors),
    [appointments, doctors]
  );
  const bedOccupancyData = useMemo(() => computeBedOccupancyByWard(wards, beds), [wards, beds]);

  const doctorWorkloadData = useMemo(() => {
    return doctors.map((d) => {
      const aptCount = appointments.filter((a) => a.doctorId === d.id).length;
      const queueActive = queueTokens.filter(
        (q) => q.doctorId === d.id && (q.status === 'Waiting' || q.status === 'Consulting')
      ).length;
      const erActive = emergencyCases.filter(
        (e) => e.assignedDoctorId === d.id && e.treatmentStatus !== 'Discharged'
      ).length;
      return {
        doctor: d.name.replace('Dr. ', ''),
        appointments: aptCount,
        activeLoad: queueActive + erActive,
      };
    });
  }, [doctors, appointments, queueTokens, emergencyCases]);

  const emergencyStatsData = useMemo(() => {
    const priorities: ('Critical' | 'High' | 'Moderate' | 'Low')[] = ['Critical', 'High', 'Moderate', 'Low'];
    return priorities.map((p) => ({
      priority: p,
      count: emergencyCases.filter((e) => e.priority === p).length,
    }));
  }, [emergencyCases]);

  const pharmacyInventoryData = useMemo(() => {
    return medicines.slice(0, 8).map((m) => ({
      medicine: m.name.split(' ')[0],
      stock: m.stock,
      reorderLevel: m.reorderLevel,
    }));
  }, [medicines]);

  const satisfactionData = useMemo(
    () => computeDepartmentSatisfaction(feedbackList),
    [feedbackList]
  );

  const dailyAppointmentSummary = useMemo(() => {
    const map = new Map<string, { date: string; total: number; completed: number; scheduled: number }>();
    appointments.forEach((a) => {
      const entry = map.get(a.date) ?? { date: a.date, total: 0, completed: 0, scheduled: 0 };
      entry.total += 1;
      if (a.status === 'Completed') entry.completed += 1;
      if (a.status === 'Scheduled' || a.status === 'Pending') entry.scheduled += 1;
      map.set(a.date, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [appointments]);

  const showClinical = reportGroup === 'all' || reportGroup === 'clinical';
  const showFinancial = reportGroup === 'all' || reportGroup === 'financial';
  const showOperations = reportGroup === 'all' || reportGroup === 'operations';

  return (
    <div className="space-y-6">
      {/* Header Action */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div>
          <h2 className="font-display text-base font-bold text-[#142D4E] dark:text-white">
            Advanced Hospital Analytics Suite
          </h2>
          <p className="text-xs text-[#64748B] dark:text-slate-400">
            8 live operational reports across patient growth, doctors, departments, revenue, beds, ER, pharmacy, and satisfaction
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
            {([
              { id: 'all', label: 'All 8 Reports' },
              { id: 'clinical', label: 'Growth & Clinical' },
              { id: 'financial', label: 'Revenue & Beds' },
              { id: 'operations', label: 'ER, Pharmacy & CSAT' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setReportGroup(tab.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  reportGroup === tab.id
                    ? 'bg-white dark:bg-slate-900 text-[#142D4E] dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#142D4E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1d3e6b] active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
          >
            <Printer className="h-4 w-4" />
            <span>Print Analytics Report</span>
          </button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print-only border-b border-slate-300 pb-4">
        <h1 className="font-display text-xl font-bold text-[#142D4E]">{settings.hospitalName}</h1>
        <p className="text-xs text-slate-600">
          Administrative Analytics &amp; Operational Performance Report · {settings.registrationCode}
        </p>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="print-surface rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-[#64748B] dark:text-slate-400">Bed Occupancy Rate</p>
          <p className="mt-1 font-display text-2xl font-bold text-[#142D4E] dark:text-white tabular-nums">
            {metrics.occupancyPct}%
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {metrics.occupied} of {metrics.totalBeds} beds occupied
          </p>
        </div>

        <div className="print-surface rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-[#64748B] dark:text-slate-400">Hospital Revenue Collected</p>
          <p className="mt-1 font-display text-2xl font-bold text-[#16B8A6] tabular-nums">
            {formatCurrency(metrics.totalCollected, settings.currencySymbol)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {formatCurrency(metrics.totalPending, settings.currencySymbol)} pending · {insuranceClaims.length} claims
          </p>
        </div>

        <div className="print-surface rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-[#64748B] dark:text-slate-400">Pharmacy Valuation</p>
          <p className="mt-1 font-display text-2xl font-bold text-[#2563EB] tabular-nums">
            {formatCurrency(metrics.totalStockValue, settings.currencySymbol)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {metrics.lowStock} medicine(s) below threshold
          </p>
        </div>

        <div className="print-surface rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-[#64748B] dark:text-slate-400">Patient Satisfaction</p>
          <p className="mt-1 font-display text-2xl font-bold text-[#142D4E] dark:text-white tabular-nums">
            {metrics.avgSatisfaction.toFixed(1)} / 5.0
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {feedbackList.length} responses · {metrics.activeEmergencies} active ER
          </p>
        </div>
      </div>

      {/* 1 & 3: Patient Growth + Doctor Workload */}
      {showClinical && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="print-surface rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h3 className="font-display text-sm font-bold text-[#142D4E] dark:text-white mb-3">
              01. Patient Growth (Monthly Registrations)
            </h3>
            <PatientRegistrationChart data={registrationData} />
          </div>

          <div className="print-surface rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h3 className="font-display text-sm font-bold text-[#142D4E] dark:text-white mb-3">
              02. Doctor Workload (Appointments &amp; Active Queue/ER)
            </h3>
            <DoctorWorkloadChart data={doctorWorkloadData} />
          </div>
        </div>
      )}

      {/* 3, 4, 5: Department Performance + Hospital Revenue + Bed Occupancy */}
      {(showClinical || showFinancial) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {showClinical && (
            <div className="lg:col-span-4 print-surface rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <h3 className="font-display text-sm font-bold text-[#142D4E] dark:text-white mb-3">
                03. Department Performance
              </h3>
              <DepartmentBarChart data={departmentPerformance} />
            </div>
          )}

          {showFinancial && (
            <>
              <div
                className={`${
                  showClinical ? 'lg:col-span-4' : 'lg:col-span-6'
                } print-surface rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5`}
              >
                <h3 className="font-display text-sm font-bold text-[#142D4E] dark:text-white mb-3">
                  04. Hospital Revenue (Collected vs Pending)
                </h3>
                <RevenueAnalyticsChart data={revenueData} />
              </div>

              <div
                className={`${
                  showClinical ? 'lg:col-span-4' : 'lg:col-span-6'
                } print-surface rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5`}
              >
                <h3 className="font-display text-sm font-bold text-[#142D4E] dark:text-white mb-3">
                  05. Ward Bed Occupancy
                </h3>
                <BedOccupancyChart data={bedOccupancyData} />
              </div>
            </>
          )}
        </div>
      )}

      {/* 6, 7, 8: Emergency Statistics + Pharmacy Inventory + Patient Satisfaction */}
      {showOperations && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-4 print-surface rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h3 className="font-display text-sm font-bold text-[#142D4E] dark:text-white mb-3">
              06. Emergency Statistics by Priority
            </h3>
            <EmergencyStatsChart data={emergencyStatsData} />
          </div>

          <div className="lg:col-span-4 print-surface rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h3 className="font-display text-sm font-bold text-[#142D4E] dark:text-white mb-3">
              07. Pharmacy Inventory vs Reorder Level
            </h3>
            <PharmacyInventoryChart data={pharmacyInventoryData} />
          </div>

          <div className="lg:col-span-4 print-surface rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h3 className="font-display text-sm font-bold text-[#142D4E] dark:text-white mb-3">
              08. Patient Satisfaction by Department
            </h3>
            <PatientSatisfactionChart data={satisfactionData} />
          </div>
        </div>
      )}

      {/* Daily Appointment Summary Table */}
      <div className="print-surface rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h3 className="font-display text-sm font-bold text-[#142D4E] dark:text-white mb-3">
          Daily Appointment Log
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                <th className="py-2 font-semibold">Date</th>
                <th className="py-2 text-right font-semibold">Total</th>
                <th className="py-2 text-right font-semibold">Scheduled</th>
                <th className="py-2 text-right font-semibold">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {dailyAppointmentSummary.map((row) => (
                <tr key={row.date}>
                  <td className="py-2.5 font-mono-num">{row.date}</td>
                  <td className="py-2.5 text-right font-mono-num font-semibold">{row.total}</td>
                  <td className="py-2.5 text-right font-mono-num text-[#2563EB]">{row.scheduled}</td>
                  <td className="py-2.5 text-right font-mono-num text-[#16B8A6]">{row.completed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

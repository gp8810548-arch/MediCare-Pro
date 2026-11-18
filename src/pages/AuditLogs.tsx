import React, { useMemo, useState } from 'react';
import { Download, Lock, Printer, Search } from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import { AuditLogEntry } from '../types/hospital';
import { DataTable, TableColumn } from '../components/DataTable';

export const AuditLogs: React.FC = () => {
  const { auditLogs, session } = useHospital();

  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');

  const modules = useMemo(() => {
    const set = new Set<string>();
    auditLogs.forEach((a) => set.add(a.module));
    return ['All', ...Array.from(set).sort()];
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return auditLogs.filter((entry) => {
      if (moduleFilter !== 'All' && entry.module !== moduleFilter) return false;
      if (roleFilter !== 'All' && entry.actorRole !== roleFilter) return false;
      if (!q) return true;
      return (
        entry.actorName.toLowerCase().includes(q) ||
        entry.actorEmail.toLowerCase().includes(q) ||
        entry.action.toLowerCase().includes(q) ||
        entry.module.toLowerCase().includes(q) ||
        entry.details.toLowerCase().includes(q) ||
        (entry.entityId ?? '').toLowerCase().includes(q)
      );
    });
  }, [auditLogs, moduleFilter, roleFilter, searchQuery]);

  const stats = useMemo(() => {
    const authEvents = auditLogs.filter((a) => a.module === 'Authentication').length;
    const clinicalEvents = auditLogs.filter((a) =>
      ['Patients', 'EMR', 'EMR / Patients', 'Appointments', 'Emergency', 'Discharge'].includes(a.module)
    ).length;
    const opsEvents = auditLogs.length - authEvents - clinicalEvents;
    return { total: auditLogs.length, authEvents, clinicalEvents, opsEvents };
  }, [auditLogs]);

  if (session?.role !== 'Admin') {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
        <Lock className="mx-auto h-8 w-8 text-slate-400" />
        <h2 className="mt-3 font-display text-lg font-bold text-[#142D4E] dark:text-white">
          Administrator Access Required
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Hospital audit logs contain system security and compliance records restricted to Administrators.
        </p>
      </div>
    );
  }

  const exportCsv = () => {
    const headers = ['Timestamp', 'Actor', 'Email', 'Role', 'Module', 'Action', 'Entity ID', 'Details'];
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = filteredLogs.map((e) =>
      [
        e.timestamp,
        e.actorName,
        e.actorEmail,
        e.actorRole,
        e.module,
        e.action,
        e.entityId ?? '',
        e.details,
      ]
        .map(escape)
        .join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `medicare-pro-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const columns: TableColumn<AuditLogEntry>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (e) => {
        const dt = new Date(e.timestamp);
        return (
          <div className="font-mono-num text-xs whitespace-nowrap">
            <div className="font-semibold text-[#142D4E] dark:text-slate-100">
              {dt.toISOString().slice(0, 10)}
            </div>
            <div className="text-[11px] text-slate-500">
              {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        );
      },
    },
    {
      key: 'actor',
      header: 'Responsible User',
      render: (e) => (
        <div>
          <div className="text-xs font-semibold text-[#1E293B] dark:text-white">
            {e.actorName} <span className="text-slate-400">·</span>{' '}
            <span className="text-[#2563EB] dark:text-blue-400">{e.actorRole}</span>
          </div>
          <div className="text-[11px] text-slate-500">{e.actorEmail}</div>
        </div>
      ),
    },
    {
      key: 'module',
      header: 'Module & Action',
      render: (e) => (
        <div>
          <div className="text-xs font-semibold text-[#142D4E] dark:text-slate-100">{e.action}</div>
          <div className="text-[11px] text-slate-500">{e.module}</div>
        </div>
      ),
    },
    {
      key: 'entity',
      header: 'Record ID',
      render: (e) => (
        <span className="font-mono-num text-xs text-slate-600 dark:text-slate-300">
          {e.entityId || '—'}
        </span>
      ),
    },
    {
      key: 'details',
      header: 'Activity Details',
      render: (e) => <p className="text-xs text-slate-700 dark:text-slate-200 max-w-md">{e.details}</p>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#142D4E] dark:text-white">
            System Audit Trail &amp; Activity Logs
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Chronological accountability record tracking authentication, patient charts, billing, stock, and emergency actions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-[#142D4E] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
          >
            <Download className="h-4 w-4 text-[#16B8A6]" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#142D4E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1d3e6b] whitespace-nowrap shrink-0"
          >
            <Printer className="h-4 w-4" />
            Print Log
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Logged Events</p>
          <p className="mt-1 font-mono-num text-2xl font-bold text-[#142D4E] dark:text-white">{stats.total}</p>
          <p className="mt-0.5 text-xs text-slate-500">Rolling workspace audit buffer</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Auth Sessions</p>
          <p className="mt-1 font-mono-num text-2xl font-bold text-[#2563EB] dark:text-blue-400">
            {stats.authEvents}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">User sign-ins &amp; logouts</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Clinical &amp; ER Actions</p>
          <p className="mt-1 font-mono-num text-2xl font-bold text-[#16B8A6]">{stats.clinicalEvents}</p>
          <p className="mt-0.5 text-xs text-slate-500">Patients, EMR, ER, Discharge</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Ops &amp; Stock Changes</p>
          <p className="mt-1 font-mono-num text-2xl font-bold text-amber-600 dark:text-amber-400">
            {stats.opsEvents}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Billing, Pharmacy, Blood Bank, Fleet</p>
        </div>
      </div>

      {/* Filters */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search user, action, entity ID, or details..."
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-9 pr-3 text-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            aria-label="Filter audit logs by module"
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium"
          >
            {modules.map((m) => (
              <option key={m} value={m}>
                {m === 'All' ? 'All Modules' : m}
              </option>
            ))}
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Filter audit logs by role"
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium"
          >
            <option value="All">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Doctor">Doctor</option>
            <option value="Receptionist">Receptionist</option>
            <option value="System">System</option>
          </select>
        </div>
      </div>

      <DataTable
        data={filteredLogs}
        columns={columns}
        rowKey={(e) => e.id}
        emptyTitle="No audit events match filters"
        emptyDescription="Perform actions in hospital modules or clear filter criteria."
      />
    </div>
  );
};

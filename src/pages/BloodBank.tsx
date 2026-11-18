import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Droplets,
  HeartHandshake,
  Plus,
  Search,
  SlidersHorizontal,
  XCircle,
} from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import { getTodayIso } from '../services/dataService';
import {
  BloodDonation,
  BloodGroup,
  BloodIssueRecord,
  BloodRequest,
} from '../types/hospital';
import { DataTable, TableColumn } from '../components/DataTable';
import { Modal } from '../components/Modal';

const BLOOD_GROUPS: BloodGroup[] = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

type ActiveTab = 'requests' | 'donations' | 'issues';

export const BloodBank: React.FC = () => {
  const {
    bloodInventory,
    bloodDonations,
    bloodRequests,
    bloodIssues,
    patients,
    doctors,
    session,
    recordBloodDonation,
    updateBloodStockThreshold,
    createBloodRequest,
    fulfillBloodRequest,
    issueBloodUnitsDirect,
    cancelBloodRequest,
  } = useHospital();

  const [activeTab, setActiveTab] = useState<ActiveTab>('requests');
  const [searchQuery, setSearchQuery] = useState('');
  const [bloodGroupFilter, setBloodGroupFilter] = useState<'All' | BloodGroup>('All');

  // Record Donation Modal
  const [donationOpen, setDonationOpen] = useState(false);
  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [donorGroup, setDonorGroup] = useState<BloodGroup>('O+');
  const [donorUnits, setDonorUnits] = useState('1');
  const [donorDate, setDonorDate] = useState(getTodayIso());
  const [donorScreening, setDonorScreening] = useState<BloodDonation['screeningStatus']>('Cleared');
  const [donorNotes, setDonorNotes] = useState('');
  const [donationError, setDonationError] = useState('');

  // New Blood Request Modal
  const [requestOpen, setRequestOpen] = useState(false);
  const [reqPatientId, setReqPatientId] = useState('');
  const [reqGroup, setReqGroup] = useState<BloodGroup>('O+');
  const [reqUnits, setReqUnits] = useState('1');
  const [reqPriority, setReqPriority] = useState<BloodRequest['priority']>('Routine');
  const [reqDoctor, setReqDoctor] = useState('');
  const [reqNotes, setReqNotes] = useState('');
  const [reqError, setReqError] = useState('');

  // Direct Blood Issue Modal
  const [issueOpen, setIssueOpen] = useState(false);
  const [issuePatientId, setIssuePatientId] = useState('');
  const [issueGroup, setIssueGroup] = useState<BloodGroup>('O+');
  const [issueUnits, setIssueUnits] = useState('1');
  const [issueNotes, setIssueNotes] = useState('');
  const [issueError, setIssueError] = useState('');

  // Adjust Threshold Modal
  const [thresholdGroup, setThresholdGroup] = useState<BloodGroup | null>(null);
  const [thresholdValue, setThresholdValue] = useState('5');

  const totalUnitsAvailable = useMemo(
    () => bloodInventory.reduce((sum, item) => sum + item.unitsAvailable, 0),
    [bloodInventory]
  );

  const lowStockGroups = useMemo(
    () => bloodInventory.filter((b) => b.unitsAvailable <= b.minThreshold),
    [bloodInventory]
  );

  const pendingRequestCount = useMemo(
    () => bloodRequests.filter((r) => r.status === 'Pending').length,
    [bloodRequests]
  );

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bloodRequests.filter((r) => {
      if (bloodGroupFilter !== 'All' && r.bloodGroup !== bloodGroupFilter) return false;
      if (!q) return true;
      return (
        r.id.toLowerCase().includes(q) ||
        r.patientName.toLowerCase().includes(q) ||
        r.patientId.toLowerCase().includes(q) ||
        r.requestedBy.toLowerCase().includes(q)
      );
    });
  }, [bloodRequests, bloodGroupFilter, searchQuery]);

  const filteredDonations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bloodDonations.filter((d) => {
      if (bloodGroupFilter !== 'All' && d.bloodGroup !== bloodGroupFilter) return false;
      if (!q) return true;
      return (
        d.id.toLowerCase().includes(q) ||
        d.donorName.toLowerCase().includes(q) ||
        d.donorPhone.toLowerCase().includes(q)
      );
    });
  }, [bloodDonations, bloodGroupFilter, searchQuery]);

  const filteredIssues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bloodIssues.filter((b) => {
      if (bloodGroupFilter !== 'All' && b.bloodGroup !== bloodGroupFilter) return false;
      if (!q) return true;
      return (
        b.id.toLowerCase().includes(q) ||
        b.patientName.toLowerCase().includes(q) ||
        b.issuedBy.toLowerCase().includes(q)
      );
    });
  }, [bloodIssues, bloodGroupFilter, searchQuery]);

  const openDonationModal = () => {
    setDonorName('');
    setDonorPhone('');
    setDonorGroup('O+');
    setDonorUnits('1');
    setDonorDate(getTodayIso());
    setDonorScreening('Cleared');
    setDonorNotes('');
    setDonationError('');
    setDonationOpen(true);
  };

  const handleDonationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!donorName.trim() || !donorPhone.trim()) {
      setDonationError('Donor full name and contact phone are required.');
      return;
    }
    const units = Number(donorUnits);
    if (!Number.isFinite(units) || units <= 0 || units > 10) {
      setDonationError('Donation units must be between 1 and 10.');
      return;
    }
    recordBloodDonation({
      donorName: donorName.trim(),
      donorPhone: donorPhone.trim(),
      bloodGroup: donorGroup,
      units: Math.round(units),
      donationDate: donorDate || getTodayIso(),
      screeningStatus: donorScreening,
      notes: donorNotes.trim() || undefined,
    });
    setDonationOpen(false);
  };

  const openRequestModal = () => {
    const defaultPat = patients[0];
    setReqPatientId(defaultPat?.id ?? '');
    setReqGroup(defaultPat?.bloodGroup ?? 'O+');
    setReqUnits('1');
    setReqPriority('Routine');
    setReqDoctor(doctors[0]?.name ?? session?.name ?? '');
    setReqNotes('');
    setReqError('');
    setRequestOpen(true);
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqPatientId) {
      setReqError('Please select a patient.');
      return;
    }
    const units = Number(reqUnits);
    if (!Number.isFinite(units) || units <= 0) {
      setReqError('Requested units must be at least 1.');
      return;
    }
    const res = createBloodRequest({
      patientId: reqPatientId,
      bloodGroup: reqGroup,
      unitsRequested: units,
      priority: reqPriority,
      requestedBy: reqDoctor || session?.name || 'Attending Physician',
      notes: reqNotes,
    });
    if (!res.ok) {
      setReqError(res.error || 'Unable to submit blood request.');
      return;
    }
    setRequestOpen(false);
  };

  const openIssueModal = () => {
    const defaultPat = patients[0];
    setIssuePatientId(defaultPat?.id ?? '');
    setIssueGroup(defaultPat?.bloodGroup ?? 'O+');
    setIssueUnits('1');
    setIssueNotes('');
    setIssueError('');
    setIssueOpen(true);
  };

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issuePatientId) {
      setIssueError('Please select a patient.');
      return;
    }
    const units = Number(issueUnits);
    if (!Number.isFinite(units) || units <= 0) {
      setIssueError('Units to issue must be at least 1.');
      return;
    }
    const res = issueBloodUnitsDirect({
      patientId: issuePatientId,
      bloodGroup: issueGroup,
      units,
      notes: issueNotes,
    });
    if (!res.ok) {
      setIssueError(res.error || 'Could not issue blood units.');
      return;
    }
    setIssueOpen(false);
  };

  const handleThresholdSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!thresholdGroup) return;
    updateBloodStockThreshold(thresholdGroup, Number(thresholdValue) || 3);
    setThresholdGroup(null);
  };

  const requestColumns: TableColumn<BloodRequest>[] = [
    {
      key: 'id',
      header: 'Request ID',
      render: (r) => (
        <div>
          <div className="font-mono-num text-xs font-semibold text-[#142D4E] dark:text-slate-100">{r.id}</div>
          <div className="font-mono-num text-xs text-slate-500">{r.requestDate}</div>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Patient',
      render: (r) => (
        <div>
          <div className="text-sm font-semibold text-[#1E293B] dark:text-white">{r.patientName}</div>
          <div className="font-mono-num text-xs text-slate-500">{r.patientId}</div>
        </div>
      ),
    },
    {
      key: 'blood',
      header: 'Blood Group & Units',
      render: (r) => (
        <div className="text-xs">
          <span className="font-mono-num text-sm font-bold text-red-700 dark:text-red-400">{r.bloodGroup}</span>
          <span className="text-slate-400 mx-1.5">·</span>
          <span className="font-mono-num font-semibold text-slate-700 dark:text-slate-200">
            {r.unitsRequested} {r.unitsRequested === 1 ? 'unit' : 'units'}
          </span>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority & Requester',
      render: (r) => (
        <div className="text-xs">
          <span
            className={`font-semibold ${
              r.priority === 'Emergency'
                ? 'text-red-600 dark:text-red-400'
                : r.priority === 'Urgent'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            {r.priority}
          </span>
          <div className="text-slate-500 truncate max-w-[180px]">{r.requestedBy}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <span
          className={`text-xs font-semibold ${
            r.status === 'Fulfilled'
              ? 'text-emerald-600 dark:text-emerald-400'
              : r.status === 'Cancelled'
              ? 'text-slate-500'
              : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          {r.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => {
        const stock = bloodInventory.find((b) => b.bloodGroup === r.bloodGroup);
        const canFulfill = r.status === 'Pending' && (stock?.unitsAvailable ?? 0) >= r.unitsRequested;
        return (
          <div className="flex items-center justify-end gap-2">
            {r.status === 'Pending' && (
              <>
                <button
                  type="button"
                  disabled={!canFulfill}
                  onClick={() => fulfillBloodRequest(r.id)}
                  title={
                    canFulfill
                      ? `Issue ${r.unitsRequested} unit(s) of ${r.bloodGroup}`
                      : `Insufficient ${r.bloodGroup} stock`
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Issue Units
                </button>
                <button
                  type="button"
                  onClick={() => cancelBloodRequest(r.id)}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Cancel
                </button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  const donationColumns: TableColumn<BloodDonation>[] = [
    {
      key: 'id',
      header: 'Donation ID',
      render: (d) => (
        <div>
          <div className="font-mono-num text-xs font-semibold text-[#142D4E] dark:text-slate-100">{d.id}</div>
          <div className="font-mono-num text-xs text-slate-500">{d.donationDate}</div>
        </div>
      ),
    },
    {
      key: 'donor',
      header: 'Donor',
      render: (d) => (
        <div>
          <div className="text-sm font-semibold text-[#1E293B] dark:text-white">{d.donorName}</div>
          <div className="text-xs text-slate-500">{d.donorPhone}</div>
        </div>
      ),
    },
    {
      key: 'group',
      header: 'Group & Units',
      render: (d) => (
        <div className="text-xs">
          <span className="font-mono-num text-sm font-bold text-red-700 dark:text-red-400">{d.bloodGroup}</span>
          <span className="text-slate-400 mx-1.5">·</span>
          <span className="font-mono-num font-semibold text-slate-700 dark:text-slate-200">
            +{d.units} {d.units === 1 ? 'unit' : 'units'}
          </span>
        </div>
      ),
    },
    {
      key: 'screening',
      header: 'Screening Status',
      render: (d) => (
        <span
          className={`text-xs font-semibold ${
            d.screeningStatus === 'Cleared'
              ? 'text-emerald-600 dark:text-emerald-400'
              : d.screeningStatus === 'Quarantined'
              ? 'text-red-600 dark:text-red-400'
              : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          {d.screeningStatus}
        </span>
      ),
    },
    {
      key: 'notes',
      header: 'Notes',
      render: (d) => <span className="text-xs text-slate-600 dark:text-slate-300">{d.notes || 'Standard collection'}</span>,
    },
  ];

  const issueColumns: TableColumn<BloodIssueRecord>[] = [
    {
      key: 'id',
      header: 'Issue ID',
      render: (b) => (
        <div>
          <div className="font-mono-num text-xs font-semibold text-[#142D4E] dark:text-slate-100">{b.id}</div>
          <div className="font-mono-num text-xs text-slate-500">{b.issuedDate}</div>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Recipient Patient',
      render: (b) => (
        <div>
          <div className="text-sm font-semibold text-[#1E293B] dark:text-white">{b.patientName}</div>
          <div className="font-mono-num text-xs text-slate-500">
            {b.patientId}
            {b.requestId ? ` · Req ${b.requestId}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'blood',
      header: 'Group & Units',
      render: (b) => (
        <div className="text-xs">
          <span className="font-mono-num text-sm font-bold text-red-700 dark:text-red-400">{b.bloodGroup}</span>
          <span className="text-slate-400 mx-1.5">·</span>
          <span className="font-mono-num font-semibold text-slate-700 dark:text-slate-200">
            -{b.unitsIssued} {b.unitsIssued === 1 ? 'unit' : 'units'}
          </span>
        </div>
      ),
    },
    {
      key: 'issuedBy',
      header: 'Issued By',
      render: (b) => <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{b.issuedBy}</span>,
    },
    {
      key: 'notes',
      header: 'Cross-Match Notes',
      render: (b) => <span className="text-xs text-slate-600 dark:text-slate-300">{b.notes || '—'}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#142D4E] dark:text-white">
            Blood Bank &amp; Transfusion Supply
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time blood group units, donor screening logs, patient transfusion requests, and issue history.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={openDonationModal}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-[#142D4E] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            <HeartHandshake className="h-4 w-4 text-emerald-600" />
            Record Donation
          </button>
          <button
            type="button"
            onClick={openIssueModal}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-[#142D4E] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowUpRight className="h-4 w-4 text-amber-600" />
            Issue Units
          </button>
          <button
            type="button"
            onClick={openRequestModal}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            New Blood Request
          </button>
        </div>
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockGroups.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/25 px-4 py-3">
          <div className="flex items-start sm:items-center gap-3 text-sm text-red-800 dark:text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 sm:mt-0 text-red-600 dark:text-red-400" />
            <div>
              <span className="font-semibold">Low Blood Stock Alert: </span>
              <span>
                {lowStockGroups.map((g) => `${g.bloodGroup} (${g.unitsAvailable}/${g.minThreshold})`).join(' · ')}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={openDonationModal}
            className="self-start sm:self-auto text-xs font-semibold text-red-700 dark:text-red-300 underline underline-offset-2 whitespace-nowrap shrink-0"
          >
            Log Restock Donation
          </button>
        </div>
      )}

      {/* Summary Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Units Available</p>
          <p className="mt-1 font-mono-num text-2xl font-bold text-[#142D4E] dark:text-white">{totalUnitsAvailable}</p>
          <p className="mt-0.5 text-xs text-slate-500">Across 8 ABO/Rh groups</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Low-Stock Groups</p>
          <p
            className={`mt-1 font-mono-num text-2xl font-bold ${
              lowStockGroups.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {lowStockGroups.length}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Below threshold minimum</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Requests</p>
          <p className="mt-1 font-mono-num text-2xl font-bold text-amber-600 dark:text-amber-400">
            {pendingRequestCount}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Awaiting cross-match release</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Units Issued</p>
          <p className="mt-1 font-mono-num text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {bloodIssues.reduce((s, i) => s + i.unitsIssued, 0)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{bloodIssues.length} release events</p>
        </div>
      </div>

      {/* 8 Blood Group Inventory Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#142D4E] dark:text-slate-100">
            ABO / Rh Inventory Matrix
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Click filter or adjust alert thresholds
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {bloodInventory.map((stock) => {
            const isLow = stock.unitsAvailable <= stock.minThreshold;
            const isCritical = stock.unitsAvailable <= 2;
            const selected = bloodGroupFilter === stock.bloodGroup;
            return (
              <div
                key={stock.bloodGroup}
                className={`rounded-xl border p-3.5 transition-colors bg-white dark:bg-slate-900 ${
                  selected
                    ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20'
                    : isCritical
                    ? 'border-red-300 dark:border-red-800'
                    : isLow
                    ? 'border-amber-300 dark:border-amber-800'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setBloodGroupFilter((prev) => (prev === stock.bloodGroup ? 'All' : stock.bloodGroup))
                    }
                    className="flex items-center gap-1.5 text-left"
                    title={`Filter tables by ${stock.bloodGroup}`}
                  >
                    <Droplets className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                    <span className="font-mono-num text-base font-bold text-[#142D4E] dark:text-white">
                      {stock.bloodGroup}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setThresholdGroup(stock.bloodGroup);
                      setThresholdValue(String(stock.minThreshold));
                    }}
                    title={`Edit minimum threshold for ${stock.bloodGroup}`}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-2 font-mono-num text-2xl font-bold text-[#1E293B] dark:text-slate-100">
                  {stock.unitsAvailable}
                  <span className="ml-1 text-xs font-normal text-slate-500">units</span>
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-mono-num">Min: {stock.minThreshold}</span>
                  <span
                    className={`font-semibold ${
                      isCritical
                        ? 'text-red-600 dark:text-red-400'
                        : isLow
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {isCritical ? 'Critical' : isLow ? 'Low Stock' : 'Optimal'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Segmented Tabs + Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'requests'
                ? 'bg-white dark:bg-slate-900 text-[#142D4E] dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Blood Requests ({bloodRequests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('donations')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'donations'
                ? 'bg-white dark:bg-slate-900 text-[#142D4E] dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Donation Records ({bloodDonations.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('issues')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'issues'
                ? 'bg-white dark:bg-slate-900 text-[#142D4E] dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Issue History ({bloodIssues.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient, donor, or ID..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-9 pr-3 text-xs text-[#1E293B] dark:text-slate-100 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none"
            />
          </div>
          <select
            value={bloodGroupFilter}
            onChange={(e) => setBloodGroupFilter(e.target.value as 'All' | BloodGroup)}
            aria-label="Filter by blood group"
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-[#1E293B] dark:text-slate-100 focus:border-[#2563EB] focus:outline-none"
          >
            <option value="All">All Blood Groups</option>
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>
                {bg}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tables */}
      {activeTab === 'requests' && (
        <DataTable
          data={filteredRequests}
          columns={requestColumns}
          rowKey={(r) => r.id}
          emptyTitle="No blood requests match the filter"
          emptyDescription="Create a new blood unit request or adjust filters."
        />
      )}

      {activeTab === 'donations' && (
        <DataTable
          data={filteredDonations}
          columns={donationColumns}
          rowKey={(d) => d.id}
          emptyTitle="No blood donation records found"
          emptyDescription="Record a donor screening and collection to replenish inventory."
        />
      )}

      {activeTab === 'issues' && (
        <DataTable
          data={filteredIssues}
          columns={issueColumns}
          rowKey={(b) => b.id}
          emptyTitle="No blood issue history found"
          emptyDescription="Fulfilled patient requests and direct issues will appear here."
        />
      )}

      {/* Record Donation Modal */}
      <Modal
        open={donationOpen}
        onClose={() => setDonationOpen(false)}
        title="Record Blood Donation"
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleDonationSubmit} className="space-y-4">
          {donationError && (
            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {donationError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Donor Full Name *
              </label>
              <input
                type="text"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                required
                placeholder="e.g., Daniel Cho"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Donor Phone *
              </label>
              <input
                type="text"
                value={donorPhone}
                onChange={(e) => setDonorPhone(e.target.value)}
                required
                placeholder="+1 (555) 019-2834"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Blood Group
              </label>
              <select
                value={donorGroup}
                onChange={(e) => setDonorGroup(e.target.value as BloodGroup)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white"
              >
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Units Collected
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={donorUnits}
                onChange={(e) => setDonorUnits(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Donation Date
              </label>
              <input
                type="date"
                value={donorDate}
                onChange={(e) => setDonorDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Screening Status
              </label>
              <select
                value={donorScreening}
                onChange={(e) => setDonorScreening(e.target.value as BloodDonation['screeningStatus'])}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white"
              >
                <option value="Cleared">Cleared (Add to Stock)</option>
                <option value="Pending">Pending Screening</option>
                <option value="Quarantined">Quarantined</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Collection Notes
            </label>
            <input
              type="text"
              value={donorNotes}
              onChange={(e) => setDonorNotes(e.target.value)}
              placeholder="Donor hemoglobin check, drive details..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDonationOpen(false)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Save Donation
            </button>
          </div>
        </form>
      </Modal>

      {/* New Blood Request Modal */}
      <Modal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        title="Create Patient Blood Request"
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleRequestSubmit} className="space-y-4">
          {reqError && (
            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {reqError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Patient *
              </label>
              <select
                value={reqPatientId}
                onChange={(e) => {
                  const p = patients.find((x) => x.id === e.target.value);
                  setReqPatientId(e.target.value);
                  if (p) setReqGroup(p.bloodGroup);
                }}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.id} · {p.bloodGroup})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Blood Group Needed
              </label>
              <select
                value={reqGroup}
                onChange={(e) => setReqGroup(e.target.value as BloodGroup)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white"
              >
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg} ({bloodInventory.find((b) => b.bloodGroup === bg)?.unitsAvailable ?? 0} avail.)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Units Requested
              </label>
              <input
                type="number"
                min={1}
                max={12}
                value={reqUnits}
                onChange={(e) => setReqUnits(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={reqPriority}
                onChange={(e) => setReqPriority(e.target.value as BloodRequest['priority'])}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white"
              >
                <option value="Routine">Routine</option>
                <option value="Urgent">Urgent</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Requesting Physician
              </label>
              <input
                type="text"
                value={reqDoctor}
                onChange={(e) => setReqDoctor(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Clinical Indication / Notes
            </label>
            <textarea
              rows={2}
              value={reqNotes}
              onChange={(e) => setReqNotes(e.target.value)}
              placeholder="Pre-operative standby, anemia support..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRequestOpen(false)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Submit Request
            </button>
          </div>
        </form>
      </Modal>

      {/* Direct Blood Issue Modal */}
      <Modal
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        title="Direct Blood Unit Issue"
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleIssueSubmit} className="space-y-4">
          {issueError && (
            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {issueError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Recipient Patient *
            </label>
            <select
              value={issuePatientId}
              onChange={(e) => {
                const p = patients.find((x) => x.id === e.target.value);
                setIssuePatientId(e.target.value);
                if (p) setIssueGroup(p.bloodGroup);
              }}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.id} · {p.bloodGroup})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Blood Group
              </label>
              <select
                value={issueGroup}
                onChange={(e) => setIssueGroup(e.target.value as BloodGroup)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white"
              >
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg} ({bloodInventory.find((b) => b.bloodGroup === bg)?.unitsAvailable ?? 0} avail.)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Units to Issue
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={issueUnits}
                onChange={(e) => setIssueUnits(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white font-mono-num"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Release Notes
            </label>
            <input
              type="text"
              value={issueNotes}
              onChange={(e) => setIssueNotes(e.target.value)}
              placeholder="Ward release & cross-match verification"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIssueOpen(false)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Confirm &amp; Issue
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Threshold Modal */}
      <Modal
        open={Boolean(thresholdGroup)}
        onClose={() => setThresholdGroup(null)}
        title={`Low-Stock Alert Threshold · ${thresholdGroup ?? ''}`}
        maxWidthClass="max-w-sm"
      >
        <form onSubmit={handleThresholdSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Minimum Units Before Alert Triggered
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={thresholdValue}
              onChange={(e) => setThresholdValue(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white font-mono-num"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setThresholdGroup(null)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Save Threshold
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

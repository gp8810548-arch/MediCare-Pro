import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  FilePlus2,
  Plus,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import { addDaysIso, formatCurrency, getTodayIso } from '../services/dataService';
import { ClaimStatus, InsuranceClaim, InsurancePolicy } from '../types/hospital';
import { DataTable, TableColumn } from '../components/DataTable';
import { Modal } from '../components/Modal';

type ActiveTab = 'claims' | 'policies';

export const Insurance: React.FC = () => {
  const {
    insurancePolicies,
    insuranceClaims,
    patients,
    invoices,
    addInsurancePolicy,
    updateInsurancePolicy,
    submitInsuranceClaim,
    reviewInsuranceClaim,
  } = useHospital();

  const [activeTab, setActiveTab] = useState<ActiveTab>('claims');
  const [searchQuery, setSearchQuery] = useState('');
  const [claimStatusFilter, setClaimStatusFilter] = useState<'All' | ClaimStatus>('All');

  // Add Policy Modal
  const [policyOpen, setPolicyOpen] = useState(false);
  const [polPatientId, setPolPatientId] = useState('');
  const [polProvider, setPolProvider] = useState('');
  const [polNumber, setPolNumber] = useState('');
  const [polPlan, setPolPlan] = useState('');
  const [polLimit, setPolLimit] = useState('50000');
  const [polValidUntil, setPolValidUntil] = useState(addDaysIso(getTodayIso(), 365));
  const [polStatus, setPolStatus] = useState<InsurancePolicy['status']>('Active');
  const [polError, setPolError] = useState('');

  // Submit Claim Modal
  const [claimOpen, setClaimOpen] = useState(false);
  const [clmPatientId, setClmPatientId] = useState('');
  const [clmPolicyId, setClmPolicyId] = useState('');
  const [clmInvoiceId, setClmInvoiceId] = useState('');
  const [clmAmount, setClmAmount] = useState('');
  const [clmReason, setClmReason] = useState('');
  const [clmRemarks, setClmRemarks] = useState('');
  const [clmError, setClmError] = useState('');

  // Review Claim Modal
  const [reviewTarget, setReviewTarget] = useState<InsuranceClaim | null>(null);
  const [revDecision, setRevDecision] = useState<ClaimStatus>('Approved');
  const [revAmount, setRevAmount] = useState('');
  const [revRemarks, setRevRemarks] = useState('');
  const [revError, setRevError] = useState('');

  const stats = useMemo(() => {
    const activePolicies = insurancePolicies.filter((p) => p.status === 'Active').length;
    const pendingClaims = insuranceClaims.filter(
      (c) => c.status === 'Submitted' || c.status === 'Under Review'
    ).length;
    const totalApproved = insuranceClaims
      .filter((c) => c.status === 'Approved' || c.status === 'Paid')
      .reduce((s, c) => s + c.approvedAmount, 0);
    const totalPaid = insuranceClaims.reduce((s, c) => s + c.paidAmount, 0);
    return { activePolicies, pendingClaims, totalApproved, totalPaid };
  }, [insurancePolicies, insuranceClaims]);

  const filteredClaims = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return insuranceClaims.filter((c) => {
      if (claimStatusFilter !== 'All' && c.status !== claimStatusFilter) return false;
      if (!q) return true;
      return (
        c.id.toLowerCase().includes(q) ||
        c.patientName.toLowerCase().includes(q) ||
        c.providerName.toLowerCase().includes(q) ||
        c.policyNumber.toLowerCase().includes(q)
      );
    });
  }, [insuranceClaims, claimStatusFilter, searchQuery]);

  const filteredPolicies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return insurancePolicies.filter((p) => {
      if (!q) return true;
      return (
        p.id.toLowerCase().includes(q) ||
        p.patientName.toLowerCase().includes(q) ||
        p.providerName.toLowerCase().includes(q) ||
        p.policyNumber.toLowerCase().includes(q)
      );
    });
  }, [insurancePolicies, searchQuery]);

  const openPolicyModal = () => {
    setPolPatientId(patients[0]?.id ?? '');
    setPolProvider('');
    setPolNumber('');
    setPolPlan('');
    setPolLimit('50000');
    setPolValidUntil(addDaysIso(getTodayIso(), 365));
    setPolStatus('Active');
    setPolError('');
    setPolicyOpen(true);
  };

  const handlePolicySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!polPatientId || !polProvider.trim() || !polNumber.trim() || !polPlan.trim()) {
      setPolError('Patient, provider name, policy number, and plan name are required.');
      return;
    }
    const limit = Number(polLimit);
    if (!Number.isFinite(limit) || limit <= 0) {
      setPolError('Coverage limit must be greater than zero.');
      return;
    }
    const res = addInsurancePolicy({
      patientId: polPatientId,
      providerName: polProvider.trim(),
      policyNumber: polNumber.trim(),
      planName: polPlan.trim(),
      coverageLimit: limit,
      validUntil: polValidUntil,
      status: polStatus,
    });
    if (!res.ok) {
      setPolError(res.error || 'Could not add insurance policy.');
      return;
    }
    setPolicyOpen(false);
  };

  const syncClaimDefaultsForPatient = (patientId: string) => {
    setClmPatientId(patientId);
    const matchingPolicy = insurancePolicies.find((p) => p.patientId === patientId);
    setClmPolicyId(matchingPolicy?.id ?? '');
    const matchingInv = invoices.find((i) => i.patientId === patientId && i.paymentStatus !== 'Paid');
    setClmInvoiceId(matchingInv?.id ?? '');
    if (matchingInv) {
      setClmAmount(String(Math.max(0, matchingInv.totalAmount - matchingInv.paidAmount)));
    }
  };

  const openClaimModal = () => {
    const firstWithPolicy = insurancePolicies[0]?.patientId ?? patients[0]?.id ?? '';
    syncClaimDefaultsForPatient(firstWithPolicy);
    setClmReason('');
    setClmRemarks('');
    setClmError('');
    setClaimOpen(true);
  };

  const handleClaimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clmPatientId || !clmPolicyId) {
      setClmError('Patient and an active insurance policy are required.');
      return;
    }
    const amt = Number(clmAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setClmError('Claim amount must be greater than zero.');
      return;
    }
    if (!clmReason.trim()) {
      setClmError('Diagnosis or claim reason is required.');
      return;
    }
    const res = submitInsuranceClaim({
      patientId: clmPatientId,
      policyId: clmPolicyId,
      invoiceId: clmInvoiceId || undefined,
      claimAmount: amt,
      diagnosisOrReason: clmReason,
      remarks: clmRemarks,
    });
    if (!res.ok) {
      setClmError(res.error || 'Could not submit insurance claim.');
      return;
    }
    setClaimOpen(false);
  };

  const openReviewModal = (claim: InsuranceClaim) => {
    setReviewTarget(claim);
    setRevDecision(claim.status === 'Submitted' ? 'Approved' : claim.status === 'Approved' ? 'Paid' : claim.status);
    setRevAmount(String(claim.approvedAmount > 0 ? claim.approvedAmount : claim.claimAmount));
    setRevRemarks(claim.remarks ?? '');
    setRevError('');
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTarget) return;
    const res = reviewInsuranceClaim(
      reviewTarget.id,
      revDecision,
      revDecision === 'Rejected' ? 0 : Number(revAmount) || 0,
      revRemarks
    );
    if (!res.ok) {
      setRevError(res.error || 'Could not update claim status.');
      return;
    }
    setReviewTarget(null);
  };

  const claimColumns: TableColumn<InsuranceClaim>[] = [
    {
      key: 'id',
      header: 'Claim ID',
      render: (c) => (
        <div>
          <div className="font-mono-num text-xs font-semibold text-[#142D4E] dark:text-slate-100">{c.id}</div>
          <div className="font-mono-num text-xs text-slate-500">{c.submittedDate}</div>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Patient & Policy',
      render: (c) => (
        <div>
          <div className="text-sm font-semibold text-[#1E293B] dark:text-white">{c.patientName}</div>
          <div className="text-xs text-slate-500">
            {c.providerName} · <span className="font-mono-num">{c.policyNumber}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Clinical Reason / Invoice',
      render: (c) => (
        <div className="max-w-[220px]">
          <div className="text-xs text-slate-700 dark:text-slate-200 truncate">{c.diagnosisOrReason}</div>
          <div className="font-mono-num text-[11px] text-slate-500">
            {c.invoiceId ? `Invoice ${c.invoiceId}` : 'Direct claim'}
          </div>
        </div>
      ),
    },
    {
      key: 'amounts',
      header: 'Claimed / Approved / Paid',
      render: (c) => (
        <div className="font-mono-num text-xs space-y-0.5">
          <div className="font-semibold text-[#142D4E] dark:text-white">
            Claimed: {formatCurrency(c.claimAmount)}
          </div>
          <div className="text-slate-500">
            Appr: {formatCurrency(c.approvedAmount)} · Paid: {formatCurrency(c.paidAmount)}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Claim Status',
      render: (c) => (
        <span
          className={`text-xs font-semibold ${
            c.status === 'Paid'
              ? 'text-emerald-600 dark:text-emerald-400'
              : c.status === 'Approved'
              ? 'text-[#2563EB] dark:text-blue-400'
              : c.status === 'Rejected'
              ? 'text-red-600 dark:text-red-400'
              : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          {c.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (c) => (
        <button
          type="button"
          onClick={() => openReviewModal(c)}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-semibold text-[#142D4E] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
        >
          <ClipboardCheck className="h-3.5 w-3.5 text-[#2563EB]" />
          {c.status === 'Paid' ? 'View' : 'Review / Settle'}
        </button>
      ),
    },
  ];

  const policyColumns: TableColumn<InsurancePolicy>[] = [
    {
      key: 'id',
      header: 'Policy ID',
      render: (p) => (
        <div>
          <div className="font-mono-num text-xs font-semibold text-[#142D4E] dark:text-slate-100">{p.id}</div>
          <div className="font-mono-num text-xs text-slate-500">{p.policyNumber}</div>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Policyholder',
      render: (p) => (
        <div>
          <div className="text-sm font-semibold text-[#1E293B] dark:text-white">{p.patientName}</div>
          <div className="font-mono-num text-xs text-slate-500">{p.patientId}</div>
        </div>
      ),
    },
    {
      key: 'provider',
      header: 'Provider & Plan',
      render: (p) => (
        <div>
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">{p.providerName}</div>
          <div className="text-xs text-slate-500">{p.planName}</div>
        </div>
      ),
    },
    {
      key: 'coverage',
      header: 'Coverage & Expiry',
      render: (p) => (
        <div className="font-mono-num text-xs">
          <div className="font-semibold text-[#142D4E] dark:text-white">{formatCurrency(p.coverageLimit)}</div>
          <div className="text-slate-500">Valid till {p.validUntil}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (
        <span
          className={`text-xs font-semibold ${
            p.status === 'Active'
              ? 'text-emerald-600 dark:text-emerald-400'
              : p.status === 'Expired'
              ? 'text-red-600 dark:text-red-400'
              : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          {p.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Verify',
      align: 'right',
      render: (p) =>
        p.status !== 'Active' ? (
          <button
            type="button"
            onClick={() => updateInsurancePolicy({ ...p, status: 'Active' })}
            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 whitespace-nowrap shrink-0"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Mark Active
          </button>
        ) : (
          <span className="text-xs text-slate-400">Verified</span>
        ),
    },
  ];

  const patientPolicies = useMemo(
    () => insurancePolicies.filter((p) => p.patientId === clmPatientId),
    [insurancePolicies, clmPatientId]
  );

  const patientInvoices = useMemo(
    () => invoices.filter((i) => i.patientId === clmPatientId),
    [invoices, clmPatientId]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#142D4E] dark:text-white">
            Insurance &amp; Claims Processing
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage policyholder coverage verification, payer claims, approvals, and reimbursement tracking.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={openPolicyModal}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-[#142D4E] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            <ShieldCheck className="h-4 w-4 text-[#16B8A6]" />
            Add Policy
          </button>
          <button
            type="button"
            onClick={openClaimModal}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            Submit Claim
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Policies</p>
          <p className="mt-1 font-mono-num text-2xl font-bold text-[#142D4E] dark:text-white">{stats.activePolicies}</p>
          <p className="mt-0.5 text-xs text-slate-500">{insurancePolicies.length} total registered</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Open Claims</p>
          <p className="mt-1 font-mono-num text-2xl font-bold text-amber-600 dark:text-amber-400">
            {stats.pendingClaims}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Submitted or under review</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Approved Coverage</p>
          <p className="mt-1 font-mono-num text-2xl font-bold text-[#2563EB] dark:text-blue-400">
            {formatCurrency(stats.totalApproved)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Authorized claim benefit</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Reimbursements Settled</p>
          <p className="mt-1 font-mono-num text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(stats.totalPaid)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Credited to patient billing</p>
        </div>
      </div>

      {/* Tabs + Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('claims')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'claims'
                ? 'bg-white dark:bg-slate-900 text-[#142D4E] dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Insurance Claims ({insuranceClaims.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('policies')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'policies'
                ? 'bg-white dark:bg-slate-900 text-[#142D4E] dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Patient Policies ({insurancePolicies.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient, insurer, policy #..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-9 pr-3 text-xs text-[#1E293B] dark:text-slate-100 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none"
            />
          </div>
          {activeTab === 'claims' && (
            <select
              value={claimStatusFilter}
              onChange={(e) => setClaimStatusFilter(e.target.value as 'All' | ClaimStatus)}
              aria-label="Filter claims by status"
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-[#1E293B] dark:text-slate-100 focus:border-[#2563EB] focus:outline-none"
            >
              <option value="All">All Claim Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Approved">Approved</option>
              <option value="Paid">Paid</option>
              <option value="Rejected">Rejected</option>
            </select>
          )}
        </div>
      </div>

      {activeTab === 'claims' ? (
        <DataTable
          data={filteredClaims}
          columns={claimColumns}
          rowKey={(c) => c.id}
          emptyTitle="No insurance claims found"
          emptyDescription="Submit an insurance claim linked to a verified patient policy."
        />
      ) : (
        <DataTable
          data={filteredPolicies}
          columns={policyColumns}
          rowKey={(p) => p.id}
          emptyTitle="No patient policies registered"
          emptyDescription="Register a patient health insurance policy to enable claim submissions."
        />
      )}

      {/* Add Policy Modal */}
      <Modal
        open={policyOpen}
        onClose={() => setPolicyOpen(false)}
        title="Register Patient Insurance Policy"
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handlePolicySubmit} className="space-y-4">
          {polError && (
            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {polError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Patient *
              </label>
              <select
                value={polPatientId}
                onChange={(e) => setPolPatientId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white"
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
                Insurance Provider *
              </label>
              <input
                type="text"
                value={polProvider}
                onChange={(e) => setPolProvider(e.target.value)}
                placeholder="e.g., BlueHorizon Health"
                required
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Policy Number *
              </label>
              <input
                type="text"
                value={polNumber}
                onChange={(e) => setPolNumber(e.target.value)}
                placeholder="e.g., BHA-550192-IND"
                required
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Plan Name *
              </label>
              <input
                type="text"
                value={polPlan}
                onChange={(e) => setPolPlan(e.target.value)}
                placeholder="e.g., Comprehensive Gold"
                required
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Coverage Limit ($)
              </label>
              <input
                type="number"
                min={100}
                value={polLimit}
                onChange={(e) => setPolLimit(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Valid Until
              </label>
              <input
                type="date"
                value={polValidUntil}
                onChange={(e) => setPolValidUntil(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Verification Status
              </label>
              <select
                value={polStatus}
                onChange={(e) => setPolStatus(e.target.value as InsurancePolicy['status'])}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white"
              >
                <option value="Active">Active</option>
                <option value="Pending Verification">Pending Verification</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPolicyOpen(false)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Save Policy
            </button>
          </div>
        </form>
      </Modal>

      {/* Submit Claim Modal */}
      <Modal
        open={claimOpen}
        onClose={() => setClaimOpen(false)}
        title="Submit Insurance Claim"
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleClaimSubmit} className="space-y-4">
          {clmError && (
            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {clmError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Patient *
              </label>
              <select
                value={clmPatientId}
                onChange={(e) => syncClaimDefaultsForPatient(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white"
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
                Insurance Policy *
              </label>
              <select
                value={clmPolicyId}
                onChange={(e) => setClmPolicyId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white"
              >
                {patientPolicies.length === 0 ? (
                  <option value="">No registered policy — add policy first</option>
                ) : (
                  patientPolicies.map((pol) => (
                    <option key={pol.id} value={pol.id}>
                      {pol.providerName} ({pol.policyNumber})
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Linked Invoice (Optional)
              </label>
              <select
                value={clmInvoiceId}
                onChange={(e) => {
                  setClmInvoiceId(e.target.value);
                  const inv = patientInvoices.find((i) => i.id === e.target.value);
                  if (inv) {
                    setClmAmount(String(Math.max(0, inv.totalAmount - inv.paidAmount) || inv.totalAmount));
                  }
                }}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white"
              >
                <option value="">None (Direct claim)</option>
                {patientInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.id} ({formatCurrency(inv.totalAmount)} · {inv.paymentStatus})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Claim Amount ($) *
              </label>
              <input
                type="number"
                min={1}
                step="0.01"
                value={clmAmount}
                onChange={(e) => setClmAmount(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white font-mono-num"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Diagnosis / Treatment Justification *
            </label>
            <input
              type="text"
              value={clmReason}
              onChange={(e) => setClmReason(e.target.value)}
              placeholder="e.g., Inpatient cardiology monitoring & lab diagnostics"
              required
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Supporting Remarks
            </label>
            <textarea
              rows={2}
              value={clmRemarks}
              onChange={(e) => setClmRemarks(e.target.value)}
              placeholder="Pre-authorization reference number or adjuster note..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setClaimOpen(false)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={patientPolicies.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <FilePlus2 className="h-3.5 w-3.5" />
              Submit Claim
            </button>
          </div>
        </form>
      </Modal>

      {/* Review / Settle Claim Modal */}
      <Modal
        open={Boolean(reviewTarget)}
        onClose={() => setReviewTarget(null)}
        title={`Claim Review · ${reviewTarget?.id ?? ''}`}
        maxWidthClass="max-w-md"
      >
        {reviewTarget && (
          <form onSubmit={handleReviewSubmit} className="space-y-4">
            {revError && (
              <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                {revError}
              </div>
            )}
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3 text-xs space-y-1">
              <div className="font-semibold text-[#142D4E] dark:text-white">
                {reviewTarget.patientName} · {reviewTarget.providerName}
              </div>
              <div className="text-slate-500">
                Policy {reviewTarget.policyNumber} · Claimed{' '}
                <span className="font-mono-num font-semibold text-slate-800 dark:text-slate-100">
                  {formatCurrency(reviewTarget.claimAmount)}
                </span>
              </div>
              <div className="text-slate-600 dark:text-slate-300">{reviewTarget.diagnosisOrReason}</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Adjudication Status
              </label>
              <select
                value={revDecision}
                onChange={(e) => setRevDecision(e.target.value as ClaimStatus)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white"
              >
                <option value="Under Review">Under Review</option>
                <option value="Approved">Approved</option>
                <option value="Paid">Paid (Settle &amp; Credit Invoice)</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            {revDecision !== 'Rejected' && revDecision !== 'Under Review' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Approved / Settlement Amount ($)
                </label>
                <input
                  type="number"
                  min={0}
                  max={reviewTarget.claimAmount}
                  step="0.01"
                  value={revAmount}
                  onChange={(e) => setRevAmount(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white font-mono-num"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payer Adjudication Remarks
              </label>
              <textarea
                rows={2}
                value={revRemarks}
                onChange={(e) => setRevRemarks(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReviewTarget(null)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Save Adjudication
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

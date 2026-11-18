import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardEdit, Download, Plus, Printer, QrCode, Search, Trash2 } from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import { DataTable, TableColumn } from '../components/DataTable';
import { ConfirmationDialog, Modal } from '../components/Modal';
import { PatientQrCode } from '../components/PatientQrCode';
import { QrCodeGraphic } from '../components/QrCodeGraphic';
import { LabTest, LabTestStatus } from '../types/hospital';
import { formatCurrency, getTodayIso } from '../services/dataService';
import { buildLabReportQrValue, downloadQrPng } from '../utils/qrCode';

export const Laboratory: React.FC = () => {
  const {
    labTests,
    patients,
    doctors,
    settings,
    qrTarget,
    clearQrTarget,
    setQrScannerOpen,
    addLabTest,
    updateLabTest,
    deleteLabTest,
  } = useHospital();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | LabTestStatus>('All');

  // Add Test Modal
  const [addOpen, setAddOpen] = useState(false);
  const [testName, setTestName] = useState('');
  const [category, setCategory] = useState('Hematology');
  const [patientId, setPatientId] = useState(patients[0]?.id ?? '');
  const [orderedByDoctor, setOrderedByDoctor] = useState(doctors[0]?.name ?? '');
  const [referenceRange, setReferenceRange] = useState('');
  const [cost, setCost] = useState('85');

  // Update Result Modal
  const [resultTarget, setResultTarget] = useState<LabTest | null>(null);
  const [editStatus, setEditStatus] = useState<LabTestStatus>('Processing');
  const [editResult, setEditResult] = useState('');
  const [editTechnician, setEditTechnician] = useState('');

  // Print Report Modal
  const [reportTarget, setReportTarget] = useState<LabTest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LabTest | null>(null);

  useEffect(() => {
    if (!qrTarget || qrTarget.type !== 'lab') return;
    const found = labTests.find((t) => t.id.toLowerCase() === qrTarget.id.toLowerCase());
    if (found) {
      setReportTarget(found);
    }
    clearQrTarget();
  }, [qrTarget, labTests, clearQrTarget]);

  const filteredTests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return labTests.filter((t) => {
      const matchesQ =
        !q ||
        t.id.toLowerCase().includes(q) ||
        t.testName.toLowerCase().includes(q) ||
        t.patientName.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
      return matchesQ && matchesStatus;
    });
  }, [labTests, search, statusFilter]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addLabTest({
      testName: testName.trim(),
      category: category.trim(),
      patientId,
      orderedByDoctor,
      requestDate: getTodayIso(),
      status: 'Requested',
      referenceRange: referenceRange.trim() || undefined,
      cost: Math.max(0, Number(cost) || 0),
      technician: 'Unassigned',
    });
    setTestName('');
    setReferenceRange('');
    setAddOpen(false);
  };

  const openResultModal = (test: LabTest) => {
    setResultTarget(test);
    setEditStatus(test.status);
    setEditResult(test.resultSummary ?? '');
    setEditTechnician(test.technician ?? 'S. Mercer, CLS');
  };

  const handleResultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resultTarget) return;
    updateLabTest({
      ...resultTarget,
      status: editStatus,
      resultSummary: editResult.trim() || undefined,
      technician: editTechnician.trim() || 'S. Mercer, CLS',
      completedDate: editStatus === 'Completed' ? resultTarget.completedDate || getTodayIso() : undefined,
    });
    setResultTarget(null);
  };

  const getStatusClass = (status: LabTestStatus) => {
    switch (status) {
      case 'Completed':
        return 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10';
      case 'Processing':
        return 'text-[#2563EB] bg-[#2563EB]/10';
      case 'Requested':
        return 'text-amber-700 dark:text-amber-400 bg-amber-500/10';
    }
  };

  const columns: TableColumn<LabTest>[] = [
    {
      key: 'id',
      header: 'Lab ID',
      render: (t) => <span className="font-mono-num text-xs font-semibold text-[#2563EB]">{t.id}</span>,
    },
    {
      key: 'testName',
      header: 'Test & Category',
      render: (t) => (
        <div>
          <div className="font-medium text-[#142D4E] dark:text-white">{t.testName}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{t.category}</div>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Patient',
      render: (t) => (
        <div>
          <div className="font-medium">{t.patientName}</div>
          <div className="font-mono-num text-xs text-slate-400">{t.patientId}</div>
        </div>
      ),
    },
    {
      key: 'doctor',
      header: 'Ordered By',
      render: (t) => <span className="text-xs">{t.orderedByDoctor}</span>,
    },
    {
      key: 'date',
      header: 'Requested',
      render: (t) => <span className="font-mono-num text-xs">{t.requestDate}</span>,
    },
    {
      key: 'cost',
      header: 'Fee',
      align: 'right',
      render: (t) => (
        <span className="font-mono-num text-xs">{formatCurrency(t.cost, settings.currencySymbol)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => (
        <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${getStatusClass(t.status)}`}>
          {t.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (t) => (
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            title="Update Status & Results"
            onClick={() => openResultModal(t)}
            className="rounded p-1.5 text-[#2563EB] hover:bg-blue-50 dark:hover:bg-blue-950/30"
          >
            <ClipboardEdit className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Lab Record QR & Printable Report"
            onClick={() => setReportTarget(t)}
            className="rounded p-1.5 text-[#16B8A6] hover:bg-teal-50 dark:hover:bg-teal-950/30"
          >
            <QrCode className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Printable Lab Report"
            onClick={() => setReportTarget(t)}
            className="rounded p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Printer className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Delete Lab Record"
            onClick={() => setDeleteTarget(t)}
            className="rounded p-1.5 text-slate-400 hover:text-rose-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search lab tests by ID, test name, or patient..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F4F7FB] dark:bg-slate-800 py-2 pl-9 pr-3 text-sm focus:border-[#2563EB] focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-[#F4F7FB] dark:bg-slate-800 p-1">
            {(['All', 'Requested', 'Processing', 'Completed'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-white dark:bg-slate-900 text-[#142D4E] dark:text-white shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setQrScannerOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm font-semibold text-[#142D4E] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
          >
            <QrCode className="h-4 w-4 text-[#16B8A6]" />
            <span>Scan QR</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPatientId(patients[0]?.id ?? '');
              setOrderedByDoctor(doctors[0]?.name ?? '');
              setAddOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Order Lab Test</span>
          </button>
        </div>
      </div>

      <div className="no-print">
        <DataTable columns={columns} data={filteredTests} rowKey={(t) => t.id} />
      </div>

      {/* Add Lab Test Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Assign New Laboratory Test">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Test Name *
              </label>
              <input
                type="text"
                required
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="e.g., Comprehensive Metabolic Panel"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="Hematology">Hematology</option>
                <option value="Clinical Chemistry">Clinical Chemistry</option>
                <option value="Cardiac Biomarkers">Cardiac Biomarkers</option>
                <option value="Microbiology">Microbiology</option>
                <option value="Immunology">Immunology</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Test Fee ({settings.currencySymbol})
              </label>
              <input
                type="number"
                min={0}
                required
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-num"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Patient *
              </label>
              <select
                required
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
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
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Ordering Physician
              </label>
              <select
                value={orderedByDoctor}
                onChange={(e) => setOrderedByDoctor(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Reference Interval
              </label>
              <input
                type="text"
                value={referenceRange}
                onChange={(e) => setReferenceRange(e.target.value)}
                placeholder="e.g., Glucose 70-99 mg/dL"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setAddOpen(false)} className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm">
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white">
              Order Test
            </button>
          </div>
        </form>
      </Modal>

      {/* Update Test Results Modal */}
      <Modal
        open={Boolean(resultTarget)}
        onClose={() => setResultTarget(null)}
        title={`Update Lab Record · ${resultTarget?.id ?? ''}`}
        subtitle={resultTarget ? `${resultTarget.testName} · ${resultTarget.patientName}` : undefined}
      >
        <form onSubmit={handleResultSubmit} className="space-y-4">
          {resultTarget && (
            <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3">
              <div className="min-w-0 text-xs">
                <div className="font-mono-num font-bold text-[#2563EB]">{resultTarget.id}</div>
                <div className="mt-0.5 font-semibold text-[#142D4E] dark:text-white truncate">
                  {resultTarget.testName}
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  Patient: {resultTarget.patientName} ({resultTarget.patientId})
                </div>
              </div>
              <QrCodeGraphic value={buildLabReportQrValue(resultTarget.id)} size={58} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Test Status
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as LabTestStatus)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="Requested">Requested</option>
                <option value="Processing">Processing</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Lab Technologist
              </label>
              <input
                type="text"
                value={editTechnician}
                onChange={(e) => setEditTechnician(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Recorded Test Results
            </label>
            <textarea
              rows={3}
              value={editResult}
              onChange={(e) => setEditResult(e.target.value)}
              placeholder="Enter measured laboratory values and technical observations..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setResultTarget(null)} className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm">
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white">
              Save Lab Record
            </button>
          </div>
        </form>
      </Modal>

      {/* Printable Lab Report Modal */}
      <Modal
        open={Boolean(reportTarget)}
        onClose={() => setReportTarget(null)}
        title={`Laboratory Report · ${reportTarget?.id ?? ''}`}
        maxWidthClass="max-w-2xl"
        printable
      >
        {reportTarget && (() => {
          const patientRecord = patients.find((p) => p.id === reportTarget.patientId);

          return (
            <div className="space-y-5">
              <div className="print-surface print-a4-sheet rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-6 space-y-5">
                {/* Diagnostic Letterhead */}
                <div className="print-a4-header flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#16B8A6]">
                      Clinical Pathology &amp; Diagnostics Department
                    </div>
                    <h3 className="font-display text-lg font-bold text-[#142D4E] dark:text-white">
                      {settings.hospitalName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{settings.address}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {settings.phone} · {settings.email}
                    </p>
                    <p className="font-mono-num text-[11px] text-slate-400">
                      Reg. Code: {settings.registrationCode}
                    </p>
                  </div>
                  <div className="flex items-start justify-between sm:justify-end gap-4">
                    <div className="sm:text-right font-mono-num text-xs space-y-0.5">
                      <div className="font-sans text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Laboratory Report
                      </div>
                      <div className="text-base font-bold text-[#2563EB]">{reportTarget.id}</div>
                      <div className="text-slate-500 dark:text-slate-400">
                        Requested: {reportTarget.requestDate}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400">
                        Completed: {reportTarget.completedDate || 'Pending'}
                      </div>
                    </div>
                    <QrCodeGraphic
                      value={buildLabReportQrValue(reportTarget.id)}
                      size={78}
                      label="Scan Report"
                    />
                  </div>
                </div>

                {/* Patient & Clinical Order Metadata */}
                <div className="print-a4-meta-grid grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Patient Information
                      </span>
                      <div className="mt-1 text-sm font-semibold text-[#142D4E] dark:text-white">
                        {reportTarget.patientName}
                      </div>
                      <div className="font-mono-num text-slate-500 dark:text-slate-400">
                        Patient ID: {reportTarget.patientId}
                      </div>
                      {patientRecord && (
                        <div className="mt-0.5 text-slate-500 dark:text-slate-400">
                          {patientRecord.age} yrs · {patientRecord.gender} · Blood Group: {patientRecord.bloodGroup}
                        </div>
                      )}
                    </div>
                    <PatientQrCode
                      patientId={reportTarget.patientId}
                      patientName={reportTarget.patientName}
                      size={64}
                      caption="Patient ID"
                      showIdLabel={false}
                      className="shrink-0"
                    />
                  </div>
                  <div className="sm:text-right">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Ordering &amp; Processing
                    </span>
                    <div className="mt-1 text-sm font-semibold text-[#142D4E] dark:text-white">
                      {reportTarget.orderedByDoctor}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      Technologist: {reportTarget.technician || 'Pending Assignment'}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      Report Status: <span className="font-semibold text-[#142D4E] dark:text-white">{reportTarget.status}</span>
                    </div>
                  </div>
                </div>

                {/* Diagnostic Assay Summary Table */}
                <table className="print-a4-table w-full text-sm border-t border-b border-slate-200 dark:border-slate-800">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                      <th className="py-2 text-left font-semibold">Diagnostic Investigation</th>
                      <th className="py-2 text-left font-semibold">Category</th>
                      <th className="py-2 text-left font-semibold">Reference Interval</th>
                      <th className="py-2 text-right font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    <tr>
                      <td className="py-3 font-semibold text-[#142D4E] dark:text-white">
                        {reportTarget.testName}
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-300">
                        {reportTarget.category}
                      </td>
                      <td className="py-3 font-mono-num text-slate-600 dark:text-slate-300">
                        {reportTarget.referenceRange || 'Clinical standard'}
                      </td>
                      <td className="py-3 text-right font-semibold text-[#142D4E] dark:text-white">
                        {reportTarget.status}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Observed Results Panel */}
                <div className="print-a4-panel rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Observed Results &amp; Technical Findings
                  </div>
                  <p className="text-sm font-medium leading-relaxed text-[#142D4E] dark:text-white whitespace-pre-line">
                    {reportTarget.resultSummary || 'Results pending laboratory completion.'}
                  </p>
                </div>

                {/* A4 Pathology Verification Footer */}
                <div className="print-a4-footer print-only space-y-4 pt-4 text-[11px] text-slate-600">
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <div className="h-8 border-b border-slate-400" />
                      <p className="mt-1.5 font-semibold text-[#142D4E]">
                        {reportTarget.technician || 'Laboratory Technologist'}
                      </p>
                      <p className="text-[10px] text-slate-500">Clinical Laboratory Scientist</p>
                    </div>
                    <div>
                      <div className="h-8 border-b border-slate-400" />
                      <p className="mt-1.5 font-semibold text-[#142D4E]">Chief Pathologist / Verified By</p>
                      <p className="text-[10px] text-slate-500">
                        {settings.hospitalName} · {reportTarget.id}
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Clinical correlation advised. Laboratory findings should be interpreted by the ordering physician ({reportTarget.orderedByDoctor}).
                  </p>
                </div>
              </div>

              <div className="no-print flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() =>
                    downloadQrPng(
                      buildLabReportQrValue(reportTarget.id),
                      `lab-report-qr-${reportTarget.id}`
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-[#142D4E] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download QR PNG</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setReportTarget(null)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm whitespace-nowrap"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#142D4E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d3e6b] whitespace-nowrap"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print Lab Report (A4)</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteLabTest(deleteTarget.id);
        }}
        title="Delete Laboratory Record"
        message={`Remove lab test ${deleteTarget?.id} (${deleteTarget?.testName})?`}
        confirmLabel="Delete Record"
      />
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { CreditCard, Plus, Printer, Search, Trash2 } from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import { DataTable, TableColumn } from '../components/DataTable';
import { ConfirmationDialog, Modal } from '../components/Modal';
import { PatientQrCode } from '../components/PatientQrCode';
import { Invoice, PaymentStatus } from '../types/hospital';
import { addDaysIso, calculateInvoiceTotal, formatCurrency, getTodayIso } from '../services/dataService';

export const Billing: React.FC = () => {
  const { invoices, patients, settings, createInvoice, recordInvoicePayment, deleteInvoice } =
    useHospital();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | PaymentStatus>('All');

  // Create Invoice Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [patientId, setPatientId] = useState(patients[0]?.id ?? '');
  const [consultationCharges, setConsultationCharges] = useState('180');
  const [roomCharges, setRoomCharges] = useState('0');
  const [labCharges, setLabCharges] = useState('0');
  const [medicineCharges, setMedicineCharges] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [paidAmount, setPaidAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<Invoice['paymentMethod']>('Card');
  const [notes, setNotes] = useState('');

  // Record Payment Modal
  const [payTarget, setPayTarget] = useState<Invoice | null>(null);
  const [payInput, setPayInput] = useState('');
  const [payMethod, setPayMethod] = useState<Invoice['paymentMethod']>('Card');

  // Printable Invoice Modal
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);

  const liveTotal = useMemo(
    () =>
      calculateInvoiceTotal(
        Number(consultationCharges),
        Number(roomCharges),
        Number(labCharges),
        Number(medicineCharges),
        Number(discount)
      ),
    [consultationCharges, roomCharges, labCharges, medicineCharges, discount]
  );

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      const matchesQ =
        !q || inv.id.toLowerCase().includes(q) || inv.patientName.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'All' || inv.paymentStatus === statusFilter;
      return matchesQ && matchesStatus;
    });
  }, [invoices, search, statusFilter]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const today = getTodayIso();
    createInvoice({
      patientId,
      date: today,
      dueDate: addDaysIso(today, 14),
      consultationCharges: Number(consultationCharges) || 0,
      roomCharges: Number(roomCharges) || 0,
      labCharges: Number(labCharges) || 0,
      medicineCharges: Number(medicineCharges) || 0,
      discount: Number(discount) || 0,
      paidAmount: Number(paidAmount) || 0,
      paymentMethod,
      notes: notes.trim() || undefined,
    });
    setCreateOpen(false);
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTarget) return;
    recordInvoicePayment(payTarget.id, Number(payInput) || 0, payMethod);
    setPayTarget(null);
  };

  const getStatusClass = (status: PaymentStatus) => {
    switch (status) {
      case 'Paid':
        return 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10';
      case 'Partially Paid':
        return 'text-amber-700 dark:text-amber-400 bg-amber-500/10';
      case 'Pending':
        return 'text-rose-700 dark:text-rose-400 bg-rose-500/10';
    }
  };

  const columns: TableColumn<Invoice>[] = [
    {
      key: 'id',
      header: 'Invoice #',
      render: (inv) => <span className="font-mono-num text-xs font-semibold text-[#2563EB]">{inv.id}</span>,
    },
    {
      key: 'patient',
      header: 'Patient',
      render: (inv) => (
        <div>
          <div className="font-medium text-[#142D4E] dark:text-white">{inv.patientName}</div>
          <div className="font-mono-num text-xs text-slate-400">{inv.patientId}</div>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Issued',
      render: (inv) => <span className="font-mono-num text-xs">{inv.date}</span>,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (inv) => (
        <span className="font-mono-num font-semibold">
          {formatCurrency(inv.totalAmount, settings.currencySymbol)}
        </span>
      ),
    },
    {
      key: 'paid',
      header: 'Paid',
      align: 'right',
      render: (inv) => (
        <span className="font-mono-num text-emerald-700 dark:text-emerald-400">
          {formatCurrency(inv.paidAmount, settings.currencySymbol)}
        </span>
      ),
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      render: (inv) => (
        <span className="font-mono-num font-medium">
          {formatCurrency(Math.max(0, inv.totalAmount - inv.paidAmount), settings.currencySymbol)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (inv) => (
        <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${getStatusClass(inv.paymentStatus)}`}>
          {inv.paymentStatus}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (inv) => (
        <div className="inline-flex items-center gap-1">
          {inv.paymentStatus !== 'Paid' && (
            <button
              type="button"
              title="Record Payment"
              onClick={() => {
                setPayTarget(inv);
                setPayInput(String(Math.max(0, inv.totalAmount - inv.paidAmount)));
                setPayMethod(inv.paymentMethod ?? 'Card');
              }}
              className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <CreditCard className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            title="View / Print Invoice"
            onClick={() => setPrintInvoice(inv)}
            className="rounded p-1.5 text-[#2563EB] hover:bg-blue-50 dark:hover:bg-blue-950/30"
          >
            <Printer className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Delete Invoice"
            onClick={() => setDeleteTarget(inv)}
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
      {/* Toolbar */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoices by number or patient name..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F4F7FB] dark:bg-slate-800 py-2 pl-9 pr-3 text-sm focus:border-[#2563EB] focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-[#F4F7FB] dark:bg-slate-800 p-1">
            {(['All', 'Paid', 'Partially Paid', 'Pending'] as const).map((st) => (
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

        <button
          type="button"
          onClick={() => {
            setPatientId(patients[0]?.id ?? '');
            setConsultationCharges('180');
            setRoomCharges('0');
            setLabCharges('0');
            setMedicineCharges('0');
            setDiscount('0');
            setPaidAmount('0');
            setNotes('');
            setCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          <span>Generate Invoice</span>
        </button>
      </div>

      {/* Invoices Table */}
      <div className="no-print">
        <DataTable columns={columns} data={filteredInvoices} rowKey={(i) => i.id} />
      </div>

      {/* Generate Invoice Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Generate Patient Invoice"
        subtitle="Totals and payment status are computed automatically"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Consultation Charges ({settings.currencySymbol})
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={consultationCharges}
                onChange={(e) => setConsultationCharges(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Room / Bed Charges ({settings.currencySymbol})
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={roomCharges}
                onChange={(e) => setRoomCharges(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Laboratory Charges ({settings.currencySymbol})
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={labCharges}
                onChange={(e) => setLabCharges(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Medicine Charges ({settings.currencySymbol})
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={medicineCharges}
                onChange={(e) => setMedicineCharges(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Discount ({settings.currencySymbol})
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Initial Payment ({settings.currencySymbol})
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-num"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as Invoice['paymentMethod'])}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="Card">Card</option>
                <option value="Insurance">Insurance</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Billing Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="OPD visit, diagnostic labs..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F4F7FB] dark:bg-slate-800 p-3.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Calculated Total Amount
            </span>
            <span className="font-display text-lg font-bold text-[#142D4E] dark:text-white font-mono-num">
              {formatCurrency(liveTotal, settings.currencySymbol)}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setCreateOpen(false)} className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm">
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white">
              Create Invoice
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        open={Boolean(payTarget)}
        onClose={() => setPayTarget(null)}
        title={`Record Payment · ${payTarget?.id ?? ''}`}
        subtitle={payTarget ? `Patient: ${payTarget.patientName}` : undefined}
        maxWidthClass="max-w-md"
      >
        {payTarget && (
          <form onSubmit={handlePaySubmit} className="space-y-4">
            <div className="text-xs text-slate-500 space-y-1">
              <div>
                Invoice Total:{' '}
                <span className="font-mono-num font-semibold text-[#142D4E] dark:text-white">
                  {formatCurrency(payTarget.totalAmount, settings.currencySymbol)}
                </span>
              </div>
              <div>
                Remaining Balance:{' '}
                <span className="font-mono-num font-semibold text-rose-600">
                  {formatCurrency(payTarget.totalAmount - payTarget.paidAmount, settings.currencySymbol)}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Payment Amount ({settings.currencySymbol})
              </label>
              <input
                type="number"
                min={0.01}
                step="0.01"
                required
                value={payInput}
                onChange={(e) => setPayInput(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Payment Method
              </label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as Invoice['paymentMethod'])}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="Card">Card</option>
                <option value="Insurance">Insurance</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setPayTarget(null)} className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm">
                Cancel
              </button>
              <button type="submit" className="rounded-lg bg-[#16B8A6] px-4 py-2 text-sm font-semibold text-white">
                Confirm Payment
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Printable Invoice Modal */}
      <Modal
        open={Boolean(printInvoice)}
        onClose={() => setPrintInvoice(null)}
        title={`Hospital Invoice · ${printInvoice?.id ?? ''}`}
        maxWidthClass="max-w-2xl"
        printable
      >
        {printInvoice && (() => {
          const patientRecord = patients.find((p) => p.id === printInvoice.patientId);
          const subtotal =
            printInvoice.consultationCharges +
            printInvoice.roomCharges +
            printInvoice.labCharges +
            printInvoice.medicineCharges;
          const balanceDue = Math.max(0, printInvoice.totalAmount - printInvoice.paidAmount);

          return (
            <div className="space-y-6">
              <div className="print-surface print-a4-sheet rounded-lg border border-slate-200 dark:border-slate-700 p-6 space-y-5 bg-white dark:bg-slate-950">
                {/* Hospital Letterhead */}
                <div className="print-a4-header flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#2563EB]">
                      Official Billing Statement
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
                  <div className="sm:text-right space-y-0.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Hospital Invoice
                    </div>
                    <div className="font-mono-num text-base font-bold text-[#2563EB]">
                      {printInvoice.id}
                    </div>
                    <div className="font-mono-num text-xs text-slate-500 dark:text-slate-400">
                      Issued: {printInvoice.date}
                    </div>
                    <div className="font-mono-num text-xs text-slate-500 dark:text-slate-400">
                      Due: {printInvoice.dueDate}
                    </div>
                  </div>
                </div>

                {/* Patient & Billing Metadata */}
                <div className="print-a4-meta-grid grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Billed To
                      </span>
                      <div className="mt-1 text-sm font-semibold text-[#142D4E] dark:text-white">
                        {printInvoice.patientName}
                      </div>
                      <div className="font-mono-num text-slate-500 dark:text-slate-400">
                        Patient ID: {printInvoice.patientId}
                      </div>
                      {patientRecord && (
                        <div className="mt-0.5 text-slate-500 dark:text-slate-400">
                          {patientRecord.age} yrs · {patientRecord.gender} · {patientRecord.phone}
                        </div>
                      )}
                    </div>
                    <PatientQrCode
                      patientId={printInvoice.patientId}
                      patientName={printInvoice.patientName}
                      size={64}
                      caption="Patient ID"
                      showIdLabel={false}
                      className="shrink-0"
                    />
                  </div>
                  <div className="sm:text-right">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Payment Details
                    </span>
                    <div className="mt-1 text-sm font-bold text-[#142D4E] dark:text-white">
                      {printInvoice.paymentStatus}
                    </div>
                    {printInvoice.paymentMethod && (
                      <div className="text-slate-500 dark:text-slate-400">
                        Method: {printInvoice.paymentMethod}
                      </div>
                    )}
                    <div className="text-slate-500 dark:text-slate-400">
                      Currency: {settings.currencySymbol}
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <table className="print-a4-table w-full text-sm border-t border-b border-slate-200 dark:border-slate-800">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                      <th className="py-2 text-left font-semibold w-10">#</th>
                      <th className="py-2 text-left font-semibold">Charge Description</th>
                      <th className="py-2 text-left font-semibold">Department</th>
                      <th className="py-2 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    <tr>
                      <td className="py-2.5 font-mono-num text-slate-400">01</td>
                      <td className="py-2.5 font-medium">Physician Consultation Charges</td>
                      <td className="py-2.5 text-slate-500 dark:text-slate-400">Outpatient / Clinical</td>
                      <td className="py-2.5 text-right font-mono-num">
                        {formatCurrency(printInvoice.consultationCharges, settings.currencySymbol)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-mono-num text-slate-400">02</td>
                      <td className="py-2.5 font-medium">Ward &amp; Room Accommodation Charges</td>
                      <td className="py-2.5 text-slate-500 dark:text-slate-400">Inpatient Nursing</td>
                      <td className="py-2.5 text-right font-mono-num">
                        {formatCurrency(printInvoice.roomCharges, settings.currencySymbol)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-mono-num text-slate-400">03</td>
                      <td className="py-2.5 font-medium">Laboratory &amp; Diagnostic Tests</td>
                      <td className="py-2.5 text-slate-500 dark:text-slate-400">Clinical Diagnostics</td>
                      <td className="py-2.5 text-right font-mono-num">
                        {formatCurrency(printInvoice.labCharges, settings.currencySymbol)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-mono-num text-slate-400">04</td>
                      <td className="py-2.5 font-medium">Pharmacy &amp; Medications</td>
                      <td className="py-2.5 text-slate-500 dark:text-slate-400">Hospital Pharmacy</td>
                      <td className="py-2.5 text-right font-mono-num">
                        {formatCurrency(printInvoice.medicineCharges, settings.currencySymbol)}
                      </td>
                    </tr>
                    {printInvoice.discount > 0 && (
                      <tr>
                        <td className="py-2.5 font-mono-num text-slate-400">05</td>
                        <td className="py-2.5 font-medium text-emerald-700 dark:text-emerald-400">
                          Hospital Discount
                        </td>
                        <td className="py-2.5 text-slate-500 dark:text-slate-400">Billing Adjustment</td>
                        <td className="py-2.5 text-right font-mono-num text-emerald-700 dark:text-emerald-400">
                          -{formatCurrency(printInvoice.discount, settings.currencySymbol)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Totals Summary */}
                <div className="print-a4-summary space-y-1.5 text-xs sm:ml-auto sm:w-64">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Gross Subtotal</span>
                    <span className="font-mono-num">
                      {formatCurrency(subtotal, settings.currencySymbol)}
                    </span>
                  </div>
                  {printInvoice.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Discount Applied</span>
                      <span className="font-mono-num text-emerald-700 dark:text-emerald-400">
                        -{formatCurrency(printInvoice.discount, settings.currencySymbol)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-1.5">
                    <span className="font-semibold text-[#142D4E] dark:text-white">Total Amount</span>
                    <span className="font-mono-num font-bold text-sm text-[#142D4E] dark:text-white">
                      {formatCurrency(printInvoice.totalAmount, settings.currencySymbol)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Amount Paid</span>
                    <span className="font-mono-num text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(printInvoice.paidAmount, settings.currencySymbol)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-1.5 font-semibold text-sm">
                    <span className="text-[#142D4E] dark:text-white">Balance Due</span>
                    <span className="font-mono-num text-[#142D4E] dark:text-white">
                      {formatCurrency(balanceDue, settings.currencySymbol)}
                    </span>
                  </div>
                </div>

                {printInvoice.notes && (
                  <p className="print-avoid-break text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <span className="font-semibold text-[#142D4E] dark:text-white">Billing Notes: </span>
                    {printInvoice.notes}
                  </p>
                )}

                {/* A4 Authorization & Print Footer */}
                <div className="print-a4-footer print-only-grid grid-cols-2 gap-8 pt-6 text-[11px] text-slate-600">
                  <div>
                    <div className="h-8 border-b border-slate-400" />
                    <p className="mt-1.5 font-semibold text-[#142D4E]">Authorized Billing Officer</p>
                    <p className="text-[10px] text-slate-500">{settings.hospitalName}</p>
                  </div>
                  <div>
                    <div className="h-8 border-b border-slate-400" />
                    <p className="mt-1.5 font-semibold text-[#142D4E]">Patient / Representative Signature</p>
                    <p className="text-[10px] text-slate-500">
                      Invoice {printInvoice.id} · A4 Official Copy
                    </p>
                  </div>
                </div>
              </div>

              <div className="no-print flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPrintInvoice(null)}
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
                  <span>Print Invoice (A4)</span>
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteInvoice(deleteTarget.id);
        }}
        title="Delete Invoice"
        message={`Delete invoice ${deleteTarget?.id} for ${deleteTarget?.patientName}?`}
        confirmLabel="Delete Invoice"
      />
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Edit3,
  PackagePlus,
  Pill,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import { DataTable, TableColumn } from '../components/DataTable';
import { ConfirmationDialog, Modal } from '../components/Modal';
import { Medicine, MedicineIssue, MedicinePurchase } from '../types/hospital';
import { addDaysIso, formatCurrency, getTodayIso } from '../services/dataService';

interface MedFormState {
  name: string;
  genericName: string;
  category: string;
  manufacturer: string;
  batchNumber: string;
  stock: string;
  reorderLevel: string;
  unitPrice: string;
  expiryDate: string;
  unit: string;
}

const EMPTY_MED: MedFormState = {
  name: '',
  genericName: '',
  category: 'Antibiotic',
  manufacturer: '',
  batchNumber: '',
  stock: '50',
  reorderLevel: '20',
  unitPrice: '5.00',
  expiryDate: '',
  unit: 'Tablets',
};

type PharmacyTab = 'inventory' | 'purchases' | 'issues';

export const Pharmacy: React.FC = () => {
  const {
    medicines,
    medicinePurchases,
    medicineIssues,
    patients,
    doctors,
    session,
    addMedicine,
    updateMedicine,
    deleteMedicine,
    recordMedicinePurchase,
    issueMedicine,
    settings,
  } = useHospital();

  const [activeTab, setActiveTab] = useState<PharmacyTab>('inventory');
  const [search, setSearch] = useState('');
  const [alertFilter, setAlertFilter] = useState<'All' | 'Low Stock' | 'Near Expiry'>('All');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medicine | null>(null);
  const [form, setForm] = useState<MedFormState>(EMPTY_MED);
  const [deleteTarget, setDeleteTarget] = useState<Medicine | null>(null);

  // Restock Purchase Modal
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purMedicineId, setPurMedicineId] = useState('');
  const [purSupplier, setPurSupplier] = useState('');
  const [purBatch, setPurBatch] = useState('');
  const [purExpiry, setPurExpiry] = useState('');
  const [purQty, setPurQty] = useState('50');
  const [purUnitCost, setPurUnitCost] = useState('1.50');
  const [purNotes, setPurNotes] = useState('');
  const [purError, setPurError] = useState('');

  // Dispense / Issue Medicine Modal
  const [issueOpen, setIssueOpen] = useState(false);
  const [issMedId, setIssMedId] = useState('');
  const [issPatientId, setIssPatientId] = useState('');
  const [issQty, setIssQty] = useState('10');
  const [issDoctor, setIssDoctor] = useState('');
  const [issNotes, setIssNotes] = useState('');
  const [issError, setIssError] = useState('');

  const today = getTodayIso();
  const nearExpiryCutoff = addDaysIso(today, 60);

  const lowStockCount = useMemo(
    () => medicines.filter((m) => m.stock <= m.reorderLevel).length,
    [medicines]
  );
  const nearExpiryCount = useMemo(
    () => medicines.filter((m) => m.expiryDate <= nearExpiryCutoff).length,
    [medicines, nearExpiryCutoff]
  );

  const filteredMedicines = useMemo(() => {
    const q = search.trim().toLowerCase();
    return medicines.filter((m) => {
      const matchesQ =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.genericName.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.batchNumber.toLowerCase().includes(q);
      const isLow = m.stock <= m.reorderLevel;
      const isExp = m.expiryDate <= nearExpiryCutoff;
      const matchesFilter =
        alertFilter === 'All' ||
        (alertFilter === 'Low Stock' && isLow) ||
        (alertFilter === 'Near Expiry' && isExp);
      return matchesQ && matchesFilter;
    });
  }, [medicines, search, alertFilter, nearExpiryCutoff]);

  const filteredPurchases = useMemo(() => {
    const q = search.trim().toLowerCase();
    return medicinePurchases.filter((p) => {
      if (!q) return true;
      return (
        p.id.toLowerCase().includes(q) ||
        p.medicineName.toLowerCase().includes(q) ||
        p.supplier.toLowerCase().includes(q) ||
        p.batchNumber.toLowerCase().includes(q)
      );
    });
  }, [medicinePurchases, search]);

  const filteredIssues = useMemo(() => {
    const q = search.trim().toLowerCase();
    return medicineIssues.filter((i) => {
      if (!q) return true;
      return (
        i.id.toLowerCase().includes(q) ||
        i.medicineName.toLowerCase().includes(q) ||
        i.patientName.toLowerCase().includes(q) ||
        i.prescribedBy.toLowerCase().includes(q)
      );
    });
  }, [medicineIssues, search]);

  const openAdd = () => {
    setEditingMed(null);
    setForm({ ...EMPTY_MED, expiryDate: addDaysIso(today, 180) });
    setModalOpen(true);
  };

  const openEdit = (med: Medicine) => {
    setEditingMed(med);
    setForm({
      name: med.name,
      genericName: med.genericName,
      category: med.category,
      manufacturer: med.manufacturer,
      batchNumber: med.batchNumber,
      stock: String(med.stock),
      reorderLevel: String(med.reorderLevel),
      unitPrice: String(med.unitPrice),
      expiryDate: med.expiryDate,
      unit: med.unit,
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      genericName: form.genericName.trim(),
      category: form.category.trim(),
      manufacturer: form.manufacturer.trim(),
      batchNumber: form.batchNumber.trim(),
      stock: Math.max(0, Number(form.stock) || 0),
      reorderLevel: Math.max(0, Number(form.reorderLevel) || 0),
      unitPrice: Math.max(0, Number(form.unitPrice) || 0),
      expiryDate: form.expiryDate,
      unit: form.unit.trim() || 'Units',
    };
    if (editingMed) {
      updateMedicine({ ...editingMed, ...payload });
    } else {
      addMedicine(payload);
    }
    setModalOpen(false);
  };

  const openPurchaseModal = (preselectedMedId?: string) => {
    const med = medicines.find((m) => m.id === preselectedMedId) ?? medicines[0];
    setPurMedicineId(med?.id ?? '');
    setPurSupplier(med?.manufacturer ? `${med.manufacturer} Supply` : 'MedCore Wholesale Distributors');
    setPurBatch(med ? `${med.batchNumber.slice(0, 6)}-R` : '');
    setPurExpiry(addDaysIso(today, 365));
    setPurQty('50');
    setPurUnitCost(med ? String(Math.max(0.5, Number((med.unitPrice * 0.65).toFixed(2)))) : '1.50');
    setPurNotes('');
    setPurError('');
    setPurchaseOpen(true);
  };

  const handlePurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purMedicineId || !purSupplier.trim() || !purBatch.trim()) {
      setPurError('Medicine, supplier name, and batch number are required.');
      return;
    }
    const res = recordMedicinePurchase({
      medicineId: purMedicineId,
      supplier: purSupplier,
      batchNumber: purBatch,
      expiryDate: purExpiry || addDaysIso(today, 365),
      quantity: Number(purQty) || 0,
      unitCost: Number(purUnitCost) || 0,
      notes: purNotes,
    });
    if (!res.ok) {
      setPurError(res.error || 'Could not record purchase.');
      return;
    }
    setPurchaseOpen(false);
  };

  const openIssueModal = (preselectedMedId?: string) => {
    const med = medicines.find((m) => m.id === preselectedMedId) ?? medicines[0];
    setIssMedId(med?.id ?? '');
    setIssPatientId(patients[0]?.id ?? '');
    setIssQty('10');
    setIssDoctor(doctors[0]?.name ?? session?.name ?? '');
    setIssNotes('');
    setIssError('');
    setIssueOpen(true);
  };

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issMedId || !issPatientId) {
      setIssError('Please select both a medicine and a patient.');
      return;
    }
    const res = issueMedicine({
      medicineId: issMedId,
      patientId: issPatientId,
      quantity: Number(issQty) || 0,
      prescribedBy: issDoctor,
      notes: issNotes,
    });
    if (!res.ok) {
      setIssError(res.error || 'Could not issue medicine.');
      return;
    }
    setIssueOpen(false);
  };

  const columns: TableColumn<Medicine>[] = [
    {
      key: 'id',
      header: 'Code',
      render: (m) => <span className="font-mono-num text-xs font-semibold text-[#2563EB]">{m.id}</span>,
    },
    {
      key: 'name',
      header: 'Medicine',
      render: (m) => (
        <div>
          <div className="font-medium text-[#142D4E] dark:text-white">{m.name}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {m.genericName} · {m.category}
          </div>
        </div>
      ),
    },
    {
      key: 'batch',
      header: 'Batch',
      render: (m) => <span className="font-mono-num text-xs">{m.batchNumber}</span>,
    },
    {
      key: 'stock',
      header: 'Stock',
      align: 'right',
      render: (m) => {
        const isLow = m.stock <= m.reorderLevel;
        return (
          <div className="text-right">
            <div className={`font-mono-num font-semibold ${isLow ? 'text-rose-600 dark:text-rose-400' : ''}`}>
              {m.stock} {m.unit}
            </div>
            <div className="text-[11px] text-slate-400">Min: {m.reorderLevel}</div>
          </div>
        );
      },
    },
    {
      key: 'price',
      header: 'Unit Price',
      align: 'right',
      render: (m) => (
        <span className="font-mono-num text-xs">
          {formatCurrency(m.unitPrice, settings.currencySymbol)}
        </span>
      ),
    },
    {
      key: 'expiry',
      header: 'Expiry Date',
      render: (m) => {
        const isNear = m.expiryDate <= nearExpiryCutoff;
        return (
          <span className={`font-mono-num text-xs font-medium ${isNear ? 'text-amber-600 dark:text-amber-400' : ''}`}>
            {m.expiryDate}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Stock Status',
      render: (m) => {
        const isLow = m.stock <= m.reorderLevel;
        const isNear = m.expiryDate <= nearExpiryCutoff;
        if (isLow) {
          return (
            <span className="inline-block rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
              Low Stock
            </span>
          );
        }
        if (isNear) {
          return (
            <span className="inline-block rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
              Near Expiry
            </span>
          );
        }
        return (
          <span className="inline-block rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            In Stock
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (m) => (
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => openPurchaseModal(m.id)}
            title={`Restock ${m.name}`}
            aria-label={`Restock ${m.name}`}
            className="rounded p-1.5 text-slate-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600"
          >
            <PackagePlus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => openIssueModal(m.id)}
            title={`Dispense ${m.name}`}
            aria-label={`Dispense ${m.name}`}
            className="rounded p-1.5 text-slate-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-[#2563EB]"
          >
            <ArrowUpRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => openEdit(m)}
            aria-label={`Edit ${m.name}`}
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#2563EB]"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(m)}
            aria-label={`Delete ${m.name}`}
            className="rounded p-1.5 text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const purchaseColumns: TableColumn<MedicinePurchase>[] = [
    {
      key: 'id',
      header: 'Purchase ID',
      render: (p) => (
        <div>
          <div className="font-mono-num text-xs font-semibold text-[#142D4E] dark:text-slate-100">{p.id}</div>
          <div className="font-mono-num text-xs text-slate-500">{p.purchaseDate}</div>
        </div>
      ),
    },
    {
      key: 'medicine',
      header: 'Medicine & Batch',
      render: (p) => (
        <div>
          <div className="text-sm font-semibold text-[#1E293B] dark:text-white">{p.medicineName}</div>
          <div className="font-mono-num text-xs text-slate-500">
            Batch {p.batchNumber} · Exp {p.expiryDate}
          </div>
        </div>
      ),
    },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (p) => (
        <div>
          <div className="text-xs font-medium text-slate-700 dark:text-slate-200">{p.supplier}</div>
          <div className="text-[11px] text-slate-500">Rec. by {p.receivedBy}</div>
        </div>
      ),
    },
    {
      key: 'qty',
      header: 'Quantity',
      align: 'right',
      render: (p) => <span className="font-mono-num text-xs font-semibold text-emerald-600">+{p.quantity}</span>,
    },
    {
      key: 'cost',
      header: 'Total Cost',
      align: 'right',
      render: (p) => (
        <div className="text-right font-mono-num text-xs">
          <div className="font-semibold text-[#142D4E] dark:text-white">
            {formatCurrency(p.totalCost, settings.currencySymbol)}
          </div>
          <div className="text-[11px] text-slate-500">
            @{formatCurrency(p.unitCost, settings.currencySymbol)}
          </div>
        </div>
      ),
    },
  ];

  const issueColumns: TableColumn<MedicineIssue>[] = [
    {
      key: 'id',
      header: 'Issue ID',
      render: (i) => (
        <div>
          <div className="font-mono-num text-xs font-semibold text-[#142D4E] dark:text-slate-100">{i.id}</div>
          <div className="font-mono-num text-xs text-slate-500">{i.issuedDate}</div>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Patient',
      render: (i) => (
        <div>
          <div className="text-sm font-semibold text-[#1E293B] dark:text-white">{i.patientName}</div>
          <div className="font-mono-num text-xs text-slate-500">{i.patientId}</div>
        </div>
      ),
    },
    {
      key: 'medicine',
      header: 'Medicine & Batch',
      render: (i) => (
        <div>
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">{i.medicineName}</div>
          <div className="font-mono-num text-[11px] text-slate-500">Batch {i.batchNumber}</div>
        </div>
      ),
    },
    {
      key: 'qty',
      header: 'Qty Issued',
      align: 'right',
      render: (i) => <span className="font-mono-num text-xs font-semibold text-[#2563EB]">-{i.quantity}</span>,
    },
    {
      key: 'prescriber',
      header: 'Prescribed By / Notes',
      render: (i) => (
        <div className="text-xs">
          <div className="font-medium text-slate-700 dark:text-slate-200">{i.prescribedBy}</div>
          {i.notes && <div className="text-[11px] text-slate-500 truncate max-w-[200px]">{i.notes}</div>}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Alert Summary Strip */}
      {(lowStockCount > 0 || nearExpiryCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => {
              setActiveTab('inventory');
              setAlertFilter(alertFilter === 'Low Stock' ? 'All' : 'Low Stock');
            }}
            className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/25 p-4 text-left hover:border-rose-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-rose-900 dark:text-rose-200">
                  Low Stock Alerts ({lowStockCount})
                </div>
                <div className="text-xs text-rose-700 dark:text-rose-300">
                  Medicines at or below minimum reorder threshold
                </div>
              </div>
            </div>
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-300 whitespace-nowrap shrink-0">
              {alertFilter === 'Low Stock' ? 'Show All' : 'Filter'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('inventory');
              setAlertFilter(alertFilter === 'Near Expiry' ? 'All' : 'Near Expiry');
            }}
            className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/25 p-4 text-left hover:border-amber-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Near-Expiry Alerts ({nearExpiryCount})
                </div>
                <div className="text-xs text-amber-700 dark:text-amber-300">
                  Batches expiring within the next 60 days
                </div>
              </div>
            </div>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 whitespace-nowrap shrink-0">
              {alertFilter === 'Near Expiry' ? 'Show All' : 'Filter'}
            </span>
          </button>
        </div>
      )}

      {/* Navigation Tabs & Primary Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'inventory'
                ? 'bg-white dark:bg-slate-900 text-[#142D4E] dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Inventory ({medicines.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('purchases')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'purchases'
                ? 'bg-white dark:bg-slate-900 text-[#142D4E] dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Purchase History ({medicinePurchases.length})
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
            Medicine Issue Records ({medicineIssues.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => openPurchaseModal()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-[#142D4E] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
          >
            <PackagePlus className="h-4 w-4 text-emerald-600" />
            Record Purchase
          </button>
          <button
            type="button"
            onClick={() => openIssueModal()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-[#142D4E] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
          >
            <ArrowUpRight className="h-4 w-4 text-[#2563EB]" />
            Issue Medicine
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add Medicine</span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeTab === 'inventory'
                ? 'Search medicines by name, generic, category, or batch...'
                : activeTab === 'purchases'
                ? 'Search purchases by medicine, supplier, or batch...'
                : 'Search issue logs by patient, medicine, or prescriber...'
            }
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F4F7FB] dark:bg-slate-800 py-2 pl-9 pr-3 text-sm focus:border-[#2563EB] focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
          />
        </div>

        {activeTab === 'inventory' && (
          <div className="flex items-center gap-1 rounded-lg bg-[#F4F7FB] dark:bg-slate-800 p-1 w-fit">
            {(['All', 'Low Stock', 'Near Expiry'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setAlertFilter(f)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
                  alertFilter === f
                    ? 'bg-white dark:bg-slate-900 text-[#142D4E] dark:text-white shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active Tab Table */}
      {activeTab === 'inventory' && (
        <DataTable
          columns={columns}
          data={filteredMedicines}
          rowKey={(m) => m.id}
          emptyTitle="No medicines found"
          emptyDescription="Add a medicine batch or clear your current search filter."
          emptyAction={
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white"
            >
              <Pill className="h-3.5 w-3.5" />
              <span>Add First Medicine</span>
            </button>
          }
        />
      )}

      {activeTab === 'purchases' && (
        <DataTable
          columns={purchaseColumns}
          data={filteredPurchases}
          rowKey={(p) => p.id}
          emptyTitle="No purchase history found"
          emptyDescription="Record a supplier purchase to restock existing medicine batches."
        />
      )}

      {activeTab === 'issues' && (
        <DataTable
          columns={issueColumns}
          data={filteredIssues}
          rowKey={(i) => i.id}
          emptyTitle="No medicine issue records found"
          emptyDescription="Dispensed patient prescriptions and ward stock issues will appear here."
        />
      )}

      {/* Add / Edit Medicine Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingMed ? `Edit Medicine · ${editingMed.id}` : 'Add Medicine to Inventory'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Medicine Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Azithromycin 500mg"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Generic Name *
              </label>
              <input
                type="text"
                required
                value={form.genericName}
                onChange={(e) => setForm({ ...form, genericName: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Category
              </label>
              <input
                type="text"
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Manufacturer
              </label>
              <input
                type="text"
                required
                value={form.manufacturer}
                onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Batch Number *
              </label>
              <input
                type="text"
                required
                value={form.batchNumber}
                onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Unit Label (Tablets, Vials...)
              </label>
              <input
                type="text"
                required
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Available Stock *
              </label>
              <input
                type="number"
                min={0}
                required
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Reorder Alert Level *
              </label>
              <input
                type="number"
                min={0}
                required
                value={form.reorderLevel}
                onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Unit Price ({settings.currencySymbol}) *
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                required
                value={form.unitPrice}
                onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Expiry Date *
              </label>
              <input
                type="date"
                required
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm">
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white">
              {editingMed ? 'Update Medicine' : 'Add Medicine'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Restock Purchase Modal */}
      <Modal
        open={purchaseOpen}
        onClose={() => setPurchaseOpen(false)}
        title="Record Medicine Stock Purchase"
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handlePurchaseSubmit} className="space-y-4">
          {purError && (
            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {purError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Medicine *
              </label>
              <select
                value={purMedicineId}
                onChange={(e) => setPurMedicineId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white"
              >
                {medicines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (Current: {m.stock} {m.unit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supplier *
              </label>
              <input
                type="text"
                required
                value={purSupplier}
                onChange={(e) => setPurSupplier(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Batch Number *
              </label>
              <input
                type="text"
                required
                value={purBatch}
                onChange={(e) => setPurBatch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Quantity Purchased *
              </label>
              <input
                type="number"
                min={1}
                required
                value={purQty}
                onChange={(e) => setPurQty(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unit Cost ({settings.currencySymbol}) *
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                required
                value={purUnitCost}
                onChange={(e) => setPurUnitCost(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Batch Expiry Date
              </label>
              <input
                type="date"
                value={purExpiry}
                onChange={(e) => setPurExpiry(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Notes
              </label>
              <input
                type="text"
                value={purNotes}
                onChange={(e) => setPurNotes(e.target.value)}
                placeholder="Invoice ref or inspection note"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPurchaseOpen(false)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Confirm Purchase &amp; Restock
            </button>
          </div>
        </form>
      </Modal>

      {/* Dispense / Issue Medicine Modal */}
      <Modal
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        title="Dispense / Issue Medicine"
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleIssueSubmit} className="space-y-4">
          {issError && (
            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {issError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Medicine *
              </label>
              <select
                value={issMedId}
                onChange={(e) => setIssMedId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-[#1E293B] dark:text-white"
              >
                {medicines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.stock} {m.unit} avail. · Batch {m.batchNumber})
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Patient *
              </label>
              <select
                value={issPatientId}
                onChange={(e) => setIssPatientId(e.target.value)}
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
                Quantity to Issue *
              </label>
              <input
                type="number"
                min={1}
                required
                value={issQty}
                onChange={(e) => setIssQty(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Prescribed By
              </label>
              <input
                type="text"
                value={issDoctor}
                onChange={(e) => setIssDoctor(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Dispensing Notes
            </label>
            <input
              type="text"
              value={issNotes}
              onChange={(e) => setIssNotes(e.target.value)}
              placeholder="Ward dose, outpatient prescription refill..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIssueOpen(false)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Confirm Issue
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMedicine(deleteTarget.id);
        }}
        title="Delete Medicine Record"
        message={`Remove ${deleteTarget?.name} (Batch ${deleteTarget?.batchNumber}) from pharmacy inventory?`}
        confirmLabel="Remove Medicine"
      />
    </div>
  );
};

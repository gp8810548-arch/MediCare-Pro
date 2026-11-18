import React, { useMemo, useState } from 'react';
import { Edit3, Eye, Mail, Phone, Plus, Search, Trash2, UserCheck, Users } from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import { DataTable, TableColumn } from '../components/DataTable';
import { ConfirmationDialog, Modal } from '../components/Modal';
import { StaffAvailability, StaffMember } from '../types/hospital';
import { getTodayIso } from '../services/dataService';

interface StaffFormState {
  fullName: string;
  role: string;
  department: string;
  shift: StaffMember['shift'];
  phone: string;
  email: string;
  joinDate: string;
  status: StaffMember['status'];
  availability: StaffAvailability;
  notes: string;
}

const EMPTY_STAFF: StaffFormState = {
  fullName: '',
  role: '',
  department: '',
  shift: 'Morning',
  phone: '',
  email: '',
  joinDate: getTodayIso(),
  status: 'Active',
  availability: 'Available',
  notes: '',
};

const AVAILABILITY_OPTIONS: StaffAvailability[] = [
  'Available',
  'On Shift',
  'In Break',
  'Off Duty',
  'On Leave',
];

export const Staff: React.FC = () => {
  const { staff, addStaffMember, updateStaffMember, deleteStaffMember } = useHospital();

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [availabilityFilter, setAvailabilityFilter] = useState<'All' | StaffAvailability>('All');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [viewingStaff, setViewingStaff] = useState<StaffMember | null>(null);
  const [form, setForm] = useState<StaffFormState>(EMPTY_STAFF);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);

  const departments = useMemo(
    () => ['All', ...Array.from(new Set(staff.map((s) => s.department)))],
    [staff]
  );

  const resolveAvailability = (s: StaffMember): StaffAvailability =>
    s.availability ?? (s.status === 'On Leave' ? 'On Leave' : 'On Shift');

  const stats = useMemo(() => {
    const activeCount = staff.filter((s) => {
      const av = resolveAvailability(s);
      return av === 'Available' || av === 'On Shift';
    }).length;
    const nursingCount = staff.filter((s) => s.role.toLowerCase().includes('nurse')).length;
    const onLeaveCount = staff.filter(
      (s) => s.status === 'On Leave' || resolveAvailability(s) === 'On Leave'
    ).length;
    return { total: staff.length, activeCount, nursingCount, onLeaveCount };
  }, [staff]);

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((s) => {
      const matchesQ =
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q);
      const matchesDept = deptFilter === 'All' || s.department === deptFilter;
      const matchesAvail =
        availabilityFilter === 'All' || resolveAvailability(s) === availabilityFilter;
      return matchesQ && matchesDept && matchesAvail;
    });
  }, [staff, search, deptFilter, availabilityFilter]);

  const openAdd = () => {
    setEditingStaff(null);
    setForm({ ...EMPTY_STAFF, joinDate: getTodayIso() });
    setModalOpen(true);
  };

  const openEdit = (member: StaffMember) => {
    setEditingStaff(member);
    setForm({
      fullName: member.fullName,
      role: member.role,
      department: member.department,
      shift: member.shift,
      phone: member.phone,
      email: member.email,
      joinDate: member.joinDate,
      status: member.status,
      availability: resolveAvailability(member),
      notes: member.notes ?? '',
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      fullName: form.fullName.trim(),
      role: form.role.trim(),
      department: form.department.trim(),
      shift: form.shift,
      phone: form.phone.trim(),
      email: form.email.trim(),
      joinDate: form.joinDate,
      status: form.availability === 'On Leave' ? ('On Leave' as const) : form.status,
      availability: form.availability,
      notes: form.notes.trim() || undefined,
    };
    if (editingStaff) {
      updateStaffMember({ ...editingStaff, ...payload });
    } else {
      addStaffMember(payload);
    }
    setModalOpen(false);
  };

  const handleQuickAvailability = (member: StaffMember, nextAvailability: StaffAvailability) => {
    updateStaffMember({
      ...member,
      availability: nextAvailability,
      status: nextAvailability === 'On Leave' ? 'On Leave' : 'Active',
    });
  };

  const columns: TableColumn<StaffMember>[] = [
    {
      key: 'id',
      header: 'Staff ID',
      render: (s) => <span className="font-mono-num text-xs font-semibold text-[#2563EB]">{s.id}</span>,
    },
    {
      key: 'name',
      header: 'Staff Member',
      render: (s) => (
        <div>
          <div className="font-medium text-[#142D4E] dark:text-white">{s.fullName}</div>
          <div className="text-xs text-slate-500">{s.email}</div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Job Role',
      render: (s) => <span className="font-medium">{s.role}</span>,
    },
    {
      key: 'department',
      header: 'Department',
      render: (s) => <span className="text-xs text-[#16B8A6] font-medium">{s.department}</span>,
    },
    {
      key: 'shift',
      header: 'Shift',
      render: (s) => <span className="text-xs">{s.shift}</span>,
    },
    {
      key: 'phone',
      header: 'Contact',
      render: (s) => <span className="font-mono-num text-xs">{s.phone}</span>,
    },
    {
      key: 'availability',
      header: 'Availability',
      render: (s) => {
        const av = resolveAvailability(s);
        return (
          <select
            aria-label={`Availability for ${s.fullName}`}
            value={av}
            onChange={(e) => handleQuickAvailability(s, e.target.value as StaffAvailability)}
            className={`rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-semibold ${
              av === 'Available' || av === 'On Shift'
                ? 'text-emerald-700 dark:text-emerald-400'
                : av === 'In Break'
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {AVAILABILITY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (s) => (
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewingStaff(s)}
            aria-label={`View profile for ${s.fullName}`}
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#16B8A6]"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => openEdit(s)}
            aria-label={`Edit ${s.fullName}`}
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#2563EB]"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(s)}
            aria-label={`Delete ${s.fullName}`}
            className="rounded p-1.5 text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Staff Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Total Staff</span>
            <Users className="h-4 w-4 text-[#2563EB]" />
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-[#142D4E] dark:text-white">
            {stats.total}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Available / On Shift</span>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.activeCount}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Nursing Personnel
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-[#142D4E] dark:text-white">
            {stats.nursingCount}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            On Leave
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-amber-600 dark:text-amber-400">
            {stats.onLeaveCount}
          </div>
        </div>
      </div>

      {/* Filters & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search staff by name, role, ID, or department..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F4F7FB] dark:bg-slate-800 py-2 pl-9 pr-3 text-sm focus:border-[#2563EB] focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
            />
          </div>

          <select
            aria-label="Filter by department"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                {d === 'All' ? 'All Departments' : d}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by availability"
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value as 'All' | StaffAvailability)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
          >
            <option value="All">All Availability</option>
            {AVAILABILITY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      <DataTable columns={columns} data={filteredStaff} rowKey={(s) => s.id} />

      {/* Staff Profile View Modal */}
      <Modal
        open={Boolean(viewingStaff)}
        onClose={() => setViewingStaff(null)}
        title={viewingStaff ? `Staff Profile · ${viewingStaff.id}` : 'Staff Profile'}
        maxWidthClass="max-w-lg"
      >
        {viewingStaff && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-[#142D4E] dark:text-white">
                  {viewingStaff.fullName}
                </h3>
                <p className="text-sm font-medium text-[#2563EB]">{viewingStaff.role}</p>
                <p className="text-xs text-[#16B8A6] mt-0.5">{viewingStaff.department}</p>
              </div>
              <span className="font-mono-num text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {resolveAvailability(viewingStaff)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-slate-500">Assigned Shift</div>
                <div className="mt-1 font-semibold text-[#142D4E] dark:text-white">
                  {viewingStaff.shift} Shift
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-slate-500">Join Date</div>
                <div className="mt-1 font-mono-num font-semibold text-[#142D4E] dark:text-white">
                  {viewingStaff.joinDate}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Phone className="h-4 w-4 text-[#2563EB]" />
                <span className="font-mono-num">{viewingStaff.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Mail className="h-4 w-4 text-[#16B8A6]" />
                <span>{viewingStaff.email}</span>
              </div>
            </div>

            {viewingStaff.notes && (
              <div className="rounded-lg bg-[#F4F7FB] dark:bg-slate-800 p-3 text-xs text-slate-600 dark:text-slate-300">
                {viewingStaff.notes}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const s = viewingStaff;
                  setViewingStaff(null);
                  openEdit(s);
                }}
                className="rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Edit Profile
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add / Edit Staff Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingStaff ? `Edit Staff · ${editingStaff.id}` : 'Add Staff Member'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Job Role *
              </label>
              <input
                type="text"
                required
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder="e.g., Charge Nurse / Receptionist"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Department *
              </label>
              <input
                type="text"
                required
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="e.g., Intensive Care Unit"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Phone *
              </label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Shift
              </label>
              <select
                value={form.shift}
                onChange={(e) => setForm({ ...form, shift: e.target.value as StaffMember['shift'] })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
                <option value="Night">Night</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Availability
              </label>
              <select
                value={form.availability}
                onChange={(e) =>
                  setForm({ ...form, availability: e.target.value as StaffAvailability })
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                {AVAILABILITY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Staff Notes / Certifications
              </label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white">
              {editingStaff ? 'Save Changes' : 'Add Staff Member'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteStaffMember(deleteTarget.id);
        }}
        title="Remove Staff Record"
        message={`Remove ${deleteTarget?.fullName} (${deleteTarget?.role}) from the staff directory?`}
        confirmLabel="Remove Staff"
      />
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import {
  Ambulance as AmbulanceIcon,
  CheckCircle2,
  MapPin,
  Navigation,
  Phone,
  Plus,
  Search,
  Wrench,
  XCircle,
} from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import { getTodayIso } from '../services/dataService';
import {
  Ambulance,
  AmbulanceStatus,
  AmbulanceTrip,
  AmbulanceTripPriority,
  AmbulanceTripStatus,
  AmbulanceType,
} from '../types/hospital';
import { DataTable, TableColumn } from '../components/DataTable';
import { Modal } from '../components/Modal';

type ActiveTab = 'trips' | 'fleet';

export const AmbulancePage: React.FC = () => {
  const {
    ambulances,
    ambulanceTrips,
    patients,
    emergencyCases,
    addAmbulance,
    updateAmbulance,
    dispatchAmbulance,
    updateAmbulanceTripStatus,
  } = useHospital();

  const [activeTab, setActiveTab] = useState<ActiveTab>('trips');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | AmbulanceTripStatus>('All');

  // Register Ambulance Modal
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [vNumber, setVNumber] = useState('');
  const [vPlate, setVPlate] = useState('');
  const [vType, setVType] = useState<AmbulanceType>('ALS');
  const [vDriver, setVDriver] = useState('');
  const [vPhone, setVPhone] = useState('');
  const [vLicense, setVLicense] = useState('');
  const [vServiceDate, setVServiceDate] = useState(getTodayIso());
  const [vError, setVError] = useState('');

  // Dispatch Modal
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [dAmbulanceId, setDAmbulanceId] = useState('');
  const [dEmergencyId, setDEmergencyId] = useState('');
  const [dPatientId, setDPatientId] = useState('');
  const [dPatientName, setDPatientName] = useState('');
  const [dPickup, setDPickup] = useState('');
  const [dDestination, setDDestination] = useState('MediCare Pro Emergency Bay');
  const [dPriority, setDPriority] = useState<AmbulanceTripPriority>('Urgent');
  const [dNotes, setDNotes] = useState('');
  const [dError, setDError] = useState('');

  const availableVehicles = useMemo(
    () => ambulances.filter((a) => a.status === 'Available'),
    [ambulances]
  );

  const activeTripsCount = useMemo(
    () => ambulanceTrips.filter((t) => t.status !== 'Completed' && t.status !== 'Cancelled').length,
    [ambulanceTrips]
  );

  const activeEmergencies = useMemo(
    () => emergencyCases.filter((e) => e.treatmentStatus !== 'Discharged'),
    [emergencyCases]
  );

  const filteredTrips = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ambulanceTrips.filter((t) => {
      if (statusFilter !== 'All' && t.status !== statusFilter) return false;
      if (!q) return true;
      return (
        t.id.toLowerCase().includes(q) ||
        t.vehicleNumber.toLowerCase().includes(q) ||
        t.driverName.toLowerCase().includes(q) ||
        t.patientName.toLowerCase().includes(q) ||
        t.pickupLocation.toLowerCase().includes(q)
      );
    });
  }, [ambulanceTrips, statusFilter, searchQuery]);

  const filteredFleet = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ambulances.filter((a) => {
      if (!q) return true;
      return (
        a.id.toLowerCase().includes(q) ||
        a.vehicleNumber.toLowerCase().includes(q) ||
        a.plateNumber.toLowerCase().includes(q) ||
        a.driverName.toLowerCase().includes(q)
      );
    });
  }, [ambulances, searchQuery]);

  const openVehicleModal = () => {
    setVNumber('');
    setVPlate('');
    setVType('ALS');
    setVDriver('');
    setVPhone('');
    setVLicense('');
    setVServiceDate(getTodayIso());
    setVError('');
    setVehicleOpen(true);
  };

  const handleVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vNumber.trim() || !vPlate.trim() || !vDriver.trim() || !vPhone.trim() || !vLicense.trim()) {
      setVError('Vehicle ID, plate number, driver name, phone, and license are required.');
      return;
    }
    addAmbulance({
      vehicleNumber: vNumber.trim().toUpperCase(),
      plateNumber: vPlate.trim().toUpperCase(),
      type: vType,
      driverName: vDriver.trim(),
      driverPhone: vPhone.trim(),
      driverLicense: vLicense.trim().toUpperCase(),
      status: 'Available',
      lastServiceDate: vServiceDate || getTodayIso(),
    });
    setVehicleOpen(false);
  };

  const openDispatchModal = (preselectedAmbId?: string) => {
    const firstAvail =
      (preselectedAmbId ? ambulances.find((a) => a.id === preselectedAmbId) : availableVehicles[0]) ??
      ambulances[0];
    setDAmbulanceId(firstAvail?.id ?? '');
    setDEmergencyId('');
    setDPatientId('');
    setDPatientName('');
    setDPickup('');
    setDDestination('MediCare Pro Emergency Bay');
    setDPriority('Urgent');
    setDNotes('');
    setDError('');
    setDispatchOpen(true);
  };

  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dAmbulanceId) {
      setDError('Please select an available ambulance unit.');
      return;
    }
    if (!dPatientId && !dPatientName.trim()) {
      setDError('Provide a patient record or patient name.');
      return;
    }
    if (!dPickup.trim()) {
      setDError('Pickup location is required.');
      return;
    }
    const res = dispatchAmbulance({
      ambulanceId: dAmbulanceId,
      patientName: dPatientName,
      patientId: dPatientId || undefined,
      emergencyCaseId: dEmergencyId || undefined,
      pickupLocation: dPickup,
      destination: dDestination,
      priority: dPriority,
      notes: dNotes,
    });
    if (!res.ok) {
      setDError(res.error || 'Could not dispatch ambulance.');
      return;
    }
    setDispatchOpen(false);
  };

  const tripColumns: TableColumn<AmbulanceTrip>[] = [
    {
      key: 'id',
      header: 'Trip ID',
      render: (t) => (
        <div>
          <div className="font-mono-num text-xs font-semibold text-[#142D4E] dark:text-slate-100">{t.id}</div>
          <div className="font-mono-num text-[11px] text-slate-500">
            {new Date(t.dispatchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      ),
    },
    {
      key: 'unit',
      header: 'Vehicle & Driver',
      render: (t) => (
        <div>
          <div className="text-xs font-semibold text-[#1E293B] dark:text-white">{t.vehicleNumber}</div>
          <div className="text-xs text-slate-500">{t.driverName}</div>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Patient & Case',
      render: (t) => (
        <div>
          <div className="text-sm font-semibold text-[#1E293B] dark:text-white">{t.patientName}</div>
          <div className="font-mono-num text-[11px] text-slate-500">
            {[t.patientId, t.emergencyCaseId].filter(Boolean).join(' · ') || 'Walk-in dispatch'}
          </div>
        </div>
      ),
    },
    {
      key: 'route',
      header: 'Pickup → Destination',
      render: (t) => (
        <div className="max-w-[240px] text-xs">
          <div className="truncate font-medium text-slate-800 dark:text-slate-100">{t.pickupLocation}</div>
          <div className="truncate text-slate-500">→ {t.destination}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Priority & Status',
      render: (t) => (
        <div className="text-xs">
          <span
            className={`font-semibold ${
              t.priority === 'Critical'
                ? 'text-red-600 dark:text-red-400'
                : t.priority === 'Urgent'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {t.priority}
          </span>
          <span className="mx-1.5 text-slate-300">·</span>
          <span
            className={`font-semibold ${
              t.status === 'Completed'
                ? 'text-emerald-600 dark:text-emerald-400'
                : t.status === 'Cancelled'
                ? 'text-slate-500'
                : 'text-[#2563EB] dark:text-blue-400'
            }`}
          >
            {t.status}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Dispatch Actions',
      align: 'right',
      render: (t) => (
        <div className="flex items-center justify-end gap-1.5">
          {t.status === 'Dispatched' && (
            <button
              type="button"
              onClick={() => updateAmbulanceTripStatus(t.id, 'En Route')}
              className="rounded-md border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 text-xs font-semibold text-[#2563EB] dark:text-blue-300 whitespace-nowrap shrink-0"
            >
              En Route
            </button>
          )}
          {t.status === 'En Route' && (
            <button
              type="button"
              onClick={() => updateAmbulanceTripStatus(t.id, 'On Scene')}
              className="rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 whitespace-nowrap shrink-0"
            >
              On Scene
            </button>
          )}
          {(t.status === 'Dispatched' || t.status === 'En Route' || t.status === 'On Scene') && (
            <>
              <button
                type="button"
                onClick={() => updateAmbulanceTripStatus(t.id, 'Completed')}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 whitespace-nowrap shrink-0"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Complete
              </button>
              <button
                type="button"
                onClick={() => updateAmbulanceTripStatus(t.id, 'Cancelled')}
                className="rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <XCircle className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          {(t.status === 'Completed' || t.status === 'Cancelled') && (
            <span className="font-mono-num text-[11px] text-slate-400">
              {t.completedTime
                ? `Closed ${new Date(t.completedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : t.status}
            </span>
          )}
        </div>
      ),
    },
  ];

  const fleetColumns: TableColumn<Ambulance>[] = [
    {
      key: 'vehicle',
      header: 'Unit & Plate',
      render: (a) => (
        <div>
          <div className="font-mono-num text-sm font-bold text-[#142D4E] dark:text-white">{a.vehicleNumber}</div>
          <div className="font-mono-num text-xs text-slate-500">
            {a.id} · {a.plateNumber}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Unit Type',
      render: (a) => (
        <div>
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">{a.type}</div>
          <div className="font-mono-num text-[11px] text-slate-500">Service {a.lastServiceDate}</div>
        </div>
      ),
    },
    {
      key: 'driver',
      header: 'Assigned Driver',
      render: (a) => (
        <div>
          <div className="text-xs font-semibold text-[#1E293B] dark:text-white">{a.driverName}</div>
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <Phone className="h-3 w-3" />
            <span>{a.driverPhone}</span>
            <span>·</span>
            <span className="font-mono-num">{a.driverLicense}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Current Status',
      render: (a) => (
        <span
          className={`text-xs font-semibold ${
            a.status === 'Available'
              ? 'text-emerald-600 dark:text-emerald-400'
              : a.status === 'Maintenance'
              ? 'text-slate-500'
              : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          {a.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Controls',
      align: 'right',
      render: (a) => (
        <div className="flex items-center justify-end gap-2">
          {a.status === 'Available' ? (
            <button
              type="button"
              onClick={() => openDispatchModal(a.id)}
              className="inline-flex items-center gap-1 rounded-md bg-[#2563EB] px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
            >
              <Navigation className="h-3.5 w-3.5" />
              Dispatch
            </button>
          ) : a.status === 'Maintenance' ? (
            <button
              type="button"
              onClick={() => updateAmbulance({ ...a, status: 'Available' })}
              className="rounded-md border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 whitespace-nowrap shrink-0"
            >
              Return to Service
            </button>
          ) : null}
          {a.status === 'Available' && (
            <button
              type="button"
              onClick={() => updateAmbulance({ ...a, status: 'Maintenance' as AmbulanceStatus })}
              title="Move to Maintenance"
              className="rounded-md border border-slate-200 dark:border-slate-700 p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Wrench className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#142D4E] dark:text-white">
            Ambulance Fleet &amp; Emergency Dispatch
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track emergency vehicles, driver duty assignments, live dispatch stages, and trip logs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={openVehicleModal}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-[#142D4E] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4 text-[#16B8A6]" />
            Register Ambulance
          </button>
          <button
            type="button"
            onClick={() => openDispatchModal()}
            disabled={availableVehicles.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <AmbulanceIcon className="h-4 w-4" />
            Dispatch Ambulance
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Fleet Units</p>
          <p className="mt-1 font-mono-num text-2xl font-bold text-[#142D4E] dark:text-white">{ambulances.length}</p>
          <p className="mt-0.5 text-xs text-slate-500">ALS, BLS &amp; transport</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Ready for Dispatch</p>
          <p className="mt-1 font-mono-num text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {availableVehicles.length}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Standby with active driver</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Dispatches</p>
          <p className="mt-1 font-mono-num text-2xl font-bold text-amber-600 dark:text-amber-400">
            {activeTripsCount}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">En route or on scene</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Completed Trips</p>
          <p className="mt-1 font-mono-num text-2xl font-bold text-[#2563EB] dark:text-blue-400">
            {ambulanceTrips.filter((t) => t.status === 'Completed').length}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{ambulanceTrips.length} total logged</p>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('trips')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'trips'
                ? 'bg-white dark:bg-slate-900 text-[#142D4E] dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Dispatch &amp; Trip History ({ambulanceTrips.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fleet')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'fleet'
                ? 'bg-white dark:bg-slate-900 text-[#142D4E] dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Fleet &amp; Drivers ({ambulances.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vehicle, driver, patient, location..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-9 pr-3 text-xs text-[#1E293B] dark:text-slate-100 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none"
            />
          </div>
          {activeTab === 'trips' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'All' | AmbulanceTripStatus)}
              aria-label="Filter dispatch trips by status"
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-[#1E293B] dark:text-slate-100"
            >
              <option value="All">All Trip Statuses</option>
              <option value="Dispatched">Dispatched</option>
              <option value="En Route">En Route</option>
              <option value="On Scene">On Scene</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          )}
        </div>
      </div>

      {activeTab === 'trips' ? (
        <DataTable
          data={filteredTrips}
          columns={tripColumns}
          rowKey={(t) => t.id}
          emptyTitle="No ambulance dispatches match"
          emptyDescription="Dispatch an available ambulance unit or clear search filters."
        />
      ) : (
        <DataTable
          data={filteredFleet}
          columns={fleetColumns}
          rowKey={(a) => a.id}
          emptyTitle="No ambulances match"
          emptyDescription="Register a new ambulance vehicle and assigned driver."
        />
      )}

      {/* Register Ambulance Modal */}
      <Modal
        open={vehicleOpen}
        onClose={() => setVehicleOpen(false)}
        title="Register Ambulance Vehicle"
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleVehicleSubmit} className="space-y-4">
          {vError && (
            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {vError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Vehicle Call Sign *
              </label>
              <input
                type="text"
                required
                value={vNumber}
                onChange={(e) => setVNumber(e.target.value)}
                placeholder="e.g., MCP-BLS-02"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                License Plate *
              </label>
              <input
                type="text"
                required
                value={vPlate}
                onChange={(e) => setVPlate(e.target.value)}
                placeholder="e.g., HOSP-9405"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Support Type
              </label>
              <select
                value={vType}
                onChange={(e) => setVType(e.target.value as AmbulanceType)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="ALS">ALS (Advanced Life Support)</option>
                <option value="BLS">BLS (Basic Life Support)</option>
                <option value="Patient Transport">Patient Transport</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Last Service Date
              </label>
              <input
                type="date"
                value={vServiceDate}
                onChange={(e) => setVServiceDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Assigned Driver Name *
              </label>
              <input
                type="text"
                required
                value={vDriver}
                onChange={(e) => setVDriver(e.target.value)}
                placeholder="e.g., Omar Farooq"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Driver Phone *
              </label>
              <input
                type="text"
                required
                value={vPhone}
                onChange={(e) => setVPhone(e.target.value)}
                placeholder="+1 (555) 610-2009"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Driver License Number *
              </label>
              <input
                type="text"
                required
                value={vLicense}
                onChange={(e) => setVLicense(e.target.value)}
                placeholder="e.g., CDL-B-910244"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-num"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setVehicleOpen(false)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Register Unit
            </button>
          </div>
        </form>
      </Modal>

      {/* Dispatch Ambulance Modal */}
      <Modal
        open={dispatchOpen}
        onClose={() => setDispatchOpen(false)}
        title="Dispatch Emergency Ambulance"
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleDispatchSubmit} className="space-y-4">
          {dError && (
            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {dError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Available Unit *
              </label>
              <select
                value={dAmbulanceId}
                onChange={(e) => setDAmbulanceId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                {availableVehicles.length === 0 ? (
                  <option value="">No units currently available</option>
                ) : (
                  availableVehicles.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.vehicleNumber} ({a.type} · {a.driverName})
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={dPriority}
                onChange={(e) => setDPriority(e.target.value as AmbulanceTripPriority)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="Critical">Critical (Lights &amp; Sirens)</option>
                <option value="Urgent">Urgent</option>
                <option value="Routine">Routine Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Link Emergency Case (Optional)
              </label>
              <select
                value={dEmergencyId}
                onChange={(e) => {
                  setDEmergencyId(e.target.value);
                  const em = emergencyCases.find((x) => x.id === e.target.value);
                  if (em) {
                    setDPatientId(em.patientId);
                    setDPatientName(em.patientName);
                  }
                }}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {activeEmergencies.map((em) => (
                  <option key={em.id} value={em.id}>
                    {em.id} · {em.patientName} ({em.priority})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Registered Patient (Optional)
              </label>
              <select
                value={dPatientId}
                onChange={(e) => {
                  setDPatientId(e.target.value);
                  const pat = patients.find((p) => p.id === e.target.value);
                  if (pat) setDPatientName(pat.fullName);
                }}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="">Unregistered / Walk-in Patient</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.id})
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Patient Name *
              </label>
              <input
                type="text"
                required
                value={dPatientName}
                onChange={(e) => setDPatientName(e.target.value)}
                placeholder="Patient name or unidentified responder tag"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Pickup Location *
              </label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={dPickup}
                  onChange={(e) => setDPickup(e.target.value)}
                  placeholder="Street address or landmark"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 pl-8 pr-3 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Destination
              </label>
              <input
                type="text"
                value={dDestination}
                onChange={(e) => setDDestination(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Dispatch Notes
            </label>
            <input
              type="text"
              value={dNotes}
              onChange={(e) => setDNotes(e.target.value)}
              placeholder="Stair access, oxygen requirement, paramedic instructions..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDispatchOpen(false)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={availableVehicles.length === 0}
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Confirm Dispatch
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

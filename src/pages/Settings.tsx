import React, { useState } from 'react';
import { Moon, RotateCcw, Save, ShieldCheck, Sun } from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import { ASSET_IMAGES, ROLE_ALLOWED_PAGES } from '../services/dataService';
import { ConfirmationDialog } from '../components/Modal';

export const Settings: React.FC = () => {
  const { settings, updateSettings, theme, toggleTheme, session, resetDemoData } = useHospital();

  const [form, setForm] = useState(settings);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(form);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Facility Banner Card */}
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="relative h-44 w-full">
          <img
            src={ASSET_IMAGES.campusBanner}
            alt="MediCare Pro Medical Campus"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#142D4E]/90 via-[#142D4E]/40 to-transparent" />
          <div className="absolute bottom-4 left-5 right-5 flex flex-col sm:flex-row sm:items-end justify-between gap-2 text-white">
            <div>
              <p className="text-xs text-[#16B8A6] font-medium">Facility Profile</p>
              <h2 className="font-display text-lg font-bold">{settings.hospitalName}</h2>
              <p className="text-xs text-slate-200">{settings.address}</p>
            </div>
            <div className="font-mono-num text-xs text-slate-200">{settings.registrationCode}</div>
          </div>
        </div>
      </div>

      {/* Hospital Configuration Form */}
      <form
        onSubmit={handleSave}
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5"
      >
        <div>
          <h3 className="font-display text-base font-bold text-[#142D4E] dark:text-white">
            Hospital Configuration
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Details appear on printable invoices, laboratory reports, and executive analytics
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Hospital Name
            </label>
            <input
              type="text"
              required
              value={form.hospitalName}
              onChange={(e) => setForm({ ...form, hospitalName: e.target.value })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Registration Code
            </label>
            <input
              type="text"
              required
              value={form.registrationCode}
              onChange={(e) => setForm({ ...form, registrationCode: e.target.value })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-num focus:border-[#2563EB] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Campus Address
            </label>
            <input
              type="text"
              required
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Contact Phone
            </label>
            <input
              type="text"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Administration Email
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Currency Symbol
            </label>
            <input
              type="text"
              maxLength={3}
              required
              value={form.currencySymbol}
              onChange={(e) => setForm({ ...form, currencySymbol: e.target.value })}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Default Appointment Slot (Minutes)
            </label>
            <input
              type="number"
              min={10}
              max={120}
              value={form.defaultAppointmentDurationMins}
              onChange={(e) =>
                setForm({ ...form, defaultAppointmentDurationMins: Number(e.target.value) || 30 })
              }
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>

      {/* Appearance, Role Access & Local Demo Storage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#16B8A6]" />
            <h3 className="font-display text-sm font-bold text-[#142D4E] dark:text-white">
              Active Session & Role Access
            </h3>
          </div>
          {session && (
            <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
              <p>
                Signed in as <span className="font-semibold text-[#142D4E] dark:text-white">{session.name}</span> ({session.role})
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Accessible modules: {ROLE_ALLOWED_PAGES[session.role].join(', ')}
              </p>
            </div>
          )}

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#142D4E] dark:text-white">Interface Theme</p>
              <p className="text-xs text-slate-500">Current: {theme === 'light' ? 'Light' : 'Dark'} mode</p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {theme === 'light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              <span>Toggle Theme</span>
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <h3 className="font-display text-sm font-bold text-[#142D4E] dark:text-white">
            LocalStorage Prototype Controls
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            All hospital collections are persisted in browser LocalStorage via a clean repository service (<code className="font-mono-num">storage.js / storage.ts</code>) structured for future Supabase integration.
          </p>
          <button
            type="button"
            onClick={() => setConfirmResetOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-3.5 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Demonstration Data</span>
          </button>
        </div>
      </div>

      <ConfirmationDialog
        open={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={resetDemoData}
        title="Reset Demonstration Data"
        message="This will restore all patients, doctors, appointments, beds, invoices, pharmacy stock, lab tests, and staff records back to the initial demonstration baseline."
        confirmLabel="Reset All Data"
      />
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { ArrowRight, Bell, CheckCheck } from 'lucide-react';
import { useHospital } from '../context/HospitalContext';

export const NotificationsPage: React.FC = () => {
  const {
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    setActivePage,
    allowedPages,
  } = useHospital();

  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [onlyUnread, setOnlyUnread] = useState(false);

  const categories = [
    'All',
    'Emergency',
    'Blood Bank',
    'Discharge',
    'Appointment',
    'Billing',
    'Pharmacy',
    'Laboratory',
    'Beds',
    'Patients',
  ];

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      const catOk = categoryFilter === 'All' || n.category === categoryFilter;
      const readOk = !onlyUnread || !n.read;
      return catOk && readOk;
    });
  }, [notifications, categoryFilter, onlyUnread]);

  return (
    <div className="space-y-5">
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-[#142D4E] text-white'
                  : 'bg-[#F4F7FB] dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyUnread}
              onChange={(e) => setOnlyUnread(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#2563EB]"
            />
            <span>Unread only ({unreadNotificationCount})</span>
          </label>

          <button
            type="button"
            onClick={markAllNotificationsRead}
            disabled={unreadNotificationCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-[#142D4E] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <CheckCheck className="h-3.5 w-3.5 text-[#16B8A6]" />
            <span>Mark All Read</span>
          </button>
        </div>
      </div>

      {/* Notification List */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Bell className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="mt-3 text-sm font-semibold text-[#142D4E] dark:text-white">
              All caught up
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              No notifications match your selected filter.
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                item.read ? 'opacity-75' : 'bg-blue-50/30 dark:bg-blue-950/15'
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`font-semibold ${
                      item.severity === 'critical'
                        ? 'text-rose-600 dark:text-rose-400'
                        : item.severity === 'warning'
                          ? 'text-amber-600 dark:text-amber-400'
                          : item.severity === 'success'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-[#2563EB]'
                    }`}
                  >
                    {item.category}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <span className="font-mono-num text-slate-400">{item.timestamp}</span>
                  {!item.read && (
                    <>
                      <span className="text-slate-300 dark:text-slate-700">·</span>
                      <span className="font-semibold text-[#16B8A6]">Unread</span>
                    </>
                  )}
                </div>
                <p className="mt-1 text-sm font-semibold text-[#142D4E] dark:text-white">
                  {item.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{item.message}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!item.read && (
                  <button
                    type="button"
                    onClick={() => markNotificationRead(item.id)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Mark Read
                  </button>
                )}
                {allowedPages.includes(item.targetPage) && (
                  <button
                    type="button"
                    onClick={() => {
                      markNotificationRead(item.id);
                      setActivePage(item.targetPage);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    <span>Open</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

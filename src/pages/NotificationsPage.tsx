import React, { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function NotificationsPage() {
  const {
    user,
    notifications,
    unreadCount,
    markNotifRead,
    markAllNotifsRead,
    navigate,
  } = useApp();
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-[#F8FAFC]">
          Notifications
        </h1>
        <p className="mt-2 text-sm text-[#A1A1AA]">
          Sign in to view published event alerts and registration confirmations.
        </p>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="mt-6 min-h-[42px] rounded-lg bg-[#8B5CF6] px-5 py-2 text-sm font-semibold text-white"
        >
          Sign In
        </button>
      </div>
    );
  }

  const visible = notifications.filter((n) =>
    filter === 'UNREAD' ? !n.isRead : true
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#F8FAFC]">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            Real event updates and registration confirmations are labeled separately from simulated reminder examples.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-white/10 bg-[#15132A] p-1">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                filter === 'ALL'
                  ? 'bg-[#8B5CF6] text-white'
                  : 'text-[#A1A1AA] hover:text-[#F8FAFC]'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('UNREAD')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                filter === 'UNREAD'
                  ? 'bg-[#8B5CF6] text-white'
                  : 'text-[#A1A1AA] hover:text-[#F8FAFC]'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void markAllNotifsRead()}
              className="min-h-[38px] inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#15132A] px-3 py-1.5 text-xs font-semibold text-[#F8FAFC] hover:border-[#38DDF8]/60"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-10 rounded-xl border border-white/10 bg-[#15132A] p-10 text-center">
          <Bell className="mx-auto h-8 w-8 text-[#A78BFA]" />
          <h2 className="mt-3 font-display text-xl font-semibold text-[#F8FAFC]">
            {filter === 'UNREAD' ? 'All caught up' : 'No notifications yet'}
          </h2>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            New event publications and registration confirmations will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {visible.map((notif) => (
            <article
              key={notif.id}
              className={`rounded-xl border p-5 transition-colors ${
                notif.isRead
                  ? 'border-white/10 bg-[#15132A]/70'
                  : 'border-[#8B5CF6]/50 bg-[#15132A]'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`font-mono font-semibold ${
                        notif.isSimulated ? 'text-amber-300' : 'text-[#38DDF8]'
                      }`}
                    >
                      {notif.isSimulated
                        ? 'Simulated Reminder Example'
                        : 'Live System Notification'}
                    </span>
                    <span aria-hidden="true" className="text-[#A1A1AA]">
                      ·
                    </span>
                    <span className="font-mono tabular-nums text-[#A1A1AA]">
                      {new Date(notif.createdAt).toLocaleString()}
                    </span>
                    {!notif.isRead && (
                      <>
                        <span aria-hidden="true" className="text-[#A1A1AA]">
                          ·
                        </span>
                        <span className="font-semibold text-[#A78BFA]">Unread</span>
                      </>
                    )}
                  </div>

                  <h2 className="mt-1.5 font-display text-base font-semibold text-[#F8FAFC]">
                    {notif.title}
                  </h2>
                  <p className="mt-1 text-sm text-[#A1A1AA]">{notif.message}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {notif.eventId && (
                    <button
                      type="button"
                      onClick={() => navigate(`/events/${notif.eventId}`)}
                      className="min-h-[36px] rounded-lg border border-white/15 bg-[#090816] px-3 py-1.5 text-xs font-semibold text-[#F8FAFC] hover:border-[#A78BFA]/60"
                    >
                      View Event
                    </button>
                  )}
                  {!notif.isRead && (
                    <button
                      type="button"
                      onClick={() => void markNotifRead(notif.id)}
                      className="min-h-[36px] rounded-lg border border-white/15 bg-[#090816] px-3 py-1.5 text-xs font-semibold text-[#A1A1AA] hover:text-[#F8FAFC]"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

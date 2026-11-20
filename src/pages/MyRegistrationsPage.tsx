import React, { useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function MyRegistrationsPage() {
  const { user, events, navigate, cancelRegistration } = useApp();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!user || user.role !== 'STUDENT') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-[#F8FAFC]">
          My Registrations
        </h1>
        <p className="mt-2 text-sm text-[#A1A1AA]">
          Sign in as a Student to view and manage your confirmed event registrations.
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

  const registeredEvents = events.filter((e) => e.isRegisteredByMe);

  const handleCancel = async (id: string) => {
    setBusyId(id);
    try {
      await cancelRegistration(id);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#F8FAFC]">
            My Registrations
          </h1>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            Confirmed seats for <span className="font-mono text-[#F8FAFC]">{user.handle}</span>.
          </p>
        </div>
        <span className="font-mono text-xs tabular-nums text-emerald-400">
          {registeredEvents.length} confirmed
        </span>
      </div>

      {registeredEvents.length === 0 ? (
        <div className="mt-10 rounded-xl border border-white/10 bg-[#15132A] p-10 text-center">
          <CalendarCheck className="mx-auto h-8 w-8 text-[#A78BFA]" />
          <h2 className="mt-3 font-display text-xl font-semibold text-[#F8FAFC]">
            No active registrations yet
          </h2>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            Explore campus workshops, hackathons, and cultural events to reserve your seat.
          </p>
          <button
            type="button"
            onClick={() => navigate('/discover')}
            className="mt-5 min-h-[42px] rounded-lg bg-[#8B5CF6] px-5 py-2 text-xs font-semibold text-white hover:bg-[#7C3AED]"
          >
            Discover Events
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {registeredEvents.map((ev) => (
            <div
              key={ev.id}
              className="flex flex-col justify-between gap-4 rounded-xl border border-white/10 bg-[#15132A] p-5 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="text-xs text-[#38DDF8]">
                  {ev.category} · {ev.computedStatus}
                </div>
                <h2 className="mt-1 font-display text-lg font-semibold text-[#F8FAFC]">
                  <a
                    href={`/events/${ev.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/events/${ev.id}`);
                    }}
                    className="hover:text-[#A78BFA]"
                  >
                    {ev.title}
                  </a>
                </h2>
                <p className="mt-1 font-mono text-xs tabular-nums text-[#A1A1AA]">
                  {ev.date} · {ev.startTime}–{ev.endTime} · {ev.venue}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate(`/events/${ev.id}`)}
                  className="min-h-[40px] rounded-lg border border-white/15 bg-[#090816] px-4 py-2 text-xs font-semibold text-[#F8FAFC]"
                >
                  View Details
                </button>
                {ev.computedStatus !== 'COMPLETED' &&
                  ev.computedStatus !== 'CANCELLED' && (
                    <button
                      type="button"
                      disabled={busyId === ev.id}
                      onClick={() => void handleCancel(ev.id)}
                      className="min-h-[40px] rounded-lg border border-rose-500/35 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      {busyId === ev.id ? 'Cancelling...' : 'Cancel Seat'}
                    </button>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

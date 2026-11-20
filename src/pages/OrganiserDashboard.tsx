import React, { useState } from 'react';
import { Plus, Users, Pencil, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { hasEventEnded } from '../shared/eventLogic';

export function OrganiserDashboard() {
  const { user, organiserEvents, eventsLoading, navigate, refreshEvents, pushToast } =
    useApp();
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT' | 'COMPLETED'>('ALL');
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null);

  if (!user || user.role !== 'ORGANISER') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-[#F8FAFC]">
          Organiser Console Restricted
        </h1>
        <p className="mt-2 text-sm text-[#A1A1AA]">
          Only Organiser accounts (such as ORG001 or ORG002) can create and manage campus events.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate(user?.role === 'STUDENT' ? '/student' : '/login')}
            className="min-h-[42px] rounded-lg bg-[#8B5CF6] px-5 py-2 text-sm font-semibold text-white"
          >
            {user?.role === 'STUDENT' ? 'Return to Student Dashboard' : 'Sign In as Organiser'}
          </button>
        </div>
      </div>
    );
  }

  const now = new Date();
  const totalEvents = organiserEvents.length;
  const publishedEvents = organiserEvents.filter((e) => e.status === 'PUBLISHED').length;
  const totalRegistrations = organiserEvents.reduce(
    (sum, e) => sum + e.registeredCount,
    0
  );
  const totalInterested = organiserEvents.reduce(
    (sum, e) => sum + e.interestedCount,
    0
  );
  const upcomingEvents = organiserEvents.filter(
    (e) => e.status === 'PUBLISHED' && !hasEventEnded(e, now)
  ).length;
  const completedEvents = organiserEvents.filter(
    (e) => e.status === 'PUBLISHED' && hasEventEnded(e, now)
  ).length;

  const visibleEvents = organiserEvents.filter((ev) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'PUBLISHED') return ev.status === 'PUBLISHED';
    if (statusFilter === 'DRAFT') return ev.status === 'DRAFT';
    if (statusFilter === 'COMPLETED') return ev.computedStatus === 'COMPLETED';
    return true;
  });

  const handleDelete = async (eventId: string, title: string) => {
    setBusyDeleteId(eventId);
    try {
      await api.deleteEvent(eventId);
      await refreshEvents();
      pushToast('info', `Deleted "${title}".`);
    } catch (err) {
      pushToast(
        'error',
        err instanceof Error ? err.message : 'Unable to delete event.'
      );
    } finally {
      setBusyDeleteId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <p className="font-mono text-xs text-[#38DDF8]">
            {user.handle} · {user.department}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-[#F8FAFC]">
            Organiser Dashboard
          </h1>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            Manage your events, track live student registrations, and publish updates.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/organiser/events/new')}
          className="min-h-[44px] inline-flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#7C3AED] transition-colors whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          <span>Create Event</span>
        </button>
      </div>

      {/* 6 KPI Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-white/10 bg-[#15132A] p-4">
          <span className="text-xs text-[#A1A1AA]">Total Events</span>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums text-[#F8FAFC]">
            {totalEvents}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#15132A] p-4">
          <span className="text-xs text-[#A1A1AA]">Published</span>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums text-[#38DDF8]">
            {publishedEvents}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#15132A] p-4">
          <span className="text-xs text-[#A1A1AA]">Total Registrations</span>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums text-emerald-400">
            {totalRegistrations}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#15132A] p-4">
          <span className="text-xs text-[#A1A1AA]">Interested Students</span>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums text-[#A78BFA]">
            {totalInterested}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#15132A] p-4">
          <span className="text-xs text-[#A1A1AA]">Upcoming</span>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums text-[#F8FAFC]">
            {upcomingEvents}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#15132A] p-4">
          <span className="text-xs text-[#A1A1AA]">Completed</span>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums text-[#A1A1AA]">
            {completedEvents}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-xl font-bold text-[#F8FAFC]">
          Your Managed Events
        </h2>
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-white/10 bg-[#15132A] p-1">
          {(['ALL', 'PUBLISHED', 'DRAFT', 'COMPLETED'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === tab
                  ? 'bg-[#8B5CF6] text-white'
                  : 'text-[#A1A1AA] hover:text-[#F8FAFC]'
              }`}
            >
              {tab === 'ALL'
                ? 'All'
                : tab === 'PUBLISHED'
                  ? 'Published'
                  : tab === 'DRAFT'
                    ? 'Drafts'
                    : 'Completed'}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      {eventsLoading ? (
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-white/10 bg-[#15132A]"
            />
          ))}
        </div>
      ) : visibleEvents.length === 0 ? (
        <div className="mt-6 rounded-xl border border-white/10 bg-[#15132A] p-10 text-center">
          <h3 className="font-display text-lg font-semibold text-[#F8FAFC]">
            No events in this view
          </h3>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            Create a new campus event to start collecting student registrations.
          </p>
          <button
            type="button"
            onClick={() => navigate('/organiser/events/new')}
            className="mt-5 min-h-[42px] rounded-lg bg-[#8B5CF6] px-5 py-2 text-xs font-semibold text-white"
          >
            Create Event
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {visibleEvents.map((ev) => (
            <div
              key={ev.id}
              data-testid={`organiser-event-${ev.id}`}
              className="flex flex-col justify-between gap-4 rounded-xl border border-white/10 bg-[#15132A] p-5 lg:flex-row lg:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[#38DDF8]">{ev.category}</span>
                  <span aria-hidden="true" className="text-[#A1A1AA]">
                    ·
                  </span>
                  <span
                    className={`font-mono font-semibold ${
                      ev.computedStatus === 'DRAFT'
                        ? 'text-amber-300'
                        : ev.computedStatus === 'FULL'
                          ? 'text-amber-400'
                          : ev.computedStatus === 'COMPLETED'
                            ? 'text-[#A1A1AA]'
                            : ev.computedStatus === 'CANCELLED'
                              ? 'text-rose-400'
                              : 'text-emerald-400'
                    }`}
                  >
                    {ev.computedStatus}
                  </span>
                  <span aria-hidden="true" className="text-[#A1A1AA]">
                    ·
                  </span>
                  <span className="font-mono tabular-nums text-[#A1A1AA]">
                    {ev.date} {ev.startTime}–{ev.endTime}
                  </span>
                </div>

                <h3 className="mt-1 font-display text-lg font-semibold text-[#F8FAFC]">
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
                </h3>

                <p className="mt-1 text-xs text-[#A1A1AA]">
                  {ev.venue} ·{' '}
                  <span className="font-mono tabular-nums text-[#F8FAFC]">
                    {ev.registeredCount} / {ev.maxCapacity} registered
                  </span>{' '}
                  ·{' '}
                  <span className="font-mono tabular-nums">
                    {ev.interestedCount} interested
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/organiser/events/${ev.id}/registrations`)
                  }
                  className="min-h-[40px] inline-flex items-center gap-1.5 rounded-lg bg-[#8B5CF6] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#7C3AED]"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Registrations ({ev.registeredCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/organiser/events/${ev.id}/edit`)}
                  className="min-h-[40px] inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#090816] px-3.5 py-2 text-xs font-semibold text-[#F8FAFC] hover:border-[#A78BFA]/60"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  disabled={busyDeleteId === ev.id}
                  aria-label={`Delete ${ev.title}`}
                  onClick={() => void handleDelete(ev.id, ev.title)}
                  className="min-h-[40px] inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{busyDeleteId === ev.id ? '...' : 'Delete'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

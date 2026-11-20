import React, { useEffect, useState } from 'react';
import { ArrowLeft, Download, Search, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import type { CampusEvent, EventRegistrationRecord } from '../shared/types';

export function RegistrationManagementPage({ eventId }: { eventId: string }) {
  const { user, navigate, pushToast } = useApp();
  const [event, setEvent] = useState<CampusEvent | null>(null);
  const [registrations, setRegistrations] = useState<EventRegistrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'ORGANISER') {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    api
      .getEventRegistrations(eventId)
      .then((res) => {
        if (active) {
          setEvent(res.event);
          setRegistrations(res.registrations);
        }
      })
      .catch((err) => {
        if (active)
          setError(
            err instanceof Error ? err.message : 'Unable to load registrations.'
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [eventId, user]);

  if (!user || user.role !== 'ORGANISER') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-[#F8FAFC]">
          Organiser Access Required
        </h1>
        <p className="mt-2 text-sm text-[#A1A1AA]">
          Only the event organiser can view and export student registrations.
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

  const handleExportCsv = async () => {
    if (!event) return;
    setExporting(true);
    try {
      const csv = await api.downloadRegistrationsCsv(event.id);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `registrations-${event.id}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      pushToast('success', 'Exported dummy student registration CSV.');
    } catch (err) {
      pushToast(
        'error',
        err instanceof Error ? err.message : 'Unable to export CSV.'
      );
    } finally {
      setExporting(false);
    }
  };

  const filteredRegs = registrations.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      r.studentId.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="h-72 animate-pulse rounded-xl border border-white/10 bg-[#15132A]" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-[#F8FAFC]">
          Registration Data Unavailable
        </h1>
        <p className="mt-2 text-sm text-[#A1A1AA]">
          {error || 'Event not found or access denied.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/organiser')}
          className="mt-6 min-h-[42px] rounded-lg bg-[#8B5CF6] px-5 py-2 text-sm font-semibold text-white"
        >
          Back to Organiser Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => navigate('/organiser')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A1A1AA] hover:text-[#F8FAFC]"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Organiser Dashboard</span>
      </button>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <p className="text-xs text-[#38DDF8]">
            {event.category} · {event.date} · {event.venue}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-[#F8FAFC]">
            {event.title} — Registrations
          </h1>
          <p className="mt-1 text-xs text-[#A1A1AA]">
            Privacy-safe roster displaying fictional student identifiers only (no real PII).
          </p>
        </div>

        <button
          type="button"
          disabled={exporting || registrations.length === 0}
          onClick={() => void handleExportCsv()}
          className="min-h-[42px] inline-flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7C3AED] disabled:opacity-50 whitespace-nowrap"
        >
          <Download className="h-4 w-4" />
          <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
        </button>
      </div>

      {/* Real DB Counts */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="rounded-xl border border-white/10 bg-[#15132A] p-4">
          <span className="text-xs text-[#A1A1AA]">Total Registered</span>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums text-emerald-400">
            {event.registeredCount}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#15132A] p-4">
          <span className="text-xs text-[#A1A1AA]">Available Seats</span>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums text-[#38DDF8]">
            {event.remainingSeats} / {event.maxCapacity}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#15132A] p-4">
          <span className="text-xs text-[#A1A1AA]">Interested Students</span>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums text-[#A78BFA]">
            {event.interestedCount}
          </div>
        </div>
      </div>

      {/* Roster Search & Table */}
      <div className="mt-6 rounded-xl border border-white/10 bg-[#15132A] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <h2 className="font-display text-lg font-semibold text-[#F8FAFC] flex items-center gap-2">
            <Users className="h-4 w-4 text-[#A78BFA]" />
            <span>Confirmed Attendees ({filteredRegs.length})</span>
          </h2>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A1A1AA]" />
            <input
              type="search"
              aria-label="Filter registered student IDs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter STU ID or track..."
              className="w-full rounded-lg border border-white/15 bg-[#090816] py-2 pl-9 pr-3 text-xs text-[#F8FAFC] focus:border-[#8B5CF6] focus:outline-none"
            />
          </div>
        </div>

        {filteredRegs.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#A1A1AA]">
            {registrations.length === 0
              ? 'No students have registered for this event yet.'
              : 'No registered student IDs match your filter.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[#A1A1AA]">
                  <th className="whitespace-nowrap py-2.5 pr-4 font-semibold">Student Identifier</th>
                  <th className="whitespace-nowrap py-2.5 pr-4 font-semibold">Academic Track</th>
                  <th className="whitespace-nowrap py-2.5 pr-4 font-semibold">Status</th>
                  <th className="whitespace-nowrap py-2.5 text-right font-semibold">Registered At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRegs.map((reg) => (
                  <tr key={reg.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 font-mono font-semibold text-[#F8FAFC]">
                      {reg.studentId}
                    </td>
                    <td className="py-3 pr-4 text-[#A1A1AA]">{reg.department}</td>
                    <td className="py-3 pr-4 font-mono text-emerald-400">
                      {reg.status}
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums text-[#A1A1AA]">
                      {new Date(reg.registeredAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

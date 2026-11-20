import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Heart,
  MapPin,
  Sparkles,
  Users,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import type { CampusEvent } from '../shared/types';

export function EventDetailsPage({ eventId }: { eventId: string }) {
  const {
    user,
    navigate,
    registerForEvent,
    cancelRegistration,
    toggleInterest,
  } = useApp();

  const [event, setEvent] = useState<CampusEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const [aiSummary, setAiSummary] = useState<{
    oneLineHighlight: string;
    highlights: string[];
  } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .getEvent(eventId)
      .then((res) => {
        if (active) setEvent(res.event);
      })
      .catch((err) => {
        if (active)
          setError(err instanceof Error ? err.message : 'Unable to load event.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [eventId]);

  const handleRegister = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!event) return;
    setActionBusy(true);
    try {
      const updated = await registerForEvent(event.id);
      if (updated) setEvent(updated);
    } finally {
      setActionBusy(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!event) return;
    setActionBusy(true);
    try {
      const updated = await cancelRegistration(event.id);
      if (updated) setEvent(updated);
    } finally {
      setActionBusy(false);
    }
  };

  const handleInterest = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!event) return;
    setActionBusy(true);
    try {
      const updated = await toggleInterest(event.id, !event.isInterestedByMe);
      if (updated) setEvent(updated);
    } finally {
      setActionBusy(false);
    }
  };

  const handleSummarize = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!event) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const res = await api.aiSummarizeEvent(event.id);
      setAiSummary(res);
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : 'Unable to summarize event right now.'
      );
    } finally {
      setAiBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-72 animate-pulse rounded-xl border border-white/10 bg-[#15132A]" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-[#F8FAFC]">
          Event Unavailable
        </h1>
        <p className="mt-2 text-sm text-[#A1A1AA]">
          {error || 'This event could not be found.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/discover')}
          className="mt-6 min-h-[42px] rounded-lg bg-[#8B5CF6] px-5 py-2 text-sm font-semibold text-white"
        >
          Back to Discovery
        </button>
      </div>
    );
  }

  const isCompleted = event.computedStatus === 'COMPLETED';
  const isFull = event.computedStatus === 'FULL';
  const isCancelled = event.computedStatus === 'CANCELLED';
  const isDraft = event.computedStatus === 'DRAFT';
  const fillPct = Math.min(
    100,
    Math.round((event.registeredCount / Math.max(1, event.maxCapacity)) * 100)
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => navigate('/discover')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A1A1AA] hover:text-[#F8FAFC]"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Events</span>
      </button>

      {/* Hero Banner */}
      <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-[#15132A]">
        <div className="relative aspect-video max-h-[380px] w-full bg-[#090816]">
          <img
            src={event.bannerUrl}
            alt={event.title}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#15132A] via-[#090816]/40 to-transparent" />
          <div className="absolute bottom-5 left-6 right-6">
            <div className="text-xs font-medium text-[#38DDF8]">
              {event.category} · {event.isFree ? 'Free Entry' : `$${event.feeAmount} Entry`} · Status: {event.computedStatus}
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold text-[#F8FAFC] sm:text-4xl">
              {event.title}
            </h1>
          </div>
        </div>

        <div className="grid gap-8 p-6 lg:grid-cols-12">
          {/* Left Content */}
          <div className="space-y-6 lg:col-span-8">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#F8FAFC]">
                About This Event
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#F8FAFC]/90">
                {event.fullDescription}
              </p>
            </div>

            {event.additionalInstructions && (
              <div className="rounded-xl border border-white/10 bg-[#090816] p-4">
                <h3 className="font-display text-sm font-semibold text-[#F8FAFC]">
                  Attendee Instructions
                </h3>
                <p className="mt-1 text-sm text-[#A1A1AA]">
                  {event.additionalInstructions}
                </p>
              </div>
            )}

            {/* AI Event Summary */}
            <div className="rounded-xl border border-[#8B5CF6]/35 bg-[#090816] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#38DDF8]" />
                  <h3 className="font-display text-sm font-semibold text-[#F8FAFC]">
                    Gemini Event Summary
                  </h3>
                </div>
                <button
                  type="button"
                  disabled={aiBusy}
                  onClick={() => void handleSummarize()}
                  className="min-h-[38px] rounded-lg border border-[#38DDF8]/40 bg-[#15132A] px-3.5 py-1.5 text-xs font-semibold text-[#38DDF8] hover:bg-[#38DDF8]/10 disabled:opacity-50"
                >
                  {aiBusy
                    ? 'Summarizing...'
                    : aiSummary
                      ? 'Regenerate Highlights'
                      : 'Summarize Event'}
                </button>
              </div>

              {aiError && (
                <p className="mt-3 text-xs text-amber-300">{aiError}</p>
              )}

              {aiSummary ? (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium text-[#F8FAFC]">
                    {aiSummary.oneLineHighlight}
                  </p>
                  <ul className="list-disc space-y-1 pl-5 text-xs text-[#A1A1AA]">
                    {aiSummary.highlights.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-2 text-xs text-[#A1A1AA]">
                  Generate quick 3-bullet highlights of this event description using Gemini AI.
                </p>
              )}
            </div>
          </div>

          {/* Right Sidebar Details + Actions */}
          <aside className="space-y-5 lg:col-span-4">
            <div className="rounded-xl border border-white/10 bg-[#090816] p-5 space-y-4">
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <Calendar className="h-4 w-4 shrink-0 text-[#A78BFA]" />
                  <div>
                    <span className="block text-[#A1A1AA]">Date & Time</span>
                    <span className="font-mono tabular-nums text-[#F8FAFC]">
                      {event.date} · {event.startTime}–{event.endTime}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 shrink-0 text-[#A78BFA]" />
                  <div>
                    <span className="block text-[#A1A1AA]">Venue</span>
                    <span className="text-[#F8FAFC]">{event.venue}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Clock className="h-4 w-4 shrink-0 text-[#A78BFA]" />
                  <div>
                    <span className="block text-[#A1A1AA]">Registration Deadline</span>
                    <span className="font-mono tabular-nums text-[#F8FAFC]">
                      {event.registrationDeadline || event.date}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Users className="h-4 w-4 shrink-0 text-[#A78BFA]" />
                  <div>
                    <span className="block text-[#A1A1AA]">Organiser</span>
                    <span className="text-[#F8FAFC]">{event.organiserLabel}</span>
                  </div>
                </div>
              </div>

              {/* Capacity Bar */}
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#A1A1AA]">Seat Capacity</span>
                  <span className="font-mono tabular-nums text-[#F8FAFC]">
                    {event.registeredCount} / {event.maxCapacity} registered
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full transition-all ${
                      isFull ? 'bg-amber-400' : 'bg-[#8B5CF6]'
                    }`}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
                <p className="mt-1.5 font-mono text-xs tabular-nums text-[#38DDF8]">
                  {isFull
                    ? 'FULL — 0 seats remaining'
                    : `${event.remainingSeats} ${event.remainingSeats === 1 ? 'seat' : 'seats'} remaining · ${event.interestedCount} interested`}
                </p>
              </div>

              {/* Action Buttons */}
              {(!user || user.role === 'STUDENT') && (
                <div className="space-y-2.5 border-t border-white/10 pt-4">
                  {event.isRegisteredByMe ? (
                    <>
                      <div className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/15 py-2.5 text-xs font-semibold text-emerald-300">
                        <Check className="h-4 w-4" />
                        <span>Seat Confirmed ({user?.handle})</span>
                      </div>
                      {!isCompleted && !isCancelled && (
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => void handleCancelRegistration()}
                          className="min-h-[42px] w-full rounded-lg border border-rose-500/35 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
                        >
                          {actionBusy ? 'Cancelling...' : 'Cancel Registration'}
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={
                        actionBusy || isFull || isCompleted || isCancelled || isDraft
                      }
                      onClick={() => void handleRegister()}
                      className="min-h-[44px] w-full rounded-lg bg-[#8B5CF6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#7C3AED] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-[#A1A1AA]"
                    >
                      {actionBusy
                        ? 'Reserving Seat...'
                        : isFull
                          ? 'Event is FULL'
                          : isCompleted
                            ? 'Event Completed'
                            : isCancelled
                              ? 'Event Cancelled'
                              : user
                                ? 'Register for Event'
                                : 'Sign In to Register'}
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => void handleInterest()}
                    aria-pressed={Boolean(event.isInterestedByMe)}
                    className={`min-h-[42px] w-full inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition-colors ${
                      event.isInterestedByMe
                        ? 'border-[#38DDF8]/60 bg-[#38DDF8]/15 text-[#38DDF8]'
                        : 'border-white/15 bg-[#15132A] text-[#F8FAFC] hover:border-[#A78BFA]/60'
                    }`}
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        event.isInterestedByMe ? 'fill-current' : ''
                      }`}
                    />
                    <span>
                      {event.isInterestedByMe ? 'Remove Interest' : 'Mark Interested'}
                    </span>
                  </button>
                </div>
              )}

              {user?.role === 'ORGANISER' && user.id === event.organiserId && (
                <div className="space-y-2 border-t border-white/10 pt-4">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/organiser/events/${event.id}/registrations`)
                    }
                    className="min-h-[42px] w-full rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7C3AED]"
                  >
                    Manage Registrations ({event.registeredCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/organiser/events/${event.id}/edit`)}
                    className="min-h-[42px] w-full rounded-lg border border-white/15 bg-[#15132A] px-4 py-2 text-xs font-semibold text-[#F8FAFC]"
                  >
                    Edit Event
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

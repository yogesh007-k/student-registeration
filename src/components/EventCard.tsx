import React, { useState } from 'react';
import { Calendar, Check, Heart, MapPin } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { CampusEvent } from '../shared/types';

interface EventCardProps {
  event: CampusEvent;
  recommendationReason?: string;
}

export function EventCard({ event, recommendationReason }: EventCardProps) {
  const { user, navigate, registerForEvent, toggleInterest } = useApp();
  const [imgError, setImgError] = useState(false);
  const [busyReg, setBusyReg] = useState(false);
  const [busyInt, setBusyInt] = useState(false);

  const isCompleted = event.computedStatus === 'COMPLETED';
  const isFull = event.computedStatus === 'FULL';
  const isCancelled = event.computedStatus === 'CANCELLED';
  const isDraft = event.computedStatus === 'DRAFT';

  const statusText = isDraft
    ? 'Draft'
    : isCancelled
      ? 'Cancelled'
      : isCompleted
        ? event.isRegisteredByMe
          ? 'Completed · Attended'
          : 'Completed'
        : isFull
          ? 'FULL'
          : event.isRegisteredByMe
            ? 'Registered'
            : `${event.remainingSeats} of ${event.maxCapacity} ${event.remainingSeats === 1 ? 'seat' : 'seats'} left`;

  const statusTone = isCancelled
    ? 'text-rose-400'
    : isCompleted
      ? 'text-[#A1A1AA]'
      : isFull
        ? 'text-amber-400'
        : event.isRegisteredByMe
          ? 'text-emerald-400'
          : 'text-[#38DDF8]';

  const handleRegister = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'STUDENT') return;
    setBusyReg(true);
    try {
      await registerForEvent(event.id);
    } finally {
      setBusyReg(false);
    }
  };

  const handleInterest = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'STUDENT') return;
    setBusyInt(true);
    try {
      await toggleInterest(event.id, !event.isInterestedByMe);
    } finally {
      setBusyInt(false);
    }
  };

  const canRegister =
    !isCompleted &&
    !isFull &&
    !isCancelled &&
    !isDraft &&
    !event.isRegisteredByMe &&
    (!user || user.role === 'STUDENT');

  return (
    <article
      data-testid={`event-card-${event.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#15132A]/90 transition-colors duration-150 hover:border-[#8B5CF6]/50"
    >
      {/* 16:9 Banner with fallback & scrim */}
      <div className="relative aspect-video w-full overflow-hidden bg-[#090816]">
        {!imgError && event.bannerUrl ? (
          <img
            src={event.bannerUrl}
            alt={event.title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1B1836] via-[#15132A] to-[#090816] p-4 text-center">
            <span className="font-display text-sm font-semibold text-[#A78BFA]">
              {event.category}
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#090816] via-[#090816]/35 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-2 text-xs font-medium text-[#F8FAFC]">
          <span className="truncate">
            {event.category}
            <span aria-hidden="true" className="mx-1.5 text-[#A1A1AA]">
              ·
            </span>
            {event.isFree ? 'Free' : `$${event.feeAmount}`}
          </span>
          <span className={`font-mono tabular-nums whitespace-nowrap shrink-0 ${statusTone}`}>
            {statusText}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-semibold leading-snug text-[#F8FAFC]">
          <a
            href={`/events/${event.id}`}
            onClick={(e) => {
              e.preventDefault();
              navigate(`/events/${event.id}`);
            }}
            className="hover:text-[#A78BFA] transition-colors focus-visible:outline-2 focus-visible:outline-[#38DDF8]"
          >
            {event.title}
          </a>
        </h3>

        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#A1A1AA]">
          {event.shortDescription}
        </p>

        {recommendationReason && (
          <p className="mt-2.5 text-xs text-[#38DDF8]">
            {recommendationReason}
          </p>
        )}

        <div className="mt-4 space-y-1.5 text-xs text-[#A1A1AA]">
          <div className="flex items-center gap-2 font-mono tabular-nums">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-[#A78BFA]" />
            <span>
              {event.date} · {event.startTime}–{event.endTime}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#A78BFA]" />
            <span className="truncate">{event.venue}</span>
          </div>
          <div className="truncate text-[#A1A1AA]">
            Organised by <span className="text-[#F8FAFC]">{event.organiserLabel}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={() => navigate(`/events/${event.id}`)}
            className="min-h-[40px] flex-1 rounded-lg border border-white/15 bg-[#090816] px-3 py-2 text-xs font-semibold text-[#F8FAFC] hover:border-[#A78BFA]/60 transition-colors whitespace-nowrap"
          >
            View Details
          </button>

          {(!user || user.role === 'STUDENT') && (
            <>
              <button
                type="button"
                disabled={!canRegister || busyReg}
                onClick={() => void handleRegister()}
                aria-label={`Register for ${event.title}`}
                className={`min-h-[40px] flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                  isFull || isCompleted || isCancelled
                    ? 'border border-white/10 bg-white/5 text-[#A1A1AA] cursor-not-allowed'
                    : event.isRegisteredByMe
                      ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 cursor-default'
                      : 'bg-[#8B5CF6] text-white hover:bg-[#7C3AED]'
                }`}
              >
                {!isCompleted && !isCancelled && event.isRegisteredByMe && (
                  <Check className="h-3.5 w-3.5" />
                )}
                {busyReg
                  ? 'Registering...'
                  : isCompleted
                    ? 'Completed'
                    : isCancelled
                      ? 'Cancelled'
                      : event.isRegisteredByMe
                        ? 'Registered'
                        : isFull
                          ? 'FULL'
                          : 'Register Now'}
              </button>

              <button
                type="button"
                disabled={busyInt}
                onClick={() => void handleInterest()}
                aria-pressed={Boolean(event.isInterestedByMe)}
                aria-label={
                  event.isInterestedByMe
                    ? `Remove interest in ${event.title}`
                    : `Mark ${event.title} as interested`
                }
                className={`min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  event.isInterestedByMe
                    ? 'border-[#38DDF8]/60 bg-[#38DDF8]/15 text-[#38DDF8]'
                    : 'border-white/15 bg-[#090816] text-[#A1A1AA] hover:text-[#F8FAFC]'
                }`}
              >
                <Heart
                  className={`h-3.5 w-3.5 ${
                    event.isInterestedByMe ? 'fill-current' : ''
                  }`}
                />
                <span>{event.isInterestedByMe ? 'Saved' : 'Interested'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EventForm } from '../components/EventForm';
import { api } from '../lib/api';
import type { CampusEvent, EventPublishStatus } from '../shared/types';

export function EditEventPage({ eventId }: { eventId: string }) {
  const { user, navigate, refreshEvents, pushToast } = useApp();
  const [event, setEvent] = useState<CampusEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
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

  if (!user || user.role !== 'ORGANISER') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-[#F8FAFC]">
          Organiser Access Required
        </h1>
        <p className="mt-2 text-sm text-[#A1A1AA]">
          Sign in as the event organiser to edit event details.
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

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="h-96 animate-pulse rounded-xl border border-white/10 bg-[#15132A]" />
      </div>
    );
  }

  if (error || !event || event.organiserId !== user.id) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-[#F8FAFC]">
          Event Access Denied
        </h1>
        <p className="mt-2 text-sm text-[#A1A1AA]">
          {error || 'You can only edit events created by your own organiser account.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/organiser')}
          className="mt-6 min-h-[42px] rounded-lg bg-[#8B5CF6] px-5 py-2 text-sm font-semibold text-white"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const handleSubmit = async (
    payload: Record<string, unknown>,
    targetStatus: EventPublishStatus
  ) => {
    const res = await api.updateEvent(event.id, payload);
    await refreshEvents();
    pushToast(
      'success',
      targetStatus === 'PUBLISHED'
        ? `Updated and published "${res.event.title}".`
        : `Saved "${res.event.title}" as draft.`
    );
    navigate('/organiser');
  };

  const handleDelete = async () => {
    await api.deleteEvent(event.id);
    await refreshEvents();
    pushToast('info', `Deleted "${event.title}".`);
    navigate('/organiser');
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => navigate('/organiser')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A1A1AA] hover:text-[#F8FAFC]"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Organiser Dashboard</span>
      </button>

      <div className="mt-4 border-b border-white/10 pb-5">
        <h1 className="font-display text-3xl font-bold text-[#F8FAFC]">
          Edit Event: {event.title}
        </h1>
        <p className="mt-1 text-sm text-[#A1A1AA]">
          Update schedule, capacity, or publish status. Registered students will receive an update notification.
        </p>
      </div>

      <div className="mt-6">
        <EventForm
          mode="edit"
          initialEvent={event}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
          onCancel={() => navigate('/organiser')}
        />
      </div>
    </div>
  );
}

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EventForm } from '../components/EventForm';
import { api } from '../lib/api';
import type { EventPublishStatus } from '../shared/types';

export function CreateEventPage() {
  const { user, navigate, refreshEvents, pushToast } = useApp();

  if (!user || user.role !== 'ORGANISER') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-[#F8FAFC]">
          Organiser Access Required
        </h1>
        <p className="mt-2 text-sm text-[#A1A1AA]">
          Only Organiser accounts can create and publish campus events.
        </p>
        <button
          type="button"
          onClick={() => navigate(user?.role === 'STUDENT' ? '/student' : '/login')}
          className="mt-6 min-h-[42px] rounded-lg bg-[#8B5CF6] px-5 py-2 text-sm font-semibold text-white"
        >
          {user?.role === 'STUDENT' ? 'Return to Student Dashboard' : 'Sign In as Organiser'}
        </button>
      </div>
    );
  }

  const handleSubmit = async (
    payload: Record<string, unknown>,
    targetStatus: EventPublishStatus
  ) => {
    const res = await api.createEvent(payload);
    await refreshEvents();
    pushToast(
      'success',
      targetStatus === 'PUBLISHED'
        ? `Published "${res.event.title}" to student discovery.`
        : `Saved "${res.event.title}" as a draft.`
    );
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
          Create Campus Event
        </h1>
        <p className="mt-1 text-sm text-[#A1A1AA]">
          Fill in the essential fields below or use Gemini AI to draft copy and suggest a category in seconds.
        </p>
      </div>

      <div className="mt-6">
        <EventForm
          mode="create"
          onSubmit={handleSubmit}
          onCancel={() => navigate('/organiser')}
        />
      </div>
    </div>
  );
}

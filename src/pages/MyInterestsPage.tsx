import React from 'react';
import { Heart } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EventCard } from '../components/EventCard';

export function MyInterestsPage() {
  const { user, events, navigate } = useApp();

  if (!user || user.role !== 'STUDENT') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-[#F8FAFC]">
          My Interests
        </h1>
        <p className="mt-2 text-sm text-[#A1A1AA]">
          Sign in as a Student to access your bookmarked campus events.
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

  const interestedEvents = events.filter((e) => e.isInterestedByMe);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#F8FAFC]">
            Events I Am Interested In
          </h1>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            Saved campus events you marked to follow or register for later.
          </p>
        </div>
        <span className="font-mono text-xs tabular-nums text-[#38DDF8]">
          {interestedEvents.length} saved
        </span>
      </div>

      {interestedEvents.length === 0 ? (
        <div className="mt-10 rounded-xl border border-white/10 bg-[#15132A] p-10 text-center">
          <Heart className="mx-auto h-8 w-8 text-[#38DDF8]" />
          <h2 className="mt-3 font-display text-xl font-semibold text-[#F8FAFC]">
            No saved interests yet
          </h2>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            Click "Interested" on any event card to track updates and personalize recommendations.
          </p>
          <button
            type="button"
            onClick={() => navigate('/discover')}
            className="mt-5 min-h-[42px] rounded-lg bg-[#8B5CF6] px-5 py-2 text-xs font-semibold text-white hover:bg-[#7C3AED]"
          >
            Browse Events
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {interestedEvents.map((ev) => (
            <EventCard key={ev.id} event={ev} />
          ))}
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EventCard } from '../components/EventCard';
import {
  isThisWeekEvent,
  isTodayEvent,
  isUpcomingEvent,
} from '../shared/eventLogic';

export function StudentDashboard() {
  const {
    user,
    events,
    eventsLoading,
    recommendations,
    recommendationsLoading,
    refreshRecommendations,
    navigate,
  } = useApp();

  if (!user || user.role !== 'STUDENT') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-[#F8FAFC]">
          Student Workspace
        </h1>
        <p className="mt-2 text-sm text-[#A1A1AA]">
          Sign in with a Student account (such as STU001) to view your personalized campus dashboard.
        </p>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="mt-6 min-h-[44px] rounded-lg bg-[#8B5CF6] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Go to Login
        </button>
      </div>
    );
  }

  const now = new Date();
  const featured = events.filter((e) => e.isFeatured && isUpcomingEvent(e, now));
  const todays = events.filter((e) => isTodayEvent(e, now) && e.status === 'PUBLISHED');
  const thisWeek = events.filter((e) => isThisWeekEvent(e, now) && e.status === 'PUBLISHED');
  const upcoming = events.filter((e) => isUpcomingEvent(e, now));
  const recentlyAdded = [...events]
    .filter((e) => e.status === 'PUBLISHED')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);
  const registered = events.filter((e) => e.isRegisteredByMe);
  const interested = events.filter((e) => e.isInterestedByMe);

  const recommendedPairs = (recommendations?.recommendations ?? [])
    .map((rec) => {
      const ev = events.find((e) => e.id === rec.eventId);
      return ev ? { event: ev, reason: rec.reason } : null;
    })
    .filter((x): x is { event: (typeof events)[number]; reason: string } => Boolean(x));

  const renderSection = (
    title: string,
    subtitle: string,
    list: typeof events,
    emptyText: string,
    actionLabel?: string,
    actionTo?: string
  ) => (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-[#F8FAFC]">{title}</h2>
          <p className="mt-0.5 text-xs text-[#A1A1AA]">{subtitle}</p>
        </div>
        {actionLabel && actionTo && (
          <button
            type="button"
            onClick={() => navigate(actionTo)}
            className="text-xs font-semibold text-[#A78BFA] hover:text-[#F8FAFC]"
          >
            {actionLabel} →
          </button>
        )}
      </div>

      {eventsLoading ? (
        <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-xl border border-white/10 bg-[#15132A]"
            />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-[#15132A] p-6 text-sm text-[#A1A1AA]">
          {emptyText}
        </div>
      ) : (
        <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {list.map((ev) => (
            <EventCard key={ev.id} event={ev} />
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Welcome Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <p className="font-mono text-xs text-[#38DDF8]">
            {user.handle} · {user.department}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-[#F8FAFC]">
            Welcome back, {user.displayLabel}
          </h1>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            Track today’s campus sessions, explore upcoming events, and manage your seat reservations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="min-h-[42px] rounded-lg border border-white/15 bg-[#15132A] px-4 py-2 text-xs font-semibold text-[#F8FAFC] hover:border-[#A78BFA]/60"
          >
            Edit Interests & Preferences
          </button>
          <button
            type="button"
            onClick={() => navigate('/discover')}
            className="min-h-[42px] rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7C3AED]"
          >
            Explore All Events
          </button>
        </div>
      </div>

      {/* Quick Summary Row */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-[#15132A] p-4">
          <span className="text-xs text-[#A1A1AA]">Registered Events</span>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums text-emerald-400">
            {registered.length}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#15132A] p-4">
          <span className="text-xs text-[#A1A1AA]">Saved Interests</span>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums text-[#38DDF8]">
            {interested.length}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#15132A] p-4">
          <span className="text-xs text-[#A1A1AA]">Happening Today</span>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums text-[#F8FAFC]">
            {todays.length}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#15132A] p-4">
          <span className="text-xs text-[#A1A1AA]">This Week</span>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums text-[#A78BFA]">
            {thisWeek.length}
          </div>
        </div>
      </div>

      {/* AI Recommended Events */}
      <section className="mt-10 rounded-xl border border-[#8B5CF6]/35 bg-[#15132A] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-[#F8FAFC] flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#38DDF8]" />
              <span>Recommended for You</span>
            </h2>
            <p className="mt-1 text-xs text-[#A1A1AA]">
              {recommendations?.groundingSummary ||
                'Evaluating your selected preferences and upcoming campus schedule.'}
            </p>
            {recommendations && (
              <p className="mt-1 text-xs font-mono text-[#A78BFA]">
                {recommendations.source === 'gemini'
                  ? 'Source: Gemini AI Ranking'
                  : 'Source: Preference & Schedule Fallback (AI unavailable)'}
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={recommendationsLoading}
            onClick={() => void refreshRecommendations()}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#090816] px-3.5 py-2 text-xs font-semibold text-[#F8FAFC] hover:border-[#38DDF8]/60"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${recommendationsLoading ? 'animate-spin' : ''}`}
            />
            <span>Refresh Recommendations</span>
          </button>
        </div>

        {recommendationsLoading && recommendedPairs.length === 0 ? (
          <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-xl border border-white/10 bg-[#090816]"
              />
            ))}
          </div>
        ) : recommendedPairs.length === 0 ? (
          <p className="mt-4 text-sm text-[#A1A1AA]">
            No open upcoming recommendations right now. Select preferred categories in Profile & Preferences to tailor suggestions.
          </p>
        ) : (
          <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {recommendedPairs.slice(0, 3).map(({ event, reason }) => (
              <EventCard
                key={event.id}
                event={event}
                recommendationReason={reason}
              />
            ))}
          </div>
        )}
      </section>

      {renderSection(
        'Featured Events',
        'Highlighted flagship events across campus',
        featured,
        'No featured events are currently scheduled.'
      )}

      {renderSection(
        "Today's Events",
        'Campus sessions scheduled for today',
        todays,
        'No events scheduled for today. Check This Week below.'
      )}

      {renderSection(
        "This Week's Events",
        'Upcoming campus activities within the next 7 days',
        thisWeek,
        'No events scheduled within the next 7 days.'
      )}

      {renderSection(
        'Upcoming Events',
        'All open upcoming campus listings',
        upcoming.slice(0, 6),
        'No upcoming events published yet.',
        'Browse Discovery',
        '/discover'
      )}

      {renderSection(
        'Recently Added Events',
        'Newest listings published by campus organisers',
        recentlyAdded,
        'No recently added events found.'
      )}

      {renderSection(
        'Events I Registered For',
        'Confirmed seats on your schedule',
        registered,
        'You have not registered for any events yet.',
        'Manage Registrations',
        '/registrations'
      )}

      {renderSection(
        'Events I Am Interested In',
        'Events you bookmarked to revisit',
        interested,
        'You have not marked any events as interested yet.',
        'View Saved Interests',
        '/interests'
      )}
    </div>
  );
}

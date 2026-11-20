import React from 'react';
import { ArrowRight, CalendarCheck, ShieldCheck, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EventCard } from '../components/EventCard';
import { filterAndSortEvents } from '../shared/eventLogic';

export function LandingPage() {
  const { navigate, events, user } = useApp();

  const upcomingEvents = filterAndSortEvents(events, {
    search: '',
    category: 'ALL',
    dateFilter: 'upcoming',
    priceFilter: 'all',
  }).slice(0, 3);

  const openSeatsTotal = upcomingEvents.reduce((sum, e) => sum + e.remainingSeats, 0);
  const totalRegistrations = events.reduce((sum, e) => sum + e.registeredCount, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Hero Split */}
      <section className="grid items-stretch gap-8 lg:grid-cols-12">
        <div className="flex flex-col justify-center lg:col-span-6">
          <p className="text-xs font-medium tracking-wide text-[#38DDF8]">
            Campus Event Discovery & Organiser Platform
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-[#F8FAFC] sm:text-5xl">
            Discover. Connect. Experience Campus Life.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[#A1A1AA]">
            CampusConnect AI brings every university hackathon, workshop, cultural showcase, and seminar into one unified hub—with real-time seat tracking, atomic capacity protection, and Gemini-assisted publishing.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(
                  user?.role === 'ORGANISER'
                    ? '/organiser'
                    : user?.role === 'STUDENT'
                      ? '/student'
                      : '/login'
                )
              }
              className="min-h-[44px] inline-flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#7C3AED] transition-colors"
            >
              <span>{user ? 'Open My Workspace' : 'Launch Demo Login'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/discover')}
              className="min-h-[44px] rounded-lg border border-white/15 bg-[#15132A] px-5 py-2.5 text-sm font-semibold text-[#F8FAFC] hover:border-[#A78BFA]/60 transition-colors"
            >
              Browse Campus Events
            </button>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="relative h-full min-h-[280px] overflow-hidden rounded-xl border border-white/10 bg-[#15132A]">
            <img
              src="/src/assets/images/hero_campus_hub_1795210968757.jpg"
              alt="University innovation atrium with students collaborating near digital event kiosks"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#090816]/85 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-5 right-5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#F8FAFC]">
              <span>Live Campus Schedule</span>
              <span className="font-mono tabular-nums text-[#38DDF8]">
                {events.length} active listings
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Full-Width Quantitative Strip */}
      <section className="mt-10 grid grid-cols-2 gap-4 rounded-xl border border-white/10 bg-[#15132A] p-5 sm:grid-cols-4">
        <div>
          <p className="text-xs text-[#A1A1AA]">Published Events</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-[#F8FAFC]">
            {events.length}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#A1A1AA]">Confirmed Registrations</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-[#38DDF8]">
            {totalRegistrations}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#A1A1AA]">Open Seats (Featured)</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-[#A78BFA]">
            {openSeatsTotal}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#A1A1AA]">Privacy Model</p>
          <p className="mt-1 font-display text-2xl font-bold text-[#F8FAFC]">
            Zero PII
          </p>
        </div>
      </section>

      {/* Workflow Mechanism */}
      <section className="mt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#F8FAFC]">
              Built for Organisers and Students
            </h2>
            <p className="mt-1 text-sm text-[#A1A1AA]">
              From 60-second event publishing to instant seat confirmation and CSV attendance tracking.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-[#15132A] p-6">
            <Sparkles className="h-5 w-5 text-[#38DDF8]" />
            <h3 className="mt-4 font-display text-lg font-semibold text-[#F8FAFC]">
              01. Publish in Under a Minute
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#A1A1AA]">
              Organisers draft descriptions and classify categories with Gemini AI, preview the student view, and publish directly to campus discovery.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#15132A] p-6">
            <CalendarCheck className="h-5 w-5 text-[#A78BFA]" />
            <h3 className="mt-4 font-display text-lg font-semibold text-[#F8FAFC]">
              02. Atomic Seat Reservations
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#A1A1AA]">
              Server-side database transactions enforce capacity limits, block duplicate sign-ups, and update live remaining seat counts immediately.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#15132A] p-6">
            <ShieldCheck className="h-5 w-5 text-[#38DDF8]" />
            <h3 className="mt-4 font-display text-lg font-semibold text-[#F8FAFC]">
              03. Role-Verified Management
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#A1A1AA]">
              Students and organisers operate with strict role boundaries and fictional campus handles (STU001, ORG001) without storing personal data.
            </p>
          </div>
        </div>
      </section>

      {/* Upcoming Preview */}
      <section className="mt-16">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#F8FAFC]">
              Upcoming on Campus
            </h2>
            <p className="mt-1 text-sm text-[#A1A1AA]">
              Live listings directly from the CampusConnect database.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/discover')}
            className="text-sm font-semibold text-[#A78BFA] hover:text-[#F8FAFC] transition-colors"
          >
            View All Events →
          </button>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {upcomingEvents.map((ev) => (
            <EventCard key={ev.id} event={ev} />
          ))}
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="mt-20 border-t border-white/10 pt-8 text-xs text-[#A1A1AA] flex flex-wrap items-center justify-between gap-4">
        <span>CampusConnect AI — Fictional University Demo Environment (Zero Real PII)</span>
        <div className="flex items-center gap-6">
          <a
            href="/discover"
            onClick={(e) => {
              e.preventDefault();
              navigate('/discover');
            }}
            className="hover:text-[#F8FAFC]"
          >
            Discover Events
          </a>
          <a
            href="/login"
            onClick={(e) => {
              e.preventDefault();
              navigate('/login');
            }}
            className="hover:text-[#F8FAFC]"
          >
            Demo Accounts
          </a>
        </div>
      </footer>
    </div>
  );
}

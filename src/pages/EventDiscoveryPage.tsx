import React, { useMemo, useState } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EventCard } from '../components/EventCard';
import { EVENT_CATEGORIES, filterAndSortEvents } from '../shared/eventLogic';
import type { EventCategory, EventFilters } from '../shared/types';

export function EventDiscoveryPage() {
  const { events, eventsLoading } = useApp();
  const [filters, setFilters] = useState<EventFilters>({
    search: '',
    category: 'ALL',
    dateFilter: 'all',
    priceFilter: 'all',
  });

  const filteredEvents = useMemo(
    () => filterAndSortEvents(events, filters, new Date()),
    [events, filters]
  );

  const resetFilters = () =>
    setFilters({
      search: '',
      category: 'ALL',
      dateFilter: 'all',
      priceFilter: 'all',
    });

  const hasActiveFilters =
    filters.search !== '' ||
    filters.category !== 'ALL' ||
    filters.dateFilter !== 'all' ||
    filters.priceFilter !== 'all';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#F8FAFC]">
            Discover Campus Events
          </h1>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            Search by event title, organiser, or venue. Upcoming events appear first.
          </p>
        </div>
        <span className="font-mono text-xs tabular-nums text-[#38DDF8]">
          {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'} shown
        </span>
      </div>

      {/* Filter Bar */}
      <section
        aria-label="Event filters"
        className="mt-6 space-y-4 rounded-xl border border-white/10 bg-[#15132A] p-5"
      >
        <div className="grid gap-3 md:grid-cols-12">
          <div className="relative md:col-span-6">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A1A1AA]" />
            <input
              type="search"
              aria-label="Search events by name, organiser, or venue"
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              placeholder="Search by event name, organiser (e.g., ORG001), or venue..."
              className="w-full rounded-lg border border-white/15 bg-[#090816] py-2.5 pl-10 pr-4 text-sm text-[#F8FAFC] placeholder:text-[#A1A1AA]/60 focus:border-[#8B5CF6] focus:outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <select
              aria-label="Filter by schedule date"
              value={filters.dateFilter}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  dateFilter: e.target.value as EventFilters['dateFilter'],
                }))
              }
              className="w-full rounded-lg border border-white/15 bg-[#090816] px-3.5 py-2.5 text-sm text-[#F8FAFC] focus:border-[#8B5CF6] focus:outline-none"
            >
              <option value="all">All Dates (Upcoming First)</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="upcoming">Upcoming Only</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              aria-label="Filter by entry fee"
              value={filters.priceFilter}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  priceFilter: e.target.value as EventFilters['priceFilter'],
                }))
              }
              className="w-full rounded-lg border border-white/15 bg-[#090816] px-3.5 py-2.5 text-sm text-[#F8FAFC] focus:border-[#8B5CF6] focus:outline-none"
            >
              <option value="all">Free & Paid Events</option>
              <option value="free">Free Only</option>
              <option value="paid">Paid Entry Only</option>
            </select>
          </div>
        </div>

        {/* Category Filter Segmented Controls */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, category: 'ALL' }))}
            className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              filters.category === 'ALL'
                ? 'bg-[#8B5CF6] text-white'
                : 'border border-white/10 bg-[#090816] text-[#A1A1AA] hover:text-[#F8FAFC]'
            }`}
          >
            All Categories
          </button>
          {EVENT_CATEGORIES.map((cat: EventCategory) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, category: cat }))}
              className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                filters.category === cat
                  ? 'bg-[#8B5CF6] text-white'
                  : 'border border-white/10 bg-[#090816] text-[#A1A1AA] hover:text-[#F8FAFC]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Results */}
      {eventsLoading ? (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-80 animate-pulse rounded-xl border border-white/10 bg-[#15132A]"
            />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="mt-10 rounded-xl border border-white/10 bg-[#15132A] p-10 text-center">
          <h2 className="font-display text-xl font-semibold text-[#F8FAFC]">
            No matching campus events found
          </h2>
          <p className="mt-2 text-sm text-[#A1A1AA]">
            Try clearing your search query or switching to a broader date or category filter.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-5 inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7C3AED]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((ev) => (
            <EventCard key={ev.id} event={ev} />
          ))}
        </div>
      )}
    </div>
  );
}

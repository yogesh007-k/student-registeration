import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFallbackRecommendations,
  computeEventStatus,
  filterAndSortEvents,
  sanitizeCsvCell,
  validateEventPayload,
} from './eventLogic';
import type { CampusEvent } from './types';

function makeEvent(overrides: Partial<CampusEvent> = {}): CampusEvent {
  return {
    id: 'evt-1',
    title: 'AI Innovation Workshop',
    category: 'Workshops',
    date: '2026-11-24',
    startTime: '14:00',
    endTime: '16:00',
    venue: 'Innovation Lab 101',
    shortDescription: 'Hands-on campus workshop covering modern applied AI workflows.',
    fullDescription: 'Hands-on campus workshop covering modern applied AI workflows.',
    additionalInstructions: '',
    registrationDeadline: '2026-11-23',
    maxCapacity: 50,
    isFree: true,
    feeAmount: 0,
    bannerUrl: '/src/assets/images/banner_ai_workshop_1795210968134.jpg',
    organiserId: 'ORG001',
    organiserLabel: 'Tech & Innovation Guild',
    status: 'PUBLISHED',
    isFeatured: false,
    createdAt: '2026-11-18T10:00:00Z',
    updatedAt: '2026-11-18T10:00:00Z',
    registeredCount: 10,
    interestedCount: 15,
    remainingSeats: 40,
    computedStatus: 'OPEN',
    ...overrides,
  };
}

test('computeEventStatus detects OPEN, FULL, COMPLETED, DRAFT, CANCELLED accurately', () => {
  const now = new Date('2026-11-20T12:00:00');
  assert.equal(
    computeEventStatus(
      { status: 'PUBLISHED', date: '2026-11-25', endTime: '16:00', maxCapacity: 20 },
      5,
      now
    ),
    'OPEN'
  );
  assert.equal(
    computeEventStatus(
      { status: 'PUBLISHED', date: '2026-11-25', endTime: '16:00', maxCapacity: 20 },
      20,
      now
    ),
    'FULL'
  );
  assert.equal(
    computeEventStatus(
      { status: 'PUBLISHED', date: '2026-11-19', endTime: '16:00', maxCapacity: 20 },
      5,
      now
    ),
    'COMPLETED'
  );
  assert.equal(
    computeEventStatus(
      { status: 'PUBLISHED', date: '2026-11-20', endTime: '11:30', maxCapacity: 20 },
      5,
      now
    ),
    'COMPLETED'
  );
  assert.equal(
    computeEventStatus(
      { status: 'DRAFT', date: '2026-11-25', endTime: '16:00', maxCapacity: 20 },
      0,
      now
    ),
    'DRAFT'
  );
  assert.equal(
    computeEventStatus(
      { status: 'CANCELLED', date: '2026-11-25', endTime: '16:00', maxCapacity: 20 },
      5,
      now
    ),
    'CANCELLED'
  );
});

test('filterAndSortEvents excludes drafts, searches by title/organiser, and sorts upcoming first', () => {
  const now = new Date('2026-11-20T12:00:00');
  const events: CampusEvent[] = [
    makeEvent({ id: 'past', title: 'Past Seminar', date: '2026-11-10', organiserLabel: 'Dept CS' }),
    makeEvent({ id: 'draft', title: 'Secret Draft', status: 'DRAFT', date: '2026-11-21' }),
    makeEvent({ id: 'later', title: 'December Hackathon', category: 'Hackathons', date: '2026-12-05' }),
    makeEvent({ id: 'sooner', title: 'Tomorrow Workshop', date: '2026-11-21', organiserLabel: 'Robotics Club' }),
  ];

  const all = filterAndSortEvents(
    events,
    { search: '', category: 'ALL', dateFilter: 'all', priceFilter: 'all' },
    now
  );
  assert.deepEqual(
    all.map((e) => e.id),
    ['sooner', 'later', 'past']
  );

  const byOrg = filterAndSortEvents(
    events,
    { search: 'robotics', category: 'ALL', dateFilter: 'all', priceFilter: 'all' },
    now
  );
  assert.deepEqual(
    byOrg.map((e) => e.id),
    ['sooner']
  );

  const completedOnly = filterAndSortEvents(
    events,
    { search: '', category: 'ALL', dateFilter: 'completed', priceFilter: 'all' },
    now
  );
  assert.deepEqual(
    completedOnly.map((e) => e.id),
    ['past']
  );
});

test('validateEventPayload rejects invalid end times, capacity, and missing fields', () => {
  const bad = validateEventPayload({
    title: 'Hi',
    category: 'InvalidCat',
    date: '2026-11-25',
    startTime: '16:00',
    endTime: '14:00',
    venue: '',
    shortDescription: 'Too short',
    maxCapacity: 0,
  });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.title);
  assert.ok(bad.errors.category);
  assert.ok(bad.errors.endTime);
  assert.ok(bad.errors.venue);
  assert.ok(bad.errors.shortDescription);
  assert.ok(bad.errors.maxCapacity);

  const good = validateEventPayload({
    title: 'Quantum Computing Seminar',
    category: 'Seminars',
    date: '2026-11-28',
    startTime: '14:00',
    endTime: '16:00',
    venue: 'Turing Hall 204',
    shortDescription: 'Introduction to campus quantum hardware research and algorithms.',
    maxCapacity: 60,
  });
  assert.equal(good.valid, true);
  assert.equal(good.sanitized?.status, 'PUBLISHED');
  assert.equal(good.sanitized?.maxCapacity, 60);
});

test('buildFallbackRecommendations never claims behavioral history when none exists', () => {
  const now = new Date('2026-11-20T12:00:00');
  const events = [
    makeEvent({ id: 'e1', category: 'Hackathons', isFeatured: true, remainingSeats: 20 }),
    makeEvent({ id: 'e2', category: 'Cultural', isFeatured: false, remainingSeats: 15 }),
  ];

  const coldStart = buildFallbackRecommendations(events, null, [], [], now);
  assert.match(coldStart.groundingSummary, /no personal preferences or activity history/i);
  assert.equal(coldStart.recommendations.length, 2);

  const withPrefs = buildFallbackRecommendations(
    events,
    {
      userId: 'STU001',
      preferredCategories: ['Cultural'],
      viewedEventIds: [],
      digestEnabled: false,
      updatedAt: '2026-11-20T12:00:00Z',
    },
    [],
    [],
    now
  );
  assert.equal(withPrefs.recommendations[0].eventId, 'e2');
  assert.match(withPrefs.groundingSummary, /selected preferences: Cultural/i);
});

test('sanitizeCsvCell neutralizes formula injection prefixes', () => {
  assert.equal(sanitizeCsvCell('=CMD()'), `"'=CMD()"`);
  assert.equal(sanitizeCsvCell('STU001'), `"STU001"`);
});

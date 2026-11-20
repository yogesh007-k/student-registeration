import type {
  CampusEvent,
  ComputedEventStatus,
  EventCategory,
  EventFilters,
  EventPublishStatus,
  EventRecommendation,
  UserPreferences,
} from './types';

export const EVENT_CATEGORIES: readonly EventCategory[] = [
  'Technical',
  'Cultural',
  'Sports',
  'Workshops',
  'Hackathons',
  'Department Events',
  'Seminars',
  'Competitions',
  'Other',
] as const;

export const ALLOWED_BANNER_PRESETS: readonly string[] = [
  '/src/assets/images/hero_campus_hub_1795210968757.jpg',
  '/src/assets/images/banner_hackathon_1795210968613.jpg',
  '/src/assets/images/banner_ai_workshop_1795210968134.jpg',
  '/src/assets/images/banner_cultural_fest_1795210968808.jpg',
  '/src/assets/images/banner_sports_robotics_1795210967924.jpg',
];

export function formatLocalDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatLocalTimeHHMM(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${mins}`;
}

export function hasEventEnded(
  event: { date: string; endTime: string },
  now: Date = new Date()
): boolean {
  const todayISO = formatLocalDateISO(now);
  if (event.date < todayISO) return true;
  if (event.date > todayISO) return false;
  const currentHHMM = formatLocalTimeHHMM(now);
  return event.endTime <= currentHHMM;
}

export function hasDeadlinePassed(
  registrationDeadline: string | undefined | null,
  now: Date = new Date()
): boolean {
  if (!registrationDeadline || !registrationDeadline.trim()) return false;
  const todayISO = formatLocalDateISO(now);
  return registrationDeadline < todayISO;
}

export function computeEventStatus(
  event: {
    status: EventPublishStatus;
    date: string;
    endTime: string;
    maxCapacity: number;
  },
  registeredCount: number,
  now: Date = new Date()
): ComputedEventStatus {
  if (event.status === 'DRAFT') return 'DRAFT';
  if (event.status === 'CANCELLED') return 'CANCELLED';
  if (hasEventEnded(event, now)) return 'COMPLETED';
  if (registeredCount >= event.maxCapacity) return 'FULL';
  return 'OPEN';
}

export function isTodayEvent(
  event: { date: string },
  now: Date = new Date()
): boolean {
  return event.date === formatLocalDateISO(now);
}

export function isThisWeekEvent(
  event: { date: string; endTime: string },
  now: Date = new Date()
): boolean {
  if (hasEventEnded(event, now)) return false;
  const todayISO = formatLocalDateISO(now);
  const weekEnd = new Date(now.getTime());
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndISO = formatLocalDateISO(weekEnd);
  return event.date >= todayISO && event.date <= weekEndISO;
}

export function isUpcomingEvent(
  event: { status: EventPublishStatus; date: string; endTime: string },
  now: Date = new Date()
): boolean {
  if (event.status !== 'PUBLISHED') return false;
  return !hasEventEnded(event, now);
}

export function filterAndSortEvents(
  events: CampusEvent[],
  filters: EventFilters,
  now: Date = new Date()
): CampusEvent[] {
  const query = filters.search.trim().toLowerCase();

  const filtered = events.filter((ev) => {
    if (ev.status === 'DRAFT') return false;

    if (filters.category !== 'ALL' && ev.category !== filters.category) {
      return false;
    }

    if (filters.priceFilter === 'free' && !ev.isFree) return false;
    if (filters.priceFilter === 'paid' && ev.isFree) return false;

    const ended = hasEventEnded(ev, now);
    if (filters.dateFilter === 'today' && !isTodayEvent(ev, now)) return false;
    if (filters.dateFilter === 'week' && !isThisWeekEvent(ev, now)) return false;
    if (filters.dateFilter === 'upcoming' && (ended || ev.status === 'CANCELLED')) {
      return false;
    }
    if (filters.dateFilter === 'completed' && !ended) return false;

    if (query.length > 0) {
      const haystack = `${ev.title} ${ev.organiserLabel} ${ev.venue} ${ev.category} ${ev.shortDescription}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });

  // Sort upcoming-first by date/startTime ascending; completed or cancelled after active upcoming
  return [...filtered].sort((a, b) => {
    const aEnded = hasEventEnded(a, now) || a.status === 'CANCELLED';
    const bEnded = hasEventEnded(b, now) || b.status === 'CANCELLED';
    if (aEnded !== bEnded) return aEnded ? 1 : -1;

    const aKey = `${a.date}T${a.startTime}`;
    const bKey = `${b.date}T${b.startTime}`;
    if (!aEnded) {
      return aKey.localeCompare(bKey);
    }
    // Most recently completed first
    return bKey.localeCompare(aKey);
  });
}

export interface EventFormInput {
  title: string;
  category: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  shortDescription: string;
  fullDescription?: string;
  additionalInstructions?: string;
  registrationDeadline?: string;
  maxCapacity: number | string;
  isFree?: boolean;
  feeAmount?: number | string;
  bannerUrl?: string;
  status?: EventPublishStatus;
  isFeatured?: boolean;
}

export interface EventValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  sanitized?: {
    title: string;
    category: EventCategory;
    date: string;
    startTime: string;
    endTime: string;
    venue: string;
    shortDescription: string;
    fullDescription: string;
    additionalInstructions: string;
    registrationDeadline: string;
    maxCapacity: number;
    isFree: boolean;
    feeAmount: number;
    bannerUrl: string;
    status: EventPublishStatus;
    isFeatured: boolean;
  };
}

export function validateEventPayload(input: EventFormInput): EventValidationResult {
  const errors: Record<string, string> = {};

  const title = (input.title ?? '').trim();
  const venue = (input.venue ?? '').trim();
  const shortDescription = (input.shortDescription ?? '').trim();
  const fullDescription = ((input.fullDescription ?? '').trim()) || shortDescription;
  const additionalInstructions = (input.additionalInstructions ?? '').trim();
  const date = (input.date ?? '').trim();
  const startTime = (input.startTime ?? '').trim();
  const endTime = (input.endTime ?? '').trim();
  const registrationDeadline = (input.registrationDeadline ?? '').trim();

  if (title.length < 3 || title.length > 140) {
    errors.title = 'Event title must be between 3 and 140 characters.';
  }

  const category = input.category as EventCategory;
  if (!EVENT_CATEGORIES.includes(category)) {
    errors.category = 'Select a valid event category.';
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.date = 'Provide a valid date in YYYY-MM-DD format.';
  }

  if (!/^\d{2}:\d{2}$/.test(startTime)) {
    errors.startTime = 'Provide a valid start time (HH:MM).';
  }

  if (!/^\d{2}:\d{2}$/.test(endTime)) {
    errors.endTime = 'Provide a valid end time (HH:MM).';
  }

  if (
    /^\d{2}:\d{2}$/.test(startTime) &&
    /^\d{2}:\d{2}$/.test(endTime) &&
    endTime <= startTime
  ) {
    errors.endTime = 'End time must be after start time.';
  }

  if (venue.length < 2 || venue.length > 120) {
    errors.venue = 'Venue must be between 2 and 120 characters.';
  }

  if (shortDescription.length < 10 || shortDescription.length > 320) {
    errors.shortDescription = 'Short description must be between 10 and 320 characters.';
  }

  if (fullDescription.length > 4000) {
    errors.fullDescription = 'Full description cannot exceed 4000 characters.';
  }

  if (additionalInstructions.length > 1500) {
    errors.additionalInstructions = 'Additional instructions cannot exceed 1500 characters.';
  }

  if (registrationDeadline && !/^\d{4}-\d{2}-\d{2}$/.test(registrationDeadline)) {
    errors.registrationDeadline = 'Deadline must be YYYY-MM-DD.';
  } else if (registrationDeadline && date && registrationDeadline > date) {
    errors.registrationDeadline = 'Registration deadline cannot be after the event date.';
  }

  const capNum = Number(input.maxCapacity);
  if (!Number.isInteger(capNum) || capNum < 1 || capNum > 10000) {
    errors.maxCapacity = 'Maximum capacity must be a whole number between 1 and 10,000.';
  }

  const isFree = input.isFree !== false;
  const feeAmount = isFree ? 0 : Math.max(0, Number(input.feeAmount ?? 0));
  if (!isFree && (!Number.isFinite(feeAmount) || feeAmount <= 0 || feeAmount > 5000)) {
    errors.feeAmount = 'Paid event fee must be between 1 and 5000.';
  }

  let bannerUrl = (input.bannerUrl ?? '').trim();
  if (bannerUrl && !bannerUrl.startsWith('/src/assets/images/') && !/^https?:\/\//i.test(bannerUrl)) {
    errors.bannerUrl = 'Banner URL must be a valid preset or http(s) URL.';
  }
  if (!bannerUrl) {
    bannerUrl = defaultBannerForCategory(category || 'Other');
  }

  const status: EventPublishStatus =
    input.status === 'DRAFT' || input.status === 'CANCELLED'
      ? input.status
      : 'PUBLISHED';

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    sanitized: {
      title,
      category,
      date,
      startTime,
      endTime,
      venue,
      shortDescription,
      fullDescription,
      additionalInstructions,
      registrationDeadline,
      maxCapacity: capNum,
      isFree,
      feeAmount,
      bannerUrl,
      status,
      isFeatured: Boolean(input.isFeatured),
    },
  };
}

export function defaultBannerForCategory(category: EventCategory | string): string {
  switch (category) {
    case 'Hackathons':
    case 'Technical':
      return '/src/assets/images/banner_hackathon_1795210968613.jpg';
    case 'Workshops':
    case 'Seminars':
    case 'Department Events':
      return '/src/assets/images/banner_ai_workshop_1795210968134.jpg';
    case 'Cultural':
      return '/src/assets/images/banner_cultural_fest_1795210968808.jpg';
    case 'Sports':
    case 'Competitions':
      return '/src/assets/images/banner_sports_robotics_1795210967924.jpg';
    default:
      return '/src/assets/images/hero_campus_hub_1795210968757.jpg';
  }
}

export function buildFallbackRecommendations(
  events: CampusEvent[],
  preferences: UserPreferences | null,
  registeredEventIds: string[],
  interestedEventIds: string[],
  now: Date = new Date()
): { recommendations: EventRecommendation[]; groundingSummary: string } {
  const registeredSet = new Set(registeredEventIds);
  const interestedSet = new Set(interestedEventIds);
  const preferredCats = new Set(preferences?.preferredCategories ?? []);
  const viewedIds = preferences?.viewedEventIds ?? [];

  const viewedCategories = new Set<EventCategory>();
  for (const ev of events) {
    if (viewedIds.includes(ev.id) || registeredSet.has(ev.id) || interestedSet.has(ev.id)) {
      viewedCategories.add(ev.category);
    }
  }

  const candidates = events.filter(
    (ev) =>
      ev.status === 'PUBLISHED' &&
      !hasEventEnded(ev, now) &&
      ev.remainingSeats > 0 &&
      !registeredSet.has(ev.id)
  );

  const hasPrefs = preferredCats.size > 0;
  const hasHistory =
    viewedIds.length > 0 || registeredEventIds.length > 0 || interestedEventIds.length > 0;

  let groundingSummary =
    'Ranked by upcoming schedule and available seats (no personal preferences or activity history recorded yet).';
  if (hasPrefs && hasHistory) {
    groundingSummary =
      'Grounded in your selected category preferences and your saved campus event activity.';
  } else if (hasPrefs) {
    groundingSummary = `Grounded in your selected preferences: ${Array.from(preferredCats).join(', ')}.`;
  } else if (hasHistory) {
    groundingSummary =
      'Grounded in categories from events you recently viewed, saved, or registered for.';
  }

  const scored = candidates.map((ev) => {
    let score = 0;
    const reasons: string[] = [];

    if (preferredCats.has(ev.category)) {
      score += 50;
      reasons.push(`Matches your selected ${ev.category} preference`);
    }
    if (interestedSet.has(ev.id)) {
      score += 30;
      reasons.push('Marked as Interested by you');
    } else if (viewedCategories.has(ev.category) && !preferredCats.has(ev.category)) {
      score += 20;
      reasons.push(`Similar to ${ev.category} events in your activity`);
    }
    if (ev.isFeatured) {
      score += 12;
      if (reasons.length === 0) reasons.push('Featured upcoming campus event');
    }
    if (isThisWeekEvent(ev, now)) {
      score += 10;
      if (reasons.length === 0) reasons.push('Happening soon with open seats');
    }
    score += Math.min(8, ev.interestedCount);

    if (reasons.length === 0) {
      reasons.push(`Open registration (${ev.remainingSeats} seats left)`);
    }

    return {
      eventId: ev.id,
      score,
      reason: reasons.join(' · '),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return {
    recommendations: scored.slice(0, 4),
    groundingSummary,
  };
}

export function sanitizeCsvCell(val: string | number | boolean): string {
  const str = String(val ?? '');
  const escaped = str.replace(/"/g, '""');
  // Prevent CSV formula injection
  const safe = /^[=+\-@\t\r]/.test(escaped) ? `'${escaped}` : escaped;
  return `"${safe}"`;
}

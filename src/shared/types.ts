export type UserRole = 'STUDENT' | 'ORGANISER';

export type EventCategory =
  | 'Technical'
  | 'Cultural'
  | 'Sports'
  | 'Workshops'
  | 'Hackathons'
  | 'Department Events'
  | 'Seminars'
  | 'Competitions'
  | 'Other';

export type EventPublishStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED';

export type ComputedEventStatus =
  | 'DRAFT'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'FULL'
  | 'OPEN';

export interface AuthUser {
  id: string;
  handle: string;
  displayLabel: string;
  role: UserRole;
  department: string;
  isDemo: boolean;
}

export interface CampusEvent {
  id: string;
  title: string;
  category: EventCategory;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  venue: string;
  shortDescription: string;
  fullDescription: string;
  additionalInstructions: string;
  registrationDeadline: string; // YYYY-MM-DD or ''
  maxCapacity: number;
  isFree: boolean;
  feeAmount: number;
  bannerUrl: string;
  organiserId: string;
  organiserLabel: string;
  status: EventPublishStatus;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  // Computed from real DB records
  registeredCount: number;
  interestedCount: number;
  remainingSeats: number;
  computedStatus: ComputedEventStatus;
  isRegisteredByMe?: boolean;
  isInterestedByMe?: boolean;
}

export interface EventRegistrationRecord {
  id: string;
  eventId: string;
  studentId: string;
  studentLabel: string;
  department: string;
  status: 'REGISTERED' | 'CANCELLED';
  registeredAt: string;
}

export type NotificationType =
  | 'NEW_EVENT'
  | 'REGISTRATION_CONFIRMED'
  | 'EVENT_UPDATED'
  | 'EVENT_CANCELLED'
  | 'REMINDER_EXAMPLE';

export interface CampusNotification {
  id: string;
  userId: string | null;
  targetRole: 'ALL' | UserRole;
  type: NotificationType;
  title: string;
  message: string;
  eventId: string | null;
  isSimulated: boolean;
  isRead: boolean;
  createdAt: string;
}

export interface UserPreferences {
  userId: string;
  preferredCategories: EventCategory[];
  viewedEventIds: string[];
  digestEnabled: boolean;
  updatedAt: string;
}

export interface EventRecommendation {
  eventId: string;
  reason: string;
  score: number;
}

export interface RecommendationsResponse {
  recommendations: EventRecommendation[];
  source: 'gemini' | 'preference-fallback';
  fallbackReason?: string;
  groundingSummary: string;
}

export interface EventFilters {
  search: string;
  category: 'ALL' | EventCategory;
  dateFilter: 'all' | 'today' | 'week' | 'upcoming' | 'completed';
  priceFilter: 'all' | 'free' | 'paid';
}

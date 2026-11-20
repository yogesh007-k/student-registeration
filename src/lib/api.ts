import type {
  AuthUser,
  CampusEvent,
  CampusNotification,
  EventCategory,
  EventRegistrationRecord,
  RecommendationsResponse,
  UserPreferences,
  UserRole,
} from '../shared/types';

let inMemoryToken: string | null = null;

export function setInMemoryToken(token: string | null): void {
  inMemoryToken = token;
}

export function getInMemoryToken(): string | null {
  return inMemoryToken;
}

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;

  constructor(message: string, status: number, fieldErrors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('X-Requested-With', 'CampusConnect');
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (inMemoryToken) {
    headers.set('Authorization', `Bearer ${inMemoryToken}`);
  }

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  });

  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    if (contentType.includes('application/json')) {
      const data = (await res.json()) as {
        error?: string;
        fieldErrors?: Record<string, string>;
      };
      throw new ApiError(
        data.error || `Request failed (${res.status})`,
        res.status,
        data.fieldErrors
      );
    }
    throw new ApiError(`Request failed (${res.status})`, res.status);
  }

  if (contentType.includes('application/json')) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}

export const api = {
  getSession: () =>
    request<{ user: AuthUser | null; token: string | null }>('/api/auth/session'),

  login: (payload: { handle: string; password: string; role?: UserRole }) =>
    request<{ user: AuthUser; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  demoLogin: (handle: string) =>
    request<{ user: AuthUser; token: string }>('/api/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ handle }),
    }),

  registerAccount: (payload: {
    handle: string;
    role: UserRole;
    department: string;
    password: string;
  }) =>
    request<{ user: AuthUser; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  listEvents: () => request<{ events: CampusEvent[] }>('/api/events'),

  listOrganiserEvents: () =>
    request<{ events: CampusEvent[] }>('/api/organiser/events'),

  getEvent: (id: string) =>
    request<{ event: CampusEvent }>(`/api/events/${encodeURIComponent(id)}`),

  createEvent: (payload: Record<string, unknown>) =>
    request<{ event: CampusEvent }>('/api/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateEvent: (id: string, payload: Record<string, unknown>) =>
    request<{ event: CampusEvent }>(`/api/events/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteEvent: (id: string) =>
    request<{ ok: boolean }>(`/api/events/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  registerForEvent: (id: string) =>
    request<{ event: CampusEvent }>(
      `/api/events/${encodeURIComponent(id)}/register`,
      { method: 'POST' }
    ),

  cancelRegistration: (id: string) =>
    request<{ event: CampusEvent }>(
      `/api/events/${encodeURIComponent(id)}/register`,
      { method: 'DELETE' }
    ),

  setInterest: (id: string, interested: boolean) =>
    request<{ event: CampusEvent }>(
      `/api/events/${encodeURIComponent(id)}/interest`,
      {
        method: 'POST',
        body: JSON.stringify({ interested }),
      }
    ),

  getEventRegistrations: (id: string) =>
    request<{ event: CampusEvent; registrations: EventRegistrationRecord[] }>(
      `/api/events/${encodeURIComponent(id)}/registrations`
    ),

  downloadRegistrationsCsv: async (id: string) => {
    const headers = new Headers();
    headers.set('X-Requested-With', 'CampusConnect');
    if (inMemoryToken) {
      headers.set('Authorization', `Bearer ${inMemoryToken}`);
    }
    const res = await fetch(
      `/api/events/${encodeURIComponent(id)}/registrations/export`,
      { headers, credentials: 'include' }
    );
    if (!res.ok) {
      throw new ApiError('Failed to export registrations CSV.', res.status);
    }
    return await res.text();
  },

  listNotifications: () =>
    request<{ notifications: CampusNotification[] }>('/api/notifications'),

  markNotificationRead: (id: string) =>
    request<{ ok: boolean }>(
      `/api/notifications/${encodeURIComponent(id)}/read`,
      { method: 'POST' }
    ),

  markAllNotificationsRead: () =>
    request<{ ok: boolean }>('/api/notifications/read-all', { method: 'POST' }),

  getPreferences: () =>
    request<{ preferences: UserPreferences }>('/api/preferences'),

  updatePreferences: (payload: {
    preferredCategories: EventCategory[];
    digestEnabled: boolean;
  }) =>
    request<{ preferences: UserPreferences }>('/api/preferences', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  aiGenerateDescription: (payload: {
    title: string;
    category: string;
    basicInfo: string;
    venue?: string;
    date?: string;
  }) =>
    request<{
      shortDescription: string;
      fullDescription: string;
      additionalInstructions: string;
    }>('/api/ai/generate-description', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  aiSuggestCategory: (payload: { title: string; description: string }) =>
    request<{ suggestedCategory: EventCategory; reason: string }>(
      '/api/ai/suggest-category',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  aiSummarizeEvent: (eventId: string) =>
    request<{ oneLineHighlight: string; highlights: string[] }>(
      '/api/ai/summarize-event',
      {
        method: 'POST',
        body: JSON.stringify({ eventId }),
      }
    ),

  aiRecommendations: () =>
    request<RecommendationsResponse>('/api/ai/recommendations'),
};

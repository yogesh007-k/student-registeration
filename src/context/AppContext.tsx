import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, ApiError, setInMemoryToken } from '../lib/api';
import type {
  AuthUser,
  CampusEvent,
  CampusNotification,
  EventCategory,
  RecommendationsResponse,
  UserPreferences,
  UserRole,
} from '../shared/types';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface AppContextValue {
  path: string;
  navigate: (to: string) => void;
  user: AuthUser | null;
  authReady: boolean;
  events: CampusEvent[];
  organiserEvents: CampusEvent[];
  eventsLoading: boolean;
  notifications: CampusNotification[];
  unreadCount: number;
  preferences: UserPreferences | null;
  recommendations: RecommendationsResponse | null;
  recommendationsLoading: boolean;
  toasts: ToastMessage[];
  pushToast: (type: ToastMessage['type'], text: string) => void;
  dismissToast: (id: string) => void;
  login: (handle: string, password: string, role?: UserRole) => Promise<AuthUser>;
  demoLogin: (handle: string) => Promise<AuthUser>;
  registerAccount: (payload: {
    handle: string;
    role: UserRole;
    department: string;
    password: string;
  }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshRecommendations: () => Promise<void>;
  registerForEvent: (eventId: string) => Promise<CampusEvent | null>;
  cancelRegistration: (eventId: string) => Promise<CampusEvent | null>;
  toggleInterest: (eventId: string, interested: boolean) => Promise<CampusEvent | null>;
  savePreferences: (
    preferredCategories: EventCategory[],
    digestEnabled: boolean
  ) => Promise<void>;
  markNotifRead: (id: string) => Promise<void>;
  markAllNotifsRead: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [path, setPath] = useState<string>(() => window.location.pathname || '/');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [organiserEvents, setOrganiserEvents] = useState<CampusEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [notifications, setNotifications] = useState<CampusNotification[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [recommendations, setRecommendations] =
    useState<RecommendationsResponse | null>(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (type: ToastMessage['type'], text: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-1), { id, type, text }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 2800);
    },
    []
  );

  const navigate = useCallback((to: string) => {
    if (to === window.location.pathname) return;
    window.history.pushState({}, '', to);
    setPath(to);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const refreshEvents = useCallback(async (activeUser?: AuthUser | null) => {
    setEventsLoading(true);
    try {
      const res = await api.listEvents();
      setEvents(res.events);
      const targetUser = activeUser !== undefined ? activeUser : user;
      if (targetUser?.role === 'ORGANISER') {
        const orgRes = await api.listOrganiserEvents();
        setOrganiserEvents(orgRes.events);
      } else {
        setOrganiserEvents([]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load events';
      pushToast('error', msg);
    } finally {
      setEventsLoading(false);
    }
  }, [user, pushToast]);

  const refreshNotifications = useCallback(async (activeUser?: AuthUser | null) => {
    const targetUser = activeUser !== undefined ? activeUser : user;
    if (!targetUser) {
      setNotifications([]);
      return;
    }
    try {
      const res = await api.listNotifications();
      setNotifications(res.notifications);
    } catch {
      // silent background fetch failure
    }
  }, [user]);

  const refreshRecommendations = useCallback(async (activeUser?: AuthUser | null) => {
    const targetUser = activeUser !== undefined ? activeUser : user;
    if (!targetUser || targetUser.role !== 'STUDENT') {
      setRecommendations(null);
      return;
    }
    setRecommendationsLoading(true);
    try {
      const res = await api.aiRecommendations();
      setRecommendations(res);
    } catch {
      // ignore
    } finally {
      setRecommendationsLoading(false);
    }
  }, [user]);

  const hydrateUserSessionData = useCallback(
    async (authedUser: AuthUser | null) => {
      await refreshEvents(authedUser);
      if (authedUser) {
        try {
          const [notifRes, prefRes] = await Promise.all([
            api.listNotifications(),
            api.getPreferences(),
          ]);
          setNotifications(notifRes.notifications);
          setPreferences(prefRes.preferences);
        } catch {
          // ignore
        }
        if (authedUser.role === 'STUDENT') {
          void refreshRecommendations(authedUser);
        }
      } else {
        setNotifications([]);
        setPreferences(null);
        setRecommendations(null);
      }
    },
    [refreshEvents, refreshRecommendations]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const session = await api.getSession();
        if (!mounted) return;
        if (session.user && session.token) {
          setInMemoryToken(session.token);
          setUser(session.user);
          await hydrateUserSessionData(session.user);
        } else {
          await hydrateUserSessionData(null);
        }
      } catch {
        if (mounted) await hydrateUserSessionData(null);
      } finally {
        if (mounted) setAuthReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []); // run once on mount

  const login = useCallback(
    async (handle: string, password: string, role?: UserRole) => {
      const res = await api.login({ handle, password, role });
      setInMemoryToken(res.token);
      setUser(res.user);
      await hydrateUserSessionData(res.user);
      pushToast('success', `Signed in as ${res.user.displayLabel}`);
      return res.user;
    },
    [hydrateUserSessionData, pushToast]
  );

  const demoLogin = useCallback(
    async (handle: string) => {
      const res = await api.demoLogin(handle);
      setInMemoryToken(res.token);
      setUser(res.user);
      await hydrateUserSessionData(res.user);
      pushToast('success', `Signed in with demo account ${res.user.handle}`);
      return res.user;
    },
    [hydrateUserSessionData, pushToast]
  );

  const registerAccount = useCallback(
    async (payload: {
      handle: string;
      role: UserRole;
      department: string;
      password: string;
    }) => {
      const res = await api.registerAccount(payload);
      setInMemoryToken(res.token);
      setUser(res.user);
      await hydrateUserSessionData(res.user);
      pushToast('success', `Account ${res.user.handle} created and signed in.`);
      return res.user;
    },
    [hydrateUserSessionData, pushToast]
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // continue local cleanup
    }
    setInMemoryToken(null);
    setUser(null);
    setOrganiserEvents([]);
    setNotifications([]);
    setPreferences(null);
    setRecommendations(null);
    navigate('/');
    await refreshEvents(null);
    pushToast('info', 'Signed out cleanly.');
  }, [navigate, pushToast, refreshEvents]);

  const registerForEvent = useCallback(
    async (eventId: string) => {
      try {
        const res = await api.registerForEvent(eventId);
        setEvents((prev) => prev.map((e) => (e.id === eventId ? res.event : e)));
        await refreshNotifications();
        void refreshRecommendations();
        pushToast('success', `Seat confirmed for "${res.event.title}".`);
        return res.event;
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : 'Unable to register for event.';
        pushToast('error', msg);
        return null;
      }
    },
    [pushToast, refreshNotifications, refreshRecommendations]
  );

  const cancelRegistration = useCallback(
    async (eventId: string) => {
      try {
        const res = await api.cancelRegistration(eventId);
        setEvents((prev) => prev.map((e) => (e.id === eventId ? res.event : e)));
        void refreshRecommendations();
        pushToast('info', `Registration cancelled for "${res.event.title}".`);
        return res.event;
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : 'Unable to cancel registration.';
        pushToast('error', msg);
        return null;
      }
    },
    [pushToast, refreshRecommendations]
  );

  const toggleInterest = useCallback(
    async (eventId: string, interested: boolean) => {
      try {
        const res = await api.setInterest(eventId, interested);
        setEvents((prev) => prev.map((e) => (e.id === eventId ? res.event : e)));
        void refreshRecommendations();
        pushToast(
          'info',
          interested
            ? `Saved "${res.event.title}" to Interested.`
            : `Removed "${res.event.title}" from Interested.`
        );
        return res.event;
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : 'Unable to update interest.';
        pushToast('error', msg);
        return null;
      }
    },
    [pushToast, refreshRecommendations]
  );

  const savePreferences = useCallback(
    async (preferredCategories: EventCategory[], digestEnabled: boolean) => {
      const res = await api.updatePreferences({
        preferredCategories,
        digestEnabled,
      });
      setPreferences(res.preferences);
      pushToast('success', 'Preferences saved.');
      if (user?.role === 'STUDENT') {
        void refreshRecommendations(user);
      }
    },
    [pushToast, refreshRecommendations, user]
  );

  const markNotifRead = useCallback(async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }, []);

  const markAllNotifsRead = useCallback(async () => {
    await api.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <AppContext.Provider
      value={{
        path,
        navigate,
        user,
        authReady,
        events,
        organiserEvents,
        eventsLoading,
        notifications,
        unreadCount,
        preferences,
        recommendations,
        recommendationsLoading,
        toasts,
        pushToast,
        dismissToast,
        login,
        demoLogin,
        registerAccount,
        logout,
        refreshEvents: () => refreshEvents(),
        refreshNotifications: () => refreshNotifications(),
        refreshRecommendations: () => refreshRecommendations(),
        registerForEvent,
        cancelRegistration,
        toggleInterest,
        savePreferences,
        markNotifRead,
        markAllNotifsRead,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

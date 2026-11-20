import React from 'react';
import { X } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { EventDiscoveryPage } from './pages/EventDiscoveryPage';
import { EventDetailsPage } from './pages/EventDetailsPage';
import { MyRegistrationsPage } from './pages/MyRegistrationsPage';
import { MyInterestsPage } from './pages/MyInterestsPage';
import { OrganiserDashboard } from './pages/OrganiserDashboard';
import { CreateEventPage } from './pages/CreateEventPage';
import { EditEventPage } from './pages/EditEventPage';
import { RegistrationManagementPage } from './pages/RegistrationManagementPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePreferencesPage } from './pages/ProfilePreferencesPage';

function AppShell() {
  const { path, authReady, toasts, dismissToast, navigate } = useApp();

  const renderRoute = () => {
    const cleanPath = path.replace(/\/+$/, '') || '/';

    if (cleanPath === '/') return <LandingPage />;
    if (cleanPath === '/login') return <LoginPage />;
    if (cleanPath === '/student') return <StudentDashboard />;
    if (cleanPath === '/discover') return <EventDiscoveryPage />;
    if (cleanPath === '/registrations') return <MyRegistrationsPage />;
    if (cleanPath === '/interests') return <MyInterestsPage />;
    if (cleanPath === '/organiser') return <OrganiserDashboard />;
    if (cleanPath === '/organiser/events/new') return <CreateEventPage />;
    if (cleanPath === '/notifications') return <NotificationsPage />;
    if (cleanPath === '/profile') return <ProfilePreferencesPage />;

    const editMatch = cleanPath.match(/^\/organiser\/events\/([^/]+)\/edit$/);
    if (editMatch) {
      return <EditEventPage eventId={decodeURIComponent(editMatch[1])} />;
    }

    const regsMatch = cleanPath.match(
      /^\/organiser\/events\/([^/]+)\/registrations$/
    );
    if (regsMatch) {
      return (
        <RegistrationManagementPage eventId={decodeURIComponent(regsMatch[1])} />
      );
    }

    const detailMatch = cleanPath.match(/^\/events\/([^/]+)$/);
    if (detailMatch) {
      return <EventDetailsPage eventId={decodeURIComponent(detailMatch[1])} />;
    }

    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-bold text-[#F8FAFC]">
          Page Not Found
        </h1>
        <p className="mt-2 text-sm text-[#A1A1AA]">
          The requested route does not exist on CampusConnect AI.
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-6 min-h-[42px] rounded-lg bg-[#8B5CF6] px-5 py-2 text-sm font-semibold text-white"
        >
          Return Home
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#090816] text-[#F8FAFC]">
      <Navbar />
      <main>
        {!authReady ? (
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="h-64 animate-pulse rounded-xl border border-white/10 bg-[#15132A]" />
          </div>
        ) : (
          renderRoute()
        )}
      </main>

      {/* Accessible Toast Stack */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 left-4 right-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:max-w-sm"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex w-full sm:w-auto items-start justify-between gap-3 rounded-xl border px-4 py-3 text-xs font-medium shadow-lg backdrop-blur-md ${
              toast.type === 'error'
                ? 'border-rose-500/40 bg-[#1B1224] text-rose-200'
                : toast.type === 'success'
                  ? 'border-emerald-500/40 bg-[#111E24] text-emerald-200'
                  : 'border-[#8B5CF6]/40 bg-[#15132A] text-[#F8FAFC]'
            }`}
          >
            <span>{toast.text}</span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 text-[#A1A1AA] hover:text-[#F8FAFC]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

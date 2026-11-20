import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function Navbar() {
  const { path, navigate, user, unreadCount, logout } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (to: string) => {
    setMobileOpen(false);
    navigate(to);
  };

  const navItems: Array<{ label: string; to: string }> =
    user?.role === 'ORGANISER'
      ? [
          { label: 'Dashboard', to: '/organiser' },
          { label: 'Create Event', to: '/organiser/events/new' },
          { label: 'Discover', to: '/discover' },
          {
            label: unreadCount > 0 ? `Notifications (${unreadCount})` : 'Notifications',
            to: '/notifications',
          },
          { label: 'Profile', to: '/profile' },
        ]
      : user?.role === 'STUDENT'
        ? [
            { label: 'Dashboard', to: '/student' },
            { label: 'Discover', to: '/discover' },
            { label: 'Registrations', to: '/registrations' },
            { label: 'Interests', to: '/interests' },
            {
              label: unreadCount > 0 ? `Alerts (${unreadCount})` : 'Notifications',
              to: '/notifications',
            },
          ]
        : [
            { label: 'Overview', to: '/' },
            { label: 'Discover Events', to: '/discover' },
            { label: 'Demo Access', to: '/login' },
          ];

  const isActive = (to: string) =>
    to === '/' ? path === '/' : path === to || path.startsWith(`${to}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#090816]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleNav(
              user?.role === 'ORGANISER'
                ? '/organiser'
                : user?.role === 'STUDENT'
                  ? '/student'
                  : '/'
            );
          }}
          className="font-display text-lg font-bold tracking-tight text-[#F8FAFC] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#38DDF8]"
        >
          CampusConnect <span className="text-[#A78BFA]">AI</span>
        </a>

        {/* Zone 2: Clean single-line text nav links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium"
        >
          {navItems.map((item) => (
            <a
              key={item.to}
              href={item.to}
              onClick={(e) => {
                e.preventDefault();
                handleNav(item.to);
              }}
              className={`whitespace-nowrap shrink-0 py-1 transition-colors border-b-2 ${
                isActive(item.to)
                  ? 'border-[#8B5CF6] text-[#F8FAFC]'
                  : 'border-transparent text-[#A1A1AA] hover:text-[#F8FAFC]'
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: Single primary action / account control */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <div className="hidden md:flex items-center gap-4">
              {user.role === 'STUDENT' && (
                <button
                  type="button"
                  onClick={() => handleNav('/profile')}
                  className="text-xs font-mono text-[#A1A1AA] hover:text-[#F8FAFC] transition-colors whitespace-nowrap shrink-0"
                >
                  {user.handle}
                </button>
              )}
              <button
                type="button"
                onClick={() => void logout()}
                className="rounded-lg border border-white/15 bg-[#15132A] px-4 py-2 text-xs font-semibold text-[#F8FAFC] hover:border-[#8B5CF6]/60 hover:bg-[#1B1836] transition-colors whitespace-nowrap shrink-0"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleNav('/login')}
              className="hidden md:inline-flex rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7C3AED] transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 bg-[#15132A] text-[#F8FAFC]"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#15132A] px-4 py-4">
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            {navItems.map((item) => (
              <a
                key={item.to}
                href={item.to}
                onClick={(e) => {
                  e.preventDefault();
                  handleNav(item.to);
                }}
                className={`flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium ${
                  isActive(item.to)
                    ? 'bg-[#8B5CF6]/20 text-[#F8FAFC]'
                    : 'text-[#A1A1AA] hover:bg-white/5 hover:text-[#F8FAFC]'
                }`}
              >
                {item.label}
              </a>
            ))}
            {user?.role === 'STUDENT' && (
              <a
                href="/profile"
                onClick={(e) => {
                  e.preventDefault();
                  handleNav('/profile');
                }}
                className="flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium text-[#A1A1AA] hover:bg-white/5 hover:text-[#F8FAFC]"
              >
                Profile & Preferences ({user.handle})
              </a>
            )}
          </nav>

          <div className="mt-3 border-t border-white/10 pt-3">
            {user ? (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  void logout();
                }}
                className="w-full min-h-[44px] rounded-lg border border-white/15 bg-[#090816] px-4 py-2 text-sm font-semibold text-[#F8FAFC]"
              >
                Sign Out ({user.handle})
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleNav('/login')}
                className="w-full min-h-[44px] rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-semibold text-white"
              >
                Sign In / Demo Login
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

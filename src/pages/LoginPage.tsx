import React, { useState } from 'react';
import { ShieldCheck, UserCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ApiError } from '../lib/api';
import type { UserRole } from '../shared/types';

export function LoginPage() {
  const { demoLogin, login, registerAccount, navigate } = useApp();
  const [selectedRole, setSelectedRole] = useState<UserRole>('STUDENT');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [busyHandle, setBusyHandle] = useState<string | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDemo = async (demoHandle: string) => {
    setError(null);
    setBusyHandle(demoHandle);
    try {
      const loggedIn = await demoLogin(demoHandle);
      navigate(loggedIn.role === 'ORGANISER' ? '/organiser' : '/student');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo login failed.');
    } finally {
      setBusyHandle(null);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFormBusy(true);
    try {
      const authed =
        authMode === 'login'
          ? await login(handle, password, selectedRole)
          : await registerAccount({
              handle,
              role: selectedRole,
              department,
              password,
            });
      navigate(authed.role === 'ORGANISER' ? '/organiser' : '/student');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Authentication failed.');
      }
    } finally {
      setFormBusy(false);
    }
  };

  const demoStudents = [
    { handle: 'STU001', track: 'Computer Science & AI', note: 'Pre-registered for Web Bootcamp' },
    { handle: 'STU002', track: 'Robotics Engineering', note: 'Active participant across 4 events' },
    { handle: 'STU003', track: 'Digital Arts & Design', note: 'Cold-start preferences state' },
  ];

  const demoOrganisers = [
    { handle: 'ORG001', track: 'Tech & Innovation Guild', note: 'Manages Hackathon, AI Workshop & Drafts' },
    { handle: 'ORG002', track: 'Cultural & Athletics Board', note: 'Manages Cultural Fest & Sports Meet' },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-xs font-medium text-[#38DDF8]">
          Fictional Demo Credentials · Zero Personal Data Required
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[#F8FAFC]">
          Sign In to CampusConnect AI
        </h1>
        <p className="mt-2 text-sm text-[#A1A1AA]">
          Choose a role below for instant hackathon demonstration login, or sign in with any fictional STU / ORG campus handle.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
        >
          {error}
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        {/* Left: Instant Hackathon Demo Accounts */}
        <section className="space-y-6 lg:col-span-6">
          <div className="rounded-xl border border-white/10 bg-[#15132A] p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#F8FAFC]">
              <UserCheck className="h-4 w-4 text-[#38DDF8]" />
              <h2>Demo Student Accounts</h2>
            </div>
            <p className="mt-1 text-xs text-[#A1A1AA]">
              Discover events, register for seats, save interests, and test personalized AI recommendations.
            </p>
            <div className="mt-4 space-y-2.5">
              {demoStudents.map((stu) => (
                <div
                  key={stu.handle}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#090816] px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-sm font-semibold text-[#F8FAFC]">
                      {stu.handle}
                    </div>
                    <div className="truncate text-xs text-[#A1A1AA]">
                      {stu.track} · {stu.note}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busyHandle !== null}
                    onClick={() => void handleDemo(stu.handle)}
                    className="min-h-[40px] shrink-0 rounded-lg bg-[#8B5CF6] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#7C3AED] disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    {busyHandle === stu.handle ? 'Signing in...' : `Use ${stu.handle}`}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#15132A] p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#F8FAFC]">
              <ShieldCheck className="h-4 w-4 text-[#A78BFA]" />
              <h2>Demo Organiser Accounts</h2>
            </div>
            <p className="mt-1 text-xs text-[#A1A1AA]">
              Create & publish events with Gemini AI, manage seat capacity, and export student registration lists.
            </p>
            <div className="mt-4 space-y-2.5">
              {demoOrganisers.map((org) => (
                <div
                  key={org.handle}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#090816] px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-sm font-semibold text-[#F8FAFC]">
                      {org.handle}
                    </div>
                    <div className="truncate text-xs text-[#A1A1AA]">
                      {org.track} · {org.note}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busyHandle !== null}
                    onClick={() => void handleDemo(org.handle)}
                    className="min-h-[40px] shrink-0 rounded-lg border border-[#A78BFA]/50 bg-[#15132A] px-3.5 py-2 text-xs font-semibold text-[#F8FAFC] hover:bg-[#8B5CF6] hover:border-[#8B5CF6] disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    {busyHandle === org.handle ? 'Signing in...' : `Use ${org.handle}`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right: Role Selection + Handle Login / Registration */}
        <section className="rounded-xl border border-white/10 bg-[#15132A] p-6 lg:col-span-6">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
            <h2 className="font-display text-lg font-semibold text-[#F8FAFC]">
              {authMode === 'login' ? 'Sign In with Handle' : 'Create Fictional Handle'}
            </h2>
            <div className="flex rounded-lg border border-white/10 bg-[#090816] p-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setError(null);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  authMode === 'login'
                    ? 'bg-[#8B5CF6] text-white'
                    : 'text-[#A1A1AA] hover:text-[#F8FAFC]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setError(null);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  authMode === 'register'
                    ? 'bg-[#8B5CF6] text-white'
                    : 'text-[#A1A1AA] hover:text-[#F8FAFC]'
                }`}
              >
                Register
              </button>
            </div>
          </div>

          {/* Role Toggle */}
          <div className="mt-5">
            <span className="block text-xs font-semibold text-[#A1A1AA]">
              Select Role
            </span>
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-[#090816] p-1">
              <button
                type="button"
                onClick={() => setSelectedRole('STUDENT')}
                className={`min-h-[40px] rounded-md text-xs font-semibold transition-colors ${
                  selectedRole === 'STUDENT'
                    ? 'bg-[#8B5CF6] text-white'
                    : 'text-[#A1A1AA] hover:text-[#F8FAFC]'
                }`}
              >
                STUDENT
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('ORGANISER')}
                className={`min-h-[40px] rounded-md text-xs font-semibold transition-colors ${
                  selectedRole === 'ORGANISER'
                    ? 'bg-[#8B5CF6] text-white'
                    : 'text-[#A1A1AA] hover:text-[#F8FAFC]'
                }`}
              >
                ORGANISER
              </button>
            </div>
          </div>

          <form onSubmit={(e) => void handleFormSubmit(e)} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="auth-handle"
                className="block text-xs font-semibold text-[#F8FAFC]"
              >
                Fictional Identifier Handle
              </label>
              <input
                id="auth-handle"
                type="text"
                required
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder={
                  selectedRole === 'STUDENT' ? 'e.g., STU001 or STU104' : 'e.g., ORG001 or ORG009'
                }
                className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#090816] px-3.5 py-2.5 text-sm font-mono uppercase text-[#F8FAFC] placeholder:normal-case placeholder:text-[#A1A1AA]/60 focus:border-[#8B5CF6] focus:outline-none"
              />
              <p className="mt-1 text-xs text-[#A1A1AA]">
                Never enter real names, email addresses, or phone numbers. Demo passcode: <span className="font-mono text-[#F8FAFC]">campus2026</span>
              </p>
            </div>

            {authMode === 'register' && (
              <div>
                <label
                  htmlFor="auth-department"
                  className="block text-xs font-semibold text-[#F8FAFC]"
                >
                  {selectedRole === 'STUDENT' ? 'Academic Track / Department' : 'Society / Council Name'}
                </label>
                <input
                  id="auth-department"
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder={
                    selectedRole === 'STUDENT'
                      ? 'e.g., Computer Science'
                      : 'e.g., Robotics Society'
                  }
                  className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#090816] px-3.5 py-2.5 text-sm text-[#F8FAFC] focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="auth-passcode"
                className="block text-xs font-semibold text-[#F8FAFC]"
              >
                Passcode
              </label>
              <input
                id="auth-passcode"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter passcode"
                className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#090816] px-3.5 py-2.5 text-sm text-[#F8FAFC] focus:border-[#8B5CF6] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={formBusy}
              className="min-h-[44px] w-full rounded-lg bg-[#8B5CF6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#7C3AED] disabled:opacity-50 transition-colors"
            >
              {formBusy
                ? 'Authenticating...'
                : authMode === 'login'
                  ? `Sign In as ${selectedRole}`
                  : `Create ${selectedRole} Handle`}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

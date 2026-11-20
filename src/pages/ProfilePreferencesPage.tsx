import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EVENT_CATEGORIES } from '../shared/eventLogic';
import type { EventCategory } from '../shared/types';

export function ProfilePreferencesPage() {
  const { user, preferences, savePreferences, navigate } = useApp();
  const [selectedCats, setSelectedCats] = useState<EventCategory[]>(
    preferences?.preferredCategories ?? []
  );
  const [digestEnabled, setDigestEnabled] = useState<boolean>(
    preferences?.digestEnabled ?? false
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (preferences) {
      setSelectedCats(preferences.preferredCategories);
      setDigestEnabled(preferences.digestEnabled);
    }
  }, [preferences]);

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-[#F8FAFC]">
          Profile & Preferences
        </h1>
        <p className="mt-2 text-sm text-[#A1A1AA]">
          Sign in to configure your event category interests and notification preferences.
        </p>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="mt-6 min-h-[42px] rounded-lg bg-[#8B5CF6] px-5 py-2 text-sm font-semibold text-white"
        >
          Sign In
        </button>
      </div>
    );
  }

  const toggleCategory = (cat: EventCategory) => {
    setSelectedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await savePreferences(selectedCats, digestEnabled);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-white/10 pb-6">
        <h1 className="font-display text-3xl font-bold text-[#F8FAFC]">
          Profile & Preferences
        </h1>
        <p className="mt-1 text-sm text-[#A1A1AA]">
          Manage your fictional campus identifier settings and recommendation categories.
        </p>
      </div>

      {/* Account Identity Card (Dummy Data Only) */}
      <section className="mt-6 rounded-xl border border-white/10 bg-[#15132A] p-6">
        <h2 className="font-display text-lg font-semibold text-[#F8FAFC]">
          Campus Identifier Summary
        </h2>
        <p className="mt-1 text-xs text-[#A1A1AA]">
          CampusConnect AI stores fictional handles only—no real names, phone numbers, or email addresses.
        </p>

        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-[#090816] p-4">
            <dt className="text-xs text-[#A1A1AA]">Handle</dt>
            <dd className="mt-1 font-mono text-base font-semibold text-[#F8FAFC]">
              {user.handle}
            </dd>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#090816] p-4">
            <dt className="text-xs text-[#A1A1AA]">Role</dt>
            <dd className="mt-1 font-mono text-base font-semibold text-[#38DDF8]">
              {user.role}
            </dd>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#090816] p-4">
            <dt className="text-xs text-[#A1A1AA]">Department / Track</dt>
            <dd className="mt-1 text-sm font-medium text-[#F8FAFC]">
              {user.department}
            </dd>
          </div>
        </dl>
      </section>

      {/* Preferences Form */}
      <form
        onSubmit={(e) => void handleSave(e)}
        className="mt-6 rounded-xl border border-white/10 bg-[#15132A] p-6 space-y-6"
      >
        <div>
          <h2 className="font-display text-lg font-semibold text-[#F8FAFC]">
            Preferred Event Categories
          </h2>
          <p className="mt-1 text-xs text-[#A1A1AA]">
            Select categories you want Gemini AI and the Student Dashboard to prioritize for you.
          </p>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
            {EVENT_CATEGORIES.map((cat) => {
              const active = selectedCats.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleCategory(cat)}
                  className={`flex min-h-[44px] items-center justify-between rounded-lg border px-4 py-2 text-xs font-semibold transition-colors ${
                    active
                      ? 'border-[#8B5CF6] bg-[#8B5CF6]/20 text-[#F8FAFC]'
                      : 'border-white/10 bg-[#090816] text-[#A1A1AA] hover:text-[#F8FAFC]'
                  }`}
                >
                  <span>{cat}</span>
                  {active && <Check className="h-4 w-4 text-[#38DDF8]" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-white/10 pt-5">
          <label className="flex min-h-[40px] items-center gap-3 text-sm text-[#F8FAFC] cursor-pointer">
            <input
              type="checkbox"
              checked={digestEnabled}
              onChange={(e) => setDigestEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-[#090816] accent-[#8B5CF6]"
            />
            <span>Enable in-app weekly event digest highlights</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-5">
          <button
            type="submit"
            disabled={saving}
            className="min-h-[44px] rounded-lg bg-[#8B5CF6] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#7C3AED] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
}

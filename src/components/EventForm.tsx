import React, { useState } from 'react';
import { Sparkles, Eye, X, Trash2 } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import {
  ALLOWED_BANNER_PRESETS,
  EVENT_CATEGORIES,
  defaultBannerForCategory,
  formatLocalDateISO,
} from '../shared/eventLogic';
import type { CampusEvent, EventCategory, EventPublishStatus } from '../shared/types';

export interface EventFormValues {
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
  maxCapacity: string;
  isFree: boolean;
  feeAmount: string;
  bannerUrl: string;
  isFeatured: boolean;
}

interface EventFormProps {
  mode: 'create' | 'edit';
  initialEvent?: CampusEvent;
  onSubmit: (payload: Record<string, unknown>, targetStatus: EventPublishStatus) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
}

export function EventForm({
  mode,
  initialEvent,
  onSubmit,
  onDelete,
  onCancel,
}: EventFormProps) {
  const defaultDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return formatLocalDateISO(d);
  })();

  const [values, setValues] = useState<EventFormValues>({
    title: initialEvent?.title ?? '',
    category: initialEvent?.category ?? 'Technical',
    date: initialEvent?.date ?? defaultDate,
    startTime: initialEvent?.startTime ?? '14:00',
    endTime: initialEvent?.endTime ?? '16:30',
    venue: initialEvent?.venue ?? '',
    shortDescription: initialEvent?.shortDescription ?? '',
    fullDescription: initialEvent?.fullDescription ?? '',
    additionalInstructions: initialEvent?.additionalInstructions ?? '',
    registrationDeadline: initialEvent?.registrationDeadline ?? '',
    maxCapacity: String(initialEvent?.maxCapacity ?? 50),
    isFree: initialEvent ? initialEvent.isFree : true,
    feeAmount: String(initialEvent?.feeAmount ?? 10),
    bannerUrl: initialEvent?.bannerUrl ?? defaultBannerForCategory('Technical'),
    isFeatured: initialEvent?.isFeatured ?? false,
  });

  const [aiNotes, setAiNotes] = useState('');
  const [aiDescLoading, setAiDescLoading] = useState(false);
  const [aiCatLoading, setAiCatLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateField = <K extends keyof EventFormValues>(
    key: K,
    val: EventFormValues[K]
  ) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const handleSuggestCategory = async () => {
    setAiFeedback(null);
    setAiCatLoading(true);
    try {
      const res = await api.aiSuggestCategory({
        title: values.title,
        description: values.shortDescription || values.fullDescription || aiNotes,
      });
      updateField('category', res.suggestedCategory);
      setAiFeedback({
        type: 'success',
        message: `Gemini suggested "${res.suggestedCategory}": ${res.reason}`,
      });
    } catch (err) {
      setAiFeedback({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'Unable to suggest category with AI.',
      });
    } finally {
      setAiCatLoading(false);
    }
  };

  const handleGenerateDescription = async () => {
    setAiFeedback(null);
    setAiDescLoading(true);
    try {
      const basicInfo =
        aiNotes.trim() ||
        values.shortDescription.trim() ||
        `${values.category} session at ${values.venue || 'campus'}`;
      const res = await api.aiGenerateDescription({
        title: values.title,
        category: values.category,
        basicInfo,
        venue: values.venue,
        date: values.date,
      });
      setValues((prev) => ({
        ...prev,
        shortDescription: res.shortDescription || prev.shortDescription,
        fullDescription: res.fullDescription || prev.fullDescription,
        additionalInstructions:
          res.additionalInstructions || prev.additionalInstructions,
      }));
      setAiFeedback({
        type: 'success',
        message: 'Gemini generated your short summary, full description, and attendee instructions.',
      });
    } catch (err) {
      setAiFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Unable to generate description with AI.',
      });
    } finally {
      setAiDescLoading(false);
    }
  };

  const submitWithStatus = async (targetStatus: EventPublishStatus) => {
    setFormError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      await onSubmit(
        {
          ...values,
          maxCapacity: Number(values.maxCapacity),
          feeAmount: values.isFree ? 0 : Number(values.feeAmount),
          status: targetStatus,
        },
        targetStatus
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
        if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      } else {
        setFormError('Failed to save event.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const bannerLabels = [
    'Innovation Atrium',
    'Coding Hackathon',
    'AI & CS Seminar',
    'Cultural Amphitheater',
    'Robotics Arena',
  ];

  return (
    <div className="space-y-6">
      {formError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
        >
          {formError}
        </div>
      )}

      {/* Gemini AI Assistant Section */}
      <section className="rounded-xl border border-[#8B5CF6]/35 bg-[#15132A] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-[#F8FAFC] flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#38DDF8]" />
              <span>Gemini Event Copy & Category Assistant</span>
            </h2>
            <p className="mt-1 text-xs text-[#A1A1AA]">
              Enter a title and brief bullet notes below to auto-suggest the category or draft full event copy.
            </p>
          </div>
          <button
            type="button"
            disabled={aiCatLoading || !values.title.trim()}
            onClick={() => void handleSuggestCategory()}
            className="min-h-[40px] rounded-lg border border-[#38DDF8]/40 bg-[#090816] px-3.5 py-2 text-xs font-semibold text-[#38DDF8] hover:bg-[#38DDF8]/10 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {aiCatLoading ? 'Analyzing...' : 'Suggest Category with AI'}
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            aria-label="Brief notes for AI description generator"
            value={aiNotes}
            onChange={(e) => setAiNotes(e.target.value)}
            placeholder="e.g., Hands-on intro to campus robotics, sensor calibration, open to beginners"
            className="flex-1 rounded-lg border border-white/15 bg-[#090816] px-3.5 py-2.5 text-sm text-[#F8FAFC] placeholder:text-[#A1A1AA]/60 focus:border-[#8B5CF6] focus:outline-none"
          />
          <button
            type="button"
            disabled={aiDescLoading || !values.title.trim()}
            onClick={() => void handleGenerateDescription()}
            className="min-h-[40px] rounded-lg bg-[#8B5CF6] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#7C3AED] disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {aiDescLoading ? 'Generating...' : 'Generate Description with AI'}
          </button>
        </div>

        {aiFeedback && (
          <p
            className={`mt-3 text-xs ${
              aiFeedback.type === 'success' ? 'text-emerald-300' : 'text-amber-300'
            }`}
          >
            {aiFeedback.message}
          </p>
        )}
      </section>

      {/* Main Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submitWithStatus('PUBLISHED');
        }}
        className="space-y-6 rounded-xl border border-white/10 bg-[#15132A] p-6"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label
              htmlFor="evt-title"
              className="block text-xs font-semibold text-[#F8FAFC]"
            >
              Event Title <span className="text-rose-400">*</span>
            </label>
            <input
              id="evt-title"
              type="text"
              required
              value={values.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="e.g., Quantum Computing Colloquium"
              className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#090816] px-3.5 py-2.5 text-sm text-[#F8FAFC] focus:border-[#8B5CF6] focus:outline-none"
            />
            {fieldErrors.title && (
              <p className="mt-1 text-xs text-rose-400">{fieldErrors.title}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="evt-category"
              className="block text-xs font-semibold text-[#F8FAFC]"
            >
              Category <span className="text-rose-400">*</span>
            </label>
            <select
              id="evt-category"
              value={values.category}
              onChange={(e) => {
                const cat = e.target.value as EventCategory;
                updateField('category', cat);
                if (mode === 'create') {
                  updateField('bannerUrl', defaultBannerForCategory(cat));
                }
              }}
              className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#090816] px-3.5 py-2.5 text-sm text-[#F8FAFC] focus:border-[#8B5CF6] focus:outline-none"
            >
              {EVENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {fieldErrors.category && (
              <p className="mt-1 text-xs text-rose-400">{fieldErrors.category}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="evt-venue"
              className="block text-xs font-semibold text-[#F8FAFC]"
            >
              Venue <span className="text-rose-400">*</span>
            </label>
            <input
              id="evt-venue"
              type="text"
              required
              value={values.venue}
              onChange={(e) => updateField('venue', e.target.value)}
              placeholder="e.g., Turing Hall 204"
              className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#090816] px-3.5 py-2.5 text-sm text-[#F8FAFC] focus:border-[#8B5CF6] focus:outline-none"
            />
            {fieldErrors.venue && (
              <p className="mt-1 text-xs text-rose-400">{fieldErrors.venue}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="evt-date"
              className="block text-xs font-semibold text-[#F8FAFC]"
            >
              Event Date <span className="text-rose-400">*</span>
            </label>
            <input
              id="evt-date"
              type="date"
              required
              value={values.date}
              onChange={(e) => updateField('date', e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#090816] px-3.5 py-2.5 text-sm font-mono text-[#F8FAFC] focus:border-[#8B5CF6] focus:outline-none"
            />
            {fieldErrors.date && (
              <p className="mt-1 text-xs text-rose-400">{fieldErrors.date}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="evt-start"
                className="block text-xs font-semibold text-[#F8FAFC]"
              >
                Start Time <span className="text-rose-400">*</span>
              </label>
              <input
                id="evt-start"
                type="time"
                required
                value={values.startTime}
                onChange={(e) => updateField('startTime', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#090816] px-3 py-2.5 text-sm font-mono text-[#F8FAFC] focus:border-[#8B5CF6] focus:outline-none"
              />
              {fieldErrors.startTime && (
                <p className="mt-1 text-xs text-rose-400">{fieldErrors.startTime}</p>
              )}
            </div>
            <div>
              <label
                htmlFor="evt-end"
                className="block text-xs font-semibold text-[#F8FAFC]"
              >
                End Time <span className="text-rose-400">*</span>
              </label>
              <input
                id="evt-end"
                type="time"
                required
                value={values.endTime}
                onChange={(e) => updateField('endTime', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#090816] px-3 py-2.5 text-sm font-mono text-[#F8FAFC] focus:border-[#8B5CF6] focus:outline-none"
              />
              {fieldErrors.endTime && (
                <p className="mt-1 text-xs text-rose-400">{fieldErrors.endTime}</p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="evt-capacity"
              className="block text-xs font-semibold text-[#F8FAFC]"
            >
              Maximum Capacity <span className="text-rose-400">*</span>
            </label>
            <input
              id="evt-capacity"
              type="number"
              min={1}
              max={10000}
              required
              value={values.maxCapacity}
              onChange={(e) => updateField('maxCapacity', e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#090816] px-3.5 py-2.5 text-sm font-mono tabular-nums text-[#F8FAFC] focus:border-[#8B5CF6] focus:outline-none"
            />
            {fieldErrors.maxCapacity && (
              <p className="mt-1 text-xs text-rose-400">{fieldErrors.maxCapacity}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="evt-deadline"
              className="block text-xs font-semibold text-[#F8FAFC]"
            >
              Registration Deadline (optional)
            </label>
            <input
              id="evt-deadline"
              type="date"
              value={values.registrationDeadline}
              onChange={(e) => updateField('registrationDeadline', e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#090816] px-3.5 py-2.5 text-sm font-mono text-[#F8FAFC] focus:border-[#8B5CF6] focus:outline-none"
            />
            {fieldErrors.registrationDeadline && (
              <p className="mt-1 text-xs text-rose-400">
                {fieldErrors.registrationDeadline}
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="evt-short-desc"
              className="block text-xs font-semibold text-[#F8FAFC]"
            >
              Short Description <span className="text-rose-400">*</span>
            </label>
            <textarea
              id="evt-short-desc"
              rows={2}
              required
              maxLength={320}
              value={values.shortDescription}
              onChange={(e) => updateField('shortDescription', e.target.value)}
              placeholder="Concise 1-2 sentence overview shown on discovery cards."
              className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#090816] px-3.5 py-2.5 text-sm text-[#F8FAFC] focus:border-[#8B5CF6] focus:outline-none"
            />
            {fieldErrors.shortDescription && (
              <p className="mt-1 text-xs text-rose-400">
                {fieldErrors.shortDescription}
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="evt-full-desc"
              className="block text-xs font-semibold text-[#F8FAFC]"
            >
              Full Description (optional — defaults to short description)
            </label>
            <textarea
              id="evt-full-desc"
              rows={4}
              value={values.fullDescription}
              onChange={(e) => updateField('fullDescription', e.target.value)}
              placeholder="Schedule details, speakers, topics covered, and expectations."
              className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#090816] px-3.5 py-2.5 text-sm text-[#F8FAFC] focus:border-[#8B5CF6] focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="evt-instructions"
              className="block text-xs font-semibold text-[#F8FAFC]"
            >
              Additional Instructions (optional)
            </label>
            <input
              id="evt-instructions"
              type="text"
              value={values.additionalInstructions}
              onChange={(e) => updateField('additionalInstructions', e.target.value)}
              placeholder="e.g., Bring student ID and laptop."
              className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#090816] px-3.5 py-2.5 text-sm text-[#F8FAFC] focus:border-[#8B5CF6] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="evt-banner"
              className="block text-xs font-semibold text-[#F8FAFC]"
            >
              Event Banner Preset
            </label>
            <select
              id="evt-banner"
              value={values.bannerUrl}
              onChange={(e) => updateField('bannerUrl', e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#090816] px-3.5 py-2.5 text-sm text-[#F8FAFC] focus:border-[#8B5CF6] focus:outline-none"
            >
              {ALLOWED_BANNER_PRESETS.map((url, idx) => (
                <option key={url} value={url}>
                  {bannerLabels[idx] || `Campus Banner ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <label className="flex min-h-[42px] items-center gap-2 text-xs font-medium text-[#F8FAFC] cursor-pointer">
              <input
                type="checkbox"
                checked={values.isFree}
                onChange={(e) => updateField('isFree', e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-[#090816] accent-[#8B5CF6]"
              />
              <span>Free Entry</span>
            </label>

            {!values.isFree && (
              <div className="w-32">
                <label
                  htmlFor="evt-fee"
                  className="block text-xs font-semibold text-[#F8FAFC]"
                >
                  Fee ($)
                </label>
                <input
                  id="evt-fee"
                  type="number"
                  min={1}
                  value={values.feeAmount}
                  onChange={(e) => updateField('feeAmount', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-[#090816] px-3 py-2 text-sm font-mono text-[#F8FAFC]"
                />
              </div>
            )}

            <label className="flex min-h-[42px] items-center gap-2 text-xs font-medium text-[#F8FAFC] cursor-pointer">
              <input
                type="checkbox"
                checked={values.isFeatured}
                onChange={(e) => updateField('isFeatured', e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-[#090816] accent-[#8B5CF6]"
              />
              <span>Feature on Student Dashboard</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="min-h-[42px] inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#090816] px-4 py-2 text-xs font-semibold text-[#F8FAFC] hover:border-[#38DDF8]/60 transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Preview Event</span>
            </button>

            {mode === 'edit' && onDelete && (
              <>
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="min-h-[42px] inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Event</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void onDelete()}
                      className="min-h-[42px] rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500"
                    >
                      Confirm Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="min-h-[42px] rounded-lg border border-white/15 px-3 py-2 text-xs text-[#A1A1AA]"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[42px] rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-[#A1A1AA] hover:text-[#F8FAFC]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submitWithStatus('DRAFT')}
              className="min-h-[42px] rounded-lg border border-white/20 bg-[#090816] px-4 py-2 text-xs font-semibold text-[#F8FAFC] hover:border-[#A78BFA]/60 disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[42px] rounded-lg bg-[#8B5CF6] px-5 py-2 text-xs font-semibold text-white hover:bg-[#7C3AED] disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Saving...' : 'Publish Event'}
            </button>
          </div>
        </div>
      </form>

      {/* Live Preview Modal */}
      {previewOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Event Preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/15 bg-[#15132A] p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-display text-lg font-semibold text-[#F8FAFC]">
                Student View Preview
              </h3>
              <button
                type="button"
                aria-label="Close preview"
                onClick={() => setPreviewOpen(false)}
                className="rounded-lg p-1.5 text-[#A1A1AA] hover:bg-white/10 hover:text-[#F8FAFC]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-[#090816]">
              <img
                src={values.bannerUrl}
                alt={values.title || 'Event banner preview'}
                referrerPolicy="no-referrer"
                className="aspect-video w-full object-cover"
              />
              <div className="p-5">
                <div className="text-xs text-[#38DDF8]">
                  {values.category} · {values.isFree ? 'Free' : `$${values.feeAmount}`} ·{' '}
                  {values.maxCapacity} seats
                </div>
                <h4 className="mt-2 font-display text-2xl font-bold text-[#F8FAFC]">
                  {values.title || 'Untitled Campus Event'}
                </h4>
                <p className="mt-2 text-xs font-mono text-[#A1A1AA]">
                  {values.date} · {values.startTime}–{values.endTime} ·{' '}
                  {values.venue || 'Venue TBD'}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-[#F8FAFC]/90 whitespace-pre-line">
                  {values.fullDescription ||
                    values.shortDescription ||
                    'Add a description to preview how students will read this event.'}
                </p>
                {values.additionalInstructions && (
                  <p className="mt-4 border-t border-white/10 pt-3 text-xs text-[#A1A1AA]">
                    Attendee Note: {values.additionalInstructions}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

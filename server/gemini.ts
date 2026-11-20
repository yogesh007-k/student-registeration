import { GoogleGenAI, Type } from '@google/genai';
import {
  EVENT_CATEGORIES,
  buildFallbackRecommendations,
  hasEventEnded,
} from '../src/shared/eventLogic.ts';
import type {
  CampusEvent,
  EventCategory,
  RecommendationsResponse,
  UserPreferences,
} from '../src/shared/types.ts';

const GEMINI_MODEL = 'gemini-4-hydrogen';

function getGeminiClient(): GoogleGenAI {
  const apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    const err = new Error(
      'GEMINI_API_KEY is not configured. Add your Gemini API key in Settings > Secrets to enable AI features.'
    ) as Error & { statusCode?: number };
    err.statusCode = 503;
    throw err;
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function generateEventDescriptionWithAI(input: {
  title: string;
  category: string;
  basicInfo: string;
  venue?: string;
  date?: string;
}): Promise<{
  shortDescription: string;
  fullDescription: string;
  additionalInstructions: string;
}> {
  const ai = getGeminiClient();

  const prompt = [
    `Generate professional, clear, student-friendly campus event copy.`,
    `Event Title: ${input.title}`,
    `Category: ${input.category}`,
    input.venue ? `Venue: ${input.venue}` : '',
    input.date ? `Date: ${input.date}` : '',
    `Basic Info / Notes from Organiser: ${input.basicInfo}`,
    `Requirements:`,
    `- shortDescription: 1-2 crisp sentences (120-260 characters) suitable for an event discovery card.`,
    `- fullDescription: 2 concise, well-structured paragraphs describing what attendees will do, learn, or experience.`,
    `- additionalInstructions: 1 practical sentence covering what attendees should bring or arrival check-in guidance.`,
    `Do not invent fake guest names, fake prizes, or unverified sponsors.`,
  ]
    .filter(Boolean)
    .join('\n');

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction:
        'You are an editorial assistant for a university campus events platform. Write concise, engaging, factual campus event descriptions.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          shortDescription: {
            type: Type.STRING,
            description: 'Concise 1-2 sentence event summary under 280 characters.',
          },
          fullDescription: {
            type: Type.STRING,
            description: 'Detailed 2-paragraph event description.',
          },
          additionalInstructions: {
            type: Type.STRING,
            description: 'Practical attendee preparation or arrival note.',
          },
        },
        required: ['shortDescription', 'fullDescription', 'additionalInstructions'],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as {
    shortDescription?: string;
    fullDescription?: string;
    additionalInstructions?: string;
  };

  return {
    shortDescription: (parsed.shortDescription ?? '').slice(0, 310),
    fullDescription: parsed.fullDescription ?? '',
    additionalInstructions: parsed.additionalInstructions ?? '',
  };
}

export async function suggestEventCategoryWithAI(input: {
  title: string;
  description: string;
}): Promise<{
  suggestedCategory: EventCategory;
  reason: string;
}> {
  const ai = getGeminiClient();

  const prompt = `Classify this campus event into exactly one of the allowed categories: ${EVENT_CATEGORIES.join(', ')}.
Title: ${input.title}
Description: ${input.description || '(none provided)'}`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction:
        'Select the single best-matching university event category from the allowed list and explain why in one short sentence.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestedCategory: {
            type: Type.STRING,
            description: `Must be exactly one of: ${EVENT_CATEGORIES.join(', ')}`,
          },
          reason: {
            type: Type.STRING,
            description: 'One concise sentence explaining why this category fits.',
          },
        },
        required: ['suggestedCategory', 'reason'],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as {
    suggestedCategory?: string;
    reason?: string;
  };

  const matched = EVENT_CATEGORIES.find(
    (c) => c.toLowerCase() === (parsed.suggestedCategory ?? '').trim().toLowerCase()
  );

  return {
    suggestedCategory: matched ?? 'Other',
    reason: parsed.reason || 'Matched based on event title and description.',
  };
}

export async function summarizeEventWithAI(input: {
  title: string;
  category: string;
  venue: string;
  date: string;
  startTime: string;
  endTime: string;
  fullDescription: string;
  additionalInstructions: string;
}): Promise<{
  oneLineHighlight: string;
  highlights: string[];
}> {
  const ai = getGeminiClient();

  const prompt = `Summarize this campus event into a crisp overview for busy students.
Title: ${input.title}
Category: ${input.category}
Schedule: ${input.date}, ${input.startTime}-${input.endTime} at ${input.venue}
Description: ${input.fullDescription}
Instructions: ${input.additionalInstructions || 'None'}`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction:
        'Summarize strictly from the provided event text without inventing details. Return 3 short bullet highlights and 1 one-line takeaway.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          oneLineHighlight: {
            type: Type.STRING,
            description: 'Single crisp takeaway sentence.',
          },
          highlights: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '3 concise bullet highlights.',
          },
        },
        required: ['oneLineHighlight', 'highlights'],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as {
    oneLineHighlight?: string;
    highlights?: string[];
  };

  return {
    oneLineHighlight: parsed.oneLineHighlight || input.title,
    highlights: Array.isArray(parsed.highlights) ? parsed.highlights.slice(0, 4) : [],
  };
}

export async function getStudentRecommendations(input: {
  events: CampusEvent[];
  preferences: UserPreferences | null;
  registeredIds: string[];
  interestedIds: string[];
}): Promise<RecommendationsResponse> {
  const now = new Date();
  const candidates = input.events.filter(
    (ev) =>
      ev.status === 'PUBLISHED' &&
      !hasEventEnded(ev, now) &&
      ev.remainingSeats > 0 &&
      !input.registeredIds.includes(ev.id)
  );

  if (candidates.length === 0) {
    return {
      recommendations: [],
      source: 'preference-fallback',
      groundingSummary: 'No open upcoming events available to recommend right now.',
    };
  }

  const preferredCategories = input.preferences?.preferredCategories ?? [];
  const viewedEventIds = input.preferences?.viewedEventIds ?? [];
  const hasPrefs = preferredCategories.length > 0;
  const hasHistory =
    viewedEventIds.length > 0 ||
    input.registeredIds.length > 0 ||
    input.interestedIds.length > 0;

  try {
    const ai = getGeminiClient();

    const eventSummaries = candidates.map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      date: e.date,
      venue: e.venue,
      remainingSeats: e.remainingSeats,
      shortDescription: e.shortDescription,
    }));

    const viewedTitles = input.events
      .filter((e) => viewedEventIds.includes(e.id))
      .map((e) => `${e.title} (${e.category})`);
    const registeredTitles = input.events
      .filter((e) => input.registeredIds.includes(e.id))
      .map((e) => `${e.title} (${e.category})`);
    const interestedTitles = input.events
      .filter((e) => input.interestedIds.includes(e.id))
      .map((e) => `${e.title} (${e.category})`);

    const prompt = `Recommend up to 4 events from the candidate list for this student.
CRITICAL HONESTY RULE:
- Preferred categories selected by student: ${hasPrefs ? preferredCategories.join(', ') : 'NONE SELECTED'}
- Previously viewed events: ${viewedTitles.length > 0 ? viewedTitles.join(', ') : 'NONE'}
- Registered events: ${registeredTitles.length > 0 ? registeredTitles.join(', ') : 'NONE'}
- Interested events: ${interestedTitles.length > 0 ? interestedTitles.join(', ') : 'NONE'}
Never claim a recommendation is based on behavioral history, viewed events, or past registrations if those lists are NONE.

Candidate Events:
${JSON.stringify(eventSummaries)}`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction:
          'You are a campus event recommendation engine. Return only valid event IDs from the candidate list and honest, concise reasons grounded strictly in the provided data.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            groundingSummary: {
              type: Type.STRING,
              description:
                'One sentence stating honestly what inputs drove these recommendations.',
            },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  eventId: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                },
                required: ['eventId', 'reason', 'score'],
              },
            },
          },
          required: ['groundingSummary', 'recommendations'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim()) as {
      groundingSummary?: string;
      recommendations?: Array<{ eventId: string; reason: string; score: number }>;
    };

    const validIds = new Set(candidates.map((c) => c.id));
    const filteredRecs = (parsed.recommendations ?? [])
      .filter((r) => validIds.has(r.eventId))
      .slice(0, 4);

    if (filteredRecs.length > 0) {
      return {
        recommendations: filteredRecs,
        source: 'gemini',
        groundingSummary:
          parsed.groundingSummary ||
          (hasPrefs || hasHistory
            ? 'Recommended by Gemini AI based on your recorded preferences and event activity.'
            : 'Recommended by Gemini AI based on upcoming schedule and open seat availability.'),
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI service unavailable';
    const fallback = buildFallbackRecommendations(
      input.events,
      input.preferences,
      input.registeredIds,
      input.interestedIds
    );
    return {
      recommendations: fallback.recommendations,
      source: 'preference-fallback',
      fallbackReason: message,
      groundingSummary: fallback.groundingSummary,
    };
  }

  const fallback = buildFallbackRecommendations(
    input.events,
    input.preferences,
    input.registeredIds,
    input.interestedIds
  );
  return {
    recommendations: fallback.recommendations,
    source: 'preference-fallback',
    groundingSummary: fallback.groundingSummary,
  };
}

import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { createServer as createViteServer } from 'vite';
import {
  attachAuth,
  clearSessionCookie,
  requireAuth,
  requireRole,
  setSessionCookie,
  signSessionToken,
  type AuthedRequest,
} from './server/auth.ts';
import {
  cancelStudentRegistration,
  createEventRecord,
  createUserAccount,
  deleteEventRecord,
  getEventByIdForViewer,
  getEventRegistrationsForOrganiser,
  getStudentActivityIds,
  getUserPreferences,
  getUserWithHashByHandle,
  listEventsForViewer,
  listNotificationsForUser,
  listOrganiserOwnEvents,
  markAllNotificationsRead,
  markNotificationRead,
  recordViewedEvent,
  registerStudentForEvent,
  setStudentInterest,
  updateEventRecord,
  updateUserPreferences,
  verifyPassword,
} from './server/db.ts';
import {
  generateEventDescriptionWithAI,
  getStudentRecommendations,
  suggestEventCategoryWithAI,
  summarizeEventWithAI,
} from './server/gemini.ts';
import {
  EVENT_CATEGORIES,
  sanitizeCsvCell,
  validateEventPayload,
} from './src/shared/eventLogic.ts';
import type { EventCategory, UserRole } from './src/shared/types.ts';

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT ?? 3000);
  const isProd = process.env.NODE_ENV === 'production';

  app.set('trust proxy', true);
  app.use(express.json({ limit: '1mb' }));
  app.use(attachAuth);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'campusconnect-ai',
      geminiConfigured: Boolean(
        process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
      ),
    });
  });

  // --- AUTH ROUTES ---
  app.get('/api/auth/session', (req: AuthedRequest, res) => {
    if (!req.authUser) {
      res.json({ user: null, token: null });
      return;
    }
    // Issue a fresh memory bearer token when session is restored via HttpOnly cookie
    const token = signSessionToken(req.authUser);
    res.json({ user: req.authUser, token });
  });

  app.post('/api/auth/login', (req, res) => {
    const handle = String(req.body?.handle ?? '').trim();
    const password = String(req.body?.password ?? '');
    const expectedRole = req.body?.role as UserRole | undefined;

    if (!handle || !password) {
      res.status(400).json({ error: 'Identifier handle and passcode are required.' });
      return;
    }

    const found = getUserWithHashByHandle(handle);
    if (!found || !verifyPassword(password, found.passwordHash)) {
      res.status(401).json({ error: 'Invalid identifier or passcode.' });
      return;
    }

    if (expectedRole && found.user.role !== expectedRole) {
      res.status(403).json({
        error: `Account ${found.user.handle} is registered as ${found.user.role}, not ${expectedRole}.`,
      });
      return;
    }

    const token = signSessionToken(found.user);
    setSessionCookie(req, res, token);
    res.json({ user: found.user, token });
  });

  app.post('/api/auth/demo-login', (req, res) => {
    const handle = String(req.body?.handle ?? '').trim();
    const allowedDemoHandles = ['STU001', 'STU002', 'STU003', 'ORG001', 'ORG002'];
    if (!allowedDemoHandles.includes(handle.toUpperCase())) {
      res.status(400).json({ error: 'Invalid demo account identifier.' });
      return;
    }

    const found = getUserWithHashByHandle(handle);
    if (!found || !found.user.isDemo) {
      res.status(404).json({ error: 'Demo account unavailable.' });
      return;
    }

    const token = signSessionToken(found.user);
    setSessionCookie(req, res, token);
    res.json({ user: found.user, token });
  });

  app.post('/api/auth/register', (req, res) => {
    const handle = String(req.body?.handle ?? '').trim().toUpperCase();
    const role = req.body?.role as UserRole;
    const department = String(req.body?.department ?? '').trim();
    const password = String(req.body?.password ?? '');

    if (!/^(STU|ORG)[A-Z0-9]{2,12}$/.test(handle)) {
      res.status(400).json({
        error:
          'Use a fictional identifier starting with STU or ORG followed by 2-12 letters/numbers (e.g., STU104 or ORG009). Do not use real names or emails.',
      });
      return;
    }

    if (role !== 'STUDENT' && role !== 'ORGANISER') {
      res.status(400).json({ error: 'Role must be STUDENT or ORGANISER.' });
      return;
    }

    if (role === 'STUDENT' && !handle.startsWith('STU')) {
      res.status(400).json({ error: 'Student handles must begin with STU (e.g., STU104).' });
      return;
    }

    if (role === 'ORGANISER' && !handle.startsWith('ORG')) {
      res.status(400).json({ error: 'Organiser handles must begin with ORG (e.g., ORG009).' });
      return;
    }

    if (password.length < 6 || password.length > 64) {
      res.status(400).json({ error: 'Passcode must be between 6 and 64 characters.' });
      return;
    }

    if (department.length < 2 || department.length > 80) {
      res.status(400).json({ error: 'Department or Society label must be 2-80 characters.' });
      return;
    }

    if (getUserWithHashByHandle(handle)) {
      res.status(409).json({ error: `Identifier ${handle} already exists.` });
      return;
    }

    const user = createUserAccount({ handle, role, department, password });
    const token = signSessionToken(user);
    setSessionCookie(req, res, token);
    res.status(201).json({ user, token });
  });

  app.post('/api/auth/logout', (req, res) => {
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  // --- EVENTS ROUTES ---
  app.get('/api/events', (req: AuthedRequest, res) => {
    const events = listEventsForViewer(req.authUser ?? null);
    res.json({ events });
  });

  app.get('/api/organiser/events', requireAuth, requireRole('ORGANISER'), (req: AuthedRequest, res) => {
    const events = listOrganiserOwnEvents(req.authUser!.id);
    res.json({ events });
  });

  app.get('/api/events/:id', (req: AuthedRequest, res) => {
    const event = getEventByIdForViewer(req.params.id, req.authUser ?? null);
    if (!event) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }

    if (req.authUser && req.authUser.role === 'STUDENT' && event.status === 'PUBLISHED') {
      recordViewedEvent(req.authUser.id, event.id);
    }

    res.json({ event });
  });

  app.post('/api/events', requireAuth, requireRole('ORGANISER'), (req: AuthedRequest, res) => {
    const validation = validateEventPayload(req.body ?? {});
    if (!validation.valid || !validation.sanitized) {
      res.status(400).json({
        error: 'Please fix the highlighted fields.',
        fieldErrors: validation.errors,
      });
      return;
    }

    const created = createEventRecord(req.authUser!, validation.sanitized);
    res.status(201).json({ event: created });
  });

  app.put('/api/events/:id', requireAuth, requireRole('ORGANISER'), (req: AuthedRequest, res) => {
    const validation = validateEventPayload(req.body ?? {});
    if (!validation.valid || !validation.sanitized) {
      res.status(400).json({
        error: 'Please fix the highlighted fields.',
        fieldErrors: validation.errors,
      });
      return;
    }

    const result = updateEventRecord(String(req.params.id), req.authUser!, validation.sanitized);
    if (result.ok === false) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    res.json({ event: result.event });
  });

  app.delete('/api/events/:id', requireAuth, requireRole('ORGANISER'), (req: AuthedRequest, res) => {
    const result = deleteEventRecord(String(req.params.id), req.authUser!);
    if (result.ok === false) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ ok: true });
  });

  // --- REGISTRATION & INTEREST ROUTES ---
  app.post(
    '/api/events/:id/register',
    requireAuth,
    requireRole('STUDENT'),
    (req: AuthedRequest, res) => {
      const result = registerStudentForEvent(String(req.params.id), req.authUser!);
      if (result.ok === false) {
        res.status(result.status).json({ error: result.error });
        return;
      }
      res.status(201).json({ event: result.event });
    }
  );

  app.delete(
    '/api/events/:id/register',
    requireAuth,
    requireRole('STUDENT'),
    (req: AuthedRequest, res) => {
      const result = cancelStudentRegistration(String(req.params.id), req.authUser!);
      if (result.ok === false) {
        res.status(result.status).json({ error: result.error });
        return;
      }
      res.json({ event: result.event });
    }
  );

  app.post(
    '/api/events/:id/interest',
    requireAuth,
    requireRole('STUDENT'),
    (req: AuthedRequest, res) => {
      const interested = req.body?.interested !== false;
      const result = setStudentInterest(String(req.params.id), req.authUser!, interested);
      if (result.ok === false) {
        res.status(result.status).json({ error: result.error });
        return;
      }
      res.json({ event: result.event });
    }
  );

  // --- ORGANISER REGISTRATION MANAGEMENT & CSV EXPORT ---
  app.get(
    '/api/events/:id/registrations',
    requireAuth,
    requireRole('ORGANISER'),
    (req: AuthedRequest, res) => {
      const result = getEventRegistrationsForOrganiser(String(req.params.id), req.authUser!);
      if (result.ok === false) {
        res.status(result.status).json({ error: result.error });
        return;
      }
      res.json({
        event: result.event,
        registrations: result.registrations,
      });
    }
  );

  app.get(
    '/api/events/:id/registrations/export',
    requireAuth,
    requireRole('ORGANISER'),
    (req: AuthedRequest, res) => {
      const result = getEventRegistrationsForOrganiser(String(req.params.id), req.authUser!);
      if (result.ok === false) {
        res.status(result.status).json({ error: result.error });
        return;
      }

      const header = ['Student ID', 'Label', 'Department', 'Status', 'Registered At']
        .map(sanitizeCsvCell)
        .join(',');
      const lines = result.registrations.map((r) =>
        [r.studentId, r.studentLabel, r.department, r.status, r.registeredAt]
          .map(sanitizeCsvCell)
          .join(',')
      );

      const csv = [header, ...lines].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="registrations-${result.event.id}.csv"`
      );
      res.send(csv);
    }
  );

  // --- NOTIFICATIONS ROUTES ---
  app.get('/api/notifications', requireAuth, (req: AuthedRequest, res) => {
    const notifications = listNotificationsForUser(req.authUser!);
    res.json({ notifications });
  });

  app.post('/api/notifications/:id/read', requireAuth, (req: AuthedRequest, res) => {
    markNotificationRead(String(req.params.id), req.authUser!.id);
    res.json({ ok: true });
  });

  app.post('/api/notifications/read-all', requireAuth, (req: AuthedRequest, res) => {
    markAllNotificationsRead(req.authUser!);
    res.json({ ok: true });
  });

  // --- PREFERENCES ROUTES ---
  app.get('/api/preferences', requireAuth, (req: AuthedRequest, res) => {
    const preferences = getUserPreferences(req.authUser!.id);
    res.json({ preferences });
  });

  app.put('/api/preferences', requireAuth, (req: AuthedRequest, res) => {
    const rawCats = Array.isArray(req.body?.preferredCategories)
      ? (req.body.preferredCategories as string[])
      : [];
    const validCats = rawCats.filter((c): c is EventCategory =>
      EVENT_CATEGORIES.includes(c as EventCategory)
    );
    const digestEnabled = Boolean(req.body?.digestEnabled);
    const preferences = updateUserPreferences(req.authUser!.id, validCats, digestEnabled);
    res.json({ preferences });
  });

  // --- GEMINI AI ROUTES ---
  app.post(
    '/api/ai/generate-description',
    requireAuth,
    requireRole('ORGANISER'),
    async (req: AuthedRequest, res) => {
      try {
        const title = String(req.body?.title ?? '').trim();
        const category = String(req.body?.category ?? 'Other').trim();
        const basicInfo = String(req.body?.basicInfo ?? '').trim();
        const venue = String(req.body?.venue ?? '').trim();
        const date = String(req.body?.date ?? '').trim();

        if (title.length < 3) {
          res.status(400).json({ error: 'Enter an event title before generating a description.' });
          return;
        }
        if (basicInfo.length < 5) {
          res.status(400).json({ error: 'Enter brief event notes so Gemini can craft an accurate description.' });
          return;
        }

        const generated = await generateEventDescriptionWithAI({
          title,
          category,
          basicInfo,
          venue,
          date,
        });
        res.json(generated);
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode || 502;
        const message =
          err instanceof Error ? err.message : 'Failed to generate event description.';
        res.status(status).json({ error: message });
      }
    }
  );

  app.post(
    '/api/ai/suggest-category',
    requireAuth,
    requireRole('ORGANISER'),
    async (req: AuthedRequest, res) => {
      try {
        const title = String(req.body?.title ?? '').trim();
        const description = String(req.body?.description ?? '').trim();

        if (title.length < 3 && description.length < 5) {
          res.status(400).json({ error: 'Provide an event title or description first.' });
          return;
        }

        const suggestion = await suggestEventCategoryWithAI({ title, description });
        res.json(suggestion);
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode || 502;
        const message = err instanceof Error ? err.message : 'Failed to suggest category.';
        res.status(status).json({ error: message });
      }
    }
  );

  app.post('/api/ai/summarize-event', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const eventId = String(req.body?.eventId ?? '').trim();
      const ev = getEventByIdForViewer(eventId, req.authUser ?? null);
      if (!ev) {
        res.status(404).json({ error: 'Event not found.' });
        return;
      }

      const summary = await summarizeEventWithAI({
        title: ev.title,
        category: ev.category,
        venue: ev.venue,
        date: ev.date,
        startTime: ev.startTime,
        endTime: ev.endTime,
        fullDescription: ev.fullDescription,
        additionalInstructions: ev.additionalInstructions,
      });
      res.json(summary);
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode || 502;
      const message = err instanceof Error ? err.message : 'Failed to summarize event.';
      res.status(status).json({ error: message });
    }
  });

  app.get('/api/ai/recommendations', requireAuth, async (req: AuthedRequest, res) => {
    const events = listEventsForViewer(req.authUser!);
    const prefs = getUserPreferences(req.authUser!.id);
    const activity = getStudentActivityIds(req.authUser!.id);

    const result = await getStudentRecommendations({
      events,
      preferences: prefs,
      registeredIds: activity.registeredIds,
      interestedIds: activity.interestedIds,
    });
    res.json(result);
  });

  // --- FRONTEND SERVING ---
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`CampusConnect AI server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

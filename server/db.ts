import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import {
  computeEventStatus,
  defaultBannerForCategory,
  formatLocalDateISO,
  hasDeadlinePassed,
  hasEventEnded,
} from '../src/shared/eventLogic.ts';
import type {
  AuthUser,
  CampusEvent,
  CampusNotification,
  EventCategory,
  EventPublishStatus,
  EventRegistrationRecord,
  NotificationType,
  UserPreferences,
  UserRole,
} from '../src/shared/types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'campusconnect.db');
export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    handle TEXT UNIQUE NOT NULL,
    display_label TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('STUDENT', 'ORGANISER')),
    department TEXT NOT NULL DEFAULT 'General Studies',
    password_hash TEXT NOT NULL,
    is_demo INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    venue TEXT NOT NULL,
    short_description TEXT NOT NULL,
    full_description TEXT NOT NULL,
    additional_instructions TEXT NOT NULL DEFAULT '',
    registration_deadline TEXT NOT NULL DEFAULT '',
    max_capacity INTEGER NOT NULL,
    is_free INTEGER NOT NULL DEFAULT 1,
    fee_amount REAL NOT NULL DEFAULT 0,
    banner_url TEXT NOT NULL,
    organiser_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organiser_label TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('DRAFT', 'PUBLISHED', 'CANCELLED')),
    is_featured INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS registrations (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('REGISTERED', 'CANCELLED')),
    registered_at TEXT NOT NULL,
    UNIQUE(event_id, student_id)
  );

  CREATE TABLE IF NOT EXISTS interests (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    UNIQUE(event_id, student_id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    target_role TEXT NOT NULL CHECK (target_role IN ('ALL', 'STUDENT', 'ORGANISER')),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
    is_simulated INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notification_reads (
    notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TEXT NOT NULL,
    PRIMARY KEY (notification_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    preferred_categories TEXT NOT NULL DEFAULT '[]',
    viewed_event_ids TEXT NOT NULL DEFAULT '[]',
    digest_enabled INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );
`);

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = crypto.scryptSync(password, salt, 64);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

function addDaysISO(base: Date, days: number): string {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + days);
  return formatLocalDateISO(d);
}

export function seedDatabaseIfEmpty(): void {
  const countRow = db.prepare('SELECT COUNT(*) AS cnt FROM users').get() as { cnt: number };
  if (countRow.cnt > 0) return;

  const now = new Date();
  const nowISO = now.toISOString();
  const demoPassHash = hashPassword('campus2026');

  const insertUser = db.prepare(`
    INSERT INTO users (id, handle, display_label, role, department, password_hash, is_demo, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const demoUsers: Array<[string, string, string, UserRole, string, number]> = [
    ['STU001', 'STU001', 'Student STU001', 'STUDENT', 'Computer Science & AI', 1],
    ['STU002', 'STU002', 'Student STU002', 'STUDENT', 'Robotics Engineering', 1],
    ['STU003', 'STU003', 'Student STU003', 'STUDENT', 'Digital Arts & Design', 1],
    ['STU004', 'STU004', 'Student STU004', 'STUDENT', 'Electrical Engineering', 0],
    ['STU005', 'STU005', 'Student STU005', 'STUDENT', 'Data Science', 0],
    ['STU006', 'STU006', 'Student STU006', 'STUDENT', 'Information Security', 0],
    ['ORG001', 'ORG001', 'Tech & Innovation Guild (ORG001)', 'ORGANISER', 'Student Innovation Council', 1],
    ['ORG002', 'ORG002', 'Campus Cultural & Athletics Board (ORG002)', 'ORGANISER', 'Campus Activities Office', 1],
  ];

  for (const [id, handle, label, role, dept, isDemo] of demoUsers) {
    insertUser.run(id, handle, label, role, dept, demoPassHash, isDemo, nowISO);
  }

  const insertEvent = db.prepare(`
    INSERT INTO events (
      id, title, category, date, start_time, end_time, venue,
      short_description, full_description, additional_instructions,
      registration_deadline, max_capacity, is_free, fee_amount, banner_url,
      organiser_id, organiser_label, status, is_featured, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const todayISO = addDaysISO(now, 0);
  const tomorrowISO = addDaysISO(now, 1);
  const in2DaysISO = addDaysISO(now, 2);
  const in3DaysISO = addDaysISO(now, 3);
  const in4DaysISO = addDaysISO(now, 4);
  const in7DaysISO = addDaysISO(now, 7);
  const in10DaysISO = addDaysISO(now, 10);
  const in14DaysISO = addDaysISO(now, 14);
  const past6DaysISO = addDaysISO(now, -6);

  const eventsSeed: Array<{
    id: string;
    title: string;
    category: EventCategory;
    date: string;
    startTime: string;
    endTime: string;
    venue: string;
    shortDesc: string;
    fullDesc: string;
    instructions: string;
    deadline: string;
    capacity: number;
    isFree: number;
    fee: number;
    banner: string;
    organiserId: string;
    organiserLabel: string;
    status: EventPublishStatus;
    featured: number;
  }> = [
    {
      id: 'evt-ai-workshop',
      title: 'AI Innovation Workshop',
      category: 'Workshops',
      date: todayISO,
      startTime: '22:00',
      endTime: '23:55',
      venue: 'Innovation Center Auditorium B',
      shortDesc: 'Hands-on evening lab building practical multimodal campus workflows with structured LLM outputs.',
      fullDesc:
        'Join the Student Innovation Council for a practical technical workshop exploring prompt architecture, structured JSON generation, and applied university prototyping.\n\nParticipants will work through live engineering exercises, evaluate failure modes, and leave with reusable architecture templates for hackathon builds.',
      instructions: 'Bring a laptop with Node.js 22+ installed. Student ID check-in opens 15 minutes prior.',
      deadline: todayISO,
      capacity: 45,
      isFree: 1,
      fee: 0,
      banner: '/src/assets/images/banner_ai_workshop_1795210968134.jpg',
      organiserId: 'ORG001',
      organiserLabel: 'Tech & Innovation Guild (ORG001)',
      status: 'PUBLISHED',
      featured: 1,
    },
    {
      id: 'evt-hackathon-2026',
      title: 'Campus Hackathon 2026',
      category: 'Hackathons',
      date: tomorrowISO,
      startTime: '09:00',
      endTime: '21:00',
      venue: 'Main Innovation Atrium',
      shortDesc: 'Flagship 12-hour university build sprint uniting developers, designers, and researchers across all faculties.',
      fullDesc:
        'Campus Hackathon 2026 brings together interdisciplinary student teams to ship real, working software prototypes in a single day.\n\nTracks cover Campus Sustainability, Academic Accessibility, and Open Developer Tooling. Mentors from engineering departments will hold office hours throughout the afternoon, followed by live podium demos at 19:30.',
      instructions: 'Teams of 1-4 students. Power strips, high-speed Wi-Fi, and meals are provided in the Atrium.',
      deadline: tomorrowISO,
      capacity: 120,
      isFree: 1,
      fee: 0,
      banner: '/src/assets/images/banner_hackathon_1795210968613.jpg',
      organiserId: 'ORG001',
      organiserLabel: 'Tech & Innovation Guild (ORG001)',
      status: 'PUBLISHED',
      featured: 1,
    },
    {
      id: 'evt-cultural-fest',
      title: 'Cultural Fest: Twilight Soundscape',
      category: 'Cultural',
      date: in3DaysISO,
      startTime: '18:30',
      endTime: '22:00',
      venue: 'University Open Amphitheater',
      shortDesc: 'Annual evening showcase of campus bands, acoustic ensembles, stage lighting installations, and student art.',
      fullDesc:
        'Experience an evening of live student music, collaborative visual projections, and cultural performances under the open sky at the University Amphitheater.\n\nFeaturing five student ensembles, an interactive gallery walk along the colonnade, and regional food stalls curated by campus cultural societies.',
      instructions: 'Entry pass covers stage access and gallery walk. Doors open at 18:00.',
      deadline: in2DaysISO,
      capacity: 200,
      isFree: 0,
      fee: 10,
      banner: '/src/assets/images/banner_cultural_fest_1795210968808.jpg',
      organiserId: 'ORG002',
      organiserLabel: 'Campus Cultural & Athletics Board (ORG002)',
      status: 'PUBLISHED',
      featured: 1,
    },
    {
      id: 'evt-robotics-comp',
      title: 'Robotics Competition: Autonomous Rover Trials',
      category: 'Competitions',
      date: in4DaysISO,
      startTime: '10:00',
      endTime: '16:30',
      venue: 'Engineering Robotics Arena',
      shortDesc: 'Precision navigation and obstacle-course time trials for student-built autonomous campus rovers.',
      fullDesc:
        'Watch student engineering teams put custom autonomous ground rovers through LiDAR mapping, precision waypoint navigation, and rapid payload recovery rounds.\n\nSpectators and prospective club members are welcome in the upper gallery, and registered teams receive pit bench access starting at 08:30.',
      instructions: 'Safety glasses required inside the pit lane. Check battery compliance before inspection.',
      deadline: in3DaysISO,
      capacity: 30,
      isFree: 1,
      fee: 0,
      banner: '/src/assets/images/banner_sports_robotics_1795210967924.jpg',
      organiserId: 'ORG001',
      organiserLabel: 'Tech & Innovation Guild (ORG001)',
      status: 'PUBLISHED',
      featured: 0,
    },
    {
      id: 'evt-systems-full',
      title: 'Applied Systems Security Lab',
      category: 'Technical',
      date: in2DaysISO,
      startTime: '15:00',
      endTime: '17:30',
      venue: 'Cybersecurity Teaching Lab B2',
      shortDesc: 'Small-cohort hands-on lab analyzing authentication boundaries, access control, and API hardening.',
      fullDesc:
        'A tightly capped hands-on systems security session limited to workstation capacity in Lab B2.\n\nStudents audit real web endpoints, inspect session boundaries, and practice defensive server-side validation patterns.',
      instructions: 'Workstations provided on site. No external hardware needed.',
      deadline: in2DaysISO,
      capacity: 3,
      isFree: 1,
      fee: 0,
      banner: '/src/assets/images/banner_ai_workshop_1795210968134.jpg',
      organiserId: 'ORG001',
      organiserLabel: 'Tech & Innovation Guild (ORG001)',
      status: 'PUBLISHED',
      featured: 0,
    },
    {
      id: 'evt-web-bootcamp',
      title: 'Web Development Bootcamp',
      category: 'Technical',
      date: in7DaysISO,
      startTime: '13:00',
      endTime: '17:00',
      venue: 'Computing Center Hall 302',
      shortDesc: 'End-to-end TypeScript, React, and REST API workshop for building production-grade student apps.',
      fullDesc:
        'Designed for students preparing for winter project showcases, this intensive afternoon bootcamp walks through typed frontend state management, relational data modeling, and responsive dark-mode interface architecture.',
      instructions: 'Install Git and VS Code ahead of time. Starter repository link shared upon check-in.',
      deadline: in4DaysISO,
      capacity: 40,
      isFree: 1,
      fee: 0,
      banner: '/src/assets/images/banner_hackathon_1795210968613.jpg',
      organiserId: 'ORG001',
      organiserLabel: 'Tech & Innovation Guild (ORG001)',
      status: 'PUBLISHED',
      featured: 0,
    },
    {
      id: 'evt-sports-meet',
      title: 'Interdepartment Sports Meet',
      category: 'Sports',
      date: in10DaysISO,
      startTime: '08:30',
      endTime: '17:30',
      venue: 'Campus Athletics Complex',
      shortDesc: 'Track relays, badminton doubles, and 5-a-side futsal qualifiers across academic departments.',
      fullDesc:
        'Represent your academic department at the Autumn Interdepartment Sports Meet.\n\nEvents run across the main track, indoor court complex, and turf pitches with live scoreboard tracking and hydration stations.',
      instructions: 'Wear athletic footwear suitable for indoor courts and synthetic turf.',
      deadline: in7DaysISO,
      capacity: 150,
      isFree: 1,
      fee: 0,
      banner: '/src/assets/images/banner_sports_robotics_1795210967924.jpg',
      organiserId: 'ORG002',
      organiserLabel: 'Campus Cultural & Athletics Board (ORG002)',
      status: 'PUBLISHED',
      featured: 0,
    },
    {
      id: 'evt-past-colloquium',
      title: 'Department Research Colloquium',
      category: 'Department Events',
      date: past6DaysISO,
      startTime: '14:00',
      endTime: '16:30',
      venue: 'Founders Seminar Hall',
      shortDesc: 'Faculty and graduate poster session covering distributed systems, HCI, and computational design.',
      fullDesc:
        'Completed autumn research colloquium featuring 18 student poster presentations and faculty lightning talks across computing and engineering disciplines.',
      instructions: 'Archive summary notes available at the department reading room.',
      deadline: past6DaysISO,
      capacity: 80,
      isFree: 1,
      fee: 0,
      banner: '/src/assets/images/hero_campus_hub_1795210968757.jpg',
      organiserId: 'ORG002',
      organiserLabel: 'Campus Cultural & Athletics Board (ORG002)',
      status: 'PUBLISHED',
      featured: 0,
    },
    {
      id: 'evt-draft-summit',
      title: 'Open Source Maintainers Seminar',
      category: 'Seminars',
      date: in14DaysISO,
      startTime: '11:00',
      endTime: '13:00',
      venue: 'Innovation Atrium Mezzanine',
      shortDesc: 'Draft planning session for student maintainers contributing to campus open-source infrastructure.',
      fullDesc:
        'Roundtable seminar covering release engineering, issue triage, and documentation standards for university open-source labs.',
      instructions: 'Draft agenda pending speaker confirmation.',
      deadline: in10DaysISO,
      capacity: 35,
      isFree: 1,
      fee: 0,
      banner: '/src/assets/images/banner_ai_workshop_1795210968134.jpg',
      organiserId: 'ORG001',
      organiserLabel: 'Tech & Innovation Guild (ORG001)',
      status: 'DRAFT',
      featured: 0,
    },
  ];

  for (const e of eventsSeed) {
    insertEvent.run(
      e.id,
      e.title,
      e.category,
      e.date,
      e.startTime,
      e.endTime,
      e.venue,
      e.shortDesc,
      e.fullDesc,
      e.instructions,
      e.deadline,
      e.capacity,
      e.isFree,
      e.fee,
      e.banner,
      e.organiserId,
      e.organiserLabel,
      e.status,
      e.featured,
      nowISO,
      nowISO
    );
  }

  const insertReg = db.prepare(`
    INSERT INTO registrations (id, event_id, student_id, status, registered_at)
    VALUES (?, ?, ?, 'REGISTERED', ?)
  `);

  const regSeed: Array<[string, string, string]> = [
    ['reg-1', 'evt-web-bootcamp', 'STU001'],
    ['reg-2', 'evt-ai-workshop', 'STU002'],
    ['reg-3', 'evt-hackathon-2026', 'STU002'],
    ['reg-4', 'evt-hackathon-2026', 'STU003'],
    ['reg-5', 'evt-hackathon-2026', 'STU004'],
    ['reg-6', 'evt-systems-full', 'STU004'],
    ['reg-7', 'evt-systems-full', 'STU005'],
    ['reg-8', 'evt-systems-full', 'STU006'],
    ['reg-9', 'evt-cultural-fest', 'STU003'],
    ['reg-10', 'evt-robotics-comp', 'STU002'],
    ['reg-11', 'evt-past-colloquium', 'STU001'],
    ['reg-12', 'evt-past-colloquium', 'STU002'],
  ];

  for (const [id, evtId, stuId] of regSeed) {
    insertReg.run(id, evtId, stuId, nowISO);
  }

  const insertInterest = db.prepare(`
    INSERT INTO interests (id, event_id, student_id, created_at)
    VALUES (?, ?, ?, ?)
  `);

  insertInterest.run('int-1', 'evt-cultural-fest', 'STU001', nowISO);
  insertInterest.run('int-2', 'evt-hackathon-2026', 'STU005', nowISO);
  insertInterest.run('int-3', 'evt-robotics-comp', 'STU004', nowISO);

  const insertPref = db.prepare(`
    INSERT INTO user_preferences (user_id, preferred_categories, viewed_event_ids, digest_enabled, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertPref.run('STU001', JSON.stringify(['Hackathons', 'Workshops']), JSON.stringify([]), 0, nowISO);
  insertPref.run('STU002', JSON.stringify(['Competitions', 'Technical']), JSON.stringify([]), 0, nowISO);
  insertPref.run('STU003', JSON.stringify([]), JSON.stringify([]), 0, nowISO);

  const insertNotif = db.prepare(`
    INSERT INTO notifications (id, user_id, target_role, type, title, message, event_id, is_simulated, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertNotif.run(
    'notif-seed-1',
    null,
    'STUDENT',
    'NEW_EVENT',
    'New Event Published: Campus Hackathon 2026',
    'Tech & Innovation Guild (ORG001) published Campus Hackathon 2026 at Main Innovation Atrium.',
    'evt-hackathon-2026',
    0,
    nowISO
  );

  insertNotif.run(
    'notif-seed-sim-1',
    null,
    'STUDENT',
    'REMINDER_EXAMPLE',
    'Upcoming Event Reminder: AI Innovation Workshop',
    'AI Innovation Workshop takes place today at Innovation Center Auditorium B. Check in 15 minutes early.',
    'evt-ai-workshop',
    1,
    nowISO
  );
}

seedDatabaseIfEmpty();

export function getUserById(id: string): AuthUser | null {
  const row = db
    .prepare(
      'SELECT id, handle, display_label, role, department, is_demo FROM users WHERE id = ?'
    )
    .get(id) as
    | {
        id: string;
        handle: string;
        display_label: string;
        role: UserRole;
        department: string;
        is_demo: number;
      }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    handle: row.handle,
    displayLabel: row.display_label,
    role: row.role,
    department: row.department,
    isDemo: Boolean(row.is_demo),
  };
}

export function getUserWithHashByHandle(handle: string): {
  user: AuthUser;
  passwordHash: string;
} | null {
  const row = db
    .prepare(
      'SELECT id, handle, display_label, role, department, password_hash, is_demo FROM users WHERE UPPER(handle) = UPPER(?)'
    )
    .get(handle.trim()) as
    | {
        id: string;
        handle: string;
        display_label: string;
        role: UserRole;
        department: string;
        password_hash: string;
        is_demo: number;
      }
    | undefined;
  if (!row) return null;
  return {
    user: {
      id: row.id,
      handle: row.handle,
      displayLabel: row.display_label,
      role: row.role,
      department: row.department,
      isDemo: Boolean(row.is_demo),
    },
    passwordHash: row.password_hash,
  };
}

export function createUserAccount(input: {
  handle: string;
  role: UserRole;
  department: string;
  password: string;
}): AuthUser {
  const cleanHandle = input.handle.trim().toUpperCase();
  const displayLabel =
    input.role === 'ORGANISER'
      ? `${input.department.trim() || 'Campus Society'} (${cleanHandle})`
      : `Student ${cleanHandle}`;
  const nowISO = new Date().toISOString();
  const passHash = hashPassword(input.password);

  db.prepare(`
    INSERT INTO users (id, handle, display_label, role, department, password_hash, is_demo, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    cleanHandle,
    cleanHandle,
    displayLabel,
    input.role,
    input.department.trim() || 'General Studies',
    passHash,
    nowISO
  );

  if (input.role === 'STUDENT') {
    db.prepare(`
      INSERT OR IGNORE INTO user_preferences (user_id, preferred_categories, viewed_event_ids, digest_enabled, updated_at)
      VALUES (?, '[]', '[]', 0, ?)
    `).run(cleanHandle, nowISO);
  }

  return getUserById(cleanHandle)!;
}

interface RawEventRow {
  id: string;
  title: string;
  category: EventCategory;
  date: string;
  start_time: string;
  end_time: string;
  venue: string;
  short_description: string;
  full_description: string;
  additional_instructions: string;
  registration_deadline: string;
  max_capacity: number;
  is_free: number;
  fee_amount: number;
  banner_url: string;
  organiser_id: string;
  organiser_label: string;
  status: EventPublishStatus;
  is_featured: number;
  created_at: string;
  updated_at: string;
  registered_count: number;
  interested_count: number;
  is_registered_by_me: number;
  is_interested_by_me: number;
}

function mapRawEvent(row: RawEventRow, now: Date = new Date()): CampusEvent {
  const registeredCount = Number(row.registered_count ?? 0);
  const interestedCount = Number(row.interested_count ?? 0);
  const remainingSeats = Math.max(0, row.max_capacity - registeredCount);
  const computedStatus = computeEventStatus(
    {
      status: row.status,
      date: row.date,
      endTime: row.end_time,
      maxCapacity: row.max_capacity,
    },
    registeredCount,
    now
  );

  return {
    id: row.id,
    title: row.title,
    category: row.category,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    venue: row.venue,
    shortDescription: row.short_description,
    fullDescription: row.full_description,
    additionalInstructions: row.additional_instructions,
    registrationDeadline: row.registration_deadline,
    maxCapacity: row.max_capacity,
    isFree: Boolean(row.is_free),
    feeAmount: Number(row.fee_amount ?? 0),
    bannerUrl: row.banner_url || defaultBannerForCategory(row.category),
    organiserId: row.organiser_id,
    organiserLabel: row.organiser_label,
    status: row.status,
    isFeatured: Boolean(row.is_featured),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    registeredCount,
    interestedCount,
    remainingSeats,
    computedStatus,
    isRegisteredByMe: Boolean(row.is_registered_by_me),
    isInterestedByMe: Boolean(row.is_interested_by_me),
  };
}

const EVENT_SELECT_SQL = `
  SELECT
    e.*,
    (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'REGISTERED') AS registered_count,
    (SELECT COUNT(*) FROM interests i WHERE i.event_id = e.id) AS interested_count,
    EXISTS(SELECT 1 FROM registrations r2 WHERE r2.event_id = e.id AND r2.student_id = ? AND r2.status = 'REGISTERED') AS is_registered_by_me,
    EXISTS(SELECT 1 FROM interests i2 WHERE i2.event_id = e.id AND i2.student_id = ?) AS is_interested_by_me
  FROM events e
`;

export function listEventsForViewer(viewer: AuthUser | null): CampusEvent[] {
  const uid = viewer?.id ?? '';
  let rows: RawEventRow[];
  if (viewer?.role === 'ORGANISER') {
    // Organiser discovery can see published events + own drafts/cancelled
    rows = db
      .prepare(
        `${EVENT_SELECT_SQL} WHERE e.status != 'DRAFT' OR e.organiser_id = ? ORDER BY e.date ASC, e.start_time ASC`
      )
      .all(uid, uid, viewer.id) as unknown as RawEventRow[];
  } else {
    rows = db
      .prepare(
        `${EVENT_SELECT_SQL} WHERE e.status != 'DRAFT' ORDER BY e.date ASC, e.start_time ASC`
      )
      .all(uid, uid) as unknown as RawEventRow[];
  }
  const now = new Date();
  return rows.map((r) => mapRawEvent(r, now));
}

export function listOrganiserOwnEvents(organiserId: string): CampusEvent[] {
  const rows = db
    .prepare(
      `${EVENT_SELECT_SQL} WHERE e.organiser_id = ? ORDER BY e.created_at DESC`
    )
    .all(organiserId, organiserId, organiserId) as unknown as RawEventRow[];
  const now = new Date();
  return rows.map((r) => mapRawEvent(r, now));
}

export function getEventByIdForViewer(
  eventId: string,
  viewer: AuthUser | null
): CampusEvent | null {
  const uid = viewer?.id ?? '';
  const row = db
    .prepare(`${EVENT_SELECT_SQL} WHERE e.id = ?`)
    .get(uid, uid, eventId) as unknown as RawEventRow | undefined;
  if (!row) return null;
  if (row.status === 'DRAFT' && viewer?.id !== row.organiser_id) {
    return null;
  }
  return mapRawEvent(row, new Date());
}

export function createNotification(input: {
  userId?: string | null;
  targetRole: 'ALL' | UserRole;
  type: NotificationType;
  title: string;
  message: string;
  eventId?: string | null;
  isSimulated?: boolean;
}): void {
  const id = `notif-${crypto.randomUUID()}`;
  db.prepare(`
    INSERT INTO notifications (id, user_id, target_role, type, title, message, event_id, is_simulated, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.userId ?? null,
    input.targetRole,
    input.type,
    input.title,
    input.message,
    input.eventId ?? null,
    input.isSimulated ? 1 : 0,
    new Date().toISOString()
  );
}

export function createEventRecord(
  organiser: AuthUser,
  data: {
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
    maxCapacity: number;
    isFree: boolean;
    feeAmount: number;
    bannerUrl: string;
    status: EventPublishStatus;
    isFeatured: boolean;
  }
): CampusEvent {
  const id = `evt-${crypto.randomUUID().slice(0, 8)}`;
  const nowISO = new Date().toISOString();

  db.prepare(`
    INSERT INTO events (
      id, title, category, date, start_time, end_time, venue,
      short_description, full_description, additional_instructions,
      registration_deadline, max_capacity, is_free, fee_amount, banner_url,
      organiser_id, organiser_label, status, is_featured, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.title,
    data.category,
    data.date,
    data.startTime,
    data.endTime,
    data.venue,
    data.shortDescription,
    data.fullDescription,
    data.additionalInstructions,
    data.registrationDeadline,
    data.maxCapacity,
    data.isFree ? 1 : 0,
    data.feeAmount,
    data.bannerUrl,
    organiser.id,
    organiser.displayLabel,
    data.status,
    data.isFeatured ? 1 : 0,
    nowISO,
    nowISO
  );

  if (data.status === 'PUBLISHED') {
    createNotification({
      targetRole: 'STUDENT',
      type: 'NEW_EVENT',
      title: `New Event Published: ${data.title}`,
      message: `${organiser.displayLabel} published ${data.title} (${data.category}) on ${data.date} at ${data.venue}.`,
      eventId: id,
    });
  }

  return getEventByIdForViewer(id, organiser)!;
}

export function updateEventRecord(
  eventId: string,
  organiser: AuthUser,
  data: {
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
    maxCapacity: number;
    isFree: boolean;
    feeAmount: number;
    bannerUrl: string;
    status: EventPublishStatus;
    isFeatured: boolean;
  }
): { ok: true; event: CampusEvent } | { ok: false; status: number; error: string } {
  const existing = db
    .prepare('SELECT id, organiser_id, status, title FROM events WHERE id = ?')
    .get(eventId) as
    | { id: string; organiser_id: string; status: EventPublishStatus; title: string }
    | undefined;

  if (!existing) {
    return { ok: false, status: 404, error: 'Event not found.' };
  }
  if (existing.organiser_id !== organiser.id) {
    return {
      ok: false,
      status: 403,
      error: 'You do not have permission to edit another organiser’s event.',
    };
  }

  const activeCountRow = db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM registrations WHERE event_id = ? AND status = 'REGISTERED'`
    )
    .get(eventId) as { cnt: number };
  if (data.maxCapacity < activeCountRow.cnt) {
    return {
      ok: false,
      status: 400,
      error: `Capacity cannot be lower than the ${activeCountRow.cnt} currently registered students.`,
    };
  }

  const nowISO = new Date().toISOString();
  db.prepare(`
    UPDATE events SET
      title = ?, category = ?, date = ?, start_time = ?, end_time = ?, venue = ?,
      short_description = ?, full_description = ?, additional_instructions = ?,
      registration_deadline = ?, max_capacity = ?, is_free = ?, fee_amount = ?, banner_url = ?,
      status = ?, is_featured = ?, updated_at = ?
    WHERE id = ?
  `).run(
    data.title,
    data.category,
    data.date,
    data.startTime,
    data.endTime,
    data.venue,
    data.shortDescription,
    data.fullDescription,
    data.additionalInstructions,
    data.registrationDeadline,
    data.maxCapacity,
    data.isFree ? 1 : 0,
    data.feeAmount,
    data.bannerUrl,
    data.status,
    data.isFeatured ? 1 : 0,
    nowISO,
    eventId
  );

  if (existing.status === 'DRAFT' && data.status === 'PUBLISHED') {
    createNotification({
      targetRole: 'STUDENT',
      type: 'NEW_EVENT',
      title: `New Event Published: ${data.title}`,
      message: `${organiser.displayLabel} published ${data.title} (${data.category}) on ${data.date} at ${data.venue}.`,
      eventId,
    });
  } else if (existing.status !== 'CANCELLED' && data.status === 'CANCELLED') {
    const registrants = db
      .prepare(
        `SELECT student_id FROM registrations WHERE event_id = ? AND status = 'REGISTERED'`
      )
      .all(eventId) as Array<{ student_id: string }>;
    for (const r of registrants) {
      createNotification({
        userId: r.student_id,
        targetRole: 'STUDENT',
        type: 'EVENT_CANCELLED',
        title: `Event Cancelled: ${data.title}`,
        message: `${organiser.displayLabel} cancelled ${data.title} scheduled for ${data.date}.`,
        eventId,
      });
    }
  } else if (data.status === 'PUBLISHED') {
    const registrants = db
      .prepare(
        `SELECT student_id FROM registrations WHERE event_id = ? AND status = 'REGISTERED'`
      )
      .all(eventId) as Array<{ student_id: string }>;
    for (const r of registrants) {
      createNotification({
        userId: r.student_id,
        targetRole: 'STUDENT',
        type: 'EVENT_UPDATED',
        title: `Event Updated: ${data.title}`,
        message: `Details for ${data.title} (${data.date} at ${data.venue}) were updated by the organiser.`,
        eventId,
      });
    }
  }

  return { ok: true, event: getEventByIdForViewer(eventId, organiser)! };
}

export function deleteEventRecord(
  eventId: string,
  organiser: AuthUser
): { ok: true } | { ok: false; status: number; error: string } {
  const existing = db
    .prepare('SELECT id, organiser_id FROM events WHERE id = ?')
    .get(eventId) as { id: string; organiser_id: string } | undefined;

  if (!existing) {
    return { ok: false, status: 404, error: 'Event not found.' };
  }
  if (existing.organiser_id !== organiser.id) {
    return {
      ok: false,
      status: 403,
      error: 'You do not have permission to delete another organiser’s event.',
    };
  }

  db.prepare('DELETE FROM events WHERE id = ?').run(eventId);
  return { ok: true };
}

export function registerStudentForEvent(
  eventId: string,
  student: AuthUser
): { ok: true; event: CampusEvent } | { ok: false; status: number; error: string } {
  db.exec('BEGIN IMMEDIATE');
  try {
    const eventRow = db
      .prepare(
        'SELECT id, title, date, end_time, registration_deadline, max_capacity, status, venue FROM events WHERE id = ?'
      )
      .get(eventId) as
      | {
          id: string;
          title: string;
          date: string;
          end_time: string;
          registration_deadline: string;
          max_capacity: number;
          status: EventPublishStatus;
          venue: string;
        }
      | undefined;

    if (!eventRow || eventRow.status === 'DRAFT') {
      db.exec('ROLLBACK');
      return { ok: false, status: 404, error: 'Event not found.' };
    }

    if (eventRow.status === 'CANCELLED') {
      db.exec('ROLLBACK');
      return { ok: false, status: 400, error: 'This event has been cancelled.' };
    }

    const now = new Date();
    if (hasEventEnded({ date: eventRow.date, endTime: eventRow.end_time }, now)) {
      db.exec('ROLLBACK');
      return { ok: false, status: 400, error: 'This event has already completed.' };
    }

    if (hasDeadlinePassed(eventRow.registration_deadline, now)) {
      db.exec('ROLLBACK');
      return { ok: false, status: 400, error: 'Registration deadline has passed.' };
    }

    const existingReg = db
      .prepare('SELECT id, status FROM registrations WHERE event_id = ? AND student_id = ?')
      .get(eventId, student.id) as { id: string; status: string } | undefined;

    if (existingReg && existingReg.status === 'REGISTERED') {
      db.exec('ROLLBACK');
      return {
        ok: false,
        status: 409,
        error: 'You are already registered for this event.',
      };
    }

    const countRow = db
      .prepare(
        `SELECT COUNT(*) AS cnt FROM registrations WHERE event_id = ? AND status = 'REGISTERED'`
      )
      .get(eventId) as { cnt: number };

    if (countRow.cnt >= eventRow.max_capacity) {
      db.exec('ROLLBACK');
      return {
        ok: false,
        status: 409,
        error: 'This event is FULL. Maximum capacity has been reached.',
      };
    }

    const nowISO = now.toISOString();
    if (existingReg) {
      db.prepare(
        `UPDATE registrations SET status = 'REGISTERED', registered_at = ? WHERE id = ?`
      ).run(nowISO, existingReg.id);
    } else {
      db.prepare(
        `INSERT INTO registrations (id, event_id, student_id, status, registered_at) VALUES (?, ?, ?, 'REGISTERED', ?)`
      ).run(`reg-${crypto.randomUUID().slice(0, 8)}`, eventId, student.id, nowISO);
    }

    db.prepare(`
      INSERT INTO notifications (id, user_id, target_role, type, title, message, event_id, is_simulated, created_at)
      VALUES (?, ?, 'STUDENT', 'REGISTRATION_CONFIRMED', ?, ?, ?, 0, ?)
    `).run(
      `notif-${crypto.randomUUID()}`,
      student.id,
      `Registration Confirmed: ${eventRow.title}`,
      `Your seat (${student.handle}) is confirmed for ${eventRow.title} on ${eventRow.date} at ${eventRow.venue}.`,
      eventId,
      nowISO
    );

    db.exec('COMMIT');
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // ignore rollback error
    }
    throw err;
  }

  return { ok: true, event: getEventByIdForViewer(eventId, student)! };
}

export function cancelStudentRegistration(
  eventId: string,
  student: AuthUser
): { ok: true; event: CampusEvent } | { ok: false; status: number; error: string } {
  const existing = db
    .prepare(
      `SELECT id FROM registrations WHERE event_id = ? AND student_id = ? AND status = 'REGISTERED'`
    )
    .get(eventId, student.id) as { id: string } | undefined;

  if (!existing) {
    return {
      ok: false,
      status: 404,
      error: 'Active registration not found for this event.',
    };
  }

  db.prepare(`UPDATE registrations SET status = 'CANCELLED' WHERE id = ?`).run(existing.id);
  return { ok: true, event: getEventByIdForViewer(eventId, student)! };
}

export function setStudentInterest(
  eventId: string,
  student: AuthUser,
  interested: boolean
): { ok: true; event: CampusEvent } | { ok: false; status: number; error: string } {
  const eventRow = db
    .prepare('SELECT id, status FROM events WHERE id = ?')
    .get(eventId) as { id: string; status: EventPublishStatus } | undefined;

  if (!eventRow || eventRow.status === 'DRAFT') {
    return { ok: false, status: 404, error: 'Event not found.' };
  }

  if (interested) {
    db.prepare(
      `INSERT OR IGNORE INTO interests (id, event_id, student_id, created_at) VALUES (?, ?, ?, ?)`
    ).run(`int-${crypto.randomUUID().slice(0, 8)}`, eventId, student.id, new Date().toISOString());
  } else {
    db.prepare('DELETE FROM interests WHERE event_id = ? AND student_id = ?').run(
      eventId,
      student.id
    );
  }

  return { ok: true, event: getEventByIdForViewer(eventId, student)! };
}

export function getEventRegistrationsForOrganiser(
  eventId: string,
  organiser: AuthUser
):
  | { ok: true; event: CampusEvent; registrations: EventRegistrationRecord[] }
  | { ok: false; status: number; error: string } {
  const raw = db
    .prepare('SELECT organiser_id FROM events WHERE id = ?')
    .get(eventId) as { organiser_id: string } | undefined;

  if (!raw) {
    return { ok: false, status: 404, error: 'Event not found.' };
  }
  if (raw.organiser_id !== organiser.id) {
    return {
      ok: false,
      status: 403,
      error: 'You can only manage registrations for your own events.',
    };
  }

  const rows = db
    .prepare(
      `
      SELECT r.id, r.event_id, r.student_id, u.display_label AS student_label, u.department, r.status, r.registered_at
      FROM registrations r
      JOIN users u ON u.id = r.student_id
      WHERE r.event_id = ? AND r.status = 'REGISTERED'
      ORDER BY r.registered_at DESC
    `
    )
    .all(eventId) as Array<{
    id: string;
    event_id: string;
    student_id: string;
    student_label: string;
    department: string;
    status: 'REGISTERED' | 'CANCELLED';
    registered_at: string;
  }>;

  const event = getEventByIdForViewer(eventId, organiser)!;
  return {
    ok: true,
    event,
    registrations: rows.map((r) => ({
      id: r.id,
      eventId: r.event_id,
      studentId: r.student_id,
      studentLabel: r.student_label,
      department: r.department,
      status: r.status,
      registeredAt: r.registered_at,
    })),
  };
}

export function listNotificationsForUser(user: AuthUser): CampusNotification[] {
  const rows = db
    .prepare(
      `
      SELECT
        n.*,
        EXISTS(
          SELECT 1 FROM notification_reads nr
          WHERE nr.notification_id = n.id AND nr.user_id = ?
        ) AS is_read
      FROM notifications n
      WHERE (n.user_id = ?) OR (n.user_id IS NULL AND (n.target_role = 'ALL' OR n.target_role = ?))
      ORDER BY n.created_at DESC
      LIMIT 60
    `
    )
    .all(user.id, user.id, user.role) as Array<{
    id: string;
    user_id: string | null;
    target_role: 'ALL' | UserRole;
    type: NotificationType;
    title: string;
    message: string;
    event_id: string | null;
    is_simulated: number;
    is_read: number;
    created_at: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    targetRole: r.target_role,
    type: r.type,
    title: r.title,
    message: r.message,
    eventId: r.event_id,
    isSimulated: Boolean(r.is_simulated),
    isRead: Boolean(r.is_read),
    createdAt: r.created_at,
  }));
}

export function markNotificationRead(notificationId: string, userId: string): void {
  db.prepare(
    `INSERT OR IGNORE INTO notification_reads (notification_id, user_id, read_at) VALUES (?, ?, ?)`
  ).run(notificationId, userId, new Date().toISOString());
}

export function markAllNotificationsRead(user: AuthUser): void {
  const notifs = listNotificationsForUser(user);
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO notification_reads (notification_id, user_id, read_at) VALUES (?, ?, ?)`
  );
  const nowISO = new Date().toISOString();
  for (const n of notifs) {
    stmt.run(n.id, user.id, nowISO);
  }
}

export function getUserPreferences(userId: string): UserPreferences {
  const row = db
    .prepare(
      'SELECT user_id, preferred_categories, viewed_event_ids, digest_enabled, updated_at FROM user_preferences WHERE user_id = ?'
    )
    .get(userId) as
    | {
        user_id: string;
        preferred_categories: string;
        viewed_event_ids: string;
        digest_enabled: number;
        updated_at: string;
      }
    | undefined;

  if (!row) {
    return {
      userId,
      preferredCategories: [],
      viewedEventIds: [],
      digestEnabled: false,
      updatedAt: new Date().toISOString(),
    };
  }

  let preferredCategories: EventCategory[] = [];
  let viewedEventIds: string[] = [];
  try {
    preferredCategories = JSON.parse(row.preferred_categories);
  } catch {
    preferredCategories = [];
  }
  try {
    viewedEventIds = JSON.parse(row.viewed_event_ids);
  } catch {
    viewedEventIds = [];
  }

  return {
    userId: row.user_id,
    preferredCategories,
    viewedEventIds,
    digestEnabled: Boolean(row.digest_enabled),
    updatedAt: row.updated_at,
  };
}

export function updateUserPreferences(
  userId: string,
  preferredCategories: EventCategory[],
  digestEnabled: boolean
): UserPreferences {
  const nowISO = new Date().toISOString();
  const existing = getUserPreferences(userId);
  db.prepare(`
    INSERT INTO user_preferences (user_id, preferred_categories, viewed_event_ids, digest_enabled, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      preferred_categories = excluded.preferred_categories,
      digest_enabled = excluded.digest_enabled,
      updated_at = excluded.updated_at
  `).run(
    userId,
    JSON.stringify(preferredCategories),
    JSON.stringify(existing.viewedEventIds),
    digestEnabled ? 1 : 0,
    nowISO
  );
  return getUserPreferences(userId);
}

export function recordViewedEvent(userId: string, eventId: string): void {
  const prefs = getUserPreferences(userId);
  const next = [eventId, ...prefs.viewedEventIds.filter((id) => id !== eventId)].slice(0, 12);
  const nowISO = new Date().toISOString();
  db.prepare(`
    INSERT INTO user_preferences (user_id, preferred_categories, viewed_event_ids, digest_enabled, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      viewed_event_ids = excluded.viewed_event_ids,
      updated_at = excluded.updated_at
  `).run(
    userId,
    JSON.stringify(prefs.preferredCategories),
    JSON.stringify(next),
    prefs.digestEnabled ? 1 : 0,
    nowISO
  );
}

export function getStudentActivityIds(studentId: string): {
  registeredIds: string[];
  interestedIds: string[];
} {
  const regRows = db
    .prepare(
      `SELECT event_id FROM registrations WHERE student_id = ? AND status = 'REGISTERED'`
    )
    .all(studentId) as Array<{ event_id: string }>;
  const intRows = db
    .prepare(`SELECT event_id FROM interests WHERE student_id = ?`)
    .all(studentId) as Array<{ event_id: string }>;

  return {
    registeredIds: regRows.map((r) => r.event_id),
    interestedIds: intRows.map((r) => r.event_id),
  };
}

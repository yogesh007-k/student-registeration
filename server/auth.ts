import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { getUserById } from './db.ts';
import type { AuthUser, UserRole } from '../src/shared/types.ts';

const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

const COOKIE_NAME = 'cc_session';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

interface SessionPayload {
  uid: string;
  role: UserRole;
  exp: number;
}

export interface AuthedRequest extends Request {
  authUser?: AuthUser | null;
  authViaCookie?: boolean;
}

export function signSessionToken(user: AuthUser): string {
  const payload: SessionPayload = {
    uid: user.id,
    role: user.role,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(sig, 'utf8');
  const expBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as SessionPayload;
    if (!payload.uid || !payload.exp || Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    try {
      result[key] = decodeURIComponent(val);
    } catch {
      result[key] = val;
    }
  }
  return result;
}

function isHttpsRequest(req: Request): boolean {
  const proto = String(req.headers['x-forwarded-proto'] ?? '').toLowerCase();
  return req.secure || proto === 'https';
}

export function setSessionCookie(req: Request, res: Response, token: string): void {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const encoded = encodeURIComponent(token);
  if (isHttpsRequest(req)) {
    res.setHeader(
      'Set-Cookie',
      `${COOKIE_NAME}=${encoded}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=None; Partitioned`
    );
  } else {
    res.setHeader(
      'Set-Cookie',
      `${COOKIE_NAME}=${encoded}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`
    );
  }
}

export function clearSessionCookie(req: Request, res: Response): void {
  if (isHttpsRequest(req)) {
    res.setHeader(
      'Set-Cookie',
      `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None; Partitioned`
    );
  } else {
    res.setHeader(
      'Set-Cookie',
      `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`
    );
  }
}

export function attachAuth(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction
): void {
  let token: string | null = null;
  let viaCookie = false;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice('Bearer '.length).trim();
  } else {
    const cookies = parseCookies(req.headers.cookie);
    if (cookies[COOKIE_NAME]) {
      token = cookies[COOKIE_NAME];
      viaCookie = true;
    }
  }

  if (!token) {
    req.authUser = null;
    req.authViaCookie = false;
    next();
    return;
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    req.authUser = null;
    req.authViaCookie = false;
    next();
    return;
  }

  const liveUser = getUserById(payload.uid);
  req.authUser = liveUser;
  req.authViaCookie = viaCookie;
  next();
}

export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.authUser) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  // CSRF check when authenticating via HttpOnly cookie without Bearer header
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
  if (mutating && req.authViaCookie) {
    const customHeader = req.headers['x-requested-with'];
    const origin = req.headers.origin;
    const host = (req.headers['x-forwarded-host'] || req.headers.host) as string | undefined;

    let originMatchesHost = false;
    if (origin && host) {
      try {
        originMatchesHost = new URL(origin).host === host;
      } catch {
        originMatchesHost = false;
      }
    }

    if (customHeader !== 'CampusConnect' && !originMatchesHost) {
      res.status(403).json({ error: 'Invalid request origin.' });
      return;
    }
  }

  next();
}

export function requireRole(role: UserRole) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (req.authUser.role !== role) {
      res.status(403).json({
        error: `Access restricted to ${role} accounts.`,
      });
      return;
    }
    next();
  };
}

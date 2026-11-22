import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { getDb, memoryStore } from '../db/index.ts';
import { apiKeys } from '../db/schema.ts';
import type { AuthUser } from '../types.ts';

const EPHEMERAL_SECRET = crypto.randomBytes(32).toString('hex');

function getAuthSecret(): string {
  const envSecret = process.env.AUTH_SECRET?.trim();
  return envSecret && envSecret.length >= 16 ? envSecret : EPHEMERAL_SECRET;
}

// --- User Authentication (App Login) ---

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

interface TokenPayload {
  uid: number;
  email: string;
  role: string;
  exp: number;
}

export function createSessionToken(user: Pick<AuthUser, 'id' | 'email' | 'role'>): string {
  const payload: TokenPayload = {
    uid: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', getAuthSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifySessionToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  if (!encoded || !signature) return null;

  const expectedSig = crypto
    .createHmac('sha256', getAuthSecret())
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as TokenPayload;
    if (!parsed.uid || !parsed.exp || parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export interface AuthenticatedRequest extends Request {
  auth?: TokenPayload;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'User authentication required (Bearer token missing).' });
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  const payload = verifySessionToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired user session token.' });
    return;
  }
  req.auth = payload;
  next();
}

// --- External Ingest API Authentication (API Key only) ---

export function generateRawApiKey(): { rawKey: string; prefix: string; keyHash: string } {
  const secretPart = crypto.randomBytes(24).toString('hex');
  const rawKey = `jk_live_${secretPart}`;
  const prefix = rawKey.slice(0, 14) + '...';
  const keyHash = hashApiKey(rawKey);
  return { rawKey, prefix, keyHash };
}

export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey, 'utf8').digest('hex');
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function requireIngestApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const headerKey =
    (typeof req.headers['x-api-key'] === 'string' ? req.headers['x-api-key'].trim() : '') ||
    (typeof req.headers.authorization === 'string' &&
    req.headers.authorization.startsWith('ApiKey ')
      ? req.headers.authorization.slice('ApiKey '.length).trim()
      : '');

  if (!headerKey) {
    res.status(401).json({
      error: 'Missing Ingest API key. Provide X-API-Key header or Authorization: ApiKey <key>.',
    });
    return;
  }

  // 1. Check static INGEST_API_KEY configured via environment secret
  const envIngestKey = process.env.INGEST_API_KEY?.trim();
  if (envIngestKey && timingSafeEqualStr(headerKey, envIngestKey)) {
    next();
    return;
  }

  // 2. Check hashed API keys persisted in DB (or memoryStore fallback)
  const incomingHash = hashApiKey(headerKey);
  try {
    const db = getDb();
    if (!db) {
      const match = memoryStore.apiKeys.find((k) => timingSafeEqualStr(k.keyHash, incomingHash));
      if (match) {
        match.lastUsedAt = new Date().toISOString();
        next();
        return;
      }
      res.status(403).json({ error: 'Invalid Ingest API key.' });
      return;
    }

    const [match] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, incomingHash))
      .limit(1);

    if (!match) {
      res.status(403).json({ error: 'Invalid Ingest API key.' });
      return;
    }

    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, match.id));

    next();
  } catch (err) {
    console.error('Ingest API key verification error:', err);
    res.status(500).json({ error: 'Failed to verify Ingest API key.' });
  }
}

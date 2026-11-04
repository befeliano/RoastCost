import type { FastifyReply, FastifyRequest } from 'fastify';
import { SignJWT, jwtVerify } from 'jose';
import type { DbContext } from '../db';
import { forbidden, unauthorized } from '../lib/errors';

export interface AuthUser {
  userId: string;
  role: 'cafe_owner' | 'admin';
  cafeId: string | null;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthUser | null;
  }
}

export const ACCESS_TOKEN_TTL_SEC = 15 * 60;
const ISSUER = 'roastcost';
const AUDIENCE = 'roastcost-app';

export function jwtKeys(secret: string) {
  const key = new TextEncoder().encode(secret);
  return {
    async sign(u: AuthUser, now: Date): Promise<string> {
      const iat = Math.floor(now.getTime() / 1000);
      return new SignJWT({ role: u.role, cafe: u.cafeId })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setSubject(u.userId)
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setIssuedAt(iat)
        .setExpirationTime(iat + ACCESS_TOKEN_TTL_SEC)
        .sign(key);
    },
    async verify(token: string, now: Date): Promise<AuthUser | null> {
      try {
        const { payload } = await jwtVerify(token, key, {
          issuer: ISSUER,
          audience: AUDIENCE,
          algorithms: ['HS256'],
          currentDate: now,
        });
        const role = payload.role;
        if (typeof payload.sub !== 'string' || (role !== 'cafe_owner' && role !== 'admin'))
          return null;
        const cafe = payload.cafe;
        return { userId: payload.sub, role, cafeId: typeof cafe === 'string' ? cafe : null };
      } catch {
        return null;
      }
    },
  };
}
export type JwtKeys = ReturnType<typeof jwtKeys>;

/** preHandler: requires a valid access token. */
export async function requireAuth(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (!req.auth) throw unauthorized();
}

/** preHandler: admin only (role from the signed token). */
export async function requireAdmin(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (!req.auth) throw unauthorized();
  if (req.auth.role !== 'admin') throw forbidden();
}

/** preHandler: a cafe user (tenant routes). */
export async function requireCafe(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (!req.auth) throw unauthorized();
  if (!req.auth.cafeId) throw forbidden('no_cafe', 'Bu hesaba bağlı bir kafe yok.');
}

/** RLS context for the authenticated request. */
export function ctxOf(req: FastifyRequest, extra: Partial<DbContext> = {}): DbContext {
  const a = req.auth;
  return {
    userId: a?.userId ?? null,
    cafeId: a?.cafeId ?? null,
    isAdmin: a?.role === 'admin',
    ...extra,
  };
}

export function auth(req: FastifyRequest): AuthUser {
  if (!req.auth) throw unauthorized();
  return req.auth;
}

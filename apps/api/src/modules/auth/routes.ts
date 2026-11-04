import {
  emailOnlySchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  tokenOnlySchema,
} from '@roastcost/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { withCtx } from '../../db';
import { badRequest } from '../../lib/errors';
import { auth, requireAuth } from '../../plugins/auth';
import * as svc from './service';

const strict = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } };

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  const deps = app.deps;

  app.post(
    '/register',
    {
      ...strict,
      schema: {
        body: registerSchema.and(z.object({ deviceLabel: z.string().max(80).optional() })),
      },
    },
    async (req, reply) => {
      const s = await svc.register(deps, req.body, req.body.deviceLabel ?? null);
      return reply.status(201).send(s);
    },
  );

  app.post('/login', { ...strict, schema: { body: loginSchema } }, async (req) =>
    svc.login(deps, req.body.email, req.body.password, req.body.deviceLabel ?? null),
  );

  app.post(
    '/refresh',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } }, schema: { body: refreshSchema } },
    async (req) => svc.refresh(deps, req.body.refreshToken),
  );

  app.post('/logout', { schema: { body: refreshSchema } }, async (req, reply) => {
    await svc.logout(deps, req.body.refreshToken);
    return reply.status(204).send();
  });

  app.post('/logout-all', { onRequest: requireAuth }, async (req, reply) => {
    await withCtx(deps.db, { userId: auth(req).userId }, (tx) =>
      svc.revokeAllSessions(tx, auth(req).userId, deps.clock()),
    );
    return reply.status(204).send();
  });

  app.post('/verify-email', { ...strict, schema: { body: tokenOnlySchema } }, async (req) => {
    if (!(await svc.verifyEmail(deps, req.body.token)))
      throw badRequest('invalid_token', 'Bağlantı geçersiz ya da süresi dolmuş.');
    return { ok: true };
  });

  app.post(
    '/resend-verification',
    { onRequest: requireAuth, config: { rateLimit: { max: 3, timeWindow: '1 hour' } } },
    async (req) => {
      await svc.resendVerification(deps, auth(req).userId);
      return { ok: true };
    },
  );

  app.post(
    '/forgot-password',
    { config: { rateLimit: { max: 5, timeWindow: '1 hour' } }, schema: { body: emailOnlySchema } },
    async (req) => {
      await svc.forgotPassword(deps, req.body.email);
      return { ok: true };
    },
  );

  app.post('/reset-password', { ...strict, schema: { body: resetPasswordSchema } }, async (req) => {
    if (!(await svc.resetPassword(deps, req.body.token, req.body.password))) {
      throw badRequest('invalid_token', 'Bağlantı geçersiz ya da süresi dolmuş.');
    }
    return { ok: true };
  });
};

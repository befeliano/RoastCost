import compress from '@fastify/compress';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import {
  hasZodFastifySchemaValidationErrors,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { Config } from './config';
import type { Db } from './db';
import { AppError } from './lib/errors';
import type { Mailer } from './lib/mailer';
import { systemClock, type Clock } from './lib/time';
import { jwtKeys, type JwtKeys } from './plugins/auth';
import { adminRoutes } from './modules/admin/routes';
import { authRoutes } from './modules/auth/routes';
import { cafeRoutes } from './modules/cafe/routes';
import { catalogRoutes } from './modules/catalog/routes';
import { meRoutes } from './modules/me/routes';
import { orderRoutes } from './modules/orders/routes';
import { publicRoutes } from './modules/public/routes';

export interface Deps {
  config: Config;
  db: Db;
  mailer: Mailer;
  clock: Clock;
  jwt: JwtKeys;
}

export type App = FastifyInstance & { withTypeProvider: () => FastifyInstance };

declare module 'fastify' {
  interface FastifyInstance {
    deps: Deps;
  }
}

/** Mask tokens in URLs (/r/<token>, ?token=) and never log bodies. */
function maskUrl(url: string): string {
  return url.replace(/\/(r|v|reset)\/[^/?#]+/g, '/$1/***').replace(/(token=)[^&]+/g, '$1***');
}

export async function buildApp(
  input: Omit<Deps, 'clock' | 'jwt'> & {
    clock?: Clock;
    logger?: FastifyServerOptions['logger'];
    rateLimit?: boolean;
  },
) {
  const deps: Deps = {
    config: input.config,
    db: input.db,
    mailer: input.mailer,
    clock: input.clock ?? systemClock,
    jwt: jwtKeys(input.config.JWT_SECRET),
  };

  const app = Fastify({
    trustProxy: deps.config.TRUST_PROXY,
    bodyLimit: 256 * 1024,
    logger:
      input.logger ??
      (deps.config.NODE_ENV === 'test'
        ? false
        : {
            level: deps.config.LOG_LEVEL,
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.headers["x-forwarded-for"]',
              ],
              censor: '***',
            },
            serializers: {
              req: (req: { method: string; url: string }) => ({
                method: req.method,
                url: maskUrl(req.url),
              }),
            },
          }),
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorate('deps', deps);
  app.decorateRequest('auth', null);

  await app.register(helmet, {
    // JSON API + a few server-rendered pages without scripts.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        styleSrc: ["'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        formAction: ["'self'"],
        baseUri: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    referrerPolicy: { policy: 'no-referrer' },
    hsts:
      deps.config.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
    crossOriginResourcePolicy: { policy: 'same-origin' },
  });
  await app.register(compress, { global: true, encodings: ['br', 'gzip'], threshold: 1024 });
  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
    // tests turn limiting off except where they verify it
    ...(input.rateLimit === false ? { allowList: () => true } : {}),
    errorResponseBuilder: (_req, ctx) => ({
      statusCode: 429,
      error: {
        code: 'rate_limited',
        message: `Çok fazla istek. ${Math.ceil(ctx.ttl / 1000)} sn sonra tekrar deneyin.`,
      },
    }),
  });

  // Parse the bearer token on every request; route preHandlers decide what is required.
  app.addHook('onRequest', async (req) => {
    const h = req.headers.authorization;
    if (h?.startsWith('Bearer ')) req.auth = await deps.jwt.verify(h.slice(7), deps.clock());
  });

  app.setErrorHandler((err, req, reply) => {
    if (hasZodFastifySchemaValidationErrors(err)) {
      return reply.status(400).send({
        error: {
          code: 'validation_error',
          message: 'Gönderilen bilgiler geçersiz.',
          details: err.validation.map((v) => ({ path: v.instancePath, message: v.message })),
        },
      });
    }
    if (err instanceof AppError) {
      return reply
        .status(err.statusCode)
        .send({ error: { code: err.code, message: err.message, details: err.details } });
    }
    const e = err as { statusCode?: number; code?: string; message?: string; error?: unknown };
    if (e.statusCode === 429)
      return reply
        .status(429)
        .send(e.error ? e : { error: { code: 'rate_limited', message: 'Çok fazla istek.' } });
    if (e.statusCode && e.statusCode >= 400 && e.statusCode < 500) {
      return reply.status(e.statusCode).send({
        error: { code: e.code ?? 'bad_request', message: e.message ?? 'Geçersiz istek.' },
      });
    }
    req.log.error({ err }, 'unhandled error');
    return reply
      .status(500)
      .send({ error: { code: 'internal', message: 'Beklenmeyen bir hata oluştu.' } });
  });

  app.setNotFoundHandler((_req, reply) =>
    reply.status(404).send({ error: { code: 'not_found', message: 'Bulunamadı.' } }),
  );

  await app.register(publicRoutes);
  await app.register(
    async (v1) => {
      await v1.register(authRoutes, { prefix: '/auth' });
      await v1.register(meRoutes, { prefix: '/me' });
      await v1.register(cafeRoutes, { prefix: '/cafe' });
      await v1.register(catalogRoutes, { prefix: '/catalog' });
      await v1.register(orderRoutes, { prefix: '/orders' });
      await v1.register(adminRoutes, { prefix: '/admin' });
    },
    { prefix: '/v1' },
  );

  return app;
}

export type RoastApp = Awaited<ReturnType<typeof buildApp>>;

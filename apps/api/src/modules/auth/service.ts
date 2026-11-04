import { DEFAULT_MILK, RECIPE_TEMPLATES, type RegisterInput } from '@roastcost/shared';
import type { Deps } from '../../app';
import { SYSTEM, withCtx, type Tx } from '../../db';
import { getDummyHash, hashPassword, randomToken, sha256, verifyPassword } from '../../lib/crypto';
import { AppError, conflict, unauthorized } from '../../lib/errors';
import { addDays, addMinutes } from '../../lib/time';
import { ACCESS_TOKEN_TTL_SEC, type AuthUser } from '../../plugins/auth';

export const REFRESH_TTL_DAYS = 30;
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;
const VERIFY_TTL_HOURS = 48;
const RESET_TTL_MINUTES = 60;

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

async function cafeIdOf(tx: Tx, userId: string): Promise<string | null> {
  const m = await tx
    .selectFrom('cafe_members')
    .select('cafe_id')
    .where('user_id', '=', userId)
    .orderBy('created_at')
    .executeTakeFirst();
  return m?.cafe_id ?? null;
}

async function issueSession(
  deps: Deps,
  tx: Tx,
  u: AuthUser,
  familyId: string | null,
  deviceLabel: string | null,
): Promise<Session & { id: string }> {
  const now = deps.clock();
  const refreshToken = randomToken();
  const row = await tx
    .insertInto('refresh_tokens')
    .values({
      user_id: u.userId,
      family_id: familyId ?? crypto.randomUUID(),
      token_hash: sha256(refreshToken),
      device_label: deviceLabel,
      expires_at: addDays(now, REFRESH_TTL_DAYS),
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  return {
    id: row.id,
    accessToken: await deps.jwt.sign(u, now),
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SEC,
  };
}

async function createEmailToken(
  deps: Deps,
  tx: Tx,
  userId: string,
  purpose: 'verify_email' | 'reset_password',
): Promise<string> {
  const now = deps.clock();
  // older unused tokens of the same purpose stop working
  await tx
    .updateTable('email_tokens')
    .set({ used_at: now })
    .where('user_id', '=', userId)
    .where('purpose', '=', purpose)
    .where('used_at', 'is', null)
    .execute();
  const token = randomToken();
  await tx
    .insertInto('email_tokens')
    .values({
      user_id: userId,
      purpose,
      token_hash: sha256(token),
      expires_at:
        purpose === 'verify_email'
          ? addMinutes(now, VERIFY_TTL_HOURS * 60)
          : addMinutes(now, RESET_TTL_MINUTES),
    })
    .execute();
  return token;
}

function verifyMail(deps: Deps, to: string, token: string) {
  const url = `${deps.config.PUBLIC_BASE_URL}/v/${token}`;
  return deps.mailer.send({
    to,
    subject: 'RoastCost — e-posta adresinizi doğrulayın',
    text: `Merhaba,\n\nRoastCost hesabınızı doğrulamak için bağlantıyı açın (${VERIFY_TTL_HOURS} saat geçerli):\n${url}\n\nBu kaydı siz yapmadıysanız bu e-postayı yok sayın.`,
  });
}

function resetMail(deps: Deps, to: string, token: string) {
  const url = `${deps.config.PUBLIC_BASE_URL}/reset/${token}`;
  return deps.mailer.send({
    to,
    subject: 'RoastCost — parola sıfırlama',
    text: `Merhaba,\n\nParolanızı sıfırlamak için bağlantıyı açın (${RESET_TTL_MINUTES} dakika geçerli, tek kullanımlık):\n${url}\n\nBu isteği siz yapmadıysanız parolanız değişmez; e-postayı yok sayabilirsiniz.`,
  });
}

export async function register(
  deps: Deps,
  input: RegisterInput,
  deviceLabel: string | null,
): Promise<Session> {
  const passwordHash = await hashPassword(input.password);
  const { session, verifyToken } = await withCtx(deps.db, SYSTEM, async (tx) => {
    const exists = await tx
      .selectFrom('users')
      .select('id')
      .where('email', '=', input.email)
      .executeTakeFirst();
    if (exists) throw conflict('email_taken', 'Bu e-posta ile kayıtlı bir hesap var.');

    const user = await tx
      .insertInto('users')
      .values({ email: input.email, password_hash: passwordHash })
      .returning('id')
      .executeTakeFirstOrThrow();
    const cafe = await tx
      .insertInto('cafes')
      .values({ name: input.cafeName, district: input.district, phone_e164: input.phone })
      .returning('id')
      .executeTakeFirstOrThrow();
    await tx.insertInto('cafe_members').values({ cafe_id: cafe.id, user_id: user.id }).execute();
    await tx.insertInto('cafe_settings').values({ cafe_id: cafe.id }).execute();
    await seedCafeDefaults(tx, cafe.id);
    await tx
      .insertInto('consents')
      .values(
        input.consents.map((c) => ({
          user_id: user.id,
          doc_type: c.docType,
          doc_version: c.docVersion,
        })),
      )
      .execute();
    const verifyToken = await createEmailToken(deps, tx, user.id, 'verify_email');
    const session = await issueSession(
      deps,
      tx,
      { userId: user.id, role: 'cafe_owner', cafeId: cafe.id },
      null,
      deviceLabel,
    );
    return { session, verifyToken };
  });
  await verifyMail(deps, input.email, verifyToken);
  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresIn: session.expiresIn,
  };
}

/** Default "Süt" ingredient + 6 template recipes (spec §6.3). */
export async function seedCafeDefaults(tx: Tx, cafeId: string): Promise<void> {
  const milk = await tx
    .insertInto('cafe_ingredients')
    .values({
      cafe_id: cafeId,
      name: DEFAULT_MILK.name,
      kind: DEFAULT_MILK.kind,
      price_per_liter_kurus: DEFAULT_MILK.pricePerLiterKurus,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  for (const [i, t] of RECIPE_TEMPLATES.entries()) {
    const r = await tx
      .insertInto('recipes')
      .values({
        cafe_id: cafeId,
        name: t.name,
        template_key: t.key,
        uses_cup: t.usesCup,
        sort_order: i,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    if (t.milkMl > 0) {
      await tx
        .insertInto('recipe_ingredients')
        .values({ recipe_id: r.id, ingredient_id: milk.id, quantity_ml: t.milkMl })
        .execute();
    }
    // Syrup is not created: the cafe picks its own syrup (the app warns on Mocha until then).
  }
}

export async function login(
  deps: Deps,
  email: string,
  password: string,
  deviceLabel: string | null,
): Promise<Session> {
  const now = deps.clock();
  const user = await withCtx(deps.db, SYSTEM, (tx) =>
    tx
      .selectFrom('users')
      .select(['id', 'password_hash', 'role', 'locked_until', 'failed_login_count'])
      .where('email', '=', email)
      .where('deleted_at', 'is', null)
      .executeTakeFirst(),
  );
  if (!user) {
    await verifyPassword(await getDummyHash(), password);
    throw unauthorized('invalid_credentials', 'E-posta veya parola hatalı.');
  }
  if (user.locked_until && user.locked_until > now) {
    const mins = Math.ceil((user.locked_until.getTime() - now.getTime()) / 60_000);
    throw new AppError(
      423,
      'account_locked',
      `Çok fazla hatalı deneme. ${mins} dakika sonra tekrar deneyin.`,
    );
  }
  if (!(await verifyPassword(user.password_hash, password))) {
    const failed = user.failed_login_count + 1;
    const lock = failed >= MAX_FAILED_LOGINS;
    await withCtx(deps.db, SYSTEM, (tx) =>
      tx
        .updateTable('users')
        .set({
          failed_login_count: lock ? 0 : failed,
          locked_until: lock ? addMinutes(now, LOCK_MINUTES) : null,
        })
        .where('id', '=', user.id)
        .execute(),
    );
    throw unauthorized('invalid_credentials', 'E-posta veya parola hatalı.');
  }
  return withCtx(deps.db, SYSTEM, async (tx) => {
    if (user.failed_login_count > 0 || user.locked_until) {
      await tx
        .updateTable('users')
        .set({ failed_login_count: 0, locked_until: null })
        .where('id', '=', user.id)
        .execute();
    }
    const cafeId = await cafeIdOf(tx, user.id);
    const s = await issueSession(
      deps,
      tx,
      { userId: user.id, role: user.role, cafeId },
      null,
      deviceLabel,
    );
    return { accessToken: s.accessToken, refreshToken: s.refreshToken, expiresIn: s.expiresIn };
  });
}

export async function refresh(deps: Deps, refreshToken: string): Promise<Session> {
  const now = deps.clock();
  const hash = sha256(refreshToken);
  const result = await withCtx(deps.db, SYSTEM, async (tx) => {
    const row = await tx
      .selectFrom('refresh_tokens as t')
      .innerJoin('users as u', 'u.id', 't.user_id')
      .select([
        't.id',
        't.user_id',
        't.family_id',
        't.revoked_at',
        't.expires_at',
        't.device_label',
        'u.role',
        'u.deleted_at',
      ])
      .where('t.token_hash', '=', hash)
      .executeTakeFirst();
    if (!row) return { error: 'invalid' as const };
    if (row.revoked_at) {
      // Reuse of a rotated token → assume theft, kill the whole family.
      await tx
        .updateTable('refresh_tokens')
        .set({ revoked_at: now })
        .where('family_id', '=', row.family_id)
        .where('revoked_at', 'is', null)
        .execute();
      return { error: 'reused' as const };
    }
    if (row.expires_at <= now || row.deleted_at) return { error: 'invalid' as const };
    const cafeId = await cafeIdOf(tx, row.user_id);
    const s = await issueSession(
      deps,
      tx,
      { userId: row.user_id, role: row.role, cafeId },
      row.family_id,
      row.device_label,
    );
    await tx
      .updateTable('refresh_tokens')
      .set({ revoked_at: now, replaced_by: s.id })
      .where('id', '=', row.id)
      .execute();
    return { session: s };
  });
  if ('error' in result) {
    throw unauthorized(
      result.error === 'reused' ? 'refresh_reused' : 'invalid_refresh',
      'Oturumun süresi doldu, lütfen tekrar giriş yapın.',
    );
  }
  return {
    accessToken: result.session.accessToken,
    refreshToken: result.session.refreshToken,
    expiresIn: result.session.expiresIn,
  };
}

export async function logout(deps: Deps, refreshToken: string): Promise<void> {
  const now = deps.clock();
  await withCtx(deps.db, SYSTEM, async (tx) => {
    const row = await tx
      .selectFrom('refresh_tokens')
      .select('family_id')
      .where('token_hash', '=', sha256(refreshToken))
      .executeTakeFirst();
    if (row)
      await tx
        .updateTable('refresh_tokens')
        .set({ revoked_at: now })
        .where('family_id', '=', row.family_id)
        .where('revoked_at', 'is', null)
        .execute();
  });
}

export async function revokeAllSessions(tx: Tx, userId: string, now: Date): Promise<void> {
  await tx
    .updateTable('refresh_tokens')
    .set({ revoked_at: now })
    .where('user_id', '=', userId)
    .where('revoked_at', 'is', null)
    .execute();
}

export async function verifyEmail(deps: Deps, token: string): Promise<boolean> {
  const now = deps.clock();
  return withCtx(deps.db, SYSTEM, async (tx) => {
    const row = await tx
      .selectFrom('email_tokens')
      .select(['id', 'user_id'])
      .where('token_hash', '=', sha256(token))
      .where('purpose', '=', 'verify_email')
      .where('used_at', 'is', null)
      .where('expires_at', '>', now)
      .executeTakeFirst();
    if (!row) return false;
    await tx.updateTable('email_tokens').set({ used_at: now }).where('id', '=', row.id).execute();
    await tx
      .updateTable('users')
      .set({ email_verified_at: now })
      .where('id', '=', row.user_id)
      .where('email_verified_at', 'is', null)
      .execute();
    return true;
  });
}

export async function resendVerification(deps: Deps, userId: string): Promise<void> {
  const r = await withCtx(deps.db, SYSTEM, async (tx) => {
    const u = await tx
      .selectFrom('users')
      .select(['email', 'email_verified_at'])
      .where('id', '=', userId)
      .executeTakeFirst();
    if (!u || u.email_verified_at) return null;
    return { email: u.email, token: await createEmailToken(deps, tx, userId, 'verify_email') };
  });
  if (r) await verifyMail(deps, r.email, r.token);
}

export async function forgotPassword(deps: Deps, email: string): Promise<void> {
  const r = await withCtx(deps.db, SYSTEM, async (tx) => {
    const u = await tx
      .selectFrom('users')
      .select(['id', 'email'])
      .where('email', '=', email)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    if (!u) return null;
    return { email: u.email, token: await createEmailToken(deps, tx, u.id, 'reset_password') };
  });
  // Same response whether or not the account exists (no user enumeration).
  if (r) await resetMail(deps, r.email, r.token);
}

export async function resetPassword(
  deps: Deps,
  token: string,
  newPassword: string,
): Promise<boolean> {
  const now = deps.clock();
  const passwordHash = await hashPassword(newPassword);
  return withCtx(deps.db, SYSTEM, async (tx) => {
    const row = await tx
      .selectFrom('email_tokens')
      .select(['id', 'user_id'])
      .where('token_hash', '=', sha256(token))
      .where('purpose', '=', 'reset_password')
      .where('used_at', 'is', null)
      .where('expires_at', '>', now)
      .executeTakeFirst();
    if (!row) return false;
    await tx.updateTable('email_tokens').set({ used_at: now }).where('id', '=', row.id).execute();
    await tx
      .updateTable('users')
      .set({ password_hash: passwordHash, failed_login_count: 0, locked_until: null })
      .where('id', '=', row.user_id)
      .execute();
    await revokeAllSessions(tx, row.user_id, now);
    return true;
  });
}

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  PASSWORD,
  bearer,
  consents,
  mailToken,
  makeAdminUser,
  makeTestApp,
  register,
  type TestCtx,
} from './app-helpers';
import { appPool, ownerPool, truncateAll } from './db-helpers';

let t: TestCtx;
beforeAll(async () => {
  t = await makeTestApp();
});
afterAll(async () => {
  await t.app.close();
  await t.db.destroy();
  await appPool.end();
  await ownerPool.end();
});
beforeEach(async () => {
  await truncateAll();
  t.mailer.outbox.length = 0;
  t.clock.now = new Date('2026-11-04T09:00:00Z');
});

const login = (email: string, password = PASSWORD) =>
  t.app.inject({ method: 'POST', url: '/v1/auth/login', payload: { email, password } });

describe('register', () => {
  it('creates a pending cafe with defaults, consents and sends a verification mail', async () => {
    const s = await register(t, 'Kafe@Ornek.com', 'Köşe Fincan');
    const me = (
      await t.app.inject({ method: 'GET', url: '/v1/me', headers: bearer(s.accessToken) })
    ).json();
    expect(me.user.email).toBe('kafe@ornek.com');
    expect(me.user.emailVerified).toBe(false);
    expect(me.cafe).toMatchObject({
      name: 'Köşe Fincan',
      status: 'pending',
      phone: '+905321112233',
    });
    expect(me.missingConsents).toEqual([]);

    const recipes = (
      await t.app.inject({ method: 'GET', url: '/v1/cafe/recipes', headers: bearer(s.accessToken) })
    ).json();
    expect(recipes.map((r: { templateKey: string }) => r.templateKey)).toEqual([
      'espresso',
      'americano',
      'latte',
      'cortado',
      'cappuccino',
      'mocha',
    ]);
    const latte = recipes.find((r: { templateKey: string }) => r.templateKey === 'latte');
    expect(latte.ingredients[0].quantityMl).toBe(200);
    const ings = (
      await t.app.inject({
        method: 'GET',
        url: '/v1/cafe/ingredients',
        headers: bearer(s.accessToken),
      })
    ).json();
    expect(ings).toHaveLength(1);
    expect(ings[0]).toMatchObject({ name: 'Süt', kind: 'milk' });
    expect(t.mailer.last('kafe@ornek.com')?.subject).toMatch(/doğrulayın/);
  });

  it('rejects duplicate e-mail, missing consents and short passwords', async () => {
    await register(t, 'a@ornek.com');
    const dup = await t.app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'A@ornek.com',
        password: PASSWORD,
        cafeName: 'X Kafe',
        district: 'Tepebaşı',
        phone: '05321112233',
        consents,
      },
    });
    expect(dup.statusCode).toBe(409);
    expect(dup.json().error.code).toBe('email_taken');
    const noConsent = await t.app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'b@ornek.com',
        password: PASSWORD,
        cafeName: 'X Kafe',
        district: 'Tepebaşı',
        phone: '05321112233',
        consents: consents.slice(0, 2),
      },
    });
    expect(noConsent.statusCode).toBe(400);
    expect(noConsent.json().error.code).toBe('validation_error');
    const shortPw = await t.app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'c@ornek.com',
        password: 'kisa',
        cafeName: 'X Kafe',
        district: 'Tepebaşı',
        phone: '05321112233',
        consents,
      },
    });
    expect(shortPw.statusCode).toBe(400);
  });
});

describe('login, lockout, refresh rotation', () => {
  it('locks the account after 5 failures for 15 minutes', async () => {
    await register(t, 'k@ornek.com');
    for (let i = 0; i < 4; i++)
      expect((await login('k@ornek.com', 'yanlis-parola-1')).statusCode).toBe(401);
    expect((await login('k@ornek.com', 'yanlis-parola-1')).statusCode).toBe(401); // 5th → locks
    const locked = await login('k@ornek.com');
    expect(locked.statusCode).toBe(423);
    expect(locked.json().error.code).toBe('account_locked');
    t.clock.advance(16 * 60_000);
    expect((await login('k@ornek.com')).statusCode).toBe(200);
  });

  it('does not reveal whether an e-mail exists', async () => {
    const r = await login('yok@ornek.com');
    expect(r.statusCode).toBe(401);
    expect(r.json().error.code).toBe('invalid_credentials');
  });

  it('rotates refresh tokens and kills the family on reuse', async () => {
    const s = await register(t, 'r@ornek.com');
    const r1 = await t.app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken: s.refreshToken },
    });
    expect(r1.statusCode).toBe(200);
    const s2 = r1.json();
    expect(s2.refreshToken).not.toBe(s.refreshToken);
    // the old token is replayed → theft assumed
    const replay = await t.app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken: s.refreshToken },
    });
    expect(replay.statusCode).toBe(401);
    expect(replay.json().error.code).toBe('refresh_reused');
    // ...and the legitimate new token is revoked too
    const after = await t.app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken: s2.refreshToken },
    });
    expect(after.statusCode).toBe(401);
  });

  it('refresh tokens expire after 30 days; access tokens after 15 minutes', async () => {
    const s = await register(t, 'e@ornek.com');
    t.clock.advance(16 * 60_000);
    expect(
      (await t.app.inject({ method: 'GET', url: '/v1/me', headers: bearer(s.accessToken) }))
        .statusCode,
    ).toBe(401);
    t.clock.advance(31 * 86_400_000);
    expect(
      (
        await t.app.inject({
          method: 'POST',
          url: '/v1/auth/refresh',
          payload: { refreshToken: s.refreshToken },
        })
      ).statusCode,
    ).toBe(401);
  });

  it('logout revokes the session', async () => {
    const s = await register(t, 'l@ornek.com');
    expect(
      (
        await t.app.inject({
          method: 'POST',
          url: '/v1/auth/logout',
          payload: { refreshToken: s.refreshToken },
        })
      ).statusCode,
    ).toBe(204);
    expect(
      (
        await t.app.inject({
          method: 'POST',
          url: '/v1/auth/refresh',
          payload: { refreshToken: s.refreshToken },
        })
      ).statusCode,
    ).toBe(401);
  });
});

describe('e-mail verification and password reset', () => {
  it('verifies once via the e-mail link (GET shows a button, POST verifies)', async () => {
    const s = await register(t, 'v@ornek.com');
    const token = mailToken(t, 'v@ornek.com', 'v');
    const page = await t.app.inject({ method: 'GET', url: `/v/${token}` });
    expect(page.statusCode).toBe(200);
    expect(
      (await t.app.inject({ method: 'GET', url: '/v1/me', headers: bearer(s.accessToken) })).json()
        .user.emailVerified,
    ).toBe(false);
    expect((await t.app.inject({ method: 'POST', url: `/v/${token}` })).statusCode).toBe(200);
    expect(
      (await t.app.inject({ method: 'GET', url: '/v1/me', headers: bearer(s.accessToken) })).json()
        .user.emailVerified,
    ).toBe(true);
    expect((await t.app.inject({ method: 'POST', url: `/v/${token}` })).statusCode).toBe(400); // single use
  });

  it('resets the password, revokes sessions; forgot-password never reveals accounts', async () => {
    const s = await register(t, 'p@ornek.com');
    expect(
      (
        await t.app.inject({
          method: 'POST',
          url: '/v1/auth/forgot-password',
          payload: { email: 'yok@ornek.com' },
        })
      ).json(),
    ).toEqual({ ok: true });
    expect(
      (
        await t.app.inject({
          method: 'POST',
          url: '/v1/auth/forgot-password',
          payload: { email: 'p@ornek.com' },
        })
      ).json(),
    ).toEqual({ ok: true });
    const token = mailToken(t, 'p@ornek.com', 'reset');
    const r = await t.app.inject({
      method: 'POST',
      url: '/v1/auth/reset-password',
      payload: { token, password: 'yepyeni-parola-42' },
    });
    expect(r.statusCode).toBe(200);
    expect((await login('p@ornek.com')).statusCode).toBe(401);
    expect((await login('p@ornek.com', 'yepyeni-parola-42')).statusCode).toBe(200);
    expect(
      (
        await t.app.inject({
          method: 'POST',
          url: '/v1/auth/refresh',
          payload: { refreshToken: s.refreshToken },
        })
      ).statusCode,
    ).toBe(401);
    // reset link is single use and expires after 1 hour
    expect(
      (
        await t.app.inject({
          method: 'POST',
          url: '/v1/auth/reset-password',
          payload: { token, password: 'baska-parola-999' },
        })
      ).statusCode,
    ).toBe(400);
    await t.app.inject({
      method: 'POST',
      url: '/v1/auth/forgot-password',
      payload: { email: 'p@ornek.com' },
    });
    const t2 = mailToken(t, 'p@ornek.com', 'reset');
    t.clock.advance(61 * 60_000);
    expect(
      (
        await t.app.inject({
          method: 'POST',
          url: '/v1/auth/reset-password',
          payload: { token: t2, password: 'baska-parola-999' },
        })
      ).statusCode,
    ).toBe(400);
  });

  it('web reset form works and validates', async () => {
    await register(t, 'w@ornek.com');
    await t.app.inject({
      method: 'POST',
      url: '/v1/auth/forgot-password',
      payload: { email: 'w@ornek.com' },
    });
    const token = mailToken(t, 'w@ornek.com', 'reset');
    const mismatch = await t.app.inject({
      method: 'POST',
      url: `/reset/${token}`,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'password=yepyeni-parola-42&password2=farkli-parola-42',
    });
    expect(mismatch.statusCode).toBe(400);
    const ok = await t.app.inject({
      method: 'POST',
      url: `/reset/${token}`,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'password=yepyeni-parola-42&password2=yepyeni-parola-42',
    });
    expect(ok.statusCode).toBe(200);
    expect((await login('w@ornek.com', 'yepyeni-parola-42')).statusCode).toBe(200);
  });

  it('change-password requires the current password and logs out every device', async () => {
    const s = await register(t, 'c@ornek.com');
    const bad = await t.app.inject({
      method: 'POST',
      url: '/v1/me/change-password',
      headers: bearer(s.accessToken),
      payload: { currentPassword: 'yanlis', newPassword: 'yepyeni-parola-42' },
    });
    expect(bad.statusCode).toBe(400);
    const ok = await t.app.inject({
      method: 'POST',
      url: '/v1/me/change-password',
      headers: bearer(s.accessToken),
      payload: { currentPassword: PASSWORD, newPassword: 'yepyeni-parola-42' },
    });
    expect(ok.statusCode).toBe(200);
    expect(
      (
        await t.app.inject({
          method: 'POST',
          url: '/v1/auth/refresh',
          payload: { refreshToken: s.refreshToken },
        })
      ).statusCode,
    ).toBe(401);
  });
});

describe('export and account deletion (KVKK / store rules)', () => {
  it('exports own data and deletes the account with anonymisation', async () => {
    const s = await register(t, 'd@ornek.com', 'Silinecek Kafe');
    const exp = await t.app.inject({
      method: 'GET',
      url: '/v1/me/export',
      headers: bearer(s.accessToken),
    });
    expect(exp.statusCode).toBe(200);
    const data = exp.json();
    expect(data.user.email).toBe('d@ornek.com');
    expect(data.user.password_hash).toBeUndefined();
    expect(data.recipes).toHaveLength(6);

    const wrong = await t.app.inject({
      method: 'DELETE',
      url: '/v1/me',
      headers: bearer(s.accessToken),
      payload: { password: 'yanlis' },
    });
    expect(wrong.statusCode).toBe(400);
    const del = await t.app.inject({
      method: 'DELETE',
      url: '/v1/me',
      headers: bearer(s.accessToken),
      payload: { password: PASSWORD },
    });
    expect(del.statusCode).toBe(204);

    const u = (await ownerPool.query(`select email, deleted_at from users`)).rows[0];
    expect(u.email).toMatch(/^deleted-.*@deleted\.invalid$/);
    expect(u.deleted_at).not.toBeNull();
    const c = (await ownerPool.query(`select name, phone_e164, deleted_at from cafes`)).rows[0];
    expect(c).toMatchObject({ name: 'Silinmiş kafe', phone_e164: '+900000000000' });
    expect((await ownerPool.query(`select count(*)::int as n from recipes`)).rows[0].n).toBe(0);
    expect((await login('d@ornek.com')).statusCode).toBe(401);
    expect(
      (
        await t.app.inject({
          method: 'POST',
          url: '/v1/auth/refresh',
          payload: { refreshToken: s.refreshToken },
        })
      ).statusCode,
    ).toBe(401);
    // the e-mail can be used again for a fresh account
    await register(t, 'd@ornek.com');
  });

  it('web deletion form (Google Play requirement)', async () => {
    await register(t, 'web@ornek.com');
    const page = await t.app.inject({ method: 'GET', url: '/account-deletion' });
    expect(page.statusCode).toBe(200);
    expect(page.body).toContain('Hesabımı kalıcı olarak sil');
    const form = { 'content-type': 'application/x-www-form-urlencoded' };
    expect(
      (
        await t.app.inject({
          method: 'POST',
          url: '/account-deletion',
          headers: form,
          payload: 'email=web%40ornek.com&password=yanlis',
        })
      ).statusCode,
    ).toBe(400);
    const ok = await t.app.inject({
      method: 'POST',
      url: '/account-deletion',
      headers: form,
      payload: `email=web%40ornek.com&password=${encodeURIComponent(PASSWORD)}`,
    });
    expect(ok.statusCode).toBe(200);
    expect((await login('web@ornek.com')).statusCode).toBe(401);
  });
});

describe('authorization boundaries through the API', () => {
  it('requires a token, and cafe users cannot reach admin endpoints', async () => {
    expect((await t.app.inject({ method: 'GET', url: '/v1/me' })).statusCode).toBe(401);
    expect(
      (await t.app.inject({ method: 'GET', url: '/v1/me', headers: bearer('forged.token.value') }))
        .statusCode,
    ).toBe(401);
    const s = await register(t, 'x@ornek.com');
    for (const url of [
      '/v1/admin/stats',
      '/v1/admin/cafes',
      '/v1/admin/roasters',
      '/v1/admin/orders',
      '/v1/admin/audit-logs',
    ]) {
      expect(
        (await t.app.inject({ method: 'GET', url, headers: bearer(s.accessToken) })).statusCode,
        url,
      ).toBe(403);
    }
  });

  it('cafe A cannot read or modify cafe B data via the API', async () => {
    const a = await register(t, 'a@ornek.com', 'Kafe A');
    const b = await register(t, 'b@ornek.com', 'Kafe B');
    const bRecipes = (
      await t.app.inject({ method: 'GET', url: '/v1/cafe/recipes', headers: bearer(b.accessToken) })
    ).json();
    const bIngs = (
      await t.app.inject({
        method: 'GET',
        url: '/v1/cafe/ingredients',
        headers: bearer(b.accessToken),
      })
    ).json();
    const target = bRecipes[0].id;
    const aRecipes = (
      await t.app.inject({ method: 'GET', url: '/v1/cafe/recipes', headers: bearer(a.accessToken) })
    ).json();
    expect(aRecipes.map((r: { id: string }) => r.id)).not.toContain(target);
    expect(
      (
        await t.app.inject({
          method: 'PATCH',
          url: `/v1/cafe/recipes/${target}`,
          headers: bearer(a.accessToken),
          payload: { name: 'hack' },
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await t.app.inject({
          method: 'DELETE',
          url: `/v1/cafe/recipes/${target}`,
          headers: bearer(a.accessToken),
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await t.app.inject({
          method: 'DELETE',
          url: `/v1/cafe/ingredients/${bIngs[0].id}`,
          headers: bearer(a.accessToken),
        })
      ).statusCode,
    ).toBe(404);
    // using B's ingredient inside A's recipe is rejected
    const bad = await t.app.inject({
      method: 'POST',
      url: '/v1/cafe/recipes',
      headers: bearer(a.accessToken),
      payload: {
        name: 'Çapraz',
        usesCup: true,
        ingredients: [{ ingredientId: bIngs[0].id, quantityMl: 100 }],
      },
    });
    expect(bad.statusCode).toBe(400);
    expect(
      (await ownerPool.query(`select name from recipes where id = $1`, [target])).rows[0].name,
    ).not.toBe('hack');
  });

  it('pending cafe cannot see the catalog; admin approval opens it', async () => {
    const admin = await makeAdminUser(t);
    const s = await register(t, 'pending@ornek.com');
    const sync = await t.app.inject({
      method: 'GET',
      url: '/v1/catalog/sync',
      headers: bearer(s.accessToken),
    });
    expect(sync.statusCode).toBe(403);
    expect(sync.json().error.code).toBe('cafe_not_approved');
    const pending = (
      await t.app.inject({
        method: 'GET',
        url: '/v1/admin/cafes?status=pending',
        headers: bearer(admin),
      })
    ).json();
    expect(pending.items).toHaveLength(1);
    const ap = await t.app.inject({
      method: 'POST',
      url: `/v1/admin/cafes/${pending.items[0].id}/approve`,
      headers: bearer(admin),
      payload: { note: 'Tanışıldı' },
    });
    expect(ap.json().status).toBe('approved');
    expect(
      (
        await t.app.inject({
          method: 'GET',
          url: '/v1/catalog/sync',
          headers: bearer(s.accessToken),
        })
      ).statusCode,
    ).toBe(200);
    const logs = (
      await t.app.inject({
        method: 'GET',
        url: '/v1/admin/audit-logs?entity=cafe',
        headers: bearer(admin),
      })
    ).json();
    expect(logs.items[0]).toMatchObject({ action: 'cafe.approve', actor: 'admin@test.local' });
  });

  it('settings validation and update', async () => {
    const s = await register(t, 's@ornek.com');
    const bad = await t.app.inject({
      method: 'PATCH',
      url: '/v1/cafe/settings',
      headers: bearer(s.accessToken),
      payload: { targetMarginPct: 120 },
    });
    expect(bad.statusCode).toBe(400);
    const ok = await t.app.inject({
      method: 'PATCH',
      url: '/v1/cafe/settings',
      headers: bearer(s.accessToken),
      payload: { espressoDoseG: 20, cupCostKurus: 350 },
    });
    expect(ok.json()).toMatchObject({ espressoDoseG: 20, cupCostKurus: 350, targetMarginPct: 65 });
  });
});

describe('public pages', () => {
  it('healthz and legal pages', async () => {
    expect((await t.app.inject({ method: 'GET', url: '/healthz' })).json()).toEqual({ ok: true });
    for (const doc of ['kvkk', 'privacy', 'terms']) {
      const r = await t.app.inject({ method: 'GET', url: `/legal/${doc}` });
      expect(r.statusCode, doc).toBe(200);
      expect(r.body).toContain('TASLAK');
      expect(r.body).not.toContain('{{');
    }
    expect((await t.app.inject({ method: 'GET', url: '/legal/yok' })).statusCode).toBe(404);
  });

  it('sets security headers and a consistent error format', async () => {
    const r = await t.app.inject({ method: 'GET', url: '/v1/does-not-exist' });
    expect(r.statusCode).toBe(404);
    expect(r.json()).toEqual({ error: { code: 'not_found', message: 'Bulunamadı.' } });
    const h = await t.app.inject({ method: 'GET', url: '/legal/kvkk' });
    expect(h.headers['content-security-policy']).toContain("default-src 'none'");
    expect(h.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('rate limiting', () => {
  it('limits login attempts per IP', async () => {
    const limited = await makeTestApp({ rateLimit: true });
    try {
      const codes: number[] = [];
      for (let i = 0; i < 12; i++) {
        codes.push(
          (
            await limited.app.inject({
              method: 'POST',
              url: '/v1/auth/login',
              payload: { email: 'z@ornek.com', password: 'x' },
            })
          ).statusCode,
        );
      }
      expect(codes.slice(0, 10).every((c) => c === 401)).toBe(true);
      expect(codes.at(-1)).toBe(429);
    } finally {
      await limited.app.close();
      await limited.db.destroy();
    }
  });
});

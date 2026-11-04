import {
  decideFirstOrder,
  formatDateTr,
  formatKg,
  formatOrderNo,
  formatTRY,
  passwordSchema,
} from '@roastcost/shared';
import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { sql } from 'kysely';
import { SYSTEM, withCtx } from '../../db';
import { audit } from '../../lib/audit';
import { sha256 } from '../../lib/crypto';
import { esc, page } from '../../lib/html';
import { renderLegal, LEGAL_DOCS, type LegalSlug } from '../../public-pages/legal';
import { deleteAccountByCredentials } from '../me/delete';
import * as authSvc from '../auth/service';

const TOKEN_RE = /^[A-Za-z0-9_-]{20,200}$/;

function html(reply: FastifyReply, status: number, body: string) {
  return reply
    .status(status)
    .header('Content-Type', 'text/html; charset=utf-8')
    .header('Cache-Control', 'no-store')
    .header('X-Robots-Tag', 'noindex, nofollow')
    .header('Referrer-Policy', 'no-referrer')
    .send(body);
}

const kvkkNote = `<p class="note">Bu sayfadaki sipariş bilgileri, siparişin size iletilmesi ve kaydının tutulması amacıyla RoastCost tarafından işlenir.
Ayrıntılar: <a href="/legal/kvkk">KVKK Aydınlatma Metni</a> · <a href="/legal/privacy">Gizlilik Politikası</a>. Bu sayfa çerez veya izleme aracı kullanmaz.</p>`;

const genericInvalid = page(
  'Bağlantı geçersiz',
  `<h1>Bağlantı geçersiz</h1><p>Bu bağlantı geçersiz ya da süresi dolmuş. Kafeden yeni bir bağlantı isteyebilirsiniz.</p>${kvkkNote}`,
);

export const publicRoutes: FastifyPluginAsync = async (app) => {
  const deps = app.deps;

  // HTML forms post application/x-www-form-urlencoded; parse without an extra dependency.
  app.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'string', bodyLimit: 8 * 1024 },
    (_req, body, done) => {
      try {
        done(null, Object.fromEntries(new URLSearchParams(body as string)));
      } catch (e) {
        done(e as Error, undefined);
      }
    },
  );

  app.get('/healthz', async (_req, reply) => {
    try {
      await sql`select 1`.execute(deps.db);
      return { ok: true };
    } catch {
      return reply.status(503).send({ ok: false });
    }
  });

  // ---------------- roaster confirmation page (no account) ----------------
  const roasterLimit = { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } };

  async function loadOrderByToken(token: string) {
    if (!TOKEN_RE.test(token)) return null;
    const now = deps.clock();
    return withCtx(deps.db, SYSTEM, async (tx) => {
      const o = await tx
        .selectFrom('orders as o')
        .innerJoin('cafes as c', 'c.id', 'o.cafe_id')
        .select([
          'o.id',
          'o.order_no',
          'o.cafe_name_snapshot',
          'o.roaster_name_snapshot',
          'o.status',
          'o.requested_delivery_date',
          'o.note',
          'o.subtotal_kurus',
          'o.decided_at',
          'o.token_expires_at',
          'o.roaster_says_new_customer',
          'c.district',
        ])
        .where('o.token_hash', '=', sha256(token))
        .executeTakeFirst();
      if (!o || !o.token_expires_at || o.token_expires_at <= now) return null;
      const items = await tx
        .selectFrom('order_items')
        .select(['product_name_snapshot', 'quantity_g', 'line_total_kurus'])
        .where('order_id', '=', o.id)
        .execute();
      return { ...o, items };
    });
  }

  type LoadedOrder = NonNullable<Awaited<ReturnType<typeof loadOrderByToken>>>;

  function summary(o: LoadedOrder) {
    const rows = o.items
      .map(
        (i) =>
          `<tr><td>${esc(i.product_name_snapshot)}</td><td class="num">${esc(formatKg(i.quantity_g))}</td><td class="num">${esc(formatTRY(i.line_total_kurus))}</td></tr>`,
      )
      .join('');
    return `<div class="card">
      <div class="muted">Sipariş no ${esc(formatOrderNo(o.order_no))}</div>
      <h2 style="margin-top:.2rem">${esc(o.cafe_name_snapshot)} <span class="muted">(${esc(o.district)})</span></h2>
      <table><thead><tr><th>Ürün</th><th class="num">Miktar</th><th class="num">Tutar</th></tr></thead><tbody>${rows}</tbody>
      <tfoot><tr><th colspan="2">Ara toplam</th><th class="num">${esc(formatTRY(o.subtotal_kurus))}</th></tr></tfoot></table>
      <p><strong>İstenen teslim:</strong> ${o.requested_delivery_date ? esc(formatDateTr(o.requested_delivery_date)) : 'Belirtilmedi'}<br>
      <strong>Not:</strong> ${o.note ? esc(o.note) : '-'}</p>
      <p class="muted">Fiyatlar listenizdeki kademe fiyatlarıdır; teslimat ve ödeme kafe ile aranızda yapılır.</p>
    </div>`;
  }

  function resultPage(o: LoadedOrder, justNow: boolean) {
    const ok = o.status === 'confirmed';
    const title = ok
      ? 'Sipariş alındı'
      : o.status === 'declined'
        ? 'Sipariş karşılanamıyor'
        : 'Sipariş kapandı';
    const msg =
      o.status === 'confirmed'
        ? `<p class="ok">✓ Siparişi aldığınızı işaretlediniz${justNow ? '' : ' (daha önce)'}. Teşekkürler!</p>`
        : o.status === 'declined'
          ? `<p class="err">Siparişi karşılayamadığınızı bildirdiniz${justNow ? '' : ' (daha önce)'}.</p>`
          : `<p>Bu sipariş ${o.status === 'cancelled' ? 'kafe tarafından iptal edildi' : 'süresi dolduğu için kapandı'}.</p>`;
    return page(
      title,
      `<h1>${title}</h1>${msg}${summary(o)}<p class="muted">Hatalı işaretleme yaptıysanız RoastCost ile iletişime geçin; karar bu sayfadan değiştirilemez.</p>${kvkkNote}`,
    );
  }

  function formPage(o: LoadedOrder, token: string, error?: string) {
    return page(
      'Sipariş talebi',
      `<h1>Yeni sipariş talebi</h1>${summary(o)}
      <form method="post" action="/r/${esc(token)}/decide">
        ${error ? `<p class="err" role="alert">${esc(error)}</p>` : ''}
        <h2>Bu kafe sizin için…</h2>
        <label class="opt"><input type="radio" name="customer" value="new" required> <span><strong>Daha önce müşterimiz değildi</strong><br><span class="muted">Yeni müşteri</span></span></label>
        <label class="opt"><input type="radio" name="customer" value="existing" required> <span><strong>Daha önce de bizden alıyordu</strong></span></label>
        <button class="primary" type="submit" name="decision" value="confirm">Siparişi aldım</button>
        <details><summary class="muted" style="margin:10px 0;cursor:pointer">Karşılayamıyor musunuz?</summary>
          <label for="reason" class="muted">Kısa sebep (isteğe bağlı)</label>
          <textarea id="reason" name="reason" maxlength="300" rows="2"></textarea>
          <button class="secondary" type="submit" name="decision" value="decline" formnovalidate>Karşılayamıyorum</button>
        </details>
      </form>${kvkkNote}`,
    );
  }

  app.get<{ Params: { token: string } }>('/r/:token', roasterLimit, async (req, reply) => {
    const o = await loadOrderByToken(req.params.token);
    if (!o) return html(reply, 404, genericInvalid);
    if (o.decided_at || o.status === 'cancelled' || o.status === 'expired')
      return html(reply, 200, resultPage(o, false));
    return html(reply, 200, formPage(o, req.params.token));
  });

  app.post<{ Params: { token: string }; Body: Record<string, string> }>(
    '/r/:token/decide',
    roasterLimit,
    async (req, reply) => {
      const token = req.params.token;
      const o = await loadOrderByToken(token);
      if (!o) return html(reply, 404, genericInvalid);
      if (o.decided_at || o.status === 'cancelled' || o.status === 'expired')
        return html(reply, 200, resultPage(o, false));

      const body = (req.body ?? {}) as Record<string, string | undefined>;
      const decision = body.decision;
      if (decision !== 'confirm' && decision !== 'decline')
        return html(reply, 400, formPage(o, token, 'Lütfen bir seçim yapın.'));
      const customer = body.customer;
      if (decision === 'confirm' && customer !== 'new' && customer !== 'existing') {
        return html(
          reply,
          400,
          formPage(o, token, 'Lütfen kafenin yeni müşteri olup olmadığını seçin.'),
        );
      }
      const reason = (body.reason ?? '').trim().slice(0, 300) || null;
      const now = deps.clock();

      await withCtx(deps.db, SYSTEM, async (tx) => {
        const order = await tx
          .selectFrom('orders')
          .select([
            'id',
            'cafe_id',
            'roaster_id',
            'status',
            'decided_at',
            'subtotal_kurus',
            'sent_at',
          ])
          .where('token_hash', '=', sha256(token))
          .forUpdate()
          .executeTakeFirstOrThrow();
        if (order.decided_at || order.status === 'cancelled' || order.status === 'expired') return; // decided once
        // serialise decisions of the same cafe↔roaster pair (first-order uniqueness)
        await sql`select pg_advisory_xact_lock(hashtext(${order.cafe_id + ':' + order.roaster_id}))`.execute(
          tx,
        );

        if (decision === 'decline') {
          await tx
            .updateTable('orders')
            .set({
              status: 'declined',
              decided_at: now,
              decline_reason: reason,
              sent_at: order.sent_at ?? now,
            })
            .where('id', '=', order.id)
            .execute();
          await audit(tx, {
            actorUserId: null,
            action: 'order.roaster_decline',
            entity: 'order',
            entityId: order.id,
          });
          return;
        }
        const previous = await tx
          .selectFrom('orders')
          .select('id')
          .where('cafe_id', '=', order.cafe_id)
          .where('roaster_id', '=', order.roaster_id)
          .where('status', '=', 'confirmed')
          .where('id', '<>', order.id)
          .executeTakeFirst();
        const rate = await tx
          .selectFrom('roaster_admin')
          .select('commission_rate_bp')
          .where('roaster_id', '=', order.roaster_id)
          .executeTakeFirst();
        const d = decideFirstOrder({
          roasterSaysNewCustomer: customer === 'new',
          hasPreviousConfirmedOrder: !!previous,
          subtotalKurus: order.subtotal_kurus,
          commissionRateBp: rate?.commission_rate_bp ?? 1500,
        });
        await tx
          .updateTable('orders')
          .set({
            status: 'confirmed',
            decided_at: now,
            sent_at: order.sent_at ?? now,
            roaster_says_new_customer: customer === 'new',
            is_first_order: d.isFirstOrder,
            commission_conflict: d.conflict,
            commission_rate_bp_snapshot: d.commissionRateBpSnapshot,
            commission_base_kurus: d.commissionBaseKurus,
            commission_amount_kurus: d.commissionAmountKurus,
            commission_status: d.commissionStatus,
          })
          .where('id', '=', order.id)
          .execute();
        await audit(tx, {
          actorUserId: null,
          action: 'order.roaster_confirm',
          entity: 'order',
          entityId: order.id,
          after: {
            newCustomer: customer === 'new',
            commissionStatus: d.commissionStatus,
            conflict: d.conflict,
          },
        });
      });
      const after = await loadOrderByToken(token);
      return html(reply, 200, after ? resultPage(after, true) : genericInvalid);
    },
  );

  // ---------------- e-mail verification & password reset (links from e-mails) ----------------
  // GET shows a button, POST does the work: mail scanners that prefetch links cannot consume tokens.
  app.get<{ Params: { token: string } }>('/v/:token', async (req, reply) => {
    if (!TOKEN_RE.test(req.params.token))
      return html(reply, 404, page('Geçersiz bağlantı', '<h1>Bağlantı geçersiz</h1>'));
    return html(
      reply,
      200,
      page(
        'E-posta doğrulama',
        `<h1>E-posta adresinizi doğrulayın</h1><form method="post" action="/v/${esc(req.params.token)}"><button class="primary" type="submit">Doğrula</button></form>`,
      ),
    );
  });
  app.post<{ Params: { token: string } }>(
    '/v/:token',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const ok =
        TOKEN_RE.test(req.params.token) && (await authSvc.verifyEmail(deps, req.params.token));
      return html(
        reply,
        ok ? 200 : 400,
        page(
          ok ? 'Doğrulandı' : 'Geçersiz bağlantı',
          ok
            ? '<h1 class="ok">✓ E-posta adresiniz doğrulandı</h1><p>Uygulamaya dönebilirsiniz.</p>'
            : '<h1>Bağlantı geçersiz</h1><p>Bağlantının süresi dolmuş olabilir. Uygulamadan yeni doğrulama e-postası isteyin.</p>',
        ),
      );
    },
  );

  app.get<{ Params: { token: string } }>('/reset/:token', async (req, reply) => {
    if (!TOKEN_RE.test(req.params.token))
      return html(reply, 404, page('Geçersiz bağlantı', '<h1>Bağlantı geçersiz</h1>'));
    return html(reply, 200, resetForm(req.params.token));
  });
  app.post<{ Params: { token: string }; Body: Record<string, string> }>(
    '/reset/:token',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const token = req.params.token;
      const body = (req.body ?? {}) as Record<string, string | undefined>;
      const pw = passwordSchema.safeParse(body.password ?? '');
      if (!pw.success)
        return html(reply, 400, resetForm(token, pw.error.issues[0]?.message ?? 'Geçersiz parola'));
      if (body.password !== body.password2)
        return html(reply, 400, resetForm(token, 'Parolalar aynı değil.'));
      const ok = TOKEN_RE.test(token) && (await authSvc.resetPassword(deps, token, pw.data));
      return html(
        reply,
        ok ? 200 : 400,
        page(
          ok ? 'Parola değişti' : 'Geçersiz bağlantı',
          ok
            ? '<h1 class="ok">✓ Parolanız değiştirildi</h1><p>Güvenliğiniz için tüm cihazlardaki oturumlar kapatıldı. Uygulamadan yeni parolanızla giriş yapın.</p>'
            : '<h1>Bağlantı geçersiz</h1><p>Bağlantının süresi dolmuş ya da daha önce kullanılmış olabilir.</p>',
        ),
      );
    },
  );

  // ---------------- legal texts & web account deletion (store requirements) ----------------
  app.get<{ Params: { doc: string } }>('/legal/:doc', async (req, reply) => {
    const slug = req.params.doc as LegalSlug;
    if (!(slug in LEGAL_DOCS)) return html(reply, 404, page('Bulunamadı', '<h1>Bulunamadı</h1>'));
    return reply
      .header('Content-Type', 'text/html; charset=utf-8')
      .header('Cache-Control', 'public, max-age=3600')
      .send(await renderLegal(slug, deps.config));
  });

  app.get('/account-deletion', async (_req, reply) => html(reply, 200, deletionPage()));
  app.post<{ Body: Record<string, string> }>(
    '/account-deletion',
    { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } },
    async (req, reply) => {
      const body = (req.body ?? {}) as Record<string, string | undefined>;
      const done = await deleteAccountByCredentials(
        deps,
        String(body.email ?? ''),
        String(body.password ?? ''),
      );
      return html(
        reply,
        done ? 200 : 400,
        done
          ? page(
              'Hesap silindi',
              '<h1 class="ok">Hesabınız silindi</h1><p>Kişisel verileriniz anonimleştirildi ve tüm oturumlar kapatıldı.</p>',
            )
          : deletionPage('E-posta veya parola hatalı.'),
      );
    },
  );
};

function resetForm(token: string, error?: string) {
  return page(
    'Parola sıfırlama',
    `<h1>Yeni parola belirleyin</h1>${error ? `<p class="err" role="alert">${esc(error)}</p>` : ''}
    <form method="post" action="/reset/${esc(token)}">
      <label for="p1">Yeni parola (en az 10 karakter)</label><input id="p1" type="password" name="password" minlength="10" required autocomplete="new-password">
      <label for="p2">Yeni parola (tekrar)</label><input id="p2" type="password" name="password2" minlength="10" required autocomplete="new-password">
      <button class="primary" type="submit">Parolayı değiştir</button>
    </form>`,
  );
}

function deletionPage(error?: string) {
  return page(
    'Hesap silme',
    `<h1>RoastCost hesabını sil</h1>
    <p>Hesabınızı uygulamada <strong>Ayarlar → Hesabımı sil</strong> bölümünden ya da aşağıdaki formla silebilirsiniz.</p>
    <div class="card"><strong>Silinince ne olur?</strong><ul>
      <li>E-posta, kafe adı, telefon ve parolanız anonimleştirilir; oturumlarınız kapatılır.</li>
      <li>Reçete, malzeme ve maliyet ayarlarınız silinir.</li>
      <li>Komisyon muhasebesi için gereken sipariş tutarı ve tarihleri, kişisel bilgi içermeden yasal süre boyunca saklanır.</li>
    </ul></div>
    ${error ? `<p class="err" role="alert">${esc(error)}</p>` : ''}
    <form method="post" action="/account-deletion">
      <label for="e">E-posta</label><input id="e" type="email" name="email" required autocomplete="email">
      <label for="p">Parola</label><input id="p" type="password" name="password" required autocomplete="current-password">
      <button class="secondary" type="submit">Hesabımı kalıcı olarak sil</button>
    </form>
    <p class="note">Parolanızı unuttuysanız uygulamadan “Parolamı unuttum” ile sıfırlayın ya da <a href="/legal/kvkk">Aydınlatma Metni</a>'ndeki iletişim adresine yazın.</p>`,
  );
}

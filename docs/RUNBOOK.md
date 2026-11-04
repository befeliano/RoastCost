# RUNBOOK

## Yerel geliştirme

```bash
pnpm install
cp .env.example .env            # değerleri düzenle
docker compose up -d db         # Postgres 17 (roller ilk açılışta otomatik oluşur)
pnpm db:migrate                 # migrations/*.sql (roastcost_migrator ile)
pnpm db:seed                    # uydurma geliştirme verisi
pnpm api:dev                    # http://localhost:3000
pnpm mobile                     # Expo Go ile QR kodu okut
```

Docker yoksa: yerel PostgreSQL'de bir süper kullanıcıyla
`psql -v migrator_password=... -v app_password=... -v dbname=roastcost -f apps/api/scripts/bootstrap.sql`.

### Mobil ortam değişkenleri (isteğe bağlı)

- `EXPO_PUBLIC_SUPPORT_EMAIL` — Ayarlar → Destek ve karşılama ekranındaki "Kavurucu musunuz?" bağlantısı bu adrese gider. Tanımlı değilse ikisi de gizlenir.
- Migration `0003` (sipariş koşulları) sonrası `pnpm db:migrate` çalıştırın; kavurucunun min. sipariş kg'ı ve kart farkı admin → Katalog → kavurucu düzenleme ekranından girilir.

### iPhone'da Expo Go ile test

- Bilgisayar ve telefon aynı Wi-Fi'de olmalı.
- `apps/mobile/app.json → expo.extra.apiUrl` değerini bilgisayarın yerel IP'si yap (ör. `http://192.168.1.20:3000`) — telefon `localhost`'a ulaşamaz.

## Supabase'de deneme (yalnızca test / demo verisi)

> ⚠️ Şartname K12: kullanıcı verisi Türkiye dışına çıkmamalı. Supabase sunucuları yurt dışındadır; **gerçek kafe verisiyle
> üretimde kullanılmamalı** (KVKK m.9). Ayrıca `legal/` metinleri "yurt dışına aktarım yapılmaz" der — Supabase ile bu cümle yanlış olur.
> Uydurma verilerle denemek için uygundur.

1. Supabase → SQL Editor → `apps/api/migrations/0001_init.sql` dosyasının tamamını yapıştır → Run.
2. `apps/api/scripts/supabase-setup.sql` içindeki parolayı değiştir → Run. (Rol parolası + Supabase'in otomatik REST API'sinin kapatılması.)
3. `.env`:
   - `DATABASE_URL=postgres://roastcost_app.<proje-ref>:<parola>@<pooler-host>:5432/postgres` (Project Settings → Database → **Session pooler** bağlantısındaki host; kullanıcı adının sonuna `.<proje-ref>` eklenir)
   - `MIGRATOR_DATABASE_URL` = Supabase'in verdiği `postgres.<proje-ref>` bağlantı dizesi
4. `pnpm db:seed` ile uydurma veri, `pnpm api:dev` ile API.

Hata "already exists" ise ilk deneme yarım kalmıştır; SQL Editor'da `drop schema public cascade; create schema public; grant usage on schema public to postgres, anon, authenticated, service_role;` çalıştırıp 1. adımdan başla (yalnızca boş, deneme projesinde!).

## Testler

```bash
pnpm test        # shared + api (api testleri gerçek Postgres ister)
pnpm typecheck
pnpm lint
```

API testleri her çalıştırmada `roastcost_test` veritabanını silip baştan kurar ve tüm migration'ları uygular.
Süper kullanıcı bağlantısı: `TEST_PG_SUPERUSER_URL` (varsayılan `postgres://postgres:postgres@127.0.0.1:5432/postgres`).

## Veritabanı rolleri

| Rol                  | Ne için       | Yetki                                                                                         |
| -------------------- | ------------- | --------------------------------------------------------------------------------------------- |
| `roastcost_migrator` | migration'lar | şema sahibi                                                                                   |
| `roastcost_app`      | API           | süper kullanıcı değil, `NOBYPASSRLS`; `price_tier_history`'ye yazamaz, `audit_logs`'u silemez |

## İlk admin

Uygulama içinden kayıtla admin olunamaz. Sunucuda:

```bash
pnpm --filter @roastcost/api create-admin -- --email burak@ornek.com
```

(Parola terminalde sorulur.)

## Yedek / geri yükleme / üretim kurulumu

Faz 9'da `deploy/` ile birlikte doldurulacak.

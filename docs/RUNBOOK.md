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

### iPhone'da Expo Go ile test

- Bilgisayar ve telefon aynı Wi-Fi'de olmalı.
- `apps/mobile/app.json → expo.extra.apiUrl` değerini bilgisayarın yerel IP'si yap (ör. `http://192.168.1.20:3000`) — telefon `localhost`'a ulaşamaz.

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

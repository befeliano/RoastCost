# FINCAN (kod adı) — Kafe Maliyet Hesaplayıcı ve Kavurucu Sipariş Uygulaması

> Uygulamanın görünen adı henüz belli değil: her yerde `{{APP_NAME}}` yer tutucusunu kullan. Kod adı/repo adı: `fincan`.
> Bu dosya projenin tek doğruluk kaynağıdır (single source of truth). Claude Code bu dosyayı baştan sona okuyup fazlar halinde uygular.

---

## 0. Claude Code için çalışma kuralları

1. Bu dosyayı **tamamen** oku. Çelişki veya belirsizlik görürsen tahmin etme, dur ve soru sor. Küçük detaylarda mantıklı varsayım yap ve `docs/DECISIONS.md` dosyasına yaz.
2. İşi **Bölüm 18'deki fazlarla** ilerlet. Her fazın sonunda: testleri çalıştır, kabul kriterlerini tek tek kontrol et, kısa özet ver, **bir sonraki faza geçmeden onay bekle**.
3. Bu dosyadaki **kesinleşmiş kararları** (Bölüm 1) kendi kendine değiştirme. Daha iyi bir yol görürsen öner, uygulama.
4. **Yasak:** Firebase, Google Analytics, Sentry cloud, Crashlytics, reklam/izleme SDK'ları, Expo Push, Expo Updates (OTA), Google Fonts'u çalışma anında internetten çekmek, lisansı belirsiz görsel/font/ikon/ses/animasyon dosyası. Kullanıcı verisi **Türkiye dışına çıkmayacak** (Bölüm 4.3).
5. Kod: TypeScript `strict`, ESLint + Prettier, `any` yok, tüm girdiler Zod ile doğrulanır, her bağımlılık eklenmeden önce lisansı (MIT/Apache/BSD/ISC/OFL) ve bakım durumu kontrol edilir.
6. Her faz için testler yazılır. **Tenant izolasyon testleri** (bir kafe başka kafenin verisini göremez) zorunludur.
7. Sırlar (`.env`, anahtarlar) asla commit edilmez. `.env.example` tutulur.
8. Kullanıcı arayüz metinleri **Türkçe**dir ve `locales/tr.json` içinde durur (ileride çok dil için hazır yapı). Kod, değişken, tablo ve commit mesajları İngilizce.
9. Kullanıcı (Burak) Claude Code'u klasör açıp başlatıyor, bilgisayar ve iPhone 17 ile test edecek. Başlangıç testleri **Expo Go** ile yapılacak. Native modül gerektiren bir paket ekleyeceksen önce Expo Go'da çalışıp çalışmadığını belirt.

---

## 1. Ürün özeti ve kesinleşmiş kararlar

**Ne yapar?** Eskişehir'deki (ileride İstanbul/Ankara) kafelerin:
1. Gerçek **fincan maliyetini** (kahve gramajı, süt, şurup, bardak, fire, sabit gider) hesaplamasını,
2. Yerel **kavurucuların toptan kahve fiyatlarını** görüp karşılaştırmasını,
3. Seçtikleri ürünlerle **kavurucu başına bir sepet** oluşturup siparişi **WhatsApp ile** kavurucuya iletmesini sağlar.

**Kesinleşmiş kararlar (değiştirme):**

| # | Karar |
|---|---|
| K1 | **Kafe sahibi ücretsiz.** Gelir kavurucudan gelir. |
| K2 | **Komisyon:** Kavurucudan, bir kafenin o kavurucuya verdiği **yalnızca ilk siparişte %15**. MVP'de tahsilat uygulama dışı (nakit/IBAN), güvene dayalı. Uygulama komisyonu **hesaplar ve kayıt altında tutar**, tahsil etmez. |
| K3 | **Kavurucunun hesabı/paneli YOKTUR.** Kavurucu verisini sadece admin (Burak) girer. Kavurucuyla etkileşim WhatsApp mesajı + tek kullanımlık web bağlantısıyla olur. |
| K4 | Sipariş **kavurucu başına ayrı sepet**tir. İki kavurucudan ürün = iki ayrı sipariş = iki ayrı WhatsApp mesajı. |
| K5 | **Teslimat ve ödeme uygulama dışıdır.** Uygulama yalnızca sipariş talebini kaydeder ve iletir. |
| K6 | WhatsApp mesajları **`wa.me` bağlantısıyla, kafenin kendi telefonundan** gider (ücretsiz). WhatsApp Business API yok. |
| K7 | **Kafe onayı elle**dir (admin onaylar). Vergi numarası, vergi levhası, kimlik belgesi **toplanmaz/saklanmaz**. Davet kodu MVP'de yok. |
| K8 | **Fiyat geçmişi tutulur** ve admin hatalı bir değişikliği geri alabilir. |
| K9 | **Multi-tenant**: tenant = kafe. Kafe kendi reçetelerini ve malzeme (süt/şurup) litre fiyatlarını yönetir. |
| K10 | Admin = Burak. Tüm kafeleri görür/düzenler, kavurucu/ürün/fiyat yönetir, siparişleri ve komisyonları izler. |
| K11 | Platform: **iOS + Android** (Expo/React Native, TypeScript). App Store ve Google Play'de yayımlanabilir kalitede ve yasal gerekliliklerle. |
| K12 | **Kullanıcı verisi Türkiye dışına çıkmaz.** Bu yüzden Supabase Cloud/Firebase gibi yurt dışı barındırma **kullanılmaz** (Bölüm 4.3). |
| K13 | Telifli hiçbir şey yok: font, ikon, görsel, ses, animasyon ya kendi üretimimiz ya da açık lisanslı (OFL/MIT/CC0) olacak. |
| K14 | Arayüz: beyaz arka plan, sade; üst bar **bordo veya koyu kahve**; Claude/ChatGPT benzeri fontlar yok; Duolingo tarzı **pop-up/mikro animasyonlar**. |
| K15 | Cihazda önbellekleme + veri/kod optimizasyonu şarttır (Bölüm 12). |

---

## 2. Kapsam

**MVP içi**
- Kayıt, e-posta doğrulama, giriş, şifre sıfırlama, hesabı silme, verilerimi indir
- Admin onay akışı (bekleyen kafeler)
- Pending (onaysız) kafe için **manuel fiyat girişli** maliyet hesaplayıcı (toptan fiyatları göremez)
- Kafe ayarları, malzemeler (süt/şurup), reçeteler (6 hazır + özel)
- Maliyet motoru, önerilen satış fiyatı, kâr marjı
- Kavurucu kataloğu, kademeli fiyat (1/5/10 kg gibi), fiyat karşılaştırma
- Sepet → sipariş → WhatsApp → kavurucu onay sayfası → komisyon kaydı
- Admin paneli (aynı uygulama içinde, `role=admin` ise görünür): kafe onayı, kavurucu/ürün/fiyat CRUD, toplu fiyat içe aktarma, fiyat geçmişi + geri alma, sipariş/komisyon takibi, denetim kaydı
- Çevrimdışı çalışan hesaplayıcı + katalog önbelleği
- Yasal metinler, mağaza gereklilikleri

**MVP dışı (yapma, sadece mimariyi bozma)**
- Akıllı öneri robotu, bölgesel satış fiyatı regresyonu
- Push bildirim, kavurucu paneli, uygulama içi ödeme, otomatik komisyon tahsili
- Çoklu şube/çoklu kullanıcı arayüzü (veri modeli hazır: `cafe_members`)
- Web admin paneli (sonra eklenebilir; API zaten hazır olacak)
- Çoklu dil (altyapı hazır, sadece Türkçe)

---

## 3. Roller ve multi-tenant model

- **Tenant = kafe** (`cafes.id`). Kafe tarafına ait tüm tablolarda `cafe_id` bulunur.
- **Roller:** `cafe_owner`, `admin`.
- **Kafe durumları:** `pending` (onay bekliyor), `approved`, `rejected`, `suspended`.
- **Görünürlük:**
  - `pending`/`rejected`/`suspended` kafe: sadece kendi ayarları + manuel fiyatlı hesaplayıcı. Katalog ve fiyatlar **görünmez**, sipariş **veremez**.
  - `approved` kafe: kendi verileri + katalog (kavurucu, ürün, fiyat) okuma, sipariş verme.
  - `admin`: her şey.
- **İzolasyon iki katmanlıdır (defense in depth):**
  1. API katmanında her sorgu `cafe_id` ile kapsamlanır (tenant-scoped repository).
  2. PostgreSQL **Row Level Security** (Bölüm 6). Her istek bir transaction içinde `set_config('app.cafe_id', ..., true)` ile bağlam kurar.
- Uygulama veritabanına **süper kullanıcı olmayan, `BYPASSRLS` yetkisi olmayan** `fincan_app` rolüyle bağlanır. Migration'lar ayrı `fincan_migrator` rolüyle çalışır.

---

## 4. Mimari ve teknoloji

### 4.1 Genel görünüm

```
[Expo iOS/Android uygulaması]  <--HTTPS/JSON-->  [Fastify API (Node, TS)]  -->  [PostgreSQL]
        |                                                |
        |  wa.me (kafenin kendi WhatsApp'ı)              +--> [Kavurucu onay sayfası /r/:token  (sunucuda üretilen minimal HTML)]
        +--> cihazda önbellek (expo-sqlite kv-store)     +--> [SMTP (e-posta doğrulama/şifre sıfırlama)]
```

### 4.2 Teknoloji yığını

**Mobil (`apps/mobile`)**
- Expo (güncel kararlı SDK; `create-expo-app` ile kur), React Native, TypeScript, **expo-router**
- Sunucu durumu: **TanStack Query** + kalıcı önbellek (persist)
- İstemci durumu: **Zustand** (sepet, UI)
- Formlar: **React Hook Form + Zod**
- Liste: **@shopify/flash-list**
- Animasyon: **react-native-reanimated**, **react-native-gesture-handler**, **react-native-svg**, **expo-haptics** (Lottie dosyası **kullanma**; kendi animasyonlarımızı Reanimated/SVG ile yaz)
- Güvenli depolama: **expo-secure-store** (yalnızca token'lar)
- Kalıcı önbellek: **expo-sqlite** (`expo-sqlite/kv-store` varsa onu; yoksa AsyncStorage + `CatalogStore` arayüzü ile sarmala, sonra sqlite'a geçilebilsin)
- Font: **@expo-google-fonts/** paketleri (npm'den kurulur, **uygulamayla birlikte paketlenir**, çalışma anında Google'a istek atılmaz)

**API (`apps/api`)**
- Node.js LTS, **Fastify** + `fastify-type-provider-zod`
- **PostgreSQL** (güncel kararlı sürüm), **SQL-first**: numaralı `.sql` migration dosyaları + **Kysely** (+ `kysely-codegen`) ile tip güvenli sorgular, `pg` bağlantı havuzu
- Parola: **argon2id** (`@node-rs/argon2`)
- Token: `jose` ile JWT erişim token'ı (15 dk) + döner (rotating) refresh token (30 gün, veritabanında **hash'li**, yeniden kullanım tespiti ile)
- `@fastify/helmet`, `@fastify/rate-limit`, `@fastify/compress`, `pino` (log'da e-posta/telefon/Authorization maskeli)
- E-posta: `nodemailer` (SMTP, Türkiye'deki sağlayıcı)
- Zamanlanmış iş: process içi (örn. `node-cron`) — süresi dolan siparişleri `expired` yapma, süresi dolan token'ları temizleme

**Paylaşılan (`packages/shared`)**
- Zod şemaları, tipler, sabitler (varsayılan reçeteler), **maliyet motoru** (saf TS fonksiyonları; hem uygulamada çevrimdışı hem API testlerinde kullanılır), para/telefon yardımcıları, WhatsApp mesaj şablonu üretici

**Araçlar:** pnpm workspaces, Vitest, ESLint, Prettier, GitHub Actions (CI: typecheck + lint + test), Docker Compose (yerel PostgreSQL).

### 4.3 Veri yurt dışına çıkmaz kuralı (ÖNEMLİ)

- **Barındırma:** Veritabanı ve API, **veri merkezi Türkiye'de olan** bir VPS/sunucuda çalışır (sağlayıcıyı Burak seçecek; fiyat/şartları karşılaştırsın). Docker Compose + **Caddy** (otomatik TLS) ile kurulur.
- **Yerel geliştirme:** Docker Compose ile yerel Postgres. Üretim kararı fazı gelene kadar **para harcamaya gerek yok**.
- Yurt dışına veri gönderen hiçbir üçüncü taraf servis yok: analitik yok, çökme raporlama servisi yok (istenirse kendi API'mize `/v1/client-logs` ile maskeli hata logu), push yok, OTA güncelleme yok (`expo-updates` kapalı), harici CDN yok.
- Kaçınılamayan noktalar **gizlilik metninde açıkça yazılır**: App Store/Google Play hesap ve dağıtım altyapısı; kafenin kendi WhatsApp'ını (Meta) kullanması (mesajı kullanıcı kendi cihazından gönderir, biz iletmiyoruz).
- Not: Supabase vb. yurt dışı bulut kullanılırsa KVKK m.9 (yurt dışına aktarım) şartları devreye girer. Bu projede bilerek **kullanmıyoruz**.

---

## 5. Repo yapısı

```
fincan/
├─ PROJE_SARTNAMESI.md
├─ docs/
│  ├─ DECISIONS.md            # alınan teknik kararlar (ADR kısa)
│  └─ RUNBOOK.md              # kurulum, yedek, geri yükleme, deploy
├─ legal/                     # TASLAK yasal metinler (hukukçu incelemesi şart), md + yayınlanacak html
├─ packages/
│  └─ shared/                 # zod, tipler, maliyet motoru, sabitler (+ testler)
├─ apps/
│  ├─ api/
│  │  ├─ migrations/          # 0001_init.sql, 0002_... (numaralı, geri alınamaz mantıkla)
│  │  ├─ src/{config,db,plugins,modules,jobs,public-pages}/
│  │  └─ test/
│  └─ mobile/
│     ├─ app/                 # expo-router dosya tabanlı rotalar
│     ├─ src/{api,components,features,hooks,lib,store,theme,locales}/
│     └─ assets/              # yalnızca kendi ürettiğimiz/açık lisanslı dosyalar
├─ docker-compose.yml         # yerel postgres
├─ .env.example
└─ package.json / pnpm-workspace.yaml
```

---

## 6. Veritabanı (PostgreSQL)

### 6.1 Kurallar
- Para: **tam sayı kuruş** (`bigint`/`integer`), asla float saklanmaz. Ağırlık: gram (`integer`) veya `numeric` (doz).
- Tüm zamanlar `timestamptz`, UTC.
- Yumuşak silme (`deleted_at`) katalog tablolarında (senkronizasyon için tombstone gerekir).
- Katalog tablolarında `rev bigint` (global sıra numarası): **delta senkronizasyonun** anahtarı. Her insert/update'te artar.
- Fiyat ve sipariş kalemlerinde **snapshot** alanları: fiyat/ürün adı sonradan değişse de eski siparişler bozulmaz.
- E-posta `citext`; telefon `E.164` (`+905XXXXXXXXX`).

### 6.2 Şema (`0001_init.sql` — Claude Code bunu temel alıp uygular, gerekirse iyileştirir ve farkı DECISIONS.md'ye yazar)

```sql
create extension if not exists citext;

-- ===== Enum'lar =====
create type user_role         as enum ('cafe_owner','admin');
create type cafe_status       as enum ('pending','approved','rejected','suspended');
create type product_category  as enum ('espresso','filter');
create type ingredient_kind   as enum ('milk','syrup','other');
create type order_status      as enum ('draft','sent','confirmed','declined','expired','cancelled');
create type commission_status as enum ('not_applicable','pending','requested','paid','waived');

create sequence catalog_rev_seq;
create sequence order_no_seq start 1001;

-- ===== Yardımcı trigger fonksiyonları =====
create function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create function set_catalog_rev() returns trigger language plpgsql as $$
begin new.updated_at = now(); new.rev = nextval('catalog_rev_seq'); return new; end $$;

-- RLS bağlam fonksiyonları (API her transaction başında set_config ile doldurur)
create function app_cafe_id()   returns uuid    language sql stable as $$ select nullif(current_setting('app.cafe_id', true), '')::uuid $$;
create function app_user_id()   returns uuid    language sql stable as $$ select nullif(current_setting('app.user_id', true), '')::uuid $$;
create function app_is_admin()  returns boolean language sql stable as $$ select coalesce(current_setting('app.is_admin', true), '') = 'true' $$;
-- Sadece kayıt/giriş ve token'lı kavurucu sayfası gibi sunucu içi akışlarda, kod doğrulamasından SONRA set edilir:
create function app_is_system() returns boolean language sql stable as $$ select coalesce(current_setting('app.is_system', true), '') = 'true' $$;

-- ===== Kimlik =====
create table users (
  id                uuid primary key default gen_random_uuid(),
  email             citext not null unique,
  password_hash     text not null,
  role              user_role not null default 'cafe_owner',
  email_verified_at timestamptz,
  failed_login_count integer not null default 0,
  locked_until      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create trigger trg_users_updated before update on users for each row execute function set_updated_at();

create table cafes (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 2 and 120),
  city         text not null default 'Eskişehir',
  district     text not null check (char_length(district) between 2 and 80),
  phone_e164   text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  status       cafe_status not null default 'pending',
  status_note  text check (char_length(status_note) <= 500),
  approved_at  timestamptz,
  approved_by  uuid references users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create trigger trg_cafes_updated before update on cafes for each row execute function set_updated_at();
create index idx_cafes_status on cafes(status) where deleted_at is null;

create table cafe_members (   -- MVP'de tek satır/kafe (owner). İleride çok kullanıcı/şube.
  cafe_id     uuid not null references cafes(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  member_role text not null default 'owner',
  primary key (cafe_id, user_id)
);
create index idx_cafe_members_user on cafe_members(user_id);

create table refresh_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  family_id   uuid not null,
  token_hash  text not null unique,
  device_label text,
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  replaced_by uuid references refresh_tokens(id),
  created_at  timestamptz not null default now()
);
create index idx_refresh_user on refresh_tokens(user_id);

create table email_tokens (   -- e-posta doğrulama ve şifre sıfırlama
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  purpose    text not null check (purpose in ('verify_email','reset_password')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create table consents (       -- hangi yasal metnin hangi sürümü ne zaman kabul edildi
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  doc_type    text not null check (doc_type in ('terms','privacy','kvkk_notice')),
  doc_version text not null,
  accepted_at timestamptz not null default now()
);

-- ===== Kafe (tenant) verileri =====
create table cafe_settings (
  cafe_id                       uuid primary key references cafes(id) on delete cascade,
  espresso_dose_g               numeric(5,1) not null default 18.0 check (espresso_dose_g between 5 and 40),
  coffee_waste_pct              numeric(4,1) not null default 0 check (coffee_waste_pct between 0 and 50),
  ingredient_waste_pct          numeric(4,1) not null default 0 check (ingredient_waste_pct between 0 and 50),
  cup_cost_kurus                integer not null default 0 check (cup_cost_kurus >= 0),
  fixed_overhead_per_cup_kurus  integer not null default 0 check (fixed_overhead_per_cup_kurus >= 0),
  target_margin_pct             numeric(4,1) not null default 65 check (target_margin_pct between 1 and 95),
  sale_vat_rate_pct             numeric(4,1) not null default 10 check (sale_vat_rate_pct between 0 and 30), -- varsayılanı doğrula
  cost_excludes_vat             boolean not null default true,
  price_rounding_step_kurus     integer not null default 500 check (price_rounding_step_kurus > 0),
  updated_at                    timestamptz not null default now()
);
create trigger trg_cafe_settings_updated before update on cafe_settings for each row execute function set_updated_at();

create table cafe_ingredients (   -- süt, şurup vb. litre bazlı fiyat
  id                    uuid primary key default gen_random_uuid(),
  cafe_id               uuid not null references cafes(id) on delete cascade,
  name                  text not null check (char_length(name) between 1 and 80),
  kind                  ingredient_kind not null,
  price_per_liter_kurus integer not null check (price_per_liter_kurus >= 0),
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create trigger trg_cafe_ingredients_updated before update on cafe_ingredients for each row execute function set_updated_at();
create index idx_cafe_ingredients_cafe on cafe_ingredients(cafe_id);

create table recipes (
  id               uuid primary key default gen_random_uuid(),
  cafe_id          uuid not null references cafes(id) on delete cascade,
  name             text not null check (char_length(name) between 1 and 80),
  template_key     text check (template_key in ('espresso','americano','latte','cortado','cappuccino','mocha')),
  coffee_grams     numeric(5,1) check (coffee_grams > 0 and coffee_grams <= 60),  -- null ise settings.espresso_dose_g
  uses_cup         boolean not null default true,
  sell_price_kurus integer check (sell_price_kurus > 0),   -- kafenin menüdeki mevcut fiyatı (KDV dahil), opsiyonel
  sort_order       integer not null default 0,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger trg_recipes_updated before update on recipes for each row execute function set_updated_at();
create index idx_recipes_cafe on recipes(cafe_id);

create table recipe_ingredients (
  id            uuid primary key default gen_random_uuid(),
  recipe_id     uuid not null references recipes(id) on delete cascade,
  ingredient_id uuid not null references cafe_ingredients(id) on delete restrict,
  quantity_ml   numeric(6,1) not null check (quantity_ml > 0 and quantity_ml <= 1000),
  unique (recipe_id, ingredient_id)
);

-- ===== Katalog (global; sadece admin yazar, onaylı kafeler okur) =====
create table roasters (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null check (char_length(name) between 2 and 120),
  city               text not null default 'Eskişehir',
  whatsapp_e164      text not null check (whatsapp_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  prices_include_vat boolean not null default false,
  vat_rate_pct       numeric(4,1) not null default 10 check (vat_rate_pct between 0 and 30), -- kavurucudan öğren
  prices_updated_at  timestamptz,       -- kafelere "fiyat güncelliği" olarak gösterilir
  is_active          boolean not null default true,
  rev                bigint not null default nextval('catalog_rev_seq'),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);
create trigger trg_roasters_rev before insert or update on roasters for each row execute function set_catalog_rev();
create index idx_roasters_rev on roasters(rev);

create table roaster_admin (   -- kafelere ASLA gösterilmez
  roaster_id         uuid primary key references roasters(id) on delete cascade,
  commission_rate_bp integer not null default 1500 check (commission_rate_bp between 0 and 5000), -- 1500 = %15
  admin_notes        text
);

create table products (
  id            uuid primary key default gen_random_uuid(),
  roaster_id    uuid not null references roasters(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 120),
  category      product_category not null,
  process       text check (process in ('washed','natural','honey','anaerobic','other')),
  origin        text check (char_length(origin) <= 120),
  tasting_notes text check (char_length(tasting_notes) <= 300),
  is_active     boolean not null default true,
  rev           bigint not null default nextval('catalog_rev_seq'),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create trigger trg_products_rev before insert or update on products for each row execute function set_catalog_rev();
create index idx_products_roaster on products(roaster_id) where deleted_at is null;
create index idx_products_rev on products(rev);

create table price_tiers (
  id                  uuid primary key default gen_random_uuid(),
  product_id          uuid not null references products(id) on delete cascade,
  min_kg              integer not null check (min_kg > 0),
  price_per_kg_kurus  bigint not null check (price_per_kg_kurus > 0),
  valid_until         date,
  rev                 bigint not null default nextval('catalog_rev_seq'),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);
create unique index uq_price_tier_product_minkg on price_tiers(product_id, min_kg) where deleted_at is null;
create trigger trg_price_tiers_rev before insert or update on price_tiers for each row execute function set_catalog_rev();
create index idx_price_tiers_rev on price_tiers(rev);

create table price_tier_history (
  id              bigserial primary key,
  price_tier_id   uuid not null,
  product_id      uuid not null,
  min_kg          integer not null,
  old_price_kurus bigint,
  new_price_kurus bigint,
  action          text not null check (action in ('insert','update','delete','rollback')),
  changed_by      uuid references users(id),
  reason          text,
  changed_at      timestamptz not null default now()
);
create index idx_price_hist_tier on price_tier_history(price_tier_id, changed_at desc);

create function log_price_tier_change() returns trigger language plpgsql as $$
declare
  v_user   uuid := nullif(current_setting('app.user_id', true), '')::uuid;
  v_reason text := nullif(current_setting('app.change_reason', true), '');
begin
  if tg_op = 'INSERT' then
    insert into price_tier_history(price_tier_id, product_id, min_kg, old_price_kurus, new_price_kurus, action, changed_by, reason)
    values (new.id, new.product_id, new.min_kg, null, new.price_per_kg_kurus, 'insert', v_user, v_reason);
  elsif tg_op = 'UPDATE' then
    if new.deleted_at is not null and old.deleted_at is null then
      insert into price_tier_history(price_tier_id, product_id, min_kg, old_price_kurus, new_price_kurus, action, changed_by, reason)
      values (new.id, new.product_id, new.min_kg, old.price_per_kg_kurus, null, 'delete', v_user, v_reason);
    elsif new.price_per_kg_kurus is distinct from old.price_per_kg_kurus then
      insert into price_tier_history(price_tier_id, product_id, min_kg, old_price_kurus, new_price_kurus, action, changed_by, reason)
      values (new.id, new.product_id, new.min_kg, old.price_per_kg_kurus, new.price_per_kg_kurus,
              case when v_reason = 'rollback' then 'rollback' else 'update' end, v_user, v_reason);
    end if;
  end if;
  return new;
end $$;
create trigger trg_price_tier_history after insert or update on price_tiers for each row execute function log_price_tier_change();

-- ===== Siparişler =====
create table orders (
  id                          uuid primary key default gen_random_uuid(),
  order_no                    bigint not null unique default nextval('order_no_seq'),  -- kullanıcıya "S-1001" gibi gösterilir
  cafe_id                     uuid not null references cafes(id),
  roaster_id                  uuid not null references roasters(id),
  cafe_name_snapshot          text not null,
  cafe_phone_snapshot         text not null,
  roaster_name_snapshot       text not null,
  status                      order_status not null default 'draft',
  requested_delivery_date     date,
  note                        text check (char_length(note) <= 500),
  subtotal_kurus              bigint not null default 0,
  token_hash                  text unique,            -- kavurucu bağlantısı; ham token SAKLANMAZ
  token_expires_at            timestamptz,
  sent_at                     timestamptz,
  decided_at                  timestamptz,
  roaster_says_new_customer   boolean,                -- kavurucunun beyanı
  decline_reason              text check (char_length(decline_reason) <= 300),
  is_first_order              boolean,                -- karar anında hesaplanır (Bölüm 8.4)
  commission_rate_bp_snapshot integer,
  commission_base_kurus       bigint,                 -- admin düzeltebilir
  commission_amount_kurus     bigint,
  commission_status           commission_status not null default 'not_applicable',
  commission_note             text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
create trigger trg_orders_updated before update on orders for each row execute function set_updated_at();
create index idx_orders_cafe_created on orders(cafe_id, created_at desc);
create index idx_orders_roaster_status on orders(roaster_id, status);
create index idx_orders_pair_confirmed on orders(cafe_id, roaster_id) where status = 'confirmed';
create index idx_orders_commission on orders(commission_status) where commission_status in ('pending','requested');
-- Bir kafe-kavurucu çifti için EN FAZLA bir "ilk sipariş" olabilir:
create unique index uq_first_order_pair on orders(cafe_id, roaster_id) where is_first_order = true;

create table order_items (
  id                         uuid primary key default gen_random_uuid(),
  order_id                   uuid not null references orders(id) on delete cascade,
  product_id                 uuid references products(id) on delete set null,
  product_name_snapshot      text not null,
  quantity_g                 integer not null check (quantity_g > 0 and quantity_g <= 1000000),
  tier_min_kg_snapshot       integer not null,
  price_per_kg_kurus_snapshot bigint not null,
  line_total_kurus           bigint not null
);
create index idx_order_items_order on order_items(order_id);

-- ===== Denetim =====
create table audit_logs (
  id            bigserial primary key,
  actor_user_id uuid references users(id),
  action        text not null,         -- örn. cafe.approve, price.update, order.commission_status
  entity        text not null,
  entity_id     uuid,
  before        jsonb,
  after         jsonb,
  created_at    timestamptz not null default now()
);
create index idx_audit_entity on audit_logs(entity, entity_id, created_at desc);

-- ===== Roller ve yetkiler =====
-- (migrator rolüyle çalıştır) create role fincan_app login password '...' nobypassrls nosuperuser;
-- grant usage on schema public to fincan_app;
-- grant select, insert, update, delete on all tables in schema public to fincan_app;   -- price_tier_history/audit_logs için DELETE verme
-- grant usage, select on all sequences in schema public to fincan_app;
-- revoke delete on price_tier_history, audit_logs from fincan_app;

-- ===== Row Level Security =====
-- Tenant tabloları
alter table cafes enable row level security;
create policy cafes_rw on cafes
  using (id = app_cafe_id() or app_is_admin() or app_is_system())
  with check (id = app_cafe_id() or app_is_admin() or app_is_system());

alter table cafe_settings enable row level security;
create policy tenant on cafe_settings
  using (cafe_id = app_cafe_id() or app_is_admin() or app_is_system())
  with check (cafe_id = app_cafe_id() or app_is_admin() or app_is_system());

alter table cafe_ingredients enable row level security;
create policy tenant on cafe_ingredients
  using (cafe_id = app_cafe_id() or app_is_admin())
  with check (cafe_id = app_cafe_id() or app_is_admin());

alter table recipes enable row level security;
create policy tenant on recipes
  using (cafe_id = app_cafe_id() or app_is_admin() or app_is_system())
  with check (cafe_id = app_cafe_id() or app_is_admin() or app_is_system());

alter table recipe_ingredients enable row level security;
create policy tenant on recipe_ingredients
  using (exists (select 1 from recipes r where r.id = recipe_id and (r.cafe_id = app_cafe_id() or app_is_admin() or app_is_system())))
  with check (exists (select 1 from recipes r where r.id = recipe_id and (r.cafe_id = app_cafe_id() or app_is_admin() or app_is_system())));

alter table orders enable row level security;
create policy tenant on orders
  using (cafe_id = app_cafe_id() or app_is_admin() or app_is_system())
  with check (cafe_id = app_cafe_id() or app_is_admin() or app_is_system());

alter table order_items enable row level security;
create policy tenant on order_items
  using (exists (select 1 from orders o where o.id = order_id and (o.cafe_id = app_cafe_id() or app_is_admin() or app_is_system())))
  with check (exists (select 1 from orders o where o.id = order_id and (o.cafe_id = app_cafe_id() or app_is_admin() or app_is_system())));

-- Katalog: onaylı kafe okur, sadece admin yazar
create function app_cafe_approved() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from cafes where id = app_cafe_id() and status = 'approved' and deleted_at is null)
$$;

alter table roasters enable row level security;
create policy read_approved on roasters for select using (app_is_admin() or app_cafe_approved() or app_is_system());
create policy admin_write  on roasters for all    using (app_is_admin()) with check (app_is_admin());

alter table products enable row level security;
create policy read_approved on products for select using (app_is_admin() or app_cafe_approved() or app_is_system());
create policy admin_write  on products for all    using (app_is_admin()) with check (app_is_admin());

alter table price_tiers enable row level security;
create policy read_approved on price_tiers for select using (app_is_admin() or app_cafe_approved() or app_is_system());
create policy admin_write  on price_tiers for all    using (app_is_admin()) with check (app_is_admin());

alter table roaster_admin enable row level security;
create policy admin_only on roaster_admin for all using (app_is_admin() or app_is_system()) with check (app_is_admin());

alter table price_tier_history enable row level security;
create policy admin_only on price_tier_history for all using (app_is_admin()) with check (app_is_admin() or true); -- trigger yazar

alter table audit_logs enable row level security;
create policy admin_only on audit_logs for all using (app_is_admin()) with check (app_is_admin() or app_is_system());
```

> Not (Claude Code'a): `price_tier_history` trigger'ı kafe tarafında tetiklenmez (sadece admin yazar). `with check (... or true)` satırını, trigger'ın admin bağlamında çalıştığını doğruladıktan sonra daha sıkı bir ifadeyle değiştir. RLS politikalarını **otomatik testlerle** doğrula.

### 6.3 Seed
- Varsayılan reçete şablonları **kodda** (`packages/shared`), veritabanında değil. Kafe kaydolunca (veya ilk açılışta) bu şablonlardan kafeye özel `recipes` + `cafe_ingredients` ("Süt" varsayılan) üretilir.
- Geliştirme seed'i: 1 admin, 2 onaylı kafe, 1 bekleyen kafe, 3 kavurucu, 12 ürün, kademeli fiyatlar. **Gerçek kavurucu/kişi verisi seed'e konmaz**, uydurma isimler kullanılır.

---

## 7. Para, birim ve maliyet motoru

### 7.1 Kurallar
- Para kuruş cinsinden `integer`. Gösterimde `Intl.NumberFormat('tr-TR', {style:'currency', currency:'TRY'})`.
- Hesaplar `number` ile yapılır, **sadece en sonda** kuruşa **yarım yukarı yuvarlanır** (`Math.round`). Ara toplamlar yuvarlanmaz.

### 7.2 Varsayılan reçeteler (hepsi düzenlenebilir, "kabaca" değerlerdir)
Varsayılan olarak bir fincan = ayarlardaki kahve dozu (18 g, kafe çift shot için değiştirebilir).

| Reçete | Kahve | Süt | Şurup | Bardak |
|---|---|---|---|---|
| Espresso | doz | — | — | evet |
| Americano | doz | — | — | evet |
| Latte | doz | 200 ml | — | evet |
| Cortado | doz | 60 ml | — | evet |
| Cappuccino | doz | 120 ml | — | evet |
| Mocha | doz | 150 ml | 20 ml (kullanıcı kendi şurubunu seçer; yoksa uyarı göster) | evet |

Kafe özel reçete ekleyebilir (ad, kahve gramı, malzeme + ml listesi, bardak kullanımı). Su maliyeti ayrı hesaplanmaz, "sabit gider/fincan" içinde düşünülür.

### 7.3 Formüller (`packages/shared/src/cost.ts`, saf fonksiyonlar, %100 birim testli)

```
kahve_fiyat_kg_efektif = (kavurucu fiyatı kg başına, KDV'siz hâle getirilmiş*)
  *eğer settings.cost_excludes_vat && roaster.prices_include_vat  →  fiyat / (1 + roaster.vat_rate_pct/100)

kahve_maliyeti   = (gram / (1 - coffee_waste_pct/100)) * kahve_fiyat_kg_efektif / 1000
malzeme_maliyeti = Σ [ (ml / (1 - ingredient_waste_pct/100)) / 1000 * ingredient.price_per_liter ]
ambalaj          = uses_cup ? cup_cost : 0
toplam_maliyet   = kahve_maliyeti + malzeme_maliyeti + ambalaj + fixed_overhead_per_cup

önerilen_fiyat_kdvsiz = toplam_maliyet / (1 - target_margin_pct/100)
önerilen_fiyat_kdvli  = önerilen_fiyat_kdvsiz * (1 + sale_vat_rate_pct/100)
önerilen_fiyat_son    = yukarı yuvarla (önerilen_fiyat_kdvli, price_rounding_step)

mevcut_marj_% (sell_price verilmişse):
  satis_kdvsiz = sell_price / (1 + sale_vat_rate_pct/100)
  marj = (satis_kdvsiz - toplam_maliyet) / satis_kdvsiz
```

- **Kademe seçimi:** kullanıcı X kg ister → `min_kg <= X` olan en yüksek kademe uygulanır.
- **Kâr-zarar uyarıları:** marj < %0 ise kırmızı uyarı; hedef marjın altındaysa sarı uyarı.
- **Karşılaştırma:** seçili reçete için tüm aktif ürünler "fincan başı maliyet"e göre sıralanır (aylık tüketim kg'ına göre doğru kademe ile).
- Motor, hem **manuel fiyatla** (pending kafe) hem **katalog ürünüyle** aynı fonksiyonu kullanır.
- Test örnekleri yaz: fire 0 ve fire > 0, KDV dahil/hariç, kademe sınırları (min_kg tam eşik), 0 ml malzeme, yuvarlama.

---

## 8. Sipariş akışı, WhatsApp, kavurucu sayfası, komisyon

### 8.1 Akış (kafe tarafı)
1. Kafe, katalogdan ürünleri bir **kavurucu sepetine** ekler (sepet cihazda `zustand` + kalıcı depoda; kavurucu başına ayrı).
2. Sepet ekranında kg, istenen teslim tarihi, not; kademe fiyatı otomatik güncellenir, ara toplam görünür.
3. **"Siparişi WhatsApp ile gönder"** → `POST /v1/orders` (sipariş `draft`, kalemler snapshot'lanır, tek kullanımlık token üretilir, `token_hash` saklanır) → API `waUrl` döner.
4. Uygulama `Linking.openURL(waUrl)` ile WhatsApp'ı açar. WhatsApp yüklü değilse web'e düşer; ayrıca **"Mesajı kopyala"** yedeği sunulur.
5. Uygulamaya dönüldüğünde (AppState `active`) bir alt pencere sorar: **"Mesajı gönderdin mi?"** → Evet → `POST /v1/orders/:id/mark-sent` → durum `sent` + başarı animasyonu (pop-up, haptic). Hayır → taslak olarak kalır, tekrar gönderebilir.
6. Kafe, siparişlerim ekranında durumu izler: `Taslak → Gönderildi → Kavurucu onayladı / Karşılayamıyor / Süresi doldu / İptal`.

### 8.2 WhatsApp mesaj şablonu (`packages/shared`, Türkçe)
```
Merhaba {roaster_name}, {APP_NAME} üzerinden yeni sipariş talebi var.

Kafe: {cafe_name} ({district})
Telefon: {cafe_phone}
Sipariş no: S-{order_no}

{items — her satır: "• {product_name} — {kg} kg"}

İstenen teslim tarihi: {date | "Belirtilmedi"}
Not: {note | "-"}

Siparişi aldığınızı bu bağlantıdan işaretleyin: {https://DOMAIN/r/TOKEN}
```
- `waUrl = https://wa.me/{whatsapp_numarası_artı_olmadan}?text={encodeURIComponent(mesaj)}`
- Telefon normalizasyonu: `05xx…`, `5xx…`, `+90…` → `+905xxxxxxxxx` (E.164). Geçersizse formda hata.
- Mesaj uzunluğu aşırı olursa kalemler kısaltılmaz; kullanıcıya "Mesajı kopyala" seçeneği sunulur.

### 8.3 Kavurucu sayfası (hesapsız, tek kullanımlık bağlantı)
- `GET https://DOMAIN/r/:token` → API'nin ürettiği **minimal, sunucu taraflı HTML** (framework yok, çerez yok, analitik yok, tek küçük inline CSS, mobil uyumlu, Türkçe).
- İçerik: sipariş özeti (kafe adı, ürünler, kg, tarih, not). Altında **zorunlu soru** (radyo): 
  - ( ) **Bu kafe daha önce müşterimiz değildi** (yeni müşteri)
  - ( ) **Bu kafe daha önce de bizden alıyordu**
- Butonlar: **"Siparişi aldım"** ve **"Karşılayamıyorum"** (kısa sebep alanı opsiyonel).
- Karar **bir kez** verilir (`decided_at` doluysa sayfa sonucu gösterir, form kapanır). Hatalı karar için admin düzeltir.
- Güvenlik: token 32 bayt rastgele (base64url), DB'de SHA-256 hash; süresi **30 gün**; IP başına hız sınırı; `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex`, sıkı CSP; geçersiz/süresi dolmuş token için genel hata (bilgi sızdırma yok).
- Altta kısa **KVKK bilgilendirmesi** + gizlilik politikası bağlantısı (kavurucunun telefonu/işletme bilgisi kişisel veri olabilir).

### 8.4 İlk sipariş ve komisyon mantığı
Kavurucu **"Siparişi aldım"** dediğinde, tek transaction içinde:
```
status            = 'confirmed'
decided_at        = now()
roaster_says_new_customer = (seçim)

önceki_onaylı_var = exists(orders where cafe_id, roaster_id aynı AND status='confirmed' AND id <> bu)

if roaster_says_new_customer AND NOT önceki_onaylı_var:
    is_first_order = true
    commission_rate_bp_snapshot = roaster_admin.commission_rate_bp
    commission_base_kurus  = subtotal_kurus
    commission_amount_kurus = round(commission_base_kurus * rate_bp / 10000)
    commission_status = 'pending'
else:
    is_first_order = false   (benzersiz indeks ihlali olmasın diye null da olabilir; null öner)
    commission_status = 'not_applicable'
```
- Kavurucu "daha önce müşterimizdi" derse komisyon **yok**. Kavurucu "yeni" der ama sistemde önceki onaylı sipariş varsa komisyon **yok** (admin'e "çelişki" işareti düşer).
- `Karşılayamıyorum` → `declined`, komisyon yok.
- **Admin** komisyon tutarını/tabanını gerçek teslimata göre **düzeltebilir** (`commission_base_kurus` override) ve durumu `pending → requested → paid / waived` olarak ilerletir; her değişiklik `audit_logs`'a yazılır.
- Tahsilat uygulama dışı (nakit/IBAN); uygulama sadece "tahsil edilecek / talep edildi / ödendi" listesini ve toplamları gösterir.
- `sent` durumda 14 gün karar gelmezse iş (job) siparişi `expired` yapar.

---

## 9. API (REST, `/v1`, JSON)

Genel: Zod doğrulama, tutarlı hata formatı `{ error: { code, message, details? } }`, sayfalama anahtar tabanlı (cursor), tüm listelerde `limit` üst sınırı, UUID id'ler, `Authorization: Bearer`.

**Kimlik**
- `POST /auth/register` → {email, password, cafeName, district, phone, consents:[{doc_type, doc_version}]} ; kullanıcı + kafe(pending) + üyelik + settings + varsayılan reçeteler oluşturur, doğrulama e-postası yollar
- `POST /auth/verify-email`, `POST /auth/resend-verification`
- `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/logout-all`
- `POST /auth/forgot-password`, `POST /auth/reset-password`
- `POST /me/change-password`
- `GET /me` (kullanıcı + kafe + durum)
- `DELETE /me` → hesap silme (Bölüm 14.4)
- `GET /me/export` → kullanıcının tüm verisi JSON (KVKK erişim hakkı)

**Kafe (tenant)**
- `GET/PATCH /cafe`, `GET/PATCH /cafe/settings`
- `GET/POST /cafe/ingredients`, `PATCH/DELETE /cafe/ingredients/:id`
- `GET/POST /cafe/recipes`, `PATCH/DELETE /cafe/recipes/:id` (malzeme listesiyle birlikte)

**Katalog (yalnızca onaylı kafe/admin)**
- `GET /catalog/sync?since_rev=N` → `{ rev: <yeni_max>, roasters:[], products:[], price_tiers:[] }` (silinenler `deleted_at` ile gelir). `ETag`/`If-None-Match` destekler. **Kafelere kavurucunun komisyon oranı/admin notu asla dönmez.**

**Siparişler (onaylı kafe)**
- `POST /orders` (tek kavurucu, kalemler) → {order, waUrl}
- `POST /orders/:id/mark-sent`, `POST /orders/:id/cancel`
- `GET /orders`, `GET /orders/:id`

**Herkese açık (token ile)**
- `GET /r/:token`, `POST /r/:token/decide`
- `GET /legal/:doc` (gizlilik, kullanım koşulları, aydınlatma metni; mağaza ve uygulama için URL)
- `GET /account-deletion` (Google Play için web üzerinden silme talebi sayfası/bilgisi)
- `GET /healthz`

**Admin (`role=admin`)**
- `GET /admin/cafes?status=` , `GET/PATCH /admin/cafes/:id` , `POST /admin/cafes/:id/approve|reject|suspend` (not ile)
- `CRUD /admin/roasters` (+ komisyon oranı, KDV bilgisi, notlar)
- `CRUD /admin/products`, `CRUD /admin/price-tiers`
- `POST /admin/roasters/:id/prices/import` → toplu içe aktarma (yapıştırılan CSV/tablo; önce **önizleme (dry-run)**, hata satırları raporu, onaydan sonra yazma)
- `GET /admin/price-tiers/:id/history`, `POST /admin/price-history/:id/rollback`
- `GET /admin/orders?commission_status=&roaster_id=`, `PATCH /admin/orders/:id/commission` (durum, taban tutar override, not), `PATCH /admin/orders/:id/decision` (hatalı kavurucu kararını düzelt)
- `GET /admin/audit-logs`, `GET /admin/stats` (bekleyen kafe sayısı, tahsil edilecek toplam, aylık sipariş sayısı)

**Güvenlik notları:** giriş denemelerinde hız sınırı + hesap kilitleme (örn. 5 hata → 15 dk), parola politikası (min 10 karakter), e-posta doğrulanmadan sipariş yok (admin onayından bağımsız ek şart), tüm admin uçları ayrı yetki kontrolü + testi.

---

## 10. Mobil uygulama — ekranlar ve navigasyon

### 10.1 Kafe tarafı (alt sekmeler)
1. **Maliyet** (ana sayfa): reçete seç → kahve kaynağı seç (katalogdan ürün veya **manuel fiyat**) → anlık maliyet dökümü (kahve/süt/şurup/bardak/sabit), önerilen satış fiyatı, mevcut marj. Rakamlar animasyonla sayılır.
2. **Reçeteler:** liste, düzenle, yeni ekle; malzeme seçimi.
3. **Kavurucular** (katalog): kavurucu listesi (fiyat güncelliği etiketi) → kavurucu detay (ürünler, kademeli fiyatlar, "sepete ekle") + **Karşılaştır** görünümü (fincan başı maliyete göre sıralı).
4. **Siparişler:** sepetler (kavurucu başına) + geçmiş siparişler + durum zaman çizgisi.
5. **Ayarlar:** işletme bilgisi, maliyet parametreleri, malzemeler (süt/şurup litre fiyatları), yasal metinler, verilerimi indir, hesabımı sil, çıkış.

`pending` kafede 3. ve 4. sekme yerine **"Onay bekleniyor"** durum kartı (hafif animasyon) görünür; 1., 2. ve 5. çalışır (manuel fiyatla).

### 10.2 Akış ekranları
Karşılama → Giriş / Kayıt (3 adımlı: hesap → işletme → yasal onaylar) → E-posta doğrulama → Onay bekleniyor/ana uygulama.

### 10.3 Admin (yalnızca `role=admin` görür, ayrı sekme grubu)
Panel (bekleyen kafe, tahsil edilecek komisyon) · Kafeler (liste/detay/onay-red-askı/düzenle) · Kavurucular (CRUD) · Ürünler & Fiyatlar (satır içi düzenleme, toplu yapıştır/CSV önizlemeli içe aktarma, **geçmiş + geri al**) · Siparişler & Komisyon (filtre, durum ilerletme, tutar düzeltme) · Denetim kayıtları.

### 10.4 Boş/hata/çevrimdışı durumları
Her liste için boş durum çizimi (kendi SVG'miz), ağ hatasında "tekrar dene", çevrimdışı iken üstte ince banner ve **son senkron zamanı**; hesaplayıcı tamamen çevrimdışı çalışır.

---

## 11. Tasarım sistemi

### 11.1 Renk (sade, beyaz zemin)
```ts
export const colors = {
  bg:        '#FFFFFF',
  surface:   '#FBF8F6',   // kart/ikincil yüzey (çok hafif sıcak)
  border:    '#EADFD8',
  text:      '#2B1F1A',   // koyu kahve metin
  textMuted: '#7A6B63',
  primary:   '#5E1A2B',   // BORDO — üst bar, ana butonlar, vurgu
  primaryPressed: '#4A1422',
  onPrimary: '#FFFFFF',
  coffee:    '#3A2A22',   // alternatif koyu kahve (ikincil bar/başlık)
  success:   '#2F7D4F',
  warning:   '#B7791F',
  danger:    '#B3261E',
  info:      '#3B5B7A',
};
```
Bordo/kahve tonları iki aday; uygulama sonunda Burak tek ana renge karar verecek, tüm renkler `theme/` altında tek yerden değişebilir olsun. **WCAG AA kontrast** (metin ≥ 4.5:1) test edilsin. Karanlık mod MVP'de yok.

### 11.2 Tipografi
- **Başlıklar:** Fraunces (OFL) — sıcak, karakterli serif.
- **Gövde/arayüz:** Plus Jakarta Sans (OFL).
- Rakamlar: `fontVariant: ['tabular-nums']`.
- **Kurulumdan önce** her fontun Türkçe karakterleri (ğ, ü, ş, ö, ç, ı, İ) doğru gösterdiğini ekranda doğrula. Sorun çıkarsa eşdeğer OFL font seç ve `DECISIONS.md`'ye yaz.
- Sistem/Inter/Roboto/Söhne-benzeri varsayılan görünüm **istenmiyor**.
- Dynamic Type/yazı boyutu büyütmeye saygı göster.

### 11.3 Bileşen dili
Yuvarlatılmış köşeler (12–16), geniş boşluk, kartlar ince kenarlıkla (gölge minimum), üst bar bordo (beyaz metin), büyük dokunma alanları (≥ 44pt), net birincil buton (bordo, dolu), ikincil buton (kenarlıklı).

### 11.4 Animasyon (Duolingo hissi, ölçülü)
- **Pop-up/alt pencere (bottom sheet):** yaylanarak (spring) açılır, hafif "bounce".
- **Başarı:** sipariş gönderildi, onay alındı → SVG onay işareti çizilerek belirir + küçük konfeti (Reanimated ile **kendi parçacık animasyonumuz**) + `Haptics.notificationAsync(Success)`.
- **Buton:** basınca ölçek 0.96, bırakınca yaylanma.
- **Sayılar:** maliyet/marj değişince count-up.
- **Liste girişi:** kısa kademeli (stagger) belirme (ilk 8 öğeyle sınırlı).
- **Hata:** hafif titreşim animasyonu + `Haptics.Error`.
- **Karakter/maskot:** kullanılacaksa **tamamen özgün**, bizim çizdiğimiz basit SVG (örn. kahve çekirdeği/fincan); hiçbir mevcut karaktere benzemeyecek.
- Tüm animasyonlar **UI thread**'de (Reanimated worklet), **"Hareketi azalt" (reduce motion)** ayarına saygı gösterir (animasyon yerine anlık geçiş).
- Ses efekti yok (telif/boyut).

### 11.5 Erişilebilirlik
`accessibilityLabel/Role`, VoiceOver testi, renkle tek başına anlam verme (ikon + metin), form hataları metinle.

---

## 12. Performans, önbellek, optimizasyon

### 12.1 Cihaz önbelleği (cache-first, stale-while-revalidate)
- Açılışta **önce cihazdaki veri** gösterilir (splash ekranı önbellek hazır olana dek tutulur), arka planda senkronize edilir.
- **Katalog delta senkronu:** istemci `last_rev` saklar → `GET /catalog/sync?since_rev=last_rev`. Gelenler (silinenler dâhil) yerel depoya uygulanır. Değişiklik yoksa `304`/boş yanıt. İlk açılış tam indirme.
- Senkron tetikleri: uygulama açılışı, ön plana dönüş (en fazla 5 dk'da bir), manuel "yenile" (pull-to-refresh).
- TanStack Query: kalıcı önbellek (versiyonlu `buster`; şema değişince eski cache temizlenir), `staleTime` katalog için uzun, siparişler için kısa, `retry` üstel geri çekilme.
- Kafe ayarları/reçeteler/malzemeler cihazda tutulur; **maliyet hesabı tamamen cihazda** (ağ gerekmez).
- Sipariş oluşturma çevrimiçi gerektirir (MVP). Çevrimdışıysa net uyarı.
- Token'lar yalnızca `expo-secure-store`'da; önbellekte parola/token **yok**.

### 12.2 Mobil performans
- Hermes (varsayılan), FlashList + `getItemType`/sabit yükseklik ipuçları, `React.memo`/`useCallback` yerinde, satır içi nesne/fonksiyon yaratmaktan kaçınma, ekranları tembel yükleme (expo-router varsayılanı), büyük bağımlılıklardan kaçınma (örn. tüm lodash, moment yok; `date-fns` yalnızca gereken fonksiyonlar).
- Görsel varlık minimum (MVP'de fotoğraf yok; ikonlar SVG).
- **Bundle boyutunu ölç** (`expo export` çıktısı) ve her fazda raporla; gereksiz paketleri kaldır.
- Hedefler (orta seviye telefonda): soğuk açılış ≤ 2 sn (önbellekten içerik), listelerde 60 fps, etkileşime tepki ≤ 100 ms.

### 12.3 API ve veritabanı optimizasyonu
- Yanıt sıkıştırma (brotli/gzip), `ETag`, minimal DTO (gereksiz kolon yok), katalog yanıt boyutu tipik < 50 KB.
- Doğru indeksler (Bölüm 6), N+1 yok (toplu yükleme/JOIN), sorgu planı kontrolü (`EXPLAIN (ANALYZE, BUFFERS)`) — kritik sorgular için `docs/RUNBOOK.md`'ye notlar.
- Bağlantı havuzu boyutu ayarlı, uzun sorgu zaman aşımı (`statement_timeout`), katalog okuma için kısa süreli bellek önbelleği (rev ile geçersiz kılma).
- Anahtar tabanlı sayfalama (`created_at, id`).
- `VACUUM/ANALYZE` otomatik (autovacuum açık), yedek stratejisi Bölüm 17.

---

## 13. Güvenlik

- OWASP Mobile/API Top 10 kontrol listesi uygulanır.
- Parola: argon2id; giriş hız sınırı + kilitleme; e-posta doğrulama; şifre sıfırlama token'ı tek kullanımlık ve kısa ömürlü (1 saat); parola değişince tüm refresh token'lar iptal.
- Refresh token rotasyonu + yeniden kullanım tespiti (aile iptal).
- TLS zorunlu (HSTS), `helmet`, katı CORS (mobil için gerekmez; kavurucu sayfası aynı origin), istek boyutu sınırları.
- SQL injection: parametreli sorgular (Kysely); XSS: kavurucu HTML sayfasında tüm değişkenler **kaçırılır (escape)**, CSP.
- Tenant izolasyonu testleri: kafe A, kafe B'nin ayarlarını/siparişini/reçetesini okuyamaz-yazamaz; pending kafe katalog okuyamaz; kafe kullanıcı admin uçlarına erişemez; kafe kullanıcı `roaster_admin`'i göremez.
- Loglarda kişisel veri maskeli, log saklama süresi kısa (örn. 30 gün).
- Bağımlılık taraması (`pnpm audit`), CI'da.
- Mobil: jailbreak tespiti MVP'de yok; sertifika sabitleme MVP'de yok (not düş).
- Sırlar sunucuda ortam değişkeni; repoda yok.

---

## 14. Gizlilik, KVKK ve yasal metinler

> Ben bir hukuk danışmanı değilim. Aşağıdaki liste bir **kontrol listesidir**. Claude Code `legal/` altında **taslak** metinler üretir; yayından önce bir hukukçu/KVKK danışmanı tarafından incelenmelidir. Her taslağın başına "TASLAK — hukukçu incelemesi gerekir" notu konur.

### 14.1 Toplanan veri (veri minimizasyonu — bu liste dışında veri toplanmaz)
| Veri | Amaç |
|---|---|
| E-posta, parola hash'i | Hesap/giriş |
| Kafe adı, ilçe, telefon | Onay, kavurucu ile iletişim (sipariş mesajında kavurucuya gider) |
| Maliyet ayarları, malzeme/reçete | Hesaplama (kafeye ait) |
| Siparişler (kalemler, tarih, not) | Sipariş iletimi, komisyon kaydı |
| Yasal onay kayıtları (belge+sürüm+zaman) | İspat |
| Teknik loglar (IP dahil olabilir, kısa süreli) | Güvenlik/hata ayıklama |

**Toplanmaz:** konum, kişi rehberi, reklam kimliği, vergi no/levhası, kimlik, ödeme kartı, analitik/davranış izleme.

### 14.2 Hazırlanacak metinler (`legal/` ve uygulama içinde + herkese açık URL)
1. **KVKK Aydınlatma Metni** (m.10): veri sorumlusu kimliği ve iletişim, işleme amaçları, hukuki sebepler (sözleşmenin kurulması/ifası, meşru menfaat, hukuki yükümlülük), aktarım (kavurucuya sipariş kapsamında; **yurt dışı aktarım yok**; WhatsApp'ın kullanıcının kendi cihazından kullanımı hakkında not), toplama yöntemi, saklama süreleri, **m.11 hakları** ve başvuru yolu.
2. **Gizlilik Politikası** (mağazalar için de gerekli): yukarıdaki veri tablosu, saklama, güvenlik, çocukların kullanımı (uygulama işletmelere yöneliktir), iletişim.
3. **Kullanım Koşulları / Üyelik Sözleşmesi:** hizmetin tanımı (fiyatlar bilgilendirme amaçlı, sipariş kafe ile kavurucu arasında akdedilir, teslimat/ödeme platform dışı), hesap onayı, kullanıcı yükümlülükleri, sorumluluk sınırı, komisyonun kavurucuyla ayrı anlaşmaya tabi olması, fesih, uyuşmazlık.
4. **Veri Saklama ve İmha Politikası** (iç belge) ve **veri ihlali müdahale planı** (iç belge; ihlalde KVKK Kurulu/ilgili kişilere bildirim süreleri).
5. **Kavurucu bilgilendirme notu** (kavurucu sayfasında kısa) + admin'in kavurucuyla yaptığı **yazılı/mesaj üzerinden anlaşma şablonu** (yeni müşteri tanımı, %15 ilk sipariş komisyonu, ödeme yöntemi ve süresi).
6. **Açık rıza:** sadece gerçekten gerektiğinde ayrı ve isteğe bağlı olarak (şu an gerektiren bir işlem yok). Zorunlu hizmeti rızaya bağlama (bundling) **yok**.
7. Ticari elektronik ileti (pazarlama e-postası/SMS) **gönderilmeyecek**; gönderilirse İYS ve izin süreçleri eklenir.

### 14.3 Kayıt sırasında
Üç ayrı onay kutusu **işaretsiz** gelir: Kullanım Koşulları, Gizlilik Politikası (okudum), Aydınlatma Metni (okudum). Sürümler `consents` tablosuna yazılır. Metinler güncellenince yeni sürüm kabulü istenir.

### 14.4 Hesap silme ve veri dışa aktarma (Apple ve Google zorunlu kılar)
- Uygulama içinde **Ayarlar → Hesabı sil** (parola/onay ile). Google için ayrıca **web üzerinden silme talebi** sayfası.
- Silinen hesapta: e-posta, ad, telefon **anonimleştirilir**, kafe adı anonim etiketlenir, oturumlar kapatılır. **Muhasebe/komisyon kaydı için gerekli sipariş verileri** (tutarlar, tarihler, kavurucu) yasal saklama gereği için asgari düzeyde tutulur; bu durum aydınlatma metninde yazılır (sürelerin doğrulanması hukukçudan).
- **Verilerimi indir:** `GET /me/export` → JSON.

### 14.5 İş/vergi tarafı (kod dışı, Burak'ın yapacağı kontrol)
- Komisyon geliri için işletme/vergi mükellefiyeti ve fatura düzeni (muhasebeci).
- 6563 sayılı Kanun ve ilgili yönetmelikler kapsamında **aracı hizmet sağlayıcı/ETBİS** yükümlülüklerinin bu model için geçerli olup olmadığı, VERBİS kayıt muafiyet eşikleri (çalışan sayısı/mali büyüklük) → hukukçu/muhasebeciyle teyit et.
- Marka ve uygulama adı için **TÜRKPATENT** ve mağaza adı çakışma kontrolü.

---

## 15. Mağaza yayın hazırlığı (App Store + Google Play)

**Hesaplar/maliyet (not):** Apple Developer Program (yıllık ücret) ve Google Play Console (tek seferlik ücret) ücretlidir; güncel tutarları/koşulları kontrol et. Alan adı (privacy/destek sayfası ve `/r/` bağlantısı için) ve Türkiye'de barındırma da ücretlidir. **Geliştirme ve kendi telefonunda test (Expo Go) ücretsizdir.**

**Ortak**
- Uygulama adı, ikon (kendi tasarımımız), ekran görüntüleri, açıklama (TR), gizlilik politikası URL'i, destek URL'i/e-posta.
- Bundle/package id: `tr.<alanadi>.fincan` (örnek; alan adı belli olunca netleşir).
- **İnceleme için demo hesabı:** admin onayı beklemeden çalışan, **önceden onaylı** bir demo kafe hesabı + açıklama notu (manuel onay akışını anlat).
- İçerik derecelendirme formları, veri güvenliği beyanları (gerçek veri tablosuyla **birebir tutarlı**).

**Apple (App Store)**
- App Privacy ("nutrition label") beyanı, gizlilik politikası URL'i, **uygulama içi hesap silme** (5.1.1), demo hesap, şifreleme beyanı (standart HTTPS: `ITSAppUsesNonExemptEncryption=false`), minimum işlevsellik (4.2) için manuel fiyatlı hesaplayıcı zaten kullanılabilir.
- Üçüncü taraf ile giriş (Google/Facebook vb.) yok → "Sign in with Apple" gerekmez.
- Uygulama içi satın alma yok; B2B fiziksel mal siparişi uygulama dışında ödenir → IAP gerektirmez (inceleme notunda açıkla).

**Google Play**
- Data safety formu, **web'de hesap silme URL'i**, hedef API seviyesi güncel, uygulama imzalama (Play App Signing).
- Yeni kişisel geliştirici hesapları için **kapalı test** şartı (belirli sayıda test kullanıcısı ve gün) olabilir; güncel koşulu Play Console'da doğrula ve takvime işle.

**Derleme:** EAS Build (kod bulutta derlenir, kullanıcı verisi içermez) veya Mac varsa yerel derleme. `expo-updates` kapalı.

---

## 16. Test stratejisi

- **Birim (Vitest):** maliyet motoru, kademe seçimi, para/telefon yardımcıları, WhatsApp URL/mesaj üretici, komisyon hesabı.
- **API entegrasyon:** gerçek PostgreSQL (Docker) üzerinde Fastify `inject`; her migration temiz DB'de çalışır; seed testleri.
- **Güvenlik/tenant testleri (zorunlu):** Bölüm 13'teki liste + RLS'in API katmanı atlansa bile (doğrudan SQL ile `fincan_app` rolüyle) çalıştığını doğrulayan testler.
- **Akış testleri:** kayıt → doğrulama → admin onayı → katalog sync → sipariş → token sayfası → ilk sipariş/komisyon → admin komisyon güncelleme; ikinci siparişte komisyon olmaması; token tek kullanımlığı; süresi dolmuş token.
- **Fiyat geçmişi:** değişiklik → geçmiş satırı → geri alma → yeni geçmiş satırı.
- **Mobil:** bileşen testleri (React Native Testing Library) kritik formlar ve sepet için; manuel kontrol listesi (iPhone'da): çevrimdışı mod, WhatsApp açılışı/dönüş, animasyonlar, reduce motion, büyük yazı.
- **CI:** typecheck + lint + test her push'ta.

---

## 17. Dağıtım, yedekleme, izleme

- Üretim: Türkiye'deki sunucuda Docker Compose (api + postgres + caddy). Postgres verisi ayrı volume'da.
- **Yedek:** günlük `pg_dump` (şifreli), en az 7 günlük + haftalık saklama, yedek **farklı bir konuma ve Türkiye içinde**; **düzenli geri yükleme denemesi** (RUNBOOK'ta adım adım).
- Güncelleme: migration'lar ileri yönlü, deploy öncesi yedek, geri dönüş planı.
- İzleme: `/healthz`, basit uptime kontrolü, disk/bellek uyarısı, log döndürme.
- Alan adı + e-posta: SPF/DKIM/DMARC ayarlı gönderim.
- `docs/RUNBOOK.md`: kurulum, ortam değişkenleri, yedek/geri yükleme, admin kullanıcı oluşturma (ilk admin **CLI betiğiyle**, uygulama içinden kayıtla admin olunamaz), olay müdahale adımları.

---

## 18. Fazlar ve kabul kriterleri

**Faz 0 — İskelet:** monorepo, pnpm, TypeScript strict, ESLint/Prettier, Vitest, Docker Compose (Postgres), CI, `.env.example`, `docs/`. *Kabul:* `pnpm i && pnpm test` ve `docker compose up` temiz çalışır; boş Expo uygulaması Expo Go'da açılır.

**Faz 1 — Veritabanı:** Bölüm 6 şeması migration olarak, roller/yetkiler, RLS, tetikleyiciler, geliştirme seed'i. *Kabul:* temiz DB'de migration çalışır; RLS ve tenant testleri geçer; fiyat geçmişi trigger testi geçer.

**Faz 2 — Kimlik ve onay:** kayıt/giriş/refresh/çıkış/e-posta doğrulama/şifre sıfırlama, yasal onay kayıtları, admin onay/red/askı API'si, ilk admin CLI betiği; mobilde giriş/kayıt/bekleme ekranları. *Kabul:* tüm akış uçtan uca; güvenlik testleri geçer.

**Faz 3 — Katalog yönetimi (admin):** kavurucu/ürün/kademe CRUD, toplu içe aktarma (önizlemeli), fiyat geçmişi + geri alma, denetim kaydı; mobil admin ekranları. *Kabul:* 3 kavurucu ve 12 ürün giriş-düzenleme-geri alma ile çalışır.

**Faz 4 — Maliyet motoru ve reçeteler:** `packages/shared` motoru + testler, ayarlar/malzeme/reçete API ve ekranları, manuel fiyatlı hesaplayıcı (pending kafe dâhil). *Kabul:* 6 varsayılan reçete doğru hesaplanır; çevrimdışı çalışır.

**Faz 5 — Katalog senkronu ve karşılaştırma:** delta sync, cihaz önbelleği, katalog ve karşılaştırma ekranları, güncellik etiketi. *Kabul:* uçak modunda katalog ve hesaplama çalışır; delta sync yalnızca değişeni indirir.

**Faz 6 — Sipariş ve komisyon:** sepet, sipariş oluşturma, `wa.me` akışı, "gönderdin mi?" onayı, kavurucu token sayfası, ilk sipariş/komisyon mantığı, admin komisyon ekranı, expire işi. *Kabul:* Bölüm 8 akış testleri geçer; iPhone'da gerçek WhatsApp ile uçtan uca denendi.

**Faz 7 — Tasarım cilası ve animasyonlar:** tema, fontlar, bileşenler, animasyonlar, boş/hata durumları, erişilebilirlik. *Kabul:* Bölüm 11 maddeleri; reduce motion testi; kontrast kontrolü.

**Faz 8 — Yasal ve mağaza hazırlığı:** `legal/` taslakları ve herkese açık sayfalar, hesap silme + veri dışa aktarma, demo hesap, mağaza kontrol listesi. *Kabul:* Bölüm 14–15 kontrol listesi madde madde işaretli.

**Faz 9 — Üretim:** sunucu kurulumu, TLS, yedek/geri yükleme provası, performans ölçümü (Bölüm 12 hedefleri), TestFlight/Play iç test. *Kabul:* RUNBOOK ile sıfırdan kurulum yapılabilir; geri yükleme denendi.

---

## 19. Açık sorular ve riskler (Burak karar verecek / Claude Code uyarmalı)

1. **Uygulama adı, alan adı, ana renk (bordo mu koyu kahve mi).**
2. **Türkiye'de barındırma sağlayıcısı** ve bütçe.
3. **Komisyon tahsilatı güvene dayalı:** kavurucu "daha önce müşterimizdi" diyebilir; ispat zayıf. İlk dönemde kavurucularla yazılı/mesaj üzerinden net anlaşma şart (Bölüm 14.2/5).
4. **Kafe, ilk siparişi uygulama dışına kaçırabilir** (WhatsApp'tan direkt yazar). MVP'de kabul edilen risk.
5. **Fiyat güncelliği:** fiyatları elle girdiğin için bayat veri riski var; "son güncelleme" etiketi bu yüzden zorunlu, kavurucudan düzenli fiyat güncellemesi iste.
6. KDV oranları (satış ve kavurucu fiyatı) için varsayılanlar **doğrulanmalı**; kavurucudan "fiyatlar KDV dahil mi" bilgisi alınmalı.
7. Kavurucuların fiyatlarının yan yana gösterilmesine itirazı olabilir → ilk görüşmede "yeni müşteri getiren liste" olarak anlat, yazılı onay al.
8. Çıkar çatışması algısı: Flores gibi bağlantılı bir marka listelenecekse aynı kurallar ve şeffaf not.
9. Mağaza hesapları ve alan adı/sunucu maliyetleri bütçe gerektirir; Expo Go ile test ücretsizdir.

---

## 20. Claude Code'a ilk komut (kopyala-yapıştır)

```
PROJE_SARTNAMESI.md dosyasını baştan sona oku. Önce Bölüm 0'daki kurallara ve Bölüm 1'deki kesinleşmiş kararlara uyacağını bir paragrafla özetle ve belirsiz/çelişkili bulduğun noktaları listele (varsa). Ardından yalnızca Faz 0'ı uygula: monorepo iskeleti (pnpm workspaces: apps/mobile, apps/api, packages/shared), TypeScript strict, ESLint/Prettier, Vitest, docker-compose ile yerel PostgreSQL, GitHub Actions CI, .env.example, docs/DECISIONS.md ve docs/RUNBOOK.md taslakları. Faz 0 bitince kabul kriterlerini çalıştırıp sonucu göster ve Faz 1'e geçmeden onayımı bekle.
```

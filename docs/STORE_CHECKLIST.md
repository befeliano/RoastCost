# Mağaza yayın kontrol listesi (Bölüm 14–15)

✅ = kodda/dokümanda hazır · ⏳ = Burak'ın yapacağı (hesap, alan adı, hukukçu)

## Ortak

- ✅ Uygulama ikonu ve açılış ekranı kendi çizimimiz (`apps/mobile/assets/`, `scripts` yok — Playwright ile SVG'den üretildi)
- ✅ Türkçe arayüz (`apps/mobile/src/locales/tr.json`)
- ✅ Gizlilik politikası, kullanım koşulları, aydınlatma metni herkese açık URL: `https://<alan-adı>/legal/privacy|terms|kvkk`
- ✅ Hesap silme: uygulama içi (Ayarlar → Hesabımı sil) **ve** web (`/account-deletion`)
- ✅ Verilerimi indir (Ayarlar → Verilerimi indir, `GET /v1/me/export`)
- ✅ Yasal onaylar ayrı, işaretsiz kutular; sürümleri `consents` tablosunda; metin değişince yeniden onay ekranı
- ✅ İzin istenmez (konum, kamera, rehber, bildirim yok). Android'de `RECORD_AUDIO` ve konum izinleri `blockedPermissions` ile kapatıldı
- ✅ Analitik / reklam / çökme raporlama SDK'sı yok; `expo-updates` kurulu değil
- ⏳ Bundle id: şu an `tr.roastcost.app` (`app.json`). Alan adı alınınca `tr.<alanadi>.roastcost` yapın
- ⏳ `app.json → expo.extra.apiUrl` üretim API adresi
- ⏳ Ekran görüntüleri (iPhone 6.7"/6.1", Android telefon) ve mağaza açıklaması
- ⏳ Destek URL'i ve e-postası (`CONTACT_EMAIL`, `DATA_CONTROLLER` ortam değişkenleri)
- ⏳ `legal/*.md` hukukçu incelemesi (her dosyada TASLAK notu var)
- ⏳ TÜRKPATENT marka ve mağaza adı çakışma kontrolü

## İnceleme için demo hesap

Onaylı bir demo kafe gerekir (manuel onayı beklemesin):

1. Uygulamadan `demo@<alanadi>` ile kayıt ol.
2. Admin panelinde Kafeler → Bekleyen → Onayla. E-posta doğrulamasını yap.
3. İnceleme notuna: "Kafe hesapları elle onaylanır; demo hesap önceden onaylıdır. Ödeme ve teslimat uygulama dışında, kafe ile kavurucu arasında yapılır; uygulama içi satın alma yoktur."

## Apple (App Store)

- ✅ Uygulama içi hesap silme (Guideline 5.1.1(v))
- ✅ `ITSAppUsesNonExemptEncryption = false` (`app.json → ios.infoPlist`)
- ✅ Üçüncü taraf girişi yok → Sign in with Apple gerekmez
- ✅ IAP gerekmez: B2B fiziksel mal siparişi, ödeme uygulama dışı (inceleme notunda belirtin)
- ✅ Minimum işlevsellik (4.2): onay beklerken de manuel fiyatlı maliyet hesaplayıcı çalışır
- ⏳ App Privacy etiketi — aşağıdaki tabloyla **birebir**:

| Veri türü                                                 | Toplanıyor mu          | Kullanıcıya bağlı | İzleme |
| --------------------------------------------------------- | ---------------------- | ----------------- | ------ |
| E-posta adresi                                            | Evet (hesap)           | Evet              | Hayır  |
| Telefon numarası                                          | Evet (sipariş iletimi) | Evet              | Hayır  |
| Diğer kullanıcı içeriği (reçete, sipariş notu)            | Evet (uygulama işlevi) | Evet              | Hayır  |
| Satın alma geçmişi (sipariş talepleri)                    | Evet (uygulama işlevi) | Evet              | Hayır  |
| Konum, kişiler, tanımlayıcılar, kullanım verisi, tanılama | **Hayır**              | —                 | —      |

## Google Play

- ✅ Web'de hesap silme URL'i: `https://<alan-adı>/account-deletion`
- ✅ Hedef API seviyesi: Expo SDK 58 varsayılanı (güncel)
- ⏳ Data safety formu: yukarıdaki tabloyla aynı; "veriler aktarım sırasında şifrelenir: Evet", "kullanıcı silme isteyebilir: Evet", "üçüncü taraflarla paylaşım: Hayır" (kavurucuya iletim, kullanıcının başlattığı işlem olarak beyan edilir — hukukçuyla teyit)
- ⏳ Yeni kişisel geliştirici hesabı ise kapalı test şartı (test kullanıcısı sayısı / gün) — Play Console'da güncel koşulu kontrol edin
- ⏳ Play App Signing

## Derleme

- EAS Build (`npx eas build -p ios|android`) ya da Mac'te yerel derleme. EAS kodu bulutta derler; kullanıcı verisi içermez.

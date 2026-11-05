# RoastCost — 100 iyileştirme

Tasarım (T), işleyiş (İ), kullanışlılık (K), çekicilik (Ç), işlevsellik (F), teknik (G).
Durum: `[x]` uygulandı, `[ ]` bekliyor.

## 1. Tasarım temeli

1. [x] T — Para birimi: tam liralarda kuruş gizlenir (`₺1.100` / `₺27,25`), tüm ekranlarda tek yardımcı.
2. [x] T — Yuvarlak köşeli liste grupları (`RowGroup`): ayarlar, malzemeler, admin listeleri.
3. [x] T — Liste ayırıcıları ince çizgi, grubun son satırında çizgi yok.
4. [x] K — Boş durumlara eylem butonu (ör. "Kavurucuları keşfet").
5. [x] T — Giriş alanı odaklanınca kenarlık ana renge döner.
6. [x] K — Parola alanlarında göster/gizle düğmesi.
7. [x] Ç — İskelet (skeleton) yükleme görünümü; düz "Yükleniyor…" metni kalkar.
8. [x] K — Hata durumu kartı + "Tekrar dene".
9. [x] Ç — Hafif bildirim (toast): "Kaydedildi", "Sepete eklendi" vb.
10. [x] T — Bölüm başlıklarında sayı rozeti.
11. [x] K — Alt menüde Siparişler sekmesinde sepet rozeti.
12. [x] T — Alt menü cam kenarı ve gölgeler kahve tonunda (eski yeşil izler temizlenir).
13. [x] T — Tüm gölge/kenar renkleri palete bağlanır (sabit yeşil `#163300` kalmaz).
14. [x] Ç — Tat notu etiketleri tat ailesine göre renk tonu alır (meyve, çikolata, çiçek, baharat…).
15. [x] T — Öne çıkan kavurucu kartları sayıları tek satıra sığacak genişlikte.

## 2. Keşfet ve kavurucu

16. [x] Ç — Saate göre selam ("Günaydın, Köşe Fincan").
17. [x] K — Keşfet'te arama: kavurucu, çekirdek, köken, tat notu.
18. [x] K — Arama sonucundaki çekirdek doğrudan ürün sayfasını açar.
19. [x] Ç — Hızlı kartlarda canlı özet ("Espresso ₺15,50 / fincan").
20. [x] Ç — "En uygun espresso çekirdekleri" yatay listesi.
21. [x] T — Haritada seçili pin büyür.
22. [x] K — Kavurucu satırlarında kısa adres (mahalle/sokak).
23. [x] F — Kavurucu sayfasında adrese dokununca kopyalanır.
24. [x] K — Kavurucu sayfasındaki sepet düğmesi toplam kg'ı gösterir.
25. [x] F — Kavurucu sayfasında "Yol tarifi" (harita uygulamasında açar).
26. [x] K — Kavurucu sayfasında kategori filtresi (Tümü / Espresso / Demleme).
27. [x] K — Kavurucu sayfasında sıralama (önerilen / fiyat artan).
28. [x] İ — Kavurucu sayfasında sipariş koşulları kutusu (minimum, kart farkı).
29. [x] T — "Sepette" rozeti kg biçiminde ("2,5 kg").
30. [x] T — Ürün kartında en iyi kademe satırı sadeleşir.

## 3. Sipariş kuralları (sunucu + uygulama)

31. [x] İ — Kavurucuya "minimum toplam sipariş (kg)" alanı (migration 0003).
32. [x] İ — Kavurucuya "kredi kartı farkı (%)" alanı.
33. [x] F — Admin kavurucu düzenlemede bu iki alan.
34. [x] İ — Sepette minimum toplam kg ilerleme çubuğu.
35. [x] İ — Minimum karşılanmadan "Gönder" kilitli ve nedeni yazılı.
36. [x] İ — Sepette "kartla öderseniz +₺X" bilgisi.
37. [x] Ç — Sepette kademe ipucu: "1 kg daha eklerseniz ₺Y/kg".
38. [x] K — Sepet satırlarında −/+ düğmeleri.
39. [x] G — Sunucu sipariş oluştururken minimum toplam kg'ı doğrular.
40. [x] İ — Örnek veri: Flores min 5 kg + kart %2,5; diğerlerine örnek koşullar.
41. [x] F — WhatsApp sipariş mesajına toplam kg satırı.
42. [x] G — Bu kurallar için API ve paylaşılan paket testleri.

## 4. Maliyet ve reçeteler

43. [x] İ — Onaylı kafede maliyet ekranı katalog modunda, en uygun espresso çekirdeğiyle açılır.
44. [x] K — Çekirdek seçicide arama.
45. [x] K — Çekirdek seçicide kg fiyatı ve kategori görünür.
46. [x] Ç — Maliyet dağılımı çubuğu (kahve / malzeme / bardak / sabit gider).
47. [x] F — Maliyet sonucunu paylaş (metin).
48. [x] İ — Reçete listesinde fincan maliyeti.
49. [x] İ — Reçete listesinde kâr marjı rozeti (zarar / hedef altı / iyi).
50. [x] T — Her kartta tekrar eden "Hazır şablon" etiketi kalkar.
51. [x] İ — Reçete düzenlemede canlı maliyet ve önerilen fiyat.
52. [x] K — "Önerilen fiyatı kullan" düğmesi.
53. [x] F — Reçeteyi çoğalt.
54. [x] G — Silme onayları web'de de çalışır (ortak `confirm` yardımcısı).
55. [x] F — Malzemede paket fiyatından litre fiyatı hesaplayıcı.
56. [x] F — Sabit gider hesaplayıcı (aylık gider ÷ aylık fincan).
57. [x] T — Maliyet parametreleri bölümlere ayrılır (Kahve / Sarf / Fiyatlama).
58. [x] K — Karşılaştır: aylık tüketim seçilebilir.
59. [x] İ — Karşılaştır: minimum siparişi karşılanmayanlar işaretli.
60. [x] Ç — Karşılaştır: tahmini aylık kahve gideri.
61. [x] K — Karşılaştır: satıra dokununca ürün sayfası açılır.
62. [x] Ç — Karşılaştır: en ucuza göre fark ("+₺0,30").
63. [x] K — Ürün sayfasında hızlı miktar etiketleri (kademe başlangıçları).
64. [x] İ — Ürün sayfasında bu çekirdekle tüm reçetelerin maliyeti.
65. [x] F — Ürün sayfasında "Maliyette kullan".
66. [x] K — Ürün sayfasında sepetten çıkar.
67. [x] Ç — Kademe tablosunda tasarruf TL olarak da.

## 5. Siparişler

68. [x] K — Boş sepette "Kavurucuları keşfet" düğmesi.
69. [x] İ — Sepet kartında toplam kg ve minimum durumu.
70. [x] K — Sipariş geçmişinde durum filtresi.
71. [x] F — "Tekrar sipariş ver" (siparişi sepete kopyalar).
72. [x] K — Sipariş sayfasından kavurucunun kataloğuna geçiş.
73. [x] G — Sipariş iptal onayı web uyumlu.
74. [x] Ç — Bu ayki toplam kahve harcaması özeti.
75. [x] T — Sipariş notu tırnaksız, ikonlu.

## 6. Karşılama, hesap, ayarlar

76. [x] Ç — Karşılama ekranında 3 ikonlu değer maddesi.
77. [x] K — Kayıtta adım adları (Hesap · Kafe · Onay).
78. [x] İ — İlçe serbest metin değil, seçim listesi (kayıt + işletme bilgileri).
79. [x] K — Girişte son e-posta hatırlanır.
80. [x] K — Klavyede "ileri" ile sonraki alana geçiş.
81. [x] Ç — Ayarlarda kafe kartında baş harf avatarı.
82. [x] F — Ayarlarda sürüm ve destek e-postası.
83. [x] Ç — "Uygulamayı öner" (paylaş).
84. [x] G — Çıkış yaparken onay.
85. [x] Ç — Keşfet'te kapatılabilir ilk kullanım ipucu.
86. [x] F — Karşılamada "Kavurucu musunuz?" iletişim bağlantısı.

## 7. Yönetim paneli

87. [x] K — Kafeler listesinde arama.
88. [x] K — Kavurucular listesinde arama.
89. [x] F — Kavurucu düzenlemede konum önizlemesi (mini harita).
90. [x] İ — Panelde "fiyatı 30 günden eski" kavurucu uyarısı.
91. [x] T — Denetim kayıtlarında eylem adları Türkçe.

## 8. Teknik ve erişilebilirlik

92. [x] G — Web + mobil ortak `confirm()` yardımcısı (Alert web'de çalışmıyor).
93. [x] G — İkon düğmelerinde erişilebilirlik etiketi.
94. [x] G — Dokunma hedefleri en az 44 pt (chip'lere hitSlop).
95. [x] K — Sayısal alanlarda klavye "Bitti" tuşu.
96. [x] Ç — Açılış ekranı ve ikon arka planı kahve tonunda.
97. [x] T — Alt menü etiketleri daha okunur.
98. [x] Ç — Ürün/kavurucu detayında yükleme iskeleti.
99. [x] G — Para biçimlendirme için birim testleri.
100.  [x] G — DESIGN.md ve karar kaydı güncellenir.

## "Vibe-coded" izleri — 15 madde kontrolü

1. [x] Mor gradyan — yok; son mor kalıntı (çiçeksi tat notu tonu) gül kurusuna çevrildi.
2. [x] Fazla boşluk — boş durumlar sıkılaştı, ikinci boş bölüm `compact` (çizimsiz); alt pencere iç boşluğu azaldı.
3. [x] Klavye girişi kapatıyor — odaklanan alan görünür alana kaydırılır (`RevealContext`); alt pencere klavyeden kaçar ve kayar.
4. [x] Küçük düğmeler — tüm ikon düğmeleri en az 44 pt dokunma alanı (hitSlop), geri düğmesi büyüdü.
5. [x] Önbellek yok — zaten vardı: katalog ve sorgular cihazda kalıcı (`offlineFirst`, 7 gün).
6. [x] Küçük yazı — en küçük punto 12 (etiketler, alt menü).
7. [x] Her yerde spinner — tek kalan buton spinner'ı yerine üç nokta; listelerde iskelet.
8. [x] Emoji — sunucu sayfalarındaki ✓ işaretleri kaldırıldı; uygulamada emoji yok.
9. [x] Çift dokunuş iki kez gönderiyor — `Button` söz (promise) bitene kadar kilitli + 500 ms koruma; `nav.push` 600 ms içinde aynı ekranı ikinci kez açmaz.
10. [x] Yeni kullanıcıya boş ekran — boş reçete/malzeme/sipariş ekranlarında açıklama + eylem; fiyat girilmeden sahte "₺0 kahve" maliyeti gösterilmez.
11. [x] Yazı ölçekleme — sabit yükseklikli rozetler esnek; avatar harfleri ve alt menü sabit; arama alanı sınırlı.
12. [x] Açık/koyu mod sorunları — uygulama bilinçli olarak yalnızca açık tema (`userInterfaceStyle: light`), klavye de açık; karışık görünüm yok.
13. [x] Ham hata metni — sunucunun İngilizce çerçeve hataları ve 5xx metinleri gösterilmez; durum koduna göre Türkçe mesaj; çökme ekranı sakin bir "Tekrar dene".
14. [x] Dokunma animasyonu yok — tüm dokunulabilir öğeler `Tap` ile hafif küçülüp solar.
15. [x] Güncellemede tercihler siliniyor — kalıcı tercihler sürümlü, eski sürüm verisi korunur (`persistOptions` + test); silinen çekirdek seçiliyse yenisi atanır.

## Yaygın yapay zekâ kod hataları — 50 madde denetimi

Uygun olmayanlar (N/A): bu projede Next.js, Tailwind, OAuth, Stripe/webhook, sunucusuz fonksiyon ve çerez oturumu yok.

| #      | Hata                                                                      | Durum                                                                                                                                            |
| ------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1      | Kurulu olmayan paket                                                      | **Düzeltildi:** `scripts/check-deps.mjs` — her import kendi `package.json`'unda bildirilmiş mi (hoisted kurulum hatayı gizliyordu); CI'da        |
| 2      | Yanlış import yolu / büyük-küçük harf                                     | `forceConsistentCasingInFileNames`; CI artık mobil paketi gerçekten derliyor (`expo export`) ve API paketini (`tsup`)                            |
| 3, 7   | Tip uyuşmazlığı                                                           | `strict` + `noUncheckedIndexedAccess`; `pnpm verify` push öncesi yakaladı                                                                        |
| 4–6    | JSX tek kök / sözdizimi / tekrar eden ad                                  | Derleme + lint                                                                                                                                   |
| 8, 9   | ESM/CJS, `React` in scope                                                 | ESM + otomatik JSX dönüşümü                                                                                                                      |
| 10     | Geçersiz hook çağrısı                                                     | **Düzeltildi:** `eslint-plugin-react-hooks` (`rules-of-hooks`, `exhaustive-deps`) hata seviyesinde                                               |
| 11     | undefined okuma                                                           | `noUncheckedIndexedAccess`; eksik ürün/kavurucu/sipariş artık "bulunamadı" gösteriyor (önceden sonsuz iskelet)                                   |
| 12     | Hydration                                                                 | N/A (SSR yok)                                                                                                                                    |
| 13     | Sonsuz render                                                             | `exhaustive-deps` + kararsız `useMemo` bağımlılıkları düzeltildi                                                                                 |
| 14     | State hemen güncellenmiyor                                                | Fonksiyonel `setState` kullanımı                                                                                                                 |
| 15     | useEffect sızıntısı                                                       | **Düzeltildi:** klavye kaydırma zamanlayıcısı ekran kapanınca temizleniyor; diğer dinleyiciler zaten temizleniyordu                              |
| 16, 17 | Sonsuz özyineleme / dizi sınırı                                           | `api()` tek yeniden deneme; `noUncheckedIndexedAccess`                                                                                           |
| 18     | Sayfalamada bir eksik/fazla                                               | **Düzeltildi:** uygulama yalnız ilk 50 siparişi alıyordu → sonsuz liste; sunucu imleci için sınır testi (5 sipariş, 2'şerli, tekrarsız)          |
| 19     | Yarış durumu                                                              | **Düzeltildi:** çıkış yapılırken süren katalog senkronu eski hesabın verisini geri yazamaz; token yenileme zaten tek uçuşlu                      |
| 20     | Bayat kapanış                                                             | **Düzeltildi:** `AnimatedNumber` yeni hedefe eski değerden başlıyordu → ref                                                                      |
| 21     | Saat dilimi                                                               | **Düzeltildi:** fiyat geçerliliği UTC tarihiyle ölçülüyordu (00–03 arası "dün") → ortak `todayTr()` (+ test)                                     |
| 22     | Kayan nokta                                                               | Para kuruş tamsayı; kg gram tamsayı                                                                                                              |
| 23     | Kodlama / SQL kaçışı                                                      | `encodeURIComponent`, Kysely parametreleri (ham SQL yok), HTML kaçışı testli                                                                     |
| 24     | CSS çakışması                                                             | N/A                                                                                                                                              |
| 25     | Yükleniyor / hata durumu yok                                              | **Düzeltildi:** `LoadState` — 14 ekranda iskelet, tekrar dene, 404'te "bulunamadı" (admin detayları boş ekran kalıyordu)                         |
| 26     | CORS                                                                      | Yerel uygulama (CORS yok); web önizleme aynı kaynaktan proxy ile                                                                                 |
| 27     | 401                                                                       | Döner yenileme jetonu, tek uçuşlu yenileme                                                                                                       |
| 28     | 404 rota                                                                  | Tüm rotalar testli                                                                                                                               |
| 29     | 429                                                                       | **Düzeltildi:** 429'da üstel geri çekilmeyle yeniden deneme (diğer 4xx denenmez)                                                                 |
| 30     | JSON yerine HTML                                                          | Önceki turda düzeltildi (Türkçe mesaj)                                                                                                           |
| 31     | Bağlantı havuzu                                                           | `pg.Pool` max 10, `statement_timeout`, işlem içi boşta kalma sınırı                                                                              |
| 32     | SQL enjeksiyonu                                                           | Ham SQL birleştirme yok                                                                                                                          |
| 33     | Eksik ortam değişkeni                                                     | **Düzeltildi:** üretimde örnek değerler (example.com, http) reddedilir (+ test); mobil sürüm https olmayan API ile derlenmişse açıkça hata verir |
| 34     | Webhook imzası                                                            | N/A                                                                                                                                              |
| 35     | Serileştirme                                                              | `int8`/`numeric` → sayı; tarihler ISO                                                                                                            |
| 36–38  | Yönlendirme döngüsü / oturum / OAuth                                      | `Stack.Protected`; jeton SecureStore'da; OAuth yok                                                                                               |
| 39     | RLS her şeyi engelliyor                                                   | Politikalar + RLS testleri                                                                                                                       |
| 40     | Jeton localStorage'da                                                     | Telefonda SecureStore; localStorage yalnız web önizlemede                                                                                        |
| 41     | Yetki kontrolü unutulmuş                                                  | **Eklendi:** her `/v1` rotasını anonim çağıran test (açıkta kalan yok)                                                                           |
| 42     | Sıfırlama jetonu süresiz                                                  | 60 dk, tek kullanımlık                                                                                                                           |
| 43     | CSRF                                                                      | Bearer jeton (çerez yok); kavurucu sayfaları tahmin edilemez jetonla                                                                             |
| 44     | Yerelde çalışıyor, CI'da değil                                            | **Düzeltildi:** `.nvmrc` (CI aynı sürüm), `pnpm verify`; CI eylemleri güncellendi                                                                |
| 45–50  | Sunucusuz / derleme belleği / karışık içerik / SSG / SSL / soğuk başlatma | Logo yalnız https; kalıcı sunucu + Caddy otomatik TLS; diğerleri N/A                                                                             |

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

16. [ ] Ç — Saate göre selam ("Günaydın, Köşe Fincan").
17. [ ] K — Keşfet'te arama: kavurucu, çekirdek, köken, tat notu.
18. [ ] K — Arama sonucundaki çekirdek doğrudan ürün sayfasını açar.
19. [ ] Ç — Hızlı kartlarda canlı özet ("Espresso ₺15,50 / fincan").
20. [ ] Ç — "En uygun espresso çekirdekleri" yatay listesi.
21. [ ] T — Haritada seçili pin büyür.
22. [ ] K — Kavurucu satırlarında kısa adres (mahalle/sokak).
23. [ ] F — Kavurucu sayfasında "WhatsApp'tan yaz".
24. [ ] F — Kavurucu sayfasında "Ara".
25. [ ] F — Kavurucu sayfasında "Yol tarifi" (harita uygulamasında açar).
26. [ ] K — Kavurucu sayfasında kategori filtresi (Tümü / Espresso / Demleme).
27. [ ] K — Kavurucu sayfasında sıralama (önerilen / fiyat artan).
28. [ ] İ — Kavurucu sayfasında sipariş koşulları kutusu (minimum, kart farkı).
29. [ ] T — "Sepette" rozeti kg biçiminde ("2,5 kg").
30. [ ] T — Ürün kartında en iyi kademe satırı sadeleşir.

## 3. Sipariş kuralları (sunucu + uygulama)

31. [ ] İ — Kavurucuya "minimum toplam sipariş (kg)" alanı (migration 0003).
32. [ ] İ — Kavurucuya "kredi kartı farkı (%)" alanı.
33. [ ] F — Admin kavurucu düzenlemede bu iki alan.
34. [ ] İ — Sepette minimum toplam kg ilerleme çubuğu.
35. [ ] İ — Minimum karşılanmadan "Gönder" kilitli ve nedeni yazılı.
36. [ ] İ — Sepette "kartla öderseniz +₺X" bilgisi.
37. [ ] Ç — Sepette kademe ipucu: "1 kg daha eklerseniz ₺Y/kg".
38. [ ] K — Sepet satırlarında −/+ düğmeleri.
39. [ ] G — Sunucu sipariş oluştururken minimum toplam kg'ı doğrular.
40. [ ] İ — Örnek veri: Flores min 5 kg + kart %2,5; diğerlerine örnek koşullar.
41. [ ] F — WhatsApp sipariş mesajına toplam kg satırı.
42. [ ] G — Bu kurallar için API ve paylaşılan paket testleri.

## 4. Maliyet ve reçeteler

43. [ ] İ — Onaylı kafede maliyet ekranı katalog modunda, en uygun espresso çekirdeğiyle açılır.
44. [ ] K — Çekirdek seçicide arama.
45. [ ] K — Çekirdek seçicide kg fiyatı ve kategori görünür.
46. [ ] Ç — Maliyet dağılımı çubuğu (kahve / malzeme / bardak / sabit gider).
47. [ ] F — Maliyet sonucunu paylaş (metin).
48. [ ] İ — Reçete listesinde fincan maliyeti.
49. [ ] İ — Reçete listesinde kâr marjı rozeti (zarar / hedef altı / iyi).
50. [ ] T — Her kartta tekrar eden "Hazır şablon" etiketi kalkar.
51. [ ] İ — Reçete düzenlemede canlı maliyet ve önerilen fiyat.
52. [ ] K — "Önerilen fiyatı kullan" düğmesi.
53. [ ] F — Reçeteyi çoğalt.
54. [x] G — Silme onayları web'de de çalışır (ortak `confirm` yardımcısı).
55. [ ] F — Malzemede paket fiyatından litre fiyatı hesaplayıcı.
56. [ ] F — Sabit gider hesaplayıcı (aylık gider ÷ aylık fincan).
57. [ ] T — Maliyet parametreleri bölümlere ayrılır (Kahve / Sarf / Fiyatlama).
58. [ ] K — Karşılaştır: aylık tüketim seçilebilir.
59. [ ] İ — Karşılaştır: minimum siparişi karşılanmayanlar işaretli.
60. [ ] Ç — Karşılaştır: tahmini aylık kahve gideri.
61. [ ] K — Karşılaştır: satıra dokununca ürün sayfası açılır.
62. [ ] Ç — Karşılaştır: en ucuza göre fark ("+₺0,30").
63. [ ] K — Ürün sayfasında hızlı miktar etiketleri (kademe başlangıçları).
64. [ ] İ — Ürün sayfasında bu çekirdekle tüm reçetelerin maliyeti.
65. [ ] F — Ürün sayfasında "Maliyette kullan".
66. [ ] K — Ürün sayfasında sepetten çıkar.
67. [ ] Ç — Kademe tablosunda tasarruf TL olarak da.

## 5. Siparişler

68. [x] K — Boş sepette "Kavurucuları keşfet" düğmesi.
69. [ ] İ — Sepet kartında toplam kg ve minimum durumu.
70. [ ] K — Sipariş geçmişinde durum filtresi.
71. [ ] F — "Tekrar sipariş ver" (siparişi sepete kopyalar).
72. [ ] F — Sipariş sayfasında kavurucuya WhatsApp / ara.
73. [x] G — Sipariş iptal onayı web uyumlu.
74. [ ] Ç — Bu ayki toplam kahve harcaması özeti.
75. [ ] T — Sipariş notu tırnaksız, ikonlu.

## 6. Karşılama, hesap, ayarlar

76. [ ] Ç — Karşılama ekranında 3 ikonlu değer maddesi.
77. [ ] K — Kayıtta adım adları (Hesap · Kafe · Onay).
78. [ ] İ — İlçe serbest metin değil, seçim listesi (kayıt + işletme bilgileri).
79. [ ] K — Girişte son e-posta hatırlanır.
80. [ ] K — Klavyede "ileri" ile sonraki alana geçiş.
81. [x] Ç — Ayarlarda kafe kartında baş harf avatarı.
82. [x] F — Ayarlarda sürüm ve destek e-postası.
83. [x] Ç — "Uygulamayı öner" (paylaş).
84. [x] G — Çıkış yaparken onay.
85. [ ] Ç — Keşfet'te kapatılabilir ilk kullanım ipucu.
86. [ ] F — Karşılamada "Kavurucu musunuz?" iletişim bağlantısı.

## 7. Yönetim paneli

87. [ ] K — Kafeler listesinde arama.
88. [ ] K — Kavurucular listesinde arama.
89. [ ] F — Kavurucu düzenlemede konum önizlemesi (mini harita).
90. [ ] İ — Panelde "fiyatı 30 günden eski" kavurucu uyarısı.
91. [ ] T — Denetim kayıtlarında eylem adları Türkçe.

## 8. Teknik ve erişilebilirlik

92. [x] G — Web + mobil ortak `confirm()` yardımcısı (Alert web'de çalışmıyor).
93. [ ] G — İkon düğmelerinde erişilebilirlik etiketi.
94. [x] G — Dokunma hedefleri en az 44 pt (chip'lere hitSlop).
95. [x] K — Sayısal alanlarda klavye "Bitti" tuşu.
96. [ ] Ç — Açılış ekranı ve ikon arka planı kahve tonunda.
97. [ ] T — Alt menü etiketleri daha okunur.
98. [x] Ç — Ürün/kavurucu detayında yükleme iskeleti.
99. [x] G — Para biçimlendirme için birim testleri.
100.  [ ] G — DESIGN.md ve karar kaydı güncellenir.

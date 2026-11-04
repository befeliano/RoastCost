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
69. [x] İ — Sepet kartında toplam kg ve minimum durumu.
70. [ ] K — Sipariş geçmişinde durum filtresi.
71. [ ] F — "Tekrar sipariş ver" (siparişi sepete kopyalar).
72. [ ] K — Sipariş sayfasından kavurucunun kataloğuna geçiş.
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
85. [x] Ç — Keşfet'te kapatılabilir ilk kullanım ipucu.
86. [ ] F — Karşılamada "Kavurucu musunuz?" iletişim bağlantısı.

## 7. Yönetim paneli

87. [ ] K — Kafeler listesinde arama.
88. [ ] K — Kavurucular listesinde arama.
89. [x] F — Kavurucu düzenlemede konum önizlemesi (mini harita).
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

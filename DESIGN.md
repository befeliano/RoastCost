# RoastCost — DESIGN.md

Tasarım dili. Bileşen ve şekil dili DesignMD kataloğundaki **Wise**'tan (koyu orman yeşili + lime, hap butonlar, yeşil tonlu yumuşak gölgeler), sıcak gradyanlar **Mistral**'dan (sarı → turuncu) esinlenildi. Marka öğeleri kopyalanmadı; RoastCost'a ait tokenlar aşağıda. Kod: `apps/mobile/src/theme/`.

## Renk

| Token                  | Varsayılan (Orman & lime)     | Kullanım                                    |
| ---------------------- | ----------------------------- | ------------------------------------------- |
| `primary`              | `#163300`                     | dolgu: butonlar, seçili chip                |
| `gradient`             | `#0D1F00 → #2E6B12`           | başlık, ana buton, hero kartlar             |
| `onPrimary`            | `#9FE870`                     | primary/gradient üstündeki yazı ve ikon     |
| `accent` / `onAccent`  | `#9FE870` / `#163300`         | rozet, aktif sekme hapı, ikincil hızlı kart |
| `primaryText`          | `#163300`                     | beyaz üstünde vurgu yazısı, ikincil buton   |
| `primaryBg`            | `#E2F6D5`                     | yumuşak vurgu zemini                        |
| `sun / orange / coral` | `#FFD23F / #FF9F43 / #FF6B6B` | yalnızca dekoratif blob — asla yazı         |

Paletler (Ayarlar → Görünüm): Orman & lime, Gün batımı, Açık mavi, Kahve, Bordo. Her palet `contrast.test.ts` ile WCAG AA'dan geçer (yazı 4.5:1, başlıktaki büyük yazı 3:1).

## Tipografi

Plus Jakarta Sans (OFL, uygulamayla paketli). Başlık 800, h2/h3 700, gövde 400; para tabular rakamlarla. Serif yok.

## Şekil ve derinlik

- Butonlar **hap** (`borderRadius: 999`), min 56 pt; küçük 44 pt.
- Kartlar 20 pt köşe, **kenarlık yok, yalnızca gölge** (`rgba(22,51,0,0.08) 0 8 24`).
- Başlık: gradyan + iki sıcak blob, alt köşeler 28 pt, safe area üst boşluğu dahil.
- Arka plan: yavaşça süzülen sıcak bloblar (`BlobField`).
- Buzlu cam: alt menü, alt pencere arka planı, başarı ekranı, footer (`expo-blur`).

## Hareket (Reanimated, "Hareketi azalt"ta anlık)

- Buton: basınca 0.95 ölçek + 0.85 opaklık, bırakınca yay; ana butonda orta şiddet haptic.
- Kart: basınca 0.98, yay ile dönüş.
- Aktif sekme: lime hap yaylanarak açılır.
- Başarı (Apple Pay benzeri): buzlu cam → halka çizilir → dolar (pop) → tik çizilir → haptic + parıltı halkası; bildirimler kendiliğinden kapanır.
- Sayılar count-up; listeler ilk 8 öğe kademeli belirir.

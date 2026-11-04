# RoastCost — DESIGN.md

Tasarım dili. Bileşen ve şekil dili DesignMD kataloğundaki **Wise**'tan (hap butonlar, yumuşak gölge-only kartlar), sıcak gradyanlar **Mistral**'dan (sarı → turuncu) esinlenildi. Marka öğeleri kopyalanmadı; RoastCost'a ait tokenlar aşağıda. Kod: `apps/mobile/src/theme/`.

## Renk

| Token                  | Varsayılan (Kahve)            | Kullanım                                    |
| ---------------------- | ----------------------------- | ------------------------------------------- |
| `primary`              | `#5C3A21`                     | dolgu: butonlar, seçili chip                |
| `gradient`             | `#3B2416 → #A0714A`           | başlık, ana buton, hero kartlar             |
| `onPrimary`            | `#FFFFFF`                     | primary/gradient üstündeki yazı ve ikon     |
| `accent` / `onAccent`  | `#F2C36B` / `#3B2416`         | rozet, aktif sekme hapı, ikincil hızlı kart |
| `primaryText`          | `#5C3A21`                     | beyaz üstünde vurgu yazısı, ikincil buton   |
| `primaryBg`            | `#F4EBE2`                     | yumuşak vurgu zemini                        |
| `sun / orange / coral` | `#FFD23F / #FF9F43 / #FF6B6B` | yalnızca dekoratif blob — asla yazı         |

Paletler (Ayarlar → Görünüm): Kahve (koyu → açık kahve gradyan, varsayılan), Gün batımı, Açık mavi, Bordo. Her palet `contrast.test.ts` ile WCAG AA'dan geçer (yazı 4.5:1, başlıktaki büyük yazı 3:1).

## Tipografi

Urbanist (OFL, uygulamayla paketli) — yuvarlak, zarif geometrik sans. Ölçek: h1 24, h2 19, h3 16, gövde 15, küçük 13, etiket 11.5; liste satırı başlığı 14.5 medium. Para tabular rakamlarla. Serif yok. (Visby / Lorin / Monolith ticari lisanslı — K13 gereği kullanılamaz.)

## Şekil ve derinlik

- Butonlar **hap** (`borderRadius: 999`), min 56 pt; küçük 44 pt.
- Kartlar 20 pt köşe, **kenarlık yok, yalnızca gölge** (`rgba(59,36,22,0.08) 0 8 24`).
- Başlık: ince gradyan şerit + iki sıcak blob, alt köşeler 22 pt, safe area üst boşluğu dahil; başlık h2.
- Arka plan: yavaşça süzülen sıcak bloblar (`BlobField`).
- Buzlu cam: alt menü, alt pencere arka planı, başarı ekranı, footer (`expo-blur`).

## Hareket (Reanimated, "Hareketi azalt"ta anlık)

- Buton: basınca 0.95 ölçek + 0.85 opaklık, bırakınca yay; ana butonda orta şiddet haptic.
- Kart: basınca 0.98, yay ile dönüş.
- Aktif sekme: accent hap yaylanarak açılır.
- Başarı (Apple Pay benzeri): buzlu cam → halka çizilir → dolar (pop) → tik çizilir → haptic + parıltı halkası; bildirimler kendiliğinden kapanır.
- Sayılar count-up; listeler ilk 8 öğe kademeli belirir.

# RoastCost — DESIGN.md

Tasarım dili. Bileşen ve şekil dili DesignMD kataloğundaki **Wise**'tan (hap butonlar, yumuşak gölge-only kartlar), sıcak gradyanlar **Mistral**'dan (sarı → turuncu) esinlenildi. Marka öğeleri kopyalanmadı; RoastCost'a ait tokenlar aşağıda. Kod: `apps/mobile/src/theme/`.

## Renk

| Token                 | Varsayılan (Kahve)    | Kullanım                                    |
| --------------------- | --------------------- | ------------------------------------------- |
| `primary`             | `#5C3A21`             | dolgu: butonlar, seçili chip                |
| `gradient`            | `#3B2416 → #A0714A`   | başlık, ana buton, hero kartlar             |
| `onPrimary`           | `#FFFFFF`             | primary/gradient üstündeki yazı ve ikon     |
| `accent` / `onAccent` | `#F2C36B` / `#3B2416` | rozet, aktif sekme hapı, ikincil hızlı kart |
| `primaryText`         | `#5C3A21`             | beyaz üstünde vurgu yazısı, ikincil buton   |
| `primaryBg`           | `#F4EBE2`             | yumuşak vurgu zemini                        |

Paletler (Ayarlar → Görünüm): Kahve (koyu → açık kahve gradyan, varsayılan), Gün batımı, Açık mavi, Bordo. Her palet `contrast.test.ts` ile WCAG AA'dan geçer (yazı 4.5:1, başlıktaki büyük yazı 3:1).

## Tipografi

Plus Jakarta Sans (OFL, uygulamayla paketli). Ölçek: h1 24, h2 19, h3 16, gövde 15, küçük 13, etiket 11.5; liste satırı başlığı 14.5 medium. Para tabular rakamlarla. Serif yok. (Visby / Lorin / Monolith ticari lisanslı — K13 gereği kullanılamaz.)

## Şekil ve derinlik

İlke: **sakin ve el yapımı** — süs yok, içerik öne çıksın ("yapay zekâ şablonu" görüntüsünden kaçın: parlayan bloblar, renkli gölge, her yerde gradyan, kalın beyaz halkalı avatar yok).

- Butonlar 14 pt köşeli dikdörtgen, düz `primary` dolgu (gradyan ve renkli parıltı yok); min 52 pt, küçük 44 pt.
- Kartlar 14 pt köşe, ince kenarlık (`border`) + çok hafif gölge.
- Zemin sıcak kâğıt tonu `#F5F1EB`; metin kahve tonlu siyah.
- Başlık: ince, düz alt kenarlı şerit; koyu → açık kahve yatay gradyan. Gradyan yalnızca başlıkta ve ana hesap kartında.
- Kavurucu logosu: yuvarlatılmış kare karo (logo yoksa baş harfler, toprak tonları).
- Buzlu cam yalnızca alt menü, alt pencere ve başarı ekranında (`expo-blur`).

## Hareket (Reanimated, "Hareketi azalt"ta anlık)

- Buton: basınca 0.95 ölçek + 0.85 opaklık, bırakınca yay; ana butonda orta şiddet haptic.
- Kart: basınca 0.98, yay ile dönüş.
- Aktif sekme: accent hap yaylanarak açılır.
- Başarı (Apple Pay benzeri): buzlu cam → halka çizilir → dolar (pop) → tik çizilir → haptic + parıltı halkası; bildirimler kendiliğinden kapanır.
- Sayılar count-up; listeler ilk 8 öğe kademeli belirir.

## Bileşenler (iyileştirmeler sonrası)

- **Para:** `formatTRY` tam liralarda kuruşu gizler (`₺1.100`); maliyet dökümünde `formatTRYFull` (`₺3,50`) — sütunlar hizalı kalsın.
- **Gruplu liste:** `RowGroup` — yuvarlak köşeli kap, ince ayırıcı, son satırda çizgi yok.
- **Durumlar:** `Skeleton` (yükleniyor), `ErrorState` (tekrar dene), `EmptyState` + eylem düğmesi.
- **Geri bildirim:** `toast()` üstte küçük siyah hap; büyük onaylar için `SuccessOverlay`.
- **Tat notları:** `NoteChips` — meyve / narenciye / çiçek / çikolata / karamel / baharat ailelerine göre yumuşak ton.
- **Maliyet çubuğu:** `CostBar` — kahve, malzeme, bardak, sabit gider payları.
- **Alanlar:** odakta kahve kenarlık, parola göster/gizle, sayısal klavyede "Bitti".

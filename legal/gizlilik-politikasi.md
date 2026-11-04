# Gizlilik Politikası

> TASLAK — yayımlanmadan önce bir hukukçu tarafından incelenmelidir. Sürüm: {{VERSION}}

{{APP_NAME}}, kafe işletmelerinin fincan maliyetini hesaplamasına ve yerel kavuruculara sipariş talebi iletmesine yardımcı olan bir **işletme (B2B) uygulamasıdır**. Bu politika hangi verileri neden işlediğimizi açıklar. Ayrıntılı hukuki bilgi için [KVKK Aydınlatma Metni](/legal/kvkk)'ne bakın.

## Topladığımız veriler

| Veri                                                 | Neden                                      |
| ---------------------------------------------------- | ------------------------------------------ |
| E-posta, parola özeti                                | Hesap ve giriş                             |
| Kafe adı, ilçe, telefon                              | Hesap onayı, kavurucuya sipariş iletimi    |
| Maliyet ayarları, malzeme ve reçeteler               | Hesaplama (yalnızca sizin kafenize aittir) |
| Siparişler                                           | Sipariş iletimi ve komisyon kaydı          |
| Yasal onay kayıtları                                 | İspat                                      |
| Teknik kayıtlar (IP dâhil olabilir, en fazla 30 gün) | Güvenlik ve hata ayıklama                  |

## Kullanmadıklarımız

Reklam, analitik, izleme veya çökme raporlama servisi **kullanmıyoruz**. Konum, rehber, kamera, mikrofon izni istemiyoruz. Push bildirim göndermiyoruz. Verilerinizi satmıyor veya reklam amacıyla paylaşmıyoruz. Pazarlama e-postası/SMS göndermiyoruz.

## Nerede saklanıyor?

Veriler Türkiye'deki bir veri merkezinde, şifreli bağlantı (TLS) üzerinden erişilen sunucularda saklanır. Parolalar argon2id ile özetlenir; oturum anahtarları cihazınızda güvenli depoda (Keychain/Keystore) tutulur.

## Kimlerle paylaşılıyor?

Yalnızca sipariş verdiğiniz kavurucuyla, siparişin gereği kadar (kafe adı, ilçe, telefon, sipariş içeriği). Sipariş mesajı sizin WhatsApp uygulamanızdan sizin gönderiminizle iletilir.

## Çocuklar

Uygulama işletmelere yöneliktir; 18 yaşından küçüklerin kullanımı için tasarlanmamıştır.

## Haklarınız ve hesap silme

Uygulamada **Ayarlar → Verilerimi indir** ve **Ayarlar → Hesabımı sil** seçenekleri bulunur. Web üzerinden silme: [{{PUBLIC_BASE_URL}}/account-deletion]({{PUBLIC_BASE_URL}}/account-deletion).

## İletişim

**{{DATA_CONTROLLER}}** — [{{CONTACT_EMAIL}}](mailto:{{CONTACT_EMAIL}})

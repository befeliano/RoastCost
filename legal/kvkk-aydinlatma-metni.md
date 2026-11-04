# KVKK Aydınlatma Metni

> TASLAK — yayımlanmadan önce bir hukukçu / KVKK danışmanı tarafından incelenmelidir. Sürüm: {{VERSION}}

Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu'nun ("KVKK") 10. maddesi ve Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ uyarınca, {{APP_NAME}} mobil uygulamasını ve ilgili web sayfalarını kullanan kafe işletmecilerini ve sipariş bağlantısını açan kavurucu işletme çalışanlarını bilgilendirmek için hazırlanmıştır.

## 1. Veri sorumlusu

**{{DATA_CONTROLLER}}** — İletişim: [{{CONTACT_EMAIL}}](mailto:{{CONTACT_EMAIL}})

## 2. İşlenen kişisel veriler, amaçlar ve hukuki sebepler

| Veri                                                                    | Amaç                                                        | Hukuki sebep (KVKK m.5/2)                                       |
| ----------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------- |
| E-posta adresi, parola özeti (parolanın kendisi saklanmaz)              | Hesap oluşturma, giriş, e-posta doğrulama, parola sıfırlama | (c) sözleşmenin kurulması ve ifası                              |
| Kafe adı, ilçe, cep telefonu                                            | Hesap onayı; siparişin kavurucuya iletilmesi                | (c) sözleşmenin kurulması ve ifası                              |
| Maliyet ayarları, malzeme fiyatları, reçeteler                          | Fincan maliyeti hesaplama                                   | (c) sözleşmenin ifası                                           |
| Sipariş bilgileri (ürün, miktar, tutar, tarih, not)                     | Siparişin iletilmesi, kavurucu onayı, komisyon kaydı        | (c) sözleşmenin ifası, (ç) hukuki yükümlülük, (f) meşru menfaat |
| Kavurucunun sipariş sayfasındaki beyanı (yeni müşteri / mevcut müşteri) | İlk sipariş komisyonunun belirlenmesi                       | (f) meşru menfaat                                               |
| Yasal metin onay kayıtları (belge, sürüm, zaman)                        | Onayın ispatı                                               | (ç) hukuki yükümlülük, (e) bir hakkın tesisi                    |
| Teknik kayıtlar (IP adresi, zaman, istek bilgisi)                       | Güvenlik, kötüye kullanımın önlenmesi, hata ayıklama        | (f) meşru menfaat, (ç) hukuki yükümlülük                        |

**Toplamadığımız veriler:** konum, kişi rehberi, reklam kimliği, vergi numarası/levhası, kimlik belgesi, ödeme kartı bilgisi, uygulama içi davranış/analitik verisi.

## 3. Toplama yöntemi

Veriler; uygulamadaki kayıt, ayar ve sipariş formları ile kavurucunun sipariş bağlantısındaki form aracılığıyla, elektronik ortamda, kısmen otomatik yollarla toplanır.

## 4. Aktarım

- Sipariş verdiğinizde kafe adınız, ilçeniz, telefonunuz ve sipariş içeriği, siparişin ifası için **seçtiğiniz kavurucuya** iletilir.
- Sipariş mesajı, **sizin kendi WhatsApp uygulamanız** üzerinden ve sizin gönderiminizle iletilir; {{APP_NAME}} mesajı WhatsApp'a (Meta) kendisi göndermez. WhatsApp'ın veri işlemesi kendi gizlilik koşullarına tabidir.
- Veriler kanunen yetkili kamu kurum ve kuruluşlarına, talep hâlinde ve mevzuatın izin verdiği ölçüde aktarılabilir.
- **Yurt dışına aktarım yapılmaz.** Sunucu ve veritabanı Türkiye'deki bir veri merkezinde barındırılır. Uygulama mağazaları (Apple App Store, Google Play) uygulamanın dağıtımı için kendi hesaplarınız üzerinden kendi koşullarıyla veri işler.

## 5. Saklama süreleri

- Hesap verileri: hesap açık kaldığı sürece. Hesap silindiğinde e-posta, kafe adı, telefon ve parola özeti anonimleştirilir.
- Sipariş tutarları ve tarihleri: komisyon muhasebesi için ilgili mevzuattaki süre boyunca (kişisel bilgiler çıkarılarak).
- Teknik kayıtlar: en fazla 30 gün.
- Yasal onay kayıtları: ilgili ilişki süresince ve zamanaşımı süresince.

## 6. KVKK m.11 kapsamındaki haklarınız

Veri sorumlusuna başvurarak; kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme, yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme, eksik veya yanlış işlenmişse düzeltilmesini, KVKK m.7 çerçevesinde silinmesini veya yok edilmesini isteme, bu işlemlerin aktarıldığı üçüncü kişilere bildirilmesini isteme, münhasıran otomatik sistemlerle analiz sonucu aleyhinize bir sonuç çıkmasına itiraz etme ve kanuna aykırı işleme nedeniyle zarara uğramanız hâlinde zararın giderilmesini talep etme haklarına sahipsiniz.

Uygulamada **Ayarlar → Verilerimi indir** ile tüm verilerinizi JSON olarak alabilir, **Ayarlar → Hesabımı sil** ile ya da [{{PUBLIC_BASE_URL}}/account-deletion]({{PUBLIC_BASE_URL}}/account-deletion) adresinden hesabınızı silebilirsiniz.

## 7. Başvuru

Taleplerinizi Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ'e uygun şekilde [{{CONTACT_EMAIL}}](mailto:{{CONTACT_EMAIL}}) adresine iletebilirsiniz. Başvurunuz en geç 30 gün içinde ücretsiz sonuçlandırılır.

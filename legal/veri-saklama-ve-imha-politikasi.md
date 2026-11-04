# Kişisel Veri Saklama ve İmha Politikası (iç belge)

> TASLAK — hukukçu incelemesi gerekir. Kişisel Verilerin Silinmesi, Yok Edilmesi veya Anonim Hale Getirilmesi Hakkında Yönetmelik esas alınmıştır.

## Kapsam

RoastCost API veritabanı (PostgreSQL, Türkiye'deki sunucu), yedekler, sunucu kayıtları ve cihaz önbellekleri.

## Saklama ve imha tablosu

| Veri                                                   | Saklama süresi                                                                         | İmha yöntemi                                              | Nasıl uygulanır                                                 |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------- |
| Hesap (e-posta, parola özeti, kafe adı, ilçe, telefon) | Hesap açık kaldıkça                                                                    | Anonimleştirme                                            | Hesap silme (`DELETE /v1/me`, web formu) anında                 |
| Reçete, malzeme, maliyet ayarları                      | Hesap açık kaldıkça                                                                    | Silme                                                     | Hesap silmede anında                                            |
| Sipariş tutarı, tarih, kavurucu, kalemler              | Muhasebe/komisyon için yasal süre (hukukçu/muhasebeci teyit edecek; varsayılan 10 yıl) | Kafe adı/telefon/not anonimleştirilir; süre sonunda silme | Hesap silmede anonimleştirme; yıllık imha işi (manuel, RUNBOOK) |
| Refresh token / e-posta token'ları                     | Süresi dolduktan 7 gün sonra                                                           | Silme                                                     | Günlük iş (`cleanup-tokens`)                                    |
| Yasal onay kayıtları                                   | İlişki + zamanaşımı süresi                                                             | Silme                                                     | Yıllık imha                                                     |
| Denetim kayıtları (audit_logs)                         | 2 yıl                                                                                  | Silme                                                     | Yıllık imha                                                     |
| Sunucu/uygulama logları                                | 30 gün                                                                                 | Silme                                                     | Log döndürme (Docker `max-file`)                                |
| Şifreli veritabanı yedekleri                           | Günlük 7, haftalık 4                                                                   | Silme                                                     | `deploy/backup.sh` döndürme                                     |
| Cihaz önbelleği (uygulama)                             | Çıkış veya hesap silmede                                                               | Silme                                                     | Uygulama çıkışta tüm önbelleği temizler                         |

## Periyodik imha

6 ayda bir yapılır ve tutanağa bağlanır (tarih, kim, hangi tablolar, kaç kayıt).

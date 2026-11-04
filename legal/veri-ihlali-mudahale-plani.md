# Veri İhlali Müdahale Planı (iç belge)

> TASLAK — hukukçu incelemesi gerekir.

1. **Tespit (0. saat):** Şüpheli durum (sızan anahtar, yetkisiz erişim, kaybolan yedek) not edilir: ne, ne zaman, nasıl fark edildi.
2. **Sınırlama (ilk 2 saat):** Sızan sırları değiştir (`JWT_SECRET` → tüm oturumlar düşer; veritabanı parolaları; SMTP). Gerekirse API'yi bakım moduna al. Tüm refresh token'ları iptal et: `update refresh_tokens set revoked_at = now() where revoked_at is null;`
3. **Değerlendirme (24 saat):** Hangi veriler, kaç kişi, hangi dönem etkilendi? Loglar ve `audit_logs` incelenir.
4. **Bildirim (en geç 72 saat):** Kişisel Verileri Koruma Kurulu'na KVKK m.12/5 ve Kurul kararı uyarınca "Kişisel Veri İhlali Bildirim Formu" ile bildirim; etkilenen kişilere makul en kısa sürede bilgi (e-posta).
5. **Kök neden ve düzeltme:** Açık kapatılır, test eklenir, bu plan güncellenir.
6. **Kayıt:** Tüm adımlar tarih/saat ile kayıt altına alınır (Kurul incelemesi için).

İletişim zinciri: Burak (admin) → hukuk danışmanı → barındırma sağlayıcısı destek hattı.

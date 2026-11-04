# RoastCost

Eskişehir'deki kafeler için **fincan maliyeti hesaplayıcı** ve yerel kavurucuların toptan fiyatlarıyla **WhatsApp üzerinden sipariş** uygulaması (iOS + Android, Expo).

- Şartname: [`PROJE_SARTNAMESI.md`](PROJE_SARTNAMESI.md) (tek doğruluk kaynağı)
- Kararlar: [`docs/DECISIONS.md`](docs/DECISIONS.md) · Kurulum: [`docs/RUNBOOK.md`](docs/RUNBOOK.md)

```
apps/mobile     Expo (React Native, TypeScript, expo-router)
apps/api        Fastify + PostgreSQL (RLS ile çok kiracılı)
packages/shared Zod şemaları, maliyet motoru, WhatsApp mesajı (cihazda ve sunucuda ortak)
```

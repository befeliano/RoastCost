import { describe, expect, it } from 'vitest';
import {
  buildOrderMessage,
  buildWaUrl,
  commissionAmountKurus,
  decideFirstOrder,
  formatTRY,
  formatTrPhone,
  kurusToInput,
  lineTotalKurus,
  maskPhone,
  normalizeTrPhone,
  parseTRYInput,
  registerSchema,
  roundKurus,
  selectTier,
  selectTierForComparison,
  LEGAL_VERSIONS,
} from '../src';

describe('money', () => {
  it('rounds half up', () => {
    expect(roundKurus(2.5)).toBe(3);
    expect(roundKurus(2.4999)).toBe(2);
    expect(roundKurus(1.4999999999999998)).toBe(2); // float noise for 1.5
  });
  it('formats TRY in Turkish', () => {
    expect(formatTRY(123456).replace(/\s/g, ' ')).toMatch(/1\.234,56/);
  });
  it('parses user input', () => {
    expect(parseTRYInput('12,50')).toBe(1250);
    expect(parseTRYInput('12.5')).toBe(1250);
    expect(parseTRYInput('1.250,75')).toBe(125075);
    expect(parseTRYInput('1.250')).toBe(125000);
    expect(parseTRYInput('₺ 45')).toBe(4500);
    expect(parseTRYInput('45 TL')).toBe(4500);
    expect(parseTRYInput('abc')).toBeNull();
    expect(parseTRYInput('-5')).toBeNull();
    expect(parseTRYInput('1,234')).toBeNull();
    expect(kurusToInput(1250)).toBe('12,50');
    expect(kurusToInput(4500)).toBe('45');
  });
});

describe('phone', () => {
  it.each([
    ['0532 123 45 67', '+905321234567'],
    ['532 123 45 67', '+905321234567'],
    ['+90 532 123 4567', '+905321234567'],
    ['905321234567', '+905321234567'],
    ['(0532) 123-45-67', '+905321234567'],
    ['0090 532 123 45 67', '+905321234567'],
  ])('%s → %s', (input, out) => expect(normalizeTrPhone(input)).toBe(out));
  it.each(['0222 123 45 67', '12345', '+44 7700 900123', '05321234'])('rejects %s', (v) =>
    expect(normalizeTrPhone(v)).toBeNull(),
  );
  it('formats and masks', () => {
    expect(formatTrPhone('+905321234567')).toBe('0532 123 45 67');
    expect(maskPhone('+905321234567')).toBe('+90532*****67');
  });
});

describe('tiers', () => {
  const tiers = [
    { minKg: 1, pricePerKgKurus: 100_000 },
    { minKg: 5, pricePerKgKurus: 90_000 },
    { minKg: 10, pricePerKgKurus: 80_000 },
  ];
  it('selects highest tier with minKg <= kg (exact threshold included)', () => {
    expect(selectTier(tiers, 1)?.minKg).toBe(1);
    expect(selectTier(tiers, 4.9)?.minKg).toBe(1);
    expect(selectTier(tiers, 5)?.minKg).toBe(5);
    expect(selectTier(tiers, 9.999)?.minKg).toBe(5);
    expect(selectTier(tiers, 10)?.minKg).toBe(10);
    expect(selectTier(tiers, 250)?.minKg).toBe(10);
  });
  it('returns null below the smallest tier; comparison falls back with a flag', () => {
    expect(selectTier(tiers, 0.5)).toBeNull();
    expect(selectTierForComparison(tiers, 0.5)).toEqual({ tier: tiers[0], belowMinimum: true });
    expect(selectTierForComparison([], 3)).toBeNull();
  });
  it('computes line totals', () => {
    expect(lineTotalKurus(2500, 90_000)).toBe(225_000);
    expect(lineTotalKurus(333, 100_001)).toBe(33_300);
  });
});

describe('commission', () => {
  it('15% of base', () => {
    expect(commissionAmountKurus(1_000_000, 1500)).toBe(150_000);
    expect(commissionAmountKurus(333, 1500)).toBe(50);
  });
  it('first order only when roaster says new and no previous confirmed order', () => {
    const base = { subtotalKurus: 200_000, commissionRateBp: 1500 };
    expect(
      decideFirstOrder({ ...base, roasterSaysNewCustomer: true, hasPreviousConfirmedOrder: false }),
    ).toMatchObject({
      isFirstOrder: true,
      commissionStatus: 'pending',
      commissionAmountKurus: 30_000,
      conflict: false,
    });
    expect(
      decideFirstOrder({
        ...base,
        roasterSaysNewCustomer: false,
        hasPreviousConfirmedOrder: false,
      }),
    ).toMatchObject({
      isFirstOrder: null,
      commissionStatus: 'not_applicable',
      conflict: false,
    });
    expect(
      decideFirstOrder({ ...base, roasterSaysNewCustomer: true, hasPreviousConfirmedOrder: true }),
    ).toMatchObject({
      isFirstOrder: null,
      commissionStatus: 'not_applicable',
      conflict: true,
    });
  });
});

describe('whatsapp', () => {
  const msg = buildOrderMessage({
    roasterName: 'Örnek Kavurucu',
    cafeName: 'Fincan & Kitap',
    district: 'Tepebaşı',
    cafePhone: '0532 123 45 67',
    orderNo: 1001,
    items: [
      { productName: 'Etiyopya Yirgacheffe', quantityG: 2500 },
      { productName: 'House Blend', quantityG: 10000 },
    ],
    requestedDeliveryDate: '2026-11-20',
    note: null,
    confirmUrl: 'https://ornek.com/r/abc',
    appName: 'RoastCost',
  });
  it('builds the Turkish template', () => {
    expect(msg).toContain('Merhaba Örnek Kavurucu, RoastCost üzerinden yeni sipariş talebi var.');
    expect(msg).toContain('Sipariş no: S-1001');
    expect(msg).toContain('• Etiyopya Yirgacheffe — 2,5 kg');
    expect(msg).toContain('• House Blend — 10 kg');
    expect(msg).toContain('İstenen teslim tarihi: 20.11.2026');
    expect(msg).toContain('Not: -');
    expect(msg.endsWith('https://ornek.com/r/abc')).toBe(true);
  });
  it('builds wa.me url without +', () => {
    const url = buildWaUrl('+905321234567', 'Merhaba & selam');
    expect(url).toBe('https://wa.me/905321234567?text=Merhaba%20%26%20selam');
  });
});

describe('registerSchema', () => {
  const consents = Object.entries(LEGAL_VERSIONS).map(([docType, docVersion]) => ({
    docType,
    docVersion,
  }));
  it('normalises phone and email', () => {
    const r = registerSchema.parse({
      email: ' Kafe@Ornek.COM ',
      password: 'çokgizliparola1',
      cafeName: 'Kafe',
      district: 'Odunpazarı',
      phone: '0532 123 45 67',
      consents,
    });
    expect(r.email).toBe('kafe@ornek.com');
    expect(r.phone).toBe('+905321234567');
  });
  it('requires all three current consents', () => {
    const r = registerSchema.safeParse({
      email: 'a@b.co',
      password: 'çokgizliparola1',
      cafeName: 'Kafe',
      district: 'Odunpazarı',
      phone: '05321234567',
      consents: [...consents.slice(0, 2), { docType: 'kvkk_notice', docVersion: 'old' }],
    });
    expect(r.success).toBe(false);
  });
  it('rejects short passwords', () => {
    expect(
      registerSchema.safeParse({
        email: 'a@b.co',
        password: 'kisa',
        cafeName: 'Kafe',
        district: 'Odunpazarı',
        phone: '05321234567',
        consents,
      }).success,
    ).toBe(false);
  });
});

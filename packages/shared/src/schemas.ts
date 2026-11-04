import { z } from 'zod';
import {
  COMMISSION_STATUSES,
  INGREDIENT_KINDS,
  LEGAL_DOC_TYPES,
  LEGAL_VERSIONS,
  PRODUCT_CATEGORIES,
  PRODUCT_PROCESSES,
} from './app';
import { normalizeTrPhone } from './phone';
import { RECIPE_TEMPLATE_KEYS } from './recipes';

// ---------- primitives ----------
export const uuidSchema = z.uuid();
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: 'Geçerli bir e-posta girin' }))
  .pipe(z.string().max(254));
export const passwordSchema = z
  .string()
  .min(10, 'Parola en az 10 karakter olmalı')
  .max(200, 'Parola çok uzun');
export const trPhoneSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const n = normalizeTrPhone(v);
    if (!n) {
      ctx.addIssue({ code: 'custom', message: 'Geçerli bir cep telefonu girin (05xx xxx xx xx)' });
      return z.NEVER;
    }
    return n;
  });
const kurus = (max = 100_000_000) => z.number().int().min(0).max(max);
const positiveKurus = (max = 100_000_000) => z.number().int().min(1).max(max);
const pct = (min: number, max: number) => z.number().min(min).max(max);
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-AA-GG olmalı');
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

// ---------- auth ----------
export const consentSchema = z.object({
  docType: z.enum(LEGAL_DOC_TYPES),
  docVersion: z.string().min(1).max(40),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    cafeName: text(2, 120),
    district: text(2, 80),
    phone: trPhoneSchema,
    consents: z.array(consentSchema).min(3).max(3),
  })
  .superRefine((v, ctx) => {
    for (const doc of LEGAL_DOC_TYPES) {
      const c = v.consents.find((x) => x.docType === doc);
      if (!c || c.docVersion !== LEGAL_VERSIONS[doc]) {
        ctx.addIssue({ code: 'custom', path: ['consents'], message: `consent_missing:${doc}` });
      }
    }
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
  deviceLabel: z.string().trim().max(80).optional(),
});
export const refreshSchema = z.object({ refreshToken: z.string().min(20).max(200) });
export const tokenOnlySchema = z.object({ token: z.string().min(20).max(200) });
export const emailOnlySchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: passwordSchema,
});
export const deleteAccountSchema = z.object({ password: z.string().min(1).max(200) });
export const acceptConsentsSchema = z.object({ consents: z.array(consentSchema).min(1).max(3) });

// ---------- cafe ----------
export const cafePatchSchema = z
  .object({ name: text(2, 120), district: text(2, 80), phone: trPhoneSchema })
  .partial();

export const cafeSettingsSchema = z.object({
  espressoDoseG: pct(5, 40),
  coffeeWastePct: pct(0, 50),
  ingredientWastePct: pct(0, 50),
  cupCostKurus: kurus(1_000_000),
  fixedOverheadPerCupKurus: kurus(1_000_000),
  targetMarginPct: pct(1, 95),
  saleVatRatePct: pct(0, 30),
  costExcludesVat: z.boolean(),
  priceRoundingStepKurus: positiveKurus(100_000),
});
export const cafeSettingsPatchSchema = cafeSettingsSchema.partial();
export type CafeSettingsDto = z.infer<typeof cafeSettingsSchema>;

export const ingredientCreateSchema = z.object({
  name: text(1, 80),
  kind: z.enum(INGREDIENT_KINDS),
  pricePerLiterKurus: kurus(10_000_000),
  isActive: z.boolean().optional(),
});
export const ingredientPatchSchema = ingredientCreateSchema.partial();

export const recipeIngredientSchema = z.object({
  ingredientId: uuidSchema,
  quantityMl: z.number().gt(0).max(1000),
});
export const recipeUpsertSchema = z.object({
  name: text(1, 80),
  templateKey: z.enum(RECIPE_TEMPLATE_KEYS).nullish(),
  coffeeGrams: z.number().gt(0).max(60).nullish(),
  usesCup: z.boolean(),
  sellPriceKurus: positiveKurus(10_000_000).nullish(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
  isActive: z.boolean().optional(),
  ingredients: z
    .array(recipeIngredientSchema)
    .max(20)
    .refine(
      (a) => new Set(a.map((x) => x.ingredientId)).size === a.length,
      'Aynı malzeme iki kez eklenemez',
    ),
});
export const recipePatchSchema = recipeUpsertSchema.partial();

// ---------- orders ----------
export const orderCreateSchema = z.object({
  roasterId: uuidSchema,
  items: z
    .array(z.object({ productId: uuidSchema, quantityG: z.number().int().min(1).max(1_000_000) }))
    .min(1)
    .max(50)
    .refine(
      (a) => new Set(a.map((x) => x.productId)).size === a.length,
      'Aynı ürün iki kez eklenemez',
    ),
  requestedDeliveryDate: isoDateSchema.nullish(),
  note: optionalText(500),
});
export type OrderCreateInput = z.infer<typeof orderCreateSchema>;

export const roasterDecisionSchema = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('confirm'), newCustomer: z.boolean() }),
  z.object({ decision: z.literal('decline'), declineReason: optionalText(300) }),
]);

// ---------- admin ----------
export const statusNoteSchema = z.object({ note: optionalText(500) });

export const roasterCreateSchema = z.object({
  name: text(2, 120),
  city: text(2, 80).default('Eskişehir'),
  whatsapp: trPhoneSchema,
  pricesIncludeVat: z.boolean().default(false),
  vatRatePct: pct(0, 30).default(10),
  isActive: z.boolean().default(true),
  commissionRateBp: z.number().int().min(0).max(5000).default(1500),
  adminNotes: optionalText(2000),
});
export const roasterPatchSchema = z
  .object({
    name: text(2, 120),
    city: text(2, 80),
    whatsapp: trPhoneSchema,
    pricesIncludeVat: z.boolean(),
    vatRatePct: pct(0, 30),
    isActive: z.boolean(),
    commissionRateBp: z.number().int().min(0).max(5000),
    adminNotes: optionalText(2000),
    pricesUpdatedAt: z.iso.datetime().nullable(),
  })
  .partial();

export const productCreateSchema = z.object({
  roasterId: uuidSchema,
  name: text(1, 120),
  category: z.enum(PRODUCT_CATEGORIES),
  process: z.enum(PRODUCT_PROCESSES).nullish(),
  origin: optionalText(120),
  tastingNotes: optionalText(300),
  isActive: z.boolean().default(true),
});
export const productPatchSchema = productCreateSchema.omit({ roasterId: true }).partial();

export const priceTierCreateSchema = z.object({
  productId: uuidSchema,
  minKg: z.number().int().min(1).max(10_000),
  pricePerKgKurus: positiveKurus(1_000_000_000),
  validUntil: isoDateSchema.nullish(),
  reason: optionalText(200),
});
export const priceTierPatchSchema = z.object({
  minKg: z.number().int().min(1).max(10_000).optional(),
  pricePerKgKurus: positiveKurus(1_000_000_000).optional(),
  validUntil: isoDateSchema.nullish(),
  reason: optionalText(200),
});

export const priceImportSchema = z.object({
  text: z.string().min(1).max(100_000),
  dryRun: z.boolean().default(true),
});

export const commissionPatchSchema = z.object({
  status: z.enum(COMMISSION_STATUSES).optional(),
  baseKurus: kurus(10_000_000_000).optional(),
  note: optionalText(500),
});

export const decisionFixSchema = z.object({
  status: z.enum(['confirmed', 'declined', 'cancelled']),
  roasterSaysNewCustomer: z.boolean().nullish(),
  reason: optionalText(300),
});

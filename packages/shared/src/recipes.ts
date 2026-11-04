export const RECIPE_TEMPLATE_KEYS = [
  'espresso',
  'americano',
  'latte',
  'cortado',
  'cappuccino',
  'mocha',
] as const;
export type RecipeTemplateKey = (typeof RECIPE_TEMPLATE_KEYS)[number];

export interface RecipeTemplate {
  key: RecipeTemplateKey;
  name: string;
  milkMl: number;
  syrupMl: number;
  usesCup: boolean;
}

/** Default recipes (spec §7.2). Rough values; every cafe can edit them. Coffee = settings dose. */
export const RECIPE_TEMPLATES: readonly RecipeTemplate[] = [
  { key: 'espresso', name: 'Espresso', milkMl: 0, syrupMl: 0, usesCup: true },
  { key: 'americano', name: 'Americano', milkMl: 0, syrupMl: 0, usesCup: true },
  { key: 'latte', name: 'Latte', milkMl: 200, syrupMl: 0, usesCup: true },
  { key: 'cortado', name: 'Cortado', milkMl: 60, syrupMl: 0, usesCup: true },
  { key: 'cappuccino', name: 'Cappuccino', milkMl: 120, syrupMl: 0, usesCup: true },
  { key: 'mocha', name: 'Mocha', milkMl: 150, syrupMl: 20, usesCup: true },
];

/** Ingredient created for every new cafe. Price 0 until the cafe enters it. */
export const DEFAULT_MILK = { name: 'Süt', kind: 'milk' as const, pricePerLiterKurus: 0 };

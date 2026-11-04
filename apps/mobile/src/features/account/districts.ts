/** Eskişehir's 14 districts — central two first (most cafes), the rest alphabetical; "Diğer" = free text. */
export const ESKISEHIR_DISTRICTS = [
  'Tepebaşı',
  'Odunpazarı',
  'Alpu',
  'Beylikova',
  'Çifteler',
  'Günyüzü',
  'Han',
  'İnönü',
  'Mahmudiye',
  'Mihalgazi',
  'Mihalıççık',
  'Sarıcakaya',
  'Seyitgazi',
  'Sivrihisar',
] as const;
export const OTHER_DISTRICT = 'Diğer';

export const districtOptions = [...ESKISEHIR_DISTRICTS, OTHER_DISTRICT].map((d) => ({
  value: d as string,
  label: d as string,
}));

/** Stored value → picker state ("Kadıköy" → Diğer + text). */
export function splitDistrict(v: string): { pick: string; other: string } {
  return (ESKISEHIR_DISTRICTS as readonly string[]).includes(v)
    ? { pick: v, other: '' }
    : { pick: v ? OTHER_DISTRICT : 'Tepebaşı', other: v };
}

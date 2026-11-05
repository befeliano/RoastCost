/** Tasting-note families → soft tone (bg, fg). Keyword match on Turkish notes; unknown → neutral. */
const FAMILIES: { re: RegExp; bg: string; fg: string }[] = [
  // berries & red fruit
  {
    re: /(mersin|erik|ahududu|çilek|kiraz|vişne|kırmızı meyve|üzüm|karpuz|kan portakal)/i,
    bg: '#F8E6EA',
    fg: '#8A2340',
  },
  // citrus & bright
  {
    re: /(limon|portakal|greyfurt|narenciye|misket|bergamot|asidite|canlı)/i,
    bg: '#FBF1D3',
    fg: '#7A5A00',
  },
  // stone & tropical fruit
  { re: /(şeftali|kayısı|mango|ananas|elma|armut|kavun|meyve)/i, bg: '#FCE9DA', fg: '#8C4511' },
  // floral & tea
  { re: /(çiçek|yasemin|lavanta|gül|çay)/i, bg: '#F6E8E4', fg: '#8A3F35' },
  // chocolate & cocoa
  { re: /(çikolata|kakao|bitter)/i, bg: '#EFE3D9', fg: '#5C3A21' },
  // caramel, sugar, nuts
  {
    re: /(karamel|şeker|bal|badem|fındık|ceviz|fıstık|tatlı|toffee)/i,
    bg: '#F6EBD7',
    fg: '#7A4E12',
  },
  // spice & earthy
  { re: /(baharat|tarçın|karabiber|toprak|odun|tütün)/i, bg: '#ECE8DF', fg: '#5A4A2E' },
];

export function noteTone(note: string): { bg: string; fg: string } | null {
  return FAMILIES.find((f) => f.re.test(note)) ?? null;
}

export function splitNotes(notes: string | null | undefined): string[] {
  return (notes ?? '')
    .split(/[,;·]/)
    .map((n) => n.trim())
    .filter((n) => n && !/^SCA\b/i.test(n));
}

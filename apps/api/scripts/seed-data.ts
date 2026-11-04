/** Development seed data — ALL NAMES ARE MADE UP (spec §6.3). Coordinates are plausible points in Eskişehir city. */

export interface SeedRoaster {
  name: string;
  district: string;
  address: string;
  lat: number;
  lon: number;
  color: string;
  description: string;
  featured: boolean;
  vatIncluded: boolean;
  whatsapp: string;
  filterCount: number;
  priceFactor: number;
}

export const ROASTERS: SeedRoaster[] = [
  {
    name: 'Sazova Coffee Lab',
    district: 'Tepebaşı',
    address: 'Sazova Mah. (örnek adres)',
    lat: 39.7838,
    lon: 30.4719,
    color: '#1B7F4B',
    description: 'Tek köken filtre kahvelerde uzman, her hafta taze kavrum.',
    featured: true,
    vatIncluded: false,
    whatsapp: '+905550000003',
    filterCount: 20,
    priceFactor: 1.08,
  },
  {
    name: 'Odun Ateşi Kahve Kavurma',
    district: 'Odunpazarı',
    address: 'Odunpazarı Mah. (örnek adres)',
    lat: 39.7593,
    lon: 30.5276,
    color: '#B5452B',
    description: 'Geleneksel tambur kavurucuda espresso harmanları.',
    featured: true,
    vatIncluded: false,
    whatsapp: '+905550000001',
    filterCount: 8,
    priceFactor: 0.95,
  },
  {
    name: 'Porsuk Kavurucu',
    district: 'Tepebaşı',
    address: 'Hoşnudiye Mah. (örnek adres)',
    lat: 39.7787,
    lon: 30.5131,
    color: '#1769AA',
    description: 'Kafeler için ekonomik ve tutarlı espresso harmanları.',
    featured: true,
    vatIncluded: true,
    whatsapp: '+905550000002',
    filterCount: 10,
    priceFactor: 0.9,
  },
  {
    name: 'Bademlik Kahve Atölyesi',
    district: 'Odunpazarı',
    address: 'Büyükdere Mah. (örnek adres)',
    lat: 39.7655,
    lon: 30.5402,
    color: '#7A4B2A',
    description: 'Doğal ve anaerobik işlemli özel kahveler.',
    featured: false,
    vatIncluded: false,
    whatsapp: '+905550000004',
    filterCount: 14,
    priceFactor: 1.15,
  },
  {
    name: 'Anadolu Çekirdek',
    district: 'Tepebaşı',
    address: 'Ertuğrulgazi Mah. (örnek adres)',
    lat: 39.7951,
    lon: 30.5032,
    color: '#8A2BE2',
    description: 'Toptan siparişte hızlı teslimat, 10 kg üstü avantajlı.',
    featured: false,
    vatIncluded: true,
    whatsapp: '+905550000005',
    filterCount: 6,
    priceFactor: 0.88,
  },
  {
    name: 'Kurşunlu Kavurma Evi',
    district: 'Odunpazarı',
    address: 'Akarbaşı Mah. (örnek adres)',
    lat: 39.7702,
    lon: 30.5203,
    color: '#C27C0E',
    description: 'Orta kavrum, dengeli ve tatlı fincanlar.',
    featured: false,
    vatIncluded: false,
    whatsapp: '+905550000006',
    filterCount: 9,
    priceFactor: 1.0,
  },
];

type Roast = 'light' | 'medium' | 'dark';
type Proc = 'washed' | 'natural' | 'honey' | 'anaerobic' | 'other';

export const ESPRESSO: {
  name: string;
  origin: string;
  notes: string;
  process: Proc;
  roast: Roast;
  tl: number;
}[] = [
  {
    name: 'Ev Harmanı',
    origin: 'Brezilya / Kolombiya',
    notes: 'sütlü çikolata, fındık, karamel',
    process: 'washed',
    roast: 'medium',
    tl: 900,
  },
  {
    name: 'Koyu Espresso',
    origin: 'Brezilya / Hindistan',
    notes: 'bitter çikolata, kakao, yoğun gövde',
    process: 'natural',
    roast: 'dark',
    tl: 860,
  },
  {
    name: 'Tatlı Harman',
    origin: 'Etiyopya / Brezilya',
    notes: 'çilek, bal, sütlü çikolata',
    process: 'natural',
    roast: 'medium',
    tl: 1020,
  },
];

export const FILTER: {
  name: string;
  origin: string;
  notes: string;
  process: Proc;
  roast: Roast;
  tl: number;
}[] = [
  {
    name: 'Etiyopya Yirgacheffe',
    origin: 'Etiyopya',
    notes: 'yasemin, bergamot, limon',
    process: 'washed',
    roast: 'light',
    tl: 1450,
  },
  {
    name: 'Etiyopya Guji',
    origin: 'Etiyopya',
    notes: 'yaban mersini, şeftali',
    process: 'natural',
    roast: 'light',
    tl: 1500,
  },
  {
    name: 'Kenya AA Nyeri',
    origin: 'Kenya',
    notes: 'frenk üzümü, greyfurt',
    process: 'washed',
    roast: 'light',
    tl: 1650,
  },
  {
    name: 'Kolombiya Huila',
    origin: 'Kolombiya',
    notes: 'kırmızı elma, panela',
    process: 'washed',
    roast: 'medium',
    tl: 1250,
  },
  {
    name: 'Kolombiya Nariño',
    origin: 'Kolombiya',
    notes: 'kiraz, esmer şeker',
    process: 'washed',
    roast: 'medium',
    tl: 1300,
  },
  {
    name: 'Brezilya Cerrado',
    origin: 'Brezilya',
    notes: 'fındık, kakao',
    process: 'natural',
    roast: 'medium',
    tl: 1050,
  },
  {
    name: 'Guatemala Antigua',
    origin: 'Guatemala',
    notes: 'tarçın, sütlü çikolata',
    process: 'washed',
    roast: 'medium',
    tl: 1300,
  },
  {
    name: 'Kosta Rika Tarrazú',
    origin: 'Kosta Rika',
    notes: 'mandalina, bal',
    process: 'honey',
    roast: 'light',
    tl: 1400,
  },
  {
    name: 'Panama Boquete Geisha',
    origin: 'Panama',
    notes: 'çiçeksi, bergamot, şeftali',
    process: 'washed',
    roast: 'light',
    tl: 3200,
  },
  {
    name: 'Ruanda Huye',
    origin: 'Ruanda',
    notes: 'kırmızı üzüm, çay',
    process: 'washed',
    roast: 'light',
    tl: 1500,
  },
  {
    name: 'Burundi Kayanza',
    origin: 'Burundi',
    notes: 'ahududu, hibiskus',
    process: 'washed',
    roast: 'light',
    tl: 1550,
  },
  {
    name: 'Honduras Marcala',
    origin: 'Honduras',
    notes: 'karamel, kırmızı elma',
    process: 'washed',
    roast: 'medium',
    tl: 1200,
  },
  {
    name: 'El Salvador Pacamara',
    origin: 'El Salvador',
    notes: 'erik, kakao nibs',
    process: 'honey',
    roast: 'medium',
    tl: 1700,
  },
  {
    name: 'Peru Cajamarca',
    origin: 'Peru',
    notes: 'badem, sütlü çikolata',
    process: 'washed',
    roast: 'medium',
    tl: 1150,
  },
  {
    name: 'Meksika Chiapas',
    origin: 'Meksika',
    notes: 'kavrulmuş badem, portakal',
    process: 'washed',
    roast: 'medium',
    tl: 1180,
  },
  {
    name: 'Sumatra Mandheling',
    origin: 'Endonezya',
    notes: 'toprak, sedir, bitter çikolata',
    process: 'other',
    roast: 'dark',
    tl: 1250,
  },
  {
    name: 'Yemen Haraz',
    origin: 'Yemen',
    notes: 'kuru meyve, baharat',
    process: 'natural',
    roast: 'medium',
    tl: 2600,
  },
  {
    name: 'Tanzanya Peaberry',
    origin: 'Tanzanya',
    notes: 'siyah çay, limon',
    process: 'washed',
    roast: 'light',
    tl: 1450,
  },
  {
    name: 'Kolombiya Anaerobik',
    origin: 'Kolombiya',
    notes: 'tropikal meyve, şarap',
    process: 'anaerobic',
    roast: 'light',
    tl: 1900,
  },
  {
    name: 'Uganda Rwenzori',
    origin: 'Uganda',
    notes: 'esmer şeker, kırmızı meyve',
    process: 'natural',
    roast: 'medium',
    tl: 1250,
  },
];

/**
 * Flores Roastery — real price list provided by Burak (cash price per kg, TL). Vadeli prices and the
 * Türk Kahvesi line are not modelled (no category); minimum order / payment terms are in the description.
 * Prices include VAT. Position: Kanaat Sokak, Merkez Yeni Mah. (OpenStreetMap / Nominatim).
 */
export const FLORES = {
  name: 'Flores Roastery',
  whatsapp: '+905522256226',
  color: '#1A1A1A',
  district: 'Tepebaşı',
  address: 'Merkez Yeni Mah. Kanaat Sok. No: 8/A, 26004 Tepebaşı / Eskişehir',
  latitude: 39.77623,
  longitude: 30.52919,
  description:
    'Minimum sipariş toplam 5 kg (farklı kahveler karıştırılabilir). Havale/EFT komisyonsuz, kredi kartında %2,5 banka farkı. Eskişehir içinde 10 kg ve üzeri siparişler 1 iş günü içinde teslim. Vadeli fiyatlar bilgi içindir.',
  products: [
    // espresso — Tanah & Pagi are blends; Sidamo (Manis), Arjuna and Mogiana are single origins used for espresso
    {
      name: 'Tanah',
      category: 'espresso',
      origin: 'Endonezya & Etiyopya harmanı',
      notes: 'yoğun gövde, yoğun crema, az asidite',
      process: null,
      tl: 885,
    },
    {
      name: 'Pagi',
      category: 'espresso',
      origin: 'Harman',
      notes: 'yumuşak, temiz, sütlü içime ve filtreye uyumlu',
      process: null,
      tl: 885,
    },
    {
      name: 'Etiyopya Sidamo (Manis)',
      category: 'espresso',
      origin: 'Etiyopya, Sidamo',
      notes: 'canlı, yumuşak, meyvemsi, yüksek tatlılık',
      process: null,
      tl: 885,
    },
    {
      name: 'Endonezya Arjuna',
      category: 'espresso',
      origin: 'Garut, Batı Java · 1100–1400 m',
      notes: 'karamel, çikolata, misket limonu',
      process: 'other',
      tl: 1250,
    },
    {
      name: 'Brezilya Mogiana',
      category: 'espresso',
      origin: 'Alta Mogiana · 800–1200 m',
      notes: 'badem, çikolata',
      process: 'natural',
      tl: 1100,
    },
    // demleme
    {
      name: 'Endonezya Frinsa',
      category: 'filter',
      origin: 'Batı Java · 1300–1500 m',
      notes: 'yaban mersini, erik, SCA 87',
      process: 'honey',
      tl: 2200,
    },
    {
      name: 'Endonezya Frinsa #3',
      category: 'filter',
      origin: 'Batı Java · 1300–1500 m',
      notes: 'kan portakalı, kırmızı meyveler',
      process: 'natural',
      tl: 2400,
    },
    {
      name: 'Endonezya Guntur',
      category: 'filter',
      origin: 'Garut, Batı Java · 1200–1500 m',
      notes: 'çiçeksi, şeftali, sarı elma, esmer şeker',
      process: 'honey',
      tl: 1400,
    },
    {
      name: 'Endonezya Papandayan',
      category: 'filter',
      origin: 'Garut, Batı Java · 1100–1400 m',
      notes: 'çiçeksi, ahududu, erik',
      process: 'natural',
      tl: 2400,
    },
    {
      name: 'Endonezya Sumatra',
      category: 'filter',
      origin: 'Sumatra · 1300 m (Giling Basah)',
      notes: 'çikolata, baharat, tarçın',
      process: 'other',
      tl: 1100,
    },
    {
      name: 'El Salvador Ochuspe',
      category: 'filter',
      origin: 'Santa Ana · 1250–1400 m · 60 saat',
      notes: 'beyaz üzüm, karamel, kayısı',
      process: 'anaerobic',
      tl: 1350,
    },
    {
      name: 'Kolombiya Watermelon',
      category: 'filter',
      origin: 'Castillo, Santa Monica · 1250–1800 m · Jairo Arcila',
      notes: 'karpuz şekeri, kavun',
      process: 'washed',
      tl: 3600,
    },
    {
      name: 'Meksika Kafeinsiz',
      category: 'filter',
      origin: 'Altura, Chiapas · 1300 m (Swiss Water)',
      notes: 'çikolata, badem',
      process: 'other',
      tl: 1350,
    },
  ] as {
    name: string;
    category: 'espresso' | 'filter';
    origin: string;
    notes: string;
    process: 'washed' | 'natural' | 'honey' | 'anaerobic' | 'other' | null;
    tl: number;
  }[],
};

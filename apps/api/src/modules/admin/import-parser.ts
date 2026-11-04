import { parseTRYInput } from '@roastcost/shared';

export interface ParsedImportRow {
  line: number;
  productName: string;
  category: 'espresso' | 'filter';
  minKg: number;
  pricePerKgKurus: number;
}
export interface ImportError {
  line: number;
  raw: string;
  message: string;
}

const CATEGORY: Record<string, 'espresso' | 'filter'> = {
  espresso: 'espresso',
  esp: 'espresso',
  filtre: 'filter',
  filter: 'filter',
  'filtre kahve': 'filter',
};

/**
 * Pasted price list → rows. One row per line:  ürün adı <TAB|;> kategori <TAB|;> min_kg <TAB|;> kg fiyatı (TL)
 * Commas are NOT separators (Turkish decimals: "1.250,50"). A header line is skipped. Empty lines ignored.
 */
export function parsePriceImport(text: string): { rows: ParsedImportRow[]; errors: ImportError[] } {
  const rows: ParsedImportRow[] = [];
  const errors: ImportError[] = [];
  const seen = new Set<string>();
  text.split(/\r?\n/).forEach((raw, idx) => {
    const line = idx + 1;
    if (!raw.trim()) return;
    const cells = raw.split(/\t|;/).map((c) => c.trim());
    if (idx === 0 && /ürün|urun|product/i.test(cells[0] ?? '')) return; // header
    if (cells.length !== 4) {
      errors.push({
        line,
        raw,
        message: '4 sütun bekleniyor: ürün adı; kategori; min kg; kg fiyatı',
      });
      return;
    }
    const [name = '', cat = '', kg = '', price = ''] = cells;
    if (name.length < 1 || name.length > 120)
      return void errors.push({ line, raw, message: 'Ürün adı 1–120 karakter olmalı' });
    const category = CATEGORY[cat.toLocaleLowerCase('tr')];
    if (!category)
      return void errors.push({ line, raw, message: 'Kategori "espresso" ya da "filtre" olmalı' });
    const minKg = Number(kg.replace(',', '.'));
    if (!Number.isInteger(minKg) || minKg < 1 || minKg > 10_000)
      return void errors.push({ line, raw, message: 'Min kg pozitif tam sayı olmalı' });
    const kurus = parseTRYInput(price);
    if (kurus === null || kurus <= 0)
      return void errors.push({ line, raw, message: 'Fiyat geçersiz (örn. 1.250,00)' });
    const key = `${name.toLocaleLowerCase('tr')}|${minKg}`;
    if (seen.has(key))
      return void errors.push({ line, raw, message: 'Aynı ürün ve kademe iki kez yazılmış' });
    seen.add(key);
    rows.push({ line, productName: name, category, minKg, pricePerKgKurus: kurus });
  });
  return { rows, errors };
}

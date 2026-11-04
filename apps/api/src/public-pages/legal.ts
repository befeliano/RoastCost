import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { APP_NAME, LEGAL_VERSIONS } from '@roastcost/shared';
import type { Config } from '../config';
import { esc, page } from '../lib/html';

export const LEGAL_DOCS = {
  kvkk: {
    file: 'kvkk-aydinlatma-metni.md',
    title: 'KVKK Aydınlatma Metni',
    version: LEGAL_VERSIONS.kvkk_notice,
  },
  privacy: {
    file: 'gizlilik-politikasi.md',
    title: 'Gizlilik Politikası',
    version: LEGAL_VERSIONS.privacy,
  },
  terms: {
    file: 'kullanim-kosullari.md',
    title: 'Kullanım Koşulları',
    version: LEGAL_VERSIONS.terms,
  },
} as const;
export type LegalSlug = keyof typeof LEGAL_DOCS;

function legalDir(): string {
  const candidates = [
    process.env.LEGAL_DIR,
    path.resolve(process.cwd(), 'legal'),
    path.resolve(process.cwd(), '../../legal'),
  ];
  const found = candidates.find((c) => c && existsSync(path.join(c, LEGAL_DOCS.kvkk.file)));
  if (!found) throw new Error('legal/ directory not found (set LEGAL_DIR)');
  return found;
}

/** Tiny Markdown subset → HTML (headings, paragraphs, lists, tables, **bold**, [links](url)). Input is our own text. */
export function markdownToHtml(md: string): string {
  const inline = (s: string) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, t: string, u: string) => {
        const href = u.replace(/&#47;/g, '/').replace(/&#61;/g, '=');
        return /^(https?:|mailto:|\/)/.test(href) ? `<a href="${esc(href)}">${t}</a>` : t;
      });
  const out: string[] = [];
  const lines = md.replace(/\r/g, '').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (!line.trim()) continue;
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const lvl = (h[1] ?? '#').length;
      out.push(`<h${lvl}>${inline(h[2] ?? '')}</h${lvl}>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i] ?? '')) {
        items.push(`<li>${inline((lines[i] ?? '').replace(/^\s*([-*]|\d+\.)\s+/, ''))}</li>`);
        i++;
      }
      i--;
      out.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`);
      continue;
    }
    if (line.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && (lines[i] ?? '').startsWith('|')) {
        const cells = (lines[i] ?? '')
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      i--;
      const [head, ...body] = rows;
      out.push(
        `<table><thead><tr>${(head ?? []).map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body
          .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table>`,
      );
      continue;
    }
    if (line.startsWith('>')) {
      out.push(`<div class="card">${inline(line.replace(/^>\s?/, ''))}</div>`);
      continue;
    }
    const para: string[] = [line];
    while (
      i + 1 < lines.length &&
      (lines[i + 1] ?? '').trim() &&
      !/^(#|\||>|\s*[-*]\s|\s*\d+\.\s)/.test(lines[i + 1] ?? '')
    ) {
      para.push(lines[++i] ?? '');
    }
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return out.join('\n');
}

const cache = new Map<string, string>();

export async function renderLegal(
  slug: LegalSlug,
  config: Pick<Config, 'CONTACT_EMAIL' | 'DATA_CONTROLLER' | 'PUBLIC_BASE_URL'>,
): Promise<string> {
  const doc = LEGAL_DOCS[slug];
  const key = `${slug}:${doc.version}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const raw = await readFile(path.join(legalDir(), doc.file), 'utf8');
  const filled = raw
    .replaceAll('{{APP_NAME}}', APP_NAME)
    .replaceAll('{{CONTACT_EMAIL}}', config.CONTACT_EMAIL)
    .replaceAll('{{DATA_CONTROLLER}}', config.DATA_CONTROLLER)
    .replaceAll('{{PUBLIC_BASE_URL}}', config.PUBLIC_BASE_URL)
    .replaceAll('{{VERSION}}', doc.version);
  const html = page(doc.title, markdownToHtml(filled));
  cache.set(key, html);
  return html;
}

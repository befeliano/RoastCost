/** Escape for HTML text and attribute contexts. Every dynamic value in server pages goes through this. */
export function esc(value: unknown): string {
  return String(value ?? '').replace(
    /[&<>"'`=/]/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '`': '&#96;',
        '=': '&#61;',
        '/': '&#47;',
      })[c] ?? c,
  );
}

/** Minimal, framework-free page shell: one inline stylesheet, no scripts, no cookies, no external assets. */
export function page(title: string, body: string, opts: { lang?: string } = {}): string {
  return `<!doctype html>
<html lang="${opts.lang ?? 'tr'}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${esc(title)}</title>
<style>${CSS}</style></head>
<body><header><span>RoastCost</span></header><main>${body}</main></body></html>`;
}

const CSS = `
*{box-sizing:border-box}body{margin:0;font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;color:#2B1F1A;background:#fff}
header{background:#5E1A2B;color:#fff;padding:14px 18px;font-weight:700;letter-spacing:.02em}
main{max-width:640px;margin:0 auto;padding:18px}
h1{font-size:1.35rem;margin:.2rem 0 1rem}h2{font-size:1.05rem;margin:1.4rem 0 .5rem}
.card{border:1px solid #EADFD8;border-radius:14px;padding:14px 16px;margin:12px 0;background:#FBF8F6}
table{width:100%;border-collapse:collapse}td,th{padding:8px 4px;border-bottom:1px solid #EADFD8;text-align:left;vertical-align:top}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.muted{color:#7A6B63;font-size:.9rem}label.opt{display:flex;gap:10px;align-items:flex-start;padding:12px;border:1px solid #EADFD8;border-radius:12px;margin:8px 0;background:#fff}
label.opt input{margin-top:4px;width:20px;height:20px;accent-color:#5E1A2B}
button{font:inherit;font-weight:600;border-radius:12px;padding:14px 16px;width:100%;margin:8px 0;cursor:pointer;min-height:48px}
.primary{background:#5E1A2B;color:#fff;border:0}.secondary{background:#fff;color:#5E1A2B;border:1.5px solid #5E1A2B}
textarea,input[type=password],input[type=email]{width:100%;font:inherit;padding:12px;border:1px solid #EADFD8;border-radius:12px}
.ok{color:#2F7D4F}.err{color:#B3261E}.note{font-size:.82rem;color:#7A6B63;margin-top:24px;border-top:1px solid #EADFD8;padding-top:12px}
a{color:#5E1A2B}`;

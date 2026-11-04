import tr from './tr.json';

type Dict = { [k: string]: string | Dict };

/** t('cost.title') or t('orders.count', { n: 3 }) → "{n}" placeholders replaced. */
export function t(key: string, params?: Record<string, string | number>): string {
  const value = key
    .split('.')
    .reduce<string | Dict | undefined>(
      (node, part) => (node && typeof node === 'object' ? node[part] : undefined),
      tr as Dict,
    );
  if (typeof value !== 'string') return key;
  return params
    ? value.replace(/\{(\w+)\}/g, (_m, k: string) => String(params[k] ?? `{${k}}`))
    : value;
}

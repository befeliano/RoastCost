import { Pill } from '@/components/Misc';
import { daysSince, formatDate } from '@/lib/format';
import { t } from '@/locales';

/** "Fiyat güncelliği" label shown to cafes (spec K8 / §19.5). Older than 30 days → warning. */
export function Freshness({ iso }: { iso: string | null }) {
  if (!iso) return null;
  const d = daysSince(iso);
  return (
    <Pill
      tone={d > 30 ? 'warning' : 'success'}
      icon="clock"
      label={
        d > 30 ? t('catalog.stale', { days: d }) : t('catalog.freshness', { date: formatDate(iso) })
      }
    />
  );
}

import type { CafeStatus, CommissionStatus } from '@roastcost/shared';

export const CAFE_LABEL: Record<CafeStatus, string> = {
  pending: 'Bekliyor',
  approved: 'Onaylı',
  rejected: 'Reddedildi',
  suspended: 'Askıda',
};
export const CAFE_TONE = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  suspended: 'neutral',
} as const;
export const COMMISSION_TONE: Record<CommissionStatus, 'neutral' | 'warning' | 'info' | 'success'> =
  {
    not_applicable: 'neutral',
    pending: 'warning',
    requested: 'info',
    paid: 'success',
    waived: 'neutral',
  };

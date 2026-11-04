import type { OrderStatus } from '@roastcost/shared';
import type { Tone } from '@/components/Misc';

export const ORDER_TONE: Record<OrderStatus, Tone> = {
  draft: 'neutral',
  sent: 'info',
  confirmed: 'success',
  declined: 'danger',
  expired: 'warning',
  cancelled: 'neutral',
};

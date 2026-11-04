import { APP_NAME } from './app';
import { formatKg } from './money';

export interface OrderMessageItem {
  productName: string;
  quantityG: number;
}

export interface OrderMessageInput {
  roasterName: string;
  cafeName: string;
  district: string;
  cafePhone: string;
  orderNo: number;
  items: OrderMessageItem[];
  /** ISO date YYYY-MM-DD or null */
  requestedDeliveryDate: string | null;
  note: string | null;
  confirmUrl: string;
  appName?: string;
}

export function formatOrderNo(orderNo: number): string {
  return `S-${orderNo}`;
}

/** YYYY-MM-DD → DD.MM.YYYY */
export function formatDateTr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

/** WhatsApp order message (spec §8.2). Turkish, plain text. */
export function buildOrderMessage(i: OrderMessageInput): string {
  const items = i.items.map((it) => `• ${it.productName} — ${formatKg(it.quantityG)}`).join('\n');
  const note = i.note && i.note.trim() ? i.note.trim() : '-';
  return [
    `Merhaba ${i.roasterName}, ${i.appName ?? APP_NAME} üzerinden yeni sipariş talebi var.`,
    '',
    `Kafe: ${i.cafeName} (${i.district})`,
    `Telefon: ${i.cafePhone}`,
    `Sipariş no: ${formatOrderNo(i.orderNo)}`,
    '',
    items,
    `Toplam: ${formatKg(i.items.reduce((s, it) => s + it.quantityG, 0))}`,
    '',
    `İstenen teslim tarihi: ${i.requestedDeliveryDate ? formatDateTr(i.requestedDeliveryDate) : 'Belirtilmedi'}`,
    `Not: ${note}`,
    '',
    `Siparişi aldığınızı bu bağlantıdan işaretleyin: ${i.confirmUrl}`,
  ].join('\n');
}

/** https://wa.me/<digits>?text=<encoded> */
export function buildWaUrl(phoneE164: string, text: string): string {
  return `https://wa.me/${phoneE164.replace(/^\+/, '')}?text=${encodeURIComponent(text)}`;
}

/** Above this length some WhatsApp clients truncate links; the app offers "copy message". */
export const WA_SAFE_URL_LENGTH = 4000;

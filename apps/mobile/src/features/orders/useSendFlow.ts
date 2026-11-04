import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { Order, OrderCreated } from '@/api/types';
import { keys } from '@/hooks/useCafeData';

/**
 * Spec §8.1: open WhatsApp with the prepared message; when the app becomes active again,
 * ask "Mesajı gönderdin mi?" → yes marks the order as sent.
 */
export function useSendFlow() {
  const qc = useQueryClient();
  const [pending, setPending] = useState<OrderCreated | null>(null);
  const [ask, setAsk] = useState(false);
  const [success, setSuccess] = useState(false);
  const awaitingReturn = useRef(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && awaitingReturn.current) {
        awaitingReturn.current = false;
        setAsk(true);
      }
    });
    return () => sub.remove();
  }, []);

  async function open(created: OrderCreated): Promise<boolean> {
    setPending(created);
    awaitingReturn.current = true;
    try {
      await Linking.openURL(created.waUrl);
      return true;
    } catch {
      awaitingReturn.current = false;
      return false;
    }
  }

  async function copy(): Promise<void> {
    if (pending) await Clipboard.setStringAsync(pending.message);
  }

  async function confirmSent(): Promise<Order | null> {
    if (!pending) return null;
    const o = await api<Order>(`/orders/${pending.order.id}/mark-sent`, { method: 'POST' });
    setAsk(false);
    setSuccess(true);
    void qc.invalidateQueries({ queryKey: keys.orders });
    return o;
  }

  function notYet() {
    setAsk(false);
    void qc.invalidateQueries({ queryKey: keys.orders });
  }

  return { pending, ask, success, setSuccess, open, copy, confirmSent, notYet, setAsk };
}

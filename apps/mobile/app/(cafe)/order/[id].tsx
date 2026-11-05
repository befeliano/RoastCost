import { formatDateTr, formatKg, formatOrderNo } from '@roastcost/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import type { OrderCreated } from '@/api/types';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Notice, Pill } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { SuccessOverlay } from '@/components/SuccessOverlay';
import { Text } from '@/components/Text';
import { ORDER_TONE } from '@/features/orders/status';
import { useSendFlow } from '@/features/orders/useSendFlow';
import { keys, useOrder } from '@/hooks/useCafeData';
import { formatDateTime, formatTRY } from '@/lib/format';
import { t } from '@/locales';
import { colors, space } from '@/theme';
import { confirm } from '@/lib/confirm';
import { toast } from '@/components/Toast';
import { Skeleton } from '@/components/Skeleton';
import { useCatalog } from '@/features/catalog/store';
import { useCart } from '@/store/cart';
import { nav } from '@/lib/nav';

function Step({
  done,
  label,
  time,
  tone,
}: {
  done: boolean;
  label: string;
  time?: string | null;
  tone?: string;
}) {
  return (
    <View style={styles.step}>
      <View
        style={[
          styles.dot,
          done && { backgroundColor: tone ?? colors.success, borderColor: tone ?? colors.success },
        ]}
      >
        {done ? <Icon name="check" size={14} color="#fff" strokeWidth={3} /> : null}
      </View>
      <View style={styles.flex}>
        <Text variant={done ? 'bodyStrong' : 'body'} color={done ? colors.text : colors.textMuted}>
          {label}
        </Text>
        {time ? <Text variant="small">{formatDateTime(time)}</Text> : null}
      </View>
    </View>
  );
}

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useOrder(id);
  const qc = useQueryClient();
  const flow = useSendFlow();
  const o = q.data;
  if (!o)
    return (
      <Screen title={t('orders.title')} back>
        <Skeleton rows={3} />
      </Screen>
    );
  const open = o.status === 'draft' || o.status === 'sent';
  const final =
    o.status === 'confirmed' ||
    o.status === 'declined' ||
    o.status === 'expired' ||
    o.status === 'cancelled';
  const finalTone =
    o.status === 'confirmed'
      ? colors.success
      : o.status === 'declined'
        ? colors.danger
        : colors.textMuted;

  const resend = async () => {
    try {
      const created = await api<OrderCreated>(`/orders/${o.id}/link`, { method: 'POST' });
      await flow.open(created);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : t('common.unknownError'), 'warning');
    }
  };
  const cancel = async () => {
    if (
      !(await confirm(t('orders.cancelConfirm'), formatOrderNo(o.orderNo), t('orders.cancelOrder')))
    )
      return;
    await api(`/orders/${o.id}/cancel`, { method: 'POST' });
    toast('Sipariş iptal edildi');
    void qc.invalidateQueries({ queryKey: keys.orders });
    void q.refetch();
  };

  return (
    <Screen
      title={formatOrderNo(o.orderNo)}
      back
      onRefresh={() => void q.refetch()}
      refreshing={q.isRefetching}
    >
      <View style={styles.row}>
        <Text variant="h2" style={styles.flex}>
          {o.roasterName}
        </Text>
        <Pill tone={ORDER_TONE[o.status]} label={t(`orders.status.${o.status}`)} />
      </View>
      <Card style={styles.gap}>
        <Step done label={t('orders.status.draft')} time={o.createdAt} />
        <Step done={!!o.sentAt} label={t('orders.status.sent')} time={o.sentAt} />
        <Step
          done={final}
          label={final ? t(`orders.status.${o.status}`) : t('orders.status.confirmed')}
          time={o.decidedAt}
          tone={finalTone}
        />
      </Card>
      {o.declineReason ? <Notice text={o.declineReason} tone="danger" /> : null}
      <Card style={styles.gap}>
        {o.items?.map((i) => (
          <View key={i.productName} style={styles.row}>
            <Text variant="body" style={styles.flex}>
              {i.productName} · {formatKg(i.quantityG)}
            </Text>
            <Text variant="money">{formatTRY(i.lineTotalKurus)}</Text>
          </View>
        ))}
        <View style={styles.row}>
          <Text variant="h3" style={styles.flex}>
            {t('orders.subtotal')}
          </Text>
          <Text variant="h3">{formatTRY(o.subtotalKurus)}</Text>
        </View>
        <Text variant="small">
          {t('orders.deliveryDate')}:{' '}
          {o.requestedDeliveryDate ? formatDateTr(o.requestedDeliveryDate) : t('orders.noDate')}
        </Text>
        {o.note ? (
          <View style={styles.row}>
            <Icon name="book" size={16} color={colors.textMuted} />
            <Text variant="small" style={styles.flex}>
              {o.note}
            </Text>
          </View>
        ) : null}
      </Card>
      <Button
        title={t('orders.reorder')}
        variant="secondary"
        icon="repeat"
        onPress={() => {
          const cart = useCart.getState();
          let added = 0;
          for (const i of o.items ?? []) {
            if (i.productId && useCatalog.getState().products[i.productId]?.isActive) {
              cart.setQuantity(o.roasterId, i.productId, i.quantityG);
              added++;
            }
          }
          if (!added) return toast(t('orders.reorderNone'), 'warning');
          toast(t('orders.reordered', { n: added }), 'repeat');
          nav.push({ pathname: '/cart/[roasterId]', params: { roasterId: o.roasterId } });
        }}
      />
      {useCatalog.getState().roasters[o.roasterId] ? (
        <Button
          title={t('orders.openRoaster')}
          variant="ghost"
          icon="store"
          onPress={() => nav.push({ pathname: '/roaster/[id]', params: { id: o.roasterId } })}
        />
      ) : null}
      {open ? (
        <>
          <Button title={t('orders.resend')} icon="send" onPress={() => resend()} />
          <Button title={t('orders.cancelOrder')} variant="danger" onPress={() => cancel()} />
        </>
      ) : null}
      <BottomSheet visible={flow.ask} onClose={flow.notYet} title={t('orders.didSend')}>
        <Text variant="body">{t('orders.didSendBody')}</Text>
        <Button
          title={t('orders.sentYes')}
          icon="check"
          onPress={async () => {
            await flow.confirmSent();
            void q.refetch();
          }}
        />
        <Button
          title={t('orders.copy')}
          variant="secondary"
          icon="copy"
          onPress={() => flow.copy()}
        />
        <Button title={t('orders.sentNo')} variant="ghost" onPress={flow.notYet} />
      </BottomSheet>
      <SuccessOverlay
        visible={flow.success}
        title={t('orders.sentTitle')}
        body={t('orders.sentBody')}
        onClose={() => {
          flow.setSuccess(false);
          router.setParams({});
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 40 },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

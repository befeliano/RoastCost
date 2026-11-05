import {
  PRODUCT_CATEGORIES,
  formatTrPhone,
  kurusToInput,
  normalizeTrPhone,
  parseTRYInput,
  type ProductCategory,
} from '@roastcost/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { api, ApiError } from '@/api/client';
import type { AdminProduct, AdminRoaster, AdminTier, CatalogRoaster } from '@/api/types';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { Chips, Notice, SectionTitle, ToggleRow } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { parseDecimal, formatTRY } from '@/lib/format';
import { t } from '@/locales';
import { colors, space, useColors } from '@/theme';
import { CityMap } from '@/features/explore/Maps';
import { nav } from '@/lib/nav';
import { Tap } from '@/components/Tap';

type TierSheet = { productId: string; tier?: AdminTier } | null;
const CAT_LABEL: Record<ProductCategory, string> = {
  espresso: t('catalog.espresso'),
  filter: t('catalog.filter'),
};

export default function RoasterEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const qc = useQueryClient();
  const c = useColors();
  const roasters = useQuery({
    queryKey: ['admin', 'roasters'],
    queryFn: () => api<AdminRoaster[]>('/admin/roasters'),
  });
  const products = useQuery({
    queryKey: ['admin', 'products', id],
    queryFn: () => api<AdminProduct[]>(`/admin/products?roaster_id=${id}`),
    enabled: !isNew,
  });
  const r = roasters.data?.find((x) => x.id === id);

  const [f, setF] = useState({
    name: '',
    whatsapp: '',
    vatRate: '10',
    commission: '15',
    notes: '',
    district: '',
    address: '',
    lat: '',
    lon: '',
    color: '',
    logo: '',
    desc: '',
    minOrder: '',
    card: '',
  });
  const [featured, setFeatured] = useState(false);
  const [incVat, setIncVat] = useState(false);
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tierSheet, setTierSheet] = useState<TierSheet>(null);
  const [tierForm, setTierForm] = useState({ minKg: '', price: '', reason: '' });
  const [productSheet, setProductSheet] = useState<Partial<AdminProduct> | null>(null);

  useEffect(() => {
    if (r) {
      setF({
        name: r.name,
        whatsapp: formatTrPhone(r.whatsapp),
        vatRate: String(r.vatRatePct),
        commission: String(r.commissionRateBp / 100),
        notes: r.adminNotes ?? '',
        district: r.district ?? '',
        address: r.address ?? '',
        lat: r.latitude !== null ? String(r.latitude) : '',
        lon: r.longitude !== null ? String(r.longitude) : '',
        color: r.brandColor ?? '',
        logo: r.logoUrl ?? '',
        desc: r.description ?? '',
        minOrder: r.minOrderKg !== null ? String(r.minOrderKg).replace('.', ',') : '',
        card: r.cardSurchargeBp !== null ? String(r.cardSurchargeBp / 100).replace('.', ',') : '',
      });
      setFeatured(r.isFeatured);
      setIncVat(r.pricesIncludeVat);
      setActive(r.isActive);
    }
  }, [r]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'roasters'] });
    void products.refetch();
  };
  const guard = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.unknownError'));
    }
  };

  const saveRoaster = () =>
    guard(async () => {
      if (!normalizeTrPhone(f.whatsapp))
        throw new ApiError(400, 'phone', 'Geçerli bir WhatsApp numarası girin');
      setBusy(true);
      const body = {
        name: f.name.trim(),
        whatsapp: f.whatsapp,
        pricesIncludeVat: incVat,
        vatRatePct: parseDecimal(f.vatRate) ?? 10,
        commissionRateBp: Math.round((parseDecimal(f.commission) ?? 15) * 100),
        adminNotes: f.notes.trim() || null,
        isActive: active,
        district: f.district.trim() || null,
        address: f.address.trim() || null,
        latitude: f.lat.trim() ? parseDecimal(f.lat) : null,
        longitude: f.lon.trim() ? parseDecimal(f.lon) : null,
        brandColor: f.color.trim() || null,
        logoUrl: f.logo.trim() || null,
        description: f.desc.trim() || null,
        isFeatured: featured,
        minOrderKg: f.minOrder.trim() ? parseDecimal(f.minOrder) : null,
        cardSurchargeBp: f.card.trim() ? Math.round((parseDecimal(f.card) ?? 0) * 100) : null,
      };
      try {
        if (isNew) {
          const res = await api<{ id: string }>('/admin/roasters', { method: 'POST', body });
          refresh();
          router.replace({ pathname: '/roaster-edit/[id]', params: { id: res.id } });
        } else {
          await api(`/admin/roasters/${id}`, { method: 'PATCH', body });
          refresh();
        }
      } finally {
        setBusy(false);
      }
    });

  const openTier = (productId: string, tier?: AdminTier) => {
    setTierForm({
      minKg: tier ? String(tier.minKg) : '',
      price: tier ? kurusToInput(tier.pricePerKgKurus) : '',
      reason: '',
    });
    setTierSheet({ productId, tier });
  };
  const saveTier = () =>
    guard(async () => {
      if (!tierSheet) return;
      const price = parseTRYInput(tierForm.price);
      const minKg = Number(tierForm.minKg);
      if (!price || !Number.isInteger(minKg) || minKg < 1)
        throw new ApiError(400, 'v', t('common.invalidNumber'));
      const body = { minKg, pricePerKgKurus: price, reason: tierForm.reason.trim() || null };
      if (tierSheet.tier)
        await api(`/admin/price-tiers/${tierSheet.tier.id}`, { method: 'PATCH', body });
      else
        await api('/admin/price-tiers', {
          method: 'POST',
          body: { ...body, productId: tierSheet.productId },
        });
      setTierSheet(null);
      refresh();
    });
  const deleteTier = () =>
    tierSheet?.tier &&
    Alert.alert(t('common.delete'), `${tierSheet.tier.minKg} kg`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () =>
          void guard(async () => {
            await api(`/admin/price-tiers/${tierSheet.tier?.id}`, { method: 'DELETE' });
            setTierSheet(null);
            refresh();
          }),
      },
    ]);
  const saveProduct = () =>
    guard(async () => {
      if (!productSheet?.name?.trim() || !productSheet.category)
        throw new ApiError(400, 'v', t('common.required'));
      const body = {
        name: productSheet.name.trim(),
        category: productSheet.category,
        origin: productSheet.origin || null,
        tastingNotes: productSheet.tastingNotes || null,
        isActive: productSheet.isActive ?? true,
      };
      if (productSheet.id)
        await api(`/admin/products/${productSheet.id}`, { method: 'PATCH', body });
      else await api('/admin/products', { method: 'POST', body: { ...body, roasterId: id } });
      setProductSheet(null);
      refresh();
    });

  return (
    <Screen title={isNew ? t('admin.newRoaster') : (r?.name ?? '')} back>
      {error ? <Notice text={error} tone="danger" /> : null}
      <Field label="Ad" value={f.name} onChangeText={(v) => setF({ ...f, name: v })} />
      <Field
        label={t('admin.whatsapp')}
        value={f.whatsapp}
        onChangeText={(v) => setF({ ...f, whatsapp: v })}
        keyboardType="phone-pad"
      />
      <ToggleRow label={t('admin.pricesIncludeVat')} value={incVat} onChange={setIncVat} />
      <View style={styles.row}>
        <View style={styles.flex}>
          <Field
            label={t('admin.vatRate')}
            value={f.vatRate}
            onChangeText={(v) => setF({ ...f, vatRate: v })}
            keyboardType="decimal-pad"
            suffix="%"
          />
        </View>
        <View style={styles.flex}>
          <Field
            label={t('admin.commissionRate')}
            value={f.commission}
            onChangeText={(v) => setF({ ...f, commission: v })}
            keyboardType="decimal-pad"
            suffix="%"
          />
        </View>
      </View>
      <Field
        label={t('admin.adminNotes')}
        value={f.notes}
        onChangeText={(v) => setF({ ...f, notes: v })}
        multiline
      />
      <SectionTitle>{t('admin.profile')}</SectionTitle>
      <Field
        label={t('auth.district')}
        value={f.district}
        onChangeText={(v) => setF({ ...f, district: v })}
        placeholder="Tepebaşı"
      />
      <Field
        label={t('admin.address')}
        value={f.address}
        onChangeText={(v) => setF({ ...f, address: v })}
      />
      <View style={styles.row}>
        <View style={styles.flex}>
          <Field
            label={t('admin.lat')}
            value={f.lat}
            onChangeText={(v) => setF({ ...f, lat: v })}
            keyboardType="decimal-pad"
            placeholder="39.7767"
          />
        </View>
        <View style={styles.flex}>
          <Field
            label={t('admin.lon')}
            value={f.lon}
            onChangeText={(v) => setF({ ...f, lon: v })}
            keyboardType="decimal-pad"
            placeholder="30.5206"
          />
        </View>
      </View>
      <Text variant="small">{t('admin.latLonHint')}</Text>
      {parseDecimal(f.lat) !== null && parseDecimal(f.lon) !== null ? (
        <CityMap
          roasters={[
            {
              id: 'preview',
              name: f.name,
              district: f.district || null,
              latitude: parseDecimal(f.lat),
              longitude: parseDecimal(f.lon),
            } as CatalogRoaster,
          ]}
          selectedId="preview"
          onSelect={() => undefined}
        />
      ) : null}
      <View style={styles.row}>
        <View style={styles.flex}>
          <Field
            label={t('admin.minOrderKg')}
            value={f.minOrder}
            onChangeText={(v) => setF({ ...f, minOrder: v })}
            keyboardType="decimal-pad"
            suffix="kg"
            placeholder="örn. 5"
          />
        </View>
        <View style={styles.flex}>
          <Field
            label={t('admin.cardSurcharge')}
            value={f.card}
            onChangeText={(v) => setF({ ...f, card: v })}
            keyboardType="decimal-pad"
            suffix="%"
            placeholder="örn. 2,5"
          />
        </View>
      </View>
      <Field
        label={t('admin.brandColor')}
        value={f.color}
        onChangeText={(v) => setF({ ...f, color: v })}
        autoCapitalize="none"
        placeholder="#12874A"
      />
      <Field
        label={t('admin.logoUrl')}
        value={f.logo}
        onChangeText={(v) => setF({ ...f, logo: v })}
        autoCapitalize="none"
        keyboardType="url"
        placeholder="https://…/logo.png"
      />
      <Field
        label={t('admin.description')}
        value={f.desc}
        onChangeText={(v) => setF({ ...f, desc: v })}
        multiline
        maxLength={500}
      />
      <ToggleRow label={t('admin.featured')} value={featured} onChange={setFeatured} />
      <ToggleRow label={t('admin.active')} value={active} onChange={setActive} />
      <Button
        title={t('common.save')}
        onPress={() => saveRoaster()}
        loading={busy}
        disabled={f.name.trim().length < 2}
      />

      {!isNew ? (
        <>
          <SectionTitle>{t('admin.products')}</SectionTitle>
          <View style={styles.row}>
            <Button
              title={t('admin.newProduct')}
              icon="plus"
              variant="secondary"
              small
              style={styles.flex}
              onPress={() => setProductSheet({ category: 'espresso', isActive: true })}
            />
            <Button
              title={t('admin.import')}
              icon="list"
              variant="secondary"
              small
              style={styles.flex}
              onPress={() =>
                nav.push({ pathname: '/price-import/[roasterId]', params: { roasterId: id } })
              }
            />
          </View>
          {products.data?.map((p) => (
            <Card key={p.id} style={styles.gap}>
              <Tap accessibilityRole="button" onPress={() => setProductSheet(p)}>
                <Text variant="h3">{p.name}</Text>
                <Text variant="small">
                  {CAT_LABEL[p.category]}
                  {p.origin ? ` · ${p.origin}` : ''}
                  {p.isActive ? '' : ' · pasif'}
                </Text>
              </Tap>
              <View style={styles.tiers}>
                {p.tiers.map((tt) => (
                  <Tap
                    key={tt.id}
                    accessibilityRole="button"
                    onPress={() => openTier(p.id, tt)}
                    style={styles.tier}
                  >
                    <Text variant="caption">{tt.minKg} kg+</Text>
                    <Text variant="money">{formatTRY(tt.pricePerKgKurus)}</Text>
                  </Tap>
                ))}
                <Tap
                  accessibilityRole="button"
                  accessibilityLabel={t('admin.newTier')}
                  onPress={() => openTier(p.id)}
                  style={[styles.tier, styles.addTier]}
                >
                  <Text variant="bodyStrong" color={c.primaryText}>
                    + kademe
                  </Text>
                </Tap>
              </View>
            </Card>
          ))}
        </>
      ) : null}

      <BottomSheet
        visible={!!tierSheet}
        onClose={() => setTierSheet(null)}
        title={tierSheet?.tier ? t('common.edit') : t('admin.newTier')}
      >
        <View style={styles.row}>
          <View style={styles.flex}>
            <Field
              label={t('admin.minKg')}
              value={tierForm.minKg}
              onChangeText={(v) => setTierForm({ ...tierForm, minKg: v })}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.flex}>
            <Field
              label={t('admin.pricePerKg')}
              value={tierForm.price}
              onChangeText={(v) => setTierForm({ ...tierForm, price: v })}
              keyboardType="decimal-pad"
              suffix="₺"
            />
          </View>
        </View>
        <Field
          label={t('admin.reason')}
          value={tierForm.reason}
          onChangeText={(v) => setTierForm({ ...tierForm, reason: v })}
        />
        <Button title={t('common.save')} onPress={() => saveTier()} />
        {tierSheet?.tier ? (
          <View style={styles.row}>
            <Button
              title={t('admin.history')}
              icon="history"
              variant="secondary"
              small
              style={styles.flex}
              onPress={() => {
                const tierId = tierSheet.tier?.id;
                setTierSheet(null);
                if (tierId) nav.push({ pathname: '/tier-history/[id]', params: { id: tierId } });
              }}
            />
            <Button
              title={t('common.delete')}
              variant="danger"
              small
              style={styles.flex}
              onPress={deleteTier}
            />
          </View>
        ) : null}
      </BottomSheet>

      <BottomSheet
        visible={!!productSheet}
        onClose={() => setProductSheet(null)}
        title={productSheet?.id ? productSheet.name : t('admin.newProduct')}
      >
        <Field
          label="Ad"
          value={productSheet?.name ?? ''}
          onChangeText={(v) => setProductSheet((p) => ({ ...p, name: v }))}
        />
        <Chips
          options={PRODUCT_CATEGORIES.map((c) => ({ value: c, label: CAT_LABEL[c] }))}
          value={productSheet?.category ?? null}
          onChange={(c) => setProductSheet((p) => ({ ...p, category: c }))}
        />
        <Field
          label={t('admin.origin')}
          value={productSheet?.origin ?? ''}
          onChangeText={(v) => setProductSheet((p) => ({ ...p, origin: v }))}
        />
        <Field
          label={t('admin.notes')}
          value={productSheet?.tastingNotes ?? ''}
          onChangeText={(v) => setProductSheet((p) => ({ ...p, tastingNotes: v }))}
        />
        <ToggleRow
          label={t('admin.active')}
          value={productSheet?.isActive ?? true}
          onChange={(v) => setProductSheet((p) => ({ ...p, isActive: v }))}
        />
        <Button title={t('common.save')} onPress={() => saveProduct()} />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  gap: { gap: space.sm },
  tiers: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tier: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.bg,
    justifyContent: 'center',
  },
  addTier: { borderStyle: 'dashed', borderColor: colors.textMuted },
});

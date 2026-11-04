import { formatPct, kurusToInput, parseTRYInput } from '@roastcost/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { Icon } from '@/components/Icon';
import { Chips, Notice, Pill, Row, ToggleRow } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { EmailVerifyNotice, StatusCard } from '@/features/account/StatusCards';
import { activeRoasters, productsOf, tiersOf, useCatalog } from '@/features/catalog/store';
import { CostBar } from '@/features/cost/CostBar';
import { useCupCost } from '@/features/cost/useCupCost';
import { t } from '@/locales';
import { colors, space, useColors } from '@/theme';
import { formatTRY, formatTRYFull } from '@/lib/format';

function Line({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.line}>
      <Text variant="body">{label}</Text>
      <AnimatedNumber variant="money" value={value} format={formatTRYFull} />
    </View>
  );
}

export default function Cost() {
  const c = useColors();
  const catalog = useCatalog();
  const [picker, setPicker] = useState(false);
  const [q, setQ] = useState('');
  const qn = q.trim().toLocaleLowerCase('tr');
  const {
    me,
    approved,
    prefs,
    recipes,
    recipe,
    ingredients,
    settings,
    mode,
    product,
    roaster,
    fromCatalog,
    source,
    result,
    queries: { settingsQ, recipesQ, ingredientsQ },
  } = useCupCost();
  const [manualText, setManualText] = useState(
    prefs.manualPricePerKgKurus ? kurusToInput(prefs.manualPricePerKgKurus) : '',
  );
  const [kgText, setKgText] = useState(String(prefs.monthlyKg));

  const syrupMissing =
    recipe?.templateKey === 'mocha' &&
    !recipe.ingredients.some(
      (ri) => ingredients.find((i) => i.id === ri.ingredientId)?.kind === 'syrup',
    );
  const milkZero = recipe?.ingredients.some((ri) => {
    const i = ingredients.find((x) => x.id === ri.ingredientId);
    return i?.kind === 'milk' && i.pricePerLiterKurus === 0;
  });

  const marginTone =
    result?.marginStatus === 'loss'
      ? 'danger'
      : result?.marginStatus === 'below_target'
        ? 'warning'
        : 'success';
  const refresh = () => {
    void settingsQ.refetch();
    void recipesQ.refetch();
    void ingredientsQ.refetch();
    if (approved) void catalog.sync({ force: true });
  };

  return (
    <Screen
      title={t('cost.title')}
      onRefresh={refresh}
      refreshing={recipesQ.isFetching && !recipesQ.isLoading}
    >
      {me?.cafe && me.cafe.status !== 'approved' ? (
        <StatusCard status={me.cafe.status} note={me.cafe.statusNote} compact />
      ) : null}
      {me && !me.user.emailVerified ? <EmailVerifyNotice email={me.user.email} /> : null}

      <Text variant="caption">{t('cost.recipe').toUpperCase()}</Text>
      <Chips
        options={recipes.map((r) => ({ value: r.id, label: r.name }))}
        value={recipe?.id ?? null}
        onChange={(id) => prefs.set({ recipeId: id })}
      />

      <Text variant="caption">{t('cost.source').toUpperCase()}</Text>
      {approved ? (
        <Chips
          options={[
            { value: 'catalog' as const, label: t('cost.pickProduct') },
            { value: 'manual' as const, label: t('cost.manual') },
          ]}
          value={mode}
          onChange={(m) => prefs.set({ mode: m })}
        />
      ) : null}

      {mode === 'manual' ? (
        <Card style={styles.gap}>
          <Field
            label={t('cost.manualPrice')}
            value={manualText}
            onChangeText={(v) => {
              setManualText(v);
              prefs.set({ manualPricePerKgKurus: parseTRYInput(v) });
            }}
            keyboardType="decimal-pad"
            placeholder="örn. 950"
            suffix="₺/kg"
            error={
              manualText && parseTRYInput(manualText) === null
                ? t('common.invalidMoney')
                : undefined
            }
          />
          <ToggleRow
            label={t('cost.manualVat')}
            value={prefs.manualIncludesVat}
            onChange={(v) => prefs.set({ manualIncludesVat: v })}
          />
        </Card>
      ) : (
        <Card
          onPress={() => setPicker(true)}
          style={styles.pickRow}
          accessibilityLabel={t('cost.pickProduct')}
        >
          <Icon name="bean" color={c.primaryText} />
          <View style={styles.flex}>
            <Text variant="bodyStrong">{product ? product.name : t('cost.pickProduct')}</Text>
            {roaster && fromCatalog ? (
              <Text variant="small">
                {roaster.name} · {formatTRY(fromCatalog.tier.pricePerKgKurus)}/kg (
                {t('catalog.fromKg', { kg: fromCatalog.tier.minKg })})
              </Text>
            ) : null}
          </View>
          <Icon name="chevron" size={18} color={colors.textMuted} />
        </Card>
      )}
      {mode === 'catalog' ? (
        <Field
          label={t('cost.monthlyKg')}
          value={kgText}
          onChangeText={(v) => {
            setKgText(v);
            const n = Number(v.replace(',', '.'));
            if (n > 0 && n <= 10_000) prefs.set({ monthlyKg: n });
          }}
          keyboardType="decimal-pad"
          suffix="kg"
        />
      ) : null}
      {fromCatalog?.belowMinimum ? (
        <Notice
          text={t('cost.belowMin', { kg: prefs.monthlyKg, min: fromCatalog.tier.minKg })}
          tone="info"
        />
      ) : null}
      {!source ? <Notice text={t('cost.noSource')} tone="info" icon="cup" /> : null}
      {syrupMissing ? <Notice text={t('cost.syrupMissing')} /> : null}
      {milkZero ? <Notice text={t('cost.milkPriceZero')} /> : null}

      {result && settings ? (
        <>
          <Card style={styles.gap}>
            <CostBar
              parts={[
                { label: t('cost.barCoffee'), value: result.coffeeKurus },
                { label: t('cost.barIngredients'), value: result.ingredientsKurus },
                { label: t('cost.barCup'), value: result.cupKurus },
                { label: t('cost.barOverhead'), value: result.overheadKurus },
              ]}
            />
            <Line
              label={t('cost.coffee', { grams: result.coffeeGrams })}
              value={result.coffeeKurus}
            />
            <Line label={t('cost.ingredients')} value={result.ingredientsKurus} />
            <Line label={t('cost.cup')} value={result.cupKurus} />
            <Line label={t('cost.overhead')} value={result.overheadKurus} />
            <View style={styles.divider} />
            <View style={styles.line}>
              <Text variant="h3">{t('cost.total')}</Text>
              <AnimatedNumber
                variant="money"
                style={styles.total}
                value={result.totalKurus}
                format={formatTRYFull}
              />
            </View>
          </Card>
          <Card style={[styles.gap, styles.hero, { backgroundColor: c.primary }]}>
            <LinearGradient
              colors={c.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text variant="caption" color={c.onPrimary}>
              {t('cost.suggested').toUpperCase()}
            </Text>
            <AnimatedNumber
              variant="bigMoney"
              color={c.onPrimary}
              value={result.suggestedPriceRoundedKurus}
              format={formatTRY}
            />
            <Text variant="small" color={c.onPrimary}>
              {t('cost.suggestedNote', {
                margin: settings.targetMarginPct,
                vat: settings.saleVatRatePct,
                step: kurusToInput(settings.priceRoundingStepKurus),
              })}
            </Text>
          </Card>
          {recipe?.sellPriceKurus && result.currentMarginPct !== null ? (
            <Card style={styles.gap}>
              <View style={styles.line}>
                <Text variant="body">{t('cost.menuPrice')}</Text>
                <Text variant="money">{formatTRY(recipe.sellPriceKurus)}</Text>
              </View>
              <View style={styles.line}>
                <Text variant="h3">{t('cost.currentMargin')}</Text>
                <AnimatedNumber
                  variant="h2"
                  value={Math.round(result.currentMarginPct * 10)}
                  format={(n) => formatPct(n / 10)}
                />
              </View>
              <Pill
                tone={marginTone}
                icon={result.marginStatus === 'ok' ? 'check' : 'warning'}
                label={
                  result.marginStatus === 'loss'
                    ? t('cost.loss')
                    : result.marginStatus === 'below_target'
                      ? t('cost.belowTarget')
                      : t('cost.ok')
                }
              />
            </Card>
          ) : recipe ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('cost.addMenuPrice')}
              onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}
            >
              <Notice text={t('cost.addMenuPrice')} tone="info" icon="plus" />
            </Pressable>
          ) : null}
          <Button
            title={t('cost.share')}
            variant="ghost"
            icon="share"
            onPress={() =>
              void Share.share({
                message: [
                  `${recipe?.name ?? ''} — ${t('cost.total')}: ${formatTRYFull(result.totalKurus)}`,
                  `${t('cost.coffee', { grams: result.coffeeGrams })}: ${formatTRYFull(result.coffeeKurus)}`,
                  `${t('cost.ingredients')}: ${formatTRYFull(result.ingredientsKurus)}`,
                  `${t('cost.cup')}: ${formatTRYFull(result.cupKurus)}`,
                  `${t('cost.overhead')}: ${formatTRYFull(result.overheadKurus)}`,
                  `${t('cost.suggested')}: ${formatTRY(result.suggestedPriceRoundedKurus)}`,
                  product && roaster ? `${product.name} · ${roaster.name}` : '',
                  '— RoastCost',
                ]
                  .filter(Boolean)
                  .join('\n'),
              })
            }
          />
          {approved && recipe ? (
            <Button
              title={t('catalog.compare')}
              variant="secondary"
              icon="chart"
              onPress={() => router.push('/compare')}
            />
          ) : null}
        </>
      ) : null}

      <BottomSheet visible={picker} onClose={() => setPicker(false)} title={t('cost.pickProduct')}>
        <Field
          label={t('common.search')}
          hideLabel
          value={q}
          onChangeText={setQ}
          placeholder={t('cost.searchBean')}
          autoCorrect={false}
        />
        <ScrollView style={styles.sheetList} keyboardShouldPersistTaps="handled">
          {activeRoasters(catalog).map((r) => {
            const ps = productsOf(catalog, r.id)
              .filter(
                (p) =>
                  !qn ||
                  `${p.name} ${r.name} ${p.origin ?? ''} ${p.tastingNotes ?? ''}`
                    .toLocaleLowerCase('tr')
                    .includes(qn),
              )
              .sort((a, b) => (a.category === b.category ? 0 : a.category === 'espresso' ? -1 : 1));
            if (!ps.length) return null;
            return (
              <View key={r.id}>
                <Text variant="caption" style={styles.sheetHead}>
                  {r.name.toLocaleUpperCase('tr')}
                </Text>
                {ps.map((p) => (
                  <Row
                    key={p.id}
                    title={p.name}
                    subtitle={[
                      p.category === 'espresso' ? t('catalog.espresso') : t('catalog.filter'),
                      tiersOf(catalog, p.id)[0]
                        ? `${formatTRY(tiersOf(catalog, p.id)[0]!.pricePerKgKurus)}/kg`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    right={
                      prefs.productId === p.id ? (
                        <Icon name="check" color={c.primaryText} />
                      ) : undefined
                    }
                    onPress={() => {
                      prefs.set({ productId: p.id, mode: 'catalog' });
                      setPicker(false);
                      setQ('');
                    }}
                  />
                ))}
              </View>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { overflow: 'hidden', paddingVertical: space.xl },
  flex: { flex: 1 },
  gap: { gap: space.sm },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 30,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: space.xs },
  total: { fontSize: 20 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  sheetList: { maxHeight: 420 },
  sheetHead: { marginTop: space.md, marginBottom: space.xs },
});

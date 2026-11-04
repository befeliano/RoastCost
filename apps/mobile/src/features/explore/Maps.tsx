import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import type { CatalogRoaster } from '@/api/types';
import { Text } from '@/components/Text';
import { colors, useColors } from '@/theme';
import { MAP_H, MAP_W, PROVINCES, project } from './turkeyMap';

const PIN = 'M0 0C-7-10-12-15-12-22a12 12 0 0 1 24 0c0 7-5 12-12 22Z';

function Pin({ x, y, scale = 1, label }: { x: number; y: number; scale?: number; label?: string }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${scale})`}>
      <Path d={PIN} fill={colors.pin} stroke="#FFFFFF" strokeWidth={2} />
      <Circle cx={0} cy={-22} r={4.5} fill="#FFFFFF" />
      {label ? (
        <SvgText
          fontFamily="Urbanist_700Bold"
          x={0}
          y={-27}
          fontSize={11}
          fontWeight="700"
          fill="#FFFFFF"
          textAnchor="middle"
        >
          {label}
        </SvgText>
      ) : null}
    </G>
  );
}

const located = (rs: CatalogRoaster[]) =>
  rs.filter((r) => r.latitude !== null && r.longitude !== null);

/** Türkiye: all provinces, Eskişehir (and any province with roasters) highlighted, red pins at roasters. */
export function TurkeyMap({ roasters }: { roasters: CatalogRoaster[] }) {
  const c = useColors();
  const pts = located(roasters).map((r) => project(r.latitude as number, r.longitude as number));
  // roasters of one city overlap at country scale → one pin per ~city with a count badge
  const clusters = useMemo(() => {
    const out: { x: number; y: number; n: number }[] = [];
    for (const p of pts) {
      const hit = out.find((q) => Math.hypot(q.x - p.x, q.y - p.y) < 25);
      if (hit) hit.n++;
      else out.push({ ...p, n: 1 });
    }
    return out;
  }, [pts]);
  return (
    <View accessibilityLabel={`Türkiye haritası, ${pts.length} kavurucu`} accessibilityRole="image">
      <Svg
        width="100%"
        height={undefined}
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        style={{ aspectRatio: MAP_W / MAP_H }}
      >
        {PROVINCES.map((p) => (
          <Path
            key={p.name}
            d={p.d}
            fill={p.name === 'Eskisehir' ? c.primaryBg : '#EEF1EE'}
            stroke={p.name === 'Eskisehir' ? c.primaryText : '#C9D0CB'}
            strokeWidth={p.name === 'Eskisehir' ? 4 : 1.5}
          />
        ))}
        {clusters.map((cl, i) => (
          <G key={i}>
            <Pin x={cl.x} y={cl.y} scale={3.6} />
            <Circle
              cx={cl.x + 36}
              cy={cl.y - 98}
              r={28}
              fill={c.primary}
              stroke="#FFFFFF"
              strokeWidth={4}
            />
            <SvgText
              fontFamily="Urbanist_700Bold"
              x={cl.x + 36}
              y={cl.y - 87}
              fontSize={32}
              fontWeight="800"
              fill={c.onPrimary}
              textAnchor="middle"
            >
              {String(cl.n)}
            </SvgText>
          </G>
        ))}
      </Svg>
    </View>
  );
}

/**
 * City close-up: pins at their true relative positions inside the bounding box of the roasters.
 * No street data is drawn (we don't ship third-party map tiles) — only a light grid and district labels.
 */
export function CityMap({
  roasters,
  selectedId,
  onSelect,
}: {
  roasters: CatalogRoaster[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const c = useColors();
  const rs = located(roasters);
  const W = 360;
  const H = 230;
  if (!rs.length) return null;
  const lats = rs.map((r) => r.latitude as number);
  const lons = rs.map((r) => r.longitude as number);
  const pad = 0.012;
  const minLat = Math.min(...lats) - pad;
  const maxLat = Math.max(...lats) + pad;
  const minLon = Math.min(...lons) - pad * 1.3;
  const maxLon = Math.max(...lons) + pad * 1.3;
  const xy = (lat: number, lon: number) => ({
    x: ((lon - minLon) / (maxLon - minLon)) * W,
    y: ((maxLat - lat) / (maxLat - minLat)) * (H - 20) + 30,
  });
  const districts = Array.from(
    new Set(rs.map((r) => r.district).filter((d): d is string => !!d)),
  ).map((d) => {
    const ds = rs.filter((r) => r.district === d);
    return {
      d,
      ...xy(
        ds.reduce((s, r) => s + (r.latitude as number), 0) / ds.length,
        ds.reduce((s, r) => s + (r.longitude as number), 0) / ds.length,
      ),
    };
  });
  return (
    <View style={styles.city}>
      <Svg width="100%" viewBox={`0 0 ${W} ${H + 10}`} style={{ aspectRatio: W / (H + 10) }}>
        {Array.from({ length: 7 }, (_, i) => (
          <Line
            key={`v${i}`}
            x1={(i * W) / 6}
            y1={0}
            x2={(i * W) / 6}
            y2={H + 10}
            stroke="#E7ECE8"
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: 5 }, (_, i) => (
          <Line
            key={`h${i}`}
            x1={0}
            y1={(i * (H + 10)) / 4}
            x2={W}
            y2={(i * (H + 10)) / 4}
            stroke="#E7ECE8"
            strokeWidth={1}
          />
        ))}
        {districts.map((d) => (
          <SvgText
            fontFamily="Urbanist_700Bold"
            key={d.d}
            x={d.x}
            y={d.y + 34}
            fontSize={13}
            fontWeight="700"
            fill={colors.textMuted}
            textAnchor="middle"
            opacity={0.7}
          >
            {d.d.toLocaleUpperCase('tr')}
          </SvgText>
        ))}
        {rs.map((r) => {
          const p = xy(r.latitude as number, r.longitude as number);
          const on = r.id === selectedId;
          return (
            <G key={r.id} onPress={() => onSelect(r.id)}>
              {on ? <Circle cx={p.x} cy={p.y - 22} r={22} fill={c.primary} opacity={0.18} /> : null}
              <Pin x={p.x} y={p.y} scale={on ? 1.35 : 1} />
            </G>
          );
        })}
      </Svg>
      <View style={styles.legend} pointerEvents="none">
        <Text variant="caption">ESKİŞEHİR · {rs.length} KAVURUCU</Text>
      </View>
      {/* accessible list of pins for screen readers */}
      <View style={styles.srOnly}>
        {rs.map((r) => (
          <Pressable
            key={r.id}
            accessibilityRole="button"
            accessibilityLabel={`${r.name}, ${r.district ?? ''}`}
            onPress={() => onSelect(r.id)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  city: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F4F7F5',
    borderWidth: 1,
    borderColor: colors.border,
  },
  legend: { position: 'absolute', left: 12, top: 10 },
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
});

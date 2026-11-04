import { Image, StyleSheet, View } from 'react-native';
import { Text } from './Text';

// earthy, coffee-shop colours for roasters without a logo or brand colour
const FALLBACK = ['#5C3A21', '#2F4A3A', '#9A4A2C', '#3E4C5E', '#7A5A2E', '#4A2C3A'];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toLocaleUpperCase('tr'))
    .join('');
}

/** Roaster "profile picture": the uploaded logo, or initials on the brand colour. */
export function RoasterAvatar({
  name,
  logoUrl,
  color,
  size = 48,
}: {
  name: string;
  logoUrl?: string | null;
  color?: string | null;
  size?: number;
}) {
  const bg = color ?? FALLBACK[name.length % FALLBACK.length] ?? '#5C3A21';
  const r = Math.round(size * 0.26);
  if (logoUrl) {
    return (
      <Image
        source={{ uri: logoUrl }}
        style={{ width: size, height: size, borderRadius: r }}
        accessibilityIgnoresInvertColors
        accessibilityLabel={`${name} logosu`}
      />
    );
  }
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: r,
          backgroundColor: bg,
        },
      ]}
      accessibilityElementsHidden
    >
      <Text
        style={{
          color: '#FFFFFF',
          fontFamily: 'Urbanist_700Bold',
          fontSize: size * 0.34,
          letterSpacing: 0.5,
        }}
      >
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({ circle: { alignItems: 'center', justifyContent: 'center' } });

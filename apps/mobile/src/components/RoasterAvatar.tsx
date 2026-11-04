import { Image, StyleSheet, View } from 'react-native';
import { Text } from './Text';

const FALLBACK = ['#12874A', '#1769AA', '#B5452B', '#7A4B2A', '#8A2BE2', '#C27C0E'];

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
  const bg = color ?? FALLBACK[name.length % FALLBACK.length] ?? '#12874A';
  const r = size / 2;
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
          borderWidth: size >= 48 ? 3 : 0,
          borderColor: '#FFFFFF',
        },
      ]}
      accessibilityElementsHidden
    >
      <Text
        style={{
          color: '#FFFFFF',
          fontFamily: 'PlusJakartaSans_800ExtraBold',
          fontSize: size * 0.38,
        }}
      >
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({ circle: { alignItems: 'center', justifyContent: 'center' } });

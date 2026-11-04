import { useEffect, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { Text } from './Text';

type TextProps = React.ComponentProps<typeof Text>;

/**
 * Count-up when the value changes (spec §11.4). Runs ~350 ms with ease-out; instant with reduce motion.
 * JS-driven on purpose: it is a single Text node and keeps formatting (₺, Turkish separators) exact.
 */
export function AnimatedNumber({
  value,
  format,
  ...rest
}: { value: number; format: (n: number) => string } & Omit<TextProps, 'children'>) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (reduce || shown === value) {
      setShown(value);
      return;
    }
    const from = shown;
    const start = Date.now();
    const dur = 350;
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce]);
  return (
    <Text accessibilityLabel={format(value)} {...rest}>
      {format(shown)}
    </Text>
  );
}

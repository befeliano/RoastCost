import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '@/theme';

/** Our own minimal line icons (spec K13: no third-party icon assets). 24×24 grid, 1.8 stroke. */
export type IconName =
  | 'cup'
  | 'book'
  | 'bean'
  | 'box'
  | 'gear'
  | 'back'
  | 'chevron'
  | 'plus'
  | 'minus'
  | 'trash'
  | 'copy'
  | 'send'
  | 'check'
  | 'close'
  | 'chart'
  | 'store'
  | 'list'
  | 'clock'
  | 'warning'
  | 'refresh'
  | 'history';

export function Icon({
  name,
  size = 24,
  color = colors.text,
  strokeWidth = 1.8,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const p = {
    stroke: color,
    strokeWidth,
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {name === 'cup' && (
        <>
          <Path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z" {...p} />
          <Path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16" {...p} />
          <Path d="M8 3c0 1.5 1.5 1.5 1.5 3M12 3c0 1.5 1.5 1.5 1.5 3" {...p} />
        </>
      )}
      {name === 'book' && (
        <>
          <Path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" {...p} />
          <Path d="M5 17a3 3 0 0 1 3-3h10M9 8h5" {...p} />
        </>
      )}
      {name === 'bean' && (
        <>
          <Path d="M12 3c4.5 0 7 3.5 7 8.5S16 21 12 21s-7-4.5-7-9.5S7.5 3 12 3Z" {...p} />
          <Path d="M12 4c-2 3 2 5 0 8s2 5 0 8" {...p} />
        </>
      )}
      {name === 'box' && (
        <>
          <Path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z" {...p} />
          <Path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" {...p} />
        </>
      )}
      {name === 'gear' && (
        <>
          <Circle cx="12" cy="12" r="3" {...p} />
          <Path
            d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4 5.3 5.3"
            {...p}
          />
        </>
      )}
      {name === 'back' && <Path d="M15 5l-7 7 7 7" {...p} />}
      {name === 'chevron' && <Path d="M9 5l7 7-7 7" {...p} />}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...p} />}
      {name === 'minus' && <Path d="M5 12h14" {...p} />}
      {name === 'close' && <Path d="M6 6l12 12M18 6 6 18" {...p} />}
      {name === 'check' && <Path d="M5 12.5 10 17.5 19 7" {...p} />}
      {name === 'trash' && (
        <>
          <Path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13" {...p} />
          <Path d="M10 11v6M14 11v6" {...p} />
        </>
      )}
      {name === 'copy' && (
        <>
          <Rect x="8" y="8" width="12" height="12" rx="2.5" {...p} />
          <Path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" {...p} />
        </>
      )}
      {name === 'send' && <Path d="M4 12 20 4l-5 16-3.5-6.5L4 12Zm7.5 1.5L20 4" {...p} />}
      {name === 'chart' && <Path d="M4 20h16M7 16v-5M12 16V7M17 16v-8" {...p} />}
      {name === 'store' && (
        <>
          <Path
            d="M4 9.5 5.5 4h13L20 9.5a2.7 2.7 0 0 1-5.3.5 2.7 2.7 0 0 1-5.4 0A2.7 2.7 0 0 1 4 9.5Z"
            {...p}
          />
          <Path d="M5.5 11.5V20h13v-8.5M10 20v-5h4v5" {...p} />
        </>
      )}
      {name === 'list' && (
        <Path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" {...p} />
      )}
      {name === 'clock' && (
        <>
          <Circle cx="12" cy="12" r="8.5" {...p} />
          <Path d="M12 7.5V12l3 2" {...p} />
        </>
      )}
      {name === 'warning' && (
        <>
          <Path d="M12 3.5 21 19.5H3L12 3.5Z" {...p} />
          <Path d="M12 10v4.5M12 17h.01" {...p} />
        </>
      )}
      {name === 'refresh' && <Path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4" {...p} />}
      {name === 'history' && (
        <>
          <Path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4" {...p} />
          <Path d="M12 8v4l2.5 1.5" {...p} />
        </>
      )}
    </Svg>
  );
}

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
  | 'history'
  | 'search'
  | 'phone'
  | 'chat'
  | 'pin'
  | 'eye'
  | 'eyeOff'
  | 'share'
  | 'sort'
  | 'mail'
  | 'calc'
  | 'repeat'
  | 'spark';

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
      {name === 'search' && (
        <>
          <Circle cx="11" cy="11" r="6.5" {...p} />
          <Path d="m16 16 4 4" {...p} />
        </>
      )}
      {name === 'phone' && (
        <Path
          d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2Z"
          {...p}
        />
      )}
      {name === 'chat' && (
        <Path
          d="M12 4a8 8 0 0 0-6.9 12L4 20l4.1-1.1A8 8 0 1 0 12 4Z M9 10.5c.5 2 2 3.5 4.5 4.5"
          {...p}
        />
      )}
      {name === 'pin' && (
        <>
          <Path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z" {...p} />
          <Circle cx="12" cy="10" r="2.3" {...p} />
        </>
      )}
      {name === 'eye' && (
        <>
          <Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" {...p} />
          <Circle cx="12" cy="12" r="3" {...p} />
        </>
      )}
      {name === 'eyeOff' && (
        <>
          <Path
            d="M4 4l16 16M10 6a9.6 9.6 0 0 1 2-.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.6 7.6C4 9.4 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1"
            {...p}
          />
          <Path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" {...p} />
        </>
      )}
      {name === 'share' && (
        <>
          <Path d="M12 3.5v11M8 7.5l4-4 4 4" {...p} />
          <Path d="M6 11v8.5h12V11" {...p} />
        </>
      )}
      {name === 'sort' && <Path d="M7 4v16M4 17l3 3 3-3M17 20V4M14 7l3-3 3 3" {...p} />}
      {name === 'mail' && (
        <>
          <Rect x="3.5" y="5.5" width="17" height="13" rx="2.5" {...p} />
          <Path d="m4 7 8 6 8-6" {...p} />
        </>
      )}
      {name === 'calc' && (
        <>
          <Rect x="5" y="3" width="14" height="18" rx="2.5" {...p} />
          <Path
            d="M8 7.5h8M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"
            {...p}
          />
        </>
      )}
      {name === 'repeat' && (
        <Path d="M4 11V9a3 3 0 0 1 3-3h12l-3-3M20 13v2a3 3 0 0 1-3 3H5l3 3" {...p} />
      )}
      {name === 'spark' && (
        <Path
          d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"
          {...p}
        />
      )}
    </Svg>
  );
}

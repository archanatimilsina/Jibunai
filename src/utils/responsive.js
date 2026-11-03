/**
 * Adaptive layout helpers — one place for "works on any phone" rules.
 *
 * Screens already use useWindowDimensions ad hoc; new code should use these so
 * breakpoints stay consistent. Nothing here depends on connectivity or auth.
 */
import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

export const BREAKPOINTS = {
  narrow: 380, // small phones
  medium: 600, // large phones / small tablets
  wide: 900, // tablets / desktop
};

export function columnsForWidth(width, { minCard = 160, maxColumns = 4 } = {}) {
  return Math.max(1, Math.min(maxColumns, Math.floor(width / minCard)));
}

export function padForWidth(width) {
  if (width >= BREAKPOINTS.wide) return 32;
  if (width >= BREAKPOINTS.medium) return 24;
  return 16;
}

export function useAdaptive({ minCard = 160, maxColumns = 4 } = {}) {
  const { width, height } = useWindowDimensions();
  return useMemo(
    () => ({
      width,
      height,
      isNarrow: width < BREAKPOINTS.narrow,
      isPhone: width < BREAKPOINTS.medium,
      isTablet: width >= BREAKPOINTS.medium && width < BREAKPOINTS.wide,
      isWide: width >= BREAKPOINTS.wide,
      columns: columnsForWidth(width, { minCard, maxColumns }),
      pad: padForWidth(width),
      orientation: width >= height ? 'landscape' : 'portrait',
    }),
    [width, height, minCard, maxColumns],
  );
}

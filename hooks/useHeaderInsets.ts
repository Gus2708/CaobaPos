import { Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { verticalScale } from '../lib/responsive';

/** Height of the header bar content, without the top inset. */
export const HEADER_BAR_HEIGHT = verticalScale(50);

/**
 * Breathing room kept above the header when the platform reports no top inset.
 * The iOS PWA runs with a solid status bar, so the web view starts right below it
 * and reports an inset of 0, which glued the logo and the BCV pill to the status bar.
 */
export const MIN_HEADER_TOP_INSET = verticalScale(12);

/** Top padding for the header: the safe area, the Android status bar, or the minimum gap. */
export function resolveHeaderTopInset(
  safeAreaTop: number,
  platform: string = Platform.OS,
  androidStatusBarHeight: number = StatusBar.currentHeight || 0,
): number {
  const statusBar = platform === 'android' ? androidStatusBarHeight : 0;
  return Math.max(safeAreaTop, statusBar, MIN_HEADER_TOP_INSET);
}

export function useHeaderTopInset(): number {
  const insets = useSafeAreaInsets();
  return resolveHeaderTopInset(insets.top);
}

/** Total header height; screens offset their content below it. */
export function useHeaderHeight(): number {
  return HEADER_BAR_HEIGHT + useHeaderTopInset();
}

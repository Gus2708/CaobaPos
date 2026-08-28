import { useWindowDimensions, Platform } from 'react-native';

export const MAX_WEB_CONTAINER_WIDTH = 480;

/**
 * Pure helper to compute responsive width taking Web mobile container constraints into account.
 */
export function calculateDeviceWidth(
  winWidth: number,
  platform: string = Platform.OS,
  maxWebWidth: number = MAX_WEB_CONTAINER_WIDTH
): number {
  return platform === 'web' ? Math.min(winWidth, maxWebWidth) : winWidth;
}

/**
 * Custom hook to safely get viewport dimensions.
 * Solves the Web/PWA sparkline clipping bug by capping width at 480px on Web.
 */
export function useDeviceSize() {
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const width = calculateDeviceWidth(winWidth, Platform.OS);
  const height = winHeight;
  const isMobile = width < 768;

  return {
    width,
    height,
    isWeb,
    isMobile,
    rawWidth: winWidth,
    rawHeight: winHeight,
  };
}

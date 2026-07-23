import { Dimensions, Platform, PixelRatio } from 'react-native';

// Guideline sizes are based on standard ~5" screen mobile device
// iPhone X / Standard Android resolution
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

/**
 * Safely fetches current window dimensions dynamically.
 * On Android, during app startup, splash screen, or layout transitions,
 * initial dimensions may report 0 or uninitialized values. We fallback to
 * baseline 375x812 if dimensions are invalid to prevent microscopic text scaling.
 */
const getWindowDimensions = () => {
  const window = Dimensions.get('window');
  const width = window && window.width > 0 ? window.width : guidelineBaseWidth;
  const height = window && window.height > 0 ? window.height : guidelineBaseHeight;
  return { width, height };
};

const getScreenWidth = () => getWindowDimensions().width;
const getScreenHeight = () => getWindowDimensions().height;

/**
 * Scales size based on screen width.
 * Best for margins, paddings, widths.
 */
const scale = (size: number) => {
  const width = getScreenWidth();
  const maxScaleFactor = Platform.OS === 'web' || width > 480 ? 1.12 : 1.35;
  const factor = Math.min(width / guidelineBaseWidth, maxScaleFactor);
  return factor * size;
};

/**
 * Scales size based on screen height.
 * Best for heights.
 */
const verticalScale = (size: number) => {
  const height = getScreenHeight();
  const width = getScreenWidth();
  const maxScaleFactor = Platform.OS === 'web' || width > 480 ? 1.12 : 1.35;
  const factor = Math.min(height / guidelineBaseHeight, maxScaleFactor);
  return factor * size;
};

/**
 * Scales size with a factor to avoid excessive scaling on large screens.
 * Especially useful for font sizes and icons.
 */
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

/**
 * Device helpers
 */
const isTablet = getScreenWidth() >= 768;
const isWeb = Platform.OS === 'web';

const SCREEN_WIDTH = getScreenWidth();
const SCREEN_HEIGHT = getScreenHeight();

export {
  scale,
  verticalScale,
  moderateScale,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  getScreenWidth,
  getScreenHeight,
  isTablet,
  isWeb
};

import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Guideline sizes are based on standard ~5" screen mobile device
// iPhone X / Standard Android resolution
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

/**
 * Scales size based on screen width.
 * Best for margins, paddings, widths.
 */
const scale = (size: number) => (SCREEN_WIDTH / guidelineBaseWidth) * size;

/**
 * Scales size based on screen height.
 * Best for heights.
 */
const verticalScale = (size: number) => (SCREEN_HEIGHT / guidelineBaseHeight) * size;

/**
 * Scales size with a factor to avoid excessive scaling on large screens.
 * Especially useful for font sizes and icons.
 */
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

/**
 * Device helpers
 */
const isTablet = SCREEN_WIDTH >= 768;
const isWeb = Platform.OS === 'web';

export {
  scale,
  verticalScale,
  moderateScale,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  isTablet,
  isWeb
};

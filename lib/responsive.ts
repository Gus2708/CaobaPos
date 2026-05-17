import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Guideline sizes are based on standard ~5" screen mobile device
// iPhone X / Standard Android resolution
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

// Cap the scale factor on web and larger screens (like tablets and desktops)
// to prevent massive, distorted text and elements on desktop and tablets.
const maxScaleFactor = Platform.OS === 'web' || SCREEN_WIDTH > 480 ? 1.12 : 1.35;

/**
 * Scales size based on screen width.
 * Best for margins, paddings, widths.
 */
const scale = (size: number) => {
  const factor = Math.min(SCREEN_WIDTH / guidelineBaseWidth, maxScaleFactor);
  return factor * size;
};

/**
 * Scales size based on screen height.
 * Best for heights.
 */
const verticalScale = (size: number) => {
  const factor = Math.min(SCREEN_HEIGHT / guidelineBaseHeight, maxScaleFactor);
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

import { Animated, Easing } from 'react-native';

// ── Shared animated values ──────────────────────────────────────
export const globalScrollY = new Animated.Value(0);
export const headerTranslateY = new Animated.Value(0);

// ── Internal state for direction detection ──────────────────────
let _lastY = 0;
let _hidden = false;
let _navHeight = 0;
let _listenerId: string | null = null;

/**
 * Called once from MainApp to set the total nav height and start listening.
 */
export function initScrollHideAnimation(totalNavHeight: number) {
  _navHeight = totalNavHeight;

  // Remove previous listener if any
  if (_listenerId) {
    globalScrollY.removeListener(_listenerId);
  }

  _listenerId = globalScrollY.addListener(({ value }) => {
    const diff = value - _lastY;

    // Ignore noise (< 3px)
    if (Math.abs(diff) < 3) return;

    if (value <= 5 && _hidden) {
      // Near top → always show
      _hidden = false;
      Animated.timing(headerTranslateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (diff > 6 && !_hidden && value > 30) {
      // Scrolling down past threshold → hide
      _hidden = true;
      Animated.timing(headerTranslateY, {
        toValue: -_navHeight,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (diff < -6 && _hidden) {
      // Scrolling up → show
      _hidden = false;
      Animated.timing(headerTranslateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }

    _lastY = value;
  });
}

/**
 * Called on tab switch to reset animation state cleanly.
 */
export function resetScrollState() {
  _lastY = 0;
  _hidden = false;
  globalScrollY.setValue(0);
  headerTranslateY.setValue(0);
}

/**
 * Cleanup listener (call on unmount).
 */
export function cleanupScrollListener() {
  if (_listenerId) {
    globalScrollY.removeListener(_listenerId);
    _listenerId = null;
  }
}

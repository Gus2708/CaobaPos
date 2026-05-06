import { Animated, Easing } from 'react-native';

// ── Shared animated values ──────────────────────────────────────
export const globalScrollY = new Animated.Value(0);
export const headerTranslateY = new Animated.Value(0);

// ── Internal state for direction detection ──────────────────────
let _lastY = 0;
let _hidden = false;
let _navHeight = 0;
let _listenerId: string | null = null;

/** Spring config for snappy header reveal */
const REVEAL_SPRING = { tension: 140, friction: 14, useNativeDriver: true } as const;

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

    // Ignore noise (< 2px)
    if (Math.abs(diff) < 2) return;

    if (value <= 8 && _hidden) {
      // Near top → always show with spring
      _hidden = false;
      Animated.spring(headerTranslateY, {
        toValue: 0,
        ...REVEAL_SPRING,
      }).start();
    } else if (diff > 5 && !_hidden && value > 40) {
      // Scrolling down past threshold → hide smoothly
      _hidden = true;
      Animated.timing(headerTranslateY, {
        toValue: -_navHeight,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (diff < -5 && _hidden) {
      // Scrolling up → spring reveal
      _hidden = false;
      Animated.spring(headerTranslateY, {
        toValue: 0,
        ...REVEAL_SPRING,
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

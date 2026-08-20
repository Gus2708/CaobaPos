import React, { memo, useState, useCallback, useMemo, useEffect, createContext, useContext } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  FadeInDown,
  FadeOutDown,
  useReducedMotion,
  LinearTransition,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { FontNames } from '../lib/fontNames';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale, moderateScale } from '../lib/responsive';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type']) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}

const ACCENT_COLORS = {
  success: tokens.colors.sage,
  error: tokens.colors.coral,
  warning: tokens.colors.amber,
  info: tokens.colors.mahogany,
};

const LABELS = {
  success: 'Éxito',
  error: 'Error',
  warning: 'Aviso',
  info: 'Info',
};

const SYMBOLS = {
  success: '✓',
  error: '✕',
  warning: '!',
  info: 'i',
};

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const TOAST_ENTER = FadeInDown.duration(300).easing(EASE_OUT);
const TOAST_EXIT = FadeOutDown.duration(220).easing(EASE_OUT);
const TOAST_LAYOUT = LinearTransition.duration(200).easing(EASE_OUT);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ToastItem = memo(function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: () => void;
}) {
  const accentColor = ACCENT_COLORS[toast.type];
  const progress = useSharedValue(1);
  const translateX = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // 3.2s linear progress bar running on UI thread
    progress.set(withTiming(0, { duration: 3200, easing: Easing.linear }));

    const timeout = setTimeout(() => {
      onRemove();
    }, 3200);

    return () => clearTimeout(timeout);
  }, [onRemove]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .onUpdate((e) => {
          'worklet';
          translateX.set(e.translationX);
        })
        .onEnd((e) => {
          'worklet';
          if (Math.abs(e.translationX) > 80 || Math.abs(e.velocityX) > 400) {
            translateX.set(
              withTiming(
                e.translationX > 0 ? SCREEN_WIDTH : -SCREEN_WIDTH,
                { duration: 200, easing: EASE_OUT },
                (finished) => {
                  if (finished) scheduleOnRN(onRemove);
                }
              )
            );
          } else {
            translateX.set(withSpring(0, { duration: 250, dampingRatio: 1 }));
          }
        }),
    [onRemove]
  );

  const progressStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.get() }],
  }));

  const dismissStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.get() }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        entering={reducedMotion ? undefined : TOAST_ENTER}
        exiting={reducedMotion ? undefined : TOAST_EXIT}
        layout={TOAST_LAYOUT}
        style={[styles.toast, dismissStyle]}
      >
        {/* Left accent bar */}
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

        {/* Icon circle */}
        <View style={[styles.iconCircle, { backgroundColor: `${accentColor}22` }]}>
          <Text style={[styles.iconText, { color: accentColor }]}>
            {SYMBOLS[toast.type]}
          </Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={[styles.label, { color: accentColor }]}>
            {LABELS[toast.type]}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {toast.message}
          </Text>
        </View>

        {/* Hardware-accelerated progress bar */}
        <View style={styles.progressBarTrack}>
          <Animated.View
            style={[
              styles.progressBar,
              { backgroundColor: accentColor },
              progressStyle,
            ]}
          />
        </View>
      </Animated.View>
    </GestureDetector>
  );
});

export const ToastProvider = memo(function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const insets = useSafeAreaInsets();

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View
        style={[
          styles.container,
          { bottom: insets.bottom + verticalScale(80) },
        ]}
        pointerEvents="box-none"
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={() => removeToast(toast.id)}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: scale(16),
    right: scale(16),
    zIndex: 9999,
    gap: verticalScale(8),
    alignItems: 'stretch',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 26, 0.97)',
    borderRadius: scale(tokens.radius.card),
    borderWidth: 1,
    borderColor: tokens.colors.border,
    overflow: 'hidden',
    minHeight: verticalScale(60),
  },
  accentBar: {
    width: scale(4),
    alignSelf: 'stretch',
  },
  iconCircle: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: scale(tokens.spacing.md),
    marginRight: scale(tokens.spacing.sm),
  },
  iconText: {
    fontSize: moderateScale(tokens.typography.md),
    fontWeight: tokens.typography.bold,
  },
  content: {
    flex: 1,
    paddingVertical: verticalScale(tokens.spacing.md),
    paddingRight: scale(tokens.spacing.md),
    gap: verticalScale(2),
  },
  label: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(tokens.typography.xs),
    fontWeight: tokens.typography.bold,
    textTransform: 'uppercase',
    letterSpacing: scale(0.8),
  },
  message: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(tokens.typography.base),
    fontWeight: tokens.typography.medium,
    color: tokens.colors.text,
    lineHeight: verticalScale(20),
  },
  progressBarTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: verticalScale(2),
    overflow: 'hidden',
  },
  progressBar: {
    width: '100%',
    height: '100%',
    transformOrigin: 'left',
  },
});



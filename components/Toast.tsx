import React, { memo, useState, useCallback, useMemo, useEffect, useRef, createContext, useContext } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
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

const ToastItem = memo(function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;

  const accentColor = ACCENT_COLORS[toast.type];

  useEffect(() => {
    // Enter animation with fluid spring curve
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: tokens.animation.fast,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 180,
        friction: 14,
      }),
    ]).start();

    // Progress bar shrink (0-1)
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 3200,
      useNativeDriver: false,
    }).start();

    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: tokens.animation.fast,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 16,
          duration: tokens.animation.fast,
          useNativeDriver: true,
        }),
      ]).start(onRemove);
    }, 3200);

    return () => clearTimeout(timeout);
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.toast,
        { opacity, transform: [{ translateY }] },
      ]}
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

      {/* Progress bar anchored left */}
      <Animated.View
        style={[
          styles.progressBar,
          { backgroundColor: accentColor, width: progressWidth },
        ]}
      />
    </Animated.View>
  );
});

export const ToastProvider = memo(function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);

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
      <View style={styles.container} pointerEvents="none">
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
    bottom: verticalScale(100),
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
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: verticalScale(2),
  },
});


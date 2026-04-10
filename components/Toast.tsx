import React, { useEffect, useState, createContext, useContext, useCallback, memo, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { FontNames } from '../lib/fontNames';
import { tokens } from '../lib/designTokens';

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
  const translateY = useRef(new Animated.Value(20)).current;
  const scaleX = useRef(new Animated.Value(1)).current;

  const accentColor = ACCENT_COLORS[toast.type];

  useEffect(() => {
    // Enter animation
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: tokens.animation.normal,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        ...tokens.animation.spring,
      }),
    ]).start();

    // Progress bar shrink
    Animated.timing(scaleX, {
      toValue: 0,
      duration: 3200,
      useNativeDriver: true,
    }).start();

    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: tokens.animation.normal,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 20,
          duration: tokens.animation.normal,
          useNativeDriver: true,
        }),
      ]).start(onRemove);
    }, 3200);

    return () => clearTimeout(timeout);
  }, []);

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

      {/* Progress bar */}
      <Animated.View
        style={[
          styles.progressBar,
          { backgroundColor: accentColor, transform: [{ scaleX }] },
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
    bottom: 100,
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
    alignItems: 'stretch',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 26, 0.97)',
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    overflow: 'hidden',
    minHeight: 60,
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: tokens.spacing.md,
    marginRight: tokens.spacing.sm,
  },
  iconText: {
    fontSize: tokens.typography.md,
    fontWeight: tokens.typography.bold,
  },
  content: {
    flex: 1,
    paddingVertical: tokens.spacing.md,
    paddingRight: tokens.spacing.md,
    gap: 2,
  },
  label: {
    fontFamily: FontNames.instrumentSans,
    fontSize: tokens.typography.xs,
    fontWeight: tokens.typography.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  message: {
    fontFamily: FontNames.instrumentSans,
    fontSize: tokens.typography.base,
    fontWeight: tokens.typography.medium,
    color: tokens.colors.text,
    lineHeight: 20,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    transformOrigin: 'left',
  },
});

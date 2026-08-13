import React, { memo } from 'react';
import { TouchableOpacity, StyleSheet, Alert, View, Animated } from 'react-native';
import { Text } from './Text';
import { FontNames } from '../lib/fontNames';
import { Icon } from './Icon';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale, moderateScale } from '../lib/responsive';
import { usePressAnimation } from '../hooks/usePressAnimation';

interface QuickActionsProps {
  onClear: () => void;
  hasItems: boolean;
  compact?: boolean;
}

export const QuickActions = memo(function QuickActions({ onClear, hasItems, compact }: QuickActionsProps) {
  const { scale: pressScale, onPressIn, onPressOut } = usePressAnimation({ scaleTo: 0.94 });

  const handleClear = () => {
    Alert.alert(
      'Limpiar Carrito',
      '¿Vaciar todos los productos del carrito?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Limpiar', style: 'destructive', onPress: onClear },
      ]
    );
  };

  if (compact) {
    return (
      <Animated.View style={{ transform: [{ scale: pressScale }] }}>
        <TouchableOpacity
          style={[styles.buttonCompact, !hasItems && styles.buttonDisabled]}
          onPress={handleClear}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={!hasItems}
          activeOpacity={0.85}
        >
          <Icon
            name="trash"
            size={26}
            color={hasItems ? tokens.colors.coral : tokens.colors.textDim}
          />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: pressScale }] }}>
      <TouchableOpacity
        style={[styles.button, !hasItems && styles.buttonDisabled]}
        onPress={handleClear}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={!hasItems}
        activeOpacity={0.85}
      >
        <View style={styles.content}>
          <Icon
            name="trash"
            size={22}
            color={hasItems ? tokens.colors.coral : tokens.colors.textDim}
          />
          <Text style={[styles.buttonText, !hasItems && styles.buttonTextDisabled]}>
            Limpiar Carrito
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  button: {
    backgroundColor: tokens.colors.surface,
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    marginHorizontal: scale(16),
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.border,
    minHeight: verticalScale(46),
  },
  buttonCompact: {
    width: verticalScale(52),
    height: verticalScale(52),
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.surface,
    borderColor: tokens.colors.border,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  buttonText: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: tokens.colors.textMuted,
  },
  buttonTextDisabled: {
    color: tokens.colors.textDim,
  },
});

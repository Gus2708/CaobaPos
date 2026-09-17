import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from './Text';
import { FontNames } from '../lib/fontNames';
import { Icon } from './Icon';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale, moderateScale } from '../lib/responsive';
import { showDialog } from '../lib/dialog';
import { PressableScale } from './PressableScale';

interface QuickActionsProps {
  onClear: () => void;
  hasItems: boolean;
  compact?: boolean;
}

export const QuickActions = memo(function QuickActions({ onClear, hasItems, compact }: QuickActionsProps) {
  const confirmClear = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClear();
  };

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    showDialog(
      'Vaciar carrito',
      '¿Vaciar todos los productos del carrito?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Vaciar',
          style: 'destructive',
          onPress: confirmClear,
        },
      ]
    );
  };

  if (compact) {
    return (
      <PressableScale
        style={[styles.buttonCompact, !hasItems && styles.buttonDisabled]}
        onPress={handleClear}
        disabled={!hasItems}
        scaleTo={0.97}
        accessibilityRole="button"
        accessibilityState={{ disabled: !hasItems }}
        accessibilityLabel="Vaciar carrito"
      >
        <Icon
          name="trash"
          size={26}
          color={hasItems ? tokens.colors.coral : tokens.colors.textDim}
        />
      </PressableScale>
    );
  }

  return (
    <PressableScale
      style={[styles.button, !hasItems && styles.buttonDisabled]}
      onPress={handleClear}
      disabled={!hasItems}
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityState={{ disabled: !hasItems }}
      accessibilityLabel="Vaciar carrito"
    >
      <View style={styles.content}>
        <Icon
          name="trash"
          size={22}
          color={hasItems ? tokens.colors.coral : tokens.colors.textDim}
        />
        <Text style={[styles.buttonText, !hasItems && styles.buttonTextDisabled]}>
          Vaciar carrito
        </Text>
      </View>
    </PressableScale>
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

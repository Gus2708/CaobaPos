import React, { memo } from 'react';
import { TouchableOpacity, StyleSheet, Alert, View, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Text } from './Text';
import { LinearGradient } from 'expo-linear-gradient';
import { FontNames } from '../lib/fontNames';
import { Icon } from './Icon';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale, moderateScale } from '../lib/responsive';

interface QuickActionsProps {
  onClear: () => void;
  hasItems: boolean;
  compact?: boolean;
}

export const QuickActions = memo(function QuickActions({ onClear, hasItems, compact }: QuickActionsProps) {
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

  return (
    <TouchableOpacity
      style={[
        styles.button, 
        !hasItems && styles.buttonDisabled,
        compact && styles.buttonCompact
      ]}
      onPress={handleClear}
      disabled={!hasItems}
      activeOpacity={0.7}
    >
      {compact && Platform.OS !== 'web' && (
        <BlurView 
          intensity={25} 
          tint="dark" 
          style={StyleSheet.absoluteFill} 
        />
      )}
      <LinearGradient
        colors={compact 
          ? [tokens.colors.glass.bg, 'rgba(201, 107, 107, 0.15)']
          : hasItems 
            ? ['rgba(201, 107, 107, 0.25)', 'rgba(201, 107, 107, 0.15)'] 
            : ['rgba(201, 107, 107, 0.1)', 'rgba(201, 107, 107, 0.05)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <Icon name="trash" size={compact ? 22 : 18} color={hasItems ? tokens.colors.coral : tokens.colors.textMuted} />
        {!compact && (
          <Text style={[styles.buttonText, !hasItems && styles.buttonTextDisabled]}>
            Limpiar Carrito
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  button: {
    position: 'relative',
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(16),
    marginHorizontal: scale(16),
    marginBottom: verticalScale(8),
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201, 107, 107, 0.25)',
    overflow: 'hidden',
    minHeight: verticalScale(48),
  },
  buttonCompact: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    marginHorizontal: 0,
    marginBottom: 0,
    width: verticalScale(56),
    height: verticalScale(56),
    borderRadius: scale(16),
    backgroundColor: 'rgba(201, 107, 107, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1.5,
  },
  buttonDisabled: {
    borderColor: 'rgba(201, 107, 107, 0.1)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  buttonText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: tokens.colors.text,
  },
  buttonTextDisabled: {
    color: tokens.colors.textMuted,
  },
});

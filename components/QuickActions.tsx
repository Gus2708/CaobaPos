import React, { memo } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontNames } from '../lib/fontNames';
import { Icon } from './Icon';

interface QuickActionsProps {
  onClear: () => void;
  hasItems: boolean;
}

export const QuickActions = memo(function QuickActions({ onClear, hasItems }: QuickActionsProps) {
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
      style={[styles.button, !hasItems && styles.buttonDisabled]}
      onPress={handleClear}
      disabled={!hasItems}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={hasItems 
          ? ['rgba(201, 107, 107, 0.25)', 'rgba(201, 107, 107, 0.15)'] 
          : ['rgba(201, 107, 107, 0.1)', 'rgba(201, 107, 107, 0.05)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <Icon name="trash" size={18} color={hasItems ? '#C96B6B' : '#666'} />
        <Text style={[styles.buttonText, !hasItems && styles.buttonTextDisabled]}>
          Limpiar Carrito
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  button: {
    position: 'relative',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201, 107, 107, 0.3)',
    overflow: 'hidden',
    minHeight: 48,
  },
  buttonDisabled: {
    borderColor: 'rgba(201, 107, 107, 0.1)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 14,
    fontWeight: '600',
    color: '#F0F0F2',
  },
  buttonTextDisabled: {
    color: '#666',
  },
});

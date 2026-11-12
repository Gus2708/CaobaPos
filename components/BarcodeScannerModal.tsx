import React, { useState } from 'react';
import { View, StyleSheet, Modal, TextInput } from 'react-native';
import { Text } from './Text';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { tokens } from '../lib/designTokens';
import { FontNames } from '../lib/fontNames';
import { scale, verticalScale, moderateScale } from '../lib/responsive';

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onDetected: (barcode: string) => void;
}

export function BarcodeScannerModal({ visible, onClose, onDetected }: BarcodeScannerModalProps) {
  const [manualCode, setManualCode] = useState('');

  const handleSubmit = () => {
    const trimmed = manualCode.trim();
    if (!trimmed) return;
    onDetected(trimmed);
    setManualCode('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Icon name="barcode" size={20} color={tokens.colors.gold} />
              <Text style={styles.title}>Escanear Código</Text>
            </View>
            <PressableScale
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar escáner"
            >
              <Icon name="close" size={20} color={tokens.colors.text} />
            </PressableScale>
          </View>

          <Text style={styles.subtitle}>
            Usa tu lector físico o ingresa el código de barras manualmente:
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Ej. 7591234567890"
            placeholderTextColor={tokens.colors.textDim}
            value={manualCode}
            onChangeText={setManualCode}
            onSubmitEditing={handleSubmit}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
          />

          <View style={styles.actions}>
            <PressableScale
              style={[styles.btn, styles.cancelBtn]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cancelar"
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </PressableScale>
            <PressableScale
              style={[styles.btn, styles.confirmBtn]}
              onPress={handleSubmit}
              accessibilityRole="button"
              accessibilityLabel="Agregar por código"
            >
              <Text style={styles.confirmText}>Buscar / Agregar</Text>
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  card: {
    width: '100%',
    maxWidth: scale(400),
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    padding: scale(20),
    gap: verticalScale(14),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  title: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: tokens.colors.text,
  },
  closeBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: tokens.colors.glass.light,
  },
  subtitle: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(13),
    color: tokens.colors.textMuted,
  },
  input: {
    height: verticalScale(48),
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.bg,
    paddingHorizontal: scale(14),
    color: tokens.colors.text,
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(15),
  },
  actions: {
    flexDirection: 'row',
    gap: scale(10),
    marginTop: verticalScale(4),
  },
  btn: {
    flex: 1,
    height: verticalScale(46),
    borderRadius: tokens.radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: tokens.colors.glass.light,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  confirmBtn: {
    backgroundColor: tokens.colors.mahogany,
  },
  cancelText: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: tokens.colors.text,
  },
  confirmText: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(14),
    fontWeight: '800',
    color: tokens.colors.onGold,
  },
});

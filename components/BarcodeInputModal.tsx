import React, { memo, useState, useCallback, useMemo, useEffect, useRef, createContext, useContext } from 'react';
import { View, TextInput, TouchableOpacity, Modal, StyleSheet, Keyboard } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { FontNames } from '../lib/fontNames';
import { Icon } from './Icon';
import { scale, verticalScale, moderateScale } from '../lib/responsive';
import { tokens } from '../lib/designTokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BarcodeInputModalProps {
  visible: boolean;
  onClose: () => void;
  onBarcodeSubmit: (barcode: string) => void;
  title?: string;
}

export function BarcodeInputModal({ 
  visible, 
  onClose, 
  onBarcodeSubmit, 
  title = 'Escanear Código' 
}: BarcodeInputModalProps) {
  const [barcode, setBarcode] = useState('');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      setBarcode('');
    }
  }, [visible]);

  const handleSubmit = useCallback(() => {
    if (barcode.trim()) {
      onBarcodeSubmit(barcode.trim());
      setBarcode('');
      onClose();
    }
  }, [barcode, onBarcodeSubmit, onClose]);

  useEffect(() => {
    if (barcode.endsWith('\n') || barcode.endsWith('\r')) {
      handleSubmit();
    }
  }, [barcode, handleSubmit]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={styles.modal}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.colors.surface }]} />
          <TouchableOpacity activeOpacity={1}>
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Icon name="close" size={26} color={tokens.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Codigo de barras:</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={barcode}
                onChangeText={setBarcode}
                placeholder="Escanea o escribe..."
                placeholderTextColor={tokens.colors.textDim}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                autoFocus
              />
            </View>

            <Text style={styles.hint}>
              Usa el lector Bluetooth o escribe manualmente
            </Text>

            <TouchableOpacity 
              style={[styles.submitBtn, !barcode.trim() && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!barcode.trim()}
            >
              <Text style={styles.submitBtnText}>Aceptar</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(5, 5, 7, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  modal: {
    backgroundColor: tokens.colors.bg,
    borderRadius: tokens.radius.xl,
    padding: scale(24),
    width: '100%',
    maxWidth: scale(380),
    borderWidth: 1.5,
    borderColor: tokens.colors.borderAccent,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  title: {
    color: tokens.colors.text,
    fontSize: moderateScale(18),
    fontWeight: '700',
  },
  closeBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: tokens.colors.bg,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    color: tokens.colors.text,
    fontSize: moderateScale(14),
    fontWeight: '600',
    marginBottom: verticalScale(10),
  },
  inputContainer: {
    backgroundColor: tokens.colors.bg,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    marginBottom: verticalScale(10),
  },
  input: {
    color: tokens.colors.text,
    fontSize: moderateScale(16),
    fontFamily: FontNames.jetBrainsMono,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(14),
  },
  hint: {
    color: tokens.colors.textMuted,
    fontSize: moderateScale(12),
    marginBottom: verticalScale(20),
  },
  submitBtn: {
    backgroundColor: tokens.colors.mahogany,
    borderRadius: tokens.radius.pill,
    paddingVertical: verticalScale(16),
    alignItems: 'center',
    marginTop: verticalScale(10),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: tokens.colors.mahogany,
  },
  submitBtnDisabled: {
    backgroundColor: tokens.colors.mahoganyDim,
    borderColor: tokens.colors.borderLight,
  },
  submitBtnText: {
    color: tokens.colors.text,
    fontSize: moderateScale(16),
    fontWeight: '800',
    fontFamily: FontNames.parkinsans,
  },
});


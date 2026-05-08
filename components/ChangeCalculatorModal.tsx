import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator
} from 'react-native';
import { Text } from './Text';
import { LinearGradient } from 'expo-linear-gradient';
import { FontNames } from '../lib/fontNames';
import { Icon } from './Icon';
import { tokens } from '../lib/designTokens';
import { PriceDisplay } from './PriceDisplay';
import { scale, verticalScale, moderateScale } from '../lib/responsive';

interface ChangeCalculatorModalProps {
  visible: boolean;
  total: number;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function ChangeCalculatorModal({
  visible,
  total,
  onClose,
  onConfirm,
  loading = false,
}: ChangeCalculatorModalProps) {
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const inputRef = useRef<TextInput>(null);

  // Auto-focus input when visible
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    } else {
      setReceivedAmount('');
    }
  }, [visible]);

  const received = parseFloat(receivedAmount) || 0;
  const change = Math.max(0, received - total);
  const isInsufficient = received < total && receivedAmount.length > 0;

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade" 
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <View style={styles.modal}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.colors.surface }]} />
              <View style={styles.header}>
                <View style={styles.iconCircle}>
                  <Icon name="calculator" size={22} color={tokens.colors.mahogany} />
                </View>
                <Text style={styles.headerTitle}>Calculadora de Cambio</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Icon name="close" size={18} color={tokens.colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.content}>
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Total a pagar</Text>
                  <PriceDisplay amount={total} size="xl" style={styles.totalPrice} />
                </View>

                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>¿Cuánto pagaron?</Text>
                  <View style={[
                    styles.inputContainer,
                    isInsufficient && styles.inputContainerError
                  ]}>
                    <Text style={styles.currencyPrefix}>$</Text>
                    <TextInput
                      ref={inputRef}
                      style={styles.input}
                      placeholder="0.00"
                      placeholderTextColor={tokens.colors.textDim}
                      keyboardType="numeric"
                      value={receivedAmount}
                      onChangeText={setReceivedAmount}
                      selectionColor={tokens.colors.mahogany}
                    />
                  </View>
                  <View style={styles.errorSpace}>
                    {isInsufficient && (
                      <Text style={styles.errorText}>Monto insuficiente</Text>
                    )}
                  </View>
                </View>

                <View style={[styles.changeSection, { marginBottom: 10 }]}>
                  <Text style={styles.changeLabel}>Su cambio es:</Text>
                  <View style={[
                    styles.changeContainer,
                    received >= total && total > 0 && styles.changeContainerActive
                  ]}>
                    <PriceDisplay 
                      amount={change} 
                      size="xl" 
                      style={[
                        styles.changeValue,
                        received >= total && total > 0 && { color: tokens.colors.sage }
                      ]} 
                    />
                  </View>
                </View>
              </View>

              <View style={styles.footer}>
                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    (received < total || received === 0 || loading) && styles.confirmButtonDisabled
                  ]}
                  onPress={onConfirm}
                  disabled={received < total || received === 0 || loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(10) }}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.confirmText}>Procesando...</Text>
                    </View>
                  ) : (
                    <Text style={styles.confirmText}>Completar Venta</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    width: '90%',
    maxWidth: scale(400),
    borderRadius: tokens.radius.modal,
    backgroundColor: tokens.colors.bg,
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(20),
    backgroundColor: tokens.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.borderLight,
  },
  iconCircle: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: tokens.colors.mahoganyDim,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(14),
  },
  headerTitle: {
    flex: 1,
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(17),
    fontWeight: '700',
    color: tokens.colors.text,
  },
  closeButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: scale(24),
    gap: verticalScale(20),
  },
  infoCard: {
    padding: scale(16),
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.bg,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    alignItems: 'center',
  },
  infoLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: tokens.colors.textMuted,
    marginBottom: verticalScale(4),
    textTransform: 'uppercase',
    letterSpacing: scale(1),
  },
  totalPrice: {
    fontSize: moderateScale(36),
    color: tokens.colors.text,
  },
  inputSection: {
    gap: verticalScale(10),
  },
  inputLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: tokens.colors.textSecondary,
    marginLeft: scale(4),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.bg,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
    paddingHorizontal: scale(20),
    height: verticalScale(64),
  },
  inputContainerError: {
    borderColor: tokens.colors.coral,
    backgroundColor: tokens.colors.coralDim,
  },
  currencyPrefix: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(24),
    fontWeight: '700',
    color: tokens.colors.mahogany,
    marginRight: scale(8),
  },
  input: {
    flex: 1,
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(28),
    fontWeight: '700',
    color: tokens.colors.text,
    padding: 0,
  },
  errorSpace: {
    height: verticalScale(16),
  },
  errorText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(12),
    color: tokens.colors.coral,
    marginLeft: scale(4),
  },
  changeSection: {
    alignItems: 'center',
    gap: verticalScale(12),
  },
  changeLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    color: tokens.colors.textMuted,
  },
  changeContainer: {
    width: '100%',
    paddingVertical: verticalScale(16),
    alignItems: 'center',
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.bg,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  changeContainerActive: {
    backgroundColor: tokens.colors.sageDim,
    borderColor: tokens.colors.sage,
  },
  changeValue: {
    fontSize: moderateScale(48),
    color: tokens.colors.textMuted,
  },
  footer: {
    padding: scale(24),
    paddingTop: 0,
  },
  confirmButton: {
    height: verticalScale(58),
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.mahogany,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  confirmText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: scale(0.5),
  },
});

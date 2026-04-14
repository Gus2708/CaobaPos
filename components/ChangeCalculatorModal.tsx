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
  Keyboard
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
}

export function ChangeCalculatorModal({
  visible,
  total,
  onClose,
  onConfirm,
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
              <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(184, 123, 90, 0.1)' }]}>
                  <Icon name="calculator" size={20} color="#B87B5A" />
                </View>
                <Text style={styles.headerTitle}>Calculadora de Cambio</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Icon name="close" size={20} color="#808080" />
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
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      keyboardType="numeric"
                      value={receivedAmount}
                      onChangeText={setReceivedAmount}
                      selectionColor="#B87B5A"
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
                    <LinearGradient
                      colors={received >= total && total > 0 
                        ? ['rgba(109, 184, 138, 0.15)', 'rgba(109, 184, 138, 0.05)'] 
                        : ['rgba(255, 255, 255, 0.03)', 'transparent']
                      }
                      style={StyleSheet.absoluteFill}
                    />
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
                    (received < total || received === 0) && styles.confirmButtonDisabled
                  ]}
                  onPress={onConfirm}
                  disabled={received < total || received === 0}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={received < total ? ['#333', '#222'] : ['#C48B68', '#8B5A3C']}
                    style={styles.confirmGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.confirmText}>Completar Venta</Text>
                  </LinearGradient>
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
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    backgroundColor: tokens.colors.bg,
    borderRadius: scale(24),
    width: '90%',
    maxWidth: scale(400),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(10) },
    shadowOpacity: 0.5,
    shadowRadius: scale(20),
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(20),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  iconContainer: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  headerTitle: {
    flex: 1,
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: '#F0F0F2',
  },
  closeButton: {
    padding: scale(4),
  },
  content: {
    padding: scale(24),
    gap: verticalScale(24),
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: tokens.radius.card,
    padding: scale(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  infoLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(13),
    color: '#8A8A96',
    marginBottom: verticalScale(4),
    textTransform: 'uppercase',
    letterSpacing: scale(1),
  },
  totalPrice: {
    fontSize: moderateScale(32),
    color: '#F0F0F2',
  },
  inputSection: {
    gap: verticalScale(8),
    marginTop: verticalScale(10),
  },
  inputLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#F0F0F2',
    marginLeft: scale(4),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.3)',
    paddingHorizontal: scale(16),
    height: verticalScale(64),
  },
  inputContainerError: {
    borderColor: '#C96B6B',
    backgroundColor: 'rgba(201, 107, 107, 0.05)',
  },
  currencyPrefix: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(24),
    fontWeight: '700',
    color: '#B87B5A',
    marginRight: scale(8),
  },
  input: {
    flex: 1,
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(28),
    fontWeight: '700',
    color: '#F0F0F2',
    padding: 0,
  },
  errorSpace: {
    height: verticalScale(18),
    marginTop: verticalScale(4),
  },
  errorText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(12),
    color: '#C96B6B',
    marginLeft: scale(4),
  },
  changeSection: {
    alignItems: 'center',
    gap: verticalScale(12),
  },
  changeLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    color: '#8A8A96',
  },
  changeContainer: {
    width: '100%',
    paddingVertical: verticalScale(12),
    alignItems: 'center',
    borderRadius: tokens.radius.card,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  changeContainerActive: {
    backgroundColor: 'rgba(109, 184, 138, 0.08)',
  },
  changeValue: {
    fontSize: moderateScale(42),
    color: '#8A8A96',
  },
  footer: {
    padding: scale(24),
    paddingTop: 0,
  },
  confirmButton: {
    borderRadius: scale(16),
    overflow: 'hidden',
    height: verticalScale(56),
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#F0F0F2',
    letterSpacing: scale(0.5),
  },
});

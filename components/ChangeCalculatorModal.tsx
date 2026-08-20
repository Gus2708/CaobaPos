import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { Text } from './Text';
import { FontNames } from '../lib/fontNames';
import { Icon } from './Icon';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale, moderateScale } from '../lib/responsive';
import { useExchangeRate, formatBs, usdToBs, bsToUsd } from '../hooks/useExchangeRate';

interface ChangeCalculatorModalProps {
  visible: boolean;
  total: number;
  rate?: number;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function ChangeCalculatorModal({
  visible,
  total,
  rate: propRate,
  onClose,
  onConfirm,
  loading = false,
}: ChangeCalculatorModalProps) {
  const { rate: hookRate } = useExchangeRate();
  const rate = propRate || hookRate;

  const [paymentCurrency, setPaymentCurrency] = useState<'USD' | 'VES'>('USD');
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const inputRef = useRef<TextInput>(null);

  const totalInUsd = total;
  const totalInBs = useMemo(() => usdToBs(totalInUsd, rate), [totalInUsd, rate]);

  const targetTotal = paymentCurrency === 'USD' ? totalInUsd : totalInBs;

  // Auto-focus input when visible
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    } else {
      setReceivedAmount('');
      setPaymentCurrency('USD');
    }
  }, [visible]);

  const received = parseFloat(receivedAmount.replace(',', '.')) || 0;
  const isInsufficient = received < targetTotal && receivedAmount.length > 0;
  const isValid = received >= targetTotal && targetTotal > 0;

  const changePrimary = Math.max(0, received - targetTotal);
  const changeSecondary = useMemo(() => {
    if (paymentCurrency === 'USD') {
      return usdToBs(changePrimary, rate);
    } else {
      return bsToUsd(changePrimary, rate);
    }
  }, [paymentCurrency, changePrimary, rate]);

  const handleQuickAmount = (amt: number) => {
    setReceivedAmount(amt.toFixed(paymentCurrency === 'USD' ? 2 : 0));
  };

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade" 
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <TouchableWithoutFeedback onPress={Platform.OS === 'web' ? undefined : Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <View style={styles.modal}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.colors.surface }]} />
              
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.iconCircle}>
                  <Icon name="calculator" size={22} color={tokens.colors.mahogany} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.headerTitle}>Calculadora de Cambio</Text>
                  <Text style={styles.headerSubtitle}>Tasa BCV: {rate.toFixed(2)} Bs/$</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="close" size={18} color={tokens.colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.content}>
                {/* Currency Switcher */}
                <View style={styles.currencyToggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.currencyToggleBtn,
                      paymentCurrency === 'USD' && styles.currencyToggleBtnActive,
                    ]}
                    onPress={() => {
                      setPaymentCurrency('USD');
                      setReceivedAmount('');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.currencyToggleText,
                        paymentCurrency === 'USD' && styles.currencyToggleTextActive,
                      ]}
                    >
                      Dólares ($ USD)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.currencyToggleBtn,
                      paymentCurrency === 'VES' && styles.currencyToggleBtnActive,
                    ]}
                    onPress={() => {
                      setPaymentCurrency('VES');
                      setReceivedAmount('');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.currencyToggleText,
                        paymentCurrency === 'VES' && styles.currencyToggleTextActive,
                      ]}
                    >
                      Bolívares (Bs.)
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Total Info Card */}
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Total a pagar</Text>
                  <Text style={styles.totalPricePrimary}>
                    {paymentCurrency === 'USD' ? `$${totalInUsd.toFixed(2)}` : formatBs(totalInBs)}
                  </Text>
                  <Text style={styles.totalPriceSecondary}>
                    {paymentCurrency === 'USD' ? formatBs(totalInBs) : `$${totalInUsd.toFixed(2)} USD`}
                  </Text>
                </View>

                {/* Received Input Section */}
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>
                    {paymentCurrency === 'USD' ? '¿Cuánto entregó en Dólares ($)?' : '¿Cuánto entregó en Bolívares (Bs)?'}
                  </Text>
                  <View style={[
                    styles.inputContainer,
                    isInsufficient && styles.inputContainerError
                  ]}>
                    <Text style={styles.currencyPrefix}>
                      {paymentCurrency === 'USD' ? '$' : 'Bs.'}
                    </Text>
                    <TextInput
                      ref={inputRef}
                      style={styles.input}
                      placeholder={paymentCurrency === 'USD' ? '0.00' : '0,00'}
                      placeholderTextColor={tokens.colors.textDim}
                      keyboardType="numeric"
                      value={receivedAmount}
                      onChangeText={setReceivedAmount}
                      selectionColor={tokens.colors.mahogany}
                    />
                    {receivedAmount.length > 0 && (
                      <TouchableOpacity onPress={() => setReceivedAmount('')} style={styles.clearInputBtn}>
                        <Icon name="close" size={16} color={tokens.colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Quick Chips */}
                  <View style={styles.quickChipsRow}>
                    <TouchableOpacity
                      style={styles.quickChip}
                      onPress={() => handleQuickAmount(targetTotal)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickChipText}>Exacto</Text>
                    </TouchableOpacity>

                    {paymentCurrency === 'USD' ? (
                      [5, 10, 20, 50, 100].filter(val => val >= targetTotal).slice(0, 3).map((amt) => (
                        <TouchableOpacity
                          key={amt}
                          style={styles.quickChip}
                          onPress={() => handleQuickAmount(amt)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.quickChipText}>${amt}</Text>
                        </TouchableOpacity>
                      ))
                    ) : null}
                  </View>

                  <View style={styles.errorSpace}>
                    {isInsufficient && (
                      <Text style={styles.errorText}>Monto insuficiente para cubrir la venta</Text>
                    )}
                  </View>
                </View>

                {/* Change Result Section */}
                <View style={styles.changeSection}>
                  <Text style={styles.changeLabel}>Cambio a devolver:</Text>
                  <View style={[
                    styles.changeContainer,
                    isValid && styles.changeContainerActive
                  ]}>
                    <Text style={[
                      styles.changeValuePrimary,
                      isValid && { color: tokens.colors.sage }
                    ]}>
                      {paymentCurrency === 'USD' ? `$${changePrimary.toFixed(2)}` : formatBs(changePrimary)}
                    </Text>
                    {isValid && changePrimary > 0 && (
                      <Text style={styles.changeValueSecondary}>
                        Equivalente: {paymentCurrency === 'USD' ? formatBs(changeSecondary) : `$${changeSecondary.toFixed(2)} USD`}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    (!isValid || loading) && styles.confirmButtonDisabled
                  ]}
                  onPress={onConfirm}
                  disabled={!isValid || loading}
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    width: '92%',
    maxWidth: scale(420),
    borderRadius: tokens.radius.modal,
    backgroundColor: tokens.colors.bg,
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(18),
    backgroundColor: tokens.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.borderLight,
  },
  iconCircle: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: tokens.colors.mahoganyDim,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  headerTitle: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: tokens.colors.text,
  },
  headerSubtitle: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(11),
    fontWeight: '500',
    color: tokens.colors.textMuted,
    marginTop: verticalScale(2),
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
    padding: scale(18),
    gap: verticalScale(14),
  },
  currencyToggleContainer: {
    flexDirection: 'row',
    backgroundColor: tokens.colors.surfaceElevated,
    borderRadius: tokens.radius.pill,
    padding: scale(3),
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  currencyToggleBtn: {
    flex: 1,
    paddingVertical: verticalScale(8),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.pill,
  },
  currencyToggleBtnActive: {
    backgroundColor: tokens.colors.mahogany,
  },
  currencyToggleText: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: tokens.colors.textDim,
  },
  currencyToggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  infoCard: {
    padding: scale(12),
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    alignItems: 'center',
  },
  infoLabel: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: tokens.colors.textMuted,
    marginBottom: verticalScale(2),
    textTransform: 'uppercase',
    letterSpacing: scale(1),
  },
  totalPricePrimary: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(26),
    fontWeight: '800',
    color: tokens.colors.text,
  },
  totalPriceSecondary: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: tokens.colors.amberGold,
    marginTop: verticalScale(2),
  },
  inputSection: {
    gap: verticalScale(6),
  },
  inputLabel: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: tokens.colors.textSecondary,
    marginLeft: scale(4),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
    paddingHorizontal: scale(16),
    height: verticalScale(54),
  },
  inputContainerError: {
    borderColor: tokens.colors.coral,
    backgroundColor: tokens.colors.coralDim,
  },
  currencyPrefix: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(20),
    fontWeight: '700',
    color: tokens.colors.mahogany,
    marginRight: scale(6),
  },
  input: {
    flex: 1,
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(22),
    fontWeight: '700',
    color: tokens.colors.text,
    padding: 0,
  },
  clearInputBtn: {
    padding: scale(4),
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: scale(8),
    marginTop: verticalScale(4),
    flexWrap: 'wrap',
  },
  quickChip: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  quickChipText: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: tokens.colors.textSecondary,
  },
  errorSpace: {
    minHeight: verticalScale(14),
  },
  errorText: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(11),
    color: tokens.colors.coral,
    marginLeft: scale(4),
  },
  changeSection: {
    alignItems: 'center',
    gap: verticalScale(6),
  },
  changeLabel: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(12),
    color: tokens.colors.textMuted,
  },
  changeContainer: {
    width: '100%',
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(14),
    alignItems: 'center',
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  changeContainerActive: {
    backgroundColor: tokens.colors.sageDim,
    borderColor: tokens.colors.sage,
  },
  changeValuePrimary: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(26),
    fontWeight: '800',
    color: tokens.colors.textMuted,
  },
  changeValueSecondary: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: tokens.colors.sage,
    marginTop: verticalScale(2),
  },
  footer: {
    padding: scale(18),
    paddingTop: 0,
  },
  confirmButton: {
    height: verticalScale(52),
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
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(15),
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: scale(0.5),
  },
});

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Text } from './Text';
import { FontNames } from '../lib/fontNames';
import { Icon } from './Icon';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale, moderateScale } from '../lib/responsive';
import { useExchangeRate, useSyncBcvRate, useUpdateManualRate } from '../hooks/useExchangeRate';
import { useToast } from './Toast';

interface ExchangeRateModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ExchangeRateModal({ visible, onClose }: ExchangeRateModalProps) {
  const { rate, rateData, isLoading } = useExchangeRate();
  const syncMutation = useSyncBcvRate();
  const manualMutation = useUpdateManualRate();
  const { showToast } = useToast();

  const [isManualMode, setIsManualMode] = useState(false);
  const [manualRateInput, setManualRateInput] = useState('');

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'Reciente';
    try {
      const d = new Date(dateStr);
      return `${d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })} • ${d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return dateStr;
    }
  };

  const handleSyncNow = async () => {
    try {
      const result = await syncMutation.mutateAsync();
      showToast(`Tasa sincronizada: ${result.rate.toFixed(2)} Bs/$`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Error al sincronizar con DolarAPI', 'error');
    }
  };

  const handleSaveManual = async () => {
    const parsed = parseFloat(manualRateInput.replace(',', '.'));
    if (!parsed || isNaN(parsed) || parsed <= 0) {
      showToast('Ingresa un valor de tasa válido', 'warning');
      return;
    }

    try {
      await manualMutation.mutateAsync(parsed);
      showToast(`Tasa manual guardada: ${parsed.toFixed(2)} Bs/$`, 'success');
      setIsManualMode(false);
      setManualRateInput('');
    } catch (err: any) {
      showToast(err?.message || 'Error al guardar tasa manual', 'error');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={Platform.OS === 'web' ? undefined : Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
          >
            <View style={styles.modal}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.colors.surface }]} />

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.iconCircle}>
                  <Icon name="chart-bar" size={22} color={tokens.colors.amberGold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.headerTitle}>Tasa de Cambio Oficial</Text>
                  <Text style={styles.headerSubtitle}>Banco Central de Venezuela (BCV)</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="close" size={18} color={tokens.colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Body */}
              <View style={styles.content}>
                {/* Current Active Rate Card */}
                <View style={styles.rateCard}>
                  <View style={styles.rateHeaderRow}>
                    <Text style={styles.rateCardLabel}>TASA ACTIVA DEL DÍA</Text>
                    <View style={styles.sourceBadge}>
                      <Text style={styles.sourceBadgeText}>
                        {rateData.source === 'manual' ? 'MANUAL' : 'BCV OFICIAL'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.rateValueRow}>
                    <Text style={styles.rateNumber}>
                      {rate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </Text>
                    <Text style={styles.rateCurrency}>Bs. / USD</Text>
                  </View>

                  <View style={styles.rateFooterRow}>
                    <Icon name="clock" size={14} color={tokens.colors.textDim} />
                    <Text style={styles.rateUpdatedText}>
                      Actualizado: {formatDateTime(rateData.updated_at)}
                    </Text>
                  </View>
                </View>

                {/* Sync Action Button */}
                {!isManualMode ? (
                  <View style={styles.actionsContainer}>
                    <TouchableOpacity
                      style={styles.syncBtn}
                      onPress={handleSyncNow}
                      disabled={syncMutation.isPending || isLoading}
                      activeOpacity={0.8}
                    >
                      {syncMutation.isPending ? (
                        <View style={styles.btnRow}>
                          <ActivityIndicator size="small" color="#FFFFFF" />
                          <Text style={styles.btnText}>Sincronizando con BCV...</Text>
                        </View>
                      ) : (
                        <View style={styles.btnRow}>
                          <Icon name="sync" size={18} color="#FFFFFF" />
                          <Text style={styles.btnText}>Sincronizar Tasa BCV Ahora</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.manualModeToggleBtn}
                      onPress={() => {
                        setIsManualMode(true);
                        setManualRateInput(rate.toFixed(2));
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.manualModeToggleText}>
                        ¿Fallo en API o sin internet? Ajustar tasa manual
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Manual Contingency Input Section */
                  <View style={styles.manualSection}>
                    <Text style={styles.manualLabel}>Ingresa la tasa de contingencia (Bs/$):</Text>
                    <View style={styles.manualInputContainer}>
                      <Text style={styles.manualPrefix}>Bs.</Text>
                      <TextInput
                        style={styles.manualInput}
                        keyboardType="numeric"
                        placeholder="0.00"
                        placeholderTextColor={tokens.colors.textDim}
                        value={manualRateInput}
                        onChangeText={setManualRateInput}
                        autoFocus
                      />
                    </View>

                    <View style={styles.manualButtonsRow}>
                      <TouchableOpacity
                        style={styles.manualCancelBtn}
                        onPress={() => setIsManualMode(false)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.manualCancelText}>Cancelar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.manualSaveBtn}
                        onPress={handleSaveManual}
                        disabled={manualMutation.isPending}
                        activeOpacity={0.8}
                      >
                        {manualMutation.isPending ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.manualSaveText}>Guardar Tasa</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
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
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(12),
    color: tokens.colors.textMuted,
    marginTop: verticalScale(2),
  },
  closeBtn: {
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
    gap: verticalScale(16),
  },
  rateCard: {
    backgroundColor: tokens.colors.surfaceElevated,
    borderRadius: tokens.radius.lg,
    padding: scale(16),
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    gap: verticalScale(10),
  },
  rateHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rateCardLabel: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: tokens.colors.textDim,
    letterSpacing: scale(0.8),
  },
  sourceBadge: {
    backgroundColor: tokens.colors.mahoganyDim,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.mahogany,
  },
  sourceBadgeText: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(10),
    fontWeight: '700',
    color: tokens.colors.amberGold,
  },
  rateValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: scale(8),
    marginVertical: verticalScale(4),
  },
  rateNumber: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(32),
    fontWeight: '800',
    color: tokens.colors.text,
  },
  rateCurrency: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: tokens.colors.amberGold,
  },
  rateFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  rateUpdatedText: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(12),
    color: tokens.colors.textDim,
  },
  actionsContainer: {
    gap: verticalScale(12),
  },
  syncBtn: {
    height: verticalScale(50),
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.mahogany,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  btnText: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  manualModeToggleBtn: {
    paddingVertical: verticalScale(8),
    alignItems: 'center',
  },
  manualModeToggleText: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(12),
    color: tokens.colors.textDim,
    textDecorationLine: 'underline',
  },
  manualSection: {
    gap: verticalScale(10),
  },
  manualLabel: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: tokens.colors.textSecondary,
  },
  manualInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.surfaceElevated,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
    paddingHorizontal: scale(16),
    height: verticalScale(50),
  },
  manualPrefix: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: tokens.colors.mahogany,
    marginRight: scale(6),
  },
  manualInput: {
    flex: 1,
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: tokens.colors.text,
    padding: 0,
  },
  manualButtonsRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginTop: verticalScale(6),
  },
  manualCancelBtn: {
    flex: 1,
    height: verticalScale(46),
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualCancelText: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: tokens.colors.textMuted,
  },
  manualSaveBtn: {
    flex: 1.5,
    height: verticalScale(46),
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.mahogany,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualSaveText: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

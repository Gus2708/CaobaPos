import React from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { AppText } from './Text';
import { tokens } from '../lib/designTokens';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { scale, verticalScale } from '../lib/responsive';

interface SyncStatusModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SyncStatusModal({ visible, onClose }: SyncStatusModalProps) {
  const { queue, pendingCount, isSyncing, syncProgress, triggerSync, clearQueue } = useOfflineQueue();
  const { isOnline } = useNetworkStatus();

  const formatActionName = (type: string) => {
    switch (type) {
      case 'CREATE_SALE':
        return 'Venta realizada';
      case 'CREATE_CLIENT':
        return 'Nuevo cliente';
      case 'ADD_PAYMENT':
        return 'Abono de cliente';
      case 'CREATE_PRODUCT':
        return 'Producto creado';
      case 'UPDATE_PRODUCT':
        return 'Producto actualizado';
      case 'DELETE_PRODUCT':
        return 'Producto eliminado';
      case 'DELETE_SALE':
        return 'Venta anulada';
      default:
        return type;
    }
  };

  const getActionDetails = (item: any) => {
    if (item.type === 'CREATE_SALE' && item.payload) {
      return `$${item.payload.totalAmount?.toFixed(2)} (${item.payload.items?.length || 0} productos)`;
    }
    if (item.type === 'CREATE_CLIENT' && item.payload) {
      return `${item.payload.name}`;
    }
    if (item.type === 'ADD_PAYMENT' && item.payload) {
      return `$${item.payload.amount?.toFixed(2)}`;
    }
    return '';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <FontAwesome5
                name={isOnline ? 'cloud-upload-alt' : 'wifi-slash'}
                size={18}
                color={isOnline ? tokens.colors.sage : tokens.colors.amber}
                style={styles.headerIcon}
              />
              <AppText variant="subtitle" style={styles.title}>
                Estado de Sincronización
              </AppText>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <FontAwesome5 name="times" size={16} color={tokens.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Network Status Badge */}
          <View
            style={[
              styles.networkBadge,
              isOnline ? styles.networkBadgeOnline : styles.networkBadgeOffline,
            ]}
          >
            <View
              style={[
                styles.networkDot,
                { backgroundColor: isOnline ? tokens.colors.sage : tokens.colors.amber },
              ]}
            />
            <AppText variant="caption" style={styles.networkText}>
              {isOnline
                ? 'Conexión a Internet activa'
                : 'Sin Conexión — Guardando cambios localmente'}
            </AppText>
          </View>

          {/* Sync Progress Bar if active */}
          {isSyncing && syncProgress && (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <AppText variant="caption" style={styles.progressText}>
                  Sincronizando {syncProgress.current} de {syncProgress.total}...
                </AppText>
                <ActivityIndicator size="small" color={tokens.colors.mahoganyBright} />
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${(syncProgress.current / syncProgress.total) * 100}%` },
                  ]}
                />
              </View>
            </View>
          )}

          {/* List of Queue Items */}
          <AppText variant="caption" style={styles.sectionTitle}>
            Operaciones en Cola ({pendingCount})
          </AppText>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {queue.length === 0 ? (
              <View style={styles.emptyState}>
                <FontAwesome5 name="check-circle" size={32} color={tokens.colors.sage} />
                <AppText style={styles.emptyText}>
                  Todo está sincronizado con la nube.
                </AppText>
              </View>
            ) : (
              queue.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <View style={styles.itemTitleRow}>
                      <AppText variant="body" style={styles.itemName}>
                        {formatActionName(item.type)}
                      </AppText>
                      <AppText variant="caption" style={styles.itemDetails}>
                        {getActionDetails(item)}
                      </AppText>
                    </View>
                    <AppText variant="caption" style={styles.itemTime}>
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </AppText>
                    {item.errorMessage && (
                      <AppText variant="caption" style={styles.itemError}>
                        Error: {item.errorMessage}
                      </AppText>
                    )}
                  </View>

                  <View style={styles.itemStatus}>
                    {item.status === 'syncing' ? (
                      <ActivityIndicator size="small" color={tokens.colors.mahoganyBright} />
                    ) : item.status === 'failed' ? (
                      <FontAwesome5 name="exclamation-circle" size={16} color={tokens.colors.coral} />
                    ) : (
                      <FontAwesome5 name="clock" size={16} color={tokens.colors.amber} />
                    )}
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            {queue.length > 0 && isOnline && (
              <TouchableOpacity
                style={[styles.syncBtn, isSyncing && styles.syncBtnDisabled]}
                onPress={triggerSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <FontAwesome5 name="sync-alt" size={14} color="#FFF" style={{ marginRight: 8 }} />
                    <AppText style={styles.syncBtnText}>Sincronizar Ahora</AppText>
                  </>
                )}
              </TouchableOpacity>
            )}

            {queue.length > 0 && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => clearQueue()}
                disabled={isSyncing}
              >
                <AppText style={styles.clearBtnText}>Limpiar cola</AppText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: scale(420),
    maxHeight: '80%',
    backgroundColor: tokens.colors.surfaceElevated,
    borderRadius: tokens.radius.modal,
    borderWidth: 1,
    borderColor: tokens.colors.borderMedium,
    padding: tokens.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: tokens.spacing.sm,
  },
  title: {
    color: tokens.colors.text,
    fontWeight: tokens.typography.semibold,
  },
  closeBtn: {
    padding: tokens.spacing.xs,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.chip,
    marginBottom: tokens.spacing.md,
  },
  networkBadgeOnline: {
    backgroundColor: tokens.colors.sageDim,
  },
  networkBadgeOffline: {
    backgroundColor: tokens.colors.amberDim,
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: tokens.spacing.sm,
  },
  networkText: {
    color: tokens.colors.text,
  },
  progressContainer: {
    marginBottom: tokens.spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.xs,
  },
  progressText: {
    color: tokens.colors.mahoganyBright,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: tokens.colors.surfaceHover,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: tokens.colors.mahoganyBright,
  },
  sectionTitle: {
    color: tokens.colors.textMuted,
    marginBottom: tokens.spacing.xs,
  },
  list: {
    maxHeight: verticalScale(220),
  },
  listContent: {
    paddingVertical: tokens.spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing.xl,
  },
  emptyText: {
    color: tokens.colors.textSecondary,
    marginTop: tokens.spacing.md,
    textAlign: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.md,
    marginBottom: tokens.spacing.xs,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  itemInfo: {
    flex: 1,
    marginRight: tokens.spacing.sm,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  itemName: {
    color: tokens.colors.text,
    fontWeight: tokens.typography.medium,
    marginRight: tokens.spacing.xs,
  },
  itemDetails: {
    color: tokens.colors.textSecondary,
  },
  itemTime: {
    color: tokens.colors.textMuted,
    marginTop: 2,
  },
  itemError: {
    color: tokens.colors.coral,
    marginTop: 2,
  },
  itemStatus: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
  },
  footer: {
    marginTop: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  syncBtn: {
    backgroundColor: tokens.colors.mahogany,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.btn,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  syncBtnDisabled: {
    opacity: 0.6,
  },
  syncBtnText: {
    color: '#FFF',
    fontWeight: tokens.typography.semibold,
  },
  clearBtn: {
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
  },
  clearBtnText: {
    color: tokens.colors.textMuted,
  },
});

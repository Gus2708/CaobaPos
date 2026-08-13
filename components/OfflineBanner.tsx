import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { AppText } from './Text';
import { tokens } from '../lib/designTokens';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { SyncStatusModal } from './SyncStatusModal';
import { scale } from '../lib/responsive';

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const { pendingCount, isSyncing, triggerSync } = useOfflineQueue();
  const [modalVisible, setModalVisible] = useState(false);

  // If online and no pending items and not syncing, do not render banner
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setModalVisible(true)}
        style={[
          styles.banner,
          !isOnline ? styles.bannerOffline : styles.bannerPending,
        ]}
      >
        <View style={styles.content}>
          <FontAwesome5
            name={
              !isOnline
                ? 'wifi-slash'
                : isSyncing
                ? 'sync-alt'
                : 'cloud-upload-alt'
            }
            size={14}
            color={!isOnline ? tokens.colors.amber : tokens.colors.mahoganyBright}
            style={styles.icon}
          />
          <AppText style={styles.text} numberOfLines={1}>
            {!isOnline
              ? pendingCount > 0
                ? `Sin conexión — ${pendingCount} pendiente${pendingCount > 1 ? 's' : ''}`
                : 'Modo sin conexión — Guardando localmente'
              : isSyncing
              ? 'Sincronizando transacciones...'
              : `${pendingCount} pendiente${pendingCount > 1 ? 's' : ''} de sincronizar`}
          </AppText>
        </View>

        <View style={styles.actions}>
          {isOnline && pendingCount > 0 && !isSyncing && (
            <TouchableOpacity
              style={styles.syncBtn}
              onPress={(e) => {
                e.stopPropagation();
                triggerSync();
              }}
            >
              <AppText style={styles.syncBtnText}>
                Sincronizar
              </AppText>
            </TouchableOpacity>
          )}

          {isSyncing && (
            <ActivityIndicator size="small" color={tokens.colors.mahoganyBright} />
          )}

          <FontAwesome5
            name="chevron-right"
            size={10}
            color={tokens.colors.textMuted}
            style={{ marginLeft: 6 }}
          />
        </View>
      </TouchableOpacity>

      <SyncStatusModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: 1,
  },
  bannerOffline: {
    backgroundColor: 'rgba(232, 181, 96, 0.12)',
    borderBottomColor: 'rgba(232, 181, 96, 0.25)',
  },
  bannerPending: {
    backgroundColor: 'rgba(205, 155, 70, 0.12)',
    borderBottomColor: 'rgba(205, 155, 70, 0.25)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: tokens.spacing.sm,
  },
  text: {
    color: tokens.colors.text,
    fontWeight: tokens.typography.medium,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncBtn: {
    backgroundColor: tokens.colors.mahogany,
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: tokens.radius.chip,
  },
  syncBtnText: {
    color: '#FFF',
    fontWeight: tokens.typography.semibold,
  },
});

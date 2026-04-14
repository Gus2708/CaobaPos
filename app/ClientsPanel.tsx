import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { FontNames } from '../lib/fontNames';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale, moderateScale } from '../lib/responsive';
import { useClients, ClientBalance } from '../hooks/useClients';
import { useState } from 'react';
import { ClientDetailsModal } from '../components/ClientDetailsModal';

export default function ClientsPanel() {
  const insets = useSafeAreaInsets();
  const { data: clients, isLoading, error } = useClients();
  const [selectedClient, setSelectedClient] = useState<ClientBalance | null>(null);

  const totalDeuda = clients?.reduce((sum, c) => sum + (c.balance_due > 0 ? c.balance_due : 0), 0) || 0;

  const renderClientItem = ({ item }: { item: ClientBalance }) => {
    return (
      <TouchableOpacity 
        style={styles.clientCard}
        onPress={() => setSelectedClient(item)}
        activeOpacity={0.7}
      >
        <View style={styles.clientAvatar}>
          <Text style={styles.clientAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.clientPhone} numberOfLines={1}>{item.phone || 'Sin teléfono registrado'}</Text>
        </View>
        <View style={styles.clientDebt}>
          <Text style={styles.debtLabel}>Saldo</Text>
          <Text style={[styles.debtAmount, item.balance_due > 0 ? styles.debtRed : styles.debtGreen]}>
            ${item.balance_due.toFixed(2)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, verticalScale(16)) }]}>
        <View>
          <Text style={styles.title}>Clientes y Créditos</Text>
          <Text style={styles.subtitle}>Gestión de cuentas por cobrar</Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryIconBox}>
          <Icon name="chart-bar" size={24} color={tokens.colors.mahogany} />
        </View>
        <View>
          <Text style={styles.summaryLabel}>Total por Cobrar</Text>
          <Text style={styles.summaryValue}>${totalDeuda.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.listContainer}>
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={tokens.colors.mahogany} />
            <Text style={styles.loadingText}>Cargando clientes...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Icon name="exclamation-triangle" size={32} color={tokens.colors.coral} />
            <Text style={styles.errorText}>Error al cargar clientes</Text>
          </View>
        ) : (
          <FlatList
            data={clients}
            keyExtractor={item => item.id}
            renderItem={renderClientItem}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + verticalScale(32) }]}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="users" size={48} color="rgba(255,255,255,0.1)" />
                <Text style={styles.emptyText}>No hay clientes registrados</Text>
              </View>
            }
          />
        )}
      </View>

      <ClientDetailsModal
        visible={!!selectedClient}
        client={clients?.find(c => c.id === selectedClient?.id) || selectedClient}
        onClose={() => setSelectedClient(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  header: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
  },
  title: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(28),
    fontWeight: '700',
    color: tokens.colors.text,
    letterSpacing: scale(-0.5),
  },
  subtitle: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(15),
    color: tokens.colors.textSecondary,
    marginTop: verticalScale(4),
  },
  summaryCard: {
    marginHorizontal: scale(20),
    marginBottom: verticalScale(16),
    padding: scale(20),
    backgroundColor: 'rgba(184, 123, 90, 0.1)',
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(16),
  },
  summaryIconBox: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(16),
    backgroundColor: 'rgba(184, 123, 90, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    color: tokens.colors.textSecondary,
    marginBottom: verticalScale(4),
  },
  summaryValue: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(24),
    fontWeight: '700',
    color: tokens.colors.coral,
  },
  listContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  listContent: {
    padding: scale(16),
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 12, 0.6)',
    padding: scale(16),
    marginBottom: verticalScale(12),
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  clientAvatar: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(16),
  },
  clientAvatarText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(20),
    fontWeight: '700',
    color: tokens.colors.text,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: tokens.colors.text,
  },
  clientPhone: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(13),
    color: tokens.colors.textSecondary,
    marginTop: verticalScale(4),
  },
  clientDebt: {
    alignItems: 'flex-end',
  },
  debtLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(12),
    color: tokens.colors.textSecondary,
    marginBottom: verticalScale(4),
  },
  debtAmount: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(16),
    fontWeight: '700',
  },
  debtRed: {
    color: tokens.colors.coral,
  },
  debtGreen: {
    color: tokens.colors.sage,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: verticalScale(16),
    fontFamily: FontNames.instrumentSans,
    color: tokens.colors.textSecondary,
  },
  errorText: {
    marginTop: verticalScale(16),
    fontFamily: FontNames.instrumentSans,
    color: tokens.colors.coral,
  },
  emptyContainer: {
    padding: scale(60),
    alignItems: 'center',
  },
  emptyText: {
    marginTop: verticalScale(20),
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(16),
    color: tokens.colors.textSecondary,
  },
});

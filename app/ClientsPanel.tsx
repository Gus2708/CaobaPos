import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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
  const debtorsCount = clients?.filter(c => c.balance_due > 0).length || 0;
  const [search, setSearch] = useState('');

  const filteredClients = clients?.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.phone && c.phone.includes(search))
  );

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
          <Text style={styles.clientPhone} numberOfLines={1}>
            <Icon name="phone" size={11} color={tokens.colors.textDim} /> {item.phone || 'Sin número'}
          </Text>
        </View>
        <View style={styles.clientDebt}>
          <Text style={styles.debtLabel}>Saldo Pendiente</Text>
          <Text style={[styles.debtAmount, item.balance_due > 0 ? styles.debtRed : styles.debtGreen]} numberOfLines={1} adjustsFontSizeToFit>
            ${item.balance_due.toFixed(2)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, verticalScale(16)) }]}>
        <Text style={styles.title}>Clientes y Créditos</Text>
        <Text style={styles.subtitle}>Gestión de saldos y cuentas por cobrar</Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIconBox}>
            <Icon name="wallet" size={24} color={tokens.colors.mahogany} />
          </View>
          <View>
            <Text style={styles.summaryLabel}>Total por cobrar</Text>
            <Text style={styles.summaryValue}>${totalDeuda.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
          </View>
        </View>
        <View style={styles.debtorsBadge}>
          <Text style={styles.debtorsCount}>{debtorsCount}</Text>
          <Text style={styles.debtorsLabel}>Deudores</Text>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={18} color={tokens.colors.mahogany} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o teléfono..."
            placeholderTextColor={tokens.colors.textDim}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <View style={styles.listContainer}>
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={tokens.colors.mahogany} />
            <Text style={styles.loadingText}>Sincronizando clientes...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Icon name="exclamation-circle" size={48} color={tokens.colors.coral} />
            <Text style={styles.errorText}>No se pudo cargar la base de datos</Text>
          </View>
        ) : (
          <FlatList
            data={filteredClients}
            keyExtractor={item => item.id}
            renderItem={renderClientItem}
            contentContainerStyle={[
              styles.listContent, 
              { paddingBottom: insets.bottom + verticalScale(100) }
            ]}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBox}>
                  <Icon name="users" size={42} color={tokens.colors.mahogany} />
                </View>
                <Text style={styles.emptyText}>
                  {search 
                    ? `No encontramos resultados para "${search}"` 
                    : 'Aún no tienes clientes registrados en tu base de datos'}
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
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
    paddingBottom: verticalScale(20),
  },
  title: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(30),
    fontWeight: '800',
    color: tokens.colors.text,
    letterSpacing: scale(-0.8),
  },
  subtitle: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(15),
    color: tokens.colors.textSecondary,
    marginTop: verticalScale(4),
  },
  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: scale(20),
    marginBottom: verticalScale(20),
    gap: scale(12),
  },
  summaryCard: {
    flex: 1,
    padding: scale(20),
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(14),
  },
  summaryIconBox: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: tokens.colors.mahoganyDim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: tokens.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: scale(0.5),
  },
  summaryValue: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(22),
    fontWeight: '800',
    color: tokens.colors.text,
    marginTop: verticalScale(2),
  },
  debtorsBadge: {
    backgroundColor: tokens.colors.coralDim,
    borderRadius: tokens.radius.xl,
    paddingHorizontal: scale(16),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.coral,
    minWidth: scale(80),
  },
  debtorsCount: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(22),
    fontWeight: '800',
    color: tokens.colors.coral,
    lineHeight: moderateScale(28),
  },
  debtorsLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(10),
    color: tokens.colors.coral,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginTop: verticalScale(2),
  },
  searchRow: {
    marginHorizontal: scale(20),
    marginBottom: verticalScale(20),
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: tokens.radius.pill,
    paddingHorizontal: scale(18),
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    gap: scale(12),
    height: verticalScale(54),
  },
  searchInput: {
    flex: 1,
    color: tokens.colors.text,
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(15),
    padding: 0,
  },
  listContainer: {
    flex: 1,
    backgroundColor: tokens.colors.surface,
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: tokens.colors.borderLight,
  },
  listContent: {
    padding: scale(20),
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: scale(16),
    marginBottom: verticalScale(14),
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  clientAvatar: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: tokens.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(16),
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  clientAvatarText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: tokens.colors.mahogany,
  },
  clientInfo: {
    flex: 1,
    gap: verticalScale(2),
  },
  clientName: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: tokens.colors.text,
  },
  clientPhone: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(13),
    color: tokens.colors.textMuted,
  },
  clientDebt: {
    alignItems: 'flex-end',
    gap: verticalScale(2),
  },
  debtLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: tokens.colors.textDim,
    textTransform: 'uppercase',
  },
  debtAmount: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(16),
    fontWeight: '800',
  },
  debtRed: { color: tokens.colors.coral },
  debtGreen: { color: tokens.colors.sage },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: verticalScale(16),
  },
  loadingText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    color: tokens.colors.textMuted,
  },
  errorText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    color: tokens.colors.coral,
  },
  emptyContainer: {
    paddingVertical: verticalScale(60),
    alignItems: 'center',
  },
  emptyIconBox: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: tokens.colors.mahoganyDim,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  emptyText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(16),
    color: tokens.colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: scale(40),
  },
});

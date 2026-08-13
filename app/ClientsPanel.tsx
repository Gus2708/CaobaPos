import React, { useState, useMemo, useCallback, memo } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Animated, Platform, useWindowDimensions, Image } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../components/Icon';
import { FontNames } from '../lib/fontNames';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale, moderateScale } from '../lib/responsive';
import { useClients, ClientBalance } from '../hooks/useClients';
import { globalScrollY } from '../store/uiStore';
import { ClientDetailsModal } from '../components/ClientDetailsModal';
import { Text } from '../components/Text';
import { FLOR1_BASE64 } from '../lib/brandAssets';

const ClientItem = memo(({ item, onSelect }: { item: ClientBalance, onSelect: (client: ClientBalance) => void }) => (
  <TouchableOpacity 
    style={[styles.clientCard, { backgroundColor: tokens.colors.surface }]}
    onPress={() => onSelect(item)}
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
));

// Animated FlashList component
const AnimatedFlashList = Animated.createAnimatedComponent(FlashList) as any;

export default function ClientsPanel() {
  const insets = useSafeAreaInsets();
  const { data: clients, isLoading, error } = useClients();
  const [selectedClient, setSelectedClient] = useState<ClientBalance | null>(null);

  const totalDeuda = clients?.reduce((sum, c) => sum + (c.balance_due > 0 ? c.balance_due : 0), 0) || 0;
  const debtorsCount = clients?.filter(c => c.balance_due > 0).length || 0;
  const [search, setSearch] = useState('');
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const HEADER_HEIGHT = verticalScale(50) + insets.top;
  const TOTAL_NAV_HEIGHT = HEADER_HEIGHT;

  const filteredClients = clients?.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.phone && c.phone.includes(search))
  );

  const renderClientItem = useCallback(({ item }: { item: ClientBalance }) => (
    <ClientItem item={item} onSelect={setSelectedClient} />
  ), []);

  const ListHeader = useMemo(() => (
    <View style={styles.listHeader}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Gestión de cartera</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
          <Text style={styles.title}>Clientes y Créditos</Text>
          <Image source={{ uri: FLOR1_BASE64 }} style={{ width: scale(22), height: scale(22) }} resizeMode="contain" />
        </View>
        <Text style={styles.subtitle}>Supervisión de saldos y cuentas por cobrar</Text>
      </View>

      <View style={styles.summarySection}>
        <Text style={styles.sectionLabel}>Estado de cuenta global</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryIconBox}>
              <Icon name="wallet" size={24} color={tokens.colors.mahogany} />
            </View>
            <View style={{ gap: verticalScale(2) }}>
              <Text style={styles.summaryLabel}>Total por cobrar</Text>
              <Text style={styles.summaryValue}>${totalDeuda.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
            </View>
          </View>
          <View style={styles.debtorsBadge}>
            <Text style={styles.debtorsCount}>{debtorsCount}</Text>
            <Text style={styles.debtorsLabel}>Deudores</Text>
          </View>
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
    </View>
  ), [totalDeuda, debtorsCount, search]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[tokens.colors.bg, tokens.colors.bg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

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
        <AnimatedFlashList
          ListHeaderComponent={ListHeader}
          data={filteredClients}
          keyExtractor={(item: ClientBalance) => item.id}
          renderItem={renderClientItem}
          estimatedItemSize={verticalScale(80)}
          contentContainerStyle={[
            styles.listContent, 
            { 
              paddingTop: TOTAL_NAV_HEIGHT + verticalScale(12), 
              paddingBottom: insets.bottom + verticalScale(100) 
            }
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
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: globalScrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        />
      )}
      
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
  listHeader: {
    // wrapper for the FlashList ListHeaderComponent
  },
  header: {
    paddingHorizontal: scale(4),
    paddingBottom: verticalScale(32),
  },
  headerLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(12),
    color: tokens.colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: verticalScale(4),
  },
  title: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(32),
    fontWeight: '800',
    color: tokens.colors.text,
    letterSpacing: scale(-0.8),
  },
  subtitle: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    color: tokens.colors.textMuted,
    marginTop: verticalScale(2),
    fontWeight: '500',
  },
  summarySection: {
    marginBottom: verticalScale(32),
  },
  sectionLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(13),
    color: tokens.colors.textMuted,
    fontWeight: '600',
    marginBottom: verticalScale(12),
    paddingHorizontal: scale(4),
  },
  summaryRow: {
    flexDirection: 'row',
    gap: scale(12),
    paddingHorizontal: scale(4),
  },
  summaryCard: {
    flex: 1,
    borderRadius: tokens.radius.card,
    padding: tokens.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.colors.glass.border,
    backgroundColor: tokens.colors.surface,
  },
  summaryIconBox: {
    width: scale(48),
    height: scale(48),
    borderRadius: tokens.radius.btn,
    backgroundColor: tokens.colors.mahoganyDim,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.mahogany,
  },
  summaryLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: tokens.typography.xs,
    color: tokens.colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: tokens.typography['2xl'],
    color: tokens.colors.sage,
    fontWeight: '800',
  },
  debtorsBadge: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.glass.border,
    minWidth: scale(80),
    backgroundColor: tokens.colors.surface,
  },
  debtorsCount: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(22),
    color: tokens.colors.mahogany,
    fontWeight: '800',
  },
  debtorsLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: tokens.typography.xs,
    color: tokens.colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  searchRow: {
    marginBottom: tokens.spacing.xxl,
    paddingHorizontal: tokens.spacing.xs,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.colors.glass.border,
    gap: tokens.spacing.md,
    height: verticalScale(54),
  },
  searchInput: {
    flex: 1,
    fontFamily: FontNames.instrumentSans,
    fontSize: tokens.typography.md,
    color: tokens.colors.text,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: scale(16),
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(16),
    marginBottom: verticalScale(16),
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.colors.glass.border,
    minHeight: verticalScale(84),
    justifyContent: 'center',
    gap: scale(14),
    backgroundColor: tokens.colors.surface,
  },
  clientAvatar: {
    width: scale(48),
    height: scale(48),
    borderRadius: tokens.radius.btn,
    backgroundColor: tokens.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.glass.border,
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

import React, { useState, useMemo } from 'react';
import { BlurView } from 'expo-blur';
import { 
  View, 
  Modal, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform,
  Animated,
  PanResponder,
  Dimensions,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { Icon } from './Icon';
import { tokens } from '../lib/designTokens';
import { FontNames } from '../lib/fontNames';
import { scale, verticalScale, moderateScale } from '../lib/responsive';
import { useClients, useCreateClient, ClientBalance } from '../hooks/useClients';

interface ClientSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectClient: (client: ClientBalance) => void;
}

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const MIN_MODAL_HEIGHT = SCREEN_HEIGHT * 0.88;
const MAX_MODAL_HEIGHT = SCREEN_HEIGHT * 0.88; 
const MODAL_TOP_RADIUS = tokens.radius.xl;

export function ClientSelectorModal({ visible, onClose, onSelectClient }: ClientSelectorModalProps) {
  const insets = useSafeAreaInsets();
  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Expandable Logic
  const currentHeight = React.useRef(MIN_MODAL_HEIGHT);
  const heightAnim = React.useRef(new Animated.Value(MIN_MODAL_HEIGHT)).current;
  const [isExpanded, setIsExpanded] = useState(false);

  React.useEffect(() => {
    const listenerId = heightAnim.addListener(({ value }) => {
      currentHeight.current = value;
    });
    return () => heightAnim.removeListener(listenerId);
  }, []);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const newHeight = currentHeight.current - gestureState.dy;
        if (newHeight >= MIN_MODAL_HEIGHT && newHeight <= MAX_MODAL_HEIGHT) {
          heightAnim.setValue(newHeight);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -50 || (currentHeight.current > (MIN_MODAL_HEIGHT + MAX_MODAL_HEIGHT) * 0.6 && gestureState.dy < 0)) {
          // Expand
          Animated.spring(heightAnim, {
            toValue: MAX_MODAL_HEIGHT,
            useNativeDriver: false,
            ...tokens.animation.spring,
          }).start(() => setIsExpanded(true));
        } else if (gestureState.dy > 50 || currentHeight.current < (MIN_MODAL_HEIGHT + MAX_MODAL_HEIGHT) * 0.4) {
          // Collapse
          Animated.spring(heightAnim, {
            toValue: MIN_MODAL_HEIGHT,
            useNativeDriver: false,
            ...tokens.animation.spring,
          }).start(() => setIsExpanded(false));
        }
      },
    })
  ).current;

  // Sync visible state
  React.useEffect(() => {
    if (visible) {
      Animated.spring(heightAnim, {
        toValue: MIN_MODAL_HEIGHT,
        useNativeDriver: false,
        ...tokens.animation.spring,
      }).start();
      setIsExpanded(false);
    }
  }, [visible]);

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    if (!searchQuery.trim()) return clients;
    
    const searchLower = searchQuery.toLowerCase().trim();
    // Simple normalization for accent-insensitive search if desired
    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const normalizedSearch = normalize(searchLower);

    return clients.filter(c => 
      normalize(c.name).includes(normalizedSearch) || 
      (c.phone && c.phone.includes(searchLower))
    );
  }, [clients, searchQuery]);

  const handleCreateClient = async () => {
    if (!newName.trim()) return;
    try {
      const newClient = await createClient.mutateAsync({ name: newName.trim(), phone: newPhone.trim() });
      // Construct a ClientBalance fallback for immediately using the new client
      onSelectClient({
        ...newClient,
        total_credit_sales: 0,
        total_paid: 0,
        balance_due: 0
      });
      setIsCreating(false);
      setNewName('');
      setNewPhone('');
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  const renderClient = React.useCallback(({ item }: { item: ClientBalance }) => (
    <TouchableOpacity
      style={styles.clientItem}
      onPress={() => {
        onSelectClient(item);
        onClose();
      }}
      activeOpacity={0.7}
    >
      <View style={styles.clientAvatar}>
        <Text style={styles.clientAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{item.name}</Text>
        <Text style={styles.clientPhone}>{item.phone || 'Sin número'}</Text>
      </View>
      {item.balance_due > 0 && (
        <View style={styles.debtBadge}>
          <Text style={styles.debtText}>Deuda: ${item.balance_due.toFixed(2)}</Text>
        </View>
      )}
      <Icon name="chevron-right" size={16} color={tokens.colors.borderLight} />
    </TouchableOpacity>
  ), [onSelectClient, onClose]);

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      transparent={true} 
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -50} 
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />
          <Animated.View 
            style={[
              styles.modalContainer, 
              { 
                height: heightAnim,
                paddingBottom: insets.bottom 
              }
            ]}
          >
            <View style={styles.blurContainer}>
               <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
               <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10, 10, 12, 0.75)' }]} />
            </View>
            
            <View {...panResponder.panHandlers} style={styles.dragHandleContainer}>
              <View style={styles.dragHandle} />
            </View>
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <View>
                  <Text style={styles.title}>Seleccionar Cliente</Text>
                  <Text style={styles.subtitleCount}>{filteredClients.length} clientes encontrados</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
                  <Icon name="close" size={24} color={tokens.colors.textDim} />
                </TouchableOpacity>
              </View>
              
              {!isCreating && (
                <View style={styles.searchRow}>
                  <View style={styles.searchInputContainer}>
                    <Icon name="search" size={18} color={tokens.colors.mahogany} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Buscar por nombre o teléfono..."
                      placeholderTextColor={tokens.colors.textDim}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                  </View>
                </View>
              )}
            </View>

            {isCreating ? (
              <ScrollView 
                style={styles.createScroll}
                contentContainerStyle={styles.createContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.sectionTitle}>Nuevo Cliente</Text>
                <View style={styles.inputGroup}>
                  <View style={styles.inputContainer}>
                    <Icon name="user" size={18} color={tokens.colors.mahogany} />
                    <TextInput
                      style={styles.input}
                      placeholder="Nombre completo"
                      placeholderTextColor={tokens.colors.textDim}
                      value={newName}
                      onChangeText={setNewName}
                      autoFocus
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <Icon name="phone" size={18} color={tokens.colors.mahogany} />
                    <TextInput
                      style={styles.input}
                      placeholder="Teléfono (opcional)"
                      placeholderTextColor={tokens.colors.textDim}
                      value={newPhone}
                      onChangeText={setNewPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={[styles.button, styles.cancelButton]} 
                    onPress={() => setIsCreating(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.button, styles.saveButton]} 
                    onPress={handleCreateClient}
                    disabled={!newName.trim() || createClient.isPending}
                    activeOpacity={0.8}
                  >
                    {createClient.isPending ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.saveText}>Guardar Cliente</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              <>
                <TouchableOpacity 
                  style={styles.createButton}
                  onPress={() => setIsCreating(true)}
                  activeOpacity={0.7}
                >
                  <Icon name="user-plus" size={18} color={tokens.colors.mahogany} />
                  <Text style={styles.createButtonText}>Registrar Nuevo Cliente</Text>
                </TouchableOpacity>

                <View style={styles.listWrapper}>
                  {isLoading ? (
                    <View style={styles.centerContainer}>
                      <ActivityIndicator size="large" color={tokens.colors.mahogany} />
                    </View>
                  ) : (
                    <FlatList
                      data={filteredClients}
                      keyExtractor={(item) => item.id}
                      renderItem={renderClient}
                      contentContainerStyle={[
                        styles.listContent,
                        { paddingBottom: Math.max(insets.bottom, verticalScale(40)) }
                      ]}
                      showsVerticalScrollIndicator={false}
                      initialNumToRender={10}
                      ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                          <View style={styles.emptyIconBox}>
                            <Icon name="users" size={42} color={tokens.colors.mahogany} />
                          </View>
                          <Text style={styles.emptyText}>
                            {searchQuery ? `No encontramos a "${searchQuery}"` : 'No hay clientes registrados'}
                          </Text>
                          {searchQuery.length > 0 && (
                            <TouchableOpacity 
                              style={styles.createFromEmptyBtn} 
                              onPress={() => {
                                setNewName(searchQuery);
                                setIsCreating(true);
                              }}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.createFromEmptyText}>Crear "{searchQuery}"</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      }
                    />
                  )}
                </View>
              </>
            )}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  modalContainer: {
    width: '100%',
    borderTopLeftRadius: tokens.radius.xl * 1.5,
    borderTopRightRadius: tokens.radius.xl * 1.5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    elevation: 20,
    backgroundColor: 'transparent',
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  dragHandleContainer: {
    width: '100%',
    height: verticalScale(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandle: {
    width: scale(36),
    height: verticalScale(4),
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  header: {
    paddingHorizontal: scale(20),
    paddingBottom: scale(16),
    paddingTop: scale(8),
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  title: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: tokens.colors.text,
  },
  subtitleCount: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(13),
    color: tokens.colors.textDim,
    marginTop: verticalScale(2),
  },
  closeButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  searchRow: {
    paddingTop: scale(4),
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    height: verticalScale(52),
    borderRadius: tokens.radius.lg,
    paddingHorizontal: scale(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchInput: {
    flex: 1,
    marginLeft: scale(12),
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(16),
    color: tokens.colors.text,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: scale(20),
    marginBottom: verticalScale(16),
    height: verticalScale(46),
    backgroundColor: tokens.colors.mahoganyDim,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.mahogany,
    gap: scale(10),
  },
  createButtonText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: tokens.colors.mahogany,
  },
  listWrapper: { flex: 1 },
  listContent: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(40),
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.borderLight,
  },
  clientAvatar: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    backgroundColor: tokens.colors.mahoganyDim,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
    borderWidth: 1,
    borderColor: tokens.colors.mahogany,
  },
  clientAvatarText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: tokens.colors.mahogany,
  },
  clientInfo: { flex: 1 },
  clientName: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: tokens.colors.text,
  },
  clientPhone: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(12),
    color: tokens.colors.textDim,
    marginTop: verticalScale(2),
  },
  debtBadge: {
    backgroundColor: tokens.colors.coralDim,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: tokens.radius.pill,
    marginRight: scale(8),
    borderWidth: 0.5,
    borderColor: tokens.colors.coral,
  },
  debtText: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(10),
    fontWeight: '700',
    color: tokens.colors.coral,
  },
  createScroll: {
    flex: 1,
  },
  createContainer: { 
    padding: scale(24),
    paddingBottom: verticalScale(32),
  },
  sectionTitle: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: tokens.colors.text,
    marginBottom: verticalScale(20),
  },
  inputGroup: { gap: verticalScale(16), marginBottom: verticalScale(24) },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    height: verticalScale(48),
    borderRadius: tokens.radius.lg,
    paddingHorizontal: scale(16),
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  input: {
    flex: 1,
    marginLeft: scale(12),
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(15),
    color: tokens.colors.text,
  },
  actionButtons: { flexDirection: 'row', gap: scale(12) },
  button: {
    flex: 1,
    height: verticalScale(50),
    borderRadius: tokens.radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  saveButton: { backgroundColor: tokens.colors.mahogany },
  cancelText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: tokens.colors.textDim,
  },
  saveText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(15),
    fontWeight: '800',
    color: '#FFF',
  },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: scale(40) },
  emptyContainer: { alignItems: 'center', marginTop: verticalScale(40) },
  emptyIconBox: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: tokens.colors.mahoganyDim,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(16),
    borderWidth: 1,
    borderColor: tokens.colors.mahogany,
  },
  emptyText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    color: tokens.colors.textDim,
  },
  createFromEmptyBtn: {
    marginTop: verticalScale(20),
    backgroundColor: tokens.colors.mahogany,
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    borderRadius: tokens.radius.pill,
  },
  createFromEmptyText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    color: '#FFF',
    fontWeight: '800',
  },
});

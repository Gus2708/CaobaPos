import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, 
  Modal, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform,
  Dimensions,
  ScrollView
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
  useReducedMotion,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import * as Haptics from 'expo-haptics';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { Icon } from './Icon';
import { tokens } from '../lib/designTokens';
import { FontNames } from '../lib/fontNames';
import { scale, verticalScale, moderateScale } from '../lib/responsive';
import { useClients, useCreateClient, ClientBalance } from '../hooks/useClients';
import { PressableScale } from './PressableScale';

interface ClientSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectClient: (client: ClientBalance) => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;

// Momentum projection: where the finger would come to rest
function project(velocity: number, decelerationRate = 0.998) {
  'worklet';
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

// Rubber-banding: progressive resistance past the top boundary
function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  'worklet';
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

export function ClientSelectorModal({ visible, onClose, onSelectClient }: ClientSelectorModalProps) {
  const insets = useSafeAreaInsets();
  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();
  const reducedMotion = useReducedMotion();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Reanimated UI-thread shared values
  const translateY = useSharedValue(SHEET_HEIGHT);
  const context = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      if (reducedMotion) {
        translateY.set(0);
      } else {
        translateY.set(
          withSpring(0, {
            duration: tokens.animation.springs.sheet.duration,
            dampingRatio: tokens.animation.springs.sheet.dampingRatio,
          })
        );
      }
    } else {
      translateY.set(SHEET_HEIGHT);
    }
  }, [visible, reducedMotion]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-10, 10])
        .onStart(() => {
          'worklet';
          context.set(translateY.get());
        })
        .onUpdate((e) => {
          'worklet';
          const next = context.get() + e.translationY;
          translateY.set(next >= 0 ? next : rubberband(next, SHEET_HEIGHT));
        })
        .onEnd((e) => {
          'worklet';
          const projected = translateY.get() + project(e.velocityY);
          if (projected > SHEET_HEIGHT * 0.35 || e.velocityY > 500) {
            translateY.set(
              withSpring(
                SHEET_HEIGHT,
                {
                  duration: 300,
                  dampingRatio: 1,
                  velocity: e.velocityY,
                  overshootClamping: true,
                },
                (finished) => {
                  if (finished) scheduleOnRN(onClose);
                }
              )
            );
          } else {
            translateY.set(
              withSpring(0, {
                duration: 300,
                dampingRatio: 0.8,
                velocity: e.velocityY,
              })
            );
            scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Light);
          }
        }),
    [onClose]
  );

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.get() }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.get(), [0, SHEET_HEIGHT], [1, 0], Extrapolation.CLAMP),
  }));

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    if (!searchQuery.trim()) return clients;
    
    const searchLower = searchQuery.toLowerCase().trim();
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
    <PressableScale
      style={styles.clientItem}
      onPress={() => {
        onSelectClient(item);
        onClose();
      }}
      accessibilityRole="button"
      accessibilityLabel={`Seleccionar cliente ${item.name}`}
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
    </PressableScale>
  ), [onSelectClient, onClose]);

  if (!visible) return null;

  return (
    <Modal 
      visible={visible} 
      animationType="none" 
      transparent={true} 
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.overlay, backdropStyle]}>
          <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />
          <Animated.View 
            style={[
              styles.modalContainer, 
              sheetStyle,
              { 
                height: SHEET_HEIGHT,
                paddingBottom: insets.bottom 
              }
            ]}
          >
            <View style={styles.blurContainer}>
               <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.colors.surface }]} />
            </View>
            
            <GestureDetector gesture={pan}>
              <View style={styles.dragHandleContainer}>
                <View style={styles.dragHandle} />
              </View>
            </GestureDetector>
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <View>
                  <Text style={styles.title}>Seleccionar Cliente</Text>
                  <Text style={styles.subtitleCount}>{filteredClients.length} clientes encontrados</Text>
                </View>
                <PressableScale onPress={onClose} style={styles.closeButton}>
                  <Icon name="close" size={24} color={tokens.colors.textDim} />
                </PressableScale>
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
                    <FlashList
                      data={filteredClients}
                      keyExtractor={(item) => item.id}
                      renderItem={renderClient}
                      contentContainerStyle={[
                        styles.listContent,
                        { paddingBottom: Math.max(insets.bottom, verticalScale(40)) }
                      ]}
                      showsVerticalScrollIndicator={false}
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
        </Animated.View>
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
    borderColor: tokens.colors.borderLight,
    overflow: 'hidden',
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
    backgroundColor: tokens.colors.borderLight,
  },
  header: {
    paddingHorizontal: scale(20),
    paddingBottom: scale(16),
    paddingTop: scale(8),
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.borderLight,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  title: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: tokens.colors.text,
  },
  subtitleCount: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(13),
    color: tokens.colors.textDim,
    marginTop: verticalScale(2),
  },
  closeButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: tokens.colors.surface,
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
    backgroundColor: tokens.colors.bg,
    height: verticalScale(52),
    borderRadius: tokens.radius.lg,
    paddingHorizontal: scale(16),
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  searchInput: {
    flex: 1,
    marginLeft: scale(12),
    fontFamily: FontNames.parkinsans,
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
    fontFamily: FontNames.parkinsans,
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
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: tokens.colors.mahogany,
  },
  clientInfo: { flex: 1 },
  clientName: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: tokens.colors.text,
  },
  clientPhone: {
    fontFamily: FontNames.parkinsans,
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
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: tokens.colors.text,
    marginBottom: verticalScale(20),
  },
  inputGroup: { gap: verticalScale(16), marginBottom: verticalScale(24) },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.bg,
    height: verticalScale(48),
    borderRadius: tokens.radius.lg,
    paddingHorizontal: scale(16),
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  input: {
    flex: 1,
    marginLeft: scale(12),
    fontFamily: FontNames.parkinsans,
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
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  saveButton: { backgroundColor: tokens.colors.mahogany },
  cancelText: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: tokens.colors.textDim,
  },
  saveText: {
    fontFamily: FontNames.parkinsans,
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
    fontFamily: FontNames.parkinsans,
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
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(14),
    color: '#FFF',
    fontWeight: '800',
  },
});

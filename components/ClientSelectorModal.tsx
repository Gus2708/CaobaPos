import React, { useState } from 'react';
import { View, Modal, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, FlatList } from 'react-native';
import { Text } from './Text';
import { Icon } from './Icon';
import { tokens } from '../lib/designTokens';
import { FontNames } from '../lib/fontNames';
import { scale, verticalScale, moderateScale } from '../lib/responsive';
import { useClients, useCreateClient, ClientBalance } from '../hooks/useClients';
import { LinearGradient } from 'expo-linear-gradient';

interface ClientSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectClient: (client: ClientBalance) => void;
}

export function ClientSelectorModal({ visible, onClose, onSelectClient }: ClientSelectorModalProps) {
  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const filteredClients = clients?.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.phone && c.phone.includes(searchQuery))
  ) || [];

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

  const renderClient = ({ item }: { item: ClientBalance }) => (
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
        <Text style={styles.clientPhone}>{item.phone || 'Sin teléfono'}</Text>
      </View>
      {item.balance_due > 0 && (
        <View style={styles.debtBadge}>
          <Text style={styles.debtText}>Debe: ${item.balance_due.toFixed(2)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Seleccionar Cliente</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={tokens.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {isCreating ? (
            <View style={styles.createContainer}>
              <Text style={styles.subtitle}>Nuevo Cliente</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre del cliente"
                placeholderTextColor={tokens.colors.textSecondary}
                value={newName}
                onChangeText={setNewName}
              />
              <TextInput
                style={styles.input}
                placeholder="Teléfono (opcional)"
                placeholderTextColor={tokens.colors.textSecondary}
                value={newPhone}
                onChangeText={setNewPhone}
                keyboardType="phone-pad"
              />
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.button, styles.cancelButton]} 
                  onPress={() => setIsCreating(false)}
                >
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.button, styles.saveButton]} 
                  onPress={handleCreateClient}
                  disabled={!newName.trim() || createClient.isPending}
                >
                  {createClient.isPending ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveText}>Guardar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.searchContainer}>
                <Icon name="search" size={20} color={tokens.colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar cliente..."
                  placeholderTextColor={tokens.colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => setIsCreating(true)}
              >
                <Icon name="user-plus" size={16} color={tokens.colors.mahoganyBright} />
                <Text style={styles.createButtonText}>Agregar nuevo cliente</Text>
              </TouchableOpacity>

              {isLoading ? (
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="large" color={tokens.colors.mahogany} />
                </View>
              ) : (
                <FlatList
                  data={filteredClients}
                  keyExtractor={item => item.id}
                  renderItem={renderClient}
                  contentContainerStyle={styles.listContent}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>No se encontraron clientes</Text>
                    </View>
                  }
                />
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'rgba(10, 10, 12, 0.95)',
    borderTopLeftRadius: scale(28),
    borderTopRightRadius: scale(28),
    maxHeight: '82%',
    paddingBottom: verticalScale(20),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(20),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  title: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(20),
    fontWeight: '700',
    color: tokens.colors.text,
  },
  closeButton: {
    padding: scale(4),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    margin: scale(16),
    paddingHorizontal: scale(16),
    height: verticalScale(48),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchInput: {
    flex: 1,
    marginLeft: scale(10),
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(16),
    color: tokens.colors.text,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: scale(16),
    marginBottom: verticalScale(16),
    paddingVertical: verticalScale(12),
    backgroundColor: 'rgba(184, 123, 90, 0.08)',
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.2)',
    gap: scale(10),
    height: verticalScale(48),
  },
  createButtonText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: tokens.colors.text,
    letterSpacing: 0.3,
  },
  listContent: {
    paddingHorizontal: scale(16),
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  clientAvatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  clientAvatarText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(18),
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
    marginTop: verticalScale(2),
  },
  debtBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(8),
  },
  debtText: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#EF4444',
  },
  centerContainer: {
    padding: scale(40),
    alignItems: 'center',
  },
  emptyContainer: {
    padding: scale(40),
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(15),
    color: tokens.colors.textSecondary,
  },
  createContainer: {
    padding: scale(20),
  },
  subtitle: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: tokens.colors.text,
    marginBottom: verticalScale(16),
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: scale(12),
    height: verticalScale(48),
    paddingHorizontal: scale(16),
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(16),
    color: tokens.colors.text,
    marginBottom: verticalScale(16),
  },
  actionButtons: {
    flexDirection: 'row',
    gap: scale(12),
    marginTop: verticalScale(8),
  },
  button: {
    flex: 1,
    height: verticalScale(48),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  saveButton: {
    backgroundColor: tokens.colors.mahogany,
  },
  cancelText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: tokens.colors.text,
  },
  saveText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#FFF',
  },
});

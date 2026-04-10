import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontNames } from '../lib/fontNames';
import { Icon } from './Icon';

interface ImagePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCamera: () => void;
  onSelectGallery: () => void;
}

export function ImagePickerModal({ visible, onClose, onSelectCamera, onSelectGallery }: ImagePickerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modal}>
          <Text style={styles.title}>Seleccionar Imagen</Text>
          
          <TouchableOpacity style={styles.option} onPress={() => { onSelectCamera(); onClose(); }}>
            <View style={styles.iconContainer}>
              <Icon name="camera" size={24} color="#B87B5A" />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Cámara</Text>
              <Text style={styles.optionSubtitle}>Tomar una foto</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.option} onPress={() => { onSelectGallery(); onClose(); }}>
            <View style={styles.iconContainer}>
              <Icon name="image" size={24} color="#B87B5A" />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Galería</Text>
              <Text style={styles.optionSubtitle}>Seleccionar de la galería</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: 'rgba(10, 10, 12, 0.95)',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.3)',
  },
  title: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 20,
    fontWeight: '700',
    color: '#F0F0F2',
    textAlign: 'center',
    marginBottom: 24,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(184, 123, 90, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 16,
    fontWeight: '600',
    color: '#F0F0F2',
  },
  optionSubtitle: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 13,
    color: '#8A8A96',
    marginTop: 2,
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 16,
    fontWeight: '600',
    color: '#8A8A96',
  },
});

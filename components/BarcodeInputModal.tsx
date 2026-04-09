import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Keyboard } from 'react-native';
import { FontNames } from '../lib/fontNames';
import { Icon } from './Icon';

interface BarcodeInputModalProps {
  visible: boolean;
  onClose: () => void;
  onBarcodeSubmit: (barcode: string) => void;
  title?: string;
}

export function BarcodeInputModal({ 
  visible, 
  onClose, 
  onBarcodeSubmit, 
  title = 'Escanear Codigo' 
}: BarcodeInputModalProps) {
  const [barcode, setBarcode] = useState('');

  useEffect(() => {
    if (visible) {
      setBarcode('');
    }
  }, [visible]);

  const handleSubmit = useCallback(() => {
    if (barcode.trim()) {
      onBarcodeSubmit(barcode.trim());
      setBarcode('');
      onClose();
    }
  }, [barcode, onBarcodeSubmit, onClose]);

  useEffect(() => {
    if (barcode.endsWith('\n') || barcode.endsWith('\r')) {
      handleSubmit();
    }
  }, [barcode, handleSubmit]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={styles.modal}>
          <TouchableOpacity activeOpacity={1}>
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Icon name="close" size={20} color="#8A8A96" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Codigo de barras:</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={barcode}
                onChangeText={setBarcode}
                placeholder="Escanea o escribe..."
                placeholderTextColor="#6A6A72"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                autoFocus
              />
            </View>

            <Text style={styles.hint}>
              Usa el lector Bluetooth o escribe manualmente
            </Text>

            <TouchableOpacity 
              style={[styles.submitBtn, !barcode.trim() && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!barcode.trim()}
            >
              <Text style={styles.submitBtnText}>Aceptar</Text>
            </TouchableOpacity>
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
    backgroundColor: 'rgba(30, 30, 40, 0.98)',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.3)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#F0F0F2',
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    color: '#F0F0F2',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  inputContainer: {
    backgroundColor: 'rgba(20, 20, 26, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.3)',
    marginBottom: 10,
  },
  input: {
    color: '#F0F0F2',
    fontSize: 16,
    fontFamily: FontNames.jetBrainsMono,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  hint: {
    color: '#6A6A72',
    fontSize: 12,
    marginBottom: 20,
  },
  submitBtn: {
    backgroundColor: '#B87B5A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: 'rgba(184, 123, 90, 0.3)',
  },
  submitBtnText: {
    color: '#F0F0F2',
    fontSize: 16,
    fontWeight: '600',
  },
});

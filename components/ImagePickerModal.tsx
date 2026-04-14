import { Modal, View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from './Text';
import { FontNames } from '../lib/fontNames';
import { Icon } from './Icon';
import { scale, verticalScale, moderateScale } from '../lib/responsive';

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
    padding: scale(20),
  },
  modal: {
    backgroundColor: 'rgba(10, 10, 12, 0.95)',
    borderRadius: scale(24),
    padding: scale(24),
    width: '100%',
    maxWidth: scale(340),
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.3)',
  },
  title: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(20),
    fontWeight: '700',
    color: '#F0F0F2',
    textAlign: 'center',
    marginBottom: verticalScale(24),
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(16),
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: scale(16),
    marginBottom: verticalScale(12),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  iconContainer: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(12),
    backgroundColor: 'rgba(184, 123, 90, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(14),
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#F0F0F2',
  },
  optionSubtitle: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(13),
    color: '#8A8A96',
    marginTop: verticalScale(2),
  },
  cancelButton: {
    paddingVertical: verticalScale(16),
    alignItems: 'center',
    marginTop: verticalScale(8),
  },
  cancelText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#8A8A96',
  },
});

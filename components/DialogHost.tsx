import React, { memo, useCallback } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from './Text';
import { FontNames } from '../lib/fontNames';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale, moderateScale } from '../lib/responsive';
import { useDialogStore, type DialogButton, type DialogButtonStyle } from '../store/dialogStore';

const variantStyles = (style: DialogButtonStyle = 'default') => {
  switch (style) {
    case 'destructive':
      return { container: styles.buttonDestructive, label: styles.buttonTextOnDark };
    case 'cancel':
      return { container: styles.buttonCancel, label: styles.buttonTextMuted };
    default:
      return { container: styles.buttonDefault, label: styles.buttonTextOnGold };
  }
};

/**
 * Renders the dialogs queued by `showDialog` on web. Mount it once, at the app root.
 *
 * The Modal is mounted only while a dialog is pending, and keyed by dialog id, on
 * purpose: react-native-web appends each Modal's portal to document.body on its first
 * render and gives every modal the same z-index, so stacking follows DOM order. A host
 * that stayed mounted would end up *behind* modals opened later (the sale detail, the
 * client sheet). `animationType="none"` makes it the active modal right away, so the
 * Escape key and the focus trap follow the dialog instead of the modal underneath.
 */
export const DialogHost = memo(function DialogHost() {
  const dialog = useDialogStore((state) => state.queue[0]);
  const dismiss = useDialogStore((state) => state.dismiss);

  const handlePress = useCallback(
    (button: DialogButton) => {
      if (!dialog) return;
      // Close first, like the native alert does: the handler may open another dialog.
      dismiss(dialog.id);
      button.onPress?.();
    },
    [dialog, dismiss]
  );

  const handleRequestClose = useCallback(() => {
    if (!dialog) return;
    const cancelButton = dialog.buttons.find((button) => button.style === 'cancel');
    if (cancelButton) {
      handlePress(cancelButton);
      return;
    }
    if (dialog.buttons.length === 1) {
      handlePress(dialog.buttons[0]);
    }
  }, [dialog, handlePress]);

  if (!dialog) return null;

  const isStacked = dialog.buttons.length > 2;

  return (
    <Modal
      key={dialog.id}
      testID="app-dialog-modal"
      visible
      transparent
      animationType="none"
      onRequestClose={handleRequestClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card} testID="app-dialog" accessibilityRole="alert">
          <Text style={styles.title}>{dialog.title}</Text>
          {dialog.message ? <Text style={styles.message}>{dialog.message}</Text> : null}

          <View style={[styles.actions, isStacked ? styles.actionsStacked : styles.actionsRow]}>
            {dialog.buttons.map((button, index) => {
              const variant = variantStyles(button.style);
              return (
                <TouchableOpacity
                  key={`${button.text}-${index}`}
                  style={[styles.button, variant.container, isStacked && styles.buttonStacked]}
                  onPress={() => handlePress(button)}
                  accessibilityRole="button"
                  accessibilityLabel={button.text}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.buttonText, variant.label]}>{button.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 7, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(24),
  },
  card: {
    width: '100%',
    maxWidth: scale(380),
    borderRadius: tokens.radius.modal,
    backgroundColor: tokens.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
    padding: scale(24),
    gap: verticalScale(10),
  },
  title: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: tokens.colors.text,
  },
  message: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(14),
    lineHeight: moderateScale(20),
    color: tokens.colors.textSecondary,
  },
  actions: {
    marginTop: verticalScale(10),
    gap: scale(12),
  },
  actionsRow: {
    flexDirection: 'row',
  },
  actionsStacked: {
    flexDirection: 'column',
  },
  button: {
    flex: 1,
    height: verticalScale(50),
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  buttonStacked: {
    flex: 0,
    width: '100%',
  },
  buttonDefault: {
    backgroundColor: tokens.colors.gold,
    borderColor: tokens.colors.gold,
  },
  buttonCancel: {
    backgroundColor: tokens.colors.surface,
    borderColor: tokens.colors.borderLight,
  },
  buttonDestructive: {
    backgroundColor: tokens.colors.coralDim,
    borderColor: tokens.colors.coral,
  },
  buttonText: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(14),
    fontWeight: '700',
  },
  buttonTextOnGold: {
    color: tokens.colors.onGold,
  },
  buttonTextMuted: {
    color: tokens.colors.textMuted,
  },
  buttonTextOnDark: {
    color: '#FFFFFF',
  },
});

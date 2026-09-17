import { Alert, Platform } from 'react-native';
import { useDialogStore, type DialogButton } from '../store/dialogStore';

export type { DialogButton, DialogButtonStyle } from '../store/dialogStore';

const DEFAULT_BUTTONS: DialogButton[] = [{ text: 'OK' }];

/**
 * Cross-platform replacement for `Alert.alert`.
 *
 * react-native-web ships Alert as an empty stub (`class Alert { static alert() {} }`),
 * so on the PWA every confirmation and error built on it did nothing at all. Native
 * platforms keep the OS alert, which presents above any open Modal; web renders the
 * queued dialog through `components/DialogHost`.
 *
 * This is the only module allowed to import `Alert` — see
 * `__tests__/architecture/platformSafety.test.ts`.
 */
export function showDialog(title: string, message?: string, buttons?: DialogButton[]): void {
  const resolvedButtons = buttons && buttons.length > 0 ? buttons : DEFAULT_BUTTONS;

  if (Platform.OS !== 'web') {
    Alert.alert(title, message, resolvedButtons);
    return;
  }

  useDialogStore.getState().enqueue({ title, message, buttons: resolvedButtons });
}

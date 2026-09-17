// Helpers for testing flows that go through `showDialog` (lib/dialog).
// Lives outside __tests__ because jest treats every file there as a suite.
import { Platform } from 'react-native';
import { fireEvent, screen, within } from '@testing-library/react-native';
import { useDialogStore } from '../store/dialogStore';

export type TestPlatform = 'ios' | 'android' | 'web';

/** Switches Platform.OS and returns a restore function. */
export function setPlatformOS(os: TestPlatform): () => void {
  const previous = Platform.OS;
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true, writable: true });
  return () => {
    Object.defineProperty(Platform, 'OS', { value: previous, configurable: true, writable: true });
  };
}

/** Runs `action` as if the app were running on `os`, then restores the platform. */
export async function withPlatformOS<T>(os: TestPlatform, action: () => T | Promise<T>): Promise<T> {
  const restore = setPlatformOS(os);
  try {
    return await action();
  } finally {
    restore();
  }
}

/** Empties the dialog queue between tests. */
export function resetDialogs(): void {
  useDialogStore.getState().reset();
}

/** Scoped queries for the visible dialog, so button labels can be reused elsewhere. */
export function getDialog() {
  return within(screen.getByTestId('app-dialog'));
}

export async function pressDialogButton(name: string): Promise<void> {
  await fireEvent.press(getDialog().getByRole('button', { name }));
}

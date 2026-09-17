import { Alert } from 'react-native';
import { showDialog } from '../../lib/dialog';
import { useDialogStore, type DialogButton } from '../../store/dialogStore';
import { resetDialogs, withPlatformOS } from '../../test-utils/dialog';

describe('showDialog', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    resetDialogs();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  const confirmButtons = (onPress: () => void): DialogButton[] => [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress },
  ];

  it('delegates to the native Alert on native platforms', async () => {
    const onPress = jest.fn();
    const buttons = confirmButtons(onPress);

    await withPlatformOS('ios', () =>
      showDialog('Eliminar Venta', '¿Eliminar esta venta? El stock será restaurado.', buttons)
    );

    expect(alertSpy).toHaveBeenCalledWith(
      'Eliminar Venta',
      '¿Eliminar esta venta? El stock será restaurado.',
      buttons
    );
    expect(useDialogStore.getState().queue).toHaveLength(0);
  });

  it('queues an in-app dialog on web, where Alert.alert is a no-op', async () => {
    const onPress = jest.fn();
    const buttons = confirmButtons(onPress);

    await withPlatformOS('web', () => showDialog('Eliminar Venta', '¿Eliminar esta venta?', buttons));

    expect(alertSpy).not.toHaveBeenCalled();
    const [queued] = useDialogStore.getState().queue;
    expect(queued).toMatchObject({
      title: 'Eliminar Venta',
      message: '¿Eliminar esta venta?',
      buttons,
    });
  });

  it('falls back to a single OK button when no buttons are given', async () => {
    await withPlatformOS('web', () => showDialog('Error', 'No se pudo generar el PDF'));

    expect(useDialogStore.getState().queue[0].buttons).toEqual([{ text: 'OK' }]);
  });

  it('reads the platform at call time, not at import time', async () => {
    await withPlatformOS('web', () => showDialog('Web', undefined, [{ text: 'OK' }]));
    await withPlatformOS('android', () => showDialog('Native', undefined, [{ text: 'OK' }]));

    expect(useDialogStore.getState().queue).toHaveLength(1);
    expect(useDialogStore.getState().queue[0].title).toBe('Web');
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith('Native', undefined, [{ text: 'OK' }]);
  });

  it('keeps every queued dialog addressable by a unique id', async () => {
    await withPlatformOS('web', () => {
      showDialog('Primero', undefined, [{ text: 'OK' }]);
      showDialog('Segundo', undefined, [{ text: 'OK' }]);
    });

    const { queue, dismiss } = useDialogStore.getState();
    expect(queue.map((dialog) => dialog.id)).toEqual([queue[0].id, queue[1].id]);
    expect(queue[0].id).not.toBe(queue[1].id);

    dismiss(queue[0].id);
    expect(useDialogStore.getState().queue.map((dialog) => dialog.title)).toEqual(['Segundo']);
  });
});

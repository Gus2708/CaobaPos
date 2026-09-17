import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { DialogHost } from '../../components/DialogHost';
import { useDialogStore, type DialogButton } from '../../store/dialogStore';
import { getDialog, pressDialogButton, resetDialogs } from '../../test-utils/dialog';

const enqueue = (title: string, message?: string, buttons: DialogButton[] = [{ text: 'OK' }]) =>
  useDialogStore.getState().enqueue({ title, message, buttons });

describe('DialogHost', () => {
  beforeEach(resetDialogs);

  it('renders nothing while the queue is empty', async () => {
    await render(<DialogHost />);

    expect(screen.queryByTestId('app-dialog')).not.toBeOnTheScreen();
  });

  it('shows the title, the message and every button', async () => {
    enqueue('Eliminar Venta', '¿Eliminar esta venta? El stock será restaurado.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive' },
    ]);
    await render(<DialogHost />);

    const dialog = getDialog();
    expect(dialog.getByText('Eliminar Venta')).toBeOnTheScreen();
    expect(dialog.getByText('¿Eliminar esta venta? El stock será restaurado.')).toBeOnTheScreen();
    expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeOnTheScreen();
    expect(dialog.getByRole('button', { name: 'Eliminar' })).toBeOnTheScreen();
  });

  it('runs the pressed handler once and closes', async () => {
    const onDelete = jest.fn();
    enqueue('Eliminar Venta', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: onDelete },
    ]);
    await render(<DialogHost />);

    await pressDialogButton('Eliminar');

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('app-dialog')).not.toBeOnTheScreen();
  });

  it('does not run the destructive handler when cancelling', async () => {
    const onDelete = jest.fn();
    const onCancel = jest.fn();
    enqueue('Eliminar Venta', undefined, [
      { text: 'Cancelar', style: 'cancel', onPress: onCancel },
      { text: 'Eliminar', style: 'destructive', onPress: onDelete },
    ]);
    await render(<DialogHost />);

    await pressDialogButton('Cancelar');

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByTestId('app-dialog')).not.toBeOnTheScreen();
  });

  it('shows a dialog opened from another dialog handler', async () => {
    enqueue('Eliminar Abono', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => enqueue('Error', 'Error al eliminar abono'),
      },
    ]);
    await render(<DialogHost />);

    await pressDialogButton('Eliminar');

    expect(getDialog().getByText('Error al eliminar abono')).toBeOnTheScreen();
  });

  it('supports the multi-option payment picker', async () => {
    const onCash = jest.fn();
    const onCard = jest.fn();
    const onTransfer = jest.fn();
    enqueue('Saldar Venta', '¿Con qué método de pago se realiza el abono?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Efectivo', onPress: onCash },
      { text: 'Tarjeta', onPress: onCard },
      { text: 'Transferencia', onPress: onTransfer },
    ]);
    await render(<DialogHost />);

    await pressDialogButton('Transferencia');

    expect(onTransfer).toHaveBeenCalledTimes(1);
    expect(onCash).not.toHaveBeenCalled();
    expect(onCard).not.toHaveBeenCalled();
  });

  it('treats a close request (Escape or hardware back) as cancel', async () => {
    const onDelete = jest.fn();
    const onCancel = jest.fn();
    enqueue('Eliminar Cliente', undefined, [
      { text: 'Cancelar', style: 'cancel', onPress: onCancel },
      { text: 'Eliminar', style: 'destructive', onPress: onDelete },
    ]);
    await render(<DialogHost />);

    await fireEvent(screen.getByTestId('app-dialog-modal'), 'requestClose');

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByTestId('app-dialog')).not.toBeOnTheScreen();
  });
});

import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SaleDetailModal } from '../../components/SaleDetailModal';
import { DialogHost } from '../../components/DialogHost';
import { pressDialogButton, resetDialogs, setPlatformOS } from '../../test-utils/dialog';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

jest.mock('../../lib/receiptGenerator', () => ({
  shareReceiptPDF: jest.fn().mockResolvedValue(undefined),
}));

const sale = {
  id: 'd3ae64dd-1111-4222-8333-444444444444',
  total_amount: 1,
  exchange_rate: 827.74,
  total_amount_bs: 827.74,
  payment_method: 'credito',
  created_at: '2026-09-10T15:38:00.000Z',
  iva_enabled: false,
  tax_amount: 0,
  employee_name: 'Gustavo',
  sale_items: [
    {
      id: 'item-1',
      sale_id: 'd3ae64dd-1111-4222-8333-444444444444',
      product_id: 'product-1',
      product_name: 'Chis kesitos tocineta',
      quantity: 1,
      unit_price: 1,
      subtotal: 1,
    },
  ],
};

const renderSaleDetail = async (onDelete: jest.Mock) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <>
      <SaleDetailModal
        visible
        sale={sale}
        onClose={jest.fn()}
        onDelete={onDelete}
        onUpdate={jest.fn()}
        isDeleting={false}
        isUpdating={false}
      />
      <DialogHost />
    </>,
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    }
  );
};

describe('SaleDetailModal delete flow', () => {
  beforeEach(resetDialogs);

  it('confirms and deletes on web, where Alert.alert does nothing', async () => {
    const onDelete = jest.fn();
    await renderSaleDetail(onDelete);

    const restorePlatform = setPlatformOS('web');
    try {
      await fireEvent.press(screen.getByText('Eliminar'));

      expect(screen.getByTestId('app-dialog')).toBeOnTheScreen();
      expect(screen.getByText('¿Eliminar esta venta? El stock será restaurado.')).toBeOnTheScreen();

      await pressDialogButton('Eliminar');
    } finally {
      restorePlatform();
    }

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('app-dialog')).not.toBeOnTheScreen();
  });

  it('does not delete when the confirmation is cancelled on web', async () => {
    const onDelete = jest.fn();
    await renderSaleDetail(onDelete);

    const restorePlatform = setPlatformOS('web');
    try {
      await fireEvent.press(screen.getByText('Eliminar'));
      await pressDialogButton('Cancelar');
    } finally {
      restorePlatform();
    }

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByTestId('app-dialog')).not.toBeOnTheScreen();
  });

  it('still uses the OS alert on native', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onDelete = jest.fn();
    await renderSaleDetail(onDelete);

    const restorePlatform = setPlatformOS('ios');
    try {
      await fireEvent.press(screen.getByText('Eliminar'));
    } finally {
      restorePlatform();
    }

    expect(alertSpy).toHaveBeenCalledWith(
      'Eliminar Venta',
      '¿Eliminar esta venta? El stock será restaurado.',
      expect.any(Array)
    );

    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    buttons.find((button) => button.text === 'Eliminar')?.onPress?.();

    expect(onDelete).toHaveBeenCalledTimes(1);
    alertSpy.mockRestore();
  });
});

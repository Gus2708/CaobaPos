import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CustomDateRangeModal } from '../../components/CustomDateRangeModal';

describe('CustomDateRangeModal', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    initialStartDate: new Date(2026, 9, 10, 0, 0, 0).toISOString(),
    initialEndDate: new Date(2026, 10, 9, 23, 59, 59).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all three date selector columns: Día, Mes, and Año', async () => {
    await render(<CustomDateRangeModal {...defaultProps} />);

    expect(screen.getByText('Rango de Fechas')).toBeTruthy();
    expect(screen.getByText('Día')).toBeTruthy();
    expect(screen.getByText('Mes')).toBeTruthy();
    expect(screen.getByText('Año')).toBeTruthy();

    const diaInput = screen.getByLabelText('Día');
    const mesInput = screen.getByLabelText('Mes');
    const anioInput = screen.getByLabelText('Año');

    expect(diaInput.props.value).toBe('10');
    expect(mesInput.props.value).toBe('10');
    expect(anioInput.props.value).toBe('2026');
  });

  it('adjusts day value when tapping day arrows', async () => {
    await render(<CustomDateRangeModal {...defaultProps} />);

    const dayUpBtn = screen.getByLabelText('Aumentar día');
    await fireEvent.press(dayUpBtn);

    const diaInput = screen.getByLabelText('Día');
    expect(diaInput.props.value).toBe('11');

    const dayDownBtn = screen.getByLabelText('Disminuir día');
    await fireEvent.press(dayDownBtn);

    expect(screen.getByLabelText('Día').props.value).toBe('10');
  });

  it('switches between DESDE and HASTA tabs', async () => {
    await render(<CustomDateRangeModal {...defaultProps} />);

    const hastaTab = screen.getByText('HASTA');
    await fireEvent.press(hastaTab);

    // End date day is 9
    const diaInput = screen.getByLabelText('Día');
    expect(diaInput.props.value).toBe('09');
  });

  it('calls onConfirm with start and end ISO strings', async () => {
    await render(<CustomDateRangeModal {...defaultProps} />);

    const confirmBtn = screen.getByText('Confirmar Periodo');
    await fireEvent.press(confirmBtn);

    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    const [startArg, endArg] = defaultProps.onConfirm.mock.calls[0];
    const startDate = new Date(startArg);
    const endDate = new Date(endArg);
    expect(startDate.getFullYear()).toBe(2026);
    expect(startDate.getMonth()).toBe(9); // Octobre
    expect(startDate.getDate()).toBe(10);
    expect(endDate.getFullYear()).toBe(2026);
    expect(endDate.getMonth()).toBe(10); // Noviembre
    expect(endDate.getDate()).toBe(9);
  });

  it('calls onClose when clicking close button', async () => {
    await render(<CustomDateRangeModal {...defaultProps} />);

    const closeBtn = screen.getByLabelText('Cerrar');
    await fireEvent.press(closeBtn);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});

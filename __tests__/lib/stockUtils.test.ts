import { validateStockAddition } from '../../lib/stockUtils';

describe('validateStockAddition', () => {
  it('blocks addition and returns appropriate error when product is out of stock (stock is 0)', () => {
    const result = validateStockAddition('Torta Vainilla', 0, 0);
    expect(result).toEqual({
      isValid: false,
      errorType: 'out_of_stock',
      errorMessage: 'Torta Vainilla sin stock',
    });
  });

  it('blocks addition and returns appropriate error when product stock is negative', () => {
    const result = validateStockAddition('Cafe Mocha', -5, 0);
    expect(result).toEqual({
      isValid: false,
      errorType: 'out_of_stock',
      errorMessage: 'Cafe Mocha sin stock',
    });
  });

  it('allows addition when within stock limits (happy path, empty cart)', () => {
    const result = validateStockAddition('Helado de Chocolate', 3, 0);
    expect(result).toEqual({
      isValid: true,
    });
  });

  it('allows addition when within stock limits (happy path, item already in cart)', () => {
    const result = validateStockAddition('Helado de Chocolate', 3, 1);
    expect(result).toEqual({
      isValid: true,
    });
  });

  it('blocks addition when quantity would exceed stock limit (adding 1 when already at capacity)', () => {
    const result = validateStockAddition('Helado de Chocolate', 2, 2);
    expect(result).toEqual({
      isValid: false,
      errorType: 'insufficient_stock',
      errorMessage: 'Stock insuficiente para agregar más',
    });
  });

  it('blocks addition when quantity already exceeds stock limit (e.g., stock changed/decreased)', () => {
    const result = validateStockAddition('Helado de Chocolate', 2, 3);
    expect(result).toEqual({
      isValid: false,
      errorType: 'insufficient_stock',
      errorMessage: 'Stock insuficiente para agregar más',
    });
  });

  it('allows addition when stock is exactly 1 and cart is empty', () => {
    const result = validateStockAddition('Single Pack Sugar', 1, 0);
    expect(result).toEqual({
      isValid: true,
    });
  });

  it('blocks addition when stock is exactly 1 and cart has 1', () => {
    const result = validateStockAddition('Single Pack Sugar', 1, 1);
    expect(result).toEqual({
      isValid: false,
      errorType: 'insufficient_stock',
      errorMessage: 'Stock insuficiente para agregar más',
    });
  });
});

export interface ValidationResult {
  isValid: boolean;
  errorType?: 'out_of_stock' | 'insufficient_stock';
  errorMessage?: string;
}

export function validateStockAddition(
  productName: string,
  stockQuantity: number,
  currentQuantityInCart: number
): ValidationResult {
  if (stockQuantity <= 0) {
    return {
      isValid: false,
      errorType: 'out_of_stock',
      errorMessage: `${productName} sin stock`,
    };
  }
  if (currentQuantityInCart + 1 > stockQuantity) {
    return {
      isValid: false,
      errorType: 'insufficient_stock',
      errorMessage: 'Stock insuficiente para agregar más',
    };
  }
  return { isValid: true };
}

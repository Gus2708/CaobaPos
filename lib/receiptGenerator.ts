import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { LOGO_BASE64, ISOTIPO_BASE64, BRAND_COLORS } from './brandAssets';

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface ReceiptData {
  saleId: string;
  date: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  exchangeRate?: number;
  totalAmountBs?: number;
}

const getPaymentLabel = (method: string) => {
  const labels: Record<string, string> = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia',
    credito: 'Crédito',
  };
  return labels[method] || method;
};

const BRAND_COLOR = BRAND_COLORS.primary;
const TEXT_COLOR = BRAND_COLORS.text;
const MUTED_COLOR = BRAND_COLORS.muted;
const BORDER_COLOR = BRAND_COLORS.border;

export const generateReceiptHTML = (data: ReceiptData) => {
  const itemsHTML = data.items
    .map(
      (item) => `
      <tr class="item-row">
        <td class="item-name">
          <div class="name">${item.name}</div>
          <div class="details">$${item.price.toFixed(2)} x ${item.quantity}</div>
        </td>
        <td class="item-total">$${item.subtotal.toFixed(2)}</td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Parkinsans:wght@400;600;700;800&display=swap');
          * { box-sizing: border-box; }
          body { 
            font-family: 'Parkinsans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: ${TEXT_COLOR}; 
            padding: 40px 20px; 
            max-width: 400px; 
            margin: 0 auto;
            background-color: white;
          }
          
          .header { text-align: center; margin-bottom: 30px; }
          .logo { width: 140px; height: auto; margin-bottom: 5px; }
          .subtitle { font-size: 11px; color: ${MUTED_COLOR}; margin-top: 0px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
          
          .receipt-info { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 25px; 
            padding-bottom: 15px;
            border-bottom: 1px solid ${BORDER_COLOR};
            font-size: 11px;
            color: ${MUTED_COLOR};
          }
          .folio { font-family: "Courier New", Courier, monospace; font-weight: 700; color: ${TEXT_COLOR}; }

          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .item-row td { padding: 12px 0; border-bottom: 1px solid ${BORDER_COLOR}; }
          .item-name .name { font-weight: 600; font-size: 14px; margin-bottom: 2px; }
          .item-name .details { font-size: 12px; color: ${MUTED_COLOR}; }
          .item-total { text-align: right; font-family: "Courier New", Courier, monospace; font-weight: 700; font-size: 14px; vertical-align: top; padding-top: 12px !important; }

          .summary { margin-top: 20px; }
          .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
          .summary-label { color: ${MUTED_COLOR}; }
          .summary-value { font-family: "Courier New", Courier, monospace; font-weight: 500; }
          
          .total-row { 
            margin-top: 15px;
            padding-top: 15px;
            border-top: 2px solid ${TEXT_COLOR};
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .total-label { font-weight: 800; font-size: 18px; }
          .total-value { font-family: "Courier New", Courier, monospace; font-weight: 800; font-size: 24px; color: ${BRAND_COLOR}; }

          .payment-info { 
            margin-top: 30px; 
            text-align: center; 
            padding: 15px;
            background-color: #F9F9FB;
            border-radius: 12px;
          }
          .payment-method { font-weight: 700; font-size: 14px; color: ${BRAND_COLOR}; }
          .payment-label { font-size: 11px; color: ${MUTED_COLOR}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }

          .footer { 
            margin-top: 40px; 
            text-align: center; 
            font-size: 12px; 
            color: ${MUTED_COLOR}; 
            line-height: 1.6;
          }
          .thanks { font-weight: 700; color: ${TEXT_COLOR}; margin-bottom: 5px; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${LOGO_BASE64}" class="logo" />
          <div class="subtitle">PUNTO DE VENTA</div>
        </div>
        
        <div class="receipt-info">
          <div>FECHA: ${data.date}</div>
          <div>FOLIO: <span class="folio">${data.saleId.slice(0, 8).toUpperCase()}</span></div>
        </div>
        
        <table>
          ${itemsHTML}
        </table>
        
        <div class="summary">
          <div class="summary-row">
            <span class="summary-label">Subtotal</span>
            <span class="summary-value">$${data.subtotal.toFixed(2)}</span>
          </div>
          ${data.tax > 0 ? `
          <div class="summary-row">
            <span class="summary-label">IVA (16%)</span>
            <span class="summary-value">$${data.tax.toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="total-row">
            <span class="total-label">TOTAL</span>
            <div style="text-align: right;">
              <span class="total-label" style="font-size: 24px; color: ${BRAND_COLOR};">$${data.total.toFixed(2)}</span>
              ${data.totalAmountBs ? `<div style="font-size: 13px; color: ${MUTED_COLOR}; margin-top: 3px; font-weight: 600;">Bs. ${Number(data.totalAmountBs).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>` : ''}
            </div>
          </div>
          ${data.exchangeRate ? `<div style="font-size: 11px; color: ${MUTED_COLOR}; margin-top: 4px; text-align: right;">Tasa BCV: ${Number(data.exchangeRate).toFixed(2)} Bs/$</div>` : ''}
        </div>
        
        <div class="payment-info">
          <div class="payment-label">Método de Pago</div>
          <div class="payment-method">${getPaymentLabel(data.paymentMethod)}</div>
        </div>
        
        <div class="footer">
          <div class="thanks">¡Gracias por su compra!</div>
          <div>Vuelva pronto</div>
          <div style="margin-top: 20px; font-size: 9px; opacity: 0.5;">CAOBA POS • SOLUCIONES DIGITALES</div>
        </div>
      </body>
    </html>
  `;
};

export const shareReceiptPDF = async (data: ReceiptData) => {
  try {
    const html = generateReceiptHTML(data);
    const { uri } = await Print.printToFileAsync({ html });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Compartir Recibo',
      });
    }
    return uri;
  } catch (error) {
    console.error('Error sharing PDF:', error);
    throw error;
  }
};

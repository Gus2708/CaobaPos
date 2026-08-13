import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { LOGO_BASE64, ISOTIPO_BASE64, BRAND_COLORS } from './brandAssets';

interface Sale {
  id: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
}

interface Metrics {
  revenue: number;
  cost: number;
  profit: number;
  pendingCredit?: number;
  receivedMoney?: number;
}

const methodLabels: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  credito: 'Crédito'
};

const BRAND_COLOR = BRAND_COLORS.primary;
const TEXT_COLOR = BRAND_COLORS.text;
const MUTED_COLOR = BRAND_COLORS.muted;
const BORDER_COLOR = BRAND_COLORS.border;
const BACKGROUND_COLOR = BRAND_COLORS.background;

export const generateReport = async (sales: Sale[], metrics: Metrics, title: string) => {
  const today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const salesHtml = sales.map((sale, index) => `
    <tr class="item-row">
      <td style="padding: 12px 10px; border-bottom: 1px solid ${BORDER_COLOR}; font-size: 13px;">${index + 1}</td>
      <td style="padding: 12px 10px; border-bottom: 1px solid ${BORDER_COLOR}; font-size: 13px;">${new Date(sale.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td>
      <td style="padding: 12px 10px; border-bottom: 1px solid ${BORDER_COLOR}; font-size: 13px;">${methodLabels[sale.payment_method] || sale.payment_method}</td>
      <td style="padding: 12px 10px; border-bottom: 1px solid ${BORDER_COLOR}; text-align: right; font-weight: 700; font-family: 'JetBrains Mono', monospace; font-size: 13px;">$${Number(sale.total_amount).toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Parkinsans:wght@400;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
          * { box-sizing: border-box; }
          body { 
            font-family: 'Parkinsans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: ${TEXT_COLOR}; 
            padding: 40px; 
            max-width: 800px; 
            margin: 0 auto;
            background-color: white;
          }
          
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid ${TEXT_COLOR}; padding-bottom: 20px; }
          .header-left { flex: 1; }
          .logo { width: 180px; height: auto; margin-bottom: 10px; }
          .report-title { font-size: 24px; font-weight: 800; color: ${BRAND_COLOR}; margin: 0; text-transform: uppercase; letter-spacing: -0.5px; }
          .report-date { font-size: 14px; color: ${MUTED_COLOR}; margin-top: 5px; font-weight: 600; }
          
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
          .summary-card { padding: 20px; border-radius: 16px; background-color: ${BACKGROUND_COLOR}; border: 1px solid ${BORDER_COLOR}; }
          .summary-label { font-size: 11px; color: ${MUTED_COLOR}; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; margin-bottom: 8px; }
          .summary-value { font-family: "Courier New", Courier, monospace; font-size: 22px; font-weight: 700; color: ${TEXT_COLOR}; }
          .profit-value { color: ${BRAND_COLORS.success}; }
          .credit-value { color: ${BRAND_COLORS.warning}; }

          .section-title { font-size: 16px; font-weight: 800; margin-bottom: 15px; color: ${TEXT_COLOR}; text-transform: uppercase; letter-spacing: 0.5px; }
          
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          thead th { text-align: left; padding: 12px 10px; border-bottom: 2px solid ${TEXT_COLOR}; font-size: 12px; color: ${MUTED_COLOR}; text-transform: uppercase; font-weight: 700; }
          
          .footer { 
            margin-top: 60px; 
            text-align: center; 
            font-size: 11px; 
            color: ${MUTED_COLOR}; 
            border-top: 1px solid ${BORDER_COLOR}; 
            padding-top: 25px;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <img src="${LOGO_BASE64}" class="logo" />
            <h1 class="report-title">${title}</h1>
            <div class="report-date">${today}</div>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-label">Ventas Totales</div>
            <div class="summary-value">$${metrics.revenue.toFixed(2)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Dinero en Caja</div>
            <div class="summary-value" style="color: ${BRAND_COLORS.info};">$${(metrics.receivedMoney || 0).toFixed(2)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Ganancia Est.</div>
            <div class="summary-value profit-value">$${metrics.profit.toFixed(2)}</div>
          </div>
          ${metrics.pendingCredit ? `
          <div class="summary-card" style="grid-column: span 3; background-color: #FFF9F2; border-color: #FFEBD6;">
            <div class="summary-label" style="color: #CD9B46;">Crédito Pendiente por Cobrar</div>
            <div class="summary-value credit-value">$${metrics.pendingCredit.toFixed(2)}</div>
          </div>
          ` : ''}
        </div>

        <div class="section-title">Detalle de Ventas</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Hora</th>
              <th>Método</th>
              <th style="text-align: right;">Monto</th>
            </tr>
          </thead>
          <tbody>
            ${salesHtml}
          </tbody>
        </table>

        <div class="footer">
          <div style="font-weight: 700; color: ${TEXT_COLOR}; margin-bottom: 5px;">CAOBA POS • SOLUCIONES DIGITALES</div>
          <div>Este documento fue generado automáticamente por el sistema.</div>
          <div>© ${new Date().getFullYear()} Caoba Punto de Venta</div>
        </div>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (Platform.OS === 'ios') {
      await Sharing.shareAsync(uri);
    } else {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Guardar Resumen Financiero' });
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export const generatePaymentMethodReport = async (sales: Sale[], totalAmount: number, methodName: string, periodLabel: string) => {
  const today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const salesHtml = sales.map((sale, index) => `
    <tr class="item-row">
      <td style="padding: 12px 10px; border-bottom: 1px solid ${BORDER_COLOR}; font-size: 13px;">${index + 1}</td>
      <td style="padding: 12px 10px; border-bottom: 1px solid ${BORDER_COLOR}; font-size: 13px;">${new Date(sale.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} ${new Date(sale.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td>
      <td style="padding: 12px 10px; border-bottom: 1px solid ${BORDER_COLOR}; font-size: 13px;">${methodLabels[sale.payment_method] || sale.payment_method}</td>
      <td style="padding: 12px 10px; border-bottom: 1px solid ${BORDER_COLOR}; text-align: right; font-weight: 700; font-family: 'JetBrains Mono', monospace; font-size: 13px;">$${Number(sale.total_amount).toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: ${TEXT_COLOR}; 
            padding: 40px; 
            max-width: 800px; 
            margin: 0 auto;
            background-color: white;
          }
          
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid ${TEXT_COLOR}; padding-bottom: 20px; }
          .header-left { flex: 1; }
          .logo { width: 180px; height: auto; margin-bottom: 10px; }
          .report-title { font-size: 20px; font-weight: 800; color: ${BRAND_COLOR}; margin: 0; text-transform: uppercase; line-height: 1.2; }
          .report-date { font-size: 14px; color: ${MUTED_COLOR}; margin-top: 5px; font-weight: 600; }
          
          .summary-card { padding: 30px; border-radius: 20px; background-color: ${BACKGROUND_COLOR}; border: 1px solid ${BORDER_COLOR}; text-align: center; width: 60%; margin: 0 auto 40px auto; }
          .summary-label { font-size: 12px; color: ${MUTED_COLOR}; text-transform: uppercase; font-weight: 700; letter-spacing: 1.5px; margin-bottom: 10px; }
          .summary-value { font-family: "Courier New", Courier, monospace; font-size: 32px; font-weight: 800; color: ${BRAND_COLOR}; }

          .section-title { font-size: 16px; font-weight: 800; margin-bottom: 15px; color: ${TEXT_COLOR}; text-transform: uppercase; letter-spacing: 0.5px; }
          
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          thead th { text-align: left; padding: 12px 10px; border-bottom: 2px solid ${TEXT_COLOR}; font-size: 12px; color: ${MUTED_COLOR}; text-transform: uppercase; font-weight: 700; }
          
          .footer { 
            margin-top: 60px; 
            text-align: center; 
            font-size: 11px; 
            color: ${MUTED_COLOR}; 
            border-top: 1px solid ${BORDER_COLOR}; 
            padding-top: 25px;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <img src="${LOGO_BASE64}" class="logo" />
            <h1 class="report-title">Reporte de Ventas: ${methodName}</h1>
            <div class="report-date">${periodLabel} • ${today}</div>
          </div>
        </div>

        <div class="summary-card">
          <div class="summary-label">Total Recaudado</div>
          <div class="summary-value">$${totalAmount.toFixed(2)}</div>
        </div>

        <div class="section-title">Transacciones</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Fecha y Hora</th>
              <th>Método</th>
              <th style="text-align: right;">Monto</th>
            </tr>
          </thead>
          <tbody>
            ${salesHtml}
          </tbody>
        </table>

        <div class="footer">
          <div style="font-weight: 700; color: ${TEXT_COLOR}; margin-bottom: 5px;">CAOBA POS • SOLUCIONES DIGITALES</div>
          <div>Este documento fue generado automáticamente por el sistema.</div>
          <div>© ${new Date().getFullYear()} Caoba Punto de Venta</div>
        </div>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (Platform.OS === 'ios') {
      await Sharing.shareAsync(uri);
    } else {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Guardar Reporte de Pago' });
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

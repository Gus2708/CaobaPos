import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

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
}

export const generateDailyReport = async (sales: Sale[], metrics: Metrics) => {
  const today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const salesHtml = sales.map((sale, index) => `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 10px;">${index + 1}</td>
      <td style="padding: 10px;">${new Date(sale.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td>
      <td style="padding: 10px; text-transform: capitalize;">${sale.payment_method}</td>
      <td style="padding: 10px; text-align: right; font-weight: bold;">$${Number(sale.total_amount).toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #B87B5A; padding-bottom: 20px; }
          .title { color: #B87B5A; font-size: 24px; margin: 0; }
          .subtitle { color: #666; font-size: 14px; margin-top: 5px; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
          .summary-card { padding: 15px; border-radius: 8px; background-color: #f9f9f9; border: 1px solid #eee; text-align: center; }
          .summary-label { font-size: 12px; color: #888; text-transform: uppercase; margin-bottom: 5px; }
          .summary-value { font-size: 18px; font-weight: bold; color: #333; }
          .profit-value { color: #10b981; }
          .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .th { background-color: #f5f5f5; text-align: left; padding: 12px 10px; font-size: 13px; color: #555; }
          .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #aaa; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">CAOBA POS</h1>
          <p class="subtitle">Resumen Financiero Diario</p>
          <p style="font-weight: bold; margin-top: 10px;">${today}</p>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-label">Ventas Totales</div>
            <div class="summary-value">$${metrics.revenue.toFixed(2)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Costos</div>
            <div class="summary-value" style="color: #ef4444;">-$${metrics.cost.toFixed(2)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Ganancia Neta</div>
            <div class="summary-value profit-value">$${metrics.profit.toFixed(2)}</div>
          </div>
        </div>

        <h2 style="font-size: 16px; margin-bottom: 10px; color: #555;">Detalle de Ventas</h2>
        <table class="table">
          <thead>
            <tr>
              <th class="th">#</th>
              <th class="th">Hora</th>
              <th class="th">Método</th>
              <th class="th" style="text-align: right;">Monto</th>
            </tr>
          </thead>
          <tbody>
            ${salesHtml}
          </tbody>
        </table>

        <div class="footer">
          <p>Este documento fue generado automáticamente por CaobaPOS</p>
          <p>© ${new Date().getFullYear()} Caoba Punto de Venta</p>
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

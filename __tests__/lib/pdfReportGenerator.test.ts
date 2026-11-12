import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { generateReport, generatePaymentMethodReport } from '../../lib/pdfReportGenerator';

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn().mockResolvedValue({ uri: 'file:///tmp/report.pdf' }),
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

describe('pdfReportGenerator HTML escaping (SEC-001)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('escapes HTML tags in title and unknown payment_method in generateReport', async () => {
    await generateReport(
      [
        {
          id: 'sale-1',
          total_amount: 25,
          payment_method: '<img src=x onerror=alert(1)>',
          created_at: '2026-11-11T12:00:00.000Z',
        },
      ],
      { revenue: 25, cost: 10, profit: 15 },
      '<script>alert("xss")</script>'
    );

    expect(Print.printToFileAsync).toHaveBeenCalledTimes(1);
    const html = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html as string;

    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('escapes HTML tags in methodName, periodLabel, and payment_method in generatePaymentMethodReport', async () => {
    await generatePaymentMethodReport(
      [
        {
          id: 'sale-2',
          total_amount: 10,
          payment_method: '<b>custom</b>',
          created_at: '2026-11-11T12:00:00.000Z',
        },
      ],
      10,
      '<svg onload=alert(1)>',
      'Hoy & <script>'
    );

    expect(Print.printToFileAsync).toHaveBeenCalledTimes(1);
    const html = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html as string;

    expect(html).not.toContain('<svg onload=alert(1)>');
    expect(html).not.toContain('<b>custom</b>');
    expect(html).toContain('&lt;svg onload=alert(1)&gt;');
    expect(html).toContain('Hoy &amp; &lt;script&gt;');
    expect(html).toContain('&lt;b&gt;custom&lt;/b&gt;');
  });
});

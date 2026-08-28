import { escapeHtml, generateReceiptHTML, ReceiptData } from '../../lib/receiptGenerator';

describe('Receipt Generator Security & XSS Sanitization (TDD)', () => {
  describe('escapeHtml utility', () => {
    it('escapes HTML special characters (&, <, >, ", \')', () => {
      const input = '<script>alert("XSS & injection")</script>\'';
      const output = escapeHtml(input);

      expect(output).not.toContain('<script>');
      expect(output).not.toContain('</script>');
      expect(output).not.toContain('"');
      expect(output).not.toContain("'");
      expect(output).toBe('&lt;script&gt;alert(&quot;XSS &amp; injection&quot;)&lt;/script&gt;&#39;');
    });

    it('handles empty or non-string inputs gracefully', () => {
      expect(escapeHtml('')).toBe('');
      expect(escapeHtml(null as any)).toBe('');
      expect(escapeHtml(undefined as any)).toBe('');
    });
  });

  describe('generateReceiptHTML sanitization', () => {
    const maliciousData: ReceiptData = {
      saleId: 'sale-12345<script>alert(1)</script>',
      date: '2026-08-27 <img src=x onerror=steal()>',
      employeeName: 'Juan <b onmouseover=evil()>Admin</b>',
      paymentMethod: 'cash<iframe src="evil.com">',
      items: [
        {
          name: 'Croissant <script>alert("pwned")</script>',
          price: 2.5,
          quantity: 2,
          subtotal: 5.0,
        },
      ],
      subtotal: 5.0,
      tax: 0.8,
      total: 5.8,
    };

    it('does not contain any unescaped raw HTML/scripts from user inputs', () => {
      const html = generateReceiptHTML(maliciousData);

      // Verify no raw unescaped script, img onerror, iframe, or onmouseover tags exist
      expect(html).not.toContain('<script>alert("pwned")</script>');
      expect(html).not.toContain('<img src=x onerror=steal()>');
      expect(html).not.toContain('<iframe src="evil.com">');
      expect(html).not.toContain('onmouseover=evil()');
      expect(html).not.toContain('<script>alert(1)</script>');

      // Verify they are safely HTML entity-encoded
      expect(html).toContain('&lt;script&gt;alert(&quot;pwned&quot;)&lt;/script&gt;');
      expect(html).toContain('&lt;img src=x onerror=steal()&gt;');
    });
  });
});

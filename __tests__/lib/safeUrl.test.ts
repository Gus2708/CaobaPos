import { isSafeRemoteUrl, isSafeFileOrRemoteUrl, sanitizeUrl } from '../../lib/safeUrl';

describe('Safe URL Validation & Scheme Hardening (TDD)', () => {
  describe('isSafeRemoteUrl', () => {
    it('accepts valid HTTPS URLs', () => {
      expect(isSafeRemoteUrl('https://example.supabase.co/storage/v1/product.jpg')).toBe(true);
      expect(isSafeRemoteUrl('https://images.unsplash.com/photo-123')).toBe(true);
    });

    it('rejects plain HTTP in remote URLs', () => {
      expect(isSafeRemoteUrl('http://insecure.com/image.jpg')).toBe(false);
    });

    it('rejects dangerous and script schemes', () => {
      expect(isSafeRemoteUrl('javascript:alert(1)')).toBe(false);
      expect(isSafeRemoteUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe(false);
      expect(isSafeRemoteUrl('vbscript:msgbox')).toBe(false);
      expect(isSafeRemoteUrl('file:///etc/passwd')).toBe(false);
    });

    it('rejects empty, null, or non-url strings', () => {
      expect(isSafeRemoteUrl('')).toBe(false);
      expect(isSafeRemoteUrl(null as any)).toBe(false);
      expect(isSafeRemoteUrl('not a url')).toBe(false);
    });
  });

  describe('isSafeFileOrRemoteUrl', () => {
    it('accepts local mobile URI schemes (file:// and content://)', () => {
      expect(isSafeFileOrRemoteUrl('file:///data/user/0/com.caobapos/cache/image.jpg')).toBe(true);
      expect(isSafeFileOrRemoteUrl('content://media/external/images/media/123')).toBe(true);
    });

    it('accepts valid HTTPS URLs', () => {
      expect(isSafeFileOrRemoteUrl('https://example.supabase.co/image.jpg')).toBe(true);
    });

    it('rejects dangerous script schemes', () => {
      expect(isSafeFileOrRemoteUrl('javascript:alert(document.cookie)')).toBe(false);
    });
  });

  describe('sanitizeUrl', () => {
    it('returns empty string if URL is unsafe', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
      expect(sanitizeUrl('http://insecure.com/pic.jpg')).toBe('');
    });

    it('returns the trimmed URL if it is safe', () => {
      const url = '  https://example.supabase.co/pic.jpg  ';
      expect(sanitizeUrl(url)).toBe('https://example.supabase.co/pic.jpg');
    });
  });
});

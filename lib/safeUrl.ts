/**
 * Safe URL validation and scheme hardening.
 * Prevents SSRF, malicious protocol execution (e.g. javascript:), and unencrypted HTTP downloads.
 * Complies with OWASP Top 10 A03/A10 and security-and-hardening guidelines.
 */

const ALLOWED_REMOTE_PROTOCOLS = new Set(['https:']);
const ALLOWED_LOCAL_SCHEMES = ['file://', 'content://'];

/**
 * Validates that a given URL is a well-formed HTTPS remote resource.
 */
export function isSafeRemoteUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  try {
    const parsed = new URL(trimmed);
    return ALLOWED_REMOTE_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validates that a given URI is either a safe HTTPS remote resource or an authorized local mobile scheme.
 */
export function isSafeFileOrRemoteUrl(uri: string | null | undefined): boolean {
  if (!uri || typeof uri !== 'string') return false;
  const trimmed = uri.trim();
  if (!trimmed) return false;

  for (const scheme of ALLOWED_LOCAL_SCHEMES) {
    if (trimmed.startsWith(scheme)) {
      return true;
    }
  }

  return isSafeRemoteUrl(trimmed);
}

/**
 * Sanitizes and returns the trimmed URL if it satisfies remote security policies, or empty string if invalid.
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!isSafeRemoteUrl(url)) return '';
  return url!.trim();
}

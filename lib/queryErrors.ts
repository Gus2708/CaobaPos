/**
 * Classifies errors caught around Supabase calls.
 *
 * Offline-first hooks fall back to a cached value when a request fails. That is
 * the right answer for a connectivity failure and the wrong answer for a request
 * the server actually answered and rejected: the cache cannot stand in for a
 * question the server refused, and returning it turns an auth or RLS failure
 * into a silently empty screen.
 */

/**
 * True when the failure came back from the server rather than from the network.
 *
 * Covers PostgrestError (RLS denial, malformed query, constraint violation),
 * which always carries a `code` alongside `details`/`hint`, and any error
 * carrying an HTTP status the server sent back, such as AuthApiError.
 *
 * Deliberately narrow: a fetch that never completed is a TypeError with no
 * `code`, and Node's connection errors (ENOTFOUND, ECONNREFUSED) carry a `code`
 * but none of the PostgrestError fields, so neither is misread as a rejection.
 */
export function isServerRejection(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;

  const candidate = err as Record<string, unknown>;

  if (
    typeof candidate.code === 'string' &&
    candidate.code.length > 0 &&
    'message' in candidate &&
    ('details' in candidate || 'hint' in candidate)
  ) {
    return true;
  }

  if (typeof candidate.status === 'number' && candidate.status >= 400) {
    return true;
  }

  return false;
}

import { isServerRejection } from '../../lib/queryErrors';

describe('isServerRejection', () => {
  it('treats a PostgrestError as a server rejection', () => {
    // Shape returned by supabase-js when RLS denies the read.
    const rlsDenial = {
      code: '42501',
      message: 'new row violates row-level security policy',
      details: null,
      hint: null,
    };

    expect(isServerRejection(rlsDenial)).toBe(true);
  });

  it('treats a malformed-query error as a server rejection', () => {
    const badJoin = {
      code: 'PGRST200',
      message: "Could not find a relationship between 'products' and 'categories'",
      details: 'Searched for a foreign key relationship...',
      hint: null,
    };

    expect(isServerRejection(badJoin)).toBe(true);
  });

  it('treats an auth error carrying an HTTP status as a server rejection', () => {
    const invalidKey = { name: 'AuthApiError', message: 'Invalid API key', status: 401 };

    expect(isServerRejection(invalidKey)).toBe(true);
  });

  it('does not treat a failed fetch as a server rejection', () => {
    // A request that never completed: no status, no PostgrestError fields.
    expect(isServerRejection(new TypeError('Network request failed'))).toBe(false);
  });

  it('does not treat a connection error as a server rejection', () => {
    // Node-style connection failures carry a code but none of the other fields.
    const dnsFailure = Object.assign(new Error('getaddrinfo ENOTFOUND'), {
      code: 'ENOTFOUND',
    });

    expect(isServerRejection(dnsFailure)).toBe(false);
  });

  it('does not treat a redirect or success status as a rejection', () => {
    expect(isServerRejection({ status: 200 })).toBe(false);
    expect(isServerRejection({ status: 302 })).toBe(false);
  });

  it('handles values that are not errors at all', () => {
    expect(isServerRejection(null)).toBe(false);
    expect(isServerRejection(undefined)).toBe(false);
    expect(isServerRejection('boom')).toBe(false);
    expect(isServerRejection(500)).toBe(false);
    expect(isServerRejection({})).toBe(false);
  });
});

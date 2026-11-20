export const DEFAULT_PAGE_SIZE = 1000;
export const DEFAULT_IN_CHUNK_SIZE = 100;

interface QueryResult<T> {
  data: T[] | null;
  error: any;
}

/**
 * Fetches all rows from a Supabase/PostgREST query across pages so responses
 * are never silently truncated at the default 1,000-row limit.
 * Falls back to a single await when `.range()` is unavailable (e.g. test mocks).
 */
export async function fetchAllPages<T>(
  buildQuery: () => any,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<T[]> {
  const allRows: T[] = [];
  let from = 0;

  while (true) {
    const query = buildQuery();
    const hasRange = typeof query?.range === 'function';
    const result: QueryResult<T> = hasRange
      ? await query.range(from, from + pageSize - 1)
      : await query;

    if (result?.error) {
      throw result.error;
    }

    const rows = result?.data ?? [];
    allRows.push(...rows);

    if (!hasRange || rows.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return allRows;
}

/**
 * Splits large `.in()` value lists into chunks and paginates each chunk so
 * PostgREST URL length limits and 1,000-row caps never drop records.
 */
export async function fetchByChunkedIn<T>(
  values: string[],
  buildChunkQuery: (chunk: string[]) => any,
  chunkSize = DEFAULT_IN_CHUNK_SIZE,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<T[]> {
  const uniqueValues = Array.from(new Set(values.filter(Boolean)));
  if (uniqueValues.length === 0) {
    return [];
  }

  const allRows: T[] = [];
  for (let i = 0; i < uniqueValues.length; i += chunkSize) {
    const chunk = uniqueValues.slice(i, i + chunkSize);
    const chunkRows = await fetchAllPages<T>(() => buildChunkQuery(chunk), pageSize);
    allRows.push(...chunkRows);
  }

  return allRows;
}

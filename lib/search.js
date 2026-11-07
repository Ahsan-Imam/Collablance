/**
 * lib/search.js
 *
 * Helpers for putting user-typed search text into PostgREST filters safely.
 */

/** Escape LIKE wildcards so `%` and `_` in the search text match literally. */
export function escapeLike(text) {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`)
}

/**
 * Make search text safe to embed inside a `.or()` filter string.
 * Commas, parentheses and quotes are PostgREST syntax there, so they are
 * replaced with spaces rather than letting them break (or alter) the filter.
 */
export function sanitizeForOrFilter(text) {
  return escapeLike(text.replace(/[,()"]/g, ' ').trim())
}

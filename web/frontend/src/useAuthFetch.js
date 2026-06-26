/**
 * Plain function (not a hook) that adds the Shopify session token to a fetch
 * call using the App Bridge CDN `window.shopify.idToken()` API.
 * Exported as a plain function so it's a stable reference and never causes
 * re-renders when used in useCallback dependency arrays.
 */
export async function authFetch(url, options = {}) {
  const token = await window.shopify.idToken();
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

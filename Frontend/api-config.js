// For separate hosting, set this to the backend HTTPS origin, without a trailing slash.
// Keep empty for local preview where Backend serves Frontend on the same origin.
window.BUTCHER_API_BASE = '';
window.BUTCHER_SITE_BASE = new URL('./', window.location.href).pathname;
window.butcherApiURL = path => {
  const backend = String(window.BUTCHER_API_BASE || '').replace(/\/$/, '');
  const route = `/${String(path).replace(/^\/+/, '')}`;
  return backend ? `${backend}${route}` : `${window.BUTCHER_SITE_BASE}${route.slice(1)}`;
};
window.butcherAssetURL = path => {
  const value = String(path || '');
  if (/^(?:https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith('/uploads/products/')) return window.butcherApiURL(value);
  return `${window.BUTCHER_SITE_BASE}${value.replace(/^\/+/, '')}`;
};

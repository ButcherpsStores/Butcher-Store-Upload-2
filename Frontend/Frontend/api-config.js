// The local connected server serves both folders from one origin. On GitHub Pages,
// this stays blank until a separately hosted backend URL is configured.
const isLocalButcherServer = ['localhost', '127.0.0.1'].includes(window.location.hostname);
window.BUTCHER_API_BASE = isLocalButcherServer ? window.location.origin : '';
window.BUTCHER_SITE_BASE = new URL('./', window.location.href).pathname;
window.butcherApiURL = path => {
  const backend = String(window.BUTCHER_API_BASE || '').replace(/\/$/, '');
  const route = `/${String(path).replace(/^\/+/, '')}`;
  return backend ? `${backend}${route}` : `${window.BUTCHER_SITE_BASE}${route.slice(1)}`;
};
window.butcherAssetURL = path => {
  const value = String(path || '');
  if (/^(?:https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith('/uploads/products/') || value.startsWith('/assets/products/')) return window.butcherApiURL(value);
  return `${window.BUTCHER_SITE_BASE}${value.replace(/^\/+/, '')}`;
};

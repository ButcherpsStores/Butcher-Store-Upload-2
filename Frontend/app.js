'use strict';

const STORE = { products: [], cart: readCart(), selectedProduct: null, selectedOption: '' };
const $ = selector => document.querySelector(selector);
const labels = { fortnite: 'FORTNITE', psplus: 'PS PLUS', games: 'PLAYSTATION GAME', pcgames: 'PC GAME' };
function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
}
function money(value) { return 'EGP ' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value) || 0); }
function readCart() {
  try { const value = JSON.parse(localStorage.getItem('butcher-cart-v2') || '[]'); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
function saveCart() {
  localStorage.setItem('butcher-cart-v2', JSON.stringify(STORE.cart));
  $('#cartCount').textContent = STORE.cart.reduce((sum, line) => sum + line.quantity, 0);
}
function productById(id) { return STORE.products.find(item => item.id === id); }
function optionByKey(product, key) { return (product.options || []).find(option => option.key === key); }
function unitPrice(product, key) { const option = optionByKey(product, key); return Number(option ? option.price : product.price) || 0; }
function minPrice(product) {
  const options = (product.options || []).map(option => Number(option.price)).filter(Number.isFinite);
  return options.length ? Math.min(...options) : Number(product.price) || 0;
}
function markFor(product) {
  return product.category === 'fortnite' ? 'V' : product.category === 'psplus' ? '+' : product.category === 'pcgames' ? 'PC' : 'BS';
}
window.coverFailed = image => {
  if (image.dataset.fallback && !image.dataset.fallbackTried) {
    image.dataset.fallbackTried = 'true'; image.src = image.dataset.fallback; return;
  }
  image.style.display = 'none';
};
function cover(product, detail = false) {
  const isVbucks = product.id.startsWith('fortnite-vbucks-');
  const source = product.storeImage || product.image;
  const image = source ? `<img src="${escapeHTML(butcherAssetURL(isVbucks ? '/assets/vbucks-coin.svg' : source))}"${!isVbucks && product.storeImage && product.image ? ` data-fallback="${escapeHTML(butcherAssetURL(product.image))}"` : ''} alt="${escapeHTML(product.name)} poster" loading="lazy" onerror="coverFailed(this)">` : '';
  const visual = isVbucks
    ? `<div class="vbucks-art"><div class="vbucks-coin">${image}</div><b>${escapeHTML(product.packLabel || product.name.replace(/\s*V-Bucks$/i, ''))}</b><small>V-BUCKS</small></div>`
    : `<div class="cover-fallback">${markFor(product)}<small>${escapeHTML(product.name)}</small></div>${image}`;
  return `<div class="${detail ? 'detail-image' : 'product-cover'} art-${escapeHTML(product.category)}${isVbucks ? ' art-vbucks' : ''}${product.id === 'fortnite-crew' ? ' art-fortnite-crew' : ''}">${visual}${detail ? '' : `<span class="cover-label">${labels[product.category] || 'GAME'}</span>`}</div>`;
}
function productPriceMarkup(product) {
  const options = product.options || [];
  if (options.length) return `<div class="product-price"><small>STARTING FROM</small><strong>${money(minPrice(product))}</strong></div>`;
  return `<div class="product-price"><small>PRICE</small><strong>${money(product.price)}</strong></div>`;
}
function card(product) {
  return `<article class="product-card" data-view="${escapeHTML(product.id)}">${cover(product)}<div class="product-info"><div class="product-kind">${labels[product.category] || 'GAME'}${product.packLabel ? ` · ${escapeHTML(product.packLabel)}` : ''}</div><h3 class="product-title">${escapeHTML(product.name)}</h3><div class="product-bottom">${productPriceMarkup(product)}<button class="add-button" type="button" data-add="${escapeHTML(product.id)}" aria-label="Add ${escapeHTML(product.name)}">＋</button></div></div></article>`;
}
function renderCatalog() {
  for (const category of Object.keys(labels)) {
    const grid = document.getElementById(category + 'Grid');
    if (grid) grid.innerHTML = STORE.products.filter(item => item.category === category).map(card).join('');
  }
  searchPlayStation();
}
function searchPlayStation() {
  const field = $('#gameSearch');
  const query = field.value.trim().toLowerCase();
  let visible = 0;
  document.querySelectorAll('#gamesGrid .product-card').forEach(node => {
    node.hidden = !node.textContent.toLowerCase().includes(query);
    if (!node.hidden) visible++;
  });
  $('#gamesEmpty').hidden = visible > 0;
}
function toast(message, bad = false) {
  const node = $('#toast');
  node.textContent = message;
  node.className = 'toast show' + (bad ? ' bad' : '');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { node.className = 'toast'; }, 3600);
}
function openProduct(product) {
  STORE.selectedProduct = product;
  STORE.selectedOption = [...(product.options || [])].sort((a, b) => Number(a.price) - Number(b.price))[0]?.key || '';
  const options = (product.options || []).map(option => `<button class="option-button${option.key === STORE.selectedOption ? ' selected' : ''}" type="button" data-option="${escapeHTML(option.key)}"><span>${escapeHTML(option.label)}</span><b>${money(option.price)}</b></button>`).join('');
  const price = unitPrice(product, STORE.selectedOption);
  const optionCopy = product.options?.length > 1 ? 'Choose an option to see its price.' : product.options?.length === 1 ? `${product.options[0].label} price.` : 'A single clear price. Add it to your bag when you are ready.';
  $('#productDialogContent').innerHTML = `<div class="product-detail">${cover(product, true)}<div class="detail-copy"><span class="section-index">${labels[product.category] || 'BUTCHER STORE'}</span><h2>${escapeHTML(product.name)}</h2><p>${optionCopy}</p>${options ? `<div class="detail-options">${options}</div>` : ''}<div class="detail-price"><span>Price</span><b id="selectedPrice">${money(price)}</b></div><button class="button button-red full" id="detailAdd" type="button">Add to cart <span>＋</span></button></div></div>`;
  $('#productDialog').showModal();
}
function addToCart(product, optionKey = '') {
  if (product.options?.length && !optionByKey(product, optionKey)) return openProduct(product);
  const key = `${product.id}:${optionKey}`;
  const existing = STORE.cart.find(line => line.key === key);
  if (existing) existing.quantity = Math.min(existing.quantity + 1, 25);
  else STORE.cart.push({ id: product.id, optionKey, key, quantity: 1 });
  saveCart(); renderCart(); toast('Added to your bag.');
}
function renderCart() {
  const lines = $('#cartLines');
  const normalized = [];
  for (const row of STORE.cart) {
    const product = productById(row.id);
    if (!product) continue;
    const option = optionByKey(product, row.optionKey);
    if (product.options?.length && !option) continue;
    normalized.push({ ...row, quantity: Math.max(1, Math.min(25, Math.floor(Number(row.quantity) || 1))) });
  }
  STORE.cart = normalized;
  if (!STORE.cart.length) lines.innerHTML = '<div class="empty-state">Your bag is empty. Find something worth playing.</div>';
  else lines.innerHTML = STORE.cart.map(row => {
    const product = productById(row.id), option = optionByKey(product, row.optionKey);
    return `<div class="cart-line"><div><strong>${escapeHTML(product.name)}</strong><small>${option ? `${escapeHTML(option.label)} · ` : ''}${money(unitPrice(product, row.optionKey))}</small><div class="quantity-controls"><button type="button" data-quantity="-1" data-key="${escapeHTML(row.key)}" aria-label="Decrease quantity">−</button><span>${row.quantity}</span><button type="button" data-quantity="1" data-key="${escapeHTML(row.key)}" aria-label="Increase quantity">＋</button><button type="button" class="remove-line" data-remove="${escapeHTML(row.key)}">Remove</button></div></div><b>${money(unitPrice(product, row.optionKey) * row.quantity)}</b></div>`;
  }).join('');
  const total = STORE.cart.reduce((sum, row) => sum + unitPrice(productById(row.id), row.optionKey) * row.quantity, 0);
  $('#cartSubtotal').textContent = money(total);
  saveCart();
}
function changeQuantity(key, delta) {
  const row = STORE.cart.find(line => line.key === key);
  if (!row) return;
  row.quantity += delta;
  if (row.quantity < 1) STORE.cart = STORE.cart.filter(line => line.key !== key);
  if (row.quantity > 25) row.quantity = 25;
  renderCart();
}
async function checkout(event) {
  event.preventDefault();
  if (!STORE.cart.length) return toast('Your bag is empty.', true);
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  const button = $('#checkoutButton');
  const data = new FormData(form);
  button.disabled = true;
  try {
    const response = await fetch(butcherApiURL('/api/orders'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      phone: data.get('phone'), customerName: data.get('customerName'), note: data.get('note'),
      items: STORE.cart.map(({ id, optionKey, quantity }) => ({ id, optionKey, quantity }))
    }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not send your order.');
    STORE.cart = []; saveCart(); renderCart(); form.reset(); $('#cartDialog').close();
    toast(`Order ${result.orderId} received. We will contact you.`);
  } catch (error) { toast(error.message, true); }
  finally { button.disabled = false; }
}
async function loadProducts(quiet = false) {
  try {
    const response = await fetch(butcherApiURL('/api/products'), { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load the catalog.');
    const items = await response.json();
    if (!Array.isArray(items)) throw new Error('The catalog data is not valid.');
    STORE.products = items;
    renderCatalog(); renderCart();
  } catch (error) { if (!quiet) toast(error.message, true); }
}

document.addEventListener('click', event => {
  const add = event.target.closest('[data-add]');
  if (add) {
    event.stopPropagation();
    const product = productById(add.dataset.add);
    if (product?.options?.length) openProduct(product);
    else if (product) addToCart(product);
    return;
  }
  const view = event.target.closest('[data-view]');
  if (view) { const product = productById(view.dataset.view); if (product) openProduct(product); return; }
  const close = event.target.closest('[data-close]');
  if (close) { document.getElementById(close.dataset.close).close(); return; }
  const option = event.target.closest('[data-option]');
  if (option && STORE.selectedProduct) {
    STORE.selectedOption = option.dataset.option;
    document.querySelectorAll('[data-option]').forEach(button => button.classList.toggle('selected', button === option));
    $('#selectedPrice').textContent = money(unitPrice(STORE.selectedProduct, STORE.selectedOption));
    return;
  }
  if (event.target.closest('#detailAdd')) {
    if (STORE.selectedProduct) addToCart(STORE.selectedProduct, STORE.selectedOption);
    $('#productDialog').close(); return;
  }
  const quantity = event.target.closest('[data-quantity]');
  if (quantity) { changeQuantity(quantity.dataset.key, Number(quantity.dataset.quantity)); return; }
  const remove = event.target.closest('[data-remove]');
  if (remove) { STORE.cart = STORE.cart.filter(row => row.key !== remove.dataset.remove); renderCart(); }
});
document.addEventListener('submit', event => { if (event.target.id === 'checkoutForm') checkout(event); });
$('#openCart').addEventListener('click', () => { renderCart(); $('#cartDialog').showModal(); });
$('#menuToggle').addEventListener('click', () => {
  const nav = $('#mainNav'), open = nav.classList.toggle('open');
  $('#menuToggle').setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('#mainNav a').forEach(link => link.addEventListener('click', () => {
  $('#mainNav').classList.remove('open'); $('#menuToggle').setAttribute('aria-expanded', 'false');
}));
$('#gameSearch').addEventListener('input', searchPlayStation);
function createVisitorId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const value = Math.random() * 16 | 0;
    return (char === 'x' ? value : (value & 3 | 8)).toString(16);
  });
}
function trackStoreOpen() {
  let visitorId;
  try {
    visitorId = localStorage.getItem('butcher-visitor-id-v1');
    if (!visitorId) { visitorId = createVisitorId(); localStorage.setItem('butcher-visitor-id-v1', visitorId); }
  } catch { visitorId = createVisitorId(); }
  fetch(butcherApiURL('/api/visit'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visitorId }), keepalive: true }).catch(() => {});
}
trackStoreOpen();
window.addEventListener('focus', () => loadProducts(true));
loadProducts();
setInterval(() => loadProducts(true), 5 * 60 * 1000);

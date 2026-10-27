import { api, money, escapeHTML } from './api.js';
import { getWishlist, removeWishlist, addToCart } from './store.js';
import { toast, syncBadges } from './components.js';

export async function initWishlist() {
  const host = document.querySelector('#wishlist-content');
  const render = async () => {
    const saved = getWishlist();
    if (!saved.length) {
      host.innerHTML = '<div class="empty"><h2>A place for things you love.</h2><p class="muted">Save pieces as you explore and come back when you are ready.</p><a class="btn" href="shop.html">Explore the collection</a></div>';
      return;
    }
    host.innerHTML = '<p class="muted">Refreshing your saved pieces…</p>';
    const fresh = await Promise.all(saved.map(async item => {
      try { return (await api(`/products/${encodeURIComponent(item._id)}`)).data; }
      catch { return { ...item, isActive: false, stock: 0 }; }
    }));
    host.innerHTML = `<div class="product-grid">${fresh.map(item => `<article class="product-card"><div class="product-image"><a href="product.html?id=${encodeURIComponent(item._id)}"><img src="${escapeHTML(item.images?.[0] || '')}" alt="${escapeHTML(item.name)}"></a></div><div class="product-info"><a class="product-title" href="product.html?id=${encodeURIComponent(item._id)}">${escapeHTML(item.name)}</a><p class="product-meta">${item.stock > 0 ? `${item.stock} in stock` : 'Currently unavailable'}</p><div class="product-price">${money(item.price)}</div><button class="btn btn-small" data-wish-add="${escapeHTML(item._id)}" ${item.stock < 1 ? 'disabled' : ''}>Move to bag</button> <button class="remove-btn" data-wish-remove="${escapeHTML(item._id)}">Remove</button></div></article>`).join('')}</div>`;
    host.querySelectorAll('[data-wish-remove]').forEach(button => button.addEventListener('click', () => { removeWishlist(button.dataset.wishRemove); render(); }));
    host.querySelectorAll('[data-wish-add]').forEach(button => button.addEventListener('click', () => {
      const item = fresh.find(product => product._id === button.dataset.wishAdd);
      if (item) { addToCart(item); syncBadges(); toast('Added to your bag'); }
    }));
  };
  window.addEventListener('wishlist-updated', render);
  await render();
}

import { escapeHTML, money } from './api.js';
import { addToCart, getCart, getWishlist, toggleWishlist } from './store.js';

export function toast(message, error = false) {
  let node = document.querySelector('.toast');
  if (!node) { node = document.createElement('div'); node.className = 'toast'; document.body.append(node); }
  node.textContent = message;
  node.classList.toggle('error', error);
  node.classList.add('show');
  clearTimeout(node.timer);
  node.timer = setTimeout(() => node.classList.remove('show'), 2800);
}

export function renderHeader() {
  const host = document.querySelector('[data-header]');
  if (!host) return;
  host.innerHTML = `<div class="announcement">COMPLIMENTARY SHIPPING ON ORDERS OVER $100</div><header class="site-header"><nav class="nav wrap"><button class="menu-toggle" aria-label="Toggle menu">☰</button><a class="brand" href="index.html">atelier<span>.</span></a><div class="nav-links"><a href="shop.html">Shop</a><a href="shop.html?category=fashion">Clothing</a><a href="shop.html?category=home-living">Home</a><a href="shop.html?category=accessories">Accessories</a></div><div class="nav-actions"><form class="header-search" action="shop.html"><input class="nav-search" name="q" placeholder="Search..." aria-label="Search products"></form><a class="icon-link" href="wishlist.html" aria-label="Wishlist">♡ <span class="wishlist-badge"></span></a><a class="icon-link" href="cart.html" aria-label="Shopping bag">Bag <span class="badge cart-badge">0</span></a></div></nav></header>`;
  host.querySelector('.menu-toggle').addEventListener('click', () => host.querySelector('.nav-links').classList.toggle('open'));
  syncBadges();
}

export function syncBadges() {
  const count = getCart().reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  document.querySelectorAll('.cart-badge').forEach(node => { node.textContent = count; });
  const wishCount = getWishlist().length;
  document.querySelectorAll('.wishlist-badge').forEach(node => { node.textContent = wishCount ? ` ${wishCount}` : ''; });
}

export function renderFooter() {
  const host = document.querySelector('[data-footer]');
  if (!host) return;
  host.innerHTML = `<footer class="site-footer"><div class="wrap"><div class="footer-grid"><div><a class="brand" href="index.html">atelier<span>.</span></a><p style="max-width:290px;margin-top:15px">Considered pieces and thoughtful essentials to make everyday living feel a little more special.</p></div><div><h3>Explore</h3><div class="footer-links"><a href="shop.html">Shop all</a><a href="shop.html?category=fashion">Clothing</a><a href="shop.html?category=home-living">Home & living</a></div></div><div><h3>Help</h3><div class="footer-links"><a href="cart.html">Your bag</a><a href="wishlist.html">Wishlist</a><a href="admin.html">Store admin</a></div></div><div><h3>A good email, occasionally</h3><p>New arrivals and thoughtful notes. No noise.</p><form class="newsletter"><input type="email" name="email" required placeholder="Your email address"><button aria-label="Subscribe">→</button></form></div></div><div class="copyright">© ${new Date().getFullYear()} Atelier. Thoughtfully made.</div></div></footer>`;
  host.querySelector('.newsletter').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const { api } = await import('./api.js');
      const result = await api('/newsletter/subscribe', { method: 'POST', body: JSON.stringify({ email: new FormData(event.currentTarget).get('email') }) });
      toast(result.message);
      event.currentTarget.reset();
    } catch (error) { toast(error.message, true); }
  });
}

export function productCard(product) {
  const image = product.images?.[0] || '';
  const liked = getWishlist().some(item => item._id === product._id);
  return `<article class="product-card" data-product="${escapeHTML(product._id)}"><div class="product-image"><a href="product.html?id=${encodeURIComponent(product._id)}"><img loading="lazy" src="${escapeHTML(image)}" alt="${escapeHTML(product.name)}"></a>${product.isFeatured ? '<span class="product-tag">Bestseller</span>' : ''}<button class="wishlist-toggle" type="button" aria-label="Toggle wishlist" data-wish="${escapeHTML(product._id)}">${liked ? '♥' : '♡'}</button></div><div class="product-info"><a href="product.html?id=${encodeURIComponent(product._id)}" class="product-title">${escapeHTML(product.name)}</a><div class="product-meta">${escapeHTML(product.category?.name || 'Atelier')}</div><div class="product-price">${money(product.price)}${product.compareAtPrice ? `<span class="old-price">${money(product.compareAtPrice)}</span>` : ''}</div><button class="btn btn-small card-action" data-add="${escapeHTML(product._id)}" type="button">Add to bag</button><button class="text-link" style="margin:9px 0 0 12px" data-quick="${escapeHTML(product._id)}" type="button">Quick view</button></div></article>`;
}

export function activateProductCards(container, products) {
  container.addEventListener('click', event => {
    const add = event.target.closest('[data-add]');
    const wish = event.target.closest('[data-wish]');
    const quick = event.target.closest('[data-quick]');
    if (add) {
      const product = products.find(item => item._id === add.dataset.add);
      if (product) { addToCart(product); syncBadges(); toast('Added to your bag'); }
    }
    if (wish) {
      const product = products.find(item => item._id === wish.dataset.wish);
      if (product) { const liked = toggleWishlist(product); wish.textContent = liked ? '♥' : '♡'; syncBadges(); toast(liked ? 'Saved to your wishlist' : 'Removed from wishlist'); }
    }
    if (quick) {
      const product = products.find(item => item._id === quick.dataset.quick);
      if (!product) return;
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      backdrop.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-label="Quick view: ${escapeHTML(product.name)}"><button type="button" class="remove-btn" data-close-modal style="position:absolute;right:20px;top:18px">Close ×</button><div class="product-detail" style="grid-template-columns:1fr 1fr;gap:22px;padding:0"><img style="aspect-ratio:4/5" src="${escapeHTML(product.images?.[0] || '')}" alt="${escapeHTML(product.name)}"><div><span class="eyebrow">${escapeHTML(product.category?.name || 'Atelier')}</span><h2 style="font-size:1.8rem;margin-top:8px">${escapeHTML(product.name)}</h2><p class="product-price">${money(product.price)}</p><p class="muted">${escapeHTML(product.description)}</p><a class="btn btn-small" href="product.html?id=${encodeURIComponent(product._id)}">View details</a><button type="button" class="btn btn-small" data-modal-add ${product.stock ? '' : 'disabled'}>Add to bag</button></div></div></section>`;
      document.body.append(backdrop);
      backdrop.addEventListener('click', modalEvent => {
        if (modalEvent.target === backdrop || modalEvent.target.closest('[data-close-modal]')) backdrop.remove();
        if (modalEvent.target.closest('[data-modal-add]')) {
          addToCart(product); syncBadges(); toast('Added to your bag'); backdrop.remove();
        }
      });
    }
  });
}

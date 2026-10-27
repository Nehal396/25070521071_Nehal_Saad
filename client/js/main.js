import { api } from './api.js';
import { renderHeader, renderFooter, productCard, activateProductCards, toast, syncBadges } from './components.js';

renderHeader();
renderFooter();
window.addEventListener('cart-updated', syncBadges);
window.addEventListener('wishlist-updated', syncBadges);

async function home() {
  const featuredHost = document.querySelector('#home-featured');
  const categoriesHost = document.querySelector('#home-categories');
  if (!featuredHost) return;
  try {
    const [{ data: products }, { data: categories }] = await Promise.all([api('/products/featured'), api('/categories')]);
    featuredHost.innerHTML = products.map(productCard).join('');
    activateProductCards(featuredHost, products);
    categoriesHost.innerHTML = categories.slice(0, 3).map((category, index) => {
      const photos = ['photo-1490481651871-ab68de25d43d', 'photo-1490312278390-ab64016e0aa9', 'photo-1523275335684-37898b6baf30'];
      return `<a class="category-card" href="shop.html?category=${encodeURIComponent(category.slug)}"><img loading="lazy" src="https://images.unsplash.com/${photos[index]}?auto=format&fit=crop&w=800&q=80" alt="${category.name}"><span class="category-label">${category.name}</span></a>`;
    }).join('');
  } catch (error) {
    featuredHost.innerHTML = `<p class="muted">The collection is unavailable right now. ${error.message}</p>`;
  }
}

const page = location.pathname.split('/').pop() || 'index.html';
if (page === 'index.html') home();
else if (page === 'shop.html') import('./shop.js').then(module => module.initShop()).catch(error => toast(error.message, true));
else if (page === 'product.html') import('./product-details.js').then(module => module.initProduct()).catch(error => toast(error.message, true));
else if (page === 'cart.html') import('./cart.js').then(module => module.initCart());
else if (page === 'checkout.html') import('./checkout.js').then(module => module.initCheckout());
else if (page === 'order-success.html') import('./orders.js').then(module => module.initOrder());
else if (page === 'wishlist.html') import('./wishlist.js').then(module => module.initWishlist());
else if (page === 'admin.html') import('./admin.js').then(module => module.initAdmin());

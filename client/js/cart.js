import { money, escapeHTML } from './api.js';
import { getCart, updateCart, removeCart } from './store.js';
import { toast, syncBadges } from './components.js';

export function initCart() {
  const host = document.querySelector('#cart-content');
  function render() {
    const cart = getCart();
    if (!cart.length) {
      host.innerHTML = '<div class="empty"><h2>Your bag is taking a breather.</h2><p class="muted">Find something you will love living with.</p><a class="btn" href="shop.html">Continue shopping</a></div>';
      return;
    }
    const subtotal = cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
    const shipping = subtotal >= 100 ? 0 : 8.95;
    host.innerHTML = `<div class="cart-layout"><section>${cart.map((item, index) => `<article class="cart-item"><a href="product.html?id=${encodeURIComponent(item.product._id)}"><img src="${escapeHTML(item.product.images?.[0] || '')}" alt="${escapeHTML(item.product.name)}"></a><div><h3><a href="product.html?id=${encodeURIComponent(item.product._id)}">${escapeHTML(item.product.name)}</a></h3><div class="product-price">${money(item.product.price)}</div><div class="muted">${Object.entries(item.variants || {}).map(([key, value]) => `${escapeHTML(key)}: ${escapeHTML(value)}`).join(' · ')}</div><div class="quantity"><button data-change="${index}" data-delta="-1">−</button><span>${item.quantity}</span><button data-change="${index}" data-delta="1">+</button></div></div><div><div class="product-price">${money(item.product.price * item.quantity)}</div><button class="remove-btn" data-remove="${index}">Remove</button></div></article>`).join('')}</section><aside class="content-card summary-card"><h3>Order summary</h3><div class="summary-line"><span>Subtotal</span><span>${money(subtotal)}</span></div><div class="summary-line"><span>Shipping</span><span>${shipping ? money(shipping) : 'Complimentary'}</span></div><p class="muted" style="font-size:.75rem">Shipping and discounts are confirmed at checkout.</p><div class="summary-line summary-total"><span>Estimated total</span><span>${money(subtotal + shipping)}</span></div><a class="btn" href="checkout.html">Continue to checkout</a><a class="text-link" style="display:block;text-align:center;margin-top:16px" href="shop.html">Continue shopping</a></aside></div>`;
    host.querySelectorAll('[data-change]').forEach(button => button.addEventListener('click', () => { updateCart(Number(button.dataset.change), getCart()[Number(button.dataset.change)].quantity + Number(button.dataset.delta)); render(); }));
    host.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => { removeCart(Number(button.dataset.remove)); render(); toast('Removed from your bag'); }));
  }
  window.addEventListener('cart-updated', render);
  render();
}

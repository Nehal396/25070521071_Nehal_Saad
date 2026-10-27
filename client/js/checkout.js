import { api, money, escapeHTML } from './api.js';
import { getCart, clearCart } from './store.js';
import { toast } from './components.js';

export function initCheckout() {
  const host = document.querySelector('#checkout-content');
  const cart = getCart();
  if (!cart.length) {
    host.innerHTML = '<div class="empty"><h2>Your bag is empty</h2><a class="btn" href="shop.html">Explore the collection</a></div>';
    return;
  }
  const subtotal = cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  host.innerHTML = `<div class="checkout-layout"><form id="checkout-form" class="content-card"><h2 style="font-size:1.55rem">Contact and delivery</h2><div class="form-grid"><label class="full">Full name<input class="field" name="name" required minlength="2" maxlength="100" autocomplete="name"></label><label>Email address<input class="field" name="email" type="email" required autocomplete="email"></label><label>Phone number<input class="field" name="phone" type="tel" required minlength="7" maxlength="24" autocomplete="tel"></label><label class="full">Street address<input class="field" name="address" required minlength="5" maxlength="200" autocomplete="street-address"></label><label>City<input class="field" name="city" required autocomplete="address-level2"></label><label>State / region<input class="field" name="state" required autocomplete="address-level1"></label><label>Postal code<input class="field" name="postalCode" required autocomplete="postal-code"></label><label>Country<input class="field" name="country" required autocomplete="country-name"></label></div><h2 style="font-size:1.55rem;margin-top:35px">Payment</h2><label><input type="radio" name="paymentMethod" value="cash_on_delivery" checked> Cash on delivery</label><p class="muted" style="font-size:.78rem">Payment gateway processing is not currently enabled.</p><button class="btn" type="submit">Place order</button><p class="muted" id="checkout-error" aria-live="polite"></p></form><aside class="content-card summary-card"><h3>Your order</h3>${cart.map(item => `<div class="summary-line"><span>${escapeHTML(item.product.name)} × ${item.quantity}</span><span>${money(item.product.price * item.quantity)}</span></div>`).join('')}<div class="coupon-row"><input class="field" id="coupon-code" placeholder="Coupon code"><button class="btn btn-light btn-small" id="apply-coupon" type="button">Apply</button></div><p class="muted" id="coupon-message" aria-live="polite"></p><div class="summary-line"><span>Subtotal</span><span>${money(subtotal)}</span></div><div class="summary-line"><span>Shipping</span><span>${subtotal >= 100 ? 'Complimentary' : money(8.95)}</span></div><div class="summary-line" id="discount-line" hidden><span>Discount</span><span id="discount-value"></span></div><div class="summary-line summary-total"><span>Total estimate</span><span id="checkout-total">${money(subtotal + (subtotal >= 100 ? 0 : 8.95))}</span></div><p class="muted" style="font-size:.72rem">Final totals and stock availability are verified securely by the server.</p></aside></div>`;
  let couponCode = '';
  let discount = 0;
  const couponMessage = host.querySelector('#coupon-message');
  host.querySelector('#apply-coupon').addEventListener('click', async () => {
    const code = host.querySelector('#coupon-code').value.trim();
    try {
      const result = await api('/coupons/validate', { method: 'POST', body: JSON.stringify({ code, subtotal }) });
      couponCode = result.data.code;
      discount = result.data.discount;
      couponMessage.textContent = `${couponCode} applied`;
      host.querySelector('#discount-line').hidden = false;
      host.querySelector('#discount-value').textContent = `−${money(discount)}`;
      host.querySelector('#checkout-total').textContent = money(Math.max(0, subtotal - discount) + (subtotal - discount >= 100 ? 0 : 8.95));
    } catch (error) {
      couponCode = ''; discount = 0; couponMessage.textContent = error.message; toast(error.message, true);
    }
  });
  host.querySelector('#checkout-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const button = event.currentTarget.querySelector('[type=submit]');
    button.disabled = true;
    button.textContent = 'Placing your order…';
    host.querySelector('#checkout-error').textContent = '';
    try {
      const response = await api('/orders', { method: 'POST', body: JSON.stringify({
        customer: { name: form.get('name'), email: form.get('email'), phone: form.get('phone') },
        shippingAddress: { address: form.get('address'), city: form.get('city'), state: form.get('state'), postalCode: form.get('postalCode'), country: form.get('country') },
        items: cart.map(item => ({ productId: item.product._id, quantity: item.quantity, variants: item.variants || {} })),
        couponCode, paymentMethod: form.get('paymentMethod')
      }) });
      sessionStorage.setItem('atelier-order-token', response.data.trackingToken);
      clearCart();
      location.href = `order-success.html?order=${encodeURIComponent(response.data.orderNumber)}`;
    } catch (error) {
      host.querySelector('#checkout-error').textContent = error.message;
      button.disabled = false;
      button.textContent = 'Place order';
      toast(error.message, true);
    }
  });
}

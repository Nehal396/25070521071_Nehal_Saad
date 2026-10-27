import { api, money, escapeHTML } from './api.js';

export async function initOrder() {
  const host = document.querySelector('#order-content');
  const orderNumber = new URLSearchParams(location.search).get('order');
  const token = sessionStorage.getItem('atelier-order-token');
  if (!orderNumber || !token) {
    host.innerHTML = '<div class="empty"><h1>Order details unavailable</h1><p class="muted">Order tracking requires the private tracking token from the checkout session.</p><a class="btn" href="shop.html">Continue shopping</a></div>';
    return;
  }
  try {
    const { data: order } = await api(`/orders/track?orderNumber=${encodeURIComponent(orderNumber)}&token=${encodeURIComponent(token)}`);
    host.innerHTML = `<div class="content-card" style="max-width:760px;margin:auto"><span class="eyebrow">Thank you</span><h1 style="font-size:3rem">Your order is in.</h1><p class="muted">Order ${escapeHTML(order.orderNumber)} · We will email updates to ${escapeHTML(order.customer.email)}.</p><h3>Items</h3>${order.items.map(item => `<div class="summary-line"><span>${escapeHTML(item.name)} × ${item.quantity}</span><span>${money(item.unitPrice * item.quantity)}</span></div>`).join('')}<hr style="border:0;border-top:1px solid var(--line)"><div class="summary-line"><span>Subtotal</span><span>${money(order.subtotal)}</span></div>${order.discount ? `<div class="summary-line"><span>Discount</span><span>−${money(order.discount)}</span></div>` : ''}<div class="summary-line"><span>Shipping</span><span>${order.shippingCost ? money(order.shippingCost) : 'Complimentary'}</span></div><div class="summary-line summary-total"><span>Total</span><span>${money(order.total)}</span></div><h3 style="margin-top:28px">Delivery to</h3><p>${escapeHTML(order.customer.name)}<br>${escapeHTML(order.shippingAddress.address)}<br>${escapeHTML(order.shippingAddress.city)}, ${escapeHTML(order.shippingAddress.state)} ${escapeHTML(order.shippingAddress.postalCode)}<br>${escapeHTML(order.shippingAddress.country)}</p><p class="muted">Payment: Cash on delivery · Status: ${escapeHTML(order.orderStatus)}</p><a class="btn" href="shop.html">Continue exploring</a></div>`;
  } catch (error) {
    host.innerHTML = `<div class="empty"><h1>We couldn't retrieve that order</h1><p class="muted">${escapeHTML(error.message)}</p><a class="btn" href="shop.html">Continue shopping</a></div>`;
  }
}

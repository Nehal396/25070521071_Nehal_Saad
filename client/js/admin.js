import { api, money, escapeHTML } from './api.js';
import { toast } from './components.js';

export async function initAdmin() {
  const host = document.querySelector('#admin-content');
  let secret = sessionStorage.getItem('atelier-admin-secret') || '';
  if (!secret) {
    host.innerHTML = `<form id="admin-login" class="content-card" style="max-width:500px"><h2 style="font-size:1.6rem">Administrator access</h2><p class="muted">Enter the server-configured admin secret. It will be held for this browser tab only.</p><label>Admin secret<input class="field" type="password" name="secret" autocomplete="current-password" required></label><button class="btn" style="margin-top:16px">Continue</button><p class="muted" id="admin-error" aria-live="polite"></p></form>`;
    host.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault();
      const candidate = new FormData(event.currentTarget).get('secret');
      try {
        await adminApi('/analytics', candidate);
        secret = candidate;
        sessionStorage.setItem('atelier-admin-secret', secret);
        renderDashboard();
      } catch (error) {
        host.querySelector('#admin-error').textContent = error.message;
      }
    });
    return;
  }
  await renderDashboard();

  function adminApi(path, key = secret, options = {}) {
    return api(`/admin${path}`, { ...options, headers: { 'x-admin-secret': key, ...(options.headers || {}) } });
  }

  async function renderDashboard() {
    host.innerHTML = '<p class="muted">Loading store data…</p>';
    try {
      const [analyticsResult, ordersResult, productsResult, categoriesResult] = await Promise.all([
        adminApi('/analytics'), adminApi('/orders'), api('/products?limit=48'), api('/categories')
      ]);
      const stats = analyticsResult.data;
      host.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px"><h2 style="font-size:1.6rem">Store overview</h2><button class="btn btn-light btn-small" id="admin-logout">End session</button></div><div class="admin-grid"><div class="admin-stat"><span class="muted">Orders</span><br><strong>${stats.orders}</strong></div><div class="admin-stat"><span class="muted">Revenue</span><br><strong>${money(stats.revenue)}</strong></div><div class="admin-stat"><span class="muted">Active products</span><br><strong>${stats.products}</strong></div></div><section class="section" style="padding:45px 0 15px"><h2 style="font-size:1.6rem">Low stock</h2>${stats.lowStock.length ? `<p>${stats.lowStock.map(item => `${escapeHTML(item.name)} (${item.stock})`).join(' · ')}</p>` : '<p class="muted">No low-stock products.</p>'}</section><section class="section" style="padding:20px 0"><h2 style="font-size:1.6rem">Add a product</h2><form id="product-form" class="content-card form-grid"><label>Name<input class="field" name="name" required></label><label>Slug<input class="field" name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*"></label><label>Price (USD)<input class="field" name="price" type="number" min="0" step=".01" required></label><label>Compare-at price<input class="field" name="compareAtPrice" type="number" min="0" step=".01"></label><label>SKU<input class="field" name="sku" required></label><label>Stock<input class="field" name="stock" type="number" min="0" required></label><label>Category<select class="field" name="category" required>${categoriesResult.data.map(item => `<option value="${escapeHTML(item._id)}">${escapeHTML(item.name)}</option>`).join('')}</select></label><label>Image URL (HTTPS)<input class="field" name="image" type="url" required></label><label class="full">Description<textarea class="field" name="description" rows="3" required></textarea></label><label class="full"><input type="checkbox" name="isFeatured"> Featured product</label><div class="full"><button class="btn">Create product</button></div></form></section><section class="section" style="padding:20px 0"><h2 style="font-size:1.6rem">Categories</h2><form id="category-form" class="content-card form-grid"><label>Name<input class="field" name="name" required></label><label>Slug<input class="field" name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*"></label><label class="full">Description<input class="field" name="description"></label><div class="full"><button class="btn btn-small">Add category</button></div></form></section><section class="section" style="padding:20px 0"><h2 style="font-size:1.6rem">Inventory</h2><div style="overflow:auto"><table class="admin-table"><thead><tr><th>Product</th><th>SKU</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead><tbody>${productsResult.data.map(item => `<tr data-admin-product="${escapeHTML(item._id)}"><td>${escapeHTML(item.name)}</td><td>${escapeHTML(item.sku)}</td><td><input aria-label="Price" data-field="price" type="number" min="0" step=".01" value="${item.price}" style="width:85px"></td><td><input aria-label="Stock" data-field="stock" type="number" min="0" value="${item.stock}" style="width:70px"></td><td><button class="text-link" data-save-product>Save</button> <button class="remove-btn" data-archive-product>Archive</button></td></tr>`).join('')}</tbody></table></div></section><section class="section" style="padding:20px 0"><h2 style="font-size:1.6rem">Recent orders</h2><div style="overflow:auto"><table class="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Update</th></tr></thead><tbody>${ordersResult.data.map(order => `<tr data-admin-order="${escapeHTML(order._id)}"><td>${escapeHTML(order.orderNumber)}</td><td>${escapeHTML(order.customer.name)}<br>${escapeHTML(order.customer.email)}</td><td>${money(order.total)}</td><td>${escapeHTML(order.orderStatus)}</td><td><select data-order-status aria-label="Order status"><option ${order.orderStatus === 'confirmed' || order.orderStatus === 'processing' ? 'selected' : ''}>confirmed</option><option ${order.orderStatus === 'shipped' ? 'selected' : ''}>shipped</option><option ${order.orderStatus === 'delivered' ? 'selected' : ''}>delivered</option><option ${order.orderStatus === 'cancelled' ? 'selected' : ''}>cancelled</option></select> <button class="text-link" data-save-order>Save</button></td></tr>`).join('')}</tbody></table></div></section>`;
      host.querySelector('#admin-logout').addEventListener('click', () => { sessionStorage.removeItem('atelier-admin-secret'); secret = ''; initAdmin(); });
      host.querySelector('#product-form').addEventListener('submit', async event => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(event.currentTarget));
        try {
          await adminApi('/products', secret, { method: 'POST', body: JSON.stringify({
            name: values.name, slug: values.slug, description: values.description,
            price: Number(values.price), compareAtPrice: values.compareAtPrice ? Number(values.compareAtPrice) : undefined,
            sku: values.sku, stock: Number(values.stock), category: values.category,
            images: [values.image], isFeatured: values.isFeatured === 'on'
          }) });
          toast('Product created'); renderDashboard();
        } catch (error) { toast(error.message, true); }
      });
      host.querySelector('#category-form').addEventListener('submit', async event => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(event.currentTarget));
        try {
          await adminApi('/categories', secret, { method: 'POST', body: JSON.stringify(values) });
          toast('Category created'); renderDashboard();
        } catch (error) { toast(error.message, true); }
      });
      host.querySelectorAll('[data-save-product]').forEach(button => button.addEventListener('click', async () => {
        const row = button.closest('[data-admin-product]');
        try {
          await adminApi(`/products/${row.dataset.adminProduct}`, secret, { method: 'PATCH', body: JSON.stringify({
            price: Number(row.querySelector('[data-field=price]').value),
            stock: Number(row.querySelector('[data-field=stock]').value)
          }) });
          toast('Product updated');
        } catch (error) { toast(error.message, true); }
      }));
      host.querySelectorAll('[data-archive-product]').forEach(button => button.addEventListener('click', async () => {
        if (!confirm('Archive this product from the storefront?')) return;
        try {
          await adminApi(`/products/${button.closest('[data-admin-product]').dataset.adminProduct}`, secret, { method: 'DELETE' });
          toast('Product archived'); renderDashboard();
        } catch (error) { toast(error.message, true); }
      }));
      host.querySelectorAll('[data-save-order]').forEach(button => button.addEventListener('click', async () => {
        const row = button.closest('[data-admin-order]');
        try {
          await adminApi(`/orders/${row.dataset.adminOrder}/status`, secret, { method: 'PATCH', body: JSON.stringify({ orderStatus: row.querySelector('[data-order-status]').value }) });
          toast('Order status updated'); renderDashboard();
        } catch (error) { toast(error.message, true); }
      }));
    } catch (error) {
      host.innerHTML = `<div class="content-card"><h2>Admin dashboard unavailable</h2><p class="muted">${escapeHTML(error.message)}</p><button class="btn btn-light" id="admin-retry">Try again</button></div>`;
      host.querySelector('#admin-retry').addEventListener('click', renderDashboard);
    }
  }
}

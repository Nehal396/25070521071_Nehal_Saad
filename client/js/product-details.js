import { api, money, escapeHTML } from './api.js';
import { addToCart, toggleWishlist } from './store.js';
import { toast, syncBadges, productCard, activateProductCards } from './components.js';

export async function initProduct() {
  const host = document.querySelector('#product-content');
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { host.innerHTML = '<div class="empty"><h2>Product not found</h2><a class="btn" href="shop.html">Return to shop</a></div>'; return; }
  try {
    const { data: product } = await api(`/products/${encodeURIComponent(id)}`);
    document.title = `${product.name} — Atelier`;
    const variantHTML = (product.variants || []).map(variant => `<label class="variant-select">${escapeHTML(variant.name)}<select class="field" data-variant="${escapeHTML(variant.name)}">${variant.options.map(option => `<option>${escapeHTML(option)}</option>`).join('')}</select></label>`).join('');
    host.innerHTML = `<div class="product-detail"><div class="detail-main-image"><img src="${escapeHTML(product.images?.[0] || '')}" alt="${escapeHTML(product.name)}"></div><section class="detail-copy"><span class="eyebrow">${escapeHTML(product.category?.name || 'Atelier')}</span><h1>${escapeHTML(product.name)}</h1><div class="price">${money(product.price)} ${product.compareAtPrice ? `<span class="old-price">${money(product.compareAtPrice)}</span>` : ''}</div><p>${escapeHTML(product.description)}</p><p>${product.stock ? `${product.stock} in stock` : 'Currently out of stock'}</p>${variantHTML}<div class="quantity"><button type="button" data-qty="-1" aria-label="Decrease quantity">−</button><span id="quantity">1</span><button type="button" data-qty="1" aria-label="Increase quantity">+</button></div><div class="detail-actions"><button class="btn" id="add-product" ${product.stock ? '' : 'disabled'}>Add to bag</button><button class="btn btn-light" id="buy-now" ${product.stock ? '' : 'disabled'}>Buy now</button><button class="btn btn-light" id="detail-wish">♡</button></div><p class="muted" style="font-size:.77rem;margin-top:22px">Complimentary shipping over $100 · Easy returns within 30 days</p></section></div><section class="section" style="padding-top:0"><span class="eyebrow">Details</span><h2>Made for living</h2><p class="muted">${escapeHTML(product.description)}</p><p class="muted">SKU ${escapeHTML(product.sku)} · ${escapeHTML(product.brand || 'Atelier')}</p><div style="margin-top:55px"><h2>Customer reviews <span class="muted" style="font-size:1.2rem">(${product.ratingsCount || 0})</span></h2><div id="review-list"></div><form class="content-card" id="review-form" style="max-width:620px;margin-top:25px"><h3>Leave a review</h3><div class="form-grid"><label>Name<input class="field" name="customerName" required minlength="2" maxlength="80"></label><label>Rating<select class="field" name="rating"><option value="5">5 — Excellent</option><option value="4">4 — Lovely</option><option value="3">3 — Good</option><option value="2">2 — Fair</option><option value="1">1 — Poor</option></select></label><label class="full">Title<input class="field" name="title" required minlength="2" maxlength="120"></label><label class="full">Your thoughts<textarea class="field" name="comment" required minlength="5" maxlength="1500" rows="4"></textarea></label><div class="full"><button class="btn btn-small">Submit review</button></div></div></form></div><h2 style="margin-top:60px">You may also like</h2><div class="product-grid" id="related-products"></div></section>`;
    let quantity = 1;
    host.querySelectorAll('[data-qty]').forEach(button => button.addEventListener('click', () => {
      quantity = Math.min(25, Math.max(1, quantity + Number(button.dataset.qty)));
      host.querySelector('#quantity').textContent = quantity;
    }));
    const selectedVariants = () => Object.fromEntries([...host.querySelectorAll('[data-variant]')].map(select => [select.dataset.variant, select.value]));
    const add = () => { addToCart(product, quantity, selectedVariants()); syncBadges(); toast('Added to your bag'); };
    host.querySelector('#add-product').addEventListener('click', add);
    host.querySelector('#buy-now').addEventListener('click', () => { add(); location.href = 'checkout.html'; });
    host.querySelector('#detail-wish').addEventListener('click', event => {
      const liked = toggleWishlist(product); event.currentTarget.textContent = liked ? '♥ Saved' : '♡'; syncBadges();
    });
    const reviewList = host.querySelector('#review-list');
    const loadReviews = async () => {
      const { data: reviews } = await api(`/products/${encodeURIComponent(product._id)}/reviews`);
      reviewList.innerHTML = reviews.length ? reviews.map(review => `<article class="content-card" style="margin:12px 0"><strong>${escapeHTML(review.title)}</strong><span class="muted"> · ${review.rating}/5 · ${escapeHTML(review.customerName)}</span><p style="margin:8px 0 0">${escapeHTML(review.comment)}</p></article>`).join('') : '<p class="muted">No reviews yet. Be the first to share your thoughts.</p>';
    };
    await loadReviews();
    host.querySelector('#review-form').addEventListener('submit', async event => {
      event.preventDefault();
      const button = event.currentTarget.querySelector('button[type=submit]');
      button.disabled = true;
      try {
        await api(`/products/${encodeURIComponent(product._id)}/reviews`, {
          method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))
        });
        event.currentTarget.reset();
        await loadReviews();
        toast('Thanks for sharing your review');
      } catch (error) { toast(error.message, true); }
      finally { button.disabled = false; }
    });
    try {
      const related = await api(`/products?category=${encodeURIComponent(product.category?._id || '')}&limit=4`);
      const items = related.data.filter(item => item._id !== product._id).slice(0, 4);
      const relatedHost = host.querySelector('#related-products');
      relatedHost.innerHTML = items.map(productCard).join('');
      activateProductCards(relatedHost, items);
    } catch { host.querySelector('#related-products').innerHTML = '<p class="muted">Related pieces are unavailable right now.</p>'; }
  } catch (error) {
    host.innerHTML = `<div class="empty"><h2>We couldn't find that piece</h2><p class="muted">${escapeHTML(error.message)}</p><a class="btn" href="shop.html">Back to collection</a></div>`;
  }
}

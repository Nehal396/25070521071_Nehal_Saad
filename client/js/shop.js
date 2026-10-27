import { api, escapeHTML } from './api.js';
import { productCard, activateProductCards, toast } from './components.js';

export async function initShop() {
  const host = document.querySelector('#shop-products');
  const categorySelect = document.querySelector('#filter-category');
  const params = new URLSearchParams(location.search);
  const search = document.querySelector('#filter-search');
  search.value = params.get('q') || '';
  let categoriesResult;
  try {
    categoriesResult = await api('/categories');
  } catch (error) {
    document.querySelector('#results-count').textContent = 'Collection unavailable';
    host.innerHTML = `<div class="empty" style="grid-column:1/-1"><h2>We can’t reach the collection</h2><p class="muted">${escapeHTML(error.message)}. Make sure the API and database are running.</p></div>`;
    toast(error.message, true);
    return;
  }
  categorySelect.innerHTML += categoriesResult.data.map(item => `<option value="${escapeHTML(item._id)}" data-slug="${escapeHTML(item.slug)}">${escapeHTML(item.name)}</option>`).join('');
  if (params.get('category')) {
    const option = [...categorySelect.options].find(item => item.dataset.slug === params.get('category'));
    if (option) categorySelect.value = option.value;
  }
  document.querySelector('#filter-min').value = params.get('minPrice') || '';
  document.querySelector('#filter-max').value = params.get('maxPrice') || '';
  document.querySelector('#sort-products').value = params.get('sort') || 'popular';
  document.querySelector('#filter-stock').checked = params.get('inStock') === 'true';
  let page = Number(params.get('page') || 1);

  async function load() {
    host.innerHTML = Array.from({ length: 8 }, () => '<div class="product-image skeleton"></div>').join('');
    const query = new URLSearchParams({ page, limit: 12, sort: document.querySelector('#sort-products').value });
    if (search.value.trim()) query.set('q', search.value.trim());
    if (categorySelect.value) query.set('category', categorySelect.value);
    if (document.querySelector('#filter-min').value) query.set('minPrice', document.querySelector('#filter-min').value);
    if (document.querySelector('#filter-max').value) query.set('maxPrice', document.querySelector('#filter-max').value);
    if (document.querySelector('#filter-stock').checked) query.set('inStock', 'true');
    try {
      const result = await api(`/products?${query}`);
      document.querySelector('#results-count').textContent = `${result.pagination.total} pieces`;
      host.innerHTML = result.data.length ? result.data.map(productCard).join('') : '<div class="empty" style="grid-column:1/-1"><h2>No pieces found</h2><p class="muted">Try adjusting your filters.</p></div>';
      activateProductCards(host, result.data);
      const pagination = document.querySelector('#pagination');
      pagination.innerHTML = Array.from({ length: result.pagination.pages }, (_, index) => `<button class="${index + 1 === page ? 'active' : ''}" data-page="${index + 1}">${index + 1}</button>`).join('');
      pagination.onclick = event => {
        const button = event.target.closest('[data-page]');
        if (button) { page = Number(button.dataset.page); load(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      };
    } catch (error) {
      host.innerHTML = `<p class="empty">${escapeHTML(error.message)}<br>Make sure the API is running.</p>`;
      toast(error.message, true);
    }
  }
  ['change'].forEach(type => {
    categorySelect.addEventListener(type, () => { page = 1; load(); });
    document.querySelector('#filter-min').addEventListener(type, () => { page = 1; load(); });
    document.querySelector('#filter-max').addEventListener(type, () => { page = 1; load(); });
    document.querySelector('#sort-products').addEventListener(type, () => { page = 1; load(); });
  });
  document.querySelector('#filter-stock').addEventListener('change', () => { page = 1; load(); });
  let timer;
  search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { page = 1; load(); }, 350); });
  document.querySelector('#clear-filters').addEventListener('click', () => {
    search.value = ''; categorySelect.value = ''; document.querySelector('#filter-min').value = '';
    document.querySelector('#filter-max').value = ''; document.querySelector('#sort-products').value = 'popular';
    document.querySelector('#filter-stock').checked = false;
    page = 1; load();
  });
  await load();
}

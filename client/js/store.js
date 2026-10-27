const read = key => {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
};
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

export const getCart = () => read('atelier-cart');
export function addToCart(product, quantity = 1, variants = {}) {
  const cart = getCart();
  const existing = cart.find(item => item.product._id === product._id && JSON.stringify(item.variants || {}) === JSON.stringify(variants));
  if (existing) existing.quantity = Math.min(25, existing.quantity + quantity);
  else cart.push({ product, quantity, variants });
  write('atelier-cart', cart);
  window.dispatchEvent(new Event('cart-updated'));
}
export function updateCart(index, quantity) {
  const cart = getCart();
  if (!cart[index]) return;
  if (quantity < 1) cart.splice(index, 1);
  else cart[index].quantity = Math.min(25, quantity);
  write('atelier-cart', cart);
  window.dispatchEvent(new Event('cart-updated'));
}
export function removeCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  write('atelier-cart', cart);
  window.dispatchEvent(new Event('cart-updated'));
}
export const clearCart = () => { write('atelier-cart', []); window.dispatchEvent(new Event('cart-updated')); };
export const getWishlist = () => read('atelier-wishlist');
export function toggleWishlist(product) {
  const list = getWishlist();
  const found = list.some(item => item._id === product._id);
  write('atelier-wishlist', found ? list.filter(item => item._id !== product._id) : [...list, product]);
  window.dispatchEvent(new Event('wishlist-updated'));
  return !found;
}
export function removeWishlist(id) {
  write('atelier-wishlist', getWishlist().filter(item => item._id !== id));
  window.dispatchEvent(new Event('wishlist-updated'));
}

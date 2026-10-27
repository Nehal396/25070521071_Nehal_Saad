import '../config/env.js';
import { connectDB } from '../config/db.js';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Coupon from '../models/Coupon.js';

const categoryData = [
  ['Electronics', 'electronics'], ['Fashion', 'fashion'], ['Accessories', 'accessories'],
  ['Home & Living', 'home-living'], ['Beauty', 'beauty'], ['Footwear', 'footwear']
];
const catalog = [
  ['Studio Wireless Headphones', 'electronics', 189, 229, 24, true, 'Rich, balanced sound wrapped in an all-day comfortable silhouette.', 'photo-1505740420928-5e560c06d30e'],
  ['Portable Bluetooth Speaker', 'electronics', 79, 99, 31, true, 'Room-filling sound and a considered, travel-ready finish.', 'photo-1608043152269-423dbba4e7e1'],
  ['Minimal Smart Watch', 'electronics', 149, 179, 18, true, 'Thoughtful everyday tracking with a bright, always-ready display.', 'photo-1523275335684-37898b6baf30'],
  ['Compact Film Camera', 'electronics', 119, 139, 12, false, 'A pocket-sized camera for keeping the little moments.', 'photo-1516035069371-29a1b244cc32'],
  ['Linen Weekend Shirt', 'fashion', 88, 110, 42, true, 'Breathable European linen with an easy, relaxed drape.', 'photo-1598033129183-c4f50c736f10'],
  ['Everyday Cotton Tee', 'fashion', 38, 48, 60, false, 'A premium-weight organic cotton staple, made to be worn on repeat.', 'photo-1521572163474-6864f9cf17ab'],
  ['Tailored Utility Jacket', 'fashion', 168, 198, 16, true, 'Clean lines and considered pockets in a durable cotton blend.', 'photo-1551028719-00167b16eac5'],
  ['Soft Knit Sweater', 'fashion', 124, 148, 21, false, 'A soft merino blend knit for cool mornings and late evenings.', 'photo-1576566588028-4147f3842f27'],
  ['Leather Card Holder', 'accessories', 54, 68, 34, true, 'Slim, responsibly sourced leather with room for daily essentials.', 'photo-1627123424574-724758594e93'],
  ['Everyday Canvas Tote', 'accessories', 46, 58, 52, false, 'A sturdy, roomy carryall with a simple silhouette.', 'photo-1544816155-12df9643f363'],
  ['Classic Metal Sunglasses', 'accessories', 92, 115, 20, true, 'Lightweight metal frames with UV-protective lenses.', 'photo-1511499767150-a48a237f0083'],
  ['Minimalist Analog Watch', 'accessories', 175, 210, 14, false, 'A quietly refined timepiece with a brushed steel case.', 'photo-1524805444758-089113d48a6d'],
  ['Ceramic Pour-Over Set', 'home-living', 64, 78, 28, true, 'A tactile stoneware set for a slower, better morning coffee.', 'photo-1495474472287-4d71bcdd2085'],
  ['Textured Cotton Throw', 'home-living', 98, 125, 19, false, 'A soft, naturally textured layer for the sofa or bed.', 'photo-1600210492486-724fe5c67fb0'],
  ['Amber Glass Candle', 'home-living', 36, 44, 45, false, 'A warm, gently spiced fragrance in reusable amber glass.', 'photo-1603006905003-be475563bc59'],
  ['Botanical Face Serum', 'beauty', 48, 58, 37, true, 'A lightweight daily serum with a fresh botanical blend.', 'photo-1601049541289-9b1b7bbbfe19'],
  ['Daily Mineral Sunscreen', 'beauty', 32, 39, 48, false, 'A comfortable, sheer mineral SPF for everyday wear.', 'photo-1608248543803-ba4f8c70ae0b'],
  ['Nourishing Hand Cream', 'beauty', 24, 29, 55, false, 'A quickly absorbed cream with a subtle, clean scent.', 'photo-1608571423902-eed4a5ad8108'],
  ['Leather Court Sneakers', 'footwear', 138, 165, 22, true, 'An understated court silhouette in soft, responsibly sourced leather.', 'photo-1542291026-7eec264c27ff'],
  ['Suede Everyday Loafers', 'footwear', 158, 188, 11, false, 'A versatile slip-on crafted in supple suede.', 'photo-1533867617858-e7b97e060509']
];

try {
  await connectDB();
  const categories = new Map();
  for (const [name, slug] of categoryData) {
    const category = await Category.findOneAndUpdate({ slug }, { name, slug, description: `Thoughtful ${name.toLowerCase()} for everyday living.`, isActive: true }, { upsert: true, new: true, setDefaultsOnInsert: true });
    categories.set(slug, category._id);
  }
  for (let index = 0; index < catalog.length; index += 1) {
    const [name, slug, price, compareAtPrice, stock, isFeatured, description, photo] = catalog[index];
    const productSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    await Product.findOneAndUpdate({ slug: productSlug }, {
      name, slug: productSlug, description, price, compareAtPrice,
      images: [`https://images.unsplash.com/${photo}?auto=format&fit=crop&w=1000&q=85`],
      category: categories.get(slug), brand: 'Atelier', sku: `ATL-${String(index + 1).padStart(4, '0')}`,
      stock, isFeatured, isActive: true
    }, { upsert: true, new: true, setDefaultsOnInsert: true });
  }
  await Coupon.updateOne({ code: 'WELCOME10' }, {
    code: 'WELCOME10', discountType: 'percent', discountValue: 10,
    minimumOrderValue: 50, maximumDiscount: 40, isActive: true
  }, { upsert: true, setDefaultsOnInsert: true });
  console.log(`Seeded ${catalog.length} products, ${categoryData.length} categories, and WELCOME10 coupon`);
} catch (error) {
  console.error('Seeding failed:', error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}

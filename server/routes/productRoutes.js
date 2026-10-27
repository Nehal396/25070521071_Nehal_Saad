import { Router } from 'express';
import { query, param } from 'express-validator';
import Product from '../models/Product.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();
const active = { isActive: true, stock: { $gte: 0 } };

router.get('/search', [query('q').trim().isLength({ min: 1, max: 100 })], validateRequest, async (req, res, next) => {
  try {
    const products = await Product.find({ ...active, $text: { $search: req.query.q } }).populate('category', 'name slug').limit(20);
    res.json({ success: true, data: products });
  } catch (error) { next(error); }
});

router.get('/featured', async (req, res, next) => {
  try {
    const products = await Product.find({ ...active, isFeatured: true }).populate('category', 'name slug').limit(8);
    res.json({ success: true, data: products });
  } catch (error) { next(error); }
});

router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 48 }),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('inStock').optional().isBoolean(),
  query('sort').optional().isIn(['popular', 'newest', 'price-asc', 'price-desc'])
], validateRequest, async (req, res, next) => {
  try {
    const { q, category, minPrice, maxPrice, sort = 'popular' } = req.query;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 12);
    const filter = { ...active };
    if (category) filter.category = category;
    if (req.query.inStock === 'true') filter.stock = { $gt: 0 };
    if (q) filter.$text = { $search: String(q).slice(0, 100) };
    if (minPrice || maxPrice) filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
    const sortOptions = { popular: { ratingsCount: -1 }, newest: { createdAt: -1 }, 'price-asc': { price: 1 }, 'price-desc': { price: -1 } };
    const [products, total] = await Promise.all([
      Product.find(filter).populate('category', 'name slug').sort(sortOptions[sort]).skip((page - 1) * limit).limit(limit),
      Product.countDocuments(filter)
    ]);
    res.json({ success: true, data: products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

router.get('/slug/:slug', [param('slug').isSlug()], validateRequest, async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true }).populate('category', 'name slug');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (error) { next(error); }
});

router.get('/:id', [param('id').isMongoId()], validateRequest, async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isActive: true }).populate('category', 'name slug');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (error) { next(error); }
});

export default router;

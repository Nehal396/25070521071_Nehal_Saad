import { Router } from 'express';
import { body, param } from 'express-validator';
import { rateLimit } from 'express-rate-limit';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();
const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ success: false, message: 'Review limit reached. Please try again later.' })
});
router.get('/products/:productId/reviews', [param('productId').isMongoId()], validateRequest, async (req, res, next) => {
  try {
    const reviews = await Review.find({ product: req.params.productId }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: reviews });
  } catch (error) { next(error); }
});
router.post('/products/:productId/reviews', reviewLimiter, [
  param('productId').isMongoId(),
  body('customerName').trim().isLength({ min: 2, max: 80 }),
  body('rating').isInt({ min: 1, max: 5 }),
  body('title').trim().isLength({ min: 2, max: 120 }),
  body('comment').trim().isLength({ min: 5, max: 1500 })
], validateRequest, async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.productId, isActive: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    const review = await Review.create({ ...req.body, product: product._id });
    const aggregate = await Review.aggregate([{ $match: { product: product._id } }, { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }]);
    await Product.updateOne({ _id: product._id }, { ratingsAverage: aggregate[0].average, ratingsCount: aggregate[0].count });
    res.status(201).json({ success: true, data: review });
  } catch (error) { next(error); }
});
export default router;

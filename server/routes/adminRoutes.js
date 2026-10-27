import { Router } from 'express';
import { body, param } from 'express-validator';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Order from '../models/Order.js';
import { requireAdmin } from '../middleware/adminAccess.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();
router.use(requireAdmin);
router.get('/analytics', async (req, res, next) => {
  try {
    const [orders, products, lowStock, revenue] = await Promise.all([
      Order.countDocuments(), Product.countDocuments({ isActive: true }),
      Product.find({ isActive: true, stock: { $lte: 5 } }).select('name stock sku').limit(20),
      Order.aggregate([{ $match: { orderStatus: { $ne: 'cancelled' } } }, { $group: { _id: null, total: { $sum: '$total' } } }])
    ]);
    res.json({ success: true, data: { orders, products, lowStock, revenue: revenue[0]?.total || 0 } });
  } catch (error) { next(error); }
});
router.get('/orders', async (req, res, next) => {
  try { res.json({ success: true, data: await Order.find().sort({ createdAt: -1 }).limit(100).select('-trackingTokenHash') }); }
  catch (error) { next(error); }
});
router.patch('/orders/:id/status', [
  param('id').isMongoId(),
  body('orderStatus').isIn(['confirmed', 'shipped', 'delivered', 'cancelled'])
], validateRequest, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const transitions = {
      processing: ['confirmed', 'shipped', 'cancelled'],
      confirmed: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: []
    };
    if (!transitions[order.orderStatus].includes(req.body.orderStatus)) {
      await session.abortTransaction();
      return res.status(409).json({ success: false, message: 'That order status transition is not allowed' });
    }
    if (req.body.orderStatus === 'cancelled') {
      for (const item of order.items) {
        await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }, { session });
      }
    }
    order.orderStatus = req.body.orderStatus;
    await order.save({ session });
    await session.commitTransaction();
    res.json({ success: true, data: order });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    if (error.code === 112 || error.code === 251 || /replica set|transaction numbers/i.test(error.message)) {
      return res.status(503).json({ success: false, message: 'Order updates require MongoDB configured as a replica set' });
    }
    next(error);
  } finally { await session.endSession(); }
});
router.post('/products', [
  body('name').trim().isLength({ min: 2, max: 140 }),
  body('slug').isSlug(),
  body('description').trim().isLength({ min: 5, max: 3000 }),
  body('price').isFloat({ min: 0 }),
  body('category').isMongoId(),
  body('sku').trim().isLength({ min: 2, max: 60 }),
  body('stock').isInt({ min: 0 }),
  body('images').isArray({ min: 1, max: 8 }),
  body('images.*').isURL({ protocols: ['https'], require_protocol: true }),
  body('isFeatured').optional().isBoolean()
], validateRequest, async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (error) { next(error); }
});
router.patch('/products/:id', [
  param('id').isMongoId(),
  body('name').optional().trim().isLength({ min: 2, max: 140 }),
  body('price').optional().isFloat({ min: 0 }),
  body('stock').optional().isInt({ min: 0 }),
  body('description').optional().trim().isLength({ min: 5, max: 3000 }),
  body('isActive').optional().isBoolean(),
  body('isFeatured').optional().isBoolean()
], validateRequest, async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (error) { next(error); }
});
router.delete('/products/:id', [param('id').isMongoId()], validateRequest, async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product archived' });
  } catch (error) { next(error); }
});
router.post('/categories', [
  body('name').trim().isLength({ min: 2, max: 80 }),
  body('slug').isSlug(),
  body('description').optional().trim().isLength({ max: 500 }),
  body('image').optional({ values: 'falsy' }).isURL({ protocols: ['https'], require_protocol: true })
], validateRequest, async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await Category.create(req.body) }); }
  catch (error) { next(error); }
});
router.patch('/categories/:id', [
  param('id').isMongoId(),
  body('name').optional().trim().isLength({ min: 2, max: 80 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('isActive').optional().isBoolean()
], validateRequest, async (req, res, next) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: category });
  } catch (error) { next(error); }
});
export default router;

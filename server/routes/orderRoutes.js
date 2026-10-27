import { Router } from 'express';
import { body, query } from 'express-validator';
import { rateLimit } from 'express-rate-limit';
import { createHash, randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();
const round = value => Math.round(value * 100) / 100;
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ success: false, message: 'Too many checkout attempts. Please try again later.' })
});

router.post('/', orderLimiter, [
  body('customer.name').trim().isLength({ min: 2, max: 100 }),
  body('customer.email').isEmail().normalizeEmail(),
  body('customer.phone').trim().isLength({ min: 7, max: 24 }),
  body('shippingAddress.address').trim().isLength({ min: 5, max: 200 }),
  body('shippingAddress.city').trim().isLength({ min: 2, max: 80 }),
  body('shippingAddress.state').trim().isLength({ min: 2, max: 80 }),
  body('shippingAddress.postalCode').trim().isLength({ min: 3, max: 20 }),
  body('shippingAddress.country').trim().isLength({ min: 2, max: 80 }),
  body('paymentMethod').equals('cash_on_delivery'),
  body('items').isArray({ min: 1, max: 30 }),
  body('items.*.productId').isMongoId(),
  body('items.*.quantity').isInt({ min: 1, max: 25 }),
  body('items.*.variants').optional().isObject(),
  body('couponCode').optional({ values: 'falsy' }).trim().isLength({ max: 32 })
], validateRequest, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const trackingToken = randomBytes(32).toString('hex');
    const orderNumber = `AT-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const compactItems = new Map();
    for (const item of req.body.items) {
      const key = `${item.productId}:${JSON.stringify(item.variants || {})}`;
      const existing = compactItems.get(key);
      if (existing) existing.quantity += Number(item.quantity);
      else compactItems.set(key, { ...item, quantity: Number(item.quantity) });
    }
    if ([...compactItems.values()].some(item => item.quantity > 25)) {
      return res.status(400).json({ success: false, message: 'A product quantity cannot exceed 25' });
    }
    session.startTransaction();
    const orderItems = [];
    for (const item of compactItems.values()) {
      const product = await Product.findOne({ _id: item.productId, isActive: true, stock: { $gte: item.quantity } }).session(session);
      if (!product) throw Object.assign(new Error('A product is unavailable or has insufficient stock'), { status: 409 });
      for (const [variantName, selected] of Object.entries(item.variants || {})) {
        const variant = product.variants.find(entry => entry.name === variantName);
        if (!variant || !variant.options.includes(selected)) {
          throw Object.assign(new Error(`Invalid ${variantName} selection for ${product.name}`), { status: 400 });
        }
      }
      const reserved = await Product.updateOne(
        { _id: product._id, isActive: true, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { session }
      );
      if (reserved.modifiedCount !== 1) throw Object.assign(new Error(`${product.name} just sold out`), { status: 409 });
      orderItems.push({
        product: product._id, name: product.name, image: product.images[0],
        unitPrice: product.price, quantity: item.quantity, variants: item.variants || {}
      });
    }
    const subtotal = round(orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0));
    const couponCode = String(req.body.couponCode || '').trim().toUpperCase();
    let discount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode, isActive: true }).session(session);
      if (!coupon || (coupon.expiresAt && coupon.expiresAt < new Date()) ||
          (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) || subtotal < coupon.minimumOrderValue) {
        throw Object.assign(new Error('Coupon is invalid or does not meet its requirements'), { status: 400 });
      }
      const rawDiscount = coupon.discountType === 'percent' ? subtotal * coupon.discountValue / 100 : coupon.discountValue;
      discount = round(Math.min(rawDiscount, coupon.maximumDiscount ?? rawDiscount, subtotal));
      const use = await Coupon.updateOne(
        { _id: coupon._id, isActive: true, $or: [{ usageLimit: null }, { usageLimit: { $exists: false } }, { $expr: { $lt: ['$usageCount', '$usageLimit'] } }] },
        { $inc: { usageCount: 1 } }, { session }
      );
      if (use.modifiedCount !== 1) throw Object.assign(new Error('Coupon usage limit has been reached'), { status: 400 });
    }
    const shippingCost = subtotal - discount >= 100 ? 0 : 8.95;
    const [order] = await Order.create([{
      orderNumber,
      trackingTokenHash: createHash('sha256').update(trackingToken).digest('hex'),
      customer: req.body.customer,
      shippingAddress: req.body.shippingAddress,
      items: orderItems, subtotal, discount, shippingCost, couponCode,
      total: round(subtotal - discount + shippingCost),
      paymentMethod: 'cash_on_delivery'
    }], { session });
    await session.commitTransaction();
    res.status(201).json({ success: true, data: { orderNumber, trackingToken, total: order.total } });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    if (error.code === 112 || error.code === 251 || /replica set|transaction numbers/i.test(error.message)) {
      return res.status(503).json({ success: false, message: 'Checkout requires MongoDB configured as a replica set' });
    }
    next(error);
  } finally {
    await session.endSession();
  }
});

router.get('/track', [
  query('orderNumber').trim().isLength({ min: 8, max: 40 }),
  query('token').isHexadecimal().isLength({ min: 64, max: 64 })
], validateRequest, async (req, res, next) => {
  try {
    const hash = createHash('sha256').update(req.query.token).digest('hex');
    const order = await Order.findOne({ orderNumber: req.query.orderNumber, trackingTokenHash: hash }).select('+trackingTokenHash').lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found. Check the order number and tracking token.' });
    delete order.trackingTokenHash;
    res.json({ success: true, data: order });
  } catch (error) { next(error); }
});

export default router;

import { Router } from 'express';
import { body } from 'express-validator';
import Coupon from '../models/Coupon.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();
router.post('/validate', [
  body('code').trim().isLength({ min: 2, max: 32 }),
  body('subtotal').isFloat({ min: 0 })
], validateRequest, async (req, res, next) => {
  try {
    const code = req.body.code.toUpperCase();
    const subtotal = Number(req.body.subtotal);
    const coupon = await Coupon.findOne({ code, isActive: true });
    if (!coupon || (coupon.expiresAt && coupon.expiresAt < new Date()) || (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit)) {
      return res.status(400).json({ success: false, message: 'This coupon is not available' });
    }
    if (subtotal < coupon.minimumOrderValue) return res.status(400).json({ success: false, message: `Minimum order value is ${coupon.minimumOrderValue}` });
    const discount = coupon.discountType === 'percent'
      ? subtotal * coupon.discountValue / 100
      : coupon.discountValue;
    res.json({ success: true, data: { code, discount: Math.round(Math.min(discount, coupon.maximumDiscount ?? discount, subtotal) * 100) / 100 } });
  } catch (error) { next(error); }
});
export default router;

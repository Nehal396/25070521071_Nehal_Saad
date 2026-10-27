import { Router } from 'express';
import { param } from 'express-validator';
import Category from '../models/Category.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();
router.get('/', async (req, res, next) => {
  try { res.json({ success: true, data: await Category.find({ isActive: true }).sort({ name: 1 }) }); }
  catch (error) { next(error); }
});
router.get('/:slug', [param('slug').isSlug()], validateRequest, async (req, res, next) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug, isActive: true });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: category });
  } catch (error) { next(error); }
});
export default router;

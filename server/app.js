import './config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import NewsletterSubscriber from './models/NewsletterSubscriber.js';

const app = express();
const allowedOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5500';
app.use(helmet());
app.use(cors({ origin: allowedOrigin, methods: ['GET', 'POST', 'PATCH', 'DELETE'], allowedHeaders: ['Content-Type', 'x-admin-secret'] }));
app.use(express.json({ limit: '30kb' }));
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' })
}));
app.get('/api/v1/health', (req, res) => res.json({ success: true, message: 'Atelier API is running' }));
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1', reviewRoutes);
app.use('/api/v1/coupons', couponRoutes);
app.use('/api/v1/admin', adminRoutes);
app.post('/api/v1/newsletter/subscribe', async (req, res, next) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: 'Enter a valid email address' });
  try {
    await NewsletterSubscriber.updateOne({ email }, { $setOnInsert: { email } }, { upsert: true });
    res.status(202).json({ success: true, message: 'Thanks for subscribing' });
  } catch (error) { next(error); }
});
app.use(notFound);
app.use(errorHandler);

export default app;

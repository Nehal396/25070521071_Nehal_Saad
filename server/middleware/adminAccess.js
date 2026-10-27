import { timingSafeEqual } from 'node:crypto';

export function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_SECRET;
  const supplied = req.get('x-admin-secret');
  if (!expected || !supplied) {
    return res.status(503).json({ success: false, message: 'Administrative access is not configured' });
  }
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  if (expectedBuffer.length !== suppliedBuffer.length || !timingSafeEqual(expectedBuffer, suppliedBuffer)) {
    return res.status(403).json({ success: false, message: 'Administrative access denied' });
  }
  next();
}

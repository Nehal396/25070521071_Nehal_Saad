import { validationResult } from 'express-validator';

export function validateRequest(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Please check the submitted information',
      errors: result.array().map(({ path, msg }) => ({ field: path, message: msg }))
    });
  }
  next();
}

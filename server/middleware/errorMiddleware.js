export function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = error.status || (
    error.name === 'ValidationError' || error.name === 'CastError' || error.type === 'entity.parse.failed' ? 400 :
    error.code === 11000 ? 409 : 500
  );
  if (status >= 500) console.error(error);
  res.status(status).json({
    success: false,
    message: status >= 500 ? 'An unexpected server error occurred' : error.message,
    ...(error.details ? { errors: error.details } : {})
  });
}

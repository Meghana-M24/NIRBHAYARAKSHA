import mongoose from 'mongoose';

export function requireJsonObjectBody(req, res, next) {
  const { body } = req;

  if (body === undefined) {
    return next();
  }

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({
      success: false,
      message: 'Request body must be a JSON object',
    });
  }

  return next();
}

export function validateObjectIdParam(paramName, message) {
  return (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params[paramName])) {
      return res.status(404).json({
        success: false,
        message,
      });
    }

    return next();
  };
}

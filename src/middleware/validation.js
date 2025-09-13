const Joi = require('joi');

// Generic validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    req.validatedData = value;
    next();
  };
};

// Validation schemas
const schemas = {
  // User registration
  register: Joi.object({
    firstName: Joi.string().trim().min(2).max(50).required(),
    lastName: Joi.string().trim().min(2).max(50).required(),
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().min(6).max(128).required(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
    dateOfBirth: Joi.date().max('now').optional(),
    gender: Joi.string().valid('male', 'female', 'other', 'prefer-not-to-say').optional()
  }),

  // User login
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  // Product creation
  createProduct: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    description: Joi.string().trim().min(10).max(2000).required(),
    shortDescription: Joi.string().trim().max(200).optional(),
    price: Joi.number().min(0).required(),
    comparePrice: Joi.number().min(0).optional(),
    cost: Joi.number().min(0).optional(),
    category: Joi.string().hex().length(24).required(),
    subcategory: Joi.string().hex().length(24).optional(),
    tags: Joi.array().items(Joi.string().trim()).optional(),
    brand: Joi.string().trim().optional(),
    inventory: Joi.object({
      sku: Joi.string().uppercase().required(),
      barcode: Joi.string().optional(),
      quantity: Joi.number().min(0).required(),
      lowStockThreshold: Joi.number().min(0).optional(),
      trackQuantity: Joi.boolean().optional()
    }).required()
  }),

  // Update profile
  updateProfile: Joi.object({
    firstName: Joi.string().trim().min(2).max(50).optional(),
    lastName: Joi.string().trim().min(2).max(50).optional(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
    dateOfBirth: Joi.date().max('now').optional(),
    gender: Joi.string().valid('male', 'female', 'other', 'prefer-not-to-say').optional()
  }),

  // Change password
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).max(128).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
  })
};

module.exports = { validate, schemas };
// src/routes/products.js
const express = require('express');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const Product = require('../models/Product');

const router = express.Router();

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      brand,
      tags,
      sort = '-createdAt',
      page = 1,
      limit = 20
    } = req.query;

    const options = {
      category,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      brand,
      tags: tags ? tags.split(',') : undefined,
      sort,
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    };

    const products = await Product.search(search, options);
    const total = await Product.countDocuments({
      status: 'active',
      visibility: 'visible',
      ...(search && { $text: { $search: search } }),
      ...(category && { category }),
      ...(minPrice && { price: { $gte: minPrice } }),
      ...(maxPrice && { price: { $lte: maxPrice } }),
      ...(brand && { brand: new RegExp(brand, 'i') }),
      ...(tags && { tags: { $in: tags.split(',') } })
    });

    res.json({
      success: true,
      count: products.length,
      total,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      },
      data: { products }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get featured products
// @route   GET /api/v1/products/featured
// @access  Public
router.get('/featured', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const products = await Product.findFeatured(limit);

    res.json({
      success: true,
      count: products.length,
      data: { products }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single product
// @route   GET /api/v1/products/:id
// @access  Public
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name slug')
      .populate('subcategory', 'name slug')
      .populate('createdBy', 'firstName lastName');

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Increment view count (don't await to avoid slowing response)
    product.addView().catch(console.error);

    res.json({
      success: true,
      data: { product }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

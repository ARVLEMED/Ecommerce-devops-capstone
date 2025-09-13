// src/routes/users.js
const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// All routes are protected and require admin role
router.use(protect);
router.use(authorize('admin'));

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      status,
      search
    } = req.query;

    const query = {};
    
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      count: users.length,
      total,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      },
      data: { users }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private/Admin
router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Private/Admin
router.put('/:id', async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

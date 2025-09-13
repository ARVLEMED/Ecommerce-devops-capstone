const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot be more than 100 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  shortDescription: {
    type: String,
    maxlength: [200, 'Short description cannot be more than 200 characters']
  },
  
  // Pricing Information
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  comparePrice: {
    type: Number,
    validate: {
      validator: function(v) {
        return v === null || v === undefined || v >= this.price;
      },
      message: 'Compare price must be greater than or equal to price'
    }
  },
  cost: {
    type: Number,
    min: [0, 'Cost cannot be negative']
  },
  
  // Category & Classification
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Product category is required']
  },
  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  brand: {
    type: String,
    trim: true
  },
  
  // Images & Media
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      default: ''
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  
  // Inventory Management
  inventory: {
    sku: {
      type: String,
      unique: true,
      required: [true, 'SKU is required'],
      uppercase: true,
      trim: true
    },
    barcode: {
      type: String,
      trim: true
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
      min: [0, 'Low stock threshold cannot be negative']
    },
    trackQuantity: {
      type: Boolean,
      default: true
    }
  },
  
  // Product Variants (e.g., size, color)
  variants: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    values: [{
      value: {
        type: String,
        required: true,
        trim: true
      },
      price: {
        type: Number,
        default: 0
      },
      sku: {
        type: String,
        trim: true
      },
      quantity: {
        type: Number,
        default: 0,
        min: 0
      }
    }]
  }],
  
  // Physical Properties
  dimensions: {
    weight: {
      value: { type: Number, min: 0 },
      unit: { type: String, enum: ['g', 'kg', 'lb'], default: 'kg' }
    },
    length: {
      value: { type: Number, min: 0 },
      unit: { type: String, enum: ['cm', 'm', 'in', 'ft'], default: 'cm' }
    },
    width: {
      value: { type: Number, min: 0 },
      unit: { type: String, enum: ['cm', 'm', 'in', 'ft'], default: 'cm' }
    },
    height: {
      value: { type: Number, min: 0 },
      unit: { type: String, enum: ['cm', 'm', 'in', 'ft'], default: 'cm' }
    }
  },
  
  // Status & Visibility
  status: {
    type: String,
    enum: ['active', 'inactive', 'draft', 'archived'],
    default: 'active'
  },
  visibility: {
    type: String,
    enum: ['visible', 'hidden', 'catalog-only'],
    default: 'visible'
  },
  featured: {
    type: Boolean,
    default: false
  },
  
  // SEO & Marketing
  seo: {
    title: {
      type: String,
      maxlength: [60, 'SEO title cannot be more than 60 characters']
    },
    description: {
      type: String,
      maxlength: [160, 'SEO description cannot be more than 160 characters']
    },
    keywords: [String]
  },
  
  // Sales & Analytics
  salesCount: {
    type: Number,
    default: 0,
    min: 0
  },
  viewCount: {
    type: Number,
    default: 0,
    min: 0
  },
  rating: {
    average: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    count: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // Timestamps
  publishedAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for primary image
productSchema.virtual('primaryImage').get(function() {
  if (this.images && this.images.length > 0) {
    const primaryImg = this.images.find(img => img.isPrimary);
    return primaryImg || this.images[0];
  }
  return null;
});

// Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
  if (!this.inventory.trackQuantity) return 'in-stock';
  if (this.inventory.quantity <= 0) return 'out-of-stock';
  if (this.inventory.quantity <= this.inventory.lowStockThreshold) return 'low-stock';
  return 'in-stock';
});

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.comparePrice && this.comparePrice > this.price) {
    return Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100);
  }
  return 0;
});

// Virtual for availability
productSchema.virtual('isAvailable').get(function() {
  return this.status === 'active' && 
         this.visibility === 'visible' && 
         (this.stockStatus !== 'out-of-stock' || !this.inventory.trackQuantity);
});

// Indexes for performance
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ subcategory: 1 });
productSchema.index({ status: 1 });
productSchema.index({ visibility: 1 });
productSchema.index({ featured: 1 });
productSchema.index({ price: 1 });
productSchema.index({ 'inventory.sku': 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ salesCount: -1 });
productSchema.index({ 'rating.average': -1 });

// Pre-save middleware to generate slug
productSchema.pre('save', function(next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    
    // Ensure uniqueness by appending timestamp if needed
    if (this.isNew) {
      this.slug = `${this.slug}-${Date.now()}`;
    }
  }
  next();
});

// Pre-save middleware to ensure only one primary image
productSchema.pre('save', function(next) {
  if (this.images && this.images.length > 0) {
    let primaryCount = 0;
    this.images.forEach((image, index) => {
      if (image.isPrimary) {
        primaryCount++;
        if (primaryCount > 1) {
          image.isPrimary = false;
        }
      }
    });
    
    // If no primary image, make the first one primary
    if (primaryCount === 0) {
      this.images[0].isPrimary = true;
    }
  }
  next();
});

// Pre-save middleware to update publishedAt
productSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'active' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Static method to find available products
productSchema.statics.findAvailable = function() {
  return this.find({
    status: 'active',
    visibility: 'visible'
  });
};

// Static method to find by category
productSchema.statics.findByCategory = function(categoryId) {
  return this.find({
    category: categoryId,
    status: 'active',
    visibility: 'visible'
  });
};

// Static method to find featured products
productSchema.statics.findFeatured = function(limit = 10) {
  return this.find({
    featured: true,
    status: 'active',
    visibility: 'visible'
  }).limit(limit);
};

// Static method for search
productSchema.statics.search = function(query, options = {}) {
  const {
    category,
    minPrice,
    maxPrice,
    brand,
    tags,
    sort = '-createdAt',
    limit = 20,
    skip = 0
  } = options;
  
  const searchQuery = {
    status: 'active',
    visibility: 'visible',
    ...(query && { $text: { $search: query } }),
    ...(category && { category }),
    ...(minPrice && { price: { $gte: minPrice } }),
    ...(maxPrice && { price: { ...searchQuery.price, $lte: maxPrice } }),
    ...(brand && { brand: new RegExp(brand, 'i') }),
    ...(tags && { tags: { $in: tags } })
  };
  
  return this.find(searchQuery)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('category', 'name slug')
    .populate('subcategory', 'name slug');
};

// Instance method to update stock
productSchema.methods.updateStock = function(quantity) {
  this.inventory.quantity += quantity;
  return this.save();
};

// Instance method to add view
productSchema.methods.addView = function() {
  this.viewCount += 1;
  return this.save();
};

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
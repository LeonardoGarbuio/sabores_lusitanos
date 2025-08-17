const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  rating: {
    type: Number,
    required: [true, 'Rating é obrigatório'],
    min: [1, 'Rating deve ser pelo menos 1'],
    max: [5, 'Rating não pode ser maior que 5']
  },
  title: {
    type: String,
    required: [true, 'Título é obrigatório'],
    trim: true,
    maxlength: [100, 'Título não pode ter mais de 100 caracteres']
  },
  content: {
    type: String,
    required: [true, 'Conteúdo é obrigatório'],
    maxlength: [1000, 'Conteúdo não pode ter mais de 1000 caracteres']
  },
  foodRating: {
    type: Number,
    min: 1,
    max: 5
  },
  serviceRating: {
    type: Number,
    min: 1,
    max: 5
  },
  atmosphereRating: {
    type: Number,
    min: 1,
    max: 5
  },
  valueRating: {
    type: Number,
    min: 1,
    max: 5
  },
  images: [{
    url: String,
    caption: String
  }],
  tags: [String],
  helpful: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    helpful: Boolean
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  response: {
    from: {
      type: String,
      enum: ['owner', 'manager']
    },
    content: String,
    date: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for helpful count
reviewSchema.virtual('helpfulCount').get(function() {
  return this.helpful ? this.helpful.filter(h => h.helpful).length : 0;
});

// Virtual for unhelpful count
reviewSchema.virtual('unhelpfulCount').get(function() {
  return this.helpful ? this.helpful.filter(h => !h.helpful).length : 0;
});

// Virtual for overall rating
reviewSchema.virtual('overallRating').get(function() {
  const ratings = [this.foodRating, this.serviceRating, this.atmosphereRating, this.valueRating];
  const validRatings = ratings.filter(r => r && r > 0);
  
  if (validRatings.length === 0) return this.rating;
  
  return Math.round((validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length) * 10) / 10;
});

// Prevent multiple reviews from same user for same restaurant
reviewSchema.index({ user: 1, restaurant: 1 }, { unique: true });

// Indexes for search and performance
reviewSchema.index({ restaurant: 1, rating: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });
reviewSchema.index({ 'helpful.helpful': 1 });
reviewSchema.index({ isVerified: 1 });

// Update restaurant rating when review is saved/updated/deleted
reviewSchema.post('save', async function() {
  await this.constructor.updateRestaurantRating(this.restaurant);
});

reviewSchema.post('findOneAndUpdate', async function() {
  if (this.restaurant) {
    await this.constructor.updateRestaurantRating(this.restaurant);
  }
});

reviewSchema.post('findOneAndDelete', async function() {
  if (this.restaurant) {
    await this.constructor.updateRestaurantRating(this.restaurant);
  }
});

// Static method to update restaurant rating
reviewSchema.statics.updateRestaurantRating = async function(restaurantId) {
  const stats = await this.aggregate([
    {
      $match: { restaurant: restaurantId, isActive: true }
    },
    {
      $group: {
        _id: '$restaurant',
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    await mongoose.model('Restaurant').findByIdAndUpdate(restaurantId, {
      'rating.average': Math.round(stats[0].avgRating * 10) / 10,
      'rating.count': stats[0].count
    });
  } else {
    await mongoose.model('Restaurant').findByIdAndUpdate(restaurantId, {
      'rating.average': 0,
      'rating.count': 0
    });
  }
};

module.exports = mongoose.model('Review', reviewSchema);

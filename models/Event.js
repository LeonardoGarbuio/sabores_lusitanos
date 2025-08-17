const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Título é obrigatório'],
    trim: true,
    maxlength: [100, 'Título não pode ter mais de 100 caracteres']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Descrição é obrigatória'],
    maxlength: [2000, 'Descrição não pode ter mais de 2000 caracteres']
  },
  shortDescription: {
    type: String,
    maxlength: [300, 'Descrição curta não pode ter mais de 300 caracteres']
  },
  type: {
    type: String,
    required: true,
    enum: ['festival', 'cooking_class', 'wine_tasting', 'cultural_celebration', 'food_tour', 'workshop', 'dinner_experience']
  },
  category: {
    type: String,
    required: true,
    enum: ['festivals', 'classes', 'tastings', 'cultural', 'tours', 'workshops', 'experiences']
  },
  organizer: {
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['restaurant', 'chef', 'organization', 'individual'],
      required: true
    },
    contact: {
      email: String,
      phone: String,
      website: String
    }
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant'
  },
  location: {
    address: {
      street: String,
      city: String,
      postalCode: String,
      region: {
        type: String,
        enum: ['minho', 'douro', 'beiras', 'lisboa', 'alentejo', 'algarve', 'madeira', 'acores']
      }
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    venue: String,
    isOnline: {
      type: Boolean,
      default: false
    },
    onlinePlatform: String
  },
  dates: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    startTime: String,
    endTime: String,
    isRecurring: {
      type: Boolean,
      default: false
    },
    recurrencePattern: String
  },
  capacity: {
    max: Number,
    current: Number,
    isUnlimited: {
      type: Boolean,
      default: false
    }
  },
  pricing: {
    type: {
      type: String,
      enum: ['free', 'fixed', 'variable', 'donation'],
      required: true
    },
    amount: Number,
    currency: {
      type: String,
      default: 'EUR'
    },
    description: String,
    earlyBird: {
      amount: Number,
      validUntil: Date
    }
  },
  images: [{
    url: String,
    caption: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  highlights: [String],
  requirements: [String],
  included: [String],
  notIncluded: [String],
  targetAudience: [String],
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'all_levels'],
    default: 'all_levels'
  },
  languages: [String],
  tags: [String],
  isFeatured: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  registrations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EventRegistration'
  }],
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EventReview'
  }],
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for event status
eventSchema.virtual('status').get(function() {
  const now = new Date();
  const startDate = new Date(this.dates.startDate);
  const endDate = new Date(this.dates.endDate);
  
  if (now < startDate) return 'upcoming';
  if (now >= startDate && now <= endDate) return 'ongoing';
  return 'past';
});

// Virtual for event duration in days
eventSchema.virtual('duration').get(function() {
  const start = new Date(this.dates.startDate);
  const end = new Date(this.dates.endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for availability
eventSchema.virtual('isAvailable').get(function() {
  if (this.capacity.isUnlimited) return true;
  return this.capacity.current < this.capacity.max;
});

// Virtual for registration count
eventSchema.virtual('registrationCount').get(function() {
  return this.registrations ? this.registrations.length : 0;
});

// Generate slug before saving
eventSchema.pre('save', function(next) {
  if (!this.isModified('title')) {
    return next();
  }
  
  this.slug = this.title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
  
  next();
});

// Indexes for search and performance
eventSchema.index({ title: 'text', description: 'text', highlights: 'text' });
eventSchema.index({ type: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ 'location.region': 1 });
eventSchema.index({ 'dates.startDate': 1 });
eventSchema.index({ isFeatured: 1 });
eventSchema.index({ isActive: 1 });
eventSchema.index({ 'location.coordinates': '2dsphere' });

module.exports = mongoose.model('Event', eventSchema);

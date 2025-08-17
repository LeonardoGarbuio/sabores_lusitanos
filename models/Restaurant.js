const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome do restaurante é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome não pode ter mais de 100 caracteres']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Descrição é obrigatória'],
    maxlength: [1000, 'Descrição não pode ter mais de 1000 caracteres']
  },
  shortDescription: {
    type: String,
    maxlength: [200, 'Descrição curta não pode ter mais de 200 caracteres']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    address: {
      street: String,
      city: String,
      postalCode: String,
      region: {
        type: String,
        required: true,
        enum: ['minho', 'douro', 'beiras', 'lisboa', 'alentejo', 'algarve', 'madeira', 'acores']
      },
      country: {
        type: String,
        default: 'Portugal'
      }
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  contact: {
    phone: String,
    email: String,
    website: String,
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String
    }
  },
  cuisine: {
    type: {
      type: String,
      required: true,
      enum: ['tradicional', 'contemporanea', 'fusion', 'vegetariana', 'vegana']
    },
    specialties: [String],
    regionalDishes: [String],
    dietaryOptions: [String]
  },
  priceRange: {
    type: String,
    required: true,
    enum: ['€', '€€', '€€€', '€€€€']
  },
  averagePrice: {
    type: Number,
    min: 0
  },
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
  },
  authenticity: {
    level: {
      type: String,
      enum: ['traditional-family', 'innovative-chef', 'modern-fusion'],
      required: true
    },
    familyGenerations: Number,
    foundingYear: Number,
    heritageDescription: String
  },
  features: {
    hasFado: Boolean,
    hasWineTasting: Boolean,
    hasCookingClasses: Boolean,
    hasOutdoorSeating: Boolean,
    hasPrivateRooms: Boolean,
    isWheelchairAccessible: Boolean,
    acceptsReservations: Boolean,
    hasDelivery: Boolean,
    hasTakeaway: Boolean
  },
  openingHours: {
    monday: { open: String, close: String, closed: { type: Boolean, default: false } },
    tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
    friday: { open: String, close: String, closed: { type: Boolean, default: false } },
    saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
    sunday: { open: String, close: String, closed: { type: Boolean, default: false } }
  },
  images: [{
    url: String,
    caption: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  menu: {
    highlights: [String],
    seasonalDishes: [String],
    wineList: [String],
    signatureDishes: [String]
  },
  awards: [{
    name: String,
    year: Number,
    organization: String,
    description: String
  }],
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }],
  reservations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation'
  }],
  events: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  tags: [String]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for restaurant's full address
restaurantSchema.virtual('fullAddress').get(function() {
  const loc = this.location;
  return `${loc.address.street}, ${loc.address.city}, ${loc.address.postalCode}, ${loc.address.region}`;
});

// Virtual for restaurant's review count
restaurantSchema.virtual('reviewCount').get(function() {
  return this.reviews ? this.reviews.length : 0;
});

// Virtual for restaurant's age
restaurantSchema.virtual('age').get(function() {
  if (this.authenticity.foundingYear) {
    return new Date().getFullYear() - this.authenticity.foundingYear;
  }
  return null;
});

// Generate slug before saving
restaurantSchema.pre('save', function(next) {
  if (!this.isModified('name')) {
    return next();
  }
  
  this.slug = this.name
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
  
  next();
});

// Update average rating when reviews change
restaurantSchema.methods.updateRating = async function() {
  const reviews = await this.model('Review').find({ restaurant: this._id });
  
  if (reviews.length === 0) {
    this.rating.average = 0;
    this.rating.count = 0;
  } else {
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    this.rating.average = Math.round((totalRating / reviews.length) * 10) / 10;
    this.rating.count = reviews.length;
  }
  
  await this.save();
};

// Indexes for search and performance
restaurantSchema.index({ name: 'text', description: 'text', 'cuisine.specialties': 'text' });
restaurantSchema.index({ 'location.region': 1 });
restaurantSchema.index({ 'cuisine.type': 1 });
restaurantSchema.index({ priceRange: 1 });
restaurantSchema.index({ rating: -1 });
restaurantSchema.index({ featured: 1 });
restaurantSchema.index({ 'location.coordinates': '2dsphere' });

module.exports = mongoose.model('Restaurant', restaurantSchema);

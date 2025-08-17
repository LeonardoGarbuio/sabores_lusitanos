const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Título é obrigatório'],
    trim: true,
    maxlength: [150, 'Título não pode ter mais de 150 caracteres']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  content: {
    type: String,
    required: [true, 'Conteúdo é obrigatório'],
    maxlength: [5000, 'Conteúdo não pode ter mais de 5000 caracteres']
  },
  excerpt: {
    type: String,
    maxlength: [300, 'Excerto não pode ter mais de 300 caracteres']
  },
  category: {
    type: String,
    required: true,
    enum: ['traditions', 'chef_profile', 'ingredients', 'recipes', 'cultural_history', 'personal_experience', 'travel', 'seasonal']
  },
  tags: [String],
  images: [{
    url: String,
    caption: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  relatedRestaurants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant'
  }],
  relatedEvents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }],
  region: {
    type: String,
    enum: ['minho', 'douro', 'beiras', 'lisboa', 'alentejo', 'algarve', 'madeira', 'acores', 'general']
  },
  readingTime: {
    type: Number,
    min: 1,
    max: 60
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'published', 'archived'],
    default: 'draft'
  },
  publishedAt: Date,
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: {
      type: String,
      required: true,
      maxlength: [500, 'Comentário não pode ter mais de 500 caracteres']
    },
    isApproved: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for like count
storySchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Virtual for comment count
storySchema.virtual('commentCount').get(function() {
  return this.comments ? this.comments.filter(c => c.isApproved).length : 0;
});

// Virtual for reading time (if not set)
storySchema.virtual('estimatedReadingTime').get(function() {
  if (this.readingTime) return this.readingTime;
  
  const wordsPerMinute = 200;
  const wordCount = this.content.split(' ').length;
  return Math.ceil(wordCount / wordsPerMinute);
});

// Generate slug before saving
storySchema.pre('save', function(next) {
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

// Set publishedAt when status changes to published
storySchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Indexes for search and performance
storySchema.index({ title: 'text', content: 'text', tags: 'text' });
storySchema.index({ author: 1 });
storySchema.index({ category: 1 });
storySchema.index({ region: 1 });
storySchema.index({ status: 1 });
storySchema.index({ isPublished: 1 });
storySchema.index({ isFeatured: 1 });
storySchema.index({ publishedAt: -1 });
storySchema.index({ views: -1 });
storySchema.index({ 'likes.user': 1 });

module.exports = mongoose.model('Story', storySchema);

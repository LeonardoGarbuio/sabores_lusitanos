const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Story = require('../models/Story');
const Review = require('../models/Review');
const { protect, optionalAuth, admin } = require('../middleware/auth');
const { handleMultipleUpload } = require('../middleware/upload');

const router = express.Router();

// ==================== STORIES ROUTES ====================

// @desc    Get all stories with filters
// @route   GET /api/community/stories
// @access  Public
router.get('/stories', [
  query('page').optional().isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite deve ser entre 1 e 100'),
  query('category').optional().isIn(['traditions', 'chef_profile', 'ingredients', 'recipes', 'cultural_history', 'personal_experience', 'travel', 'seasonal']),
  query('region').optional().isIn(['minho', 'douro', 'beiras', 'lisboa', 'alentejo', 'algarve', 'madeira', 'acores', 'general']),
  query('sort').optional().isIn(['newest', 'oldest', 'popular', 'featured']),
  query('search').optional().trim()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      page = 1,
      limit = 12,
      category,
      region,
      sort = 'newest',
      search
    } = req.query;

    // Build filter object
    const filter = { 
      isActive: true, 
      isPublished: true,
      status: 'published'
    };

    if (category) filter.category = category;
    if (region) filter.region = region;
    if (search) filter.$text = { $search: search };

    // Build sort object
    let sortObj = {};
    switch (sort) {
      case 'oldest':
        sortObj = { publishedAt: 1 };
        break;
      case 'popular':
        sortObj = { views: -1, likeCount: -1 };
        break;
      case 'featured':
        sortObj = { isFeatured: -1, publishedAt: -1 };
        break;
      case 'newest':
      default:
        sortObj = { publishedAt: -1 };
        break;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const stories = await Story.find(filter)
      .populate('author', 'name avatar')
      .populate('relatedRestaurants', 'name slug images')
      .populate('relatedEvents', 'title slug dates images')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    // Get total count for pagination
    const total = await Story.countDocuments(filter);

    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      success: true,
      data: stories,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        total,
        hasNextPage,
        hasPrevPage,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Get single story by slug
// @route   GET /api/community/stories/:slug
// @access  Public
router.get('/stories/:slug', optionalAuth, async (req, res) => {
  try {
    const story = await Story.findOne({ 
      slug: req.params.slug, 
      isActive: true,
      isPublished: true,
      status: 'published'
    })
    .populate('author', 'name avatar')
    .populate('relatedRestaurants', 'name slug images rating')
    .populate('relatedEvents', 'title slug dates images')
    .populate({
      path: 'comments',
      match: { isApproved: true },
      populate: {
        path: 'user',
        select: 'name avatar'
      },
      options: { sort: { createdAt: -1 } }
    })
    .select('-__v');

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'História não encontrada'
      });
    }

    // Increment views
    story.views += 1;
    await story.save();

    res.json({
      success: true,
      data: story
    });
  } catch (error) {
    console.error('Get story error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Create new story (public)
// @route   POST /api/community/stories
// @access  Public
router.post('/stories', [
  body('title')
    .trim()
    .isLength({ min: 2, max: 150 })
    .withMessage('Título deve ter entre 2 e 150 caracteres'),
  body('content')
    .trim()
    .isLength({ min: 50, max: 5000 })
    .withMessage('Conteúdo deve ter entre 50 e 5000 caracteres'),
  body('category')
    .isIn(['traditions', 'chef_profile', 'ingredients', 'recipes', 'cultural_history', 'personal_experience', 'travel', 'seasonal'])
    .withMessage('Categoria inválida'),
  body('region')
    .optional()
    .isIn(['minho', 'douro', 'beiras', 'lisboa', 'alentejo', 'algarve', 'madeira', 'acores', 'general'])
    .withMessage('Região inválida')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Set default values for public stories
    req.body.author = null; // Anonymous story
    req.body.status = 'published';
    req.body.isPublished = true;
    req.body.isActive = true;

    const story = await Story.create(req.body);

    res.status(201).json({
      success: true,
      data: story
    });
  } catch (error) {
    console.error('Create story error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Update story
// @route   PUT /api/community/stories/:id
// @access  Private (Author or Admin)
router.put('/stories/:id', protect, [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 150 })
    .withMessage('Título deve ter entre 2 e 150 caracteres'),
  body('content')
    .optional()
    .trim()
    .isLength({ min: 50, max: 5000 })
    .withMessage('Conteúdo deve ter entre 50 e 5000 caracteres')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    let story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'História não encontrada'
      });
    }

    // Check ownership
    if (story.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado a editar esta história'
      });
    }

    // Update story
    story = await Story.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.json({
      success: true,
      data: story
    });
  } catch (error) {
    console.error('Update story error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Delete story
// @route   DELETE /api/community/stories/:id
// @access  Private (Author or Admin)
router.delete('/stories/:id', protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'História não encontrada'
      });
    }

    // Check ownership
    if (story.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado a eliminar esta história'
      });
    }

    // Soft delete
    story.isActive = false;
    await story.save();

    res.json({
      success: true,
      message: 'História eliminada com sucesso'
    });
  } catch (error) {
    console.error('Delete story error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Upload story images
// @route   POST /api/community/stories/:id/images
// @access  Private (Author or Admin)
router.post('/stories/:id/images', protect, handleMultipleUpload, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'História não encontrada'
      });
    }

    // Check ownership
    if (story.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado a editar esta história'
      });
    }

    // Process uploaded images
    const images = req.files.map((file, index) => ({
      url: `/uploads/${file.filename}`,
      caption: req.body.captions?.[index] || '',
      isPrimary: index === 0 // First image is primary
    }));

    // Add images to story
    story.images.push(...images);
    await story.save();

    res.json({
      success: true,
      data: images
    });
  } catch (error) {
    console.error('Upload story images error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Like/Unlike story
// @route   POST /api/community/stories/:id/like
// @access  Private
router.post('/stories/:id/like', protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'História não encontrada'
      });
    }

    const existingLike = story.likes.find(like => like.user.toString() === req.user._id.toString());

    if (existingLike) {
      // Remove like
      story.likes = story.likes.filter(like => like.user.toString() !== req.user._id.toString());
      await story.save();
      
      res.json({
        success: true,
        message: 'Like removido',
        isLiked: false
      });
    } else {
      // Add like
      story.likes.push({ user: req.user._id });
      await story.save();
      
      res.json({
        success: true,
        message: 'História gostada',
        isLiked: true
      });
    }
  } catch (error) {
    console.error('Toggle story like error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Add comment to story
// @route   POST /api/community/stories/:id/comments
// @access  Private
router.post('/stories/:id/comments', protect, [
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Comentário deve ter entre 1 e 500 caracteres')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'História não encontrada'
      });
    }

    const comment = {
      user: req.user._id,
      content: req.body.content,
      isApproved: req.user.role === 'admin' // Auto-approve admin comments
    };

    story.comments.push(comment);
    await story.save();

    // Populate user info for response
    await story.populate('comments.user', 'name avatar');

    const newComment = story.comments[story.comments.length - 1];

    res.status(201).json({
      success: true,
      data: newComment
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// ==================== REVIEWS ROUTES ====================

// @desc    Get all reviews with filters
// @route   GET /api/community/reviews
// @access  Public
router.get('/reviews', [
  query('page').optional().isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite deve ser entre 1 e 100'),
  query('restaurant').optional().isMongoId().withMessage('ID do restaurante inválido'),
  query('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating deve ser entre 1 e 5'),
  query('sort').optional().isIn(['newest', 'oldest', 'rating', 'helpful']),
  query('search').optional().trim()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      page = 1,
      limit = 12,
      restaurant,
      rating,
      sort = 'newest',
      search
    } = req.query;

    // Build filter object
    const filter = { isActive: true };

    if (restaurant) filter.restaurant = restaurant;
    if (rating) filter.rating = parseInt(rating);
    if (search) filter.$text = { $search: search };

    // Build sort object
    let sortObj = {};
    switch (sort) {
      case 'oldest':
        sortObj = { createdAt: 1 };
        break;
      case 'rating':
        sortObj = { rating: -1 };
        break;
      case 'helpful':
        sortObj = { 'helpful.helpful': -1 };
        break;
      case 'newest':
      default:
        sortObj = { createdAt: -1 };
        break;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const reviews = await Review.find(filter)
      .populate('user', 'name avatar')
      .populate('restaurant', 'name slug images')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    // Get total count for pagination
    const total = await Review.countDocuments(filter);

    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      success: true,
      data: reviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        total,
        hasNextPage,
        hasPrevPage,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Create new review
// @route   POST /api/community/reviews
// @access  Private
router.post('/reviews', protect, [
  body('restaurant')
    .isMongoId()
    .withMessage('ID do restaurante inválido'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating deve ser entre 1 e 5'),
  body('title')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Título deve ter entre 2 e 100 caracteres'),
  body('content')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Conteúdo deve ter entre 10 e 1000 caracteres')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Check if user already reviewed this restaurant
    const existingReview = await Review.findOne({
      user: req.user._id,
      restaurant: req.body.restaurant
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Já avaliou este restaurante'
      });
    }

    // Set user
    req.body.user = req.user._id;

    const review = await Review.create(req.body);

    // Update restaurant rating
    const Restaurant = require('../models/Restaurant');
    const restaurant = await Restaurant.findById(req.body.restaurant);
    if (restaurant) {
      await restaurant.updateRating();
    }

    res.status(201).json({
      success: true,
      data: review
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Update review
// @route   PUT /api/community/reviews/:id
// @access  Private (Author or Admin)
router.put('/reviews/:id', protect, [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Título deve ter entre 2 e 100 caracteres'),
  body('content')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Conteúdo deve ter entre 10 e 1000 caracteres'),
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating deve ser entre 1 e 5')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    let review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review não encontrado'
      });
    }

    // Check ownership
    if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado a editar este review'
      });
    }

    // Update review
    review = await Review.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    // Update restaurant rating
    const Restaurant = require('../models/Restaurant');
    const restaurant = await Restaurant.findById(review.restaurant);
    if (restaurant) {
      await restaurant.updateRating();
    }

    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Delete review
// @route   DELETE /api/community/reviews/:id
// @access  Private (Author or Admin)
router.delete('/reviews/:id', protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review não encontrado'
      });
    }

    // Check ownership
    if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado a eliminar este review'
      });
    }

    const restaurantId = review.restaurant;

    // Soft delete
    review.isActive = false;
    await review.save();

    // Update restaurant rating
    const Restaurant = require('../models/Restaurant');
    const restaurant = await Restaurant.findById(restaurantId);
    if (restaurant) {
      await restaurant.updateRating();
    }

    res.json({
      success: true,
      message: 'Review eliminado com sucesso'
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Mark review as helpful/unhelpful
// @route   POST /api/community/reviews/:id/helpful
// @access  Private
router.post('/reviews/:id/helpful', protect, [
  body('helpful')
    .isBoolean()
    .withMessage('Helpful deve ser um valor booleano')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review não encontrado'
      });
    }

    const { helpful } = req.body;

    // Check if user already marked this review
    const existingMark = review.helpful.find(h => h.user.toString() === req.user._id.toString());

    if (existingMark) {
      // Update existing mark
      existingMark.helpful = helpful;
    } else {
      // Add new mark
      review.helpful.push({ user: req.user._id, helpful });
    }

    await review.save();

    res.json({
      success: true,
      message: `Review marcado como ${helpful ? 'útil' : 'não útil'}`,
      helpful
    });
  } catch (error) {
    console.error('Mark review helpful error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// ==================== FEATURED CONTENT ====================

// @desc    Get featured stories
// @route   GET /api/community/featured/stories
// @access  Public
router.get('/featured/stories', async (req, res) => {
  try {
    const featuredStories = await Story.find({ 
      featured: true, 
      isActive: true,
      isPublished: true,
      status: 'published'
    })
    .populate('author', 'name avatar')
    .sort({ publishedAt: -1 })
    .limit(6);

    res.json({
      success: true,
      data: featuredStories
    });
  } catch (error) {
    console.error('Get featured stories error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Get stories by region
// @route   GET /api/community/stories/region/:region
// @access  Public
router.get('/stories/region/:region', async (req, res) => {
  try {
    const { region } = req.params;
    const { page = 1, limit = 12 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const stories = await Story.find({ 
      region, 
      isActive: true,
      isPublished: true,
      status: 'published'
    })
    .populate('author', 'name avatar')
    .sort({ publishedAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Story.countDocuments({ 
      region, 
      isActive: true,
      isPublished: true,
      status: 'published'
    });

    res.json({
      success: true,
      data: stories,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get stories by region error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

module.exports = router;

const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Review = require('../models/Review');
const Story = require('../models/Story');
const Reservation = require('../models/Reservation');
const { protect, admin } = require('../middleware/auth');
const { handleUpload } = require('../middleware/upload');

const router = express.Router();

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('favorites', 'name slug images rating')
      .populate('reviews', 'restaurant rating title content createdAt')
      .populate('stories', 'title slug category publishedAt views')
      .populate('reservations', 'restaurant date time status');

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', protect, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Nome deve ter entre 2 e 50 caracteres'),
  body('phone')
    .optional()
    .trim()
    .isLength({ min: 9, max: 15 })
    .withMessage('Telefone deve ter entre 9 e 15 caracteres'),
  body('location.city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Cidade deve ter entre 2 e 50 caracteres'),
  body('location.region')
    .optional()
    .isIn(['minho', 'douro', 'beiras', 'lisboa', 'alentejo', 'algarve', 'madeira', 'acores'])
    .withMessage('Região inválida'),
  body('preferences.cuisine')
    .optional()
    .isArray()
    .withMessage('Preferências de cozinha devem ser um array'),
  body('preferences.priceRange')
    .optional()
    .isArray()
    .withMessage('Faixa de preço deve ser um array'),
  body('preferences.dietaryRestrictions')
    .optional()
    .isArray()
    .withMessage('Restrições dietéticas devem ser um array')
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

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilizador não encontrado'
      });
    }

    // Update fields
    const fieldsToUpdate = ['name', 'phone', 'location', 'preferences'];
    fieldsToUpdate.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    const updatedUser = await user.save();

    res.json({
      success: true,
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        location: updatedUser.location,
        preferences: updatedUser.preferences,
        avatar: updatedUser.avatar
      },
      message: 'Perfil atualizado com sucesso'
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Upload user avatar
// @route   POST /api/users/avatar
// @access  Private
router.post('/avatar', protect, handleUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma imagem foi enviada'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilizador não encontrado'
      });
    }

    // Update avatar
    user.avatar = `/uploads/${req.file.filename}`;
    await user.save();

    res.json({
      success: true,
      data: {
        avatar: user.avatar
      },
      message: 'Avatar atualizado com sucesso'
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Get user favorites
// @route   GET /api/users/favorites
// @access  Private
router.get('/favorites', protect, [
  query('page').optional().isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limite deve ser entre 1 e 50')
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

    const { page = 1, limit = 12 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const user = await User.findById(req.user._id).populate({
      path: 'favorites',
      select: 'name slug images rating location cuisine priceRange features',
      options: {
        skip,
        limit: parseInt(limit)
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilizador não encontrado'
      });
    }

    const total = user.favorites.length;
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: user.favorites,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get user favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Get user reviews
// @route   GET /api/users/reviews
// @access  Private
router.get('/reviews', protect, [
  query('page').optional().isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limite deve ser entre 1 e 50'),
  query('sort').optional().isIn(['newest', 'oldest', 'rating'])
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

    const { page = 1, limit = 12, sort = 'newest' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    let sortObj = {};
    switch (sort) {
      case 'oldest':
        sortObj = { createdAt: 1 };
        break;
      case 'rating':
        sortObj = { rating: -1 };
        break;
      case 'newest':
      default:
        sortObj = { createdAt: -1 };
        break;
    }

    const reviews = await Review.find({ 
      user: req.user._id, 
      isActive: true 
    })
    .populate('restaurant', 'name slug images rating')
    .sort(sortObj)
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Review.countDocuments({ 
      user: req.user._id, 
      isActive: true 
    });

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: reviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Get user stories
// @route   GET /api/users/stories
// @access  Private
router.get('/stories', protect, [
  query('page').optional().isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limite deve ser entre 1 e 50'),
  query('status').optional().isIn(['draft', 'pending', 'published', 'archived'])
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

    const { page = 1, limit = 12, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const filter = { author: req.user._id, isActive: true };
    if (status) filter.status = status;

    const stories = await Story.find(filter)
      .populate('relatedRestaurants', 'name slug images')
      .populate('relatedEvents', 'title slug dates images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Story.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: stories,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get user stories error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Get user reservations
// @route   GET /api/users/reservations
// @access  Private
router.get('/reservations', protect, [
  query('page').optional().isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limite deve ser entre 1 e 50'),
  query('status').optional().isIn(['pending', 'confirmed', 'cancelled', 'completed', 'no_show'])
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

    const { page = 1, limit = 12, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const filter = { user: req.user._id, isActive: true };
    if (status) filter.status = status;

    const reservations = await Reservation.find(filter)
      .populate('restaurant', 'name slug images rating')
      .sort({ date: -1, time: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Reservation.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: reservations,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get user reservations error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get counts
    const [favoritesCount, reviewsCount, storiesCount, reservationsCount] = await Promise.all([
      User.findById(userId).then(user => user.favorites.length),
      Review.countDocuments({ user: userId, isActive: true }),
      Story.countDocuments({ author: userId, isActive: true }),
      Reservation.countDocuments({ user: userId, isActive: true })
    ]);

    // Get recent activity
    const recentReviews = await Review.find({ user: userId, isActive: true })
      .populate('restaurant', 'name slug images')
      .sort({ createdAt: -1 })
      .limit(3);

    const recentStories = await Story.find({ author: userId, isActive: true })
      .sort({ createdAt: -1 })
      .limit(3);

    const upcomingReservations = await Reservation.find({
      user: userId,
      isActive: true,
      date: { $gt: new Date() },
      status: { $in: ['pending', 'confirmed'] }
    })
    .populate('restaurant', 'name slug images')
    .sort({ date: 1, time: 1 })
    .limit(3);

    res.json({
      success: true,
      data: {
        counts: {
          favorites: favoritesCount,
          reviews: reviewsCount,
          stories: storiesCount,
          reservations: reservationsCount
        },
        recentActivity: {
          reviews: recentReviews,
          stories: recentStories,
          upcomingReservations
        }
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private (Admin)
router.get('/', protect, admin, [
  query('page').optional().isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite deve ser entre 1 e 100'),
  query('role').optional().isIn(['user', 'restaurant_owner', 'admin']),
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

    const { page = 1, limit = 20, role, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const filter = { isActive: true };
    if (role) filter.role = role;
    if (search) filter.$text = { $search: search };

    // Build sort object
    const sortObj = { createdAt: -1 };

    const users = await User.find(filter)
      .select('-password')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: users,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Get user by ID (Admin only)
// @route   GET /api/users/:id
// @access  Private (Admin)
router.get('/:id', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('favorites', 'name slug images rating')
      .populate('reviews', 'restaurant rating title content createdAt')
      .populate('stories', 'title slug category publishedAt views')
      .populate('reservations', 'restaurant date time status');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilizador não encontrado'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Update user (Admin only)
// @route   PUT /api/users/:id
// @access  Private (Admin)
router.put('/:id', protect, admin, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Nome deve ter entre 2 e 50 caracteres'),
  body('role')
    .optional()
    .isIn(['user', 'restaurant_owner', 'admin'])
    .withMessage('Role inválido'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive deve ser um valor booleano')
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

    let user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilizador não encontrado'
      });
    }

    // Update user
    user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    res.json({
      success: true,
      data: user,
      message: 'Utilizador atualizado com sucesso'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private (Admin)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilizador não encontrado'
      });
    }

    // Check if user is trying to delete themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível eliminar a sua própria conta'
      });
    }

    // Soft delete
    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: 'Utilizador eliminado com sucesso'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Get restaurant owners
// @route   GET /api/users/restaurant-owners
// @access  Public
router.get('/restaurant-owners', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const restaurantOwners = await User.find({ 
      role: 'restaurant_owner', 
      isActive: true 
    })
    .select('name avatar location')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await User.countDocuments({ 
      role: 'restaurant_owner', 
      isActive: true 
    });

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: restaurantOwners,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get restaurant owners error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

module.exports = router;

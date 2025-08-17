const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Restaurant = require('../models/Restaurant');
const Review = require('../models/Review');
const { protect, optionalAuth, restaurantOwner, admin } = require('../middleware/auth');
const { handleUpload, handleMultipleUpload } = require('../middleware/upload');

const router = express.Router();

// @desc    Get all restaurants with filters
// @route   GET /api/restaurants
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite deve ser entre 1 e 100'),
  query('region').optional().isIn(['minho', 'douro', 'beiras', 'lisboa', 'alentejo', 'algarve', 'madeira', 'acores']),
  query('cuisine').optional().isIn(['tradicional', 'contemporanea', 'fusion', 'vegetariana', 'vegana']),
  query('priceRange').optional().isIn(['€', '€€', '€€€', '€€€€']),
  query('authenticity').optional().isIn(['traditional-family', 'innovative-chef', 'modern-fusion']),
  query('rating').optional().isFloat({ min: 0, max: 5 }),
  query('sort').optional().isIn(['relevance', 'rating', 'price-low', 'price-high', 'distance', 'newest']),
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
      region,
      cuisine,
      priceRange,
      authenticity,
      rating,
      sort = 'relevance',
      search,
      features,
      specialties
    } = req.query;

    // Build filter object
    const filter = { isActive: true };

    if (region) filter['location.region'] = region;
    if (cuisine) filter['cuisine.type'] = cuisine;
    if (priceRange) filter.priceRange = priceRange;
    if (authenticity) filter['authenticity.level'] = authenticity;
    if (rating) filter['rating.average'] = { $gte: parseFloat(rating) };
    if (features) {
      const featureArray = features.split(',');
      featureArray.forEach(feature => {
        filter[`features.${feature}`] = true;
      });
    }
    if (specialties) {
      const specialtyArray = specialties.split(',');
      filter['cuisine.specialties'] = { $in: specialtyArray };
    }

    // Text search
    if (search) {
      filter.$text = { $search: search };
    }

    // Build sort object
    let sortObj = {};
    switch (sort) {
      case 'rating':
        sortObj = { 'rating.average': -1, 'rating.count': -1 };
        break;
      case 'price-low':
        sortObj = { averagePrice: 1 };
        break;
      case 'price-high':
        sortObj = { averagePrice: -1 };
        break;
      case 'newest':
        sortObj = { createdAt: -1 };
        break;
      case 'relevance':
      default:
        if (search) {
          sortObj = { score: { $meta: 'textScore' } };
        } else {
          sortObj = { featured: -1, 'rating.average': -1 };
        }
        break;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const restaurants = await Restaurant.find(filter)
      .populate('owner', 'name')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    // Get total count for pagination
    const total = await Restaurant.countDocuments(filter);

    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      success: true,
      data: restaurants,
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
    console.error('Get restaurants error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Get single restaurant by slug
// @route   GET /api/restaurants/:slug
// @access  Public
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ 
      slug: req.params.slug, 
      isActive: true 
    })
    .populate('owner', 'name email phone')
    .populate({
      path: 'reviews',
      match: { isActive: true },
      populate: {
        path: 'user',
        select: 'name avatar'
      },
      options: { sort: { createdAt: -1 }, limit: 10 }
    })
    .populate('events', 'title slug dates images')
    .select('-__v');

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurante não encontrado'
      });
    }

    // Increment views (if user is authenticated)
    if (req.user) {
      // TODO: Implement view tracking
    }

    res.json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    console.error('Get restaurant error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Create new restaurant
// @route   POST /api/restaurants
// @access  Private (Restaurant owner or Admin)
router.post('/', protect, restaurantOwner, [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Descrição deve ter entre 10 e 1000 caracteres'),
  body('location.region')
    .isIn(['minho', 'douro', 'beiras', 'lisboa', 'alentejo', 'algarve', 'madeira', 'acores'])
    .withMessage('Região inválida'),
  body('cuisine.type')
    .isIn(['tradicional', 'contemporanea', 'fusion', 'vegetariana', 'vegana'])
    .withMessage('Tipo de cozinha inválido'),
  body('priceRange')
    .isIn(['€', '€€', '€€€', '€€€€'])
    .withMessage('Faixa de preço inválida'),
  body('authenticity.level')
    .isIn(['traditional-family', 'innovative-chef', 'modern-fusion'])
    .withMessage('Nível de autenticidade inválido')
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

    // Set owner
    req.body.owner = req.user._id;

    const restaurant = await Restaurant.create(req.body);

    res.status(201).json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    console.error('Create restaurant error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Update restaurant
// @route   PUT /api/restaurants/:id
// @access  Private (Restaurant owner or Admin)
router.put('/:id', protect, restaurantOwner, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Descrição deve ter entre 10 e 1000 caracteres')
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

    let restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurante não encontrado'
      });
    }

    // Check ownership
    if (restaurant.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado a editar este restaurante'
      });
    }

    // Update restaurant
    restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    console.error('Update restaurant error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Delete restaurant
// @route   DELETE /api/restaurants/:id
// @access  Private (Restaurant owner or Admin)
router.delete('/:id', protect, restaurantOwner, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurante não encontrado'
      });
    }

    // Check ownership
    if (restaurant.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado a eliminar este restaurante'
      });
    }

    // Soft delete
    restaurant.isActive = false;
    await restaurant.save();

    res.json({
      success: true,
      message: 'Restaurante eliminado com sucesso'
    });
  } catch (error) {
    console.error('Delete restaurant error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Upload restaurant images
// @route   POST /api/restaurants/:id/images
// @access  Private (Restaurant owner or Admin)
router.post('/:id/images', protect, restaurantOwner, handleMultipleUpload, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurante não encontrado'
      });
    }

    // Check ownership
    if (restaurant.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado a editar este restaurante'
      });
    }

    // Process uploaded images
    const images = req.files.map((file, index) => ({
      url: `/uploads/${file.filename}`,
      caption: req.body.captions?.[index] || '',
      isPrimary: index === 0 // First image is primary
    }));

    // Add images to restaurant
    restaurant.images.push(...images);
    await restaurant.save();

    res.json({
      success: true,
      data: images
    });
  } catch (error) {
    console.error('Upload images error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Get restaurant reviews
// @route   GET /api/restaurants/:id/reviews
// @access  Public
router.get('/:id/reviews', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('sort').optional().isIn(['newest', 'oldest', 'rating', 'helpful'])
], async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = 'newest' } = req.query;

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

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reviews = await Review.find({ 
      restaurant: req.params.id, 
      isActive: true 
    })
    .populate('user', 'name avatar')
    .sort(sortObj)
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Review.countDocuments({ 
      restaurant: req.params.id, 
      isActive: true 
    });

    res.json({
      success: true,
      data: reviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        total,
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

// @desc    Add restaurant to favorites
// @route   POST /api/restaurants/:id/favorite
// @access  Private
router.post('/:id/favorite', protect, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurante não encontrado'
      });
    }

    const user = await User.findById(req.user._id);
    const isFavorite = user.favorites.includes(req.params.id);

    if (isFavorite) {
      // Remove from favorites
      user.favorites = user.favorites.filter(id => id.toString() !== req.params.id);
      await user.save();
      
      res.json({
        success: true,
        message: 'Restaurante removido dos favoritos',
        isFavorite: false
      });
    } else {
      // Add to favorites
      user.favorites.push(req.params.id);
      await user.save();
      
      res.json({
        success: true,
        message: 'Restaurante adicionado aos favoritos',
        isFavorite: true
      });
    }
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Get featured restaurants
// @route   GET /api/restaurants/featured
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const featuredRestaurants = await Restaurant.find({ 
      featured: true, 
      isActive: true 
    })
    .populate('owner', 'name')
    .sort({ 'rating.average': -1 })
    .limit(6);

    res.json({
      success: true,
      data: featuredRestaurants
    });
  } catch (error) {
    console.error('Get featured restaurants error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Get restaurants by region
// @route   GET /api/restaurants/region/:region
// @access  Public
router.get('/region/:region', async (req, res) => {
  try {
    const { region } = req.params;
    const { page = 1, limit = 12 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const restaurants = await Restaurant.find({ 
      'location.region': region, 
      isActive: true 
    })
    .populate('owner', 'name')
    .sort({ 'rating.average': -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Restaurant.countDocuments({ 
      'location.region': region, 
      isActive: true 
    });

    res.json({
      success: true,
      data: restaurants,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get restaurants by region error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

module.exports = router;

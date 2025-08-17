const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Event = require('../models/Event');
const { protect, optionalAuth, admin } = require('../middleware/auth');
const { handleMultipleUpload } = require('../middleware/upload');

const router = express.Router();

// @desc    Get all events with filters
// @route   GET /api/events
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite deve ser entre 1 e 100'),
  query('type').optional().isIn(['festival', 'cooking_class', 'wine_tasting', 'cultural_celebration', 'food_tour', 'workshop', 'dinner_experience']),
  query('category').optional().isIn(['festivals', 'classes', 'tastings', 'cultural', 'tours', 'workshops', 'experiences']),
  query('region').optional().isIn(['minho', 'douro', 'beiras', 'lisboa', 'alentejo', 'algarve', 'madeira', 'acores']),
  query('status').optional().isIn(['upcoming', 'ongoing', 'past']),
  query('date').optional().isISO8601().withMessage('Data deve ser no formato ISO'),
  query('sort').optional().isIn(['date', 'title', 'rating', 'newest']),
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
      type,
      category,
      region,
      status,
      date,
      sort = 'date',
      search
    } = req.query;

    // Build filter object
    const filter = { isActive: true };

    if (type) filter.type = type;
    if (category) filter.category = category;
    if (region) filter['location.region'] = region;
    if (search) filter.$text = { $search: search };

    // Date filtering
    const now = new Date();
    if (status === 'upcoming') {
      filter['dates.startDate'] = { $gt: now };
    } else if (status === 'ongoing') {
      filter['dates.startDate'] = { $lte: now };
      filter['dates.endDate'] = { $gte: now };
    } else if (status === 'past') {
      filter['dates.endDate'] = { $lt: now };
    }

    if (date) {
      const targetDate = new Date(date);
      filter['dates.startDate'] = { $lte: targetDate };
      filter['dates.endDate'] = { $gte: targetDate };
    }

    // Build sort object
    let sortObj = {};
    switch (sort) {
      case 'title':
        sortObj = { title: 1 };
        break;
      case 'rating':
        sortObj = { 'rating.average': -1, 'rating.count': -1 };
        break;
      case 'newest':
        sortObj = { createdAt: -1 };
        break;
      case 'date':
      default:
        sortObj = { 'dates.startDate': 1 };
        break;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const events = await Event.find(filter)
      .populate('restaurant', 'name slug images')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    // Get total count for pagination
    const total = await Event.countDocuments(filter);

    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      success: true,
      data: events,
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
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Get single event by slug
// @route   GET /api/events/:slug
// @access  Public
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const event = await Event.findOne({ 
      slug: req.params.slug, 
      isActive: true 
    })
    .populate('restaurant', 'name slug images rating')
    .populate('registrations', 'user date status')
    .populate('reviews', 'user rating content createdAt')
    .select('-__v');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Evento não encontrado'
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Create new event
// @route   POST /api/events
// @access  Private (Restaurant owner or Admin)
router.post('/', protect, [
  body('title')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Título deve ter entre 2 e 100 caracteres'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Descrição deve ter entre 10 e 2000 caracteres'),
  body('type')
    .isIn(['festival', 'cooking_class', 'wine_tasting', 'cultural_celebration', 'food_tour', 'workshop', 'dinner_experience'])
    .withMessage('Tipo de evento inválido'),
  body('category')
    .isIn(['festivals', 'classes', 'tastings', 'cultural', 'tours', 'workshops', 'experiences'])
    .withMessage('Categoria inválida'),
  body('dates.startDate')
    .isISO8601()
    .withMessage('Data de início deve ser no formato ISO'),
  body('dates.endDate')
    .isISO8601()
    .withMessage('Data de fim deve ser no formato ISO'),
  body('pricing.type')
    .isIn(['free', 'fixed', 'variable', 'donation'])
    .withMessage('Tipo de preço inválido')
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

    // Validate dates
    const startDate = new Date(req.body.dates.startDate);
    const endDate = new Date(req.body.dates.endDate);
    
    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: 'Data de fim deve ser posterior à data de início'
      });
    }

    if (startDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Data de início não pode ser no passado'
      });
    }

    // Set organizer if not provided
    if (!req.body.organizer) {
      req.body.organizer = {
        name: req.user.name,
        type: 'individual'
      };
    }

    const event = await Event.create(req.body);

    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Event creator or Admin)
router.put('/:id', protect, [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Título deve ter entre 2 e 100 caracteres'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Descrição deve ter entre 10 e 2000 caracteres')
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

    let event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Evento não encontrado'
      });
    }

    // Check ownership (restaurant owner or admin)
    if (event.restaurant && req.user.role !== 'admin') {
      const Restaurant = require('../models/Restaurant');
      const restaurant = await Restaurant.findById(event.restaurant);
      if (!restaurant || restaurant.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Não autorizado a editar este evento'
        });
      }
    }

    // Update event
    event = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (Event creator or Admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Evento não encontrado'
      });
    }

    // Check ownership (restaurant owner or admin)
    if (event.restaurant && req.user.role !== 'admin') {
      const Restaurant = require('../models/Restaurant');
      const restaurant = await Restaurant.findById(event.restaurant);
      if (!restaurant || restaurant.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Não autorizado a eliminar este evento'
        });
      }
    }

    // Soft delete
    event.isActive = false;
    await event.save();

    res.json({
      success: true,
      message: 'Evento eliminado com sucesso'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Upload event images
// @route   POST /api/events/:id/images
// @access  Private (Event creator or Admin)
router.post('/:id/images', protect, handleMultipleUpload, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Evento não encontrado'
      });
    }

    // Check ownership
    if (event.restaurant && req.user.role !== 'admin') {
      const Restaurant = require('../models/Restaurant');
      const restaurant = await Restaurant.findById(event.restaurant);
      if (!restaurant || restaurant.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Não autorizado a editar este evento'
        });
      }
    }

    // Process uploaded images
    const images = req.files.map((file, index) => ({
      url: `/uploads/${file.filename}`,
      caption: req.body.captions?.[index] || '',
      isPrimary: index === 0 // First image is primary
    }));

    // Add images to event
    event.images.push(...images);
    await event.save();

    res.json({
      success: true,
      data: images
    });
  } catch (error) {
    console.error('Upload event images error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Get featured events
// @route   GET /api/events/featured
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const featuredEvents = await Event.find({ 
      featured: true, 
      isActive: true,
      'dates.startDate': { $gt: new Date() } // Only upcoming events
    })
    .populate('restaurant', 'name slug images')
    .sort({ 'dates.startDate': 1 })
    .limit(6);

    res.json({
      success: true,
      data: featuredEvents
    });
  } catch (error) {
    console.error('Get featured events error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Get events by region
// @route   GET /api/events/region/:region
// @access  Public
router.get('/region/:region', async (req, res) => {
  try {
    const { region } = req.params;
    const { page = 1, limit = 12 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const events = await Event.find({ 
      'location.region': region, 
      isActive: true,
      'dates.startDate': { $gt: new Date() } // Only upcoming events
    })
    .populate('restaurant', 'name slug images')
    .sort({ 'dates.startDate': 1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Event.countDocuments({ 
      'location.region': region, 
      isActive: true,
      'dates.startDate': { $gt: new Date() }
    });

    res.json({
      success: true,
      data: events,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get events by region error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Get upcoming events
// @route   GET /api/events/upcoming
// @access  Public
router.get('/upcoming', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const upcomingEvents = await Event.find({ 
      isActive: true,
      'dates.startDate': { $gt: new Date() }
    })
    .populate('restaurant', 'name slug images')
    .sort({ 'dates.startDate': 1 })
    .limit(parseInt(limit));

    res.json({
      success: true,
      data: upcomingEvents
    });
  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Get events by type
// @route   GET /api/events/type/:type
// @access  Public
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { page = 1, limit = 12 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const events = await Event.find({ 
      type, 
      isActive: true,
      'dates.startDate': { $gt: new Date() } // Only upcoming events
    })
    .populate('restaurant', 'name slug images')
    .sort({ 'dates.startDate': 1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Event.countDocuments({ 
      type, 
      isActive: true,
      'dates.startDate': { $gt: new Date() }
    });

    res.json({
      success: true,
      data: events,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get events by type error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

module.exports = router;

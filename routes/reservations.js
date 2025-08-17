const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Reservation = require('../models/Reservation');
const Restaurant = require('../models/Restaurant');
const { protect, optionalAuth, restaurantOwner, admin } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all reservations with filters
// @route   GET /api/reservations
// @access  Private
router.get('/', protect, [
  query('page').optional().isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite deve ser entre 1 e 100'),
  query('status').optional().isIn(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']),
  query('date').optional().isISO8601().withMessage('Data deve ser no formato ISO'),
  query('restaurant').optional().isMongoId().withMessage('ID do restaurante inválido'),
  query('sort').optional().isIn(['date', 'time', 'status', 'newest'])
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
      status,
      date,
      restaurant,
      sort = 'date'
    } = req.query;

    // Build filter object
    const filter = { isActive: true };

    // Filter by user role
    if (req.user.role === 'restaurant_owner') {
      // Get restaurants owned by user
      const userRestaurants = await Restaurant.find({ owner: req.user._id });
      const restaurantIds = userRestaurants.map(r => r._id);
      filter.restaurant = { $in: restaurantIds };
    } else if (req.user.role === 'user') {
      // User can only see their own reservations
      filter.user = req.user._id;
    }

    if (status) filter.status = status;
    if (restaurant) filter.restaurant = restaurant;
    if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      filter.date = { $gte: targetDate, $lt: nextDay };
    }

    // Build sort object
    let sortObj = {};
    switch (sort) {
      case 'time':
        sortObj = { time: 1, date: 1 };
        break;
      case 'status':
        sortObj = { status: 1, date: 1 };
        break;
      case 'newest':
        sortObj = { createdAt: -1 };
        break;
      case 'date':
      default:
        sortObj = { date: 1, time: 1 };
        break;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const reservations = await Reservation.find(filter)
      .populate('user', 'name email phone')
      .populate('restaurant', 'name slug images')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    // Get total count for pagination
    const total = await Reservation.countDocuments(filter);

    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      success: true,
      data: reservations,
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
    console.error('Get reservations error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Get single reservation
// @route   GET /api/reservations/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('restaurant', 'name slug images location contact')
      .select('-__v');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reserva não encontrada'
      });
    }

    // Check access permissions
    if (req.user.role === 'user' && reservation.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado a ver esta reserva'
      });
    }

    if (req.user.role === 'restaurant_owner') {
      const restaurant = await Restaurant.findById(reservation.restaurant._id);
      if (!restaurant || restaurant.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Não autorizado a ver esta reserva'
        });
      }
    }

    res.json({
      success: true,
      data: reservation
    });
  } catch (error) {
    console.error('Get reservation error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Create new reservation
// @route   POST /api/reservations
// @access  Private
router.post('/', protect, [
  body('restaurant')
    .isMongoId()
    .withMessage('ID do restaurante inválido'),
  body('date')
    .isISO8601()
    .withMessage('Data deve ser no formato ISO'),
  body('time')
    .notEmpty()
    .withMessage('Hora é obrigatória'),
  body('partySize')
    .isInt({ min: 1, max: 20 })
    .withMessage('Tamanho da mesa deve ser entre 1 e 20'),
  body('contactInfo.name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Nome deve ter entre 2 e 50 caracteres'),
  body('contactInfo.phone')
    .trim()
    .isLength({ min: 9, max: 15 })
    .withMessage('Telefone deve ter entre 9 e 15 caracteres'),
  body('contactInfo.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido')
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
      restaurant: restaurantId,
      date,
      time,
      partySize,
      specialRequests,
      dietaryRestrictions,
      occasion,
      contactInfo
    } = req.body;

    // Validate date (must be in the future)
    const reservationDate = new Date(date);
    const now = new Date();
    if (reservationDate <= now) {
      return res.status(400).json({
        success: false,
        message: 'Data da reserva deve ser no futuro'
      });
    }

    // Check if restaurant exists and accepts reservations
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurante não encontrado'
      });
    }

    if (!restaurant.features.acceptsReservations) {
      return res.status(400).json({
        success: false,
        message: 'Este restaurante não aceita reservas'
      });
    }

    // Check for double booking
    const existingReservation = await Reservation.findOne({
      restaurant: restaurantId,
      date: reservationDate,
      time,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (existingReservation) {
      return res.status(400).json({
        success: false,
        message: 'Já existe uma reserva para esta data e hora'
      });
    }

    // Create reservation
    const reservation = await Reservation.create({
      user: req.user._id,
      restaurant: restaurantId,
      date: reservationDate,
      time,
      partySize,
      specialRequests,
      dietaryRestrictions,
      occasion,
      contactInfo
    });

    // Populate restaurant info for response
    await reservation.populate('restaurant', 'name slug images');

    res.status(201).json({
      success: true,
      data: reservation,
      message: 'Reserva criada com sucesso'
    });
  } catch (error) {
    console.error('Create reservation error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Update reservation
// @route   PUT /api/reservations/:id
// @access  Private (Owner or Restaurant Owner/Admin)
router.put('/:id', protect, [
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Data deve ser no formato ISO'),
  body('time')
    .optional()
    .notEmpty()
    .withMessage('Hora é obrigatória'),
  body('partySize')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Tamanho da mesa deve ser entre 1 e 20'),
  body('specialRequests')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Pedidos especiais não podem ter mais de 500 caracteres')
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

    let reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reserva não encontrada'
      });
    }

    // Check access permissions
    if (req.user.role === 'user' && reservation.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado a editar esta reserva'
      });
    }

    if (req.user.role === 'restaurant_owner') {
      const restaurant = await Restaurant.findById(reservation.restaurant);
      if (!restaurant || restaurant.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Não autorizado a editar esta reserva'
        });
      }
    }

    // Validate date if being updated
    if (req.body.date) {
      const newDate = new Date(req.body.date);
      const now = new Date();
      if (newDate <= now) {
        return res.status(400).json({
          success: false,
          message: 'Data da reserva deve ser no futuro'
        });
      }
    }

    // Update reservation
    reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('restaurant', 'name slug images');

    res.json({
      success: true,
      data: reservation,
      message: 'Reserva atualizada com sucesso'
    });
  } catch (error) {
    console.error('Update reservation error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Cancel reservation
// @route   PUT /api/reservations/:id/cancel
// @access  Private (Owner or Restaurant Owner/Admin)
router.put('/:id/cancel', protect, [
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Motivo não pode ter mais de 200 caracteres')
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

    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reserva não encontrada'
      });
    }

    // Check access permissions
    if (req.user.role === 'user' && reservation.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado a cancelar esta reserva'
      });
    }

    if (req.user.role === 'restaurant_owner') {
      const restaurant = await Restaurant.findById(reservation.restaurant);
      if (!restaurant || restaurant.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Não autorizado a cancelar esta reserva'
        });
      }
    }

    // Check if reservation can be cancelled
    if (reservation.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Reserva já foi cancelada'
      });
    }

    if (reservation.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Não é possível cancelar uma reserva já concluída'
      });
    }

    // Cancel reservation
    const cancelledBy = req.user.role === 'user' ? 'user' : 'restaurant';
    await reservation.cancel(req.body.reason || 'Cancelada pelo utilizador', cancelledBy);

    res.json({
      success: true,
      message: 'Reserva cancelada com sucesso'
    });
  } catch (error) {
    console.error('Cancel reservation error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Confirm reservation (Restaurant Owner/Admin only)
// @route   PUT /api/reservations/:id/confirm
// @access  Private (Restaurant Owner or Admin)
router.put('/:id/confirm', protect, restaurantOwner, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reserva não encontrada'
      });
    }

    // Check if user owns the restaurant
    const restaurant = await Restaurant.findById(reservation.restaurant);
    if (!restaurant || restaurant.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado a confirmar esta reserva'
      });
    }

    // Check if reservation can be confirmed
    if (reservation.status === 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Reserva já foi confirmada'
      });
    }

    if (reservation.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Não é possível confirmar uma reserva cancelada'
      });
    }

    // Confirm reservation
    await reservation.confirm();

    res.json({
      success: true,
      message: 'Reserva confirmada com sucesso'
    });
  } catch (error) {
    console.error('Confirm reservation error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Complete reservation (Restaurant Owner/Admin only)
// @route   PUT /api/reservations/:id/complete
// @access  Private (Restaurant Owner or Admin)
router.put('/:id/complete', protect, restaurantOwner, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reserva não encontrada'
      });
    }

    // Check if user owns the restaurant
    const restaurant = await Restaurant.findById(reservation.restaurant);
    if (!restaurant || restaurant.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado a completar esta reserva'
      });
    }

    // Check if reservation can be completed
    if (reservation.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Reserva já foi concluída'
      });
    }

    if (reservation.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Não é possível completar uma reserva cancelada'
      });
    }

    // Complete reservation
    await reservation.complete();

    res.json({
      success: true,
      message: 'Reserva marcada como concluída'
    });
  } catch (error) {
    console.error('Complete reservation error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Mark reservation as no-show (Restaurant Owner/Admin only)
// @route   PUT /api/reservations/:id/no-show
// @access  Private (Restaurant Owner or Admin)
router.put('/:id/no-show', protect, restaurantOwner, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reserva não encontrada'
      });
    }

    // Check if user owns the restaurant
    const restaurant = await Restaurant.findById(reservation.restaurant);
    if (!restaurant || restaurant.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado a marcar esta reserva'
      });
    }

    // Check if reservation can be marked as no-show
    if (reservation.status === 'no_show') {
      return res.status(400).json({
        success: false,
        message: 'Reserva já foi marcada como no-show'
      });
    }

    if (reservation.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Não é possível marcar uma reserva cancelada como no-show'
      });
    }

    // Mark as no-show
    await reservation.markNoShow();

    res.json({
      success: true,
      message: 'Reserva marcada como no-show'
    });
  } catch (error) {
    console.error('Mark no-show error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Get reservation by confirmation code
// @route   GET /api/reservations/confirm/:code
// @access  Public
router.get('/confirm/:code', async (req, res) => {
  try {
    const reservation = await Reservation.findOne({ 
      confirmationCode: req.params.code,
      isActive: true
    })
    .populate('user', 'name email')
    .populate('restaurant', 'name slug images location contact')
    .select('-__v');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reserva não encontrada'
      });
    }

    res.json({
      success: true,
      data: reservation
    });
  } catch (error) {
    console.error('Get reservation by code error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Get upcoming reservations
// @route   GET /api/reservations/upcoming
// @access  Private
router.get('/upcoming', protect, async (req, res) => {
  try {
    const now = new Date();
    
    let filter = { 
      isActive: true,
      date: { $gt: now },
      status: { $in: ['pending', 'confirmed'] }
    };

    // Filter by user role
    if (req.user.role === 'user') {
      filter.user = req.user._id;
    } else if (req.user.role === 'restaurant_owner') {
      const userRestaurants = await Restaurant.find({ owner: req.user._id });
      const restaurantIds = userRestaurants.map(r => r._id);
      filter.restaurant = { $in: restaurantIds };
    }

    const upcomingReservations = await Reservation.find(filter)
      .populate('user', 'name email phone')
      .populate('restaurant', 'name slug images')
      .sort({ date: 1, time: 1 })
      .limit(10);

    res.json({
      success: true,
      data: upcomingReservations
    });
  } catch (error) {
    console.error('Get upcoming reservations error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Get reservation statistics
// @route   GET /api/reservations/stats
// @access  Private (Restaurant Owner or Admin)
router.get('/stats', protect, restaurantOwner, async (req, res) => {
  try {
    const { restaurant: restaurantId, period = 'month' } = req.query;

    // Build date filter
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    let filter = {
      date: { $gte: startDate, $lte: now },
      isActive: true
    };

    // Filter by restaurant if specified
    if (restaurantId) {
      filter.restaurant = restaurantId;
    } else if (req.user.role === 'restaurant_owner') {
      // Get restaurants owned by user
      const userRestaurants = await Restaurant.find({ owner: req.user._id });
      const restaurantIds = userRestaurants.map(r => r._id);
      filter.restaurant = { $in: restaurantIds };
    }

    // Get statistics
    const stats = await Reservation.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get total reservations
    const total = await Reservation.countDocuments(filter);

    // Format stats
    const formattedStats = {
      total,
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0
    };

    stats.forEach(stat => {
      formattedStats[stat._id] = stat.count;
    });

    res.json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    console.error('Get reservation stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

module.exports = router;

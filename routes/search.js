const express = require('express');
const { query } = require('express-validator');
const Restaurant = require('../models/Restaurant');
const Event = require('../models/Event');
const Story = require('../models/Story');

const router = express.Router();

// @desc    Global search across all content types
// @route   GET /api/search
// @access  Public
router.get('/', [
  query('q').notEmpty().withMessage('Query de busca é obrigatória'),
  query('type').optional().isIn(['restaurants', 'events', 'stories', 'all']),
  query('region').optional().isIn(['minho', 'douro', 'beiras', 'lisboa', 'alentejo', 'algarve', 'madeira', 'acores']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const { q: query, type = 'all', region, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const results = {};
    let totalResults = 0;

    if (type === 'all' || type === 'restaurants') {
      const restaurantFilter = { 
        isActive: true,
        $text: { $search: query }
      };
      if (region) restaurantFilter['location.region'] = region;

      const restaurants = await Restaurant.find(restaurantFilter)
        .populate('owner', 'name')
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(parseInt(limit));

      results.restaurants = restaurants;
      totalResults += await Restaurant.countDocuments(restaurantFilter);
    }

    if (type === 'all' || type === 'events') {
      const eventFilter = { 
        isActive: true,
        $text: { $search: query }
      };
      if (region) eventFilter['location.region'] = region;

      const events = await Event.find(eventFilter)
        .populate('restaurant', 'name slug images')
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(parseInt(limit));

      results.events = events;
      totalResults += await Event.countDocuments(eventFilter);
    }

    if (type === 'all' || type === 'stories') {
      const storyFilter = { 
        isActive: true,
        isPublished: true,
        status: 'published',
        $text: { $search: query }
      };
      if (region) storyFilter.region = region;

      const stories = await Story.find(storyFilter)
        .populate('author', 'name avatar')
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(parseInt(limit));

      results.stories = stories;
      totalResults += await Story.countDocuments(storyFilter);
    }

    const totalPages = Math.ceil(totalResults / parseInt(limit));

    res.json({
      success: true,
      data: results,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        total: totalResults,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit: parseInt(limit)
      },
      query,
      type
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Search suggestions
// @route   GET /api/search/suggestions
// @access  Public
router.get('/suggestions', [
  query('q').notEmpty().withMessage('Query é obrigatória'),
  query('type').optional().isIn(['restaurants', 'events', 'stories'])
], async (req, res) => {
  try {
    const { q: query, type } = req.query;
    const suggestions = [];

    if (!type || type === 'restaurants') {
      const restaurantSuggestions = await Restaurant.find({
        isActive: true,
        $text: { $search: query }
      })
      .select('name slug')
      .sort({ score: { $meta: 'textScore' } })
      .limit(5);

      suggestions.push(...restaurantSuggestions.map(r => ({
        type: 'restaurant',
        text: r.name,
        slug: r.slug
      })));
    }

    if (!type || type === 'events') {
      const eventSuggestions = await Event.find({
        isActive: true,
        $text: { $search: query }
      })
      .select('title slug')
      .sort({ score: { $meta: 'textScore' } })
      .limit(5);

      suggestions.push(...eventSuggestions.map(e => ({
        type: 'event',
        text: e.title,
        slug: e.slug
      })));
    }

    if (!type || type === 'stories') {
      const storySuggestions = await Story.find({
        isActive: true,
        isPublished: true,
        status: 'published',
        $text: { $search: query }
      })
      .select('title slug')
      .sort({ score: { $meta: 'textScore' } })
      .limit(5);

      suggestions.push(...storySuggestions.map(s => ({
        type: 'story',
        text: s.title,
        slug: s.slug
      })));
    }

    res.json({
      success: true,
      data: suggestions.slice(0, 10)
    });
  } catch (error) {
    console.error('Search suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

module.exports = router;

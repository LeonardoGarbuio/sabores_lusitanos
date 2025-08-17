const express = require('express');
const { query } = require('express-validator');
const Restaurant = require('../models/Restaurant');
const Event = require('../models/Event');
const Story = require('../models/Story');

const router = express.Router();

// @desc    Get cultural map data by region
// @route   GET /api/map/region/:region
// @access  Public
router.get('/region/:region', [
  query('type').optional().isIn(['restaurants', 'events', 'stories', 'all'])
], async (req, res) => {
  try {
    const { region } = req.params;
    const { type = 'all' } = req.query;

    const data = {};

    if (type === 'all' || type === 'restaurants') {
      data.restaurants = await Restaurant.find({ 
        'location.region': region, 
        isActive: true 
      })
      .select('name slug images rating cuisine location')
      .limit(20);
    }

    if (type === 'all' || type === 'events') {
      data.events = await Event.find({ 
        'location.region': region, 
        isActive: true,
        'dates.startDate': { $gt: new Date() }
      })
      .select('title slug images dates location type')
      .limit(10);
    }

    if (type === 'all' || type === 'stories') {
      data.stories = await Story.find({ 
        region, 
        isActive: true,
        isPublished: true,
        status: 'published'
      })
      .select('title slug images category publishedAt')
      .limit(10);
    }

    res.json({
      success: true,
      data,
      region
    });
  } catch (error) {
    console.error('Get map data error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// @desc    Get all regions data
// @route   GET /api/map/regions
// @access  Public
router.get('/regions', async (req, res) => {
  try {
    const regions = [
      'minho', 'douro', 'beiras', 'lisboa', 'alentejo', 'algarve', 'madeira', 'acores'
    ];

    const regionsData = await Promise.all(
      regions.map(async (region) => {
        const [restaurants, events, stories] = await Promise.all([
          Restaurant.countDocuments({ 'location.region': region, isActive: true }),
          Event.countDocuments({ 'location.region': region, isActive: true }),
          Story.countDocuments({ region, isActive: true, isPublished: true, status: 'published' })
        ]);

        return {
          name: region,
          restaurants,
          events,
          stories
        };
      })
    );

    res.json({
      success: true,
      data: regionsData
    });
  } catch (error) {
    console.error('Get regions data error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

module.exports = router;

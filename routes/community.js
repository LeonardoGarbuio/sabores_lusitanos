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
router.get('/stories', async (req, res) => {
  try {
    const { category, region } = req.query;
    
    // Build filters for SQLite
    const filters = {};
    if (category) filters.category = category;
    if (region) filters.region = region;

    // Get stories from SQLite
    const stories = await Story.getAll(filters);

    res.json({
      success: true,
      data: stories,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        total: stories.length,
        hasNextPage: false,
        hasPrevPage: false,
        limit: stories.length
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
router.get('/stories/:slug', async (req, res) => {
  try {
    const story = await Story.findBySlug(req.params.slug);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'História não encontrada'
      });
    }

    // Increment views
    await Story.incrementViews(story.id);

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
router.post('/stories', async (req, res) => {
  try {
    const { title, content, category, restaurant, rating } = req.body;

    // Validate required fields
    if (!title || !content || !category) {
      return res.status(400).json({
        success: false,
        message: 'Título, conteúdo e categoria são obrigatórios'
      });
    }

    // Create story data
    const storyData = {
      author_id: null, // Anonymous
      title: title,
      content: content,
      excerpt: content.substring(0, 200) + '...',
      category: category,
      region: 'general'
    };

    const story = await Story.create(storyData);

    res.status(201).json({
      success: true,
      data: story,
      message: 'História criada com sucesso!'
    });
  } catch (error) {
    console.error('Create story error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no servidor'
    });
  }
});

// Simple routes for now - only GET and POST stories

module.exports = router;

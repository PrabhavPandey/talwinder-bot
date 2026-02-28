const express = require('express');
const router = express.Router();
const db = require('../models');
const ideaService = require('../services/ideaService');

// GET /api/dashboard/ideas?status=sponsored&category=growth&userId=xxx&priority=high
router.get('/ideas', async (req, res) => {
  try {
    const ideas = await ideaService.getAllIdeas(req.query);
    res.json({ success: true, count: ideas.length, ideas });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await ideaService.getStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/dashboard/users - User-level breakdown
router.get('/users', async (req, res) => {
  try {
    const users = await db.User.findAll({
      attributes: ['id', 'name', 'phoneNumber', 'totalIdeas', 'averageIdeaQuality', 'lastInteraction'],
      where: { isActive: true },
      order: [['totalIdeas', 'DESC']]
    });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/dashboard/ideas/:id - Single idea detail
router.get('/ideas/:id', async (req, res) => {
  try {
    const idea = await db.Idea.findByPk(req.params.id, {
      include: [{ model: db.User, as: 'user', attributes: ['id', 'name', 'phoneNumber'] }]
    });
    if (!idea) return res.status(404).json({ success: false, error: 'Idea not found' });
    res.json({ success: true, idea });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/dashboard/ideas/:id/status - Update idea status from dashboard
router.patch('/ideas/:id/status', async (req, res) => {
  try {
    const { status, feedback } = req.body;
    const idea = await ideaService.updateIdeaStatus(req.params.id, status, feedback);
    if (!idea) return res.status(404).json({ success: false, error: 'Idea not found' });
    res.json({ success: true, idea });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../models');
const ideaService = require('../services/ideaService');

// GET /api/dashboard/ideas?status=captured&category=growth&user=tanmay
router.get('/ideas', async (req, res) => {
  const { status, category, user: userQuery } = req.query;
  const where = {};

  if (status) where.status = status;
  if (category) where.category = category;

  const userInclude = {
    model: db.User,
    as: 'user',
    attributes: ['name', 'phoneNumber']
  };

  if (userQuery) {
    userInclude.where = {
      [db.Sequelize.Op.or]: [
        { name: { [db.Sequelize.Op.iLike]: `%${userQuery}%` } },
        { phoneNumber: { [db.Sequelize.Op.iLike]: `%${userQuery}%` } }
      ]
    };
  }

  try {
    const ideas = await db.Idea.findAll({
      where,
      include: [userInclude],
      attributes: [
        'id', 'rawDescription', 'refinedDescription',
        'imageContext', 'imageBase64', 'category', 'status', 'createdAt'
      ],
      order: [['createdAt', 'DESC']]
    });

    // Handle image rendering: move to data URI if present
    const ideasWithImages = ideas.map(idea => {
      const plain = idea.get({ plain: true });
      if (plain.imageBase64) {
        plain.imageDataUri = `data:image/jpeg;base64,${plain.imageBase64}`;
      }
      return plain;
    });

    res.json({ success: true, count: ideasWithImages.length, ideas: ideasWithImages });
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

// GET /api/dashboard/report
router.get('/report', async (req, res) => {
  try {
    const report = await ideaService.getReport();
    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

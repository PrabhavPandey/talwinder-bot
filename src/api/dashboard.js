const express = require('express');
const router = express.Router();
const db = require('../models');

// GET /api/dashboard/ideas?status=sponsored&category=growth
router.get('/ideas', async (req, res) => {
  const { status, category } = req.query;
  const where = {};
  
  if (status) where.status = status;
  if (category) where.category = category;

  try {
    const ideas = await db.Idea.findAll({
      where,
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['name', 'phoneNumber']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json({ success: true, count: ideas.length, ideas });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const totalIdeas = await db.Idea.count();
    const sponsoredIdeas = await db.Idea.count({ where: { status: 'sponsored' } });
    const categories = await db.Idea.findAll({
      attributes: ['category', [db.sequelize.fn('COUNT', db.sequelize.col('category')), 'count']],
      group: ['category']
    });

    res.json({
      success: true,
      stats: {
        total: totalIdeas,
        sponsored: sponsoredIdeas,
        categories
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

module.exports = (sequelize, DataTypes) => {
  const Idea = sequelize.define('Idea', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    category: {
      type: DataTypes.ENUM('growth', 'engineering', 'product', 'org', 'culture', 'operations', 'other'),
      defaultValue: 'other',
      allowNull: false
    },

    // === SCORING (1-5 each) ===
    noveltyScore: {
      type: DataTypes.INTEGER, // 1-5: how original/fresh
      defaultValue: 0
    },
    utilityScore: {
      type: DataTypes.INTEGER, // 1-5: how useful/impactful
      defaultValue: 0
    },
    charterAlignmentScore: {
      type: DataTypes.INTEGER, // 1-5: how aligned with company charter
      defaultValue: 0
    },

    // Legacy alignment (kept for backwards compat, can be deprecated later)
    alignmentScore: {
      type: DataTypes.INTEGER, // 1-10
      defaultValue: 0
    },
    alignmentReasoning: {
      type: DataTypes.TEXT
    },

    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium'
    },
    status: {
      type: DataTypes.ENUM('pending', 'evaluating', 'sponsored', 'not_now', 'rejected', 'executed'),
      defaultValue: 'pending'
    },

    // === SPONSORSHIP ===
    sponsorSuggestion: {
      type: DataTypes.STRING
    },
    sponsorReasoning: {
      type: DataTypes.TEXT
    },
    feedback: {
      type: DataTypes.TEXT
    },
    qualityRating: {
      type: DataTypes.INTEGER, // 1-5 overall (avg of 3 scores)
      defaultValue: 0
    },

    // === EXECUTION ===
    executor: {
      type: DataTypes.STRING, // Who will execute: name or "self"
      allowNull: true
    },
    executorType: {
      type: DataTypes.ENUM('self', 'team', 'other', 'tbd'),
      defaultValue: 'tbd'
    },
    targetExecutionDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    followUpStatus: {
      type: DataTypes.ENUM('none', 'scheduled', 'sent', 'acknowledged'),
      defaultValue: 'none'
    },

    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'ideas',
    timestamps: true,
    underscored: true
  });

  return Idea;
};

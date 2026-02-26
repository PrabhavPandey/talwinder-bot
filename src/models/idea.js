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
    // Evaluation fields
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
    // Sponsorship info
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
      type: DataTypes.INTEGER, // 1-5 stars for dashboard
      defaultValue: 0
    },
    // Execution & Follow-up
    targetExecutionDate: {
      type: DataTypes.DATEONLY, // We only care about the date, time is fixed at 11 AM
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

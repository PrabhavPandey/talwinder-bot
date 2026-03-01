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
    rawDescription: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    evolvedDescription: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    category: {
      type: DataTypes.ENUM('growth', 'engineering', 'product', 'org', 'culture', 'operations', 'other'),
      defaultValue: 'other',
      allowNull: false
    },
    // Evaluation scores (1-5)
    noveltyScore: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    utilityScore: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    charterAlignmentScore: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    alignmentReasoning: {
      type: DataTypes.TEXT
    },
    // Execution Mapping
    executorType: {
      type: DataTypes.ENUM('user', 'someone_else', 'group'),
      defaultValue: 'user'
    },
    executorDetails: {
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
    // Execution & Follow-up
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

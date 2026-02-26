module.exports = (sequelize, DataTypes) => {
  const UserMemory = sequelize.define('UserMemory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    facts: {
      type: DataTypes.JSONB,
      defaultValue: [] // Array of { fact: string, source: string, date: Date }
    },
    preferences: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    emotionalProfile: {
      type: DataTypes.JSONB,
      defaultValue: {
        dominantEmotion: 'neutral',
        positivityScore: 0.5,
        energyLevel: 'standard'
      }
    },
    lastSummary: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'user_memories',
    timestamps: true,
    underscored: true
  });

  return UserMemory;
};

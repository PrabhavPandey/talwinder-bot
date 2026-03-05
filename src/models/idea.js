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
    rawDescription: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    refinedDescription: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    imageContext: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    imageBase64: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    category: {
      type: DataTypes.ENUM('growth', 'engineering', 'product', 'org', 'culture', 'other'),
      defaultValue: 'other',
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('evaluating', 'captured'),
      defaultValue: 'evaluating'
    }
  }, {
    tableName: 'ideas',
    timestamps: true,
    underscored: true
  });

  return Idea;
};

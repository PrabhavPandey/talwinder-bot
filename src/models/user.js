module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    phoneNumber: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'User'
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    },
    platform: {
      type: DataTypes.ENUM('whatsapp', 'telegram'),
      defaultValue: 'whatsapp'
    },
    lastInteraction: {
      type: DataTypes.DATE
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    // Metrics for the dashboard
    totalIdeas: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    averageIdeaQuality: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    ideaFrequencyGrade: {
      type: DataTypes.STRING, // e.g., 'Daily', 'Weekly', 'Occasional'
      defaultValue: 'N/A'
    }
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: true
  });

  return User;
};

module.exports = (sequelize, DataTypes) => {
  const Conversation = sequelize.define('Conversation', {
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
    messageType: {
      type: DataTypes.ENUM('incoming', 'outgoing'),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    waMessageId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true // Nullable for outgoing or old records
    }
  }, {
    tableName: 'conversations',
    timestamps: true,
    underscored: true
  });

  return Conversation;
};

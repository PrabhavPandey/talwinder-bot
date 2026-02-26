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
    watiMessageId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    intent: {
      type: DataTypes.STRING,
      allowNull: true
    },
    entities: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    processingTime: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'conversations',
    timestamps: true,
    underscored: true
  });

  return Conversation;
};

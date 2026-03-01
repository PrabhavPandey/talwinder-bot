const axios = require('axios');
const logger = require('./logger');

class MetaClient {
  constructor() {
    this.phoneNumberId = process.env.META_PHONE_NUMBER_ID;
    this.accessToken = process.env.META_ACCESS_TOKEN ? process.env.META_ACCESS_TOKEN.trim() : null;
    this.apiVersion = process.env.META_API_VERSION || 'v21.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}`;
  }

  async sendTextMessage(to, text) {
    if (!this.phoneNumberId || !this.accessToken) {
      logger.warn('Meta credentials not configured, skipping send');
      return { success: false, message: 'Not configured' };
    }

    try {
      logger.info(`🔑 Using Meta Token: ${this.accessToken ? this.accessToken.substring(0, 10) + '...' : 'None'}`);
      
      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'text',
          text: { body: text }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return { success: true, data: response.data };
    } catch (error) {
      logger.error('Meta API error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  async reactToMessage(to, messageId, emoji) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'reaction',
          reaction: {
            message_id: messageId,
            emoji: emoji
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      logger.error('Meta Reaction error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  static formatPhoneNumber(phoneNumber) {
    return phoneNumber.replace(/[^0-9]/g, '');
  }

  static isWithin24HourWindow(lastInteraction) {
    if (!lastInteraction) return false;
    const now = new Date();
    const hours = (now - new Date(lastInteraction)) / (1000 * 60 * 60);
    return hours < 24;
  }
}

module.exports = new MetaClient();

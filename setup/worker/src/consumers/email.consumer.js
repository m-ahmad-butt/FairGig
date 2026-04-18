const emailService = require('../services/email.service');

class EmailConsumer {
  constructor(channel) {
    this.channel = channel;
  }

  async startConsumer() {
    try {
      // Ensure email queue exists
      await this.channel.assertQueue('email.notifications', { durable: true });
      
      // Bind email queue to direct exchange
      await this.channel.bindQueue('email.notifications', 'hackathon.direct', 'email');

      console.log('Email consumer started, waiting for messages...');

      // Start consuming email messages
      await this.channel.consume('email.notifications', async (msg) => {
        if (msg) {
          try {
            const data = JSON.parse(msg.content.toString());
            console.log('[Email Consumer] Processing email:', data.type, 'to:', data.email);

            await this.processEmailMessage(data);
            
            // Acknowledge message after successful processing
            this.channel.ack(msg);
            console.log('[Email Consumer] Email sent successfully to:', data.email);
          } catch (error) {
            console.error('[Email Consumer] Error processing email:', error);
            
            // Reject message and don't requeue to avoid infinite loops
            this.channel.nack(msg, false, false);
          }
        }
      });

      // Test email connection on startup
      await emailService.testConnection();
      
    } catch (error) {
      console.error('Failed to start email consumer:', error);
      throw error;
    }
  }

  async processEmailMessage(data) {
    const { type, email, name } = data;

    switch (type) {
      case 'otp':
        await emailService.sendOTP(email, data.otp, name);
        break;

      case 'account_status':
        await emailService.sendAccountStatus(email, name, data.isBanned);
        break;

      default:
        console.warn('[Email Consumer] Unknown email type:', type);
    }
  }
}

module.exports = EmailConsumer;
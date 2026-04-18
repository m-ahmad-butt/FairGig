const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Professional email template wrapper
  getEmailTemplate(content, title = 'FAST-EX Platform') {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background-color: #000000; color: #ffffff; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">FAST-EX</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.8;">Professional Platform</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            ${content}
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0; font-size: 12px; color: #6c757d;">
              This is an automated message from FAST-EX Platform.<br>
              Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendOTP(email, otp, name) {
    const content = `
      <h2 style="color: #333; margin-bottom: 20px;">Account Verification</h2>
      <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">Dear ${name},</p>
      <p style="color: #555; line-height: 1.6; margin-bottom: 30px;">
        You have requested to verify your account. Please use the following One-Time Password (OTP) to complete your verification:
      </p>
      
      <div style="background-color: #f8f9fa; border: 2px solid #000; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
        <h3 style="margin: 0; font-size: 32px; font-weight: bold; color: #000; letter-spacing: 4px;">${otp}</h3>
      </div>
      
      <p style="color: #555; line-height: 1.6; margin-bottom: 10px;">
        <strong>Important:</strong> This OTP will expire in 10 minutes for security purposes.
      </p>
      <p style="color: #555; line-height: 1.6;">
        If you did not request this verification, please ignore this email and ensure your account security.
      </p>
    `;

    const mailOptions = {
      from: `"FAST-EX Platform" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Account Verification - OTP Code',
      html: this.getEmailTemplate(content, 'Account Verification')
    };

    return await this.transporter.sendMail(mailOptions);
  }

  async sendAccountStatus(email, name, isBanned) {
    const subject = isBanned ? 'Account Suspended - FAST-EX Platform' : 'Account Restored - FAST-EX Platform';
    
    const content = `
      <h2 style="color: #333; margin-bottom: 20px;">${isBanned ? 'Account Suspended' : 'Account Restored'}</h2>
      <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">Dear ${name},</p>
      
      ${isBanned ? `
        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
          <p style="color: #856404; margin: 0; line-height: 1.6;">
            Your account has been temporarily suspended by our administration team due to policy violations.
          </p>
        </div>
        <p style="color: #555; line-height: 1.6;">
          During this suspension period, you will not be able to access platform features. 
          If you believe this action was taken in error, please contact our support team.
        </p>
      ` : `
        <div style="background-color: #d1edff; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0;">
          <p style="color: #004085; margin: 0; line-height: 1.6;">
            Your account has been successfully restored and all platform features are now available.
          </p>
        </div>
        <p style="color: #555; line-height: 1.6;">
          You can now access all platform features without any restrictions. Thank you for your patience.
        </p>
      `}
      
      <p style="color: #555; line-height: 1.6;">
        If you have any questions, please contact our support team.
      </p>
    `;

    const mailOptions = {
      from: `"FAST-EX Platform" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      html: this.getEmailTemplate(content, subject)
    };

    return await this.transporter.sendMail(mailOptions);
  }

  async sendPaymentReceipt(email, name, transactionDetails) {
    const { amount, description, transactionId, status, createdAt } = transactionDetails;
    
    const content = `
      <h2 style="color: #333; margin-bottom: 20px;">Payment Receipt</h2>
      <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">Dear ${name},</p>
      
      ${status === 'COMPLETED' ? `
        <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0;">
          <p style="color: #155724; margin: 0; line-height: 1.6; font-weight: bold;">
            Your payment has been successfully processed.
          </p>
        </div>
      ` : `
        <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0;">
          <p style="color: #721c24; margin: 0; line-height: 1.6; font-weight: bold;">
            Your payment could not be processed. Please try again.
          </p>
        </div>
      `}
      
      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 25px; margin: 30px 0;">
        <h3 style="color: #333; margin-top: 0; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">Transaction Details</h3>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; color: #666; font-weight: bold; width: 40%;">Transaction ID:</td>
            <td style="padding: 10px 0; color: #333; font-family: monospace;">${transactionId}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #666; font-weight: bold;">Description:</td>
            <td style="padding: 10px 0; color: #333;">${description}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #666; font-weight: bold;">Amount:</td>
            <td style="padding: 10px 0; color: #333; font-size: 18px; font-weight: bold;">$${amount.toFixed(2)} USD</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #666; font-weight: bold;">Status:</td>
            <td style="padding: 10px 0;">
              <span style="background-color: ${status === 'COMPLETED' ? '#28a745' : '#dc3545'}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                ${status}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #666; font-weight: bold;">Date:</td>
            <td style="padding: 10px 0; color: #333;">${new Date(createdAt).toLocaleString()}</td>
          </tr>
        </table>
      </div>
      
      ${status === 'COMPLETED' ? `
        <p style="color: #555; line-height: 1.6;">
          Thank you for your payment. Your account has been updated accordingly.
        </p>
      ` : `
        <p style="color: #555; line-height: 1.6;">
          If you continue to experience payment issues, please contact our support team for assistance.
        </p>
      `}
      
      <p style="color: #555; line-height: 1.6;">
        For any questions regarding this transaction, please contact our support team with your transaction ID.
      </p>
    `;

    const mailOptions = {
      from: `"FAST-EX Platform" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Payment Receipt - Transaction ${transactionId}`,
      html: this.getEmailTemplate(content, 'Payment Receipt')
    };

    return await this.transporter.sendMail(mailOptions);
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('Email service connected successfully');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();

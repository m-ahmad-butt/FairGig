const transporter = require('../config/email');

class EmailService {
  async sendEmail(to, subject, html) {
    try {
      if (!process.env.SMTP_USER) {
        console.log('Email would be sent to:', to);
        console.log('Subject:', subject);
        console.log('Content:', html);
        return;
      }
      
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to,
        subject,
        html
      });
    } catch (error) {
      console.error('Email error:', error);
      throw error;
    }
  }

  async sendOTPEmail(email, name, otp) {
    const subject = 'Verify Your Email - FairGig';
    const html = `
      <h2>Welcome to FairGig!</h2>
      <p>Hi ${name},</p>
      <p>Your OTP for email verification is: <strong>${otp}</strong></p>
      <p>This OTP will expire in 10 minutes.</p>
    `;
    return this.sendEmail(email, subject, html);
  }

  async sendAccountActivatedEmail(email, name) {
    const subject = 'Account Activated - FairGig';
    const html = `
      <h2>Account Activated!</h2>
      <p>Hi ${name},</p>
      <p>Your account has been activated. You can now log in to FairGig.</p>
    `;
    return this.sendEmail(email, subject, html);
  }

  async sendAdminApprovalNotification(adminEmail, user) {
    const approvalToken = Buffer.from(user.id).toString('base64');
    const approvalUrl = `${process.env.AUTH_SERVICE_URL || 'http://localhost:4001'}/api/auth/admin/approve/${approvalToken}`;
    
    const subject = 'New User Approval Required - FairGig';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New User Registration</h2>
        <p>A new ${user.role} has registered and verified their email:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Name:</strong> ${user.name}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${user.email}</p>
          <p style="margin: 5px 0;"><strong>Role:</strong> ${user.role}</p>
        </div>
        
        <p>Click the button below to approve this user:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${approvalUrl}" 
             style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Verify Now
          </a>
        </div>
        
        <p style="color: #666; font-size: 12px;">
          Or copy and paste this link in your browser:<br>
          <a href="${approvalUrl}">${approvalUrl}</a>
        </p>
      </div>
    `;
    return this.sendEmail(adminEmail, subject, html);
  }

  async sendAccountApprovedEmail(email, name, role) {
    const subject = 'Account Approved - FairGig';
    const html = `
      <h2>Account Approved!</h2>
      <p>Hi ${name},</p>
      <p>Your account has been approved by the admin. You can now log in to FairGig.</p>
      <p>Role: ${role}</p>
    `;
    return this.sendEmail(email, subject, html);
  }

  async sendAccountRejectedEmail(email, name) {
    const subject = 'Account Application Status - FairGig';
    const html = `
      <h2>Account Application Update</h2>
      <p>Hi ${name},</p>
      <p>Unfortunately, your account application has not been approved at this time.</p>
      <p>If you have questions, please contact support.</p>
    `;
    return this.sendEmail(email, subject, html);
  }
}

module.exports = new EmailService();

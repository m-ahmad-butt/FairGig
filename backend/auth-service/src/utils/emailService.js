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
    const subject = 'New User Approval Required - FairGig';
    const html = `
      <h2>New User Registration</h2>
      <p>A new ${user.role} has registered and verified their email:</p>
      <p><strong>Name:</strong> ${user.name}</p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Role:</strong> ${user.role}</p>
      <p>Please review and approve this user.</p>
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

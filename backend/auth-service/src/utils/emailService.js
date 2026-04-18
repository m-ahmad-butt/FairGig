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
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background-color: #4F46E5; padding: 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">FairGig</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 22px;">New User Registration</h2>
                    <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
                      A new <strong>${user.role}</strong> has registered and verified their email:
                    </p>
                    
                    <!-- User Details Box -->
                    <table width="100%" cellpadding="15" cellspacing="0" style="background-color: #f8f9fa; border-radius: 6px; margin: 20px 0;">
                      <tr>
                        <td>
                          <p style="margin: 8px 0; color: #333333; font-size: 15px;">
                            <strong>Name:</strong> ${user.name}
                          </p>
                          <p style="margin: 8px 0; color: #333333; font-size: 15px;">
                            <strong>Email:</strong> ${user.email}
                          </p>
                          <p style="margin: 8px 0; color: #333333; font-size: 15px;">
                            <strong>Role:</strong> ${user.role}
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 30px 0 20px 0;">
                      Click the button below to approve this user:
                    </p>
                    
                    <!-- Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${approvalUrl}" 
                             style="background-color: #28a745; color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
                            ✓ Verify Now
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Alternative Link -->
                    <table width="100%" cellpadding="15" cellspacing="0" style="background-color: #f8f9fa; border-radius: 6px; margin: 30px 0 0 0;">
                      <tr>
                        <td>
                          <p style="margin: 0 0 10px 0; color: #666666; font-size: 13px;">
                            Or copy and paste this link in your browser:
                          </p>
                          <p style="margin: 0; word-break: break-all;">
                            <a href="${approvalUrl}" style="color: #4F46E5; font-size: 13px;">${approvalUrl}</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
                    <p style="margin: 0; color: #999999; font-size: 12px;">
                      This is an automated email from FairGig. Please do not reply.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
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

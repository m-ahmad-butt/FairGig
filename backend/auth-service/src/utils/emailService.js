const { transporter, emailConfig } = require('../config/email');

function normalizeBaseUrl(value) {
  const normalized = String(value || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/api\/auth$/i, '');

  if (!/^https?:\/\//i.test(normalized)) {
    return `https://${normalized}`;
  }

  return normalized;
}

function resolveApprovalBaseUrl() {
  const candidate = [
    process.env.API_GATEWAY_URL,
    process.env.PAI_GATEWAY_URL,
    process.env.PUBLIC_URL,
    process.env.FRONTEND_URL
  ].find((value) => value !== undefined && value !== null && String(value).trim() !== '');

  if (!candidate) {
    console.warn(
      'API_GATEWAY_URL/PAI_GATEWAY_URL/PUBLIC_URL/FRONTEND_URL is not configured. Falling back to s-api-gateway.duckdns.org for approval email links.'
    );
    return 'https://s-api-gateway.duckdns.org';
  }

  return normalizeBaseUrl(candidate);
}

class EmailService {
  async sendEmail(to, subject, html) {
    if (!emailConfig.isConfigured) {
      const error = new Error('Email service is not configured');
      error.code = 'EMAIL_NOT_CONFIGURED';
      throw error;
    }

    try {
      const emailPromise = transporter.sendMail({
        from: emailConfig.from,
        to,
        subject,
        html
      });
      
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Email timeout')), 10000));
      await Promise.race([emailPromise, timeoutPromise]);
    } catch (error) {
      console.error('Email delivery error:', error.message);
      const wrappedError = new Error('Unable to deliver email right now. Please try again shortly.');
      wrappedError.code = error.code || 'EMAIL_SEND_FAILED';
      throw wrappedError;
    }
  }

  async sendOTPEmail(email, name, otp) {
    const subject = 'Verify Your Email - FairGig';
    const html = `<h2>Welcome to FairGig!</h2><p>Hi ${name},</p><p>Your OTP for email verification is: <strong>${otp}</strong></p><p>This OTP will expire in 10 minutes.</p>`;
    return this.sendEmail(email, subject, html);
  }

  async sendAccountActivatedEmail(email, name) {
    const subject = 'Account Activated - FairGig';
    const html = `<h2>Account Activated!</h2><p>Hi ${name},</p><p>Your account has been activated. You can now log in to FairGig.</p>`;
    return this.sendEmail(email, subject, html);
  }

  async sendAdminApprovalNotification(adminEmail, user) {
    const token = Buffer.from(user.id.toString(), 'utf-8').toString('base64');
    const gatewayBaseUrl = resolveApprovalBaseUrl();
    const url = `${gatewayBaseUrl}/api/admin/approve/${encodeURIComponent(token)}`;
    const subject = 'New User Approval Required - FairGig';
    const html = `<div style="font-family: Arial, sans-serif; padding: 20px;"><h2>New User Registration</h2><p><strong>Name:</strong> ${user.name}</p><p><strong>Email:</strong> ${user.email}</p><p><strong>Role:</strong> ${user.role}</p><div style="margin-top: 20px;"><a href="${url}" style="background-color: #4F46E5; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Approve User</a></div></div>`;
    return this.sendEmail(adminEmail, subject, html);
  }

  async sendAccountApprovedEmail(email, name, role) {
    const subject = 'Account Approved - FairGig';
    const html = `<h2>Account Approved!</h2><p>Hi ${name},</p><p>Your account has been approved. You can now log in.</p><p>Role: ${role}</p>`;
    return this.sendEmail(email, subject, html);
  }

  async sendAccountRejectedEmail(email, name) {
    const subject = 'Account Application Update';
    const html = `<h2>Account Application Update</h2><p>Hi ${name},</p><p>Unfortunately, your application has not been approved.</p>`;
    return this.sendEmail(email, subject, html);
  }
}

module.exports = new EmailService();

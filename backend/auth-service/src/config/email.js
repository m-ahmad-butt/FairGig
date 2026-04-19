const nodemailer = require('nodemailer');

function pickFirst(...values) {
  for (const value of values) {
    if (value === undefined || value === null) {
      continue;
    }

    const normalized = String(value).trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }

  return undefined;
}

const host = pickFirst(process.env.SMTP_HOST, process.env.EMAIL_HOST, 'smtp.gmail.com');
const parsedPort = Number(pickFirst(process.env.SMTP_PORT, process.env.EMAIL_PORT, 587));
const port = Number.isFinite(parsedPort) ? parsedPort : 587;
const user = pickFirst(process.env.SMTP_USER, process.env.EMAIL_USER);
const pass = pickFirst(process.env.SMTP_PASS, process.env.EMAIL_PASS);
const secureFlag = pickFirst(process.env.SMTP_SECURE, process.env.EMAIL_SECURE);
const secure = secureFlag !== undefined ? secureFlag.toLowerCase() === 'true' : port === 465;
const from = pickFirst(process.env.SMTP_FROM, process.env.EMAIL_FROM, user);

const isConfigured = Boolean(host && Number.isFinite(port) && user && pass);

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: isConfigured
    ? {
        user,
        pass
      }
    : undefined
});

module.exports = {
  transporter,
  emailConfig: {
    host,
    port,
    user,
    pass,
    from,
    secure,
    isConfigured
  }
};

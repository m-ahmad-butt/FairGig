// Quick email configuration test
// Usage: node setup-email.js

const nodemailer = require('nodemailer');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function testEmail() {
  console.log('\n=== Email Configuration Test ===\n');
  
  const smtpHost = await question('SMTP Host (e.g., smtp.gmail.com): ');
  const smtpPort = await question('SMTP Port (default 587): ') || '587';
  const smtpUser = await question('SMTP User (your email): ');
  const smtpPass = await question('SMTP Password (app password for Gmail): ');
  const testEmail = await question('Send test email to: ');

  console.log('\nTesting email configuration...\n');

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort),
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });

  try {
    // Verify connection
    await transporter.verify();
    console.log('✓ SMTP connection successful!\n');

    // Send test email
    const info = await transporter.sendMail({
      from: smtpUser,
      to: testEmail,
      subject: 'FairGig Email Test',
      html: `
        <h2>Email Configuration Successful!</h2>
        <p>Your FairGig auth service email is working correctly.</p>
        <p>Configuration:</p>
        <ul>
          <li>Host: ${smtpHost}</li>
          <li>Port: ${smtpPort}</li>
          <li>User: ${smtpUser}</li>
        </ul>
      `
    });

    console.log('✓ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('\nAdd these to your .env file:');
    console.log(`SMTP_HOST=${smtpHost}`);
    console.log(`SMTP_PORT=${smtpPort}`);
    console.log(`SMTP_USER=${smtpUser}`);
    console.log(`SMTP_PASS=${smtpPass}`);
    
  } catch (error) {
    console.error('✗ Email test failed:', error.message);
    console.log('\nCommon issues:');
    console.log('- Gmail: Use App Password, not regular password');
    console.log('- Enable 2-Step Verification first');
    console.log('- Check if firewall is blocking port', smtpPort);
  } finally {
    rl.close();
  }
}

testEmail();

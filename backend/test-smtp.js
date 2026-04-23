require('dotenv').config();
const nodemailer = require('nodemailer');
console.log('=== EMAIL CONFIG DEBUG ===');
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***' : 'MISSING');
console.log('EMAIL_FROM_NAME:', process.env.EMAIL_FROM_NAME);
const host = process.env.SMTP_HOST;
const port = parseInt(process.env.SMTP_PORT || '587');
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
if (!host || !user || !pass) {
  console.error('ERROR: Missing required SMTP variables');
  console.error('Will not proceed with connection test');
  process.exit(1);
}
const transporter = nodemailer.createTransport({
  host, port,
  secure: port === 465,
  auth: { user, pass },
  tls: { rejectUnauthorized: false },
});
console.log('\n=== TESTING SMTP CONNECTION ===');
transporter.verify()
  .then(() => {
    console.log('✅ SMTP connection SUCCESSFUL');
    console.log('Email service is properly configured and ready to send');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ SMTP connection FAILED');
    console.error('Error:', err.message);
    console.error('Code:', err.code);
    process.exit(1);
  });

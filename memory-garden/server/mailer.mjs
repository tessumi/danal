import nodemailer from 'nodemailer';

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM
} = process.env;

let transporter;

function ensureTransporter() {
  if (transporter) return transporter;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('mailer_not_configured');
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
  return transporter;
}

export async function sendGuardianNotification({ to, subject, html }) {
  if (!to) {
    return { sent: false, reason: 'missing_recipient' };
  }
  try {
    const tx = ensureTransporter();
    await tx.sendMail({
      from: MAIL_FROM || 'Memory Garden <noreply@memory.garden>',
      to,
      subject,
      html
    });
    return { sent: true };
  } catch (error) {
    return { sent: false, reason: error.message };
  }
}

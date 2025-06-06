import nodemailer from 'nodemailer';

// Create transport for sending emails
const transport = nodemailer.createTransport({
  host: process.env.SMTP_RELAY_SERVER,
  port: parseInt(process.env.SMTP_RELAY_PORT || '587', 10),
  auth: {
    user: process.env.SMTP_RELAY_USER,
    pass: process.env.SMTP_RELAY_PASSWORD
  }
});

/**
 * Sends an email with a password reset link
 * @param email Recipient email address
 * @param resetToken The unique reset token
 * @param resetLink Full URL for password reset
 * @returns Whether the email was sent successfully
 */
export async function sendPasswordResetLink(email: string, resetToken: string, resetLink: string) {
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@example.com',
      to: email,
      subject: 'Password Reset Request',
      text: `
You have requested to reset your password.

Please click the following link to reset your password:
${resetLink}

This link will expire in 1 hour.

If you did not request a password reset, please ignore this email or contact support if you have concerns.
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6;">Password Reset Request</h2>
          <p>You have requested to reset your password.</p>
          <div style="margin: 25px 0;">
            <a href="${resetLink}" style="background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Your Password
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #3B82F6;">
            <a href="${resetLink}">${resetLink}</a>
          </p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">
            This is an automated message, please do not reply.
          </p>
        </div>
      `
    });
    console.log(`Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
}

// Helper for sending temporary password emails
export async function sendTempPassword(email: string, password: string) {
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@example.com',
      to: email,
      subject: 'Your Temporary Password',
      text: `Your temporary password is: ${password}\n\nPlease log in and change your password as soon as possible.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6;">Your Temporary Password</h2>
          <p>Your temporary password is: <strong>${password}</strong></p>
          <p>Please log in and change your password as soon as possible.</p>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">
            This is an automated message, please do not reply.
          </p>
        </div>
      `
    });
    console.log(`Temporary password email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

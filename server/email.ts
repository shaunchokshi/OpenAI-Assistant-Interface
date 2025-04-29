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

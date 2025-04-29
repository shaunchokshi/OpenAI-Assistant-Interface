import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();
const transport = nodemailer.createTransport({
  host: process.env.SMTP_RELAY_SERVER,
  port: process.env.SMTP_RELAY_PORT,
  auth: {
    user: process.env.SMTP_RELAY_USER,
    pass: process.env.SMTP_RELAY_PASSWORD
  }
});

export async function sendTempPassword(email, password) {
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Your Temporary Password',
    text: `Your temp password: ${password}`
  });
}
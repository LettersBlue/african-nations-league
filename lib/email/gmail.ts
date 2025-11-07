import { getRepresentativeInvitationEmailTemplate, getAdminInvitationEmailTemplate } from './templates';

// Initialize Nodemailer (Gmail SMTP) for sending emails
let nodemailerTransporter: any = null;
if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  try {
    const nodemailer = require('nodemailer');
    nodemailerTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD, // App Password from Google Account
      },
    });
    console.log('Nodemailer (Gmail SMTP) configured for sending emails');
  } catch (error) {
    console.warn('Nodemailer not available. Install with: npm install nodemailer');
  }
}


/**
 * Send representative invitation email
 */
export async function sendRepresentativeInvitation(
  email: string,
  country: string,
  invitationLink: string
): Promise<boolean> {
  try {
    const { subject, html } = getRepresentativeInvitationEmailTemplate(email, country, invitationLink);
    
    // Use Gmail SMTP (Nodemailer) to send email
    if (nodemailerTransporter) {
      await nodemailerTransporter.sendMail({
        from: `African Nations League <${process.env.GMAIL_USER}>`,
        to: email,
        subject,
        html,
      });
      console.log(`Representative invitation email sent to ${email}`);
      return true;
    }
    
    // No email provider configured
    console.error('No email provider configured. Set GMAIL_USER + GMAIL_APP_PASSWORD in environment variables');
    return false;
  } catch (error) {
    console.error('Error sending representative invitation email:', error);
    return false;
  }
}

/**
 * Send admin invitation email
 */
export async function sendAdminInvitation(
  email: string,
  invitationLink: string
): Promise<boolean> {
  try {
    const { subject, html } = getAdminInvitationEmailTemplate(email, invitationLink);
    
    // Use Gmail SMTP (Nodemailer) to send email
    if (nodemailerTransporter) {
      await nodemailerTransporter.sendMail({
        from: `African Nations League <${process.env.GMAIL_USER}>`,
        to: email,
        subject,
        html,
      });
      console.log(`Admin invitation email sent to ${email}`);
      return true;
    }
    
    // No email provider configured
    console.error('No email provider configured. Set GMAIL_USER + GMAIL_APP_PASSWORD in environment variables');
    return false;
  } catch (error) {
    console.error('Error sending admin invitation email:', error);
    return false;
  }
}


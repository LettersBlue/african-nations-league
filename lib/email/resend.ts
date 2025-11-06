import { Resend } from 'resend';
import { Match } from '@/types';
import { getRepresentativeInvitationEmailTemplate, getAdminInvitationEmailTemplate } from './templates';

// Initialize Resend (if API key is set)
let resend: Resend | null = null;
if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_your_resend_key_here') {
  resend = new Resend(process.env.RESEND_API_KEY);
}

// Try to initialize Nodemailer as fallback (Gmail SMTP - FREE)
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
    console.log('Nodemailer (Gmail SMTP) configured as email fallback');
  } catch (error) {
    console.warn('Nodemailer not available. Install with: npm install nodemailer');
  }
}

/**
 * Send match result email to team representatives
 */
export async function sendMatchResultEmail(match: Match, recipientEmail: string): Promise<boolean> {
  if (!match.result) {
    throw new Error('Match result not available');
  }
  
  const { result } = match;
  const winnerTeam = result.winnerId === match.team1.id ? match.team1 : match.team2;
  const loserTeam = result.winnerId === match.team1.id ? match.team2 : match.team1;
  
  const goalScorersHtml = result.goalScorers.length > 0 
    ? `
      <h3>Goal Scorers:</h3>
      <ul>
        ${result.goalScorers.map(goal => 
          `<li><strong>${goal.playerName}</strong> (${goal.minute}')</li>`
        ).join('')}
      </ul>
    `
    : '<p>No goals scored in this match.</p>';
  
  const extraTimeInfo = result.wentToExtraTime 
    ? '<p><em>This match went to extra time.</em></p>'
    : '';
  
  const penaltyInfo = result.wentToPenalties 
    ? '<p><em>This match was decided by penalty shootout.</em></p>'
    : '';
  
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1e40af; text-align: center;">African Nations League</h1>
      <h2 style="text-align: center;">Match Result</h2>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="text-align: center; margin: 0;">
          ${match.team1.name} ${result.team1Score} - ${result.team2Score} ${match.team2.name}
        </h3>
        <p style="text-align: center; margin: 10px 0 0 0;">
          <strong>Winner:</strong> ${winnerTeam.name}
        </p>
      </div>
      
      ${goalScorersHtml}
      ${extraTimeInfo}
      ${penaltyInfo}
      
      <div style="margin-top: 30px; text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/tournament/matches/${match.id}" 
           style="background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          View Full Match Details
        </a>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
        <p>African Nations League Tournament Platform</p>
        <p>This is an automated notification. Please do not reply to this email.</p>
      </div>
    </div>
  `;

  const emailSubject = `Match Result: ${match.team1.name} ${result.team1Score} - ${result.team2Score} ${match.team2.name}`;

  try {
    // Try Resend first
    if (resend) {
      try {
        await resend.emails.send({
          from: 'African Nations League <noreply@african-nations-league.com>',
          to: recipientEmail,
          subject: emailSubject,
          html: emailHtml,
        });
        return true;
      } catch (resendError) {
        console.warn('Resend failed, trying fallback:', resendError);
        // Fall through to Nodemailer
      }
    }
    
    // Fallback to Nodemailer (Gmail SMTP)
    if (nodemailerTransporter) {
      await nodemailerTransporter.sendMail({
        from: `African Nations League <${process.env.GMAIL_USER}>`,
        to: recipientEmail,
        subject: emailSubject,
        html: emailHtml,
      });
      return true;
    }
    
    // No email provider configured
    console.error('No email provider configured. Set RESEND_API_KEY or GMAIL_USER + GMAIL_APP_PASSWORD');
    return false;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Send emails to both team representatives
 */
export async function notifyMatchResult(match: Match): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  try {
    // Send to team 1 representative
    const team1Success = await sendMatchResultEmail(match, match.team1.representativeEmail);
    if (!team1Success) {
      errors.push(`Failed to send email to ${match.team1.representativeEmail}`);
    }
    
    // Send to team 2 representative
    const team2Success = await sendMatchResultEmail(match, match.team2.representativeEmail);
    if (!team2Success) {
      errors.push(`Failed to send email to ${match.team2.representativeEmail}`);
    }
    
    return {
      success: errors.length === 0,
      errors,
    };
  } catch (error) {
    console.error('Error notifying match result:', error);
    return {
      success: false,
      errors: ['Failed to send match notifications'],
    };
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
    
    // Try Resend first
    if (resend) {
      try {
        await resend.emails.send({
          from: 'African Nations League <noreply@african-nations-league.com>',
          to: email,
          subject,
          html,
        });
        return true;
      } catch (resendError) {
        console.warn('Resend failed, trying fallback:', resendError);
        // Fall through to Nodemailer
      }
    }
    
    // Fallback to Nodemailer (Gmail SMTP)
    if (nodemailerTransporter) {
      await nodemailerTransporter.sendMail({
        from: `African Nations League <${process.env.GMAIL_USER}>`,
        to: email,
        subject,
        html,
      });
      return true;
    }
    
    // No email provider configured
    console.error('No email provider configured. Set RESEND_API_KEY or GMAIL_USER + GMAIL_APP_PASSWORD');
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
    
    // Try Resend first
    if (resend) {
      try {
        await resend.emails.send({
          from: 'African Nations League <noreply@african-nations-league.com>',
          to: email,
          subject,
          html,
        });
        return true;
      } catch (resendError) {
        console.warn('Resend failed, trying fallback:', resendError);
        // Fall through to Nodemailer
      }
    }
    
    // Fallback to Nodemailer (Gmail SMTP)
    if (nodemailerTransporter) {
      await nodemailerTransporter.sendMail({
        from: `African Nations League <${process.env.GMAIL_USER}>`,
        to: email,
        subject,
        html,
      });
      return true;
    }
    
    // No email provider configured
    console.error('No email provider configured. Set RESEND_API_KEY or GMAIL_USER + GMAIL_APP_PASSWORD');
    return false;
  } catch (error) {
    console.error('Error sending admin invitation email:', error);
    return false;
  }
}


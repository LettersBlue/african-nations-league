// Email templates for match notifications

export function getMatchResultEmailTemplate(match: any): { subject: string; html: string } {
  // TODO: Implement email template
  return {
    subject: '',
    html: '',
  };
}

// Email template for representative invitations
export function getRepresentativeInvitationEmailTemplate(
  email: string,
  country: string,
  invitationLink: string
): { subject: string; html: string } {
  const subject = `You've been invited to represent ${country} in the African Nations League`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1e40af; text-align: center;">African Nations League</h1>
      <h2 style="text-align: center; color: #374151;">Representative Invitation</h2>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="font-size: 16px; line-height: 1.6; color: #1f2937;">
          Hello,
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #1f2937;">
          You have been invited to represent <strong>${country}</strong> as a Team Representative in the African Nations League tournament platform.
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #1f2937;">
          As a representative, you will be able to:
        </p>
        <ul style="font-size: 16px; line-height: 1.8; color: #1f2937; margin-left: 20px;">
          <li>Register and manage your country's team</li>
          <li>Select 23 players and set your starting lineup</li>
          <li>Receive match notifications and results</li>
          <li>View team analytics and performance</li>
        </ul>
      </div>
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="${invitationLink}" 
           style="background-color: #1e40af; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
          Accept Invitation & Set Password
        </a>
      </div>
      
      <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          <strong>Security Notice:</strong> This invitation link will expire in 7 days. If you did not expect this invitation, please ignore this email.
        </p>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
        <p>African Nations League Tournament Platform</p>
        <p>This is an automated invitation. Please do not reply to this email.</p>
      </div>
    </div>
  `;

  return { subject, html };
}

// Email template for admin invitations
export function getAdminInvitationEmailTemplate(
  email: string,
  invitationLink: string
): { subject: string; html: string } {
  const subject = `You've been invited to be an Admin in the African Nations League`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1e40af; text-align: center;">African Nations League</h1>
      <h2 style="text-align: center; color: #374151;">Admin Invitation</h2>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="font-size: 16px; line-height: 1.6; color: #1f2937;">
          Hello,
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #1f2937;">
          You have been invited to be an <strong>Administrator</strong> in the African Nations League tournament platform.
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #1f2937;">
          As an administrator, you will be able to:
        </p>
        <ul style="font-size: 16px; line-height: 1.8; color: #1f2937; margin-left: 20px;">
          <li>Manage users and their roles</li>
          <li>Invite representatives and other admins</li>
          <li>Start and manage tournaments</li>
          <li>Simulate and play matches</li>
          <li>View all tournament data and analytics</li>
        </ul>
      </div>
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="${invitationLink}" 
           style="background-color: #7c3aed; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
          Accept Invitation & Set Password
        </a>
      </div>
      
      <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          <strong>Security Notice:</strong> This invitation link will expire in 7 days. If you did not expect this invitation, please ignore this email.
        </p>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
        <p>African Nations League Tournament Platform</p>
        <p>This is an automated invitation. Please do not reply to this email.</p>
      </div>
    </div>
  `;

  return { subject, html };
}

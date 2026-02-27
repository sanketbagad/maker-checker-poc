import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@securecontrol.dev';

interface SendCredentialsEmailParams {
  to: string;
  fullName: string;
  role: string;
  temporaryPassword: string;
  loginUrl: string;
}

/**
 * Send welcome email with credentials to a newly created user (checker/admin).
 */
export async function sendCredentialsEmail({
  to,
  fullName,
  role,
  temporaryPassword,
  loginUrl,
}: SendCredentialsEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; padding: 40px 20px;">
      <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: #1a1a2e; padding: 12px; border-radius: 12px; margin-bottom: 16px;">
            <span style="color: white; font-size: 24px;">🛡️</span>
          </div>
          <h1 style="margin: 0; color: #1a1a2e; font-size: 24px;">Welcome to SecureControl</h1>
          <p style="color: #71717a; margin-top: 8px;">Banking Control System</p>
        </div>

        <p style="color: #27272a; font-size: 16px;">Hello <strong>${fullName}</strong>,</p>
        
        <p style="color: #3f3f46; font-size: 14px; line-height: 1.6;">
          You have been added as a <strong style="color: #1a1a2e;">${roleLabel}</strong> 
          in the SecureControl Banking System. Please use the credentials below to log in.
        </p>

        <div style="background: #f4f4f5; border-radius: 8px; padding: 24px; margin: 24px 0;">
          <p style="margin: 0 0 12px 0; font-size: 13px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Your Login Credentials</p>
          <table style="width: 100%;">
            <tr>
              <td style="padding: 6px 0; color: #71717a; font-size: 14px;">Email:</td>
              <td style="padding: 6px 0; color: #27272a; font-size: 14px; font-weight: 600;">${to}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #71717a; font-size: 14px;">Password:</td>
              <td style="padding: 6px 0; color: #27272a; font-size: 14px; font-family: monospace; font-weight: 600; letter-spacing: 1px;">${temporaryPassword}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #71717a; font-size: 14px;">Role:</td>
              <td style="padding: 6px 0; color: #27272a; font-size: 14px; font-weight: 600;">${roleLabel}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${loginUrl}" style="display: inline-block; background: #1a1a2e; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
            Log In to SecureControl
          </a>
        </div>

        <div style="background: #fef3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0; color: #856404; font-size: 13px;">
            ⚠️ <strong>Security Notice:</strong> Please change your password after your first login. 
            Do not share your credentials with anyone.
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">
        
        <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">
          This is an automated message from SecureControl Banking System.<br>
          If you did not expect this email, please contact your system administrator.
        </p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Welcome to SecureControl Banking System

Hello ${fullName},

You have been added as a ${roleLabel} in the SecureControl Banking System.

Your Login Credentials:
- Email: ${to}
- Password: ${temporaryPassword}
- Role: ${roleLabel}

Login URL: ${loginUrl}

SECURITY NOTICE: Please change your password after your first login.
Do not share your credentials with anyone.

---
This is an automated message from SecureControl Banking System.
  `.trim();

  try {
    const { data, error } = await resend.emails.send({
      from: `SecureControl <${FROM_EMAIL}>`,
      to: [to],
      subject: `Welcome to SecureControl — Your ${roleLabel} Account`,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error('[EMAIL] Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('[EMAIL] Failed to send:', err);
    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Generate a random temporary password.
 */
export function generateTemporaryPassword(length = 12): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '!@#$%&*';
  const all = upper + lower + digits + special;

  // Ensure at least one of each category
  let password = '';
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += special[Math.floor(Math.random() * special.length)];

  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

// ── OTP Email ──

interface SendOTPEmailParams {
  to: string;
  firstName: string;
  otp: string;
  expiresInMinutes: number;
}

/**
 * Send OTP verification email during user registration.
 */
export async function sendOTPEmail({
  to,
  firstName,
  otp,
  expiresInMinutes,
}: SendOTPEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; padding: 40px 20px;">
      <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: #1a1a2e; padding: 12px; border-radius: 12px; margin-bottom: 16px;">
            <span style="color: white; font-size: 24px;">&#128737;</span>
          </div>
          <h1 style="margin: 0; color: #1a1a2e; font-size: 24px;">SecureControl</h1>
          <p style="color: #71717a; margin-top: 8px;">Email Verification</p>
        </div>

        <p style="color: #27272a; font-size: 16px;">Hello <strong>${firstName}</strong>,</p>

        <p style="color: #3f3f46; font-size: 14px; line-height: 1.6;">
          Please use the following one-time password to verify your email address and complete your registration.
        </p>

        <div style="background: #f4f4f5; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Your Verification Code</p>
          <p style="margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1a2e; font-family: monospace;">${otp}</p>
        </div>

        <p style="color: #71717a; font-size: 13px; text-align: center;">
          This code will expire in <strong>${expiresInMinutes} minutes</strong>.
        </p>

        <div style="background: #fef3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0; color: #856404; font-size: 13px;">
            &#9888;&#65039; <strong>Security Notice:</strong> Never share this code with anyone. 
            SecureControl staff will never ask for your OTP.
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">

        <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">
          This is an automated message from SecureControl Banking System.<br>
          If you did not request this code, please ignore this email.
        </p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
SecureControl - Email Verification

Hello ${firstName},

Your verification code is: ${otp}

This code will expire in ${expiresInMinutes} minutes.

SECURITY NOTICE: Never share this code with anyone.

---
This is an automated message from SecureControl Banking System.
If you did not request this code, please ignore this email.
  `.trim();

  try {
    const { data, error } = await resend.emails.send({
      from: `SecureControl <${FROM_EMAIL}>`,
      to: [to],
      subject: `${otp} - Your SecureControl Verification Code`,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error('[EMAIL] Resend error sending OTP:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('[EMAIL] Failed to send OTP:', err);
    return { success: false, error: 'Failed to send OTP email' };
  }
}

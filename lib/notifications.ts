import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@securecontrol.dev';

export type NotificationType = 'info' | 'kyc' | 'transaction' | 'policy' | 'user' | 'system';

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  entityType?: string;
  entityId?: string;
}

export interface NotifyCheckersParams {
  title: string;
  message: string;
  type: NotificationType;
  entityType?: string;
  entityId?: string;
  emailSubject?: string;
  emailBody?: string;
}

/**
 * Create an in-app notification for a single user.
 * Uses the service-role client so RLS is bypassed (server-only).
 */
export async function createNotification(
  supabase: { from: (table: string) => any },
  params: CreateNotificationParams
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('notifications').insert({
    user_id: params.userId,
    title: params.title,
    message: params.message,
    type: params.type,
    entity_type: params.entityType || null,
    entity_id: params.entityId || null,
  });

  if (error) {
    console.error('[NOTIFICATION] Insert error:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Notify all checkers (and admins/superadmins) with both in-app
 * notification and email. Uses service-role client to read all profiles.
 */
export async function notifyCheckers(
  supabase: { from: (table: string) => any },
  params: NotifyCheckersParams
): Promise<{ notified: number; emailsSent: number }> {
  // Fetch all privileged users (checkers, admins, superadmins)
  const { data: checkers, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .in('role', ['checker', 'admin', 'superadmin']);

  if (error || !checkers || checkers.length === 0) {
    console.error('[NOTIFICATION] Failed to fetch checkers:', error);
    return { notified: 0, emailsSent: 0 };
  }

  let notified = 0;
  let emailsSent = 0;

  // Create in-app notifications for all checkers in parallel
  const notificationInserts = checkers.map((checker: { id: string }) => ({
    user_id: checker.id,
    title: params.title,
    message: params.message,
    type: params.type,
    entity_type: params.entityType || null,
    entity_id: params.entityId || null,
  }));

  const { error: insertError } = await supabase
    .from('notifications')
    .insert(notificationInserts);

  if (!insertError) {
    notified = checkers.length;
  } else {
    console.error('[NOTIFICATION] Bulk insert error:', insertError);
  }

  // Send email notifications in parallel (non-blocking — don't fail if email fails)
  const emailPromises = checkers.map(
    async (checker: { email: string; full_name: string }) => {
      try {
        const { error: emailError } = await resend.emails.send({
          from: `SecureControl <${FROM_EMAIL}>`,
          to: [checker.email],
          subject: params.emailSubject || params.title,
          html: buildNotificationEmailHtml(
            checker.full_name,
            params.title,
            params.emailBody || params.message
          ),
          text: `Hello ${checker.full_name},\n\n${params.emailBody || params.message}\n\n---\nSecureControl Banking System`,
        });
        if (!emailError) return true;
        console.error(`[NOTIFICATION] Email to ${checker.email} failed:`, emailError);
        return false;
      } catch (err) {
        console.error(`[NOTIFICATION] Email to ${checker.email} exception:`, err);
        return false;
      }
    }
  );

  const emailResults = await Promise.allSettled(emailPromises);
  emailsSent = emailResults.filter(
    (r) => r.status === 'fulfilled' && r.value === true
  ).length;

  return { notified, emailsSent };
}

/**
 * Send a notification email for a specific event (e.g., KYC review complete).
 */
export async function sendNotificationEmail(
  to: string,
  fullName: string,
  subject: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await resend.emails.send({
      from: `SecureControl <${FROM_EMAIL}>`,
      to: [to],
      subject,
      html: buildNotificationEmailHtml(fullName, subject, message),
      text: `Hello ${fullName},\n\n${message}\n\n---\nSecureControl Banking System`,
    });
    if (error) {
      console.error('[NOTIFICATION EMAIL]', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('[NOTIFICATION EMAIL] Exception:', err);
    return { success: false, error: 'Failed to send notification email' };
  }
}

function buildNotificationEmailHtml(name: string, title: string, body: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; padding: 40px 20px;">
      <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: #1a1a2e; padding: 10px; border-radius: 10px; margin-bottom: 12px;">
            <span style="color: white; font-size: 20px;">&#128276;</span>
          </div>
          <h2 style="margin: 0; color: #1a1a2e; font-size: 20px;">${title}</h2>
        </div>

        <p style="color: #27272a; font-size: 15px;">Hello <strong>${name}</strong>,</p>
        
        <p style="color: #3f3f46; font-size: 14px; line-height: 1.7;">
          ${body}
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/login" 
             style="display: inline-block; background: #1a1a2e; color: white; text-decoration: none; padding: 10px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">
            Open SecureControl
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 28px 0;">
        <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">
          This is an automated notification from SecureControl Banking System.
        </p>
      </div>
    </body>
    </html>
  `;
}

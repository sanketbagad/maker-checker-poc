/**
 * Seed SuperAdmin User
 *
 * This script creates (or promotes) a superadmin user using the Supabase Admin API.
 * It handles both cases:
 *   1. User doesn't exist → creates auth user + profile with role 'superadmin'
 *   2. User already exists → updates profile.role and auth metadata to 'superadmin'
 *
 * Usage:
 *   npx tsx scripts/seed-superadmin.ts
 *
 * Required env vars (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from .env.local and .env (Next.js convention)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables.');
  console.error('   Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

// --- Configuration ---
const SUPERADMIN_EMAIL = 'sanketbagad486@gmail.com';
const SUPERADMIN_NAME = 'Sanket Bagad';
const SUPERADMIN_PASSWORD = 'SuperAdmin@2026'; // Change after first login!
// ---------------------

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seedSuperAdmin() {
  console.log('🔧 SecureControl — SuperAdmin Seeder\n');
  console.log(`   Email: ${SUPERADMIN_EMAIL}`);
  console.log(`   Name:  ${SUPERADMIN_NAME}\n`);

  // Step 1: Check if user already exists in auth
  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('❌ Failed to list users:', listError.message);
    process.exit(1);
  }

  const existingUser = existingUsers.users.find(
    (u) => u.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase()
  );

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
    console.log(`✅ User already exists in auth (id: ${userId})`);

    // Update auth metadata to superadmin
    const { error: updateAuthError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...existingUser.user_metadata,
        role: 'superadmin',
        full_name: SUPERADMIN_NAME,
      },
    });

    if (updateAuthError) {
      console.error('❌ Failed to update auth metadata:', updateAuthError.message);
      process.exit(1);
    }
    console.log('✅ Auth user_metadata.role updated to "superadmin"');
  } else {
    // Create new auth user
    console.log('📝 Creating new auth user...');
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: SUPERADMIN_EMAIL,
      password: SUPERADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: SUPERADMIN_NAME,
        role: 'superadmin',
      },
    });

    if (createError) {
      console.error('❌ Failed to create user:', createError.message);
      process.exit(1);
    }

    userId = newUser.user.id;
    console.log(`✅ Auth user created (id: ${userId})`);
  }

  // Step 2: Upsert profile with superadmin role
  // The trigger may have already created the profile, so we update it
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .single();

  if (existingProfile) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        role: 'superadmin',
        full_name: SUPERADMIN_NAME,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Failed to update profile:', updateError.message);
      process.exit(1);
    }
    console.log(`✅ Profile updated: role "${existingProfile.role}" → "superadmin"`);
  } else {
    const { error: insertError } = await supabase.from('profiles').insert({
      id: userId,
      email: SUPERADMIN_EMAIL,
      full_name: SUPERADMIN_NAME,
      role: 'superadmin',
    });

    if (insertError) {
      console.error('❌ Failed to insert profile:', insertError.message);
      process.exit(1);
    }
    console.log('✅ Profile created with role "superadmin"');
  }

  // Step 3: Create audit log entry
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'SUPERADMIN_SEEDED',
    entity_type: 'profile',
    entity_id: userId,
    new_values: {
      email: SUPERADMIN_EMAIL,
      full_name: SUPERADMIN_NAME,
      role: 'superadmin',
      seeded_at: new Date().toISOString(),
    },
  });

  console.log('\n🎉 SuperAdmin setup complete!\n');
  console.log('   Login credentials:');
  console.log(`   Email:    ${SUPERADMIN_EMAIL}`);
  if (!existingUser) {
    // Send credentials via email using Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@securecontrol.dev';

    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      try {
        await resend.emails.send({
          from: `SecureControl <${fromEmail}>`,
          to: [SUPERADMIN_EMAIL],
          subject: 'Welcome to SecureControl — Your SuperAdmin Account',
          html: `
            <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
              <h1 style="color: #1a1a2e;">Welcome to SecureControl</h1>
              <p>Hello <strong>${SUPERADMIN_NAME}</strong>,</p>
              <p>Your SuperAdmin account has been created. Use the credentials below to log in:</p>
              <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 4px 0;"><strong>Email:</strong> ${SUPERADMIN_EMAIL}</p>
                <p style="margin: 4px 0;"><strong>Password:</strong> <code>${SUPERADMIN_PASSWORD}</code></p>
                <p style="margin: 4px 0;"><strong>Role:</strong> SuperAdmin</p>
              </div>
              <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/login">Log In to SecureControl</a></p>
              <p style="color: #856404; background: #fef3cd; padding: 12px; border-radius: 6px;">
                ⚠️ Please change your password after first login. Do not share these credentials.
              </p>
            </div>
          `,
          text: `Welcome to SecureControl\n\nEmail: ${SUPERADMIN_EMAIL}\nPassword: ${SUPERADMIN_PASSWORD}\nRole: SuperAdmin\n\nPlease change your password after first login.`,
        });
        console.log('   Password sent to email ✉️');
      } catch (emailErr) {
        console.error('   ⚠️  Failed to send email:', emailErr);
        console.log(`   Password: ${SUPERADMIN_PASSWORD}`);
      }
    } else {
      console.log(`   Password: ${SUPERADMIN_PASSWORD}`);
      console.log('   ⚠️  No RESEND_API_KEY set — could not email credentials.');
    }
    console.log('\n   ⚠️  Change this password after first login!');
  } else {
    console.log('   Password: (existing — unchanged)');
  }
  console.log(`\n   Dashboard: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/admin`);
}

seedSuperAdmin().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});

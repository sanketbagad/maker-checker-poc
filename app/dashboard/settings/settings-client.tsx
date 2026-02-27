'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Key,
  ShieldCheck,
  Mail,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Settings,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SettingsClientProps {
  profile: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    mfaEnabled: boolean;
  };
}

type AlertType = 'success' | 'error';

function Alert({
  type,
  message,
}: {
  type: AlertType;
  message: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
        type === 'success'
          ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300'
          : 'border-destructive/20 bg-destructive/10 text-destructive'
      }`}
    >
      {type === 'success' ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0" />
      )}
      {message}
    </div>
  );
}

// ─── Change Password Section ───────────────────────────────────────────────
function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: AlertType; message: string } | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const isValid =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    setIsLoading(true);
    setAlert(null);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAlert({ type: 'error', message: data.error || 'Failed to change password' });
      } else {
        setAlert({ type: 'success', message: 'Password updated successfully' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setAlert({ type: 'error', message: 'Something went wrong' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Key className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Change Password</CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          {alert && <Alert type={alert.type} message={alert.message} />}

          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowCurrent(!showCurrent)}
                tabIndex={-1}
              >
                {showCurrent ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowNew(!showNew)}
                tabIndex={-1}
              >
                {showNew ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {newPassword.length > 0 && newPassword.length < 8 && (
              <p className="text-xs text-destructive">
                Password must be at least 8 characters
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              disabled={isLoading}
            />
            {confirmPassword.length > 0 && confirmPassword !== newPassword && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>

          <Button type="submit" disabled={!isValid || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Password'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── MFA Section ───────────────────────────────────────────────────────────
type MFAStep = 'idle' | 'sending-otp' | 'otp-sent' | 'verifying';

function MFASection({
  initialEnabled,
  email,
}: {
  initialEnabled: boolean;
  email: string;
}) {
  const router = useRouter();
  const [mfaEnabled, setMfaEnabled] = useState(initialEnabled);
  const [step, setStep] = useState<MFAStep>('idle');
  const [otp, setOtp] = useState('');
  const [alert, setAlert] = useState<{ type: AlertType; message: string } | null>(null);
  const [isDisabling, setIsDisabling] = useState(false);

  const sendOtp = useCallback(async () => {
    setStep('sending-otp');
    setAlert(null);
    setOtp('');

    try {
      const res = await fetch('/api/auth/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send-otp' }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAlert({ type: 'error', message: data.error || 'Failed to send OTP' });
        setStep('idle');
        return;
      }

      setStep('otp-sent');
      setAlert({
        type: 'success',
        message: `Verification code sent to ${email}`,
      });
    } catch {
      setAlert({ type: 'error', message: 'Something went wrong' });
      setStep('idle');
    }
  }, [email]);

  const verifyOtp = useCallback(async () => {
    if (otp.length !== 6) return;

    setStep('verifying');
    setAlert(null);

    try {
      const res = await fetch('/api/auth/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-otp', otp }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAlert({ type: 'error', message: data.error || 'Verification failed' });
        setStep('otp-sent');
        return;
      }

      setMfaEnabled(true);
      setStep('idle');
      setOtp('');
      setAlert({
        type: 'success',
        message: 'MFA has been enabled! You will now receive an email code on every login.',
      });
      router.refresh();
    } catch {
      setAlert({ type: 'error', message: 'Something went wrong' });
      setStep('otp-sent');
    }
  }, [otp, router]);

  async function handleDisable() {
    setIsDisabling(true);
    setAlert(null);

    try {
      const res = await fetch('/api/auth/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable' }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAlert({ type: 'error', message: data.error || 'Failed to disable MFA' });
      } else {
        setMfaEnabled(false);
        setAlert({ type: 'success', message: 'MFA has been disabled' });
        router.refresh();
      }
    } catch {
      setAlert({ type: 'error', message: 'Something went wrong' });
    } finally {
      setIsDisabling(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">
                Multi-Factor Authentication (MFA)
              </CardTitle>
              <CardDescription>
                Add an extra layer of security with email-based verification
              </CardDescription>
            </div>
          </div>
          <Badge
            variant={mfaEnabled ? 'default' : 'secondary'}
            className={
              mfaEnabled
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : ''
            }
          >
            {mfaEnabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {alert && <Alert type={alert.type} message={alert.message} />}

        {/* ── MFA description ────────── */}
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Email-based MFA</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When enabled, you&apos;ll receive a 6-digit verification code at{' '}
                <span className="font-medium text-foreground">{email}</span> every
                time you sign in. This protects your account even if your password
                is compromised.
              </p>
            </div>
          </div>
        </div>

        {/* ── Enable flow ────────── */}
        {!mfaEnabled && step === 'idle' && (
          <Button onClick={sendOtp} className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Enable MFA
          </Button>
        )}

        {!mfaEnabled && step === 'sending-otp' && (
          <Button disabled className="gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending verification code...
          </Button>
        )}

        {!mfaEnabled && (step === 'otp-sent' || step === 'verifying') && (
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label>Enter the 6-digit code sent to your email</Label>
              <div className="flex items-center gap-3">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(value) => setOtp(value)}
                  onComplete={verifyOtp}
                  onKeyDown={(e) => { if (e.key === 'Enter' && otp.length === 6) verifyOtp(); }}
                  disabled={step === 'verifying'}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={verifyOtp}
                disabled={otp.length !== 6 || step === 'verifying'}
              >
                {step === 'verifying' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Enable'
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={sendOtp}
                disabled={step === 'verifying'}
                className="text-muted-foreground"
              >
                <Send className="mr-1.5 h-3.5 w-3.5" />
                Resend Code
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep('idle');
                  setOtp('');
                  setAlert(null);
                }}
                disabled={step === 'verifying'}
                className="text-muted-foreground"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ── Disable flow ────────── */}
        {mfaEnabled && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2" disabled={isDisabling}>
                {isDisabling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Disabling...
                  </>
                ) : (
                  'Disable MFA'
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disable Multi-Factor Authentication?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove the extra layer of security from your account.
                  Anyone with your password will be able to sign in without
                  additional verification.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Enabled</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDisable}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, Disable MFA
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Settings Page ─────────────────────────────────────────────────────────
export function SettingsClient({ profile }: SettingsClientProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your account security and preferences
        </p>
      </div>

      <Separator />

      {/* Account Info (read-only) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Account Information</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Name
              </p>
              <p className="text-sm font-medium">{profile.fullName}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Email
              </p>
              <p className="text-sm font-medium">{profile.email}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Role
              </p>
              <Badge variant="outline" className="capitalize">
                {profile.role}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <ChangePasswordSection />

      {/* MFA */}
      <MFASection initialEnabled={profile.mfaEnabled} email={profile.email} />
    </div>
  );
}

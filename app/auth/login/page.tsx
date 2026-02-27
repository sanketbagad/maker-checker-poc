'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn, completeSignIn } from '@/app/auth/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp';
import { Shield, Loader2, ArrowLeft, Send, ShieldCheck } from 'lucide-react';

type LoginStep = 'credentials' | 'mfa';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<LoginStep>('credentials');
  const [mfaOtp, setMfaOtp] = useState('');
  const [mfaInfo, setMfaInfo] = useState('');
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);
    
    const result = await signIn(formData);
    
    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    if (result?.mfa_required) {
      // User has MFA enabled — send challenge and switch to OTP step
      setMfaInfo('Sending MFA code to your email...');
      try {
        const challengeRes = await fetch('/api/auth/mfa/challenge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'send' }),
        });
        const challengeData = await challengeRes.json();

        if (!challengeRes.ok) {
          setError(challengeData.error || 'Failed to send MFA code');
          setIsLoading(false);
          return;
        }

        setStep('mfa');
        setMfaInfo('A verification code has been sent to your email');
        setIsLoading(false);
      } catch {
        setError('Failed to initiate MFA challenge');
        setIsLoading(false);
      }
      return;
    }

    // No MFA — signIn already redirected
  }

  const handleMfaVerify = useCallback(async () => {
    if (mfaOtp.length !== 6) return;

    setIsLoading(true);
    setError(null);

    // Step 1: Verify the OTP via API
    let verified = false;
    try {
      const res = await fetch('/api/auth/mfa/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', otp: mfaOtp }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid code');
        setIsLoading(false);
        return;
      }
      verified = true;
    } catch {
      setError('Failed to verify MFA code');
      setIsLoading(false);
      return;
    }

    // Step 2: Get redirect destination and navigate
    if (verified) {
      try {
        const result = await completeSignIn();
        if (result?.error) {
          setError(result.error);
          setIsLoading(false);
        } else if (result?.redirectTo) {
          router.push(result.redirectTo);
        }
      } catch {
        // Fallback — navigate to dashboard root
        router.push('/dashboard/maker');
      }
    }
  }, [mfaOtp]);

  const handleResendMfa = useCallback(async () => {
    setError(null);
    setMfaInfo('Resending code...');
    setMfaOtp('');

    try {
      const res = await fetch('/api/auth/mfa/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to resend');
      } else {
        setMfaInfo('New code sent to your email');
      }
    } catch {
      setError('Failed to resend code');
    }
  }, []);

  // ─── MFA Step ──────────────────────────────────────────────────────
  if (step === 'mfa') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="p-2 rounded-lg bg-primary">
              <Shield className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">SecureControl</h1>
              <p className="text-sm text-muted-foreground">Banking Control System</p>
            </div>
          </div>

          <Card className="border-border">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">MFA Verification</CardTitle>
              </div>
              <CardDescription>
                Enter the 6-digit code sent to your email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  {error}
                </div>
              )}
              {mfaInfo && !error && (
                <div className="p-3 text-sm text-primary bg-primary/5 border border-primary/20 rounded-md">
                  {mfaInfo}
                </div>
              )}
              <div className="flex justify-center py-2">
                <InputOTP
                  maxLength={6}
                  value={mfaOtp}
                  onChange={(value) => setMfaOtp(value)}
                  onComplete={handleMfaVerify}
                  onKeyDown={(e) => { if (e.key === 'Enter' && mfaOtp.length === 6) handleMfaVerify(); }}
                  disabled={isLoading}
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
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button
                className="w-full"
                disabled={mfaOtp.length !== 6 || isLoading}
                onClick={handleMfaVerify}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Sign In'
                )}
              </Button>
              <div className="flex items-center justify-between w-full">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => {
                    setStep('credentials');
                    setMfaOtp('');
                    setError(null);
                    setMfaInfo('');
                  }}
                  disabled={isLoading}
                >
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                  Back
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={handleResendMfa}
                  disabled={isLoading}
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  Resend Code
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Credentials Step ──────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-primary">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">SecureControl</h1>
            <p className="text-sm text-muted-foreground">Banking Control System</p>
          </div>
        </div>
        
        <Card className="border-border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription>
              Enter your credentials to access the control system
            </CardDescription>
          </CardHeader>
          <form action={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                {"Don't have an account?"}{' '}
                <Link href="/auth/sign-up" className="text-primary hover:underline">
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
        
        <p className="text-xs text-center text-muted-foreground mt-6">
          Protected by enterprise-grade security
        </p>
      </div>
    </div>
  );
}

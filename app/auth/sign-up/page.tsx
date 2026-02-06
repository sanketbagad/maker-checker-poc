'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { Shield, Loader2, Mail, ArrowLeft, CheckCircle2, User } from 'lucide-react';

type Step = 'details' | 'otp' | 'success';

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('details');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (step === 'otp') {
      setCanResend(true);
    }
  }, [countdown, step]);

  async function handleSendOTP(e?: React.FormEvent) {
    e?.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName, lastName, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send OTP');
        setIsLoading(false);
        return;
      }

      // In development, show the OTP for testing
      if (data.devOtp) {
        setDevOtp(data.devOtp);
      }

      setStep('otp');
      setCountdown(data.expiresIn || 300);
      setCanResend(false);
    } catch {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyOTP() {
    if (otp.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to verify OTP');
        setIsLoading(false);
        return;
      }

      setStep('success');
      
      // Store user data in sessionStorage for onboarding to pick up
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('registration_data', JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email: email,
        }));
      }
      
      // Redirect after short delay
      setTimeout(() => {
        router.push(data.redirectTo || '/auth/onboarding');
      }, 1500);
    } catch {
      setError('Failed to verify OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendOTP() {
    setOtp('');
    setCanResend(false);
    await handleSendOTP();
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

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
          {step === 'details' && (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-xl">Create a Maker account</CardTitle>
                <CardDescription>
                  Register to create and submit transactions
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSendOTP}>
                <CardContent className="space-y-6">
                  {error && (
                    <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                      {error}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Smith"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending OTP...
                      </>
                    ) : (
                      <>
                        <User className="mr-2 h-4 w-4" />
                        Register Here 
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-center text-muted-foreground">
                    Already have an account?{' '}
                    <Link href="/auth/login" className="text-primary hover:underline">
                      Sign in
                    </Link>
                  </p>
                </CardFooter>
              </form>
            </>
          )}

          {step === 'otp' && (
            <>
              <CardHeader className="space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-fit -ml-2 mb-2"
                  onClick={() => {
                    setStep('details');
                    setOtp('');
                    setError(null);
                  }}
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
                <CardTitle className="text-xl">Verify your email</CardTitle>
                <CardDescription>
                  We&apos;ve sent a 6-digit code to <strong>{email}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {error && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                    {error}
                  </div>
                )}

                {/* Dev mode OTP display */}
                {devOtp && (
                  <div className="p-3 text-sm bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                    <p className="font-medium text-yellow-600 dark:text-yellow-400">Development Mode</p>
                    <p className="text-muted-foreground">Your OTP is: <span className="font-mono font-bold">{devOtp}</span></p>
                  </div>
                )}
                
                <div className="flex flex-col items-center gap-4">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
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

                  {countdown > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Code expires in <span className="font-medium">{formatTime(countdown)}</span>
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button
                  type="button"
                  className="w-full"
                  disabled={isLoading || otp.length !== 6}
                  onClick={handleVerifyOTP}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Create Account'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  disabled={!canResend || isLoading}
                  onClick={handleResendOTP}
                >
                  {canResend ? 'Resend OTP' : `Resend in ${formatTime(countdown)}`}
                </Button>
              </CardFooter>
            </>
          )}

          {step === 'success' && (
            <>
              <CardHeader className="space-y-1">
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-full bg-green-500/10">
                    <CheckCircle2 className="h-12 w-12 text-green-500" />
                  </div>
                </div>
                <CardTitle className="text-xl text-center">Account Created!</CardTitle>
                <CardDescription className="text-center">
                  Your account has been verified successfully. Redirecting to onboarding...
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </CardContent>
            </>
          )}
        </Card>
        
        <p className="text-xs text-center text-muted-foreground mt-6">
          By signing up, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}

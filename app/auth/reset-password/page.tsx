'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Shield, Loader2, Eye, EyeOff, CheckCircle2, KeyRound } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  // Check that we have a valid recovery session
  useEffect(() => {
    async function checkSession() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      setIsValidSession(!!session);
    }
    checkSession();
  }, []);

  const isValid = password.length >= 8 && password === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message || 'Failed to reset password');
      } else {
        setSuccess(true);
        // Sign out so user logs in fresh with new password
        await supabase.auth.signOut();
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
          {success ? (
            <>
              <CardHeader className="space-y-1 text-center">
                <div className="flex justify-center mb-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <CardTitle className="text-xl">Password reset successful</CardTitle>
                <CardDescription>
                  Your password has been updated. You can now sign in with your
                  new password.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => router.push('/auth/login')}
                >
                  Go to Sign In
                </Button>
              </CardFooter>
            </>
          ) : isValidSession === false ? (
            <>
              <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-xl">Invalid or expired link</CardTitle>
                <CardDescription>
                  This password reset link is invalid or has expired. Please
                  request a new one.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => router.push('/auth/forgot-password')}
                >
                  Request new reset link
                </Button>
              </CardFooter>
            </>
          ) : isValidSession === null ? (
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          ) : (
            <>
              <CardHeader className="space-y-1">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl">Reset your password</CardTitle>
                </div>
                <CardDescription>
                  Enter a new password for your account
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  {error && (
                    <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="At least 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        autoFocus
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {password.length > 0 && password.length < 8 && (
                      <p className="text-xs text-destructive">
                        Password must be at least 8 characters
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                    {confirmPassword.length > 0 &&
                      confirmPassword !== password && (
                        <p className="text-xs text-destructive">
                          Passwords do not match
                        </p>
                      )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!isValid || isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      'Reset Password'
                    )}
                  </Button>
                </CardFooter>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

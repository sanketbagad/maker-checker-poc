'use client';

import { useState } from 'react';
import Link from 'next/link';
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
import { Shield, Loader2, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send reset email');
      } else {
        setSent(true);
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
          {sent ? (
            <>
              <CardHeader className="space-y-1 text-center">
                <div className="flex justify-center mb-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <CardTitle className="text-xl">Check your email</CardTitle>
                <CardDescription>
                  We&apos;ve sent a password reset link to{' '}
                  <span className="font-medium text-foreground">{email}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  Click the link in the email to reset your password. If you
                  don&apos;t see it, check your spam folder.
                </p>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSent(false);
                    setEmail('');
                  }}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Send again
                </Button>
                <Link
                  href="/auth/login"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to sign in
                </Link>
              </CardFooter>
            </>
          ) : (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-xl">Forgot password?</CardTitle>
                <CardDescription>
                  Enter your email address and we&apos;ll send you a link to
                  reset your password
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
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!email || isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send reset link'
                    )}
                  </Button>
                  <Link
                    href="/auth/login"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to sign in
                  </Link>
                </CardFooter>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

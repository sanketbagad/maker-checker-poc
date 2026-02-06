import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle2, ArrowRight } from 'lucide-react';

export default function SignUpSuccessPage() {
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
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto p-3 rounded-full bg-green-500/10 w-fit mb-2">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle className="text-xl">Account Created Successfully!</CardTitle>
            <CardDescription>
              Your account has been verified and created
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              You can now sign in and complete your KYC verification to start using the banking control system.
            </p>
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-xs font-medium">Next Steps:</p>
              <ol className="text-xs text-muted-foreground text-left list-decimal list-inside space-y-1">
                <li>Sign in to your account</li>
                <li>Complete KYC verification</li>
                <li>Wait for approval from checker</li>
                <li>Start creating transactions</li>
              </ol>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/auth/login">
                Continue to Sign In
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

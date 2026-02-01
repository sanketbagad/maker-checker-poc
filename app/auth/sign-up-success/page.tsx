import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Mail, ArrowRight } from 'lucide-react';

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
            <div className="mx-auto p-3 rounded-full bg-success/10 w-fit mb-2">
              <Mail className="h-8 w-8 text-success" />
            </div>
            <CardTitle className="text-xl">Check your email</CardTitle>
            <CardDescription>
              {"We've sent you a confirmation link to verify your account"}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Click the link in your email to activate your account. Once verified, you can sign in and start using the system.
            </p>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                {"Didn't receive the email? Check your spam folder or request a new confirmation link."}
              </p>
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

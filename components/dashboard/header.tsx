'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/app/auth/actions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Bell, LogOut, Menu, User, Settings } from 'lucide-react';

interface HeaderProps {
  profile: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  };
}

export function DashboardHeader({ profile }: HeaderProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    await signOut();
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      <Button variant="ghost" size="icon" className="lg:hidden">
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      <div className="flex-1" />

      <Badge variant="outline" className="hidden sm:flex capitalize">
        {profile.role}
      </Badge>

      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5" />
        <span className="sr-only">Notifications</span>
        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 ring-2 ring-border hover:ring-primary/50 transition-all">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-semibold text-sm shadow-sm">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex items-center gap-3 py-1">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-semibold text-sm">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col space-y-1 min-w-0">
                <p className="text-sm font-medium leading-none truncate">{profile.full_name}</p>
                <p className="text-xs leading-none text-muted-foreground truncate">
                  {profile.email}
                </p>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

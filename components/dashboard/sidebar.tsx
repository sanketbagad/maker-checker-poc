'use client';

import React from "react"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { USER_ROLES } from '@/lib/constants';
import type { Profile } from '@/lib/types';
import {
  Shield,
  LayoutDashboard,
  FileText,
  CheckSquare,
  AlertTriangle,
  History,
  Settings,
  Ban,
  UserCheck,
  UserCog,
  Users,
} from 'lucide-react';

// Navigation configuration
const NAV_ICONS = {
  LayoutDashboard,
  FileText,
  CheckSquare,
  AlertTriangle,
  History,
  Settings,
  Ban,
  UserCheck,
  UserCog,
  Users,
} as const;

const MAKER_NAV_ITEMS = [
  { href: '/dashboard/maker', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/dashboard/maker/transactions', label: 'My Transactions', icon: 'FileText' },
  { href: '/dashboard/maker/new', label: 'New Transaction', icon: 'CheckSquare' },
  { href: '/dashboard/maker/kyc-update', label: 'KYC Update', icon: 'UserCog' },
] as const;

const CHECKER_NAV_ITEMS = [
  { href: '/dashboard/checker', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/dashboard/checker/pending', label: 'Pending Review', icon: 'FileText' },
  { href: '/dashboard/checker/kyc', label: 'KYC Review', icon: 'UserCheck' },
  { href: '/dashboard/checker/flagged', label: 'Flagged', icon: 'AlertTriangle' },
  { href: '/dashboard/checker/blacklist', label: 'Blacklist', icon: 'Ban' },
] as const;

const COMMON_NAV_ITEMS = [
  { href: '/dashboard/audit', label: 'Audit Logs', icon: 'History' },
  { href: '/dashboard/policy', label: 'Policy Rules', icon: 'Settings' },
  { href: '/dashboard/settings', label: 'Settings', icon: 'UserCog' },
] as const;

const SUPERADMIN_NAV_ITEMS = [
  { href: '/dashboard/admin', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/dashboard/admin/users', label: 'User Management', icon: 'Users' },
  { href: '/dashboard/admin/transactions', label: 'All Transactions', icon: 'FileText' },
  { href: '/dashboard/admin/kyc', label: 'All KYC', icon: 'UserCheck' },
  { href: '/dashboard/admin/blacklist', label: 'Blacklist', icon: 'Ban' },
] as const;

interface SidebarProps {
  profile: Pick<Profile, 'id' | 'email' | 'full_name' | 'role'>;
}

interface NavItemProps {
  href: string;
  label: string;
  icon: keyof typeof NAV_ICONS;
  isActive: boolean;
}

function NavItem({ href, label, icon, isActive }: NavItemProps) {
  const Icon = NAV_ICONS[icon];

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="px-3 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50 mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

function UserInfo({ profile }: { profile: SidebarProps['profile'] }) {
  return (
    <div className="border-t border-sidebar-border p-4">
      <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/30 px-3 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sidebar-primary to-sidebar-primary/70 text-sidebar-primary-foreground font-semibold text-sm ring-2 ring-sidebar-border shadow-sm">
          {profile.full_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-sidebar-foreground truncate">
            {profile.full_name}
          </p>
          <p className="text-xs text-sidebar-foreground/60 truncate">{profile.email}</p>
        </div>
      </div>
    </div>
  );
}

export function DashboardSidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const isSuperAdmin = profile.role === USER_ROLES.SUPERADMIN;
  const isChecker = profile.role === USER_ROLES.CHECKER;
  const navItems = isSuperAdmin
    ? SUPERADMIN_NAV_ITEMS
    : isChecker
      ? CHECKER_NAV_ITEMS
      : MAKER_NAV_ITEMS;
  const menuTitle = isSuperAdmin
    ? 'SuperAdmin Menu'
    : isChecker
      ? 'Checker Menu'
      : 'Maker Menu';

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-72 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="p-1.5 rounded-lg bg-sidebar-primary">
          <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-sidebar-foreground">SecureControl</h1>
          <p className="text-xs text-sidebar-foreground/60">Banking Control System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 p-4">
        <NavSection title={menuTitle}>
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              isActive={pathname === item.href}
            />
          ))}
        </NavSection>

        <div className="border-t border-sidebar-border" />

        <NavSection title="System">
          {COMMON_NAV_ITEMS.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              isActive={pathname === item.href}
            />
          ))}
        </NavSection>
      </nav>

      {/* User Info */}
      <UserInfo profile={profile} />
    </aside>
  );
}

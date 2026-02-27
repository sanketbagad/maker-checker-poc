'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, CheckCheck, FileText, Shield, User, UserCheck, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useNotifications, type Notification } from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';

interface NotificationDropdownProps {
  userId: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  kyc: <UserCheck className="h-4 w-4 text-blue-500" />,
  transaction: <FileText className="h-4 w-4 text-green-500" />,
  policy: <Shield className="h-4 w-4 text-amber-500" />,
  user: <User className="h-4 w-4 text-purple-500" />,
  system: <AlertCircle className="h-4 w-4 text-red-500" />,
  info: <Info className="h-4 w-4 text-muted-foreground" />,
};

function getEntityLink(notification: Notification): string | null {
  if (!notification.entity_type || !notification.entity_id) return null;

  switch (notification.entity_type) {
    case 'kyc_application':
      return '/dashboard/checker/kyc';
    case 'transaction':
      return `/dashboard/transaction/${notification.entity_id}`;
    default:
      return null;
  }
}

export function NotificationDropdown({ userId }: NotificationDropdownProps) {
  const router = useRouter();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    useNotifications(userId);

  // Request browser notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (window.Notification.permission === 'default') {
        window.Notification.requestPermission();
      }
    }
  }, []);

  function handleClickNotification(notification: Notification) {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    const link = getEntityLink(notification);
    if (link) {
      router.push(link);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification List */}
        <ScrollArea className="max-h-100">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-30" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div>
              {notifications.map((notification, index) => (
                <div key={notification.id}>
                  <button
                    className={cn(
                      'w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-start gap-3',
                      !notification.is_read && 'bg-primary/5'
                    )}
                    onClick={() => handleClickNotification(notification)}
                  >
                    <div className="mt-0.5 shrink-0">
                      {TYPE_ICONS[notification.type] || TYPE_ICONS.info}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            'text-sm leading-tight',
                            !notification.is_read ? 'font-semibold' : 'font-medium text-muted-foreground'
                          )}
                        >
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <span className="mt-1 shrink-0 h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </button>
                  {index < notifications.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t px-4 py-2">
            <p className="text-[11px] text-center text-muted-foreground">
              Showing last {notifications.length} notifications
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

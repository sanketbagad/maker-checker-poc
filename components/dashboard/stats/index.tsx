import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

// Stats Grid Container
interface StatsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function StatsGrid({ children, columns = 4, className }: StatsGridProps) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {children}
    </div>
  );
}

// Stats Card Component
interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'warning' | 'success' | 'destructive' | 'info';
  className?: string;
}

const variantStyles = {
  default: '',
  warning: 'border-warning/20',
  success: 'border-success/20',
  destructive: 'border-destructive/20',
  info: 'border-primary/20',
};

const iconVariantStyles = {
  default: 'text-muted-foreground',
  warning: 'text-warning',
  success: 'text-success',
  destructive: 'text-destructive',
  info: 'text-primary',
};

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}: StatsCardProps) {
  return (
    <Card className={cn(variantStyles[variant], className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={cn('h-4 w-4', iconVariantStyles[variant])} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <p className="text-xs text-muted-foreground mt-1">
            {trend && (
              <span
                className={cn(
                  'mr-1 font-medium',
                  trend.isPositive ? 'text-success' : 'text-destructive'
                )}
              >
                {trend.isPositive ? '+' : ''}
                {trend.value}%
              </span>
            )}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Compound Stats Group - Preset configurations
interface StatsGroupProps {
  stats: Array<{
    title: string;
    value: string | number;
    description?: string;
    icon: LucideIcon;
    variant?: StatsCardProps['variant'];
    trend?: StatsCardProps['trend'];
  }>;
  columns?: StatsGridProps['columns'];
  className?: string;
}

export function StatsGroup({ stats, columns = 4, className }: StatsGroupProps) {
  return (
    <StatsGrid columns={columns} className={className}>
      {stats.map((stat, index) => (
        <StatsCard
          key={`${stat.title}-${index}`}
          title={stat.title}
          value={stat.value}
          description={stat.description}
          icon={stat.icon}
          variant={stat.variant}
          trend={stat.trend}
        />
      ))}
    </StatsGrid>
  );
}

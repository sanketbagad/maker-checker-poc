'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { DollarSign, Clock, Copy, Ban, Shield, AlertTriangle } from 'lucide-react';
import { TABLES, POLICY_RULE_TYPES, AUDIT_ACTIONS } from '@/lib/constants';
import { formatCurrency } from '@/lib/formatters';
import type { PolicyRule } from '@/lib/types';

// Types
interface PolicyRulesManagerProps {
  rules: PolicyRule[];
  userId: string;
}

// Constants
const RULE_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  [POLICY_RULE_TYPES.AMOUNT_THRESHOLD]: DollarSign,
  [POLICY_RULE_TYPES.TIME_BASED]: Clock,
  [POLICY_RULE_TYPES.DUPLICATE_DETECTION]: Copy,
  [POLICY_RULE_TYPES.BLACKLIST_CHECK]: Ban,
};

const RULE_TYPE_LABELS: Record<string, string> = {
  [POLICY_RULE_TYPES.AMOUNT_THRESHOLD]: 'Amount Threshold',
  [POLICY_RULE_TYPES.TIME_BASED]: 'Time-Based',
  [POLICY_RULE_TYPES.DUPLICATE_DETECTION]: 'Duplicate Detection',
  [POLICY_RULE_TYPES.BLACKLIST_CHECK]: 'Blacklist Check',
};

// Helpers
function formatThreshold(value: number | null | undefined, ruleType: string): string {
  if (value === null || value === undefined) return 'N/A';
  if (ruleType === POLICY_RULE_TYPES.AMOUNT_THRESHOLD) {
    return formatCurrency(value);
  }
  return value.toString();
}

// Subcomponents
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="p-3 rounded-full bg-muted mb-4">
        <Shield className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">No rules in this category</p>
    </div>
  );
}

function RuleCard({
  rule,
  isLoading,
  onToggle,
}: {
  rule: PolicyRule;
  isLoading: boolean;
  onToggle: (rule: PolicyRule) => void;
}) {
  const Icon = RULE_TYPE_ICONS[rule.rule_type] || AlertTriangle;

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
      <div className="p-2 rounded-md bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-sm">{rule.rule_name}</h4>
          <Badge variant="outline" className="text-xs">
            {RULE_TYPE_LABELS[rule.rule_type] || rule.rule_type}
          </Badge>
        </div>
        {rule.description && (
          <p className="text-sm text-muted-foreground mb-2">{rule.description}</p>
        )}
        {rule.threshold_value != null && (
          <p className="text-xs text-muted-foreground">
            Threshold:{' '}
            <span className="font-medium">
              {formatThreshold(rule.threshold_value, rule.rule_type)}
            </span>
          </p>
        )}
      </div>
      <Switch
        checked={rule.is_active}
        onCheckedChange={() => onToggle(rule)}
        disabled={isLoading}
      />
    </div>
  );
}

// Main Component
export function PolicyRulesManager({ rules, userId }: PolicyRulesManagerProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function toggleRule(rule: PolicyRule) {
    setLoadingId(rule.id);
    const supabase = createClient();

    await supabase
      .from(TABLES.POLICY_RULES)
      .update({ is_active: !rule.is_active })
      .eq('id', rule.id);

    await supabase.from(TABLES.AUDIT_LOGS).insert({
      user_id: userId,
      action: AUDIT_ACTIONS.POLICY_UPDATED,
      entity_type: 'policy_rule',
      entity_id: rule.id,
      old_values: { is_active: rule.is_active },
      new_values: { is_active: !rule.is_active },
    });

    setLoadingId(null);
    router.refresh();
  }

  if (rules.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-3">
      {rules.map((rule) => (
        <RuleCard
          key={rule.id}
          rule={rule}
          isLoading={loadingId === rule.id}
          onToggle={toggleRule}
        />
      ))}
    </div>
  );
}

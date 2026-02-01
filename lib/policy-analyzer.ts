import { createClient } from '@/lib/supabase/server';
import type { Transaction, PolicyRule, PolicyViolation, SeverityLevel } from '@/lib/types';
import {
  TABLES,
  POLICY_RULE_TYPES,
  SEVERITY_LEVELS,
  SEVERITY_SCORES,
  BUSINESS_HOURS,
  DUPLICATE_DETECTION_WINDOW_HOURS,
} from '@/lib/constants';
import { formatCurrency } from '@/lib/formatters';

// Types
interface AnalysisResult {
  violations: Omit<PolicyViolation, 'id' | 'created_at'>[];
  riskScore: number;
  recommendations: string[];
}

type ViolationData = Omit<PolicyViolation, 'id' | 'created_at'>;

// Main Analysis Function
export async function analyzeTransaction(transaction: Transaction): Promise<AnalysisResult> {
  const supabase = await createClient();
  const violations: ViolationData[] = [];
  const recommendations: string[] = [];
  let riskScore = 0;

  // Fetch active policy rules
  const { data: rules } = await supabase
    .from(TABLES.POLICY_RULES)
    .select('*')
    .eq('is_active', true);

  if (!rules) return { violations, riskScore, recommendations };

  // Check each rule
  for (const rule of rules) {
    const violation = await checkRule(rule, transaction, supabase);
    if (violation) {
      violations.push(violation);
      riskScore += SEVERITY_SCORES[violation.severity] || 0;
    }
  }

  // Generate recommendations based on violations
  if (violations.length > 0) {
    recommendations.push('Review transaction details carefully before approval');

    const hasCriticalOrHigh = violations.some(
      (v) => v.severity === SEVERITY_LEVELS.CRITICAL || v.severity === SEVERITY_LEVELS.HIGH
    );
    if (hasCriticalOrHigh) {
      recommendations.push('Escalate to senior management for approval');
    }

    const hasBlacklistViolation = violations.some((v) =>
      v.violation_details.includes('blacklist')
    );
    if (hasBlacklistViolation) {
      recommendations.push('Verify beneficiary identity before processing');
    }
  }

  return {
    violations,
    riskScore: Math.min(riskScore, 100),
    recommendations,
  };
}

// Rule Checking Functions
async function checkRule(
  rule: PolicyRule,
  transaction: Transaction,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<ViolationData | null> {
  switch (rule.rule_type) {
    case POLICY_RULE_TYPES.AMOUNT_THRESHOLD:
      return checkAmountThreshold(rule, transaction);
    case POLICY_RULE_TYPES.DUPLICATE_DETECTION:
      return await checkDuplicateTransaction(rule, transaction, supabase);
    case POLICY_RULE_TYPES.BLACKLIST_CHECK:
      return await checkBlacklist(rule, transaction, supabase);
    case POLICY_RULE_TYPES.TIME_BASED:
      return checkTimeBased(rule, transaction);
    default:
      return null;
  }
}

function checkAmountThreshold(rule: PolicyRule, transaction: Transaction): ViolationData | null {
  if (rule.threshold_value && transaction.amount > rule.threshold_value) {
    const severity = getSeverityByAmount(transaction.amount, rule.threshold_value);
    return {
      transaction_id: transaction.id,
      rule_id: rule.id,
      violation_details: `Transaction amount (${formatCurrency(transaction.amount)}) exceeds threshold of ${formatCurrency(rule.threshold_value)}`,
      severity,
    };
  }
  return null;
}

async function checkDuplicateTransaction(
  rule: PolicyRule,
  transaction: Transaction,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<ViolationData | null> {
  const windowMs = DUPLICATE_DETECTION_WINDOW_HOURS * 60 * 60 * 1000;
  const cutoffTime = new Date(Date.now() - windowMs).toISOString();

  const { data: similarTransactions } = await supabase
    .from(TABLES.TRANSACTIONS)
    .select('id, amount, destination_account')
    .eq('destination_account', transaction.destination_account)
    .eq('amount', transaction.amount)
    .neq('id', transaction.id)
    .gte('created_at', cutoffTime);

  if (similarTransactions && similarTransactions.length > 0) {
    return {
      transaction_id: transaction.id,
      rule_id: rule.id,
      violation_details: `Potential duplicate: ${similarTransactions.length} similar transaction(s) found in the last ${DUPLICATE_DETECTION_WINDOW_HOURS} hours to the same account with the same amount`,
      severity: similarTransactions.length > 2 ? SEVERITY_LEVELS.HIGH : SEVERITY_LEVELS.MEDIUM,
    };
  }
  return null;
}

async function checkBlacklist(
  rule: PolicyRule,
  transaction: Transaction,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<ViolationData | null> {
  const { data: blacklistMatch } = await supabase
    .from(TABLES.BLACKLIST)
    .select('*')
    .eq('is_active', true)
    .or(
      `account_number.eq.${transaction.destination_account},account_number.eq.${transaction.source_account}`
    )
    .limit(1)
    .single();

  if (blacklistMatch) {
    return {
      transaction_id: transaction.id,
      rule_id: rule.id,
      violation_details: `Account ${blacklistMatch.account_number} is on the blacklist. Entity: ${blacklistMatch.entity_name || 'Unknown'}. Reason: ${blacklistMatch.reason || 'Not specified'}`,
      severity: SEVERITY_LEVELS.CRITICAL,
    };
  }
  return null;
}

function checkTimeBased(rule: PolicyRule, transaction: Transaction): ViolationData | null {
  const transactionDate = new Date(transaction.created_at);
  const hour = transactionDate.getHours();
  const day = transactionDate.getDay();

  const isWeekend = !BUSINESS_HOURS.WORKING_DAYS.includes(day);
  const isOutsideHours = hour < BUSINESS_HOURS.START_HOUR || hour >= BUSINESS_HOURS.END_HOUR;

  if (isWeekend || isOutsideHours) {
    return {
      transaction_id: transaction.id,
      rule_id: rule.id,
      violation_details: `Transaction created outside business hours (${transactionDate.toLocaleString()}). Weekend: ${isWeekend}, After hours: ${isOutsideHours}`,
      severity: SEVERITY_LEVELS.LOW,
    };
  }
  return null;
}

// Helper Functions
function getSeverityByAmount(amount: number, threshold: number): SeverityLevel {
  const ratio = amount / threshold;
  if (ratio > 10) return SEVERITY_LEVELS.CRITICAL;
  if (ratio > 5) return SEVERITY_LEVELS.HIGH;
  if (ratio > 2) return SEVERITY_LEVELS.MEDIUM;
  return SEVERITY_LEVELS.LOW;
}

// Save Violations
export async function saveViolations(violations: ViolationData[]): Promise<void> {
  if (violations.length === 0) return;

  const supabase = await createClient();
  await supabase.from(TABLES.POLICY_VIOLATIONS).insert(violations);
}

'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ACCOUNT_TYPE_OPTIONS, ANNUAL_INCOME_OPTIONS } from '@/lib/constants';
import type { KycFormData, AccountType, AnnualIncome } from '@/lib/types';
import { CreditCard, Wallet, Briefcase } from 'lucide-react';

interface EmploymentAccountStepProps {
  data: KycFormData;
  onChange: (data: Partial<KycFormData>) => void;
  errors: Record<string, string>;
}

const accountIcons = {
  savings: Wallet,
  current: Briefcase,
  salary: CreditCard,
};

export function EmploymentAccountStep({ data, onChange, errors }: EmploymentAccountStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>
          Account Type <span className="text-destructive">*</span>
        </Label>
        <RadioGroup
          value={data.account_type}
          onValueChange={(value) => onChange({ account_type: value as AccountType })}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {ACCOUNT_TYPE_OPTIONS.map((option) => {
            const Icon = accountIcons[option.value as keyof typeof accountIcons];
            return (
              <div key={option.value}>
                <RadioGroupItem
                  value={option.value}
                  id={option.value}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={option.value}
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
                >
                  <Icon className="mb-2 h-6 w-6" />
                  <span className="font-medium text-sm">{option.label}</span>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
        {errors.account_type && (
          <p className="text-xs text-destructive">{errors.account_type}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="occupation">
          Occupation
          <span className="text-muted-foreground text-xs ml-2">(Optional)</span>
        </Label>
        <Input
          id="occupation"
          value={data.occupation}
          onChange={(e) => onChange({ occupation: e.target.value })}
          placeholder="e.g., Software Engineer, Business Owner"
          className={errors.occupation ? 'border-destructive' : ''}
        />
        {errors.occupation && (
          <p className="text-xs text-destructive">{errors.occupation}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="annual_income">
          Annual Income
          <span className="text-muted-foreground text-xs ml-2">(Optional)</span>
        </Label>
        <Select
          value={data.annual_income}
          onValueChange={(value) => onChange({ annual_income: value as AnnualIncome })}
        >
          <SelectTrigger className={errors.annual_income ? 'border-destructive' : ''}>
            <SelectValue placeholder="Select annual income range" />
          </SelectTrigger>
          <SelectContent>
            {ANNUAL_INCOME_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.annual_income && (
          <p className="text-xs text-destructive">{errors.annual_income}</p>
        )}
      </div>

      <div className="p-4 rounded-lg border bg-muted/50">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="pep"
            checked={data.pep}
            onCheckedChange={(checked) => onChange({ pep: checked === true })}
          />
          <div className="space-y-1">
            <Label htmlFor="pep" className="cursor-pointer font-medium">
              Politically Exposed Person (PEP)
            </Label>
            <p className="text-xs text-muted-foreground">
              Are you or any of your family members a current or former senior political figure,
              senior government official, or closely associated with such persons?
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

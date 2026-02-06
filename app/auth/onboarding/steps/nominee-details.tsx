'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NOMINEE_RELATION_OPTIONS } from '@/lib/constants';
import type { KycFormData } from '@/lib/types';
import { UserPlus, Info } from 'lucide-react';

interface NomineeDetailsStepProps {
  data: KycFormData;
  onChange: (data: Partial<KycFormData>) => void;
  errors: Record<string, string>;
}

export function NomineeDetailsStep({ data, onChange, errors }: NomineeDetailsStepProps) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 flex items-start gap-3">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Nominee Information (Optional)</p>
          <p className="text-xs text-muted-foreground">
            A nominee is a person who will receive your account balance in case of any eventuality.
            You can skip this step and add a nominee later from your account settings.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-lg border bg-muted/30">
        <p className="text-xs text-muted-foreground mb-4">
          💡 <strong>Tip:</strong> Click {"\"Skip for now\""} at the bottom if you want to add nominee details later.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nominee_name">Nominee Full Name</Label>
            <Input
              id="nominee_name"
              value={data.nominee_name}
              onChange={(e) => onChange({ nominee_name: e.target.value })}
              placeholder="Enter nominee's full name"
              className={errors.nominee_name ? 'border-destructive' : ''}
            />
            {errors.nominee_name && (
              <p className="text-xs text-destructive">{errors.nominee_name}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nominee_relation">Relationship with Nominee</Label>
              <Select
                value={data.nominee_relation}
                onValueChange={(value) => onChange({ nominee_relation: value })}
              >
                <SelectTrigger className={errors.nominee_relation ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {NOMINEE_RELATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.nominee_relation && (
                <p className="text-xs text-destructive">{errors.nominee_relation}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nominee_dob">Nominee Date of Birth</Label>
              <Input
                id="nominee_dob"
                type="date"
                value={data.nominee_dob}
                onChange={(e) => onChange({ nominee_dob: e.target.value })}
                max={new Date().toISOString().split('T')[0]}
                className={errors.nominee_dob ? 'border-destructive' : ''}
              />
              {errors.nominee_dob && (
                <p className="text-xs text-destructive">{errors.nominee_dob}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

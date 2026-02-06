'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { KycFormData } from '@/lib/types';

interface PersonalInfoStepProps {
  data: KycFormData;
  onChange: (data: Partial<KycFormData>) => void;
  errors: Record<string, string>;
}

export function PersonalInfoStep({ data, onChange, errors }: PersonalInfoStepProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">
            First Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="first_name"
            value={data.first_name}
            onChange={(e) => onChange({ first_name: e.target.value })}
            placeholder="Enter first name"
            className={errors.first_name ? 'border-destructive' : ''}
          />
          {errors.first_name && (
            <p className="text-xs text-destructive">{errors.first_name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="last_name">
            Last Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="last_name"
            value={data.last_name}
            onChange={(e) => onChange({ last_name: e.target.value })}
            placeholder="Enter last name"
            className={errors.last_name ? 'border-destructive' : ''}
          />
          {errors.last_name && (
            <p className="text-xs text-destructive">{errors.last_name}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dob">
          Date of Birth <span className="text-destructive">*</span>
        </Label>
        <Input
          id="dob"
          type="date"
          value={data.dob}
          onChange={(e) => onChange({ dob: e.target.value })}
          max={new Date().toISOString().split('T')[0]}
          className={errors.dob ? 'border-destructive' : ''}
        />
        {errors.dob && (
          <p className="text-xs text-destructive">{errors.dob}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="pan">
          PAN Number <span className="text-destructive">*</span>
        </Label>
        <Input
          id="pan"
          value={data.pan}
          onChange={(e) => onChange({ pan: e.target.value.toUpperCase() })}
          placeholder="ABCDE1234F"
          maxLength={10}
          className={errors.pan ? 'border-destructive' : ''}
        />
        {errors.pan && (
          <p className="text-xs text-destructive">{errors.pan}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Permanent Account Number (10 characters)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="aadhaar">
          Aadhaar Number <span className="text-destructive">*</span>
        </Label>
        <Input
          id="aadhaar"
          value={data.aadhaar}
          onChange={(e) => onChange({ aadhaar: e.target.value.replace(/\D/g, '') })}
          placeholder="123456789012"
          maxLength={12}
          className={errors.aadhaar ? 'border-destructive' : ''}
        />
        {errors.aadhaar && (
          <p className="text-xs text-destructive">{errors.aadhaar}</p>
        )}
        <p className="text-xs text-muted-foreground">
          12-digit Aadhaar number
        </p>
      </div>
    </div>
  );
}

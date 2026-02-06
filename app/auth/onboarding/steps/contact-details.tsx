'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { KycFormData } from '@/lib/types';

interface ContactDetailsStepProps {
  data: KycFormData;
  onChange: (data: Partial<KycFormData>) => void;
  errors: Record<string, string>;
}

export function ContactDetailsStep({ data, onChange, errors }: ContactDetailsStepProps) {
  const handleSameAddress = (checked: boolean) => {
    if (checked) {
      onChange({ address_permanent: data.address_current });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="mobile">
            Mobile Number <span className="text-destructive">*</span>
          </Label>
          <Input
            id="mobile"
            value={data.mobile}
            onChange={(e) => onChange({ mobile: e.target.value.replace(/\D/g, '') })}
            placeholder="9876543210"
            maxLength={10}
            className={errors.mobile ? 'border-destructive' : ''}
          />
          {errors.mobile && (
            <p className="text-xs text-destructive">{errors.mobile}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">
            Email Address <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="you@example.com"
            className={errors.email ? 'border-destructive' : ''}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address_current">
          Current Address <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="address_current"
          value={data.address_current}
          onChange={(e) => onChange({ address_current: e.target.value })}
          placeholder="Enter your current residential address"
          rows={3}
          className={errors.address_current ? 'border-destructive' : ''}
        />
        {errors.address_current && (
          <p className="text-xs text-destructive">{errors.address_current}</p>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="same_address"
          onCheckedChange={handleSameAddress}
        />
        <Label htmlFor="same_address" className="text-sm font-normal cursor-pointer">
          Permanent address is same as current address
        </Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address_permanent">
          Permanent Address
          <span className="text-muted-foreground text-xs ml-2">(Optional - defaults to current address)</span>
        </Label>
        <Textarea
          id="address_permanent"
          value={data.address_permanent}
          onChange={(e) => onChange({ address_permanent: e.target.value })}
          placeholder="Leave blank if same as current address"
          rows={3}
          className={errors.address_permanent ? 'border-destructive' : ''}
        />
        {errors.address_permanent && (
          <p className="text-xs text-destructive">{errors.address_permanent}</p>
        )}
      </div>
    </div>
  );
}

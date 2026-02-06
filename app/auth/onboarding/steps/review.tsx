'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ACCOUNT_TYPE_OPTIONS, ANNUAL_INCOME_OPTIONS, NOMINEE_RELATION_OPTIONS } from '@/lib/constants';
import type { KycFormData } from '@/lib/types';
import { User, Phone, MapPin, Briefcase, UserPlus, CheckCircle } from 'lucide-react';

interface ReviewStepProps {
  data: KycFormData;
}

function getLabel(options: readonly { value: string; label: string }[], value: string): string {
  const option = options.find((opt) => opt.value === value);
  return option?.label || value;
}

function formatDate(dateString: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function ReviewStep({ data }: ReviewStepProps) {
  const sections = [
    {
      title: 'Personal Information',
      icon: User,
      fields: [
        { label: 'Full Name', value: `${data.first_name} ${data.last_name}` },
        { label: 'Date of Birth', value: formatDate(data.dob) },
        { label: 'PAN Number', value: data.pan },
        { label: 'Aadhaar Number', value: data.aadhaar.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3') },
      ],
    },
    {
      title: 'Contact Details',
      icon: Phone,
      fields: [
        { label: 'Mobile', value: data.mobile },
        { label: 'Email', value: data.email },
      ],
    },
    {
      title: 'Address',
      icon: MapPin,
      fields: [
        { label: 'Current Address', value: data.address_current },
        { label: 'Permanent Address', value: data.address_permanent },
      ],
    },
    {
      title: 'Employment & Account',
      icon: Briefcase,
      fields: [
        { label: 'Account Type', value: getLabel(ACCOUNT_TYPE_OPTIONS, data.account_type) },
        { label: 'Occupation', value: data.occupation },
        { label: 'Annual Income', value: getLabel(ANNUAL_INCOME_OPTIONS, data.annual_income) },
        { label: 'Politically Exposed Person', value: data.pep ? 'Yes' : 'No' },
      ],
    },
    {
      title: 'Nominee Details',
      icon: UserPlus,
      fields: data.nominee_name
        ? [
            { label: 'Nominee Name', value: data.nominee_name },
            { label: 'Relationship', value: getLabel(NOMINEE_RELATION_OPTIONS, data.nominee_relation) },
            { label: 'Date of Birth', value: formatDate(data.nominee_dob) },
          ]
        : [{ label: 'Nominee', value: 'Not provided' }],
    },
  ];

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 flex items-start gap-3">
        <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Ready to Submit</p>
          <p className="text-xs text-muted-foreground">
            Please review all your information carefully before submitting. Once submitted,
            your KYC application will be sent for review by our team.
          </p>
        </div>
      </div>

      {sections.map((section) => {
        const Icon = section.icon;
        return (
          <Card key={section.title} className="border-border">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {section.fields.map((field) => (
                  <div key={field.label} className="space-y-1">
                    <p className="text-xs text-muted-foreground">{field.label}</p>
                    <p className="text-sm font-medium">{field.value || '-'}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

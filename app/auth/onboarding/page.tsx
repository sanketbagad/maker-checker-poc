'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ArrowLeft, ArrowRight, Check, Loader2, LogOut, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { KYC_STEPS } from '@/lib/constants';
import type { KycFormData } from '@/lib/types';
import { PersonalInfoStep } from './steps/personal-info';
import { ContactDetailsStep } from './steps/contact-details';
import { EmploymentAccountStep } from './steps/employment-account';
import { NomineeDetailsStep } from './steps/nominee-details';
import { ReviewStep } from './steps/review';
import { signOut } from '@/app/auth/actions';
import { createClient } from '@/lib/supabase/client';

const initialFormData: KycFormData = {
  first_name: '',
  last_name: '',
  dob: '',
  pan: '',
  aadhaar: '',
  mobile: '',
  email: '',
  address_current: '',
  address_permanent: '',
  account_type: 'savings',
  occupation: '',
  annual_income: 'below_2.5L',
  pep: false,
  nominee_name: '',
  nominee_relation: '',
  nominee_dob: '',
};

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<KycFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Fetch user data on mount to auto-populate fields
  useEffect(() => {
    async function fetchUserData() {
      try {
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('Error fetching user:', error);
        }
        
        // First, try to get data from sessionStorage (set during registration)
        let firstName = '';
        let lastName = '';
        let userEmail = '';
        
        if (typeof window !== 'undefined') {
          const registrationData = sessionStorage.getItem('registration_data');
          if (registrationData) {
            try {
              const parsed = JSON.parse(registrationData);
              firstName = parsed.first_name || '';
              lastName = parsed.last_name || '';
              userEmail = parsed.email || '';
              // Clear after reading
              sessionStorage.removeItem('registration_data');
            } catch (e) {
              console.error('Failed to parse registration data:', e);
            }
          }
        }
        
        // If not in sessionStorage, try user metadata
        if (user) {
          const metadata = user.user_metadata || {};
          
          // Check for first_name/last_name first, then fall back to full_name
          if (!firstName && !lastName) {
            if (metadata.first_name || metadata.last_name) {
              firstName = metadata.first_name || '';
              lastName = metadata.last_name || '';
            } else if (metadata.full_name) {
              // Split full_name into first and last name
              const nameParts = metadata.full_name.trim().split(/\s+/);
              firstName = nameParts[0] || '';
              lastName = nameParts.slice(1).join(' ') || '';
            }
          }
          
          userEmail = userEmail || user.email || metadata.email || '';
        }
        
        setFormData(prev => ({
          ...prev,
          first_name: firstName,
          last_name: lastName,
          email: userEmail,
        }));
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setIsLoadingUser(false);
      }
    }

    fetchUserData();
  }, []);

  const totalSteps = KYC_STEPS.length + 1; // +1 for review step
  const progress = (currentStep / totalSteps) * 100;

  const updateFormData = (data: Partial<KycFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
    setStepErrors({});
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    switch (step) {
      case 1:
        // Required fields
        if (!formData.first_name.trim()) errors.first_name = 'First name is required';
        if (!formData.last_name.trim()) errors.last_name = 'Last name is required';
        if (!formData.dob) errors.dob = 'Date of birth is required';
        if (!formData.pan.trim()) errors.pan = 'PAN is required';
        else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan.toUpperCase())) {
          errors.pan = 'Invalid PAN format (e.g., ABCDE1234F)';
        }
        if (!formData.aadhaar.trim()) errors.aadhaar = 'Aadhaar is required';
        else if (!/^\d{12}$/.test(formData.aadhaar)) {
          errors.aadhaar = 'Aadhaar must be 12 digits';
        }
        break;
      case 2:
        // Required fields
        if (!formData.mobile.trim()) errors.mobile = 'Mobile number is required';
        else if (!/^\d{10}$/.test(formData.mobile)) {
          errors.mobile = 'Mobile must be 10 digits';
        }
        if (!formData.email.trim()) errors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          errors.email = 'Invalid email format';
        }
        if (!formData.address_current.trim()) errors.address_current = 'Current address is required';
        // Permanent address is optional - will default to current address if not provided
        break;
      case 3:
        // Required fields
        if (!formData.account_type) errors.account_type = 'Account type is required';
        // Occupation and annual income are optional
        break;
      case 4:
        // Nominee step is entirely optional - no validation needed
        // But if name is provided, show a warning if relation is not selected
        if (formData.nominee_name.trim() && !formData.nominee_relation) {
          errors.nominee_relation = 'Please select nominee relation if adding a nominee';
        }
        break;
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Check if current step can be skipped
  const canSkipStep = (step: number): boolean => {
    return step === 4; // Only nominee step can be skipped
  };

  const handleSkip = () => {
    // Clear nominee data when skipping
    if (currentStep === 4) {
      updateFormData({
        nominee_name: '',
        nominee_relation: '',
        nominee_dob: '',
      });
    }
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit KYC application');
      }

      // Redirect to pending page
      router.push('/auth/kyc-pending');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <PersonalInfoStep
            data={formData}
            onChange={updateFormData}
            errors={stepErrors}
          />
        );
      case 2:
        return (
          <ContactDetailsStep
            data={formData}
            onChange={updateFormData}
            errors={stepErrors}
          />
        );
      case 3:
        return (
          <EmploymentAccountStep
            data={formData}
            onChange={updateFormData}
            errors={stepErrors}
          />
        );
      case 4:
        return (
          <NomineeDetailsStep
            data={formData}
            onChange={updateFormData}
            errors={stepErrors}
          />
        );
      case 5:
        return <ReviewStep data={formData} />;
      default:
        return null;
    }
  };

  // Show loading state while fetching user data
  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary">
              <Shield className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">SecureControl</h1>
              <p className="text-sm text-muted-foreground">Complete Your KYC</p>
            </div>
          </div>
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </form>
        </div>

        {/* Progress Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm font-medium">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between mb-8 relative">
          {[...KYC_STEPS, { id: 5, title: 'Review', description: 'Review and submit' }].map((step, index) => (
            <div
              key={step.id}
              className={cn(
                'flex flex-col items-center relative z-10',
                currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors',
                  currentStep > step.id
                    ? 'bg-primary border-primary text-primary-foreground'
                    : currentStep === step.id
                    ? 'bg-background border-primary text-primary'
                    : 'bg-background border-muted text-muted-foreground'
                )}
              >
                {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
              </div>
              <span className="text-xs mt-2 text-center hidden md:block max-w-20">
                {step.title}
              </span>
            </div>
          ))}
          {/* Connecting line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted z-0">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Card */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-xl">
              {currentStep <= KYC_STEPS.length
                ? KYC_STEPS[currentStep - 1].title
                : 'Review & Submit'}
            </CardTitle>
            <CardDescription>
              {currentStep <= KYC_STEPS.length
                ? KYC_STEPS[currentStep - 1].description
                : 'Please review your information before submitting'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="p-3 mb-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                {error}
              </div>
            )}

            {renderStep()}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1 || isSubmitting}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              <div className="flex gap-2">
                {canSkipStep(currentStep) && (
                  <Button variant="ghost" onClick={handleSkip}>
                    <SkipForward className="mr-2 h-4 w-4" />
                    Skip for now
                  </Button>
                )}

                {currentStep < totalSteps ? (
                  <Button onClick={handleNext}>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Submit Application
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground mt-6">
          Your information is encrypted and secure
        </p>
      </div>
    </div>
  );
}

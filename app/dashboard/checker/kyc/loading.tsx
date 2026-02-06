import { Loader2 } from 'lucide-react';

export default function KycReviewLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading KYC applications...</p>
      </div>
    </div>
  );
}

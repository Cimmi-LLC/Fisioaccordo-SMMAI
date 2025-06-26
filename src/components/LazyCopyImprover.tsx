
import React, { lazy, Suspense } from 'react';
import SkeletonLoader from "./ui/skeleton-loader";

const CopyImprover = lazy(() => import('./CopyImprover'));

interface LazyCopyImproverProps {
  onCopyImproved: (improvedCopy: string) => void;
}

const LazyCopyImprover: React.FC<LazyCopyImproverProps> = (props) => {
  return (
    <Suspense
      fallback={
        <div className="mb-6 sm:mb-8">
          <SkeletonLoader type="form" />
        </div>
      }
    >
      <CopyImprover {...props} />
    </Suspense>
  );
};

export default LazyCopyImprover;

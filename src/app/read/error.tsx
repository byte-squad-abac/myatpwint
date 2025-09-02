'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Button from '@/components/ui/Button';

export default function ReadingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error
    console.error('Reading page error:', error);
  }, [error]);

  const handleBackToLibrary = () => {
    router.push('/library');
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Book</h2>
        <p className="text-gray-600 mb-6">
          {error.message || 'Something went wrong while trying to load your book.'}
        </p>
        
        <div className="space-y-3">
          <Button onClick={reset} className="w-full">
            Try Again
          </Button>
          <Button variant="outline" onClick={handleBackToLibrary} className="w-full">
            Back to Library
          </Button>
        </div>
        
        <div className="mt-6 text-sm text-gray-500">
          <p>If this problem continues, please contact support.</p>
          {error.digest && (
            <p className="mt-2 font-mono text-xs">Error ID: {error.digest}</p>
          )}
        </div>
      </div>
    </div>
  );
}
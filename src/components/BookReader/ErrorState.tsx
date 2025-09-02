'use client';

import Button from '../ui/Button';

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
  onBackToLibrary?: () => void;
}

export function ErrorState({ error, onRetry, onBackToLibrary }: ErrorStateProps) {
  const isAccessError = error.includes('not purchased') || error.includes('access denied');
  
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          {isAccessError ? (
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-7V9a3 3 0 00-6 0v1.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {isAccessError ? 'Access Denied' : 'Error Loading Book'}
        </h2>
        <p className="text-gray-600 mb-6">{error}</p>
        
        <div className="space-y-3">
          {!isAccessError && (
            <Button onClick={onRetry} className="w-full">
              Try Again
            </Button>
          )}
          
          {onBackToLibrary && (
            <Button 
              variant="outline" 
              onClick={onBackToLibrary}
              className="w-full"
            >
              Back to Library
            </Button>
          )}
          
          {isAccessError && (
            <div className="text-sm text-gray-500 mt-4">
              <p>Make sure you have purchased this book.</p>
              <p>If you believe this is an error, please contact support.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
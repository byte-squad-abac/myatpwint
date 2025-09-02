'use client';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading your book...' }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">📖 Preparing Your Book</h2>
        <p className="text-gray-600 text-lg">{message}</p>
        <div className="mt-4 text-sm text-gray-500">
          This may take a moment if it&apos;s your first time reading this book...
        </div>
      </div>
    </div>
  );
}
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { BookReader } from '@/components/BookReader';

function BookReadingContent() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  const bookId = params.bookId as string;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleCloseReader = () => {
    // Navigate back to library
    router.push('/library');
  };

  // Loading state while checking auth or mounting
  if (!mounted || authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Preparing Reading Experience...</h2>
          <p className="text-gray-600">Please wait while we set up your book</p>
        </div>
      </div>
    );
  }

  // Redirect if no user (will happen after auth check)
  if (!user) {
    return null;
  }

  // Validate bookId parameter
  if (!bookId || typeof bookId !== 'string') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Book</h2>
          <p className="text-gray-600 mb-6">The book you&apos;re trying to read could not be found.</p>
          <button
            onClick={() => router.push('/library')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <BookReader
      bookId={bookId}
      userId={user.id}
      onClose={handleCloseReader}
    />
  );
}

export default function BookReadingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">📖 Loading Book Reader...</h2>
        </div>
      </div>
    }>
      <BookReadingContent />
    </Suspense>
  );
}
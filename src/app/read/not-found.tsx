'use client';

import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function ReadingNotFound() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Book Not Found</h2>
        <p className="text-gray-600 mb-6">
          The book you&apos;re looking for doesn&apos;t exist or may have been removed.
        </p>
        
        <div className="space-y-3">
          <Link href="/library">
            <Button className="w-full">
              Browse My Library
            </Button>
          </Link>
          <Link href="/books">
            <Button variant="outline" className="w-full">
              Discover New Books
            </Button>
          </Link>
        </div>
        
        <div className="mt-6 text-sm text-gray-500">
          <p>Make sure you have purchased this book and try again.</p>
        </div>
      </div>
    </div>
  );
}
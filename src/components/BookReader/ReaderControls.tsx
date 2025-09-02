'use client';

import Button from '../ui/Button';

interface ReaderControlsProps {
  bookTitle?: string;
  author?: string;
  onClose?: () => void;
  showProgress?: boolean;
  currentPage?: number;
  totalPages?: number;
}

export function ReaderControls({ 
  bookTitle,
  author,
  onClose,
  showProgress = false,
  currentPage,
  totalPages
}: ReaderControlsProps) {
  return (
    <div className="absolute top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Book Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold text-gray-900 truncate">
                  {bookTitle || 'Reading...'}
                </h1>
                {author && (
                  <p className="text-sm text-gray-600 truncate">
                    by {author}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Reading Progress */}
          {showProgress && currentPage && totalPages && (
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentPage / totalPages) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              📖 Reading
            </div>
            
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                Back to Library
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
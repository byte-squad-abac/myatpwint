'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { BookWithRecommendationMetadata } from '@/types'
import Button from '@/components/ui/Button'

interface BookRecommendationsProps {
  currentBookId: string
  title?: string
  limit?: number
}

export default function BookRecommendations({ 
  currentBookId, 
  title = "Similar Books You Might Like",
  limit = 5
}: BookRecommendationsProps) {
  const router = useRouter()
  const [recommendations, setRecommendations] = useState<BookWithRecommendationMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRecommendations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/ai/similar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookId: currentBookId,
          limit: limit,
          threshold: 0.7
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations')
      }

      const data = await response.json()
      setRecommendations(data.recommendations || [])

    } catch (err) {
      console.error('Error fetching recommendations:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch recommendations')
    } finally {
      setLoading(false)
    }
  }, [currentBookId, limit])

  useEffect(() => {
    fetchRecommendations()
  }, [currentBookId, fetchRecommendations])


  if (loading) {
    return (
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-white mb-6">{title}</h2>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <span className="ml-3 text-gray-300">Loading recommendations...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-white mb-6">{title}</h2>
        <div className="text-center py-12">
          <p className="text-gray-300 mb-4">Unable to load recommendations</p>
          <Button
            onClick={fetchRecommendations}
            variant="outline"
            size="sm"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (recommendations.length === 0) {
    return (
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-white mb-6">{title}</h2>
        <div className="text-center py-8">
          <p className="text-gray-300">No similar books found yet.</p>
          <p className="text-sm text-gray-400 mt-2">
            Recommendations will improve as more books are added to the platform.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-white">{title}</h2>
        <div className="flex items-center text-sm text-purple-400">
          <span className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></span>
          AI-powered recommendations
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        {recommendations.map((book, index) => {
          const bookData = book as unknown as Record<string, unknown>
          return (
            <div
              key={bookData.id as string || `recommendation-${index}`}
              className="group cursor-pointer"
              onClick={() => router.push(`/books/${bookData.id}`)}
            >
              <div className="relative overflow-hidden rounded-lg">
                <div className="aspect-[3/4] bg-gradient-to-br from-gray-900 to-gray-800 relative">
                  {(bookData.image_url as string) && (
                    <Image
                      src={bookData.image_url as string}
                      alt={bookData.name as string}
                      width={200}
                      height={300}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  )}

                  {/* Overlay on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-4 transform transition-transform duration-300 translate-y-2 group-hover:translate-y-0">
                      <p className="text-white text-sm font-medium line-clamp-2 mb-1">
                        {bookData.name as string}
                      </p>
                      <p className="text-gray-300 text-xs mb-2">
                        {bookData.author as string}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-green-400 font-bold text-sm">
                          ${bookData.price as number}
                        </span>
                        {Boolean(bookData.recommendationMetadata) && (
                          <span className="text-xs bg-purple-500/80 backdrop-blur px-2 py-1 rounded text-white">
                            {Math.round(((bookData.recommendationMetadata as Record<string, unknown>)?.similarity as number || 0) * 100)}% match
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Action Button */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Book Info Below */}
              <div className="mt-3 space-y-1">
                <h3 className="text-white font-medium text-sm line-clamp-1 group-hover:text-purple-400 transition-colors">
                  {bookData.name as string}
                </h3>
                <p className="text-gray-500 text-xs">
                  {bookData.author as string}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-center mt-8">
        <p className="text-xs text-gray-500">
          Based on content similarity using multilingual AI • {recommendations.length} recommendations
        </p>
      </div>
    </div>
  )
}
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { BookWithRecommendationMetadata } from '@/types'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
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
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading recommendations...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">Unable to load recommendations</p>
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
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
        <div className="text-center py-8">
          <p className="text-gray-600">No similar books found yet.</p>
          <p className="text-sm text-gray-500 mt-2">
            Recommendations will improve as more books are added to the platform.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <div className="flex items-center text-sm text-gray-600">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
          AI-powered recommendations
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {recommendations.map((book, index) => {
          const bookData = book as unknown as Record<string, unknown>
          return (
          <Card key={bookData.id as string || `recommendation-${index}`} className="h-full hover:shadow-lg transition-shadow cursor-pointer">
            <div 
              className="p-4"
              onClick={() => router.push(`/books/${bookData.id}`)}
            >
              {(bookData.image_url as string) && (
                <div className="aspect-[3/4] bg-gray-100 rounded-lg mb-3 overflow-hidden">
                  <Image 
                    src={bookData.image_url as string} 
                    alt={bookData.name as string}
                    width={150}
                    height={200}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">
                  {bookData.name as string}
                </h3>
                
                <p className="text-xs text-gray-600 mb-2">by {bookData.author as string}</p>
                
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" size="sm">{bookData.category as string}</Badge>
                  <span className="text-sm font-bold text-green-600">
                    {bookData.price as number} MMK
                  </span>
                </div>

                {Boolean(bookData.recommendationMetadata) && (
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {Math.round(((bookData.recommendationMetadata as Record<string, unknown>)?.similarity as number || 0) * 100)}% match
                    </span>
                    <span>🤖 AI</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
          )
        })}
      </div>
      
      <div className="text-center mt-6">
        <p className="text-xs text-gray-500">
          Based on content similarity using multilingual AI • {recommendations.length} recommendations
        </p>
      </div>
    </div>
  )
}
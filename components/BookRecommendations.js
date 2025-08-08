import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function BookRecommendations({ bookId, bookTitle }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!bookId) return;

    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('🤖 Fetching AI recommendations for book:', bookId);
        
        const response = await fetch(`/api/recommendations/similar?bookId=${bookId}&limit=5`);
        const data = await response.json();
        
        if (data.success) {
          setRecommendations(data.recommendations);
          console.log('✅ Got', data.recommendations.length, 'recommendations');
        } else {
          throw new Error(data.error || 'Failed to get recommendations');
        }
      } catch (err) {
        console.error('❌ Recommendation error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [bookId]);

  if (!bookId) {
    return null;
  }

  return (
    <div className="mt-8 p-6 bg-gray-50 rounded-lg">
      <h3 className="text-xl font-bold mb-4 text-gray-800">
        🤖 AI Recommendations
        {bookTitle && (
          <span className="text-sm font-normal text-gray-600 block">
            Based on "{bookTitle}"
          </span>
        )}
      </h3>

      {loading && (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Finding similar books with AI...</span>
        </div>
      )}

      {error && (
        <div className="text-red-600 bg-red-50 p-3 rounded">
          ❌ {error}
        </div>
      )}

      {!loading && !error && recommendations.length === 0 && (
        <div className="text-gray-600">
          No similar books found. Try processing more books with AI!
        </div>
      )}

      {!loading && !error && recommendations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((book) => (
            <div key={book.id} className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              {book.image_url && (
                <img 
                  src={book.image_url} 
                  alt={book.name}
                  className="w-full h-32 object-cover rounded mb-3"
                />
              )}
              
              <div>
                <h4 className="font-semibold text-gray-800 mb-1 line-clamp-2">
                  {book.name}
                </h4>
                
                <p className="text-sm text-gray-600 mb-1">
                  by {book.author}
                </p>
                
                <p className="text-xs text-blue-600 mb-2">
                  {book.category}
                </p>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-green-600">
                    {book.price} MMK
                  </span>
                  
                  <span className="text-xs text-gray-500">
                    {Math.round(book.similarity_score * 100)}% match
                  </span>
                </div>
                
                <Link 
                  href={`/books/${book.id}`}
                  className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800"
                >
                  View Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
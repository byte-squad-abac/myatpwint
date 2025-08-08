# AI-Powered Book Recommendation System - Integration Guide

This document provides a comprehensive guide for integrating the new AI-powered recommendation system into your Myanmar book publishing application.

## 🚀 System Overview

The AI recommendation system includes:
- **Database Schema**: Enhanced with recommendation tables and analytics
- **Python FastAPI Service**: ML-powered embedding generation and recommendations  
- **Pinecone Vector Database**: Semantic similarity search
- **Next.js API Endpoints**: RESTful recommendation services
- **React Components**: Ready-to-use UI components
- **Analytics System**: Comprehensive tracking and insights

## 📋 Integration Steps

### 1. Database Setup

First, run the database migrations:

```sql
-- Run these migrations in your Supabase SQL editor
-- File: database/migrations/20241208_add_recommendation_tables.sql
-- File: database/migrations/20241208_add_analytics_tables.sql
```

### 2. Environment Variables

Add these to your `.env.local`:

```bash
# Python Service
PYTHON_SERVICE_URL=http://localhost:8000

# Pinecone (get free account at pinecone.io)
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=us-west1-gcp-free

# Optional: Redis for caching
REDIS_URL=redis://localhost:6379
```

### 3. Python Service Setup

```bash
cd python-service

# Install dependencies
pip install -r requirements.txt

# Start the service
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 4. Update Your Application Layout

```tsx
// src/app/layout.tsx
import { AnalyticsProvider } from '@/lib/contexts/AnalyticsContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionContextProvider supabaseClient={supabase}>
          <AnalyticsProvider enabledByDefault={true}>
            {/* Your existing layout */}
            {children}
          </AnalyticsProvider>
        </SessionContextProvider>
      </body>
    </html>
  );
}
```

### 5. Add Recommendations to Book Detail Pages

```tsx
// src/app/books/[id]/BookDetailPage.tsx
import { SimilarBooks } from '@/components/recommendations';

export default function BookDetailPage({ book }: BookDetailPageProps) {
  // ... existing code

  return (
    <Container>
      {/* Existing book details */}
      
      {/* Add similar books recommendations */}
      <SimilarBooks 
        bookId={book.id}
        bookTitle={book.name}
        showScores={true}
        showAlgorithm={true}
        limit={6}
      />
    </Container>
  );
}
```

### 6. Add Personalized Recommendations to Home Page

```tsx
// src/app/page.tsx
import { 
  PersonalizedRecommendations, 
  TrendingBooks,
  SearchWithRecommendations 
} from '@/components/recommendations';

export default function HomePage() {
  return (
    <main>
      {/* Hero section */}
      
      {/* AI-powered search */}
      <SearchWithRecommendations 
        placeholder="Search for books by content, theme, or topic..."
        limit={8}
        showScores={true}
        showAlgorithm={true}
      />

      {/* Personalized recommendations for signed-in users */}
      <PersonalizedRecommendations 
        limit={8}
        showScores={true}
        showAlgorithm={true}
        excludePurchased={true}
      />

      {/* Trending books */}
      <TrendingBooks 
        limit={8}
        timeWindowDays={30}
        showScores={true}
        allowTimeWindowSelection={true}
        allowCategorySelection={true}
      />
    </main>
  );
}
```

### 7. Add Complete Recommendation Dashboard

```tsx
// src/app/discover/page.tsx
import { RecommendationDashboard } from '@/components/recommendations';

export default function DiscoverPage() {
  return (
    <RecommendationDashboard 
      showSearchTab={true}
      showPersonalizedTab={true}
      showTrendingTab={true}
      showAdvancedOptions={true}
    />
  );
}
```

### 8. Add Analytics Tracking to Existing Components

```tsx
// Update your existing BookCard component
import { useAnalytics } from '@/lib/hooks/useAnalytics';

export default function BookCard({ book }: { book: any }) {
  const analytics = useAnalytics();

  const handleBookClick = async () => {
    // Track the click
    await analytics.trackRecommendationClick({
      bookId: book.id,
      recommendationType: 'trending', // or wherever this card appears
      position: 0, // index in the list
      similarityScore: book.similarity_score,
    });
    
    // Navigate to book
    router.push(`/books/${book.id}`);
  };

  return (
    <div onClick={handleBookClick}>
      {/* Your existing book card content */}
    </div>
  );
}
```

### 9. Admin Analytics Dashboard

```tsx
// src/app/admin/analytics/page.tsx (protected route)
import { AnalyticsDashboard } from '@/components/analytics';

export default function AdminAnalyticsPage() {
  return <AnalyticsDashboard />;
}
```

## 🔧 Component Examples

### Recommendation Section
```tsx
import { RecommendationSection } from '@/components/recommendations';

<RecommendationSection
  title="Books You Might Like"
  subtitle="Based on your reading history"
  books={recommendedBooks}
  loading={loading}
  onRefresh={refreshRecommendations}
  showScores={true}
  showAlgorithm={true}
  type="personalized"
/>
```

### Search with Recommendations
```tsx
import { SearchWithRecommendations } from '@/components/recommendations';

<SearchWithRecommendations
  placeholder="Search for books by theme or content..."
  limit={12}
  showScores={true}
  onSearchChange={(query) => console.log('Search:', query)}
  autoSearch={true}
/>
```

## 📊 API Usage Examples

### Get Similar Books
```typescript
const response = await fetch(`/api/recommendations/similar?bookId=${bookId}&limit=10`);
const data = await response.json();
```

### Get Personalized Recommendations
```typescript
const response = await fetch(`/api/recommendations/personalized?userId=${userId}&limit=10`);
const data = await response.json();
```

### Get Trending Books
```typescript
const response = await fetch(`/api/recommendations/trending?limit=10&timeWindow=30`);
const data = await response.json();
```

### Semantic Search
```typescript
const response = await fetch(`/api/recommendations/search?query=${encodeURIComponent(query)}`);
const data = await response.json();
```

## 🎯 Analytics Integration

### Track User Interactions
```tsx
import { useAnalytics } from '@/lib/hooks/useAnalytics';

function MyComponent() {
  const analytics = useAnalytics();

  const handlePurchase = async (bookId: string, amount: number) => {
    // Your purchase logic...
    
    // Track the purchase
    await analytics.trackPurchase({
      bookId,
      recommendationType: 'personalized',
      amount,
      metadata: { checkout_method: 'stripe' }
    });
  };

  return (
    // Your component JSX
  );
}
```

### Component-Level Tracking
```tsx
import { useRecommendationTracking } from '@/lib/hooks/useAnalytics';

function RecommendationList({ books }: { books: any[] }) {
  // Automatically tracks when recommendations are viewed
  const analytics = useRecommendationTracking('similar', books, 'ai_content_based');

  return (
    <div>
      {books.map((book, index) => (
        <BookCard 
          key={book.id}
          book={book}
          onClick={analytics.createClickTracker(
            book.id,
            'similar',
            index,
            book.similarity_score
          )}
        />
      ))}
    </div>
  );
}
```

## 🛠️ Development & Testing

### Start Development Environment
```bash
# Terminal 1: Python AI service
cd python-service
uvicorn main:app --reload --port 8000

# Terminal 2: Next.js app
npm run dev

# Terminal 3: Optional - Redis for caching
redis-server
```

### Test the Recommendation APIs
```bash
# Test similar books
curl "http://localhost:3000/api/recommendations/similar?bookId=some-book-id&limit=5"

# Test personalized (requires auth)
curl -H "Authorization: Bearer YOUR_JWT" "http://localhost:3000/api/recommendations/personalized?userId=user-id&limit=5"

# Test search
curl "http://localhost:3000/api/recommendations/search?query=love%20story&limit=5"
```

## 📈 Performance Considerations

1. **Caching**: The system uses Redis for caching embeddings and recommendations
2. **Batch Processing**: Analytics events are batched for efficiency
3. **Fallback Systems**: Multiple fallback strategies ensure reliability
4. **Rate Limiting**: Consider adding rate limiting to API endpoints
5. **CDN**: Use CDN for book cover images in recommendations

## 🔒 Privacy & Compliance

1. **Analytics Consent**: The `AnalyticsConsent` component handles user consent
2. **Do Not Track**: Respects browser Do Not Track settings
3. **Data Anonymization**: User data is hashed and anonymized where possible
4. **GDPR Compliance**: Analytics can be disabled per user preference

## 🚀 Deployment

### Python Service (Docker)
```bash
cd python-service
docker build -t recommendation-service .
docker run -p 8000:8000 recommendation-service
```

### Pinecone Setup
1. Create free account at [pinecone.io](https://pinecone.io)
2. Create index named "myanmar-books" with dimension 384
3. Add API key to environment variables

### Database
All migrations can be run directly in Supabase SQL editor or via CLI.

## 📚 Next Steps

1. **Populate Data**: Run recommendation system on existing books
2. **A/B Testing**: Use the built-in A/B testing framework
3. **Model Improvement**: Monitor analytics to improve recommendation quality
4. **Internationalization**: Add Myanmar language support for search
5. **Mobile Optimization**: Ensure components work well on mobile devices

## 🎉 Features Included

- ✅ Content-based recommendations using AI embeddings
- ✅ Collaborative filtering based on user behavior  
- ✅ Semantic search with multilingual support
- ✅ Real-time trending books calculation
- ✅ Personalized recommendations for users
- ✅ Comprehensive analytics and tracking
- ✅ A/B testing framework
- ✅ Fallback systems for reliability
- ✅ Privacy-compliant analytics
- ✅ Responsive UI components
- ✅ Admin analytics dashboard

Your Myanmar book publishing platform now has a world-class AI-powered recommendation system! 🚀📚
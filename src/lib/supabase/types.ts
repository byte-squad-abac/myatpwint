export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          role: 'user' | 'author' | 'editor' | 'publisher'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          role?: 'user' | 'author' | 'editor' | 'publisher'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: 'user' | 'author' | 'editor' | 'publisher'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      manuscripts: {
        Row: {
          id: string
          title: string
          description: string
          file_url: string
          cover_image_url: string
          tags: string[]
          category: string
          suggested_price: number | null
          wants_physical: boolean
          status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'published'
          editor_feedback: string | null
          submitted_at: string
          reviewed_at: string | null
          published_at: string | null
          author_id: string
          editor_id: string | null
          publisher_id: string | null
          submission_count: number
          feedback_history: Record<string, unknown>[] | null
          last_resubmitted_at: string | null
        }
      }
      books: {
        Row: {
          id: string
          manuscript_id: string
          name: string
          author: string
          description: string
          category: string
          tags: string[]
          price: number
          edition: string
          image_url: string
          published_date: string
          created_at: string
        }
      }
      purchases: {
        Row: {
          id: string
          user_id: string
          book_id: string
          amount: number
          stripe_payment_intent_id: string
          status: string
          purchased_at: string
        }
      }
      stripe_products: {
        Row: {
          id: string
          book_id: string
          stripe_product_id: string
          stripe_price_id: string
          created_at: string
        }
      }
      book_embeddings: {
        Row: {
          id: string
          book_id: string
          embedding: number[]
          content_hash: string
          created_at: string
        }
      }
      n8n_marketing_analytics: {
        Row: {
          id: string
          book_id: string
          campaign_type: string
          status: string
          error_message: string | null
          platforms_posted: string[]
          content_generated: Record<string, unknown> | null
          triggered_at: string
          completed_at: string | null
        }
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Manuscript = Database['public']['Tables']['manuscripts']['Row']
export type Book = Database['public']['Tables']['books']['Row']
export type Purchase = Database['public']['Tables']['purchases']['Row']
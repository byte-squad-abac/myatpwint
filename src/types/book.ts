/**
 * Book type used across the app.
 * Matches Firebase Firestore books collection.
 */
export interface Book {
  id: string
  name: string
  price: number
  author_name: string
  edition: string
  category: string
  tags: string[]
  description: string
  image: string
  createdAt?: string
}

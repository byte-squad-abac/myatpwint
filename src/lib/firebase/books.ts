import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  type DocumentData,
} from 'firebase/firestore'
import { firestore } from './config'

export const BOOKS_COLLECTION = 'books'

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

export interface BookInput {
  name: string
  price: number
  author_name: string
  edition: string
  category: string
  tags: string[]
  description: string
  image: string
}

function docToBook(id: string, data: DocumentData): Book {
  return {
    id,
    name: data.name || '',
    price: Number(data.price) || 0,
    author_name: data.author_name || '',
    edition: data.edition || 'First Edition',
    category: data.category || '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    description: data.description || '',
    image: data.image || '',
    createdAt: data.createdAt,
  }
}

export async function getBooks(limitCount = 10): Promise<Book[]> {
  try {
    const q = query(
      collection(firestore, BOOKS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((d) => docToBook(d.id, d.data()))
  } catch (e) {
    // If index doesn't exist yet, fall back to unordered query
    const snapshot = await getDocs(collection(firestore, BOOKS_COLLECTION))
    const books = snapshot.docs.slice(0, limitCount).map((d) => docToBook(d.id, d.data()))
    return books
  }
}

export async function getBookById(id: string): Promise<Book | null> {
  const ref = doc(firestore, BOOKS_COLLECTION, id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return docToBook(snap.id, snap.data())
}

export async function createBook(input: BookInput): Promise<string> {
  const data = {
    ...input,
    createdAt: new Date().toISOString(),
  }
  const ref = await addDoc(collection(firestore, BOOKS_COLLECTION), data)
  return ref.id
}

export async function updateBook(id: string, input: Partial<BookInput>): Promise<void> {
  const ref = doc(firestore, BOOKS_COLLECTION, id)
  await updateDoc(ref, { ...input, updatedAt: new Date().toISOString() })
}

export async function deleteBook(id: string): Promise<void> {
  const ref = doc(firestore, BOOKS_COLLECTION, id)
  await deleteDoc(ref)
}

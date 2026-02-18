'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth'
import { createBook, updateBook, deleteBook, getBooks } from '@/lib/firebase/books'
import type { Book } from '@/lib/firebase/books'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

export default function AdminAddBookPage() {
  const { user, profile, loading: authLoading } = useFirebaseAuth()
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    name: '',
    price: '',
    author_name: '',
    edition: 'First Edition',
    category: '',
    tagsCSV: '',
    description: '',
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [books, setBooks] = useState<Book[]>([])
  const [loadingBooks, setLoadingBooks] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchBooks = useCallback(async () => {
    try {
      setLoadingBooks(true)
      const data = await getBooks(100)
      setBooks(data)
    } catch (err) {
      console.error('Failed to fetch books:', err)
    } finally {
      setLoadingBooks(false)
    }
  }, [])

  useEffect(() => {
    if (user && profile?.role === 'publisher') {
      fetchBooks()
    }
  }, [user, profile?.role, fetchBooks])

  // Redirect non-publishers
  if (!authLoading && (!user || profile?.role !== 'publisher')) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">Only publishers can add books.</p>
          <Link href="/" className="text-purple-400 hover:text-purple-300 underline">
            Go to Home
          </Link>
        </div>
      </div>
    )
  }

  const uploadImageToSupabase = async (file: File): Promise<string> => {
    const path = `book-covers/${Date.now()}-${file.name}`
    const { error: upErr } = await supabase.storage.from('book-covers').upload(path, file, { upsert: true })
    if (upErr) throw upErr
    const { data } = supabase.storage.from('book-covers').getPublicUrl(path)
    return data.publicUrl
  }

  const resetForm = () => {
    setForm({ name: '', price: '', author_name: '', edition: 'First Edition', category: '', tagsCSV: '', description: '' })
    setImageFile(null)
    setEditingId(null)
  }

  const handleEdit = (book: Book) => {
    setForm({
      name: book.name,
      price: String(book.price),
      author_name: book.author_name,
      edition: book.edition || 'First Edition',
      category: book.category || '',
      tagsCSV: book.tags?.join(', ') || '',
      description: book.description || '',
    })
    setEditingId(book.id)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setDeletingId(id)
    try {
      await deleteBook(id)
      await fetchBooks()
      if (editingId === id) resetForm()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete book.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.name || !form.author_name || !form.price) {
      setError('Name, Author, and Price are required.')
      return
    }

    setSubmitting(true)
    try {
      let imageUrl = ''
      if (imageFile) {
        imageUrl = await uploadImageToSupabase(imageFile)
      }

      const tags = form.tagsCSV ? form.tagsCSV.split(',').map((t) => t.trim()).filter(Boolean) : []

      const bookData = {
        name: form.name.trim(),
        price: parseInt(form.price, 10) || 0,
        author_name: form.author_name.trim(),
        edition: form.edition,
        category: form.category.trim(),
        tags,
        description: form.description.trim(),
      }

      if (editingId) {
        await updateBook(editingId, { ...bookData, ...(imageUrl && { image: imageUrl }) })
        alert('Book updated successfully!')
      } else {
        await createBook({ ...bookData, image: imageUrl })
        alert('Book added successfully!')
      }

      resetForm()
      await fetchBooks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save book.')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const inputClass = 'block w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500'
  const labelClass = 'block text-sm font-medium text-gray-300 mb-1'

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">
            {editingId ? 'Edit Book' : 'Add New Book'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-900/80 backdrop-blur-xl rounded-xl border border-gray-800 p-6 mb-12">
          {error && (
            <div className="p-4 bg-red-900/30 border border-red-700 rounded-md text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Book Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Book title"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Author Name *</label>
              <input
                value={form.author_name}
                onChange={(e) => setForm((f) => ({ ...f, author_name: e.target.value }))}
                placeholder="e.g., John Doe"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Price (MMK) *</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="e.g., 5000"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Edition</label>
              <select
                value={form.edition}
                onChange={(e) => setForm((f) => ({ ...f, edition: e.target.value }))}
                className={inputClass}
              >
                <option value="First Edition">First Edition</option>
                <option value="Second Edition">Second Edition</option>
                <option value="Revised Edition">Revised Edition</option>
                <option value="Special Edition">Special Edition</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="e.g., Fiction, Romance"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Tags (comma separated)</label>
              <input
                value={form.tagsCSV}
                onChange={(e) => setForm((f) => ({ ...f, tagsCSV: e.target.value }))}
                placeholder="novel, drama, series"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Short description of the book"
            />
          </div>

          <div>
            <label className={labelClass}>Cover Image (Supabase)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-purple-600 file:text-white hover:file:bg-purple-500 file:cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-1">
              {editingId ? 'Leave empty to keep current image' : 'Images are stored in Supabase'}
            </p>
          </div>

          <div className="flex justify-end gap-3">
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm} disabled={submitting} className="bg-gray-600 border-gray-600 text-gray-300 hover:bg-gray-700">
                Cancel Edit
              </Button>
            )}
            <Button type="submit" variant="success" loading={submitting} disabled={submitting} className="bg-purple-600 hover:bg-purple-700">
              {submitting ? 'Saving...' : editingId ? 'Update Book' : 'Add Book'}
            </Button>
          </div>
        </form>

        {/* Book list with Edit / Delete */}
        <div className="bg-gray-900/80 backdrop-blur-xl rounded-xl border border-gray-800 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Your Books</h2>
          {loadingBooks ? (
            <div className="py-8 text-center text-gray-400">Loading books...</div>
          ) : books.length === 0 ? (
            <div className="py-8 text-center text-gray-400">No books yet. Add one above.</div>
          ) : (
            <div className="space-y-3">
              {books.map((book) => (
                <div
                  key={book.id}
                  className="flex items-center justify-between gap-4 p-4 border border-gray-800 rounded-lg hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-12 h-16 flex-shrink-0 rounded bg-gray-800 overflow-hidden">
                      {book.image ? (
                        <img src={book.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">No img</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{book.name}</p>
                      <p className="text-sm text-gray-400">{book.author_name} · {book.price?.toLocaleString()} MMK</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEdit(book)}
                      className="p-2 text-gray-400 hover:text-purple-400 hover:bg-purple-500/20 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(book.id, book.name)}
                      disabled={deletingId === book.id}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

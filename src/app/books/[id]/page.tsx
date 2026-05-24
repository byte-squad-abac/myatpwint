'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getBookById } from '@/lib/firebase/books'
import type { Book } from '@/types/book'
import BookDetailContent from './BookDetailContent'
import { usePreferences } from '@/components/PreferencesProvider'
import { pick, ui } from '@/lib/ui/bilingualLabels'

type LoadError = 'not_found' | 'failed' | null

export default function BookPage() {
  const params = useParams()
  const { locale } = usePreferences()
  const t = (e: { en: string; my: string }) => pick(e, locale)
  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<LoadError>(null)

  useEffect(() => {
    if (!params.id) return

    const load = async () => {
      try {
        const data = await getBookById(params.id as string)
        setBook(data)
        if (!data) setLoadError('not_found')
      } catch {
        setLoadError('failed')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-app">
        <div className="w-12 h-12 border-4 border-[var(--app-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (loadError || !book) {
    const heading =
      loadError === 'failed' ? t(ui.bookLoad.failed) : t(ui.bookLoad.notFound)
    return (
      <div className="flex flex-1 items-center justify-center bg-app px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-app mb-6">{heading}</h1>
          <Link
            href="/books"
            className="inline-flex items-center px-5 py-3 bg-[var(--app-accent)] hover:opacity-95 text-white rounded-xl font-semibold touch-manipulation"
          >
            {t(ui.nav.books)}
          </Link>
        </div>
      </div>
    )
  }

  return <BookDetailContent book={book} />
}

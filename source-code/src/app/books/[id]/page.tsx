// src/app/books/[id]/page.tsx

import supabase from '@/lib/supabaseClient';
import { notFound } from 'next/navigation';
import BookDetailPage from './BookDetailPage';

export const dynamic = 'force-dynamic';

export default async function BookPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: book, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error) {
    console.error('Error fetching book:', error);
    return notFound();
  }

  if (!book) return notFound();

  return <BookDetailPage book={book} />;
}
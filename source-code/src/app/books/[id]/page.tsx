// src/app/books/[id]/page.tsx

import supabase from '@/lib/supabaseClient';
import { notFound } from 'next/navigation';
import BookDetailPage from './BookDetailPage';

export async function generateStaticParams() {
  const { data } = await supabase.from('books').select('id');
  return (data ?? []).map((b) => ({ id: b.id }));
}

export const dynamicParams = false;

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
// src/app/books/[id]/page.tsx
import { notFound } from 'next/navigation';
import { Metadata, ResolvingMetadata } from 'next';
import supabase from '@/lib/supabaseClient';
import type { InferGetStaticPropsType } from 'next';

// 👇 Fix: Use correct App Router typing
type PageProps = {
  params: {
    id: string;
  };
};

export default async function BookDetailPage({ params }: PageProps) {
  const { data: book } = await supabase
    .from('books')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!book) return notFound();

  return (
    <div style={{ padding: '2rem' }}>
      <h1>{book.name}</h1>
      <p><strong>Author:</strong> {book.author}</p>
      <p><strong>Price:</strong> ${book.price}</p>
      <p><strong>Description:</strong> {book.description}</p>
      <p><strong>Category:</strong> {book.category}</p>
      <p><strong>Edition:</strong> {book.edition}</p>
      <img
        src={book.image_url}
        alt={book.name}
        style={{ width: '300px', marginTop: '1rem' }}
      />
    </div>
  );
}

export async function generateStaticParams() {
  const { data: books } = await supabase.from('books').select('id');
  return (books || []).map((book) => ({
    id: book.id,
  }));
}

// src/app/books/[id]/page.tsx
import supabase from '@/lib/supabaseClient';
import { notFound } from 'next/navigation';

export default async function BookDetailPage({ params }: { params: { id: string } }) {
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

// ✅ Required for static export
export async function generateStaticParams() {
  const { data: books } = await supabase.from('books').select('id');
  return (books || []).map((book) => ({ id: book.id }));
}

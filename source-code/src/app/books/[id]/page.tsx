// src/app/books/[id]/page.tsx
import supabase from '@/lib/supabaseClient';
import { notFound } from 'next/navigation';

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
  const { data: book } = await supabase
    .from('books')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!book) return notFound();

  return <h1>{book.name}</h1>;
}

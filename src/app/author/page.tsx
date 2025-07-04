'use client';

import { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';

export default function AuthorPage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!session) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (data?.role) {
        setRole(data.role);
      }
      setLoading(false);
    };
    fetchRole();
  }, [session, supabase]);

  const applyAsAuthor = async () => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'author', name: session?.user.user_metadata.full_name || session?.user.email || 'Unnamed' })
      .eq('id', session?.user.id);

    if (!error) {
      setRole('author');
      router.refresh();
    }
  };

  if (loading || !session) return (
  <div style={{marginTop: '40px'}}>
    You are not logged in. Please Log in or Sign up to access the Author Portal.<br />
  <button onClick={() => router.push('/login')}>Login</button>
  </div>
  
);

  if (role !== 'author') {
    return (
      <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
        <h1>✍️ Become an Author</h1>
        <p>You are currently a user. Click below to become an author.</p>
        <button onClick={applyAsAuthor}>Apply as Author</button>
      </main>
    );
  }

  return (
    <main style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>✍️ Author Portal</h1>
      <p>You have Author role. Your email is {session?.user.email}</p>
      <p>Authors can submit manuscripts, track sales, and message publishers.</p>
      <a href="/author/manuscripts">click to upload manuscript</a>
    </main>
  );
}

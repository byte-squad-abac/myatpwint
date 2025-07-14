'use client';

import { useEffect, useState } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';

const AuthorManagePage = () => {
  const supabase = useSupabaseClient();
  const session = useSession();
  const router = useRouter();

  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authors, setAuthors] = useState<any[]>([]);

  // Fetch current user's role
  useEffect(() => {
    const fetchRole = async () => {
      if (!session) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (data?.role) setRole(data.role);
      setLoading(false);
    };
    fetchRole();
  }, [session, supabase]);

  // Fetch all pending authors
  useEffect(() => {
    const fetchAuthors = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'pending_author');

      if (data) setAuthors(data);
    };
    fetchAuthors();
  }, [supabase]);

  // Approve author request
  const approveAuthor = async (id: string) => {
    await supabase
      .from('profiles')
      .update({ role: 'author' })
      .eq('id', id);

    setAuthors(prev => prev.filter(a => a.id !== id));
  };

  // Reject author request
  const rejectAuthor = async (id: string) => {
    await supabase
      .from('profiles')
      .update({ role: 'user' }) // or delete if you prefer
      .eq('id', id);

    setAuthors(prev => prev.filter(a => a.id !== id));
  };

  if (loading) return <p>Loading...</p>;
  if (!session || role !== 'publisher') {
    return (
      <div style={{ padding: 40 }}>
        <h2>Access Denied</h2>
        <p>You must be a publisher to view this page.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Author Management</h1>
      <p>Manage authors who have applied to become official authors.</p>

      {authors.length === 0 ? (
        <p>No pending author applications at the moment.</p>
      ) : (
        authors.map((author) => (
          <div key={author.id} style={{ border: '1px solid #ccc', padding: 16, marginBottom: 12, borderRadius: 8 }}>
            <h3>{author.name || 'Unnamed'}</h3>
            <p>Author Name: {author.author_name || 'N/A'}</p>
            <p>Email: {author.email}</p>
            <p>Phone: {author.phone}</p>
            <div style={{ marginTop: 12 }}>
              <button onClick={() => approveAuthor(author.id)} style={{ marginRight: 10 }}>✅ Approve</button>
              <button onClick={() => rejectAuthor(author.id)}>❌ Reject</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default AuthorManagePage;

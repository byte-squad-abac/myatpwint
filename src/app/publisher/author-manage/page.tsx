'use client';

import { useEffect, useState } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import ConversationBox from '@/components/ConversationBox';

const publisherId = 'cf41c978-02bc-4bb6-a2f3-1fb5133f3f1a';

export default function AuthorManagePage() {
  const supabase = useSupabaseClient();
  const session = useSession();

  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authors, setAuthors] = useState<any[]>([]);

  useEffect(() => {
    const fetchRole = async () => {
      if (!session) return;
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      if (data?.role) setRole(data.role);
      setLoading(false);
    };
    fetchRole();
  }, [session]);

  useEffect(() => {
    const fetchAuthors = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*');
      if (data) setAuthors(data);
    };
    fetchAuthors();
  }, []);

  const approveAuthor = async (id: string) => {
    await supabase.from('profiles').update({ role: 'author' }).eq('id', id);
    setAuthors((prev) => prev.map(a => a.id === id ? { ...a, role: 'author' } : a));
  };

  const rejectAuthor = async (id: string) => {
    await supabase.from('profiles').update({ role: 'user' }).eq('id', id);
    setAuthors((prev) => prev.map(a => a.id === id ? { ...a, role: 'user' } : a));
  };

  if (loading) return <p style={{ padding: 40 }}>Loading…</p>;
  if (!session || role !== 'publisher') {
    return <p style={{ padding: 40 }}>Access denied. Publisher only.</p>;
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Author Management</h1>

      <h2>Pending Applications</h2>
      {authors.filter(a => a.role === 'pending_author').length === 0 ? (
        <p>No pending authors.</p>
      ) : (
        authors.filter(a => a.role === 'pending_author').map(author => (
          <div key={author.id} style={{ border: '1px solid #ccc', padding: 12, marginBottom: 12 }}>
            <strong>{author.name}</strong><br />
            Email: {author.email}<br />
            Phone: {author.phone}<br />
            <button onClick={() => approveAuthor(author.id)} style={{ marginRight: 8 }}>✅ Approve</button>
            <button onClick={() => rejectAuthor(author.id)}>❌ Reject</button>
          </div>
        ))
      )}

      <h2 style={{ marginTop: 40 }}>Approved Authors</h2>
      {authors.filter(a => a.role === 'author').length === 0 ? (
        <p>No approved authors.</p>
      ) : (
        authors.filter(a => a.role === 'author').map(author => (
          <div key={author.id} style={{ border: '1px solid #ccc', padding: 12, marginBottom: 12 }}>
            <strong>{author.name}</strong><br />
            Email: {author.email}<br />
            Phone: {author.phone}
            <div style={{ marginTop: 8 }}>
              <ConversationBox
                myId={publisherId}
                myRole="editor"
                authorId={author.id}
                editorId={publisherId}
                author_name={author.name}
                editor_name="Publisher"
                sender_name="Publisher"
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
'use client';

import { useEffect, useState } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import ConversationBox from '@/components/ConversationBox';

const publisherId = 'cf41c978-02bc-4bb6-a2f3-1fb5133f3f1a';

export default function AuthorManagePage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  
  const [activeAuthorId, setActiveAuthorId] = useState(null);
  
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
    console.log('Author ${id} approved');
  };

  const rejectAuthor = async (id: string) => {
    await supabase.from('profiles').update({ role: 'user' }).eq('id', id);
    setAuthors((prev) => prev.map(a => a.id === id ? { ...a, role: 'user' } : a));
    console.log('Author ${id} rejected');
  };

  if (loading) return <p style={{ padding: 40 }}>Loading…</p>;
  if (!session || role !== 'publisher') {
    return <p style={{ padding: 40 }}>Access denied. Publisher only.</p>;
  }

  return (
    <div style={{ padding: 40 }}>
      <h1 style={{ textAlign: 'center' }}>Author Management</h1>

      <h2>Pending Applications</h2>
      {authors.filter(a => a.role === 'pending_author').length === 0 ? (
        <p>No pending authors.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        {authors.filter(a => a.role === 'pending_author').map(author => (
          <div key={author.id} 
          style={{
            flex: '1 1 calc(33.33% - 20px)',
            border: '1px solid #ddd',
            borderRadius: 10,
            padding: 20,
            marginBottom: 20,
            backgroundColor: '#f9f9f9',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <h3 style={{ marginBottom: 10, color: '#1a237e' }}>{author.name}</h3>
            <div style={{ lineHeight: 1.6 }}>
              <strong>Author ID:</strong> {author.author_id || '—'}<br />
              <strong>Age:</strong> {author.age || '—'}<br />
              <strong>Email:</strong> {author.email}<br />
              <strong>Phone:</strong> {author.phone}<br />
              <strong>Links:</strong>
              <ul style={{ paddingLeft: 20, marginTop: 4 }}>
                {(author.links || []).map((link: string, idx: number) => (
                  <li key={idx}>
                    <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: '#1565c0' }}>
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button
              onClick={() => approveAuthor(author.id)}
              style={{
                padding: '8px 14px',
                background: '#4caf50',
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              ✅ Approve
            </button>
            <button
              onClick={() => rejectAuthor(author.id)}
              style={{
                padding: '8px 14px',
                background: '#f44336',
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              ❌ Reject
            </button>
          </div>
          </div>
        ))}
      </div>
      )}

      <h2 style={{ marginTop: 40 }}>Approved Authors</h2>
      {authors.filter(a => a.role === 'author').length === 0 ? (
        <p>No approved authors.</p>
      ) : (
        authors.filter(a => a.role === 'author').map(author => (
          <div key={author.id} style={{ border: '1px solid #ccc', borderRadius: 10, padding: 16, marginBottom: 16, backgroundColor: '#fff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)', }} 
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div>
            <strong>{author.name}</strong><br />
            Email: {author.email}<br />
            Phone: {author.phone}
            </div>
            <button 
            style={{ padding: '6px 12px',
        backgroundColor: '#1a73e8',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        fontWeight: 600,
        cursor: 'pointer',
        height: 'fit-content' }}
            onClick={() => setActiveAuthorId(activeAuthorId === author.id ? null : author.id)}>Chat</button>
            </div>
            {activeAuthorId === author.id && (
            <div style={{ marginTop: 12  }}>
              <ConversationBox
                room_id={`${author.id}-${publisherId}`}
                myId={publisherId}
                myRole="editor"
                authorId={author.id}
                editorId={publisherId}
                author_name={author.name}
                editor_name="Publisher"
                sender_name="Publisher"
              />
            </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}